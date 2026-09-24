/**
 * Navegação e Acessibilidade por Teclado (WCAG 2.2).
 * Trata atalhos globais, anúncio acessível para leitores de tela e armadilha de foco.
 */
import { preferencesManager } from './preferences.js';

class KeyboardNavManager {
  constructor() {
    this.handlers = {
      onPlayPause: null,
      onNextSentence: null,
      onPrevSentence: null,
      onBackToLibrary: null,
      onOpenPreferences: null,
      onOpenShortcutsHelp: null,
      onStop: null,
      onCloseModals: null
    };
    this.announcerEl = null;
  }

  init(handlers = {}) {
    this.handlers = { ...this.handlers, ...handlers };
    this.announcerEl = document.getElementById('sr-announcer');

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  handleKeyDown(e) {
    // Não intercepta se o usuário estiver digitando em um input, textarea ou select
    const targetTag = e.target.tagName.toLowerCase();
    const isEditing = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || e.target.isContentEditable;

    if (isEditing && e.key !== 'Escape') {
      return;
    }

    // Escape: fecha modais ou para leitura
    if (e.key === 'Escape') {
      if (this.handlers.onCloseModals && this.handlers.onCloseModals()) {
        e.preventDefault();
        return;
      }
      if (this.handlers.onStop) {
        e.preventDefault();
        this.handlers.onStop();
        this.announce('Reprodução parada.');
      }
      return;
    }

    // Alt + C: Alternar Alto Contraste
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      const isHigh = preferencesManager.toggleHighContrast();
      this.announce(isHigh ? 'Modo Alto Contraste Amarelo e Preto ativado.' : 'Modo Claro Conforto ativado.');
      return;
    }

    // Alt + T ou Alt + A: Abrir Ajustes de Leitura
    if (e.altKey && (e.key === 't' || e.key === 'T' || e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      if (this.handlers.onOpenPreferences) this.handlers.onOpenPreferences();
      this.announce('Painel de preferências de leitura aberto.');
      return;
    }

    // Alt + B: Voltar para Biblioteca
    if (e.altKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      if (this.handlers.onBackToLibrary) this.handlers.onBackToLibrary();
      this.announce('Retornando para a biblioteca.');
      return;
    }

    // Tecla ? : Abrir Guia de Atalhos
    if (e.key === '?' && !e.shiftKey) {
      e.preventDefault();
      if (this.handlers.onOpenShortcutsHelp) this.handlers.onOpenShortcutsHelp();
      this.announce('Guia de atalhos de teclado aberto.');
      return;
    }

    // Apenas no leitor de documentos:
    const isReaderActive = document.getElementById('view-reader')?.classList.contains('active');
    if (!isReaderActive) return;

    // Espaço: Play / Pause
    if (e.code === 'Space' && !isEditing) {
      e.preventDefault();
      if (this.handlers.onPlayPause) this.handlers.onPlayPause();
      return;
    }

    // Seta Direita: Próxima Frase
    if (e.key === 'ArrowRight' && !e.altKey) {
      e.preventDefault();
      if (this.handlers.onNextSentence) this.handlers.onNextSentence();
      return;
    }

    // Seta Esquerda: Frase Anterior
    if (e.key === 'ArrowLeft' && !e.altKey) {
      e.preventDefault();
      if (this.handlers.onPrevSentence) this.handlers.onPrevSentence();
      return;
    }

    // + / =: Aumentar Fonte
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      preferencesManager.increaseFontSize();
      this.announce(`Tamanho do texto aumentado para ${preferencesManager.get().fontSize} pixels.`);
      return;
    }

    // -: Diminuir Fonte
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      preferencesManager.decreaseFontSize();
      this.announce(`Tamanho do texto reduzido para ${preferencesManager.get().fontSize} pixels.`);
      return;
    }
  }

  /**
   * Envia uma mensagem para o leitor de telas via região ARIA Live
   */
  announce(message, assertive = false) {
    if (!this.announcerEl) {
      this.announcerEl = document.getElementById('sr-announcer');
    }
    if (!this.announcerEl) return;

    this.announcerEl.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    this.announcerEl.textContent = '';
    setTimeout(() => {
      this.announcerEl.textContent = message;
    }, 50);
  }
}

export const keyboardNav = new KeyboardNavManager();
