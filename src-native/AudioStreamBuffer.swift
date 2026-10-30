import Foundation
import os

/// A high-performance, thread-safe SPSC (Single Producer Single Consumer) ring buffer
/// dedicated to a single input-to-output audio stream.
public final class AudioStreamBuffer: @unchecked Sendable {
    private var bufferL: [Float]
    private var bufferR: [Float]
    private let capacity: Int

    private var writeHead: Int = 0
    private var readHead: Int = 0
    private let lock = os_unfair_lock_t.allocate(capacity: 1)

    public init(capacity: Int = 16384) {
        self.capacity = capacity
        self.bufferL = [Float](repeating: 0, count: capacity)
        self.bufferR = [Float](repeating: 0, count: capacity)
        self.lock.initialize(to: os_unfair_lock())
    }

    deinit {
        lock.deallocate()
    }

    /// Push stereo audio data into the buffer (called by Input thread).
    public func write(left: UnsafePointer<Float>, right: UnsafePointer<Float>, frameCount: Int, gainL: Float, gainR: Float) {
        os_unfair_lock_lock(lock)
        defer { os_unfair_lock_unlock(lock) }

        let availableSpace = capacity - ((writeHead - readHead + capacity) % capacity) - 1

        // If buffer is overflowing (slow consumer), drop oldest frames to keep latency low
        if frameCount > availableSpace {
            let dropFrames = frameCount - availableSpace
            readHead = (readHead + dropFrames) % capacity
        }

        var w = writeHead
        for i in 0..<frameCount {
            bufferL[w] = left[i] * gainL
            bufferR[w] = right[i] * gainR
            w += 1
            if w >= capacity {
                w = 0
            }
        }
        writeHead = w
    }

    /// Read stereo audio data and accumulate (mix/sum) into the output buffers (called by Output thread).
    /// Returns the number of frames actually read.
    public func readAndAccumulate(intoLeft outL: UnsafeMutablePointer<Float>, intoRight outR: UnsafeMutablePointer<Float>, frameCount: Int) {
        os_unfair_lock_lock(lock)
        defer { os_unfair_lock_unlock(lock) }

        let available = (writeHead - readHead + capacity) % capacity
        let framesToRead = min(available, frameCount)

        var r = readHead
        for i in 0..<framesToRead {
            outL[i] += bufferL[r]
            outR[i] += bufferR[r]
            r += 1
            if r >= capacity {
                r = 0
            }
        }
        readHead = r
    }

    public func clear() {
        os_unfair_lock_lock(lock)
        defer { os_unfair_lock_unlock(lock) }
        writeHead = 0
        readHead = 0
    }
}
