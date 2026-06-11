// Audio engine — Web Audio playback of sampled piano.
// Samples: Salamander Grand Piano (CC-BY), one every 3 semitones C3-C6,
// pitch-shifted between sampled pitches via playbackRate.

const SAMPLES = {
  48: 'C3', 51: 'Ds3', 54: 'Fs3', 57: 'A3',
  60: 'C4', 63: 'Ds4', 66: 'Fs4', 69: 'A4',
  72: 'C5', 75: 'Ds5', 78: 'Fs5', 81: 'A5',
  84: 'C6',
};

export class Piano {
  constructor(baseUrl = 'assets/samples') {
    this.baseUrl = baseUrl;
    this.ctx = null;
    this.buffers = new Map();
    this.active = new Set();
  }

  /** Create/resume the AudioContext and load all samples. Call from a user gesture. */
  async init(onProgress = () => {}) {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    await this.ctx.resume();
    const total = Object.keys(SAMPLES).length;
    if (this.buffers.size === total) return;
    let loaded = 0;
    await Promise.all(
      Object.entries(SAMPLES).map(async ([midi, name]) => {
        if (this.buffers.has(Number(midi))) {
          loaded += 1;
          onProgress(loaded, total);
          return;
        }
        const res = await fetch(`${this.baseUrl}/${name}.mp3`);
        if (!res.ok) throw new Error(`sample fetch failed: ${name}`);
        const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(Number(midi), buf);
        loaded += 1;
        onProgress(loaded, total);
      }),
    );
  }

  /** Stop everything currently sounding or scheduled. */
  stopAll() {
    for (const src of this.active) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    this.active.clear();
  }

  get now() {
    return this.ctx.currentTime;
  }

  nearestSample(midi) {
    let best = null;
    let bestDist = Infinity;
    for (const m of this.buffers.keys()) {
      const d = Math.abs(m - midi);
      if (d < bestDist) {
        bestDist = d;
        best = m;
      }
    }
    return best;
  }

  /** Schedule one note. Returns the stop time. */
  playNote(midi, when = this.now, duration = 1, gain = 1) {
    const sampleMidi = this.nearestSample(midi);
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers.get(sampleMidi);
    src.playbackRate.value = 2 ** ((midi - sampleMidi) / 12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.setTargetAtTime(0, when + duration, 0.08);
    src.connect(g).connect(this.ctx.destination);
    this.active.add(src);
    src.onended = () => this.active.delete(src);
    src.start(when);
    src.stop(when + duration + 0.5);
    return when + duration;
  }

  playChord(midis, when = this.now, duration = 1, gain = 0.5) {
    for (const m of midis) this.playNote(m, when, duration, gain);
    return when + duration;
  }

  /** Play notes one after another. Returns the end time. */
  playSequence(midis, when = this.now, noteDuration = 0.45, gap = 0.05) {
    let t = when;
    for (const m of midis) {
      this.playNote(m, t, noteDuration, 0.9);
      t += noteDuration + gap;
    }
    return t;
  }
}
