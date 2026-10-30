import Foundation
import CoreAudio

public struct AudioDevice: Identifiable, Hashable, Sendable {
    public let id: AudioDeviceID
    public let name: String
    public let uid: String
    public let isInput: Bool
    public let isOutput: Bool

    public static let none = AudioDevice(id: 0, name: "N/A", uid: "none", isInput: true, isOutput: true)
}

public final class AudioDeviceManager: ObservableObject {
    public static let shared = AudioDeviceManager()

    @Published public private(set) var inputDevices: [AudioDevice] = [AudioDevice.none]
    @Published public private(set) var outputDevices: [AudioDevice] = [AudioDevice.none]

    private var listenerBlock: AudioObjectPropertyListenerBlock?

    private init() {
        refreshDevices()
        setupDeviceChangeListener()
    }

    public func refreshDevices() {
        var propertyAddress = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )

        var dataSize: UInt32 = 0
        let sizeStatus = AudioObjectGetPropertyDataSize(
            AudioObjectID(kAudioObjectSystemObject),
            &propertyAddress,
            0,
            nil,
            &dataSize
        )
        guard sizeStatus == noErr else { return }

        let count = Int(dataSize) / MemoryLayout<AudioDeviceID>.size
        var deviceIDs = [AudioDeviceID](repeating: 0, count: count)
        let getStatus = AudioObjectGetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &propertyAddress,
            0,
            nil,
            &dataSize,
            &deviceIDs
        )
        guard getStatus == noErr else { return }

        var inputs: [AudioDevice] = [AudioDevice.none]
        var outputs: [AudioDevice] = [AudioDevice.none]

        for id in deviceIDs {
            let name = Self.getDeviceName(id: id)
            let uid = Self.getDeviceUID(id: id)

            // Filter out system internal aggregate devices that cause feedback loops
            if name.contains("CADefaultDeviceAggregate") || uid.contains("CADefaultDeviceAggregate") || name.contains("AirDrop") {
                continue
            }

            let hasIn = Self.hasStreams(id: id, isInput: true)
            let hasOut = Self.hasStreams(id: id, isInput: false)

            if hasIn {
                inputs.append(AudioDevice(id: id, name: name, uid: uid, isInput: true, isOutput: false))
            }
            if hasOut {
                outputs.append(AudioDevice(id: id, name: name, uid: uid, isInput: false, isOutput: true))
            }
        }

        DispatchQueue.main.async {
            self.inputDevices = inputs
            self.outputDevices = outputs
        }
    }

    private func setupDeviceChangeListener() {
        var propertyAddress = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )

        listenerBlock = { [weak self] (_, _) in
            self?.refreshDevices()
        }

        if let block = listenerBlock {
            AudioObjectAddPropertyListenerBlock(
                AudioObjectID(kAudioObjectSystemObject),
                &propertyAddress,
                DispatchQueue.main,
                block
            )
        }
    }

    public static func getDeviceName(id: AudioDeviceID) -> String {
        guard id != 0 else { return "N/A" }
        var propertyAddress = AudioObjectPropertyAddress(
            mSelector: kAudioObjectPropertyName,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var cfName: Unmanaged<CFString>? = nil
        var dataSize = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        let status = withUnsafeMutablePointer(to: &cfName) { ptr in
            AudioObjectGetPropertyData(id, &propertyAddress, 0, nil, &dataSize, ptr)
        }
        if status == noErr, let name = cfName?.takeRetainedValue() as String? {
            return name
        }
        return "Audio Device \(id)"
    }

    public static func getDeviceUID(id: AudioDeviceID) -> String {
        guard id != 0 else { return "none" }
        var propertyAddress = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyDeviceUID,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var cfUID: Unmanaged<CFString>? = nil
        var dataSize = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        let status = withUnsafeMutablePointer(to: &cfUID) { ptr in
            AudioObjectGetPropertyData(id, &propertyAddress, 0, nil, &dataSize, ptr)
        }
        if status == noErr, let uid = cfUID?.takeRetainedValue() as String? {
            return uid
        }
        return "\(id)"
    }

    public static func hasStreams(id: AudioDeviceID, isInput: Bool) -> Bool {
        guard id != 0 else { return false }
        var propertyAddress = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyStreamConfiguration,
            mScope: isInput ? kAudioObjectPropertyScopeInput : kAudioObjectPropertyScopeOutput,
            mElement: kAudioObjectPropertyElementMain
        )
        var dataSize: UInt32 = 0
        let status = AudioObjectGetPropertyDataSize(id, &propertyAddress, 0, nil, &dataSize)
        guard status == noErr, dataSize > 0 else { return false }

        let rawBuffer = UnsafeMutableRawPointer.allocate(
            byteCount: Int(dataSize),
            alignment: MemoryLayout<AudioBufferList>.alignment
        )
        defer { rawBuffer.deallocate() }

        let fetchStatus = AudioObjectGetPropertyData(id, &propertyAddress, 0, nil, &dataSize, rawBuffer)
        guard fetchStatus == noErr else { return false }

        let bufferList = rawBuffer.assumingMemoryBound(to: AudioBufferList.self)
        let numBuffers = Int(bufferList.pointee.mNumberBuffers)
        guard numBuffers > 0 else { return false }

        let ablPtr = UnsafeMutableAudioBufferListPointer(bufferList)
        var totalChannels: UInt32 = 0
        for buffer in ablPtr {
            totalChannels += buffer.mNumberChannels
        }
        return totalChannels > 0
    }
}
