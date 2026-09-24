/**
 * AcessiRead — Leitor Web Acessível
 * Controlador Principal da Aplicação
 */

import { SAMPLE_BOOKS } from './data/sampleBooks.js';
import { speechEngine } from './modules/speechEngine.js';
import { parseRawTextToBook } from './modules/textParser.js';
import { extractTextFromPdf } from './modules/pdfParser.js';
import { preferencesManager } from './modules/preferences.js';
import { highlightsManager } from './modules/highlights.js';
import { keyboardNav } from './modules/keyboardNav.js';
import {
  login,
  register,
  loginAsDemo,
  logout,
  onAuthState,
  getSavedLocalUser,
  saveReadingProgress,
  getReadingProgress,
  saveCustomBook,
  getCustomBooks
} from './firebase/services.js';
import {
  isConfigured as isFirebaseLive,
  currentConfig as fbConfig,
  saveCustomFirebaseConfig,
  clearCustomFirebaseConfig
} from './firebase/config.js';

// ========================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ========================================================
const state = {
  user: null,
  books: [],
  currentBook: null,
  currentChapterIndex: 0,
  currentSentenceIndex: 0,
  sentences: [], // Array linear de frases do capítulo atual
  searchMatches: [],
  currentSearchIndex: -1,
  activeFilter: 'all',
  isAuthRegisterMode: false
};

// ========================================================
// INICIALIZAÇÃO
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  // Inicializa gerenciador de preferências e acessibilidade
  preferencesManager.init();

  // Carrega livros
  loadBooksData();

  // Verifica usuário autenticado
  const savedUser = getSavedLocalUser();
  if (savedUser) {
    state.user = savedUser;
    switchView('view-library');
    renderLibrary();
  } else {
    switchView('view-auth');
  }

  // Listener do Firebase Auth (se ativo)
  onAuthState((user) => {
    if (user) {
      state.user = user;
      updateUserUI();
    }
  });

  // Configura atalhos globais de teclado
  keyboardNav.init({
    onPlayPause: () => togglePlayPause(),
    onNextSentence: () => nextSentence(true),
    onPrevSentence: () => prevSentence(true),
    onBackToLibrary: () => {
      speechEngine.stop();
      switchView('view-library');
      renderLibrary();
    },
    onOpenPreferences: () => openModal('modal-preferences'),
    onOpenShortcutsHelp: () => openModal('modal-shortcuts'),
    onStop: () => {
      speechEngine.stop();
      clearActiveSentenceHighlight();
    },
    onCloseModals: () => closeAllModals()
  });

  // Configura eventos da interface
  bindAuthEvents();
  bindLibraryEvents();
  bindReaderEvents();
  bindPreferencesEvents();
  bindModalEvents();
  bindSpeechEngineCallbacks();
  populateVoiceSelector();
  initMobilePwaFeatures();
}

// ========================================================
// CARREGAMENTO DE LIVROS
// ========================================================
function loadBooksData() {
  const custom = getCustomBooks();
  state.books = [...custom, ...SAMPLE_BOOKS];
}

// ========================================================
// ROTEAMENTO ENTRE TELAS
// ========================================================
function switchView(viewId) {
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Foca o primeiro elemento acessível da nova tela
    const firstFocusable = targetView.querySelector('h1, button, input, a');
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }

  // Controla classe no body e a barra de navegação inferior estilo App Web
  const bottomNav = document.getElementById('mobile-bottom-nav');
  if (viewId === 'view-reader') {
    document.body.classList.add('in-reader-view');
  } else {
    document.body.classList.remove('in-reader-view');
  }

  if (bottomNav) {
    if (viewId === 'view-auth' || viewId === 'view-reader') {
      bottomNav.style.display = 'none';
    } else {
      bottomNav.style.display = 'flex';
      updateMobileNavActiveTab('library');
    }
  }
}

function updateMobileNavActiveTab(tabName) {
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tabName) {
      item.classList.add('active');
      item.setAttribute('aria-current', 'page');
    } else {
      item.classList.remove('active');
      item.removeAttribute('aria-current');
    }
  });
}

