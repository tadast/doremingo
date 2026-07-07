// Audio engine — Web Audio playback of sampled piano.
// Samples: Salamander Grand Piano (CC-BY), one every 3 semitones C3-C6,
// pitch-shifted between sampled pitches via playbackRate.

const SAMPLES = {
  48: 'C3', 51: 'Ds3', 54: 'Fs3', 57: 'A3',
  60: 'C4', 63: 'Ds4', 66: 'Fs4', 69: 'A4',
  72: 'C5', 75: 'Ds5', 78: 'Fs5', 81: 'A5',
  84: 'C6',
};

/**
 * Load a binary asset as an ArrayBuffer via XHR.
 * `fetch()` of local files breaks under Capacitor's iOS scheme handler —
 * it returns a media-streamed response with `status: 0` and no readable body.
 * XHR with responseType 'arraybuffer' goes through a path that returns the
 * full bytes (status 200 on the web, 0 for the local scheme — both fine).
 */
function fetchArrayBuffer(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      const ok = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 0;
      if (ok && xhr.response) resolve(xhr.response);
      else reject(new Error(`sample load failed: ${url} status=${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error(`sample load error: ${url}`));
    xhr.send();
  });
}

export class Piano {
  constructor(baseUrl = 'assets/samples') {
    this.baseUrl = baseUrl;
    this.ctx = null;
    this.buffers = new Map();
    this.active = new Set();
    this.silentEl = null;
  }

  /**
   * iOS suspends (or 'interrupt's) the context on lock/app-switch and only a
   * fresh user gesture may resume it — so retry on every tap, forever.
   */
  installResumeOnGesture() {
    const resume = () => {
      if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
      if (this.silentEl?.paused) this.silentEl.play().catch(() => {});
    };
    for (const evt of ['touchend', 'mousedown', 'keydown']) {
      document.addEventListener(evt, resume, { passive: true });
    }
  }

  /**
   * iOS routes Web Audio through the "ambient" audio session, which the
   * ring/silent switch mutes. A looping (silent) <audio> element flips the
   * session to "playback", so the piano sounds with the switch on silent.
   */
  startSilentKeepalive() {
    this.silentEl = document.createElement('audio');
    this.silentEl.setAttribute('playsinline', '');
    this.silentEl.src = 'assets/silence.wav';
    this.silentEl.loop = true;
    this.silentEl.play().catch(() => {});
  }

  /** Create/resume the AudioContext and load all samples. Call from a user gesture. */
  async init(onProgress = () => {}) {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.startSilentKeepalive();
      this.installResumeOnGesture();
    }
    await this.ctx.resume();
    // classic iOS unlock: route one silent buffer through the graph inside the gesture
    const unlock = this.ctx.createBufferSource();
    unlock.buffer = this.ctx.createBuffer(1, 1, 22050);
    unlock.connect(this.ctx.destination);
    unlock.start(0);
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
        const bytes = await fetchArrayBuffer(`${this.baseUrl}/${name}.mp3`);
        const buf = await this.ctx.decodeAudioData(bytes);
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
