// The dive's sound. The sonar's ping: a recorded sample when one is configured (LAKE_DIVE_CONFIG.soundSrc, decoded
// once), else a synthesised ping in the manner of a submarine's: a bright transient, a clean tone chirping down a
// little with a quiet upper partial, all ringing into a long tail (a convolver fed a synthesised impulse response),
// under a low-pass for the water. The rock: a knock on each fresh contact and a grinding scrape while the craft is
// pressed against it, in the water like the ping, and the crunch of the hull giving out. The system's alarm is
// the craft's own, dry and outside the water's low-pass: pips repeating while the craft is on the wall, quicker
// once the hull is critical, and a slow double pip when critical off the wall. The context is one for the page,
// made and resumed inside the tap that starts the dive (unlockSonarAudio): mobile browsers keep a context made
// later, outside a gesture, silent.

/** 0 silent; 1 the hull critical, off the wall; 2 against the wall; 3 against the wall with the hull critical. */
export type AlarmLevel = 0 | 1 | 2 | 3;

export type Sonar = {
  /** Plays a ping now. */
  ping: (volume: number) => void;
  /** The system's alarm, repeating at the level's pattern until the level changes. */
  alarm: (level: AlarmLevel, volume: number) => void;
  /** A fresh contact with the rock: `strength` 0..1, the share of full speed carried into it. */
  knock: (strength: number, volume: number) => void;
  /** The grind of the hull on the rock, 0..1, eased; 0 is silent. */
  scrape: (level: number, volume: number) => void;
  /** The hull gives out: a crunch, the systems winding down, then silence (the alarm and scrape stop). */
  breach: (volume: number) => void;
  dispose: () => void;
};

// The alarm's patterns: seconds between repeats, the pips' offsets, their pitch and loudness.
const ALARMS = {
  1: {period: 1.7, pips: [0, 0.16], frequency: 740, peak: 0.07},
  2: {period: 0.8, pips: [0, 0.1, 0.2], frequency: 960, peak: 0.1},
  3: {period: 0.42, pips: [0, 0.1], frequency: 1180, peak: 0.12},
} as const;

const REVERB_SECONDS = 4.2;

let shared: AudioContext | null = null;

function audioContext() {
  if (shared) return shared;
  const Context = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext})
    .webkitAudioContext;
  if (!Context) return null;
  shared = new Context();
  return shared;
}

/** Makes and resumes the page's audio context; call it from a user gesture (the tap that starts the dive). */
export function unlockSonarAudio() {
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state !== 'running') void ctx.resume();
  // Older iOS Safari unlocks only on a sound started inside the gesture: a silent sample.
  const source = ctx.createBufferSource();
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  source.connect(ctx.destination);
  source.start();
}

/** An impulse response: noise decaying over the tail, duller as it goes, with a few early reflections. */
function impulseResponse(ctx: AudioContext) {
  const length = Math.ceil(ctx.sampleRate * REVERB_SECONDS);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let low = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const raw = Math.random() * 2 - 1;
      low += (raw - low) * (0.5 - 0.42 * t);
      data[i] = low * Math.pow(1 - t, 2.8) * (0.15 + 0.85 * Math.exp(-t * 3.5));
    }
    // Early reflections: the walls close by, a little later on one side than the other.
    for (const [seconds, gain] of [[0.045, 0.5], [0.11, 0.35], [0.19, 0.25], [0.3, 0.18]] as const) {
      const at = Math.floor((seconds + channel * 0.012) * ctx.sampleRate);
      for (let k = 0; k < 40 && at + k < length; k++) data[at + k] += (Math.random() * 2 - 1) * gain * (1 - k / 40);
    }
  }
  return buffer;
}

