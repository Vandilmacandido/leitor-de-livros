/**
 * Utilitário para quebra inteligente de texto em frases e estruturação de documentos.
 * Trata abreviações comuns em português para evitar quebras incorretas.
 */

const COMMON_ABBREVIATIONS = [
  'sr.', 'sra.', 'dr.', 'dra.', 'prof.', 'profa.', 'ex.', 'etc.',
  'cap.', 'art.', 'pág.', 'págs.', 'fig.', 'v.', 'vs.', 'av.'
];

/**
 * Divide um parágrafo em frases respeitando pontuação e abreviações
 */
export function splitIntoSentences(paragraphText) {
  if (!paragraphText || !paragraphText.trim()) return [];

  // Limpa espaços extras
  const cleanText = paragraphText.trim().replace(/\s+/g, ' ');

  // Expressão regular para dividir por pontuação terminal (. ! ?)
  // Usamos uma estratégia de substituição temporária para abreviações
  let protectedText = cleanText;

  COMMON_ABBREVIATIONS.forEach((abbr, idx) => {
    const escaped = abbr.replace('.', '\\.');
    const regex = new RegExp(`\\b${escaped}`, 'gi');
    protectedText = protectedText.replace(regex, `__ABBR_${idx}__`);
  });

  // Divide por . ! ? ou reticências (...) seguidos de espaço ou fim de linha
  const rawSentences = protectedText.match(/[^.!?…]+(?:[.!?…]+|$)/g) || [protectedText];

  const sentences = [];
  rawSentences.forEach((s) => {
    let restored = s.trim();
    if (!restored) return;

    // Restaura abreviações
    COMMON_ABBREVIATIONS.forEach((abbr, idx) => {
      restored = restored.replace(new RegExp(`__ABBR_${idx}__`, 'g'), abbr);
    });

    if (restored.length > 0) {
      sentences.push(restored);
    }
  });

  return sentences.length > 0 ? sentences : [cleanText];
}

/**
 * Converte um texto bruto em um documento estruturado com capítulos e frases
 */
export function parseRawTextToBook({ title, author, rawText, fileType = 'TXT', fileSize = '1.0 MB' }) {
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const bookId = 'book-' + Date.now();
  let sentenceCount = 0;

  // Se houver muitos parágrafos, divide em capítulos lógicos
  const paragraphsPerChapter = 8;
  const chapters = [];

  for (let i = 0; i < paragraphs.length; i += paragraphsPerChapter) {
    const chapterNum = Math.floor(i / paragraphsPerChapter) + 1;
    const chapterParagraphs = paragraphs.slice(i, i + paragraphsPerChapter);

    const parsedParagraphs = chapterParagraphs.map(pText => {
      const sentenceStrings = splitIntoSentences(pText);
      return sentenceStrings.map(text => {
        sentenceCount++;
        return {
          id: `${bookId}-s${sentenceCount}`,
          text: text
        };
      });
    });

    chapters.push({
      id: `cap-${chapterNum}`,
      title: `Capítulo ${chapterNum}`,
      paragraphs: parsedParagraphs
    });
  }

  // Se o texto for curto e não gerou nenhum parágrafo
  if (chapters.length === 0) {
    sentenceCount++;
    chapters.push({
      id: 'cap-1',
      title: 'Capítulo 1',
      paragraphs: [[{ id: `${bookId}-s1`, text: rawText.trim() || 'Documento sem texto identificado.' }]]
    });
  }

  const estimatedPages = Math.max(1, Math.ceil(sentenceCount / 12));

  return {
    id: bookId,
    title: title || 'Documento Sem Título',
    author: author || 'Autor Desconhecido',
    fileType: fileType.toUpperCase(),
    fileSize: fileSize,
    pages: estimatedPages,
    currentPage: 1,
    progress: 0,
    lastRead: 'Hoje',
    status: 'in-progress',
    category: 'Documentos do Usuário',
    coverGradient: 'linear-gradient(135deg, #0d9488, #115e59)',
    coverIcon: fileType.toUpperCase() === 'PDF' ? '📕' : '📄',
    lastSentenceId: chapters[0]?.paragraphs[0]?.[0]?.id || null,
    lastSentenceText: chapters[0]?.paragraphs[0]?.[0]?.text || '',
    chapters: chapters,
    highlights: []
  };
}
