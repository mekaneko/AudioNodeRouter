import Foundation
import AudioToolbox
import CoreAudio

public final class HALInputUnit {
    private var unit: AudioUnit?
    private let deviceID: AudioDeviceID
    private let callback: (UnsafePointer<Float>, UnsafePointer<Float>?, Int) -> Void
    private var isRunning: Bool = false
    private var bufferListPtr: UnsafeMutablePointer<AudioBufferList>?
    private var tempBuffer: [Float] = []

    public init?(deviceID: AudioDeviceID, onBuffer: @escaping (UnsafePointer<Float>, UnsafePointer<Float>?, Int) -> Void) {
        guard deviceID != 0 else { return nil }
        self.deviceID = deviceID
        self.callback = onBuffer

        var desc = AudioComponentDescription(
            componentType: kAudioUnitType_Output,
            componentSubType: kAudioUnitSubType_HALOutput,
            componentManufacturer: kAudioUnitManufacturer_Apple,
            componentFlags: 0,
            componentFlagsMask: 0
        )

        guard let comp = AudioComponentFindNext(nil, &desc) else { return nil }
        var audioUnit: AudioUnit?
        guard AudioComponentInstanceNew(comp, &audioUnit) == noErr, let au = audioUnit else { return nil }
        self.unit = au

        // 1. Enable Input (Bus 1)
        var enableIO: UInt32 = 1
        var status = AudioUnitSetProperty(
            au,
            kAudioOutputUnitProperty_EnableIO,
            kAudioUnitScope_Input,
            1,
            &enableIO,
            UInt32(MemoryLayout<UInt32>.size)
        )
        guard status == noErr else { cleanup(); return nil }

        // 2. Disable Output (Bus 0)
        var disableIO: UInt32 = 0
        status = AudioUnitSetProperty(
            au,
            kAudioOutputUnitProperty_EnableIO,
            kAudioUnitScope_Output,
            0,
            &disableIO,
            UInt32(MemoryLayout<UInt32>.size)
        )
        guard status == noErr else { cleanup(); return nil }

        // 3. Set Device ID directly (bypasses aggregate device generation)
        var devID = deviceID
        status = AudioUnitSetProperty(
            au,
            kAudioOutputUnitProperty_CurrentDevice,
            kAudioUnitScope_Global,
            0,
            &devID,
            UInt32(MemoryLayout<AudioDeviceID>.size)
        )
        guard status == noErr else { cleanup(); return nil }

        // 4. Get device format and setup canonical float32 format on output of Bus 1
        var streamFormat = AudioStreamBasicDescription(
            mSampleRate: 48000.0,
            mFormatID: kAudioFormatLinearPCM,
            mFormatFlags: kAudioFormatFlagIsFloat | kAudioFormatFlagIsPacked | kAudioFormatFlagIsNonInterleaved,
            mBytesPerPacket: 4,
            mFramesPerPacket: 1,
            mBytesPerFrame: 4,
            mChannelsPerFrame: 2,
            mBitsPerChannel: 32,
            mReserved: 0
        )

        status = AudioUnitSetProperty(
            au,
            kAudioUnitProperty_StreamFormat,
            kAudioUnitScope_Output,
            1,
            &streamFormat,
            UInt32(MemoryLayout<AudioStreamBasicDescription>.size)
        )
        guard status == noErr else { cleanup(); return nil }

        // 5. Setup Input Callback
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()
        var callbackStruct = AURenderCallbackStruct(
            inputProc: { (inRefCon, ioActionFlags, inTimeStamp, inBusNumber, inNumberFrames, _) -> OSStatus in
                let inputUnit = Unmanaged<HALInputUnit>.fromOpaque(inRefCon).takeUnretainedValue()
                return inputUnit.processRender(
                    ioActionFlags: ioActionFlags,
                    inTimeStamp: inTimeStamp,
                    inBusNumber: inBusNumber,
                    inNumberFrames: inNumberFrames
                )
            },
            inputProcRefCon: selfPtr
        )

        status = AudioUnitSetProperty(
            au,
            kAudioOutputUnitProperty_SetInputCallback,
            kAudioUnitScope_Global,
            0,
            &callbackStruct,
            UInt32(MemoryLayout<AURenderCallbackStruct>.size)
        )
        guard status == noErr else { cleanup(); return nil }

        // 6. Initialize AudioUnit
        status = AudioUnitInitialize(au)
        guard status == noErr else { cleanup(); return nil }

        // Allocate buffer list for 2 channels
        let ablSize = MemoryLayout<AudioBufferList>.size + MemoryLayout<AudioBuffer>.size
        bufferListPtr = UnsafeMutablePointer<AudioBufferList>.allocate(capacity: ablSize)
        bufferListPtr?.pointee.mNumberBuffers = 2

        tempBuffer = [Float](repeating: 0, count: 4096 * 2)

        // 7. Start IO
        status = AudioOutputUnitStart(au)
        if status == noErr {
            isRunning = true
        } else {
            cleanup()
            return nil
        }
    }

