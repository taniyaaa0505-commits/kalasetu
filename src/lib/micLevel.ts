/**
 * How loudly she is speaking, right now, as a number from 0 to 1.
 *
 * The Web Speech API tells us nothing about volume, so we open our own
 * microphone stream purely to measure it. Chrome allows both at once.
 *
 * This is decoration. It must NEVER break the actual speech recognition, so
 * every failure here is swallowed and the caller simply gets nothing back.
 */

export interface MicMeter { stop: () => void }

export async function meterMic(onLevel: (level: number) => void): Promise<MicMeter | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext
    if (!Ctx) { stream.getTracks().forEach(t => t.stop()); return null }

    const ctx: AudioContext = new Ctx()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.75      // steadier than the raw signal
    source.connect(analyser)

    const buf = new Uint8Array(analyser.frequencyBinCount)
    let raf = 0
    let alive = true

    const tick = () => {
      if (!alive) return
      analyser.getByteTimeDomainData(buf)

      // Root-mean-square of the waveform: loudness, not pitch.
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / buf.length)

      // Speech sits low in this range, so lift it into something visible.
      onLevel(Math.min(1, rms * 5))
      raf = requestAnimationFrame(tick)
    }
    tick()

    return {
      stop: () => {
        alive = false
        cancelAnimationFrame(raf)
        stream.getTracks().forEach(t => t.stop())
        ctx.close().catch(() => {})
      },
    }
  } catch {
    // No permission, no device, or two consumers refused. Not our problem —
    // the mic button still works, it just will not shimmer.
    return null
  }
}
