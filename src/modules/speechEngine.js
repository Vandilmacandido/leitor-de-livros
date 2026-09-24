/**
 * Motor de Síntese de Voz (Web Speech API) para o AcessiRead.
 * Implementa reprodução frase a frase, seleção de voz em português,
 * controle de velocidade, tom e tratamento de bugs do navegador.
 */

class SpeechEngine {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.selectedVoiceURI = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.state = 'idle'; // 'idle' | 'playing' | 'paused'
    this.currentUtterance = null;
    this.currentSentence = null;
    this.watchdogInterval = null;

    // Callbacks
    this.onSentenceStart = null;
    this.onSentenceEnd = null;
    this.onStateChange = null;
    this.onError = null;

    this.initVoices();
  }

  isSupported() {
    return Boolean(this.synth && typeof window.SpeechSynthesisUtterance !== 'undefined');
  }

  initVoices() {
    if (!this.isSupported()) return;

    const load = () => {
      this.voices = this.synth.getVoices();
      if (!this.selectedVoiceURI && this.voices.length > 0) {
        // Tenta selecionar uma voz em português brasileiro por padrão
        const ptBr = this.voices.find(v => v.lang === 'pt-BR' || v.lang.startsWith('pt'));
        if (ptBr) {
          this.selectedVoiceURI = ptBr.voiceURI;
        } else {
          this.selectedVoiceURI = this.voices[0].voiceURI;
        }
      }
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  getVoices() {
    if (!this.voices || this.voices.length === 0) {
      if (this.synth) this.voices = this.synth.getVoices();
    }

    // Ordena colocando vozes em Português primeiro
    return [...this.voices].sort((a, b) => {
      const aPt = a.lang.toLowerCase().startsWith('pt');
      const bPt = b.lang.toLowerCase().startsWith('pt');
      if (aPt && !bPt) return -1;
      if (!aPt && bPt) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  setVoice(voiceURI) {
    this.selectedVoiceURI = voiceURI;
  }

  setRate(rate) {
    this.rate = Math.max(0.5, Math.min(2.5, rate));
  }

  setPitch(pitch) {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  getSelectedVoice() {
    return this.voices.find(v => v.voiceURI === this.selectedVoiceURI) || null;
  }

  speakSentence(sentence, options = {}) {
    if (!this.isSupported()) {
      if (this.onError) this.onError('Síntese de voz não suportada neste navegador.');
      return;
    }

    this.stop(false);

    if (!sentence || !sentence.text) return;

    this.currentSentence = sentence;
    const utterance = new SpeechSynthesisUtterance(sentence.text);
    this.currentUtterance = utterance;

    const voice = this.getSelectedVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'pt-BR';
    }

    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onstart = () => {
      this.state = 'playing';
      this.startWatchdog();
      if (this.onStateChange) this.onStateChange(this.state);
      if (this.onSentenceStart) this.onSentenceStart(sentence);
      if (options.onStart) options.onStart(sentence);
    };

    utterance.onend = () => {
      this.clearWatchdog();
      const endedSentence = this.currentSentence;
      this.currentUtterance = null;
      if (this.onSentenceEnd) this.onSentenceEnd(endedSentence);
      if (options.onEnd) options.onEnd(endedSentence);
    };

    utterance.onerror = (e) => {
      this.clearWatchdog();
      this.currentUtterance = null;
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('Erro na síntese de voz:', e);
        if (this.onError) this.onError(e.error);
        if (options.onError) options.onError(e.error);
      }
    };

    this.synth.speak(utterance);
  }

  pause() {
    if (!this.isSupported()) return;
    if (this.state === 'playing') {
      this.synth.pause();
      this.state = 'paused';
      this.clearWatchdog();
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  resume() {
    if (!this.isSupported()) return;
    if (this.state === 'paused') {
      this.synth.resume();
      this.state = 'playing';
      this.startWatchdog();
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  stop(notifyState = true) {
    if (!this.isSupported()) return;
    this.clearWatchdog();
    this.synth.cancel();
    this.currentUtterance = null;
    this.state = 'idle';
    if (notifyState && this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  /**
   * Toca uma amostra de teste para a configuração de voz atual
   */
  speakSample(customText = 'Olá! Esta é uma demonstração da voz acessível do AcessiRead.') {
    this.speakSentence({
      id: 'sample',
      text: customText
    });
  }

  /**
   * Watchdog para evitar que navegadores como Chrome suspendam a fala em textos longos
   */
  startWatchdog() {
    this.clearWatchdog();
    this.watchdogInterval = setInterval(() => {
      if (this.synth && this.state === 'playing') {
        this.synth.pause();
        this.synth.resume();
      }
    }, 12000);
  }

  clearWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }
}

export const speechEngine = new SpeechEngine();