    private func processRender(
        ioActionFlags: UnsafeMutablePointer<AudioUnitRenderActionFlags>,
        inTimeStamp: UnsafePointer<AudioTimeStamp>,
        inBusNumber: UInt32,
        inNumberFrames: UInt32
    ) -> OSStatus {
        guard let au = unit, let abl = bufferListPtr else { return noErr }

        let frameCount = Int(inNumberFrames)
        if tempBuffer.count < frameCount * 2 {
            tempBuffer = [Float](repeating: 0, count: frameCount * 2)
        }

        tempBuffer.withUnsafeMutableBufferPointer { ptr in
            guard let base = ptr.baseAddress else { return }
            let bufL = base
            let bufR = base.advanced(by: frameCount)

            abl.pointee.mBuffers.mNumberChannels = 1
            abl.pointee.mBuffers.mDataByteSize = UInt32(frameCount * 4)
            abl.pointee.mBuffers.mData = UnsafeMutableRawPointer(bufL)

            // Buffer 2 (Right)
            withUnsafeMutablePointer(to: &abl.pointee.mBuffers) { firstBufPtr in
                let secondBufPtr = firstBufPtr.advanced(by: 1)
                secondBufPtr.pointee.mNumberChannels = 1
                secondBufPtr.pointee.mDataByteSize = UInt32(frameCount * 4)
                secondBufPtr.pointee.mData = UnsafeMutableRawPointer(bufR)
            }

            let status = AudioUnitRender(au, ioActionFlags, inTimeStamp, inBusNumber, inNumberFrames, abl)
            if status == noErr {
                callback(bufL, bufR, frameCount)
            }
        }

        return noErr
    }

    public func stop() {
        guard isRunning, let au = unit else { return }
        AudioOutputUnitStop(au)
        AudioUnitUninitialize(au)
        cleanup()
        isRunning = false
    }

    private func cleanup() {
        if let au = unit {
            AudioComponentInstanceDispose(au)
            unit = nil
        }
        if let abl = bufferListPtr {
            abl.deallocate()
            bufferListPtr = nil
        }
    }

    deinit {
        stop()
    }
}

public final class HALOutputUnit {
    private var unit: AudioUnit?
    private let deviceID: AudioDeviceID
    private let renderCallback: (UnsafeMutablePointer<Float>, UnsafeMutablePointer<Float>, Int) -> Void
    private var isRunning: Bool = false

