class CallAudioSignal {
    constructor() {
        this.audioCtx = null;
        this.oscillators = [];
        this.isPlaying = false;
        this.intervalId = null;
    }

    initContext() {
        if (!this.audioCtx) {
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (err) {
                console.error("Failed to initialize AudioContext:", err);
            }
        }
        if (this.audioCtx && this.audioCtx.state === "suspended") {
            this.audioCtx.resume().catch(err => {
                console.warn("AudioContext resume failed:", err);
            });
        }
    }

    playDialtone() {
        this.stop();
        this.initContext();
        this.isPlaying = true;

        const playPulse = () => {
            if (!this.isPlaying) return;

            const osc1 = this.audioCtx.createOscillator();
            const osc2 = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc1.type = "sine";
            osc2.type = "sine";
            osc1.frequency.value = 440;
            osc2.frequency.value = 480;

            const now = this.audioCtx.currentTime;
            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
            gain.gain.setValueAtTime(0.08, now + 1.8);
            gain.gain.linearRampToValueAtTime(0.0, now + 2.0);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc1.start(now);
            osc2.start(now);

            osc1.stop(now + 2.0);
            osc2.stop(now + 2.0);

            this.oscillators.push(osc1, osc2);
        };

        playPulse();
        // Dialtone: 2s sound, 2s silence -> cycle repeats every 4s
        this.intervalId = setInterval(playPulse, 4000);
    }

    playRingtone() {
        this.stop();
        this.initContext();
        this.isPlaying = true;

        const playPattern = () => {
            if (!this.isPlaying) return;

            const playBeep = (delay, duration) => {
                const now = this.audioCtx.currentTime + delay;
                const osc1 = this.audioCtx.createOscillator();
                const osc2 = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();

                osc1.type = "sine";
                osc2.type = "sine";
                osc1.frequency.value = 480;
                osc2.frequency.value = 620;

                gain.gain.setValueAtTime(0.0, now);
                gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
                gain.gain.setValueAtTime(0.12, now + duration - 0.05);
                gain.gain.linearRampToValueAtTime(0.0, now + duration);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc1.start(now);
                osc2.start(now);

                osc1.stop(now + duration);
                osc2.stop(now + duration);

                this.oscillators.push(osc1, osc2);
            };

            // Standard double ring: Ring for 0.4s, pause 0.2s, Ring for 0.4s, pause 2.0s
            playBeep(0, 0.4);
            playBeep(0.6, 0.4);
        };

        playPattern();
        this.intervalId = setInterval(playPattern, 3000);
    }

    stop() {
        this.isPlaying = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.oscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (err) {
                // Ignore oscillator stop errors if they already stopped
                void err;
            }
        });
        this.oscillators = [];
    }
}

export const audioSignal = new CallAudioSignal();

if (typeof window !== "undefined") {
    const unlockAudio = () => {
        audioSignal.initContext();
        if (audioSignal.audioCtx) {
            try {
                const buffer = audioSignal.audioCtx.createBuffer(1, 1, 22050);
                const source = audioSignal.audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioSignal.audioCtx.destination);
                source.start(0);
                console.log("AudioContext unlocked and silent buffer played.");
            } catch (err) {
                console.warn("Silent buffer play failed:", err);
            }
        }
        window.removeEventListener("click", unlockAudio);
        window.removeEventListener("touchstart", unlockAudio);
    };
    window.addEventListener("click", unlockAudio, { passive: true });
    window.addEventListener("touchstart", unlockAudio, { passive: true });
}
