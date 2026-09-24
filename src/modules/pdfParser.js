/**
 * Extrator e leitor de PDFs no cliente utilizando PDF.js.
 * Extrai texto página por página e converte para a estrutura de frases do AcessiRead.
 */
import { parseRawTextToBook } from './textParser.js';

let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;

  if (window.pdfjsLib) {
    pdfjsLib = window.pdfjsLib;
    return pdfjsLib;
  }

  try {
    const mod = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
    pdfjsLib = mod;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
    return pdfjsLib;
  } catch (e) {
    console.warn('Erro ao carregar PDF.js via ESM. Tentando fallback...', e);
    throw new Error('Não foi possível carregar a biblioteca de processamento de PDF.');
  }
}

/**
 * Processa um arquivo PDF fornecido pelo usuário via upload/drag-and-drop
 * @param {File} file Arquivo PDF selecionado
 * @param {Function} onProgress Callback com porcentagem (0-100)
 */
export async function extractTextFromPdf(file, onProgress) {
  const lib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = lib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items.map(item => item.str).join(' ');

    fullText += `\n\n--- Página ${i} ---\n\n` + pageStrings;

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  const title = file.name.replace(/\.[^/.]+$/, '');
  const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

  const book = parseRawTextToBook({
    title: title,
    author: 'Documento Importado',
    rawText: fullText,
    fileType: 'PDF',
    fileSize: fileSizeMb
  });

  book.pages = numPages;
  return book;
}