// ========================================================
// AUTENTICAÇÃO & BOAS-VINDAS
// ========================================================
function bindAuthEvents() {
  const authForm = document.getElementById('auth-form');
  const btnDemo = document.getElementById('btn-demo-login');
  const btnSwitchMode = document.getElementById('btn-switch-auth-mode');
  const btnTogglePwd = document.getElementById('btn-toggle-pwd');
  const btnSpeakWelcome = document.getElementById('btn-speak-welcome');

  // Alternar entre Login e Cadastro
  btnSwitchMode?.addEventListener('click', () => {
    state.isAuthRegisterMode = !state.isAuthRegisterMode;
    const nameGroup = document.getElementById('group-name');
    const authSwitchText = document.getElementById('auth-switch-text');
    const btnAuthLabel = document.getElementById('btn-auth-label');

    if (state.isAuthRegisterMode) {
      nameGroup.style.display = 'flex';
      authSwitchText.textContent = 'Já tenho uma conta (Fazer Login)';
      btnAuthLabel.textContent = 'Criar Conta Acessível';
    } else {
      nameGroup.style.display = 'none';
      authSwitchText.textContent = 'Criar conta gratuita';
      btnAuthLabel.textContent = 'Entrar na Minha Biblioteca';
    }
  });

  // Visualizar / Ocultar Senha
  btnTogglePwd?.addEventListener('click', () => {
    const pwdInput = document.getElementById('input-password');
    const isPwd = pwdInput.type === 'password';
    pwdInput.type = isPwd ? 'text' : 'password';
    document.getElementById('pwd-icon').textContent = isPwd ? '🙈' : '👁️';
  });

  // Login de Demonstração (Mariana)
  btnDemo?.addEventListener('click', async () => {
    try {
      const user = await loginAsDemo();
      state.user = user;
      showToast('Bem-vinda, Mariana! Entrando na biblioteca...');
      keyboardNav.announce('Acesso de demonstração realizado com sucesso.');
      updateUserUI();
      switchView('view-library');
      renderLibrary();
    } catch (err) {
      showToast('Erro ao acessar demonstração: ' + err.message, 'error');
    }
  });

  // Submissão do Formulário
  authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('input-email').value.trim();
    const password = document.getElementById('input-password').value;
    const name = document.getElementById('input-name')?.value.trim() || 'Leitor';

    if (!email || !password) {
      showToast('Por favor, preencha e-mail e senha.', 'warning');
      return;
    }

    try {
      if (state.isAuthRegisterMode) {
        state.user = await register(name, email, password);
        showToast('Conta criada com sucesso!');
      } else {
        state.user = await login(email, password);
        showToast('Login realizado com sucesso!');
      }

      updateUserUI();
      switchView('view-library');
      renderLibrary();
    } catch (err) {
      showToast(err.message, 'error');
      keyboardNav.announce('Erro de autenticação: ' + err.message, true);
    }
  });

  // Botão: Ouvir Instruções da Tela de Entrada
  btnSpeakWelcome?.addEventListener('click', () => {
    const text = 'Bem-vindo ao AcessiRead. Esta página permite entrar com e-mail e senha ou utilizar o botão de demonstração para testar imediatamente. A plataforma possui navegação total por teclado utilizando Tab, Enter e Espaço, e suporte completo a sintetizadores de voz.';
    speechEngine.speakSample(text);
  });
}

function updateUserUI() {
  if (!state.user) return;
  const avatar = document.getElementById('library-avatar');
  const welcomeText = document.getElementById('library-welcome-text');

  const displayName = state.user.displayName || 'Mariana';
  if (welcomeText) welcomeText.textContent = `Olá, ${displayName}!`;
  if (avatar) avatar.textContent = displayName.charAt(0).toUpperCase();
}

// ========================================================
// BIBLIOTECA PESSOAL
// ========================================================
function bindLibraryEvents() {
  const searchInput = document.getElementById('input-library-search');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const dropzone = document.getElementById('dropzone-upload');
  const fileInput = document.getElementById('file-input-upload');
  const btnLogout = document.getElementById('btn-logout');
  const btnContrast = document.getElementById('btn-lib-toggle-contrast');
  const btnPrefs = document.getElementById('btn-lib-open-preferences');
  const btnFbConfig = document.getElementById('btn-open-firebase-config');
  const btnBottomShortcuts = document.getElementById('btn-bottom-open-shortcuts');
  const btnBottomPrefs = document.getElementById('btn-bottom-open-prefs');

  // Busca em tempo real na biblioteca
  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    filterBooks(query, state.activeFilter);
  });

  // Filtros de status
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      state.activeFilter = tab.getAttribute('data-filter');
      const query = searchInput?.value.toLowerCase().trim() || '';
      filterBooks(query, state.activeFilter);
    });
  });

  // Upload / Dropzone
  dropzone?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput?.click();
    }
  });

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer?.files?.length) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target?.files?.length) {
      handleFileUpload(e.target.files[0]);
    }
  });

  // Botões do Cabeçalho da Biblioteca
  btnLogout?.addEventListener('click', async () => {
    await logout();
    state.user = null;
    showToast('Você saiu da sua conta.');
    switchView('view-auth');
  });

  btnContrast?.addEventListener('click', () => {
    const isHigh = preferencesManager.toggleHighContrast();
    showToast(isHigh ? 'Modo Alto Contraste Ativado' : 'Modo Claro Conforto');
  });

  btnPrefs?.addEventListener('click', () => openModal('modal-preferences'));
  btnFbConfig?.addEventListener('click', () => openModal('modal-firebase'));
  btnBottomShortcuts?.addEventListener('click', () => openModal('modal-shortcuts'));
  btnBottomPrefs?.addEventListener('click', () => openModal('modal-preferences'));
}

async function handleFileUpload(file) {
  if (!file) return;

  const progressContainer = document.getElementById('upload-progress-container');
  const progressBar = document.getElementById('upload-progress-bar');
  const progressText = document.getElementById('upload-progress-text');

  if (progressContainer) progressContainer.style.display = 'block';

  try {
    let newBook = null;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      if (progressText) progressText.textContent = 'Processando páginas do PDF...';
      newBook = await extractTextFromPdf(file, (percent) => {
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `Extraindo texto: ${percent}%`;
      });
    } else {
      // Arquivos de texto (.txt / .md)
      if (progressText) progressText.textContent = 'Lendo arquivo de texto...';
      const text = await file.text();
      newBook = parseRawTextToBook({
        title: file.name.replace(/\.[^/.]+$/, ''),
        author: 'Documento Pessoal',
        rawText: text,
        fileType: file.name.split('.').pop().toUpperCase(),
        fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      });
    }

    if (newBook) {
      saveCustomBook(newBook);
      state.books.unshift(newBook);
      renderLibrary();
      showToast(`Livro "${newBook.title}" adicionado à sua biblioteca!`);
      keyboardNav.announce(`Documento ${newBook.title} processado e pronto para leitura.`);
      
      // Abre o documento recém-adicionado
      openBook(newBook);
    }
  } catch (err) {
    console.error('Erro no upload:', err);
    showToast('Erro ao processar o arquivo: ' + err.message, 'error');
  } finally {
    if (progressContainer) progressContainer.style.display = 'none';
  }
}

