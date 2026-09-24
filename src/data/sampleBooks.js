/**
 * Obras literárias e técnicas pré-carregadas para leitura imediata.
 * Alinhado com as telas de design e o PRD do AcessiRead.
 */

export const SAMPLE_BOOKS = [
  {
    id: "dom-casmurro",
    title: "Dom Casmurro",
    author: "Machado de Assis",
    fileType: "PDF",
    fileSize: "2.4 MB",
    pages: 314,
    currentPage: 118,
    progress: 64,
    lastRead: "Hoje às 14:20",
    status: "in-progress",
    category: "Literatura Brasileira",
    coverGradient: "linear-gradient(135deg, #1e3a8a, #0f172a)",
    coverIcon: "📕",
    lastSentenceId: "dc-s4",
    lastSentenceText: "Tudo na casa lembrava o tempo antigo, desde os quadros escuros na parede até o relógio de pêndulo que marcava os minutos com solenidade.",
    chapters: [
      {
        id: "cap-14",
        title: "Capítulo 14: A Barba de José Dias",
        paragraphs: [
          [
            { id: "dc-s1", text: "José Dias amava os superlativos." },
            { id: "dc-s2", text: "Era o seu modo de dar às frases uma gravidade episcopal." },
            { id: "dc-s3", text: "Não dizia simplesmente que um dia estava belo; afirmava com fervor que era uma manhã esplendidíssima, digna dos pincéis de Rafael ou dos céus do tráfego clássico." }
          ],
          [
            { id: "dc-s4", text: "Tudo na casa lembrava o tempo antigo, desde os quadros escuros na parede até o relógio de pêndulo que marcava os minutos com solenidade." },
            { id: "dc-s5", text: "Minha mãe recolhia-se à costura matinal com uma placidez que me dava inveja." },
            { id: "dc-s6", text: "A manhã ia clara e sem pressa nem tempestade à vista no horizonte do nosso quintal, enquanto o agregado preservava o risco dos seus monólogos bem guardados." }
          ],
          [
            { id: "dc-s7", text: "Olhei para a janela e vi passar um vendedor de doces, com a garrafa à cabeça, pregando o seu pregão em voz descansada." },
            { id: "dc-s8", text: "Quisera eu ter a mesma ligeireza de espírito e não aquele peso no peito acerca do seminário prometido por promessa de mãe." },
            { id: "dc-s9", text: "Capitu, porém, não pensava no seminário da mesma maneira sombria." }
          ],
          [
            { id: "dc-s10", text: "Ela me olhava com aqueles olhos de ressaca que me tragavam a vontade inteira." },
            { id: "dc-s11", text: "Havíamos combinado que falaríamos a José Dias antes do almoço para sondar o terreno." },
            { id: "dc-s12", text: "Se ele estivesse bem disposto, tudo seria mais fácil e poderíamos postergar a terrível decisão." }
          ]
        ]
      },
      {
        id: "cap-15",
        title: "Capítulo 15: Outra Vez José Dias",
        paragraphs: [
          [
            { id: "dc-s13", text: "Esperei que José Dias acabasse de tomar o café para abordá-lo no corredor." },
            { id: "dc-s14", text: "Ele limpou os beiços com o lenço de xadrez e fixou em mim uns olhos compassivos." },
            { id: "dc-s15", text: "Disse-me em voz sussurrada que a vida no sacerdócio é cheia de glórias celestiais, mas que o mundo também precisava de doutores em São Paulo." }
          ]
        ]
      }
    ],
    highlights: [
      {
        id: "hl-1",
        sentenceId: "dc-s4",
        text: "Tudo na casa lembrava o tempo antigo, desde os quadros escuros na parede até o relógio de pêndulo que marcava os minutos com solenidade.",
        color: "yellow",
        chapter: "Capítulo 14",
        page: 118,
        createdAt: "Hoje às 14:20"
      },
      {
        id: "hl-2",
        sentenceId: "dc-s6",
        text: "sem pressa nem tempestade à vista",
        color: "orange",
        chapter: "Capítulo 14",
        page: 118,
        createdAt: "Hoje às 14:15"
      },
      {
        id: "hl-3",
        sentenceId: "dc-s10",
        text: "olhos de ressaca que me tragavam a vontade inteira",
        color: "green",
        chapter: "Capítulo 14",
        page: 119,
        createdAt: "Ontem às 18:30"
      }
    ]
  },
  {
    id: "ux-design-inclusivo",
    title: "Introdução à UX & Design Inclusivo",
    author: "Elena Vasconcelos",
    fileType: "EPUB",
    fileSize: "1.8 MB",
    pages: 82,
    currentPage: 20,
    progress: 25,
    lastRead: "Ontem às 19:45",
    status: "in-progress",
    category: "Tecnologia & Acessibilidade",
    coverGradient: "linear-gradient(135deg, #0284c7, #0369a1)",
    coverIcon: "📘",
    lastSentenceId: "ux-s2",
    lastSentenceText: "Acessibilidade digital não é uma funcionalidade opcional ou benefício caridoso, mas um requisito fundamental de direitos humanos e engenharia de software.",
    chapters: [
      {
        id: "cap-1",
        title: "Capítulo 1: O Que é Design Inclusivo?",
        paragraphs: [
          [
            { id: "ux-s1", text: "Projetar interfaces acessíveis significa considerar a diversidade humana desde as primeiras etapas do projeto." },
            { id: "ux-s2", text: "Acessibilidade digital não é uma funcionalidade opcional ou benefício caridoso, mas um requisito fundamental de direitos humanos e engenharia de software." },
            { id: "ux-s3", text: "Quando projetamos para pessoas com deficiência ou neurodivergência, criamos soluções que beneficiam a sociedade inteira." }
          ],
          [
            { id: "ux-s4", text: "A norma WCAG 2.2 estabelece quatro princípios vitais: perceptível, operável, compreensível e robusto." },
            { id: "ux-s5", text: "Garantir contraste de cores suficiente e suporte integral a atalhos de teclado são os primeiros passos para uma experiência equitativa." }
          ]
        ]
      }
    ],
    highlights: [
      {
        id: "hl-ux-1",
        sentenceId: "ux-s2",
        text: "Acessibilidade digital não é uma funcionalidade opcional, mas um requisito fundamental de direitos humanos.",
        color: "yellow",
        chapter: "Capítulo 1",
        page: 20,
        createdAt: "Ontem às 19:45"
      }
    ]
  },
  {
    id: "neurociencia-aprendizagem",
    title: "Neurociência e Aprendizagem Cognitiva",
    author: "Dr. Roberto Fontes",
    fileType: "PDF",
    fileSize: "3.2 MB",
    pages: 448,
    currentPage: 106,
    progress: 92,
    lastRead: "Há 3 dias",
    status: "in-progress",
    category: "Ciência & Educação",
    coverGradient: "linear-gradient(135deg, #4338ca, #312e81)",
    coverIcon: "🧠",
    lastSentenceId: "nc-s3",
    lastSentenceText: "A leitura bimodal, que combina a visualização do texto com a narração em áudio sincronizada, ativa simultaneamente os córtices visual e auditivo.",
    chapters: [
      {
        id: "cap-7",
        title: "Capítulo 7: A Leitura Bimodal e a Carga Cognitiva",
        paragraphs: [
          [
            { id: "nc-s1", text: "O cérebro humano não nasceu programado geneticamente para ler; a leitura é uma reciclagem neuronal de circuitos visuais e linguísticos." },
            { id: "nc-s2", text: "Para leitores com dislexia ou dificuldades de processamento, decodificar letras consome grande parte da memória de trabalho." },
            { id: "nc-s3", text: "A leitura bimodal, que combina a visualização do texto com a narração em áudio sincronizada, ativa simultaneamente os córtices visual e auditivo." }
          ],
          [
            { id: "nc-s4", text: "Essa dupla estimulação alivia a carga de decodificação e direciona a atenção diretamente para a compreensão semântica profunda do texto." }
          ]
        ]
      }
    ],
    highlights: []
  },
  {
    id: "o-cortico",
    title: "O Cortiço",
    author: "Aluísio Azevedo",
    fileType: "PDF",
    fileSize: "1.9 MB",
    pages: 176,
    currentPage: 176,
    progress: 100,
    lastRead: "Concluído em 18 de Setembro",
    status: "completed",
    category: "Naturalismo",
    coverGradient: "linear-gradient(135deg, #065f46, #064e3b)",
    coverIcon: "📗",
    lastSentenceId: "oc-s1",
    lastSentenceText: "João Romão foi acumulando tostão a tostão no suor incessante da sua venda de secos e molhados.",
    chapters: [
      {
        id: "cap-1",
        title: "Capítulo 1: A Gênese do Cortiço",
        paragraphs: [
          [
            { id: "oc-s1", text: "João Romão foi acumulando tostão a tostão no suor incessante da sua venda de secos e molhados." },
            { id: "oc-s2", text: "Dormia sobre o balcão e alimentava-se com os restos da própria taberna para economizar cada vintém." },
            { id: "oc-s3", text: "Aos poucos, comprou o terreno vizinho e ergueu as primeiras casinhas que formariam a famosa estalagem de São Romão." }
          ]
        ]
      }
    ],
    highlights: []
  }
];