export function createSonar(sampleSrc = ''): Sonar {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let dry: GainNode | null = null;
  let wet: GainNode | null = null;
  let sample: AudioBuffer | null = null;
  let sampleLoading = false;
  // The craft's own bus: dry, outside the water's low-pass.
  let cabin: GainNode | null = null;
  let alarmLevel: AlarmLevel = 0;
  let alarmTimer: number | null = null;
  let scrapeGain: GainNode | null = null;
  let scrapeSource: AudioBufferSourceNode | null = null;
  let scrapeLevel = 0;

  const ensure = () => {
    if (context) return context;
    context = audioContext();
    if (!context) return null;
    master = context.createGain();
    // The water: a gentle low-pass on everything.
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3600;
    lowpass.Q.value = 0.5;
    master.connect(lowpass).connect(context.destination);
    dry = context.createGain();
    dry.gain.value = 0.6;
    dry.connect(master);
    const convolver = context.createConvolver();
    convolver.buffer = impulseResponse(context);
    wet = context.createGain();
    wet.gain.value = 0.7;
    wet.connect(convolver).connect(master);
    cabin = context.createGain();
    cabin.connect(context.destination);
    return context;
  };

  /** The context, made and resumed, with the volume applied; null without Web Audio. */
  const ready = (volume: number) => {
    const ctx = ensure();
    if (!ctx || !master || !cabin) return null;
    if (ctx.state !== 'running') void ctx.resume();
    master.gain.value = volume;
    cabin.gain.value = volume;
    return ctx;
  };

  const stopAlarm = () => {
    if (alarmTimer !== null) window.clearInterval(alarmTimer);
    alarmTimer = null;
    alarmLevel = 0;
  };

  const loadSample = (ctx: AudioContext) => {
    if (!sampleSrc || sample || sampleLoading) return;
    sampleLoading = true;
    void fetch(sampleSrc)
      .then((response) => response.arrayBuffer())
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((decoded) => {
        sample = decoded;
      })
      .catch(() => {
        // The synthesised ping stands in.
      })
      .finally(() => {
        sampleLoading = false;
      });
  };

  const tone = (
    ctx: AudioContext, at: number, from: number, to: number, seconds: number, peak: number, type: OscillatorType,
  ) => {
    if (!dry || !wet) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, at);
    oscillator.frequency.exponentialRampToValueAtTime(to, at + seconds);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), at + 0.006);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.3, 0.0001), at + seconds * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    oscillator.connect(gain);
    gain.connect(dry);
    gain.connect(wet);
    oscillator.start(at);
    oscillator.stop(at + seconds + 0.05);
  };

  const noise = (ctx: AudioContext, at: number, seconds: number, peak: number, frequency: number, q: number) => {
    if (!dry || !wet) return;
    const length = Math.ceil(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = frequency;
    band.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = peak;
    source.connect(band).connect(gain);
    gain.connect(dry);
    gain.connect(wet);
    source.start(at);
  };

  // One pip of the alarm: a square wave softened a little, hard on and off, on the cabin bus.
  const pip = (ctx: AudioContext, at: number, frequency: number, peak: number) => {
    if (!cabin) return;
    const oscillator = ctx.createOscillator();
    const soften = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    soften.type = 'lowpass';
    soften.frequency.value = 2800;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.004);
    gain.gain.setValueAtTime(peak, at + 0.055);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    oscillator.connect(soften).connect(gain).connect(cabin);
    oscillator.start(at);
    oscillator.stop(at + 0.09);
  };

  // The scrape's loop: brown noise with a sparse grit of cracks through it, run through a low band.
  const startScrape = (ctx: AudioContext) => {
    if (scrapeGain || !dry || !wet) return;
    const seconds = 2.5;
    const length = Math.ceil(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    let grit = 0;
    for (let i = 0; i < length; i++) {
      brown = (brown + (Math.random() * 2 - 1) * 0.06) * 0.995;
      if (Math.random() < 40 / ctx.sampleRate) grit = 0.6 + Math.random() * 0.6;
      grit *= 0.996;
      data[i] = brown * 2.4 + (Math.random() * 2 - 1) * grit * 0.5;
    }
    // The loop's end faded into its start, so the seam does not click.
    const seam = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < seam; i++) {
      data[length - seam + i] = data[length - seam + i] * (1 - i / seam) + data[i] * (i / seam);
    }
    scrapeSource = ctx.createBufferSource();
    scrapeSource.buffer = buffer;
    scrapeSource.loop = true;
    scrapeSource.loopStart = 0.05;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420;
    band.Q.value = 0.9;
    scrapeGain = ctx.createGain();
    scrapeGain.gain.value = 0;
    scrapeSource.connect(band).connect(scrapeGain);
    scrapeGain.connect(dry);
    scrapeGain.connect(wet);
    scrapeSource.start();
  };

  return {
    ping: (volume) => {
      if (volume <= 0) return;
      const ctx = ready(volume);
      if (!ctx) return;
      const now = ctx.currentTime + 0.01;
      loadSample(ctx);
      if (sample && dry && wet) {
        const source = ctx.createBufferSource();
        source.buffer = sample;
        source.connect(dry);
        source.connect(wet);
        source.start(now);
        return;
      }
      // The transient: a bright tick as the transducer fires.
      noise(ctx, now, 0.05, 0.35, 2600, 1.2);
      // The tone: chirping down a little, its near twin for the shimmer, a quiet partial above, a deeper body.
      tone(ctx, now, 1500, 1380, 1.4, 0.5, 'sine');
      tone(ctx, now, 1509, 1386, 1.3, 0.28, 'sine');
      tone(ctx, now, 3300, 3100, 0.5, 0.05, 'sine');
      tone(ctx, now, 420, 380, 0.4, 0.1, 'triangle');
    },
    alarm: (level, volume) => {
      if (volume <= 0) level = 0;
      if (level === alarmLevel) return;
      stopAlarm();
      if (level === 0) return;
      const ctx = ready(volume);
      if (!ctx) return;
      alarmLevel = level;
      const pattern = ALARMS[level];
      const sound = () => {
        const now = ctx.currentTime + 0.005;
        for (const at of pattern.pips) pip(ctx, now + at, pattern.frequency, pattern.peak);
      };
      sound();
      alarmTimer = window.setInterval(sound, pattern.period * 1000);
    },
    knock: (strength, volume) => {
      if (volume <= 0) return;
      const ctx = ready(volume);
      if (!ctx) return;
      const now = ctx.currentTime + 0.005;
      const weight = 0.3 + 0.7 * Math.min(1, strength * 1.5);
      // A dull thump through the hull and the rock's crack on it.
      tone(ctx, now, 120, 42, 0.45, 0.55 * weight, 'sine');
      noise(ctx, now, 0.16, 0.7 * weight, 650, 0.8);
    },
    scrape: (level, volume) => {
      if (volume <= 0) level = 0;
      if (level === scrapeLevel) return;
      scrapeLevel = level;
      if (level <= 0) {
        if (scrapeGain && context) scrapeGain.gain.setTargetAtTime(0, context.currentTime, 0.12);
        return;
      }
      const ctx = ready(volume);
      if (!ctx) return;
      startScrape(ctx);
      if (!scrapeGain || !scrapeSource) return;
      scrapeGain.gain.setTargetAtTime(level * 0.55, ctx.currentTime, 0.04);
      scrapeSource.playbackRate.setTargetAtTime(0.8 + 0.4 * level, ctx.currentTime, 0.1);
    },
    breach: (volume) => {
      stopAlarm();
      scrapeLevel = 0;
      if (scrapeGain && context) scrapeGain.gain.setTargetAtTime(0, context.currentTime, 0.05);
      if (volume <= 0) return;
      const ctx = ready(volume);
      if (!ctx || !cabin) return;
      const now = ctx.currentTime + 0.005;
      // The crunch: a long low burst of rock and metal, a groan under it.
      noise(ctx, now, 0.9, 1.1, 320, 0.6);
      noise(ctx, now + 0.05, 0.4, 0.6, 1400, 1.4);
      tone(ctx, now, 170, 48, 1.8, 0.45, 'sawtooth');
      tone(ctx, now, 90, 30, 1.2, 0.6, 'sine');
      // The systems winding down: one long falling tone on the cabin bus, then nothing.
      const oscillator = ctx.createOscillator();
      const soften = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(960, now + 0.25);
      oscillator.frequency.exponentialRampToValueAtTime(70, now + 1.4);
      soften.type = 'lowpass';
      soften.frequency.value = 1800;
      gain.gain.setValueAtTime(0.0001, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.27);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      oscillator.connect(soften).connect(gain).connect(cabin);
      oscillator.start(now + 0.25);
      oscillator.stop(now + 1.45);
    },
    dispose: () => {
      stopAlarm();
      scrapeSource?.stop();
      scrapeSource = null;
      scrapeGain = null;
      scrapeLevel = 0;
      // The context is the page's; only this sonar's graph is let go.
      master?.disconnect();
      cabin?.disconnect();
      context = null;
      master = null;
      dry = null;
      wet = null;
      cabin = null;
      sample = null;
    },
  };
}