function renderLibrary(booksToRender = state.books) {
  const container = document.getElementById('books-grid-container');
  if (!container) return;

  container.innerHTML = '';

  // Contadores
  document.getElementById('count-all').textContent = state.books.length;
  document.getElementById('count-in-progress').textContent = state.books.filter(b => b.status === 'in-progress').length;
  document.getElementById('count-completed').textContent = state.books.filter(b => b.status === 'completed').length;

  if (booksToRender.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">
        Nenhum documento encontrado para este filtro.
      </div>
    `;
    return;
  }

  booksToRender.forEach(book => {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.setAttribute('aria-label', `${book.title}, por ${book.author}`);

    const isComplete = book.progress >= 100 || book.status === 'completed';

    card.innerHTML = `
      <div class="book-card-header">
        <div class="book-cover" style="background: ${book.coverGradient || 'linear-gradient(135deg, #1e3a8a, #0f172a)'}" aria-hidden="true">
          ${book.coverIcon || '📖'}
        </div>
        <div class="book-details">
          <h3 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
          <span class="book-author">${escapeHtml(book.author)}</span>
          <div class="book-meta-chips">
            <span class="badge">${book.fileType || 'PDF'}</span>
            <span class="badge">${book.pages || 1} págs</span>
            <span style="color: var(--text-muted); font-size: 0.75rem;">${book.lastRead || 'Recente'}</span>
          </div>
        </div>
      </div>

      <div class="book-progress-section">
        <div class="book-progress-header">
          <span>${isComplete ? 'Concluído' : `${book.progress || 0}% concluído`}</span>
          <span>Pág. ${book.currentPage || 1} de ${book.pages || 1}</span>
        </div>
        <div class="goal-progress-bar-bg" aria-hidden="true">
          <div class="goal-progress-bar-fill" style="width: ${book.progress || 0}%;"></div>
        </div>
      </div>

      <div class="book-card-actions">
        <button type="button" class="btn btn-primary btn-continue-reading" data-book-id="${book.id}">
          <span aria-hidden="true">📖</span>
          <span>${isComplete ? 'Reler Livro' : 'Continuar lendo'}</span>
        </button>
      </div>
    `;

    // Ação de abrir livro
    card.querySelector('.btn-continue-reading')?.addEventListener('click', () => {
      handleBookCardClick(book);
    });

    container.appendChild(card);
  });
}

function filterBooks(query, filterStatus) {
  let list = [...state.books];

  if (filterStatus === 'in-progress') {
    list = list.filter(b => b.progress < 100 && b.status !== 'completed');
  } else if (filterStatus === 'completed') {
    list = list.filter(b => b.progress >= 100 || b.status === 'completed');
  }

  if (query) {
    list = list.filter(b =>
      b.title.toLowerCase().includes(query) ||
      b.author.toLowerCase().includes(query) ||
      (b.category && b.category.toLowerCase().includes(query))
    );
  }

  renderLibrary(list);
}

// ========================================================
// RETOMADA DE LEITURA ("VOCÊ PAROU AQUI!")
// ========================================================
async function handleBookCardClick(book) {
  // Verifica se o livro possui progresso salvo (como Dom Casmurro a 64%)
  let savedProgress = null;
  if (state.user) {
    savedProgress = await getReadingProgress(state.user.uid, book.id);
  }

  const effectiveProgress = savedProgress?.percentage || book.progress || 0;
  const lastSentenceText = savedProgress?.lastSentenceText || book.lastSentenceText;

  // Se tiver progresso significativo e um trecho memorizado, mostra o modal de retomada
  if (effectiveProgress > 10 && lastSentenceText) {
    showResumeModal(book, effectiveProgress, lastSentenceText, savedProgress?.sentenceId || book.lastSentenceId);
  } else {
    openBook(book, 0);
  }
}

function showResumeModal(book, progress, lastSentenceText, sentenceId) {
  document.getElementById('resume-book-title').textContent = book.title;
  document.getElementById('resume-book-meta').textContent = `Página ${book.currentPage || 1} de ${book.pages || 1} — ${progress}% concluído`;
  document.getElementById('resume-quote-text').textContent = `"${lastSentenceText}"`;

  const coverEl = document.getElementById('resume-book-cover');
  if (coverEl) {
    coverEl.style.background = book.coverGradient || 'linear-gradient(135deg, #1e3a8a, #0f172a)';
    coverEl.textContent = book.coverIcon || '📕';
  }

  const btnContinue = document.getElementById('btn-resume-continue');
  const btnRestart = document.getElementById('btn-resume-restart');

  btnContinue.onclick = () => {
    closeAllModals();
    openBook(book, sentenceId, true);
  };

  btnRestart.onclick = () => {
    closeAllModals();
    openBook(book, 0, false);
  };

  openModal('modal-resume');
}

// ========================================================
// LEITOR ACESSÍVEL & SINCRONIZAÇÃO DE FRASES
// ========================================================
function openBook(book, targetSentenceIdOrIndex = 0, autoPlay = false) {
  state.currentBook = book;
  state.currentChapterIndex = 0;

  // Atualiza cabeçalho do leitor
  document.getElementById('reader-doc-title').textContent = book.title;
  document.getElementById('reader-page-indicator').textContent = `Página ${book.currentPage || 1} de ${book.pages || 1} — ${book.progress || 0}%`;

  const chapter = book.chapters[state.currentChapterIndex] || book.chapters[0];
  document.getElementById('reader-chapter-name').textContent = chapter?.title || 'Capítulo 1';
  document.getElementById('reader-rendered-chapter-title').textContent = chapter?.title || 'Capítulo 1';
  document.getElementById('reader-rendered-author').textContent = book.author;

  // Renderiza parágrafos e frases
  renderChapterContent(chapter);

  // Inicializa gerenciador de destaques para o livro
  if (state.user) {
    highlightsManager.init({
      userId: state.user.uid,
      bookId: book.id,
      floatingBarEl: document.getElementById('reader-floating-toolbar')
    });
  }

  switchView('view-reader');

  // Encontra a frase inicial
  let targetIndex = 0;
  if (typeof targetSentenceIdOrIndex === 'string') {
    const foundIdx = state.sentences.findIndex(s => s.id === targetSentenceIdOrIndex);
    if (foundIdx !== -1) targetIndex = foundIdx;
  } else if (typeof targetSentenceIdOrIndex === 'number') {
    targetIndex = Math.max(0, Math.min(state.sentences.length - 1, targetSentenceIdOrIndex));
  }

  state.currentSentenceIndex = targetIndex;

  // Atualiza detalhes do player de desktop (Badge, Timeline e Voz)
  const docBadge = document.getElementById('player-doc-badge');
  if (docBadge) {
    docBadge.textContent = `${book.title} • ${chapter?.title || 'Capítulo 1'}`;
  }
  updatePlayerTimelineUI();
  updatePlayerVoiceBadge();

  // Rola até a frase
  setTimeout(() => {
    const targetSentence = state.sentences[targetIndex];
    if (targetSentence?.element) {
      targetSentence.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightSentenceInDOM(targetSentence.id);
      document.getElementById('player-current-sentence').textContent = targetSentence.text;
    }

    if (autoPlay && targetSentence) {
      playSentence(targetIndex);
    }
  }, 200);

  keyboardNav.announce(`Livro ${book.title} aberto. ${chapter?.title}.`);
}

function updatePlayerTimelineUI() {
  const scrubber = document.getElementById('player-scrubber');
  const currentTxt = document.getElementById('player-progress-current');
  const totalTxt = document.getElementById('player-progress-total');

  const total = state.sentences.length;
  const current = state.currentSentenceIndex;
  const pct = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;

  if (scrubber) {
    scrubber.min = '0';
    scrubber.max = `${Math.max(0, total - 1)}`;
    scrubber.value = `${current}`;
  }
  if (currentTxt) {
    currentTxt.textContent = `Frase ${current + 1}`;
  }
  if (totalTxt) {
    totalTxt.textContent = `${total} frases (${pct}%)`;
  }
}

function updatePlayerVoiceBadge() {
  const voiceBadgeText = document.getElementById('player-voice-name');
  if (!voiceBadgeText) return;
  const selectedVoice = speechEngine.getSelectedVoice();
  if (selectedVoice) {
    const isPt = selectedVoice.lang.toLowerCase().startsWith('pt');
    voiceBadgeText.textContent = `${isPt ? '🇧🇷 ' : ''}${selectedVoice.name.split(' ')[0]}`;
  } else {
    voiceBadgeText.textContent = 'Voz do Sistema';
  }
}

function renderChapterContent(chapter) {
  const container = document.getElementById('reader-content');
  if (!container || !chapter) return;

  container.innerHTML = '';
  state.sentences = [];

  chapter.paragraphs.forEach((paragraphSentences, pIdx) => {
    const pEl = document.createElement('p');
    pEl.className = 'reader-paragraph';

    paragraphSentences.forEach((sObj) => {
      const span = document.createElement('span');
      span.className = 'reader-sentence';
      span.setAttribute('data-id', sObj.id);
      span.setAttribute('tabindex', '0');
      span.setAttribute('role', 'button');
      span.setAttribute('aria-label', `Frase: ${sObj.text}`);
      span.textContent = sObj.text + ' ';

      // Objeto rastreado no estado
      const sentenceItem = {
        id: sObj.id,
        text: sObj.text,
        paragraphIndex: pIdx,
        element: span
      };

      state.sentences.push(sentenceItem);
      const sentenceIndex = state.sentences.length - 1;

      // Evento de clique para tocar a partir desta frase
      span.addEventListener('click', () => {
        playSentence(sentenceIndex);
      });

      // Suporte a tecla Enter ou Espaço na frase focada
      span.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          playSentence(sentenceIndex);
        }
      });

      pEl.appendChild(span);
    });

    container.appendChild(pEl);
  });
}

function bindReaderEvents() {
  const btnBack = document.getElementById('btn-reader-back');
  const btnPlay = document.getElementById('btn-player-play');
  const btnStop = document.getElementById('btn-player-stop');
  const btnPrev = document.getElementById('btn-player-prev');
  const btnNext = document.getElementById('btn-player-next');
  const btnFromStart = document.getElementById('btn-speak-from-start');
  const btnHighlights = document.getElementById('btn-reader-highlights');
  const btnSearch = document.getElementById('btn-reader-search');
  const btnPrefs = document.getElementById('btn-reader-prefs');
  const speedChips = document.querySelectorAll('.speed-chip');

  // Barra Flutuante de Seleção
  const toolbarBtnSpeak = document.getElementById('toolbar-btn-speak');
  const toolbarBtnHighlight = document.getElementById('toolbar-btn-highlight');
  const toolbarBtnCopy = document.getElementById('toolbar-btn-copy');

  btnBack?.addEventListener('click', () => {
    speechEngine.stop();
    switchView('view-library');
    renderLibrary();
  });

  btnPlay?.addEventListener('click', () => togglePlayPause());
  btnStop?.addEventListener('click', () => {
    speechEngine.stop();
    clearActiveSentenceHighlight();
    document.getElementById('desktop-audio-equalizer')?.classList.remove('animating');
  });
  btnPrev?.addEventListener('click', () => prevSentence(true));
  btnNext?.addEventListener('click', () => nextSentence(true));

  btnFromStart?.addEventListener('click', () => {
    playSentence(0);
  });

  btnHighlights?.addEventListener('click', () => openHighlightsDrawer());
  btnSearch?.addEventListener('click', () => openModal('modal-search'));
  btnPrefs?.addEventListener('click', () => openModal('modal-preferences'));

  // Scrubber / Linha do Tempo de Leitura (Desktop & Mobile)
  const scrubber = document.getElementById('player-scrubber');
  scrubber?.addEventListener('input', (e) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx) && idx >= 0 && idx < state.sentences.length) {
      state.currentSentenceIndex = idx;
      updatePlayerTimelineUI();
      const targetSentence = state.sentences[idx];
      if (targetSentence) {
        document.getElementById('player-current-sentence').textContent = targetSentence.text;
        highlightSentenceInDOM(targetSentence.id);
        targetSentence.element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  scrubber?.addEventListener('change', (e) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx) && idx >= 0 && idx < state.sentences.length) {
      if (speechEngine.state === 'playing') {
        playSentence(idx);
      }
    }
  });

  // Botão de Informações de Voz no Player
  const btnVoiceInfo = document.getElementById('btn-player-voice-info');
  btnVoiceInfo?.addEventListener('click', () => {
    openModal('modal-preferences');
  });

  // Velocidades
  speedChips.forEach(chip => {
    chip.addEventListener('click', () => {
      speedChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const rate = parseFloat(chip.getAttribute('data-speed'));
      preferencesManager.update({ voiceRate: rate });
      showToast(`Velocidade da voz: ${rate}x`);
    });
  });

  // Ações da Barra Flutuante
  toolbarBtnSpeak?.addEventListener('click', () => {
    const sel = window.getSelection().toString().trim();
    if (sel) {
      speechEngine.speakSample(sel);
      highlightsManager.hideFloatingBar();
    }
  });

  toolbarBtnHighlight?.addEventListener('click', async () => {
    await highlightsManager.addHighlight('yellow');
    highlightsManager.hideFloatingBar();
    showToast('Trecho destacado com sucesso!');
  });

  toolbarBtnCopy?.addEventListener('click', () => {
    const sel = window.getSelection().toString().trim();
    if (sel) {
      navigator.clipboard.writeText(sel);
      highlightsManager.hideFloatingBar();
      showToast('Texto copiado para a área de transferência!');
    }
  });
}

function bindSpeechEngineCallbacks() {
  speechEngine.onSentenceStart = (sentence) => {
    highlightSentenceInDOM(sentence.id);
    document.getElementById('player-current-sentence').textContent = sentence.text;
    updatePlayerTimelineUI();
    document.getElementById('desktop-audio-equalizer')?.classList.add('animating');
  };

  speechEngine.onSentenceEnd = (sentence) => {
    // Salva progresso ao final da frase
    if (state.user && state.currentBook) {
      const percentage = Math.min(100, Math.round(((state.currentSentenceIndex + 1) / state.sentences.length) * 100));
      saveReadingProgress(state.user.uid, state.currentBook.id, {
        sentenceId: sentence.id,
        lastSentenceText: sentence.text,
        percentage: percentage,
        page: state.currentBook.currentPage || 1
      });
    }

    // Avança para a próxima frase
    if (state.currentSentenceIndex < state.sentences.length - 1) {
      state.currentSentenceIndex++;
      playSentence(state.currentSentenceIndex);
    } else {
      speechEngine.stop();
      clearActiveSentenceHighlight();
      document.getElementById('player-current-sentence').textContent = 'Fim do capítulo alcançado.';
      document.getElementById('desktop-audio-equalizer')?.classList.remove('animating');
      showToast('Fim da leitura deste capítulo!');
    }
  };

  speechEngine.onStateChange = (playbackState) => {
    const playIcon = document.getElementById('player-play-icon');
    const equalizer = document.getElementById('desktop-audio-equalizer');
    if (playbackState === 'playing') {
      playIcon.textContent = '⏸';
      document.getElementById('btn-player-play').setAttribute('title', 'Pausar Áudio (Espaço)');
      equalizer?.classList.add('animating');
    } else {
      playIcon.textContent = '▶';
      document.getElementById('btn-player-play').setAttribute('title', 'Iniciar Áudio (Espaço)');
      equalizer?.classList.remove('animating');
    }
  };

  speechEngine.onError = (err) => {
    console.warn('Erro do motor de voz:', err);
    document.getElementById('desktop-audio-equalizer')?.classList.remove('animating');
  };
}

function playSentence(index) {
  if (index < 0 || index >= state.sentences.length) return;

  state.currentSentenceIndex = index;
  const sentence = state.sentences[index];

  // Rola suavemente para a frase falada
  if (sentence.element) {
    sentence.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  speechEngine.speakSentence({
    id: sentence.id,
    text: sentence.text
  });
}

function togglePlayPause() {
  if (speechEngine.state === 'playing') {
    speechEngine.pause();
    keyboardNav.announce('Áudio pausado.');
  } else if (speechEngine.state === 'paused') {
    speechEngine.resume();
    keyboardNav.announce('Áudio retomado.');
  } else {
    playSentence(state.currentSentenceIndex);
    keyboardNav.announce('Iniciando reprodução de áudio.');
  }
}

function nextSentence(triggerSpeech = true) {
  if (state.currentSentenceIndex < state.sentences.length - 1) {
    state.currentSentenceIndex++;
    if (triggerSpeech) {
      playSentence(state.currentSentenceIndex);
    } else {
      highlightSentenceInDOM(state.sentences[state.currentSentenceIndex].id);
    }
  }
}

function prevSentence(triggerSpeech = true) {
  if (state.currentSentenceIndex > 0) {
    state.currentSentenceIndex--;
    if (triggerSpeech) {
      playSentence(state.currentSentenceIndex);
    } else {
      highlightSentenceInDOM(state.sentences[state.currentSentenceIndex].id);
    }
  }
}

function highlightSentenceInDOM(sentenceId) {
  clearActiveSentenceHighlight();
  const el = document.querySelector(`.reader-sentence[data-id="${sentenceId}"]`);
  if (el) {
    el.classList.add('active-sentence');
  }
}

function clearActiveSentenceHighlight() {
  document.querySelectorAll('.reader-sentence.active-sentence').forEach(el => {
    el.classList.remove('active-sentence');
  });
}

// ========================================================
// PREFERÊNCIAS & ACESSIBILIDADE (MODAL 3)
// ========================================================
function bindPreferencesEvents() {
  const fontCards = document.querySelectorAll('.font-choice-card');
  const sizeChips = document.querySelectorAll('#font-size-chips .chip-btn');
  const lineChips = document.querySelectorAll('#line-height-chips .chip-btn');
  const spacingChips = document.querySelectorAll('#spacing-chips .chip-btn');
  const themeCards = document.querySelectorAll('.theme-choice-card');
  const voiceSelect = document.getElementById('select-voice');
  const btnTestVoice = document.getElementById('btn-test-voice-sample');
  const pitchChips = document.querySelectorAll('#pitch-chips .chip-btn');

  // Fontes
  fontCards.forEach(card => {
    card.addEventListener('click', () => {
      fontCards.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('active');
      card.setAttribute('aria-checked', 'true');

      const font = card.getAttribute('data-font');
      preferencesManager.update({ fontFamily: font });
      updatePreviewBadge();
    });
  });

  // Tamanhos
  sizeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      sizeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const size = parseInt(chip.getAttribute('data-size'), 10);
      preferencesManager.update({ fontSize: size });
      updatePreviewBadge();
    });
  });

  // Espaçamento entre Linhas
  lineChips.forEach(chip => {
    chip.addEventListener('click', () => {
      lineChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const lh = parseFloat(chip.getAttribute('data-lineheight'));
      preferencesManager.update({ lineHeight: lh });
      updatePreviewBadge();
    });
  });

  // Espaço entre Letras e Palavras
  spacingChips.forEach(chip => {
    chip.addEventListener('click', () => {
      spacingChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const isSpacious = chip.getAttribute('data-spacing') === 'spacious';
      preferencesManager.update({
        letterSpacing: isSpacious ? 0.10 : 0.05,
        wordSpacing: isSpacious ? 0.30 : 0.15
      });
      updatePreviewBadge();
    });
  });

  // Temas & Contraste
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('active');
      card.setAttribute('aria-checked', 'true');

      const theme = card.getAttribute('data-theme');
      preferencesManager.update({ theme: theme });
    });
  });

  // Mudança de Voz
  voiceSelect?.addEventListener('change', (e) => {
    const uri = e.target.value;
    preferencesManager.update({ voiceURI: uri });
    updatePlayerVoiceBadge();
  });

  btnTestVoice?.addEventListener('click', () => {
    speechEngine.speakSample('Olá! Esta é uma demonstração da voz acessível do AcessiRead com leitura natural e clara.');
  });

  // Tom da Voz (Pitch)
  pitchChips.forEach(chip => {
    chip.addEventListener('click', () => {
      pitchChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const pitch = parseFloat(chip.getAttribute('data-pitch'));
      preferencesManager.update({ voicePitch: pitch });
    });
  });
}

function updatePreviewBadge() {
  const p = preferencesManager.get();
  const badge = document.getElementById('preview-badge-status');
  if (badge) {
    badge.textContent = `Prévia em Tempo Real: ${capitalize(p.fontFamily)} ${p.fontSize}px | ${p.lineHeight}x`;
  }
}

function populateVoiceSelector() {
  const select = document.getElementById('select-voice');
  if (!select) return;

  const voices = speechEngine.getVoices();
  if (voices.length === 0) return;

  select.innerHTML = '';
  const currentVoiceURI = preferencesManager.get().voiceURI || speechEngine.selectedVoiceURI;

  voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    const isPt = v.lang.toLowerCase().startsWith('pt');
    opt.textContent = `${isPt ? '🇧🇷 ' : ''}${v.name} (${v.lang})`;
    if (v.voiceURI === currentVoiceURI) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  updatePlayerVoiceBadge();
}

// ========================================================
// GAVETA DE DESTAQUES & ANOTAÇÕES
// ========================================================
async function openHighlightsDrawer() {
  if (!state.user || !state.currentBook) return;

  const listContainer = document.getElementById('highlights-container-list');
  if (!listContainer) return;

  const highlights = highlightsManager.getAll();

  if (highlights.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Você ainda não destacou nenhum trecho neste documento.<br>
        <small>Selecione um texto na página para aplicar o marca-texto.</small>
      </div>
    `;
  } else {
    listContainer.innerHTML = '';
    highlights.forEach(h => {
      const card = document.createElement('div');
      card.className = 'highlight-item-card';
      card.innerHTML = `
        <div class="hl-card-header">
          <span>${h.chapter || 'Capítulo'} • Pág. ${h.page || 1} • ${h.createdAt}</span>
          <span class="hl-color-indicator" style="background: var(--hl-${h.color || 'yellow'});"></span>
        </div>
        <p class="hl-card-quote">"${escapeHtml(h.text)}"</p>
        <div class="hl-card-actions">
          <button type="button" class="btn btn-secondary btn-speak-hl" style="font-size: 0.75rem; padding: 0.375rem 0.625rem;">
            <span aria-hidden="true">🔊</span> Ouvir Destaque
          </button>
          <button type="button" class="btn btn-secondary btn-goto-hl" style="font-size: 0.75rem; padding: 0.375rem 0.625rem;">
            <span aria-hidden="true">📍</span> Ir para Trecho
          </button>
          <button type="button" class="btn btn-outline btn-del-hl" style="font-size: 0.75rem; padding: 0.375rem 0.625rem; color: var(--danger-color); border-color: var(--danger-color);">
            Excluir
          </button>
        </div>
      `;

      card.querySelector('.btn-speak-hl')?.addEventListener('click', () => {
        speechEngine.speakSample(h.text);
      });

      card.querySelector('.btn-goto-hl')?.addEventListener('click', () => {
        closeAllModals();
        if (h.sentenceId) {
          const idx = state.sentences.findIndex(s => s.id === h.sentenceId);
          if (idx !== -1) {
            state.currentSentenceIndex = idx;
            state.sentences[idx].element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightSentenceInDOM(h.sentenceId);
          }
        }
      });

      card.querySelector('.btn-del-hl')?.addEventListener('click', async () => {
        await highlightsManager.remove(h.id);
        openHighlightsDrawer(); // Atualiza lista
      });

      listContainer.appendChild(card);
    });
  }

  openModal('modal-highlights');
}

