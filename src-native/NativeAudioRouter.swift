import Foundation
import CoreAudio
import AudioToolbox
import os

public struct NodeMeterInfo: Codable {
    public let id: String
    public let peakL: Float
    public let peakR: Float
}

public final class NativeAudioRouter: @unchecked Sendable {
    public static let shared = NativeAudioRouter()

    // Active Input Units: [nodeId: HALInputUnit]
    private var inputUnits: [String: HALInputUnit] = [:]
    private var inputDevices: [String: AudioDeviceID] = [:]
    private var inputVolumes: [String: Float] = [:]
    private var inputMutes: [String: Bool] = [:]
    private var inputPeaks: [String: (Float, Float)] = [:]

    // Active Output Units: [nodeId: HALOutputUnit]
    private var outputUnits: [String: HALOutputUnit] = [:]
    private var outputDevices: [String: AudioDeviceID] = [:]
    private var outputVolumes: [String: Float] = [:]
    private var outputMutes: [String: Bool] = [:]
    private var outputPeaks: [String: (Float, Float)] = [:]

    // Bus Nodes (software bypass lines): [nodeId: AudioStreamBuffer]
    private var busBuffers: [String: AudioStreamBuffer] = [:]
    private var busVolumes: [String: Float] = [:]
    private var busMutes: [String: Bool] = [:]
    private var busPeaks: [String: (Float, Float)] = [:]

    // Connections: [sourceNodeId: Set<targetNodeId>]
    private var connections: [String: Set<String>] = [:]

    // Stream Buffers between connected nodes: [ "sourceId->targetId" : AudioStreamBuffer ]
    private var streamBuffers: [String: AudioStreamBuffer] = [:]

    private let lock = os_unfair_lock_t.allocate(capacity: 1)

    private init() {
        self.lock.initialize(to: os_unfair_lock())
    }

    deinit {
        lock.deallocate()
    }

    // MARK: - Input Node Management
    public func setInputNode(id: String, deviceID: AudioDeviceID, volume: Float, mute: Bool) {
        os_unfair_lock_lock(lock)
        inputVolumes[id] = volume
        inputMutes[id] = mute
        let currentDevID = inputDevices[id] ?? 0
        os_unfair_lock_unlock(lock)

        if currentDevID != deviceID {
            // Recreate input unit
            stopInputUnit(id: id)
            guard deviceID != 0 else { return }

            let unit = HALInputUnit(deviceID: deviceID) { [weak self] left, right, frameCount in
                self?.handleInputAudio(nodeId: id, left: left, right: right, frameCount: frameCount)
            }
            if let unit = unit {
                os_unfair_lock_lock(lock)
                inputUnits[id] = unit
                inputDevices[id] = deviceID
                os_unfair_lock_unlock(lock)
            }
        }
    }

    public func removeInputNode(id: String) {
        stopInputUnit(id: id)
        os_unfair_lock_lock(lock)
        inputVolumes.removeValue(forKey: id)
        inputMutes.removeValue(forKey: id)
        inputPeaks.removeValue(forKey: id)
        removeNodeConnections(nodeId: id)
        os_unfair_lock_unlock(lock)
    }

    private func stopInputUnit(id: String) {
        os_unfair_lock_lock(lock)
        let unit = inputUnits.removeValue(forKey: id)
        inputDevices.removeValue(forKey: id)
        os_unfair_lock_unlock(lock)
        if let unit = unit {
            unit.stop()
        }
    }

