// Space Explorer - Web Audio API Synthesis Engine

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    
    // Nodes for ambient background music
    this.musicOsc1 = null;
    this.musicOsc2 = null;
    this.musicFilter = null;
    this.musicGain = null;
    
    // Nodes for engine thruster hum
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.engineActive = false;
  }

  // Initialized on first user click to bypass browser autocomplete/autoplay blocks
  init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API not supported in this browser.");
      return;
    }
    
    this.ctx = new AudioContextClass();
    console.log("Audio Engine Initialized successfully.");
    
    // Start ambient background track
    this.setupBackgroundMusic();
    // Setup continuous engine sound (initially silent)
    this.setupEngineSound();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) {
      if (this.muted) {
        this.ctx.suspend();
      } else {
        this.ctx.resume();
        // Resume engine if it was active
        if (this.engineActive) {
          this.setEngineActive(true);
        }
      }
    }
    return this.muted;
  }

  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
      this.ctx.resume();
    }
  }

  setupBackgroundMusic() {
    if (!this.ctx || this.muted) return;

    try {
      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.setValueAtTime(200, this.ctx.currentTime);
      this.musicFilter.Q.setValueAtTime(1, this.ctx.currentTime);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.04, this.ctx.currentTime); // Soft background drone

      // Node connection: Oscs -> Filter -> Gain -> Destination
      this.musicFilter.connect(this.musicGain);
      this.musicGain.connect(this.ctx.destination);

      // Low pitch drone 1 (Root: C2, ~65.4Hz)
      this.musicOsc1 = this.ctx.createOscillator();
      this.musicOsc1.type = 'sawtooth';
      this.musicOsc1.frequency.setValueAtTime(65.41, this.ctx.currentTime);
      this.musicOsc1.connect(this.musicFilter);

      // Drone 2 (Fifth: G2, ~98.0Hz)
      this.musicOsc2 = this.ctx.createOscillator();
      this.musicOsc2.type = 'triangle';
      this.musicOsc2.frequency.setValueAtTime(97.99, this.ctx.currentTime);
      this.musicOsc2.connect(this.musicFilter);

      this.musicOsc1.start(0);
      this.musicOsc2.start(0);

      // Slow LFO to sweep filter cutoff frequency for spacey movement
      this.lfo = this.ctx.createOscillator();
      this.lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // 10 second sweep
      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(100, this.ctx.currentTime); // sweep range +- 100Hz
      
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.musicFilter.frequency);
      
      this.lfo.start(0);
    } catch (e) {
      console.error("Failed to start background music: ", e);
    }
  }

  setupEngineSound() {
    if (!this.ctx) return;

    try {
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 120;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0; // Initially silent

      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      // Base engine hum
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'triangle';
      this.engineOsc1.frequency.value = 55; // A1
      this.engineOsc1.connect(this.engineFilter);

      // Vibrato/flutter oscillator to simulate engine instability
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'sine';
      this.engineOsc2.frequency.value = 82; // E2
      this.engineOsc2.connect(this.engineFilter);

      this.engineOsc1.start(0);
      this.engineOsc2.start(0);
    } catch (e) {
      console.error("Failed to setup engine sound: ", e);
    }
  }

  // Update engine sound intensity based on ship acceleration/thrust (0 to 1)
  setEngineActive(active, intensity = 0) {
    if (!this.ctx || this.muted || !this.engineGain) return;
    this.engineActive = active;

    const targetGain = active ? 0.08 * (0.3 + intensity * 0.7) : 0.0;
    const targetFreq = 55 + intensity * 35; // sweep pitch from 55Hz to 90Hz
    const targetCutoff = 120 + intensity * 180; // open filter cutoff as ship accelerates

    this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    
    if (this.engineOsc1 && this.engineOsc2 && this.engineFilter) {
      this.engineOsc1.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
      this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, this.ctx.currentTime, 0.1);
      this.engineFilter.frequency.setTargetAtTime(targetCutoff, this.ctx.currentTime, 0.15);
    }
  }

  // Crystal Collect Sound Synthesizer: Sweet chime arpeggio
  playCrystalSound(type = 'common') {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    
    // Different arpeggio frequencies for different crystal types
    let notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Common: Blue)
    let waveType = 'sine';
    
    if (type === 'rare') {
      // C5, E5, G#5, B5 (Rare: Purple)
      notes = [523.25, 659.25, 830.61, 987.77];
      waveType = 'triangle';
    } else if (type === 'hyper') {
      // C5, D5, G5, A5, C6, E6 (Hyper: Gold)
      notes = [523.25, 587.33, 783.99, 880.00, 1046.50, 1318.51];
      waveType = 'sine';
    }

    // Play notes rapidly one after another
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, now + index * 0.06);
      
      gainNode.gain.setValueAtTime(0, now + index * 0.06);
      gainNode.gain.linearRampToValueAtTime(0.06, now + index * 0.06 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.25);
      
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      osc.start(now + index * 0.06);
      osc.stop(now + index * 0.06 + 0.3);
    });
  }

  // Explosion: Generates custom white noise + deep sine wave rumble
  playExplosionSound() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const duration = 0.8;

    try {
      // 1. Synthesize White Noise for the crash impact
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Populate buffer with random values between -1 and 1
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      // Sweep lowpass cutoff down rapidly
      noiseFilter.frequency.setValueAtTime(1000, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(60, now + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseNode.start(now);
      noiseNode.stop(now + duration);

      // 2. Sub-bass sine rumble for physical impact depth
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(90, now);
      subOsc.frequency.linearRampToValueAtTime(40, now + 0.4);
      
      subGain.gain.setValueAtTime(0.2, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      
      subOsc.start(now);
      subOsc.stop(now + 0.55);
    } catch (e) {
      console.error("Explosion sound synthesis error: ", e);
    }
  }

  // Shield Activation/Recharge Sound
  playShieldSound() {
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filterNode = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.45);

    filterNode.type = 'bandpass';
    filterNode.frequency.setValueAtTime(300, now);
    filterNode.frequency.exponentialRampToValueAtTime(1200, now + 0.45);
    filterNode.Q.setValueAtTime(3, now);

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Game Over Sound: Descending sad minor chord progression
  playGameOverSound() {
    if (!this.ctx || this.muted) return;

    // Shut down engine sound hum
    this.setEngineActive(false);

    const now = this.ctx.currentTime;
    // Sad minor chords notes: C4, Eb4, G4, C5 descending to G3, C3
    const notes = [523.25, 392.00, 311.13, 261.63, 196.00, 130.81]; // C5, G4, Eb4, C4, G3, C3

    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      
      // Low pass filter to make it sound muffled and somber
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, now);
      
      osc.frequency.setValueAtTime(freq, now + index * 0.18);
      
      gainNode.gain.setValueAtTime(0, now + index * 0.18);
      gainNode.gain.linearRampToValueAtTime(0.05, now + index * 0.18 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.18 + 0.5);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      osc.start(now + index * 0.18);
      osc.stop(now + index * 0.18 + 0.6);
    });
  }
}

// Global instance to use throughout components
const GameAudio = new AudioEngine();
window.GameAudio = GameAudio;