// ========================================================
// BUSCA NO DOCUMENTO
// ========================================================
function setupDocSearch() {
  const btnRun = document.getElementById('btn-run-doc-search');
  const inputSearch = document.getElementById('input-doc-search');
  const countEl = document.getElementById('search-results-count');
  const btnPrev = document.getElementById('btn-search-prev');
  const btnNext = document.getElementById('btn-search-next');

  btnRun?.addEventListener('click', () => {
    const q = inputSearch?.value.toLowerCase().trim();
    if (!q) return;

    state.searchMatches = [];
    state.currentSearchIndex = -1;

    state.sentences.forEach((s, idx) => {
      if (s.text.toLowerCase().includes(q)) {
        state.searchMatches.push(idx);
      }
    });

    if (countEl) {
      countEl.textContent = `${state.searchMatches.length} ocorrência(s) encontrada(s)`;
    }

    if (state.searchMatches.length > 0) {
      state.currentSearchIndex = 0;
      jumpToSearchMatch(0);
    }
  });

  btnNext?.addEventListener('click', () => {
    if (state.searchMatches.length > 0) {
      state.currentSearchIndex = (state.currentSearchIndex + 1) % state.searchMatches.length;
      jumpToSearchMatch(state.currentSearchIndex);
    }
  });

  btnPrev?.addEventListener('click', () => {
    if (state.searchMatches.length > 0) {
      state.currentSearchIndex = (state.currentSearchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
      jumpToSearchMatch(state.currentSearchIndex);
    }
  });
}

function jumpToSearchMatch(matchIndex) {
  const sentenceIndex = state.searchMatches[matchIndex];
  const sentence = state.sentences[sentenceIndex];
  if (sentence?.element) {
    sentence.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightSentenceInDOM(sentence.id);
  }
}

// ========================================================
// CONFIGURAÇÃO DO FIREBASE (MODAL & BADGE DE STATUS)
// ========================================================
function setupFirebaseModal() {
  const form = document.getElementById('form-firebase-config');
  const btnClear = document.getElementById('btn-clear-fb-config') || document.getElementById('btn-reset-firebase');
  const btnOpenConfig = document.getElementById('btn-open-firebase-config');
  const btnBadge = document.getElementById('btn-firebase-badge');
  const statusText = document.getElementById('firebase-status-text');
  const banner = document.getElementById('firebase-status-banner');
  const bannerTitle = document.getElementById('firebase-banner-title');
  const bannerDesc = document.getElementById('firebase-banner-desc');

  // Atualiza badge e banner conforme status atual
  function updateFirebaseUI() {
    if (isFirebaseLive) {
      if (btnBadge) {
        btnBadge.classList.add('connected');
        btnBadge.classList.remove('local');
        btnBadge.setAttribute('title', 'Firebase conectado na nuvem (Firestore + Auth). Clique para gerenciar.');
      }
      if (statusText) statusText.textContent = 'Firebase: Nuvem';
      if (banner) banner.className = 'fb-status-banner connected';
      if (bannerTitle) bannerTitle.textContent = '🟢 Conectado ao Firebase Cloud (Firestore + Auth)';
      if (bannerDesc) bannerDesc.textContent = `Sincronização ativa em tempo real no projeto: ${fbConfig?.projectId || 'cloud'}.`;
    } else {
      if (btnBadge) {
        btnBadge.classList.remove('connected');
        btnBadge.classList.add('local');
        btnBadge.setAttribute('title', 'Firebase em modo local / offline. Clique para conectar suas chaves.');
      }
      if (statusText) statusText.textContent = 'Firebase: Local';
      if (banner) banner.className = 'fb-status-banner local';
      if (bannerTitle) bannerTitle.textContent = '🟠 Modo Local / Demonstração Ativo (Offline)';
      if (bannerDesc) bannerDesc.textContent = 'O app está salvando livros, progresso e destaques com segurança no armazenamento local (localStorage) do seu navegador.';
    }
  }

  updateFirebaseUI();

  // Abrir modal ao clicar no botão de chama ou no badge
  btnOpenConfig?.addEventListener('click', () => openModal('modal-firebase'));
  btnBadge?.addEventListener('click', () => openModal('modal-firebase'));

  // Preenche inputs com valores atuais
  const inputApiKey = document.getElementById('fb-input-apikey') || document.getElementById('fb-api-key');
  const inputProjectId = document.getElementById('fb-input-projectid') || document.getElementById('fb-project-id');
  const inputAuthDomain = document.getElementById('fb-input-authdomain') || document.getElementById('fb-auth-domain');
  const inputAppId = document.getElementById('fb-input-appid') || document.getElementById('fb-app-id');

  if (fbConfig) {
    if (inputApiKey && fbConfig.apiKey) inputApiKey.value = fbConfig.apiKey;
    if (inputProjectId && fbConfig.projectId) inputProjectId.value = fbConfig.projectId;
    if (inputAuthDomain && fbConfig.authDomain) inputAuthDomain.value = fbConfig.authDomain;
    if (inputAppId && fbConfig.appId) inputAppId.value = fbConfig.appId;
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const config = {
      apiKey: (inputApiKey?.value || '').trim(),
      projectId: (inputProjectId?.value || '').trim(),
      authDomain: (inputAuthDomain?.value || '').trim(),
      appId: (inputAppId?.value || '').trim()
    };

    if (!config.apiKey || !config.projectId) {
      showToast('Preencha ao menos a API Key e o Project ID do Firebase.', 'warning');
      return;
    }

    showToast('Salvando credenciais e conectando ao Firebase...');
    saveCustomFirebaseConfig(config);
  });

  btnClear?.addEventListener('click', () => {
    clearCustomFirebaseConfig();
    showToast('Configuração removida. Modo local ativado.');
  });
}

