/**
 * Gerenciador de Preferências de Leitura & Acessibilidade (WCAG 2.2 AAA).
 * Aplica estilos dinâmicos diretamente em variáveis CSS globais e classes no <html>.
 */
import { savePreferences, getPreferences } from '../firebase/services.js';
import { speechEngine } from './speechEngine.js';

export const DEFAULT_PREFERENCES = {
  fontFamily: 'lexend',     // 'lexend' | 'opendyslexic' | 'inter' | 'merriweather'
  fontSize: 18,             // 14 | 16 | 18 | 20 | 22 | 24 | 28 | 32
  lineHeight: 1.8,          // 1.5 | 1.8 | 2.2
  letterSpacing: 0.05,      // 0 | 0.05 | 0.10
  wordSpacing: 0.15,        // 0 | 0.15 | 0.30
  textAlign: 'left',        // 'left' | 'justify'
  theme: 'theme-light-comfort', // 'theme-light-comfort' | 'theme-night-modern' | 'theme-high-contrast' | 'theme-monochrome'
  voiceRate: 1.0,
  voicePitch: 1.0,
  voiceURI: ''
};

class PreferencesManager {
  constructor() {
    this.prefs = { ...DEFAULT_PREFERENCES };
    this.listeners = [];
  }

  init() {
    const saved = getPreferences();
    if (saved) {
      this.prefs = { ...DEFAULT_PREFERENCES, ...saved };
    }
    this.apply();
  }

  get() {
    return { ...this.prefs };
  }

  update(partial) {
    this.prefs = { ...this.prefs, ...partial };
    savePreferences(this.prefs);
    this.apply();
    this.notify();
  }

  apply() {
    const root = document.documentElement;

    // Remove classes anteriores de tema
    root.classList.remove(
      'theme-light-comfort',
      'theme-night-modern',
      'theme-high-contrast',
      'theme-monochrome'
    );
    root.classList.add(this.prefs.theme);

    // Mapeamento de famílias de fonte
    let fontStack = "'Lexend', sans-serif";
    if (this.prefs.fontFamily === 'opendyslexic') {
      fontStack = "'OpenDyslexic', 'Lexend', sans-serif";
    } else if (this.prefs.fontFamily === 'inter') {
      fontStack = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    } else if (this.prefs.fontFamily === 'merriweather') {
      fontStack = "'Merriweather', Georgia, serif";
    }

    // Variáveis CSS dinâmicas
    root.style.setProperty('--reader-font-family', fontStack);
    root.style.setProperty('--reader-font-size', `${this.prefs.fontSize}px`);
    root.style.setProperty('--reader-line-height', `${this.prefs.lineHeight}`);
    root.style.setProperty('--reader-letter-spacing', `${this.prefs.letterSpacing}em`);
    root.style.setProperty('--reader-word-spacing', `${this.prefs.wordSpacing}em`);
    root.style.setProperty('--reader-text-align', this.prefs.textAlign);

    // Atualiza o motor de voz
    speechEngine.setRate(this.prefs.voiceRate);
    speechEngine.setPitch(this.prefs.voicePitch);
    if (this.prefs.voiceURI) {
      speechEngine.setVoice(this.prefs.voiceURI);
    }
  }

  toggleHighContrast() {
    const nextTheme = this.prefs.theme === 'theme-high-contrast'
      ? 'theme-light-comfort'
      : 'theme-high-contrast';
    this.update({ theme: nextTheme });
    return nextTheme === 'theme-high-contrast';
  }

  increaseFontSize() {
    const sizes = [14, 16, 18, 20, 22, 24, 28, 32];
    const currentIndex = sizes.indexOf(this.prefs.fontSize);
    if (currentIndex < sizes.length - 1) {
      this.update({ fontSize: sizes[currentIndex + 1] });
    }
  }

  decreaseFontSize() {
    const sizes = [14, 16, 18, 20, 22, 24, 28, 32];
    const currentIndex = sizes.indexOf(this.prefs.fontSize);
    if (currentIndex > 0) {
      this.update({ fontSize: sizes[currentIndex - 1] });
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.prefs));
  }
}

export const preferencesManager = new PreferencesManager();
