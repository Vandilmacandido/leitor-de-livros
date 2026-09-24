/**
 * Configuração e inicialização resiliente do Firebase.
 * Utiliza módulos oficiais ESM do Firebase via Google CDN para performance instantânea.
 * Possui fallback gracioso para modo offline / demonstração local.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';

function getFirebaseConfig() {
  try {
    const savedConfig = localStorage.getItem('acessiread_custom_firebase_config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler configuração local do Firebase:', e);
  }

  // Fallback com credenciais padrão do projeto acessiread
  return {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || 'AIzaSyBoSSDxxDzPaA9rikTGgn_VqWvcPra6en8',
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || 'acessiread.firebaseapp.com',
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'acessiread',
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || 'acessiread.firebasestorage.app',
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '1058443843095',
    appId: import.meta.env?.VITE_FIREBASE_APP_ID || '1:1058443843095:web:91db34e756a22961a26e52'
  };
}

const currentConfig = getFirebaseConfig();

let app = null;
let auth = null;
let db = null;
let isConfigured = false;

if (
  currentConfig.apiKey &&
  currentConfig.projectId &&
  currentConfig.apiKey !== 'sua_api_key_aqui'
) {
  try {
    app = initializeApp(currentConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isConfigured = true;
    console.log('[AcessiRead] Firebase inicializado com sucesso.');
  } catch (error) {
    console.warn('[AcessiRead] Falha ao inicializar Firebase. Alternando para modo offline:', error);
    isConfigured = false;
  }
} else {
  console.log('[AcessiRead] Firebase operando em Modo Local / Demonstração (sem chaves ativas).');
}

export { app, auth, db, isConfigured, currentConfig };

export function saveCustomFirebaseConfig(config) {
  localStorage.setItem('acessiread_custom_firebase_config', JSON.stringify(config));
  window.location.reload();
}

export function clearCustomFirebaseConfig() {
  localStorage.removeItem('acessiread_custom_firebase_config');
  window.location.reload();
}