// ========================================================
// GERENCIADOR DE MODAIS
// ========================================================
function bindModalEvents() {
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });

  // Fechar ao clicar no backdrop escuro
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeAllModals();
      }
    });
  });

  setupDocSearch();
  setupFirebaseModal();
}

function openModal(modalId) {
  closeAllModals();
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    const firstFocusable = modal.querySelector('button, input, [tabindex="0"]');
    if (firstFocusable) firstFocusable.focus();
  }
}

function closeAllModals() {
  let anyOpen = false;
  document.querySelectorAll('.modal-backdrop.active').forEach(m => {
    m.classList.remove('active');
    anyOpen = true;
  });
  return anyOpen;
}

// ========================================================
// TOAST NOTIFICATIONS
// ========================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'error' ? '⚠️' : (type === 'warning' ? '🔔' : 'ℹ️');
  toast.innerHTML = `<span aria-hidden="true">${icon}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ========================================================
// UTILITÁRIOS
// ========================================================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ========================================================
// PWA & RECURSOS MOBILE / TABLET
// ========================================================
function initMobilePwaFeatures() {
  // 1. Registro do Service Worker para funcionamento Offline e PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[AcessiRead] Service Worker PWA registrado com sucesso:', reg.scope);
      }).catch((err) => {
        console.log('[AcessiRead] Falha ao registrar Service Worker:', err);
      });
    });
  }

  // 2. Banner de Instalação PWA
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'flex';
  });

  const btnInstall = document.getElementById('btn-trigger-pwa-install');
  btnInstall?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('AcessiRead instalado com sucesso!');
      }
      deferredPrompt = null;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
    }
  });

  // 3. Barra de Navegação Inferior estilo App Web (Celular & Tablet)
  const navItems = document.querySelectorAll('.mobile-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');

      if (tab === 'library') {
        speechEngine.stop();
        closeAllModals();
        switchView('view-library');
        renderLibrary();
        updateMobileNavActiveTab('library');
      } else if (tab === 'reader') {
        closeAllModals();
        if (state.currentBook) {
          switchView('view-reader');
        } else if (state.books.length > 0) {
          openBook(state.books[0]);
        }
        updateMobileNavActiveTab('reader');
      } else if (tab === 'highlights') {
        openHighlightsDrawer();
        updateMobileNavActiveTab('highlights');
      } else if (tab === 'preferences') {
        openModal('modal-preferences');
        updateMobileNavActiveTab('preferences');
      }
    });
  });
}
