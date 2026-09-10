export class ArcadeAudio {
  enabled = true;
  private context?: AudioContext;
  private master?: GainNode;

  unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.context.destination);
    }
    void this.context.resume();
  }

  private tone(frequency: number, time: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
    if (!this.enabled || !this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime + time);
    envelope.gain.setValueAtTime(0, this.context.currentTime + time);
    envelope.gain.linearRampToValueAtTime(volume, this.context.currentTime + time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + time + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(this.context.currentTime + time);
    oscillator.stop(this.context.currentTime + time + duration + 0.01);
  }

  drop() {
    this.tone(1600, 0, 0.07, 'triangle', 0.5);
    this.tone(2400, 0.025, 0.12, 'sine', 0.35);
    this.tone(660, 0.12, 0.16, 'triangle', 0.16);
  }

  clink(strength = 1) {
    this.tone(1800 + Math.random() * 1800, 0, 0.045, 'sine', 0.07 * strength);
  }

  plink() {
    const note = [659, 784, 988, 1175][Math.floor(Math.random() * 4)];
    this.tone(note, 0, 0.13, 'triangle', 0.22);
    this.tone(note * 2, 0, 0.055, 'sine', 0.08);
  }

  sharkApproach() {
    [0, 0.65, 1.15, 1.6].forEach((time, i) => this.tone(i % 2 ? 87 : 82, time, 0.45, 'triangle', 0.38));
  }

  sharkBump() {
    this.tone(42, 0, 0.7, 'sine', 0.95);
    this.tone(74, 0.02, 0.38, 'triangle', 0.65);
    [0.08, 0.16, 0.25].forEach(time => this.tone(1800 + Math.random() * 1500, time, 0.15, 'sine', 0.15));
  }

  win(count: number) {
    const notes = count > 5 ? [523.25, 659.25, 783.99, 1046.5] : [1046.5, 1318.5, 1568];
    notes.forEach((note, index) => this.tone(note, index * 0.075, 0.28, 'triangle', 0.25));
  }

  bonus() {
    [523, 659, 784, 1047, 1319, 1568].forEach((note, i) => this.tone(note, i * 0.09, 0.45, 'triangle', 0.3));
  }

  nudge() {
    this.tone(65, 0, 0.25, 'triangle', 0.8);
    this.tone(48, 0.05, 0.35, 'sine', 0.6);
  }

  tilt() {
    [0, 0.22, 0.44].forEach(time => this.tone(155, time, 0.18, 'sawtooth', 0.17));
  }
}