    public init?(deviceID: AudioDeviceID, onRender: @escaping (UnsafeMutablePointer<Float>, UnsafeMutablePointer<Float>, Int) -> Void) {
        guard deviceID != 0 else { return nil }
        self.deviceID = deviceID
        self.renderCallback = onRender

        var desc = AudioComponentDescription(
            componentType: kAudioUnitType_Output,
            componentSubType: kAudioUnitSubType_HALOutput,
            componentManufacturer: kAudioUnitManufacturer_Apple,
            componentFlags: 0,
            componentFlagsMask: 0
        )

        guard let comp = AudioComponentFindNext(nil, &desc) else { return nil }
        var audioUnit: AudioUnit?
        guard AudioComponentInstanceNew(comp, &audioUnit) == noErr, let au = audioUnit else { return nil }
        self.unit = au

        // 1. Enable Output (Bus 0)
        var enableIO: UInt32 = 1
        var status = AudioUnitSetProperty(
            au,
            kAudioOutputUnitProperty_EnableIO,
            kAudioUnitScope_Output,
            0,
            &enableIO,
            UInt32(MemoryLayout<UInt32>.size)
        )
        guard status == noErr else { cleanup(); return nil }

        // 2. Disable Input (Bus 1)
        var disableIO: UInt32 = 0
        status = AudioUnitSetProperty(
            au,
            kAudioOutputUnitProperty_EnableIO,
            kAudioUnitScope_Input,
            1,
            &disableIO,
            UInt32(MemoryLayout<UInt32>.size)
        )
        guard status == noErr else { cleanup(); return nil }

        // 3. Set Output Device
        var devID = deviceID
        status = AudioUnitSetProperty(
            au,
            kAudioOutputUnitProperty_CurrentDevice,
            kAudioUnitScope_Global,
            0,
            &devID,
            UInt32(MemoryLayout<AudioDeviceID>.size)
        )
        guard status == noErr else { cleanup(); return nil }

        // 4. Set stream format on input of Bus 0 (48kHz stereo float32)
        var streamFormat = AudioStreamBasicDescription(
            mSampleRate: 48000.0,
            mFormatID: kAudioFormatLinearPCM,
            mFormatFlags: kAudioFormatFlagIsFloat | kAudioFormatFlagIsPacked | kAudioFormatFlagIsNonInterleaved,
            mBytesPerPacket: 4,
            mFramesPerPacket: 1,
            mBytesPerFrame: 4,
            mChannelsPerFrame: 2,
            mBitsPerChannel: 32,
            mReserved: 0
        )

        status = AudioUnitSetProperty(
            au,
            kAudioUnitProperty_StreamFormat,
            kAudioUnitScope_Input,
            0,
            &streamFormat,
            UInt32(MemoryLayout<AudioStreamBasicDescription>.size)
        )
        guard status == noErr else { cleanup(); return nil }

        // 5. Setup Render Callback
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()
        var callbackStruct = AURenderCallbackStruct(
            inputProc: { (inRefCon, _, _, _, inNumberFrames, ioData) -> OSStatus in
                guard let ioData = ioData else { return noErr }
                let outputUnit = Unmanaged<HALOutputUnit>.fromOpaque(inRefCon).takeUnretainedValue()
                return outputUnit.processRender(ioData: ioData, frameCount: Int(inNumberFrames))
            },
            inputProcRefCon: selfPtr
        )

        status = AudioUnitSetProperty(
            au,
            kAudioUnitProperty_SetRenderCallback,
            kAudioUnitScope_Input,
            0,
            &callbackStruct,
            UInt32(MemoryLayout<AURenderCallbackStruct>.size)
        )
        guard status == noErr else { cleanup(); return nil }

        // 6. Initialize
        status = AudioUnitInitialize(au)
        guard status == noErr else { cleanup(); return nil }

        // 7. Start Output IO
        status = AudioOutputUnitStart(au)
        if status == noErr {
            isRunning = true
        } else {
            cleanup()
            return nil
        }
    }

    private func processRender(ioData: UnsafeMutablePointer<AudioBufferList>, frameCount: Int) -> OSStatus {
        let abl = UnsafeMutableAudioBufferListPointer(ioData)
        guard abl.count >= 2,
              let outL = abl[0].mData?.assumingMemoryBound(to: Float.self),
              let outR = abl[1].mData?.assumingMemoryBound(to: Float.self) else {
            return noErr
        }

        renderCallback(outL, outR, frameCount)
        return noErr
    }

    public func stop() {
        guard isRunning, let au = unit else { return }
        AudioOutputUnitStop(au)
        AudioUnitUninitialize(au)
        cleanup()
        isRunning = false
    }

    private func cleanup() {
        if let au = unit {
            AudioComponentInstanceDispose(au)
            unit = nil
        }
    }

    deinit {
        stop()
    }
}