    // MARK: - Output Node Management
    public func setOutputNode(id: String, deviceID: AudioDeviceID, volume: Float, mute: Bool) {
        os_unfair_lock_lock(lock)
        outputVolumes[id] = volume
        outputMutes[id] = mute
        let currentDevID = outputDevices[id] ?? 0
        os_unfair_lock_unlock(lock)

        if currentDevID != deviceID {
            stopOutputUnit(id: id)
            guard deviceID != 0 else { return }

            let unit = HALOutputUnit(deviceID: deviceID) { [weak self] outL, outR, frameCount in
                self?.handleOutputAudio(nodeId: id, outL: outL, outR: outR, frameCount: frameCount)
            }
            if let unit = unit {
                os_unfair_lock_lock(lock)
                outputUnits[id] = unit
                outputDevices[id] = deviceID
                os_unfair_lock_unlock(lock)
            }
        }
    }

    public func removeOutputNode(id: String) {
        stopOutputUnit(id: id)
        os_unfair_lock_lock(lock)
        outputVolumes.removeValue(forKey: id)
        outputMutes.removeValue(forKey: id)
        outputPeaks.removeValue(forKey: id)
        removeNodeConnections(nodeId: id)
        os_unfair_lock_unlock(lock)
    }

    private func stopOutputUnit(id: String) {
        os_unfair_lock_lock(lock)
        let unit = outputUnits.removeValue(forKey: id)
        outputDevices.removeValue(forKey: id)
        os_unfair_lock_unlock(lock)
        if let unit = unit {
            unit.stop()
        }
    }

    // MARK: - Bus Node Management (Internal Pass-Thru Lines)
    public func setBusNode(id: String, volume: Float, mute: Bool) {
        os_unfair_lock_lock(lock)
        defer { os_unfair_lock_unlock(lock) }
        busVolumes[id] = volume
        busMutes[id] = mute
        if busBuffers[id] == nil {
            busBuffers[id] = AudioStreamBuffer(capacity: 32768)
        }
    }

    public func removeBusNode(id: String) {
        os_unfair_lock_lock(lock)
        defer { os_unfair_lock_unlock(lock) }
        busBuffers.removeValue(forKey: id)
        busVolumes.removeValue(forKey: id)
        busMutes.removeValue(forKey: id)
        busPeaks.removeValue(forKey: id)
        removeNodeConnections(nodeId: id)
    }

    // MARK: - Wire Connections
    public func connect(sourceId: String, targetId: String) {
        os_unfair_lock_lock(lock)
        defer { os_unfair_lock_unlock(lock) }

        var targets = connections[sourceId] ?? Set<String>()
        targets.insert(targetId)
        connections[sourceId] = targets

        let streamKey = "\(sourceId)->\(targetId)"
        if streamBuffers[streamKey] == nil {
            streamBuffers[streamKey] = AudioStreamBuffer(capacity: 32768)
        }
    }

    public func disconnect(sourceId: String, targetId: String) {
        os_unfair_lock_lock(lock)
        defer { os_unfair_lock_unlock(lock) }

        if var targets = connections[sourceId] {
            targets.remove(targetId)
            connections[sourceId] = targets
        }
        let streamKey = "\(sourceId)->\(targetId)"
        streamBuffers.removeValue(forKey: streamKey)
    }

    private func removeNodeConnections(nodeId: String) {
        connections.removeValue(forKey: nodeId)
        for (src, var tgts) in connections {
            if tgts.contains(nodeId) {
                tgts.remove(nodeId)
                connections[src] = tgts
                streamBuffers.removeValue(forKey: "\(src)->\(nodeId)")
            }
        }
    }

