/**
 * Sistema de Marca-texto, Destaques e Anotações para o AcessiRead.
 * Suporta seleção direta no texto, múltiplas cores, persistência e leitura sonora.
 */
import { saveHighlight, deleteHighlight, getHighlights } from '../firebase/services.js';
import { keyboardNav } from './keyboardNav.js';

class HighlightsManager {
  constructor() {
    this.currentBookId = null;
    this.userId = null;
    this.highlights = [];
    this.floatingBarEl = null;
    this.activeSelection = null;
    this.onHighlightClick = null;
  }

  init({ userId, bookId, floatingBarEl, onHighlightClick }) {
    this.userId = userId;
    this.currentBookId = bookId;
    this.floatingBarEl = floatingBarEl;
    this.onHighlightClick = onHighlightClick;

    this.bindSelectionEvents();
    this.load(userId, bookId);
  }

  async load(userId, bookId) {
    this.userId = userId;
    this.currentBookId = bookId;
    this.highlights = await getHighlights(userId, bookId);
    this.renderInText();
  }

  bindSelectionEvents() {
    document.addEventListener('selectionchange', () => {
      this.handleSelectionChange();
    });

    // Fecha a barra flutuante ao clicar fora
    document.addEventListener('mousedown', (e) => {
      if (this.floatingBarEl && !this.floatingBarEl.contains(e.target)) {
        if (!window.getSelection().toString().trim()) {
          this.hideFloatingBar();
        }
      }
    });
  }

  handleSelectionChange() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      return;
    }

    const text = sel.toString().trim();
    if (!text || text.length < 2) {
      return;
    }

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;

    // Garante que a seleção ocorreu dentro do container de leitura
    const readerCanvas = document.getElementById('reader-content');
    if (!readerCanvas || !readerCanvas.contains(container)) {
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.activeSelection = {
        text: text,
        range: range.cloneRange(),
        rect: rect
      };
      this.showFloatingBar(rect);
    }
  }

  showFloatingBar(rect) {
    if (!this.floatingBarEl) return;

    this.floatingBarEl.style.display = 'flex';
    const top = rect.top + window.scrollY - 54;
    const left = rect.left + window.scrollX + (rect.width / 2) - (this.floatingBarEl.offsetWidth / 2);

    this.floatingBarEl.style.top = `${Math.max(10, top)}px`;
    this.floatingBarEl.style.left = `${Math.max(10, left)}px`;
  }

  hideFloatingBar() {
    if (this.floatingBarEl) {
      this.floatingBarEl.style.display = 'none';
    }
    this.activeSelection = null;
  }

  async addHighlight(color = 'yellow', customSentence = null) {
    let highlightText = '';
    let sentenceId = null;
    let chapterTitle = 'Capítulo';
    let pageNum = 1;

    if (customSentence) {
      highlightText = customSentence.text;
      sentenceId = customSentence.id;
    } else if (this.activeSelection) {
      highlightText = this.activeSelection.text;
      // Procura a frase mais próxima da seleção
      const node = this.activeSelection.range.commonAncestorContainer;
      const sentenceEl = node.nodeType === Node.ELEMENT_NODE
        ? node.closest('.reader-sentence')
        : node.parentElement?.closest('.reader-sentence');
      if (sentenceEl) {
        sentenceId = sentenceEl.getAttribute('data-id');
      }
    }

    if (!highlightText) return;

    const chapterEl = document.querySelector('.reader-chapter-title');
    if (chapterEl) chapterTitle = chapterEl.textContent;

    const pageEl = document.getElementById('reader-page-indicator');
    if (pageEl) {
      const match = pageEl.textContent.match(/\d+/);
      if (match) pageNum = parseInt(match[0], 10);
    }

    const newHighlight = {
      id: 'hl-' + Date.now(),
      sentenceId: sentenceId,
      text: highlightText,
      color: color,
      chapter: chapterTitle,
      page: pageNum,
      createdAt: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    this.highlights = await saveHighlight(this.userId, this.currentBookId, newHighlight);
    this.renderInText();
    this.hideFloatingBar();
    window.getSelection()?.removeAllRanges();

    keyboardNav.announce('Trecho destacado e salvo com sucesso.');
    return newHighlight;
  }

  async remove(highlightId) {
    this.highlights = await deleteHighlight(this.userId, this.currentBookId, highlightId);
    this.renderInText();
    keyboardNav.announce('Destaque removido.');
  }

  getAll() {
    return [...this.highlights];
  }

  /**
   * Aplica estilos visuais de marca-texto nas frases correspondentes
   */
  renderInText() {
    // Limpa destaques anteriores no DOM
    document.querySelectorAll('.highlight-marked').forEach(el => {
      el.classList.remove('highlight-marked', 'highlight-yellow', 'highlight-green', 'highlight-orange', 'highlight-pink');
    });

    this.highlights.forEach(h => {
      if (h.sentenceId) {
        const el = document.querySelector(`.reader-sentence[data-id="${h.sentenceId}"]`);
        if (el) {
          el.classList.add('highlight-marked', `highlight-${h.color || 'yellow'}`);
        }
      }
    });
  }
}

export const highlightsManager = new HighlightsManager();
