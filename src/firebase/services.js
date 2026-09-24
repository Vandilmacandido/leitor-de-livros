/**
 * Serviços de Autenticação e Firestore para o AcessiRead.
 * Se o Firebase não estiver configurado, opera perfeitamente com LocalStorage.
 */
import { auth, db, isConfigured } from './config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';

const LOCAL_USER_KEY = 'acessiread_local_user';
const LOCAL_PROGRESS_PREFIX = 'acessiread_progress_';
const LOCAL_HIGHLIGHTS_PREFIX = 'acessiread_highlights_';
const LOCAL_BOOKS_KEY = 'acessiread_custom_books';
const LOCAL_PREFS_KEY = 'acessiread_reading_preferences';

export const DEMO_USER = {
  uid: 'demo-mariana-101',
  displayName: 'Mariana Silva',
  email: 'mariana.leitora@acessiread.app',
  isDemo: true
};

/**
 * Autenticação: Login
 */
export async function login(email, password) {
  if (isConfigured && auth) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return {
        uid: cred.user.uid,
        displayName: cred.user.displayName || email.split('@')[0],
        email: cred.user.email,
        isDemo: false
      };
    } catch (err) {
      throw new Error(translateAuthError(err.code));
    }
  } else {
    // Simulação local
    const localUser = {
      uid: 'user_' + btoa(email).replace(/=/g, '').slice(0, 10),
      displayName: email.split('@')[0],
      email: email,
      isDemo: false
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
    return localUser;
  }
}

/**
 * Autenticação: Cadastro
 */
export async function register(name, email, password) {
  if (isConfigured && auth) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      return {
        uid: cred.user.uid,
        displayName: name,
        email: cred.user.email,
        isDemo: false
      };
    } catch (err) {
      throw new Error(translateAuthError(err.code));
    }
  } else {
    const localUser = {
      uid: 'user_' + btoa(email).replace(/=/g, '').slice(0, 10),
      displayName: name,
      email: email,
      isDemo: false
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
    return localUser;
  }
}

/**
 * Autenticação: Login Rápido como Demonstração (Mariana)
 */
export async function loginAsDemo() {
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEMO_USER));
  return DEMO_USER;
}

/**
 * Autenticação: Logout
 */
export async function logout() {
  if (isConfigured && auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Erro ao deslogar do Firebase:', e);
    }
  }
  localStorage.removeItem(LOCAL_USER_KEY);
}

/**
 * Listener de estado de autenticação
 */
export function onAuthState(callback) {
  if (isConfigured && auth) {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        callback({
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Leitor',
          email: user.email,
          isDemo: false
        });
      } else {
        const local = getSavedLocalUser();
        callback(local);
      }
    });
  } else {
    const local = getSavedLocalUser();
    callback(local);
    return () => {};
  }
}

export function getSavedLocalUser() {
  try {
    const data = localStorage.getItem(LOCAL_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Salvar progresso de leitura
 */
export async function saveReadingProgress(userId, bookId, progress) {
  const data = {
    ...progress,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(`${LOCAL_PROGRESS_PREFIX}${userId}_${bookId}`, JSON.stringify(data));

  if (isConfigured && db && !userId.startsWith('demo-')) {
    try {
      const docRef = doc(db, 'users', userId, 'progress', bookId);
      await setDoc(docRef, data, { merge: true });
    } catch (e) {
      console.warn('Erro ao sincronizar progresso no Firestore:', e);
    }
  }
}

/**
 * Carregar progresso de leitura
 */
export async function getReadingProgress(userId, bookId) {
  if (isConfigured && db && !userId.startsWith('demo-')) {
    try {
      const docRef = doc(db, 'users', userId, 'progress', bookId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        localStorage.setItem(`${LOCAL_PROGRESS_PREFIX}${userId}_${bookId}`, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Erro ao obter progresso do Firestore:', e);
    }
  }

  try {
    const local = localStorage.getItem(`${LOCAL_PROGRESS_PREFIX}${userId}_${bookId}`);
    return local ? JSON.parse(local) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Salvar Destaque / Marca-texto
 */
export async function saveHighlight(userId, bookId, highlight) {
  const key = `${LOCAL_HIGHLIGHTS_PREFIX}${userId}_${bookId}`;
  let list = getLocalHighlights(userId, bookId);
  list = list.filter(h => h.id !== highlight.id);
  list.unshift(highlight);
  localStorage.setItem(key, JSON.stringify(list));

  if (isConfigured && db && !userId.startsWith('demo-')) {
    try {
      const docRef = doc(db, 'users', userId, 'highlights', `${bookId}_${highlight.id}`);
      await setDoc(docRef, { ...highlight, bookId, userId });
    } catch (e) {
      console.warn('Erro ao salvar destaque no Firestore:', e);
    }
  }

  return list;
}

/**
 * Remover Destaque
 */
export async function deleteHighlight(userId, bookId, highlightId) {
  const key = `${LOCAL_HIGHLIGHTS_PREFIX}${userId}_${bookId}`;
  let list = getLocalHighlights(userId, bookId);
  list = list.filter(h => h.id !== highlightId);
  localStorage.setItem(key, JSON.stringify(list));

  if (isConfigured && db && !userId.startsWith('demo-')) {
    try {
      const docRef = doc(db, 'users', userId, 'highlights', `${bookId}_${highlightId}`);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Erro ao deletar destaque no Firestore:', e);
    }
  }

  return list;
}

/**
 * Obter Destaques
 */
export async function getHighlights(userId, bookId) {
  if (isConfigured && db && !userId.startsWith('demo-')) {
    try {
      const q = query(
        collection(db, 'users', userId, 'highlights'),
        where('bookId', '==', bookId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list = snap.docs.map(d => d.data());
        localStorage.setItem(`${LOCAL_HIGHLIGHTS_PREFIX}${userId}_${bookId}`, JSON.stringify(list));
        return list;
      }
    } catch (e) {
      console.warn('Erro ao carregar destaques do Firestore:', e);
    }
  }

  return getLocalHighlights(userId, bookId);
}

function getLocalHighlights(userId, bookId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_HIGHLIGHTS_PREFIX}${userId}_${bookId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Salvar Livros Personalizados Adicionados pelo Usuário
 */
export function saveCustomBook(book) {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(book);
    localStorage.setItem(LOCAL_BOOKS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Erro ao salvar livro personalizado:', e);
    return [];
  }
}

export function getCustomBooks() {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Salvar e Carregar Preferências de Acessibilidade
 */
export function savePreferences(prefs) {
  localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(prefs));
}

export function getPreferences() {
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function translateAuthError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado.';
    case 'auth/weak-password':
      return 'A senha deve conter no mínimo 6 caracteres.';
    case 'auth/invalid-email':
      return 'Formato de e-mail inválido.';
    default:
      return 'Ocorreu um erro na autenticação. Tente novamente.';
  }
}