    // MARK: - Audio Processing Pipeline (CoreAudio Real-time Thread)
    private func handleInputAudio(nodeId: String, left: UnsafePointer<Float>, right: UnsafePointer<Float>?, frameCount: Int) {
        os_unfair_lock_lock(lock)
        let isMuted = inputMutes[nodeId] ?? false
        let vol = isMuted ? 0.0 : (inputVolumes[nodeId] ?? 1.0)
        let targets = connections[nodeId] ?? Set<String>()
        os_unfair_lock_unlock(lock)

        let rPtr = right ?? left // Mono to stereo fallback

        // Calculate Input Peak
        var pL: Float = 0.0
        var pR: Float = 0.0
        for i in 0..<frameCount {
            let aL = abs(left[i])
            let aR = abs(rPtr[i])
            if aL > pL { pL = aL }
            if aR > pR { pR = aR }
        }
        os_unfair_lock_lock(lock)
        inputPeaks[nodeId] = (min(1.0, pL * vol), min(1.0, pR * vol))
        os_unfair_lock_unlock(lock)

        guard vol > 0.0001, !targets.isEmpty else { return }

        // Send to downstream connected buffers
        for targetId in targets {
            let streamKey = "\(nodeId)->\(targetId)"
            os_unfair_lock_lock(lock)
            let buffer = streamBuffers[streamKey]
            os_unfair_lock_unlock(lock)

            buffer?.write(left: left, right: rPtr, frameCount: frameCount, gainL: vol, gainR: vol)
        }
    }

    private func handleOutputAudio(nodeId: String, outL: UnsafeMutablePointer<Float>, outR: UnsafeMutablePointer<Float>, frameCount: Int) {
        os_unfair_lock_lock(lock)
        let isMuted = outputMutes[nodeId] ?? false
        let vol = isMuted ? 0.0 : (outputVolumes[nodeId] ?? 1.0)

        // Find all incoming streams targeting this output
        var incomingStreamKeys: [String] = []
        for (src, tgts) in connections {
            if tgts.contains(nodeId) {
                incomingStreamKeys.append("\(src)->\(nodeId)")
            }
        }
        os_unfair_lock_unlock(lock)

        // Clear output buffer first
        memset(outL, 0, frameCount * MemoryLayout<Float>.size)
        memset(outR, 0, frameCount * MemoryLayout<Float>.size)

        guard vol > 0.0001 else {
            os_unfair_lock_lock(lock)
            outputPeaks[nodeId] = (0.0, 0.0)
            os_unfair_lock_unlock(lock)
            return
        }

        // Sum / mix all incoming streams into outL & outR
        for key in incomingStreamKeys {
            os_unfair_lock_lock(lock)
            let buffer = streamBuffers[key]
            os_unfair_lock_unlock(lock)

            buffer?.readAndAccumulate(intoLeft: outL, intoRight: outR, frameCount: frameCount)
        }

        // Apply Master Volume for this Output Node & Calculate Peak
        var pL: Float = 0.0
        var pR: Float = 0.0
        for i in 0..<frameCount {
            outL[i] *= vol
            outR[i] *= vol

            // Soft clipper to prevent distortion
            if outL[i] > 1.0 { outL[i] = 1.0 } else if outL[i] < -1.0 { outL[i] = -1.0 }
            if outR[i] > 1.0 { outR[i] = 1.0 } else if outR[i] < -1.0 { outR[i] = -1.0 }

            let aL = abs(outL[i])
            let aR = abs(outR[i])
            if aL > pL { pL = aL }
            if aR > pR { pR = aR }
        }

        os_unfair_lock_lock(lock)
        outputPeaks[nodeId] = (min(1.0, pL), min(1.0, pR))
        os_unfair_lock_unlock(lock)
    }

    // MARK: - Meter Snapshot
    public func getMetersJSON() -> String {
        os_unfair_lock_lock(lock)
        defer { os_unfair_lock_unlock(lock) }

        var list: [NodeMeterInfo] = []
        for (id, p) in inputPeaks {
            list.append(NodeMeterInfo(id: id, peakL: p.0, peakR: p.1))
        }
        for (id, p) in outputPeaks {
            list.append(NodeMeterInfo(id: id, peakL: p.0, peakR: p.1))
        }
        for (id, p) in busPeaks {
            list.append(NodeMeterInfo(id: id, peakL: p.0, peakR: p.1))
        }

        if let data = try? JSONEncoder().encode(list), let str = String(data: data, encoding: .utf8) {
            return str
        }
        return "[]"
    }
}
