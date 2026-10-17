// Banda sonora sintetizada de la intro. No hay archivos de audio: cada sonido
// se genera con la Web Audio API, asi que no hay nada que descargar ni
// licencias de las que preocuparse.
// Se tiene que crear dentro de una accion del usuario (un clic): los
// navegadores bloquean el audio hasta que el usuario interactua con la pagina.

const MASTER_LEVEL = 0.85;

function makeImpulse(ctx, seconds, decay) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function makeNoise(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createIntroAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  const ctx = new AudioCtx();
  ctx.resume?.().catch(() => {});

  const master = ctx.createGain();
  master.gain.value = MASTER_LEVEL;
  const compressor = ctx.createDynamicsCompressor();
  master.connect(compressor);
  compressor.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx, 3, 2.6);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.4;
  reverb.connect(reverbOut);
  reverbOut.connect(master);

  // Cada sonido va directo a la salida y una parte a la reverberacion
  const connectOut = (node, wet = 0.5) => {
    node.connect(master);
    if (wet > 0) {
      const send = ctx.createGain();
      send.gain.value = wet;
      node.connect(send);
      send.connect(reverb);
    }
  };

  const safeClose = () => {
    if (ctx.state !== 'closed') ctx.close().catch(() => {});
  };

  let pad = null;

  function tone({
    freq,
    type = 'sine',
    start,
    attack = 0.005,
    decay = 1.5,
    level = 0.2,
    wet = 0.5,
    glideTo,
  }) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo)
      osc.frequency.exponentialRampToValueAtTime(glideTo, start + decay * 0.6);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
    osc.connect(gain);
    connectOut(gain, wet);
    osc.start(start);
    osc.stop(start + attack + decay + 0.05);
  }

  // Nota tipo campana: la fundamental mas dos armonicos mas suaves y cortos
  function bell(freq, start, level, decay = 2.4, attack = 0.004) {
    tone({ freq, start, attack, decay, level });
    tone({
      freq: freq * 2.01,
      start,
      attack,
      decay: decay * 0.6,
      level: level * 0.3,
    });
    tone({
      freq: freq * 3.02,
      start,
      attack,
      decay: decay * 0.35,
      level: level * 0.12,
    });
  }

  return {
    // Colchon grave de ambiente que acompaña toda la intro
    startPad() {
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 3.5);

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 140;
      lfo.connect(lfoDepth);
      lfoDepth.connect(filter.frequency);

      const oscs = [110, 110 * 1.004, 164.81].map((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.connect(filter);
        osc.start(now);
        return osc;
      });

      filter.connect(gain);
      connectOut(gain, 0.6);
      lfo.start(now);
      pad = { filter, gain, oscs, lfo };
    },

    // Latido "lub-dub" mas un pitido suave de monitor cardiaco
    heartbeat() {
      const t = ctx.currentTime;
      tone({
        freq: 70,
        glideTo: 38,
        start: t,
        attack: 0.008,
        decay: 0.22,
        level: 0.9,
        wet: 0.15,
      });
      tone({
        freq: 62,
        glideTo: 34,
        start: t + 0.19,
        attack: 0.008,
        decay: 0.2,
        level: 0.6,
        wet: 0.15,
      });
      tone({
        freq: 988,
        start: t,
        attack: 0.004,
        decay: 0.12,
        level: 0.06,
        wet: 0.3,
      });
    },

    // Una nota ascendente por cada cuarto del anillo (arpegio de La mayor)
    chime(step) {
      const notes = [440, 554.37, 659.25, 880];
      const freq = notes[step % notes.length];
      const t = ctx.currentTime;
      bell(freq, t, 0.22);
      tone({
        freq: freq / 2,
        type: 'triangle',
        start: t,
        attack: 0.02,
        decay: 1.6,
        level: 0.06,
      });
    },

    // Barrido de aire y acorde completo cuando aparece el logo
    finale() {
      const t = ctx.currentTime;

      const noise = ctx.createBufferSource();
      noise.buffer = makeNoise(ctx, 1.6);
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 1.2;
      band.frequency.setValueAtTime(250, t);
      band.frequency.exponentialRampToValueAtTime(3200, t + 1.1);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.18, t + 0.6);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      noise.connect(band);
      band.connect(noiseGain);
      connectOut(noiseGain, 0.6);
      noise.start(t);
      noise.stop(t + 1.6);

      [220, 329.63, 440, 554.37, 659.25].forEach((freq, i) =>
        bell(freq, t + 0.45 + i * 0.06, 0.12, 4.2, 0.03),
      );

      if (pad) pad.filter.frequency.setTargetAtTime(1400, t + 0.4, 0.8);
    },

    setMuted(muted) {
      master.gain.setTargetAtTime(
        muted ? 0 : MASTER_LEVEL,
        ctx.currentTime,
        0.05,
      );
    },

    fadeOutAndClose(seconds = 0.8) {
      if (ctx.state === 'closed') return;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + seconds);
      setTimeout(safeClose, seconds * 1000 + 100);
    },

    close: safeClose,
  };
}
