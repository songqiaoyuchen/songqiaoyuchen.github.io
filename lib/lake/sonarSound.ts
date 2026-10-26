// The sonar's sound: a recorded sample when one is configured (LAKE_DIVE_CONFIG.soundSrc, decoded once), else a
// synthesised ping in the manner of a submarine's: a bright transient, a clean tone chirping down a little with a
// quiet upper partial, all ringing into a long tail (a convolver fed a synthesised impulse response), under a
// low-pass for the water. Also the system's warning when the craft meets the wall. The context is made on the first
// sound, which follows the click on the lake, so the page already has the gesture browsers require.

export type Sonar = {
  /** Plays a ping now. */
  ping: (volume: number) => void;
  /** The craft is against the wall: the system's warning, a soft two-tone pattern repeating while it lasts. */
  contact: (active: boolean, volume: number) => void;
  dispose: () => void;
};

const REVERB_SECONDS = 4.2;

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
  let contactTimer: number | null = null;

  const ensure = () => {
    if (context) return context;
    const Context = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext})
      .webkitAudioContext;
    if (!Context) return null;
    context = new Context();
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
    return context;
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

  return {
    ping: (volume) => {
      if (volume <= 0) return;
      const ctx = ensure();
      if (!ctx || !master) return;
      if (ctx.state === 'suspended') void ctx.resume();
      master.gain.value = volume;
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
    contact: (active, volume) => {
      if (!active || volume <= 0) {
        if (contactTimer !== null) window.clearInterval(contactTimer);
        contactTimer = null;
        return;
      }
      if (contactTimer !== null) return;
      const ctx = ensure();
      if (!ctx || !master || !dry) return;
      if (ctx.state === 'suspended') void ctx.resume();
      master.gain.value = volume;
      const blip = () => {
        if (!dry) return;
        const now = ctx.currentTime + 0.005;
        // Two short, clean tones from the system, dry: a warning, repeating while the contact lasts.
        for (const [at, frequency] of [[0, 700], [0.12, 520]] as const) {
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, now + at);
          gain.gain.exponentialRampToValueAtTime(0.16, now + at + 0.008);
          gain.gain.setValueAtTime(0.16, now + at + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.1);
          oscillator.connect(gain).connect(dry);
          oscillator.start(now + at);
          oscillator.stop(now + at + 0.14);
        }
      };
      blip();
      contactTimer = window.setInterval(blip, 700);
    },
    dispose: () => {
      if (contactTimer !== null) window.clearInterval(contactTimer);
      contactTimer = null;
      void context?.close();
      context = null;
      master = null;
      dry = null;
      wet = null;
      sample = null;
    },
  };
}
