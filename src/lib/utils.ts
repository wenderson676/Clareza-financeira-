export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const verses = [
  "Valorize cada recurso que chega até você; a gratidão multiplica o que temos.",
  "Evite o endividamento desnecessário, pois quem pega emprestado torna-se servo de quem empresta.",
  "Aquele que administra bem o pouco, estará preparado para administrar o muito.",
  "A riqueza conquistada com integridade e paciência cresce de forma sólida; o ganho fácil logo desaparece.",
  "O planejamento cuidadoso leva à prosperidade, mas a pressa e a impulsividade trazem prejuízos.",
  "Onde você investe seu dinheiro e seu tempo, ali também estará o seu foco e a sua energia.",
  "Busque a retidão e o equilíbrio em primeiro lugar, e o bem-estar financeiro será uma consequência natural.",
  "Não permita que o dinheiro seja o seu mestre; ele deve ser apenas uma ferramenta ao seu dispor.",
  "Mantenha-se livre da ganância e aprenda a ser grato e satisfeito com o que já possui.",
  "Lembre-se: quem planta com planejamento e generosidade colherá com fartura, mas quem retém demais acaba na escassez."
];

export const getRandomVerse = () => {
  const index = Math.floor(Math.random() * verses.length);
  return verses[index];
};

// Buckets rules
export const BUCKETS = {
  'Necessidades': { percentage: 0.50, color: 'bg-blue-500', text: 'text-blue-700' },
  'Desejos': { percentage: 0.30, color: 'bg-amber-500', text: 'text-amber-700' },
  'Reserva/Dívidas': { percentage: 0.20, color: 'bg-emerald-500', text: 'text-emerald-700' }
};

export const BUDGET_MODES_INFO = {
  '50-30-20': {
    name: 'Padrão (50/30/20)',
    description: '50% Necessidades, 30% Desejos, 20% Reserva/Dívidas',
    explanation: 'Ideal para momentos de estabilidade financeira, onde você consegue equilibrar gastos essenciais, lazer e construir patrimônio de forma consistente.',
    ratios: { 'Necessidades': 0.50, 'Desejos': 0.30, 'Reserva/Dívidas': 0.20 }
  },
  '80-10-10': {
    name: 'Sobrevivência (80/10/10)',
    description: '80% Necessidades, 10% Desejos, 10% Reserva/Dívidas',
    explanation: 'Ideal para momentos em que a renda diminuiu ou as contas básicas aumentaram. Foca no essencial para manter o orçamento equilibrado em tempos difíceis.',
    ratios: { 'Necessidades': 0.80, 'Desejos': 0.10, 'Reserva/Dívidas': 0.10 }
  },
  '90-5-5': {
    name: 'Crise (90/5/5)',
    description: '90% Necessidades, 5% Desejos, 5% Reserva/Dívidas',
    explanation: 'Ideal para emergências graves, desemprego ou quando a renda cobre apenas o essencial de sobrevivência. Reduz os gastos supérfluos quase a zero.',
    ratios: { 'Necessidades': 0.90, 'Desejos': 0.05, 'Reserva/Dívidas': 0.05 }
  }
};

export const getBucketsConfig = (mode: '50-30-20' | '80-10-10' | '90-5-5' = '50-30-20') => {
  const currentModeInfo = BUDGET_MODES_INFO[mode] || BUDGET_MODES_INFO['50-30-20'];
  return {
    'Necessidades': { percentage: currentModeInfo.ratios['Necessidades'], color: 'bg-blue-500', text: 'text-blue-700' },
    'Desejos': { percentage: currentModeInfo.ratios['Desejos'], color: 'bg-amber-500', text: 'text-amber-700' },
    'Reserva/Dívidas': { percentage: currentModeInfo.ratios['Reserva/Dívidas'], color: 'bg-emerald-500', text: 'text-emerald-700' }
  };
};

export const BUCKET_EXPLANATIONS = {
  'Necessidades': 'Gastos essenciais para a sobrevivência e trabalho. Ex: Aluguel, alimentação, transporte, luz, água e saúde.',
  'Desejos': 'Gastos flexíveis com lazer e estilo de vida. Ex: Restaurantes, viagens, assinaturas (Netflix), compras não essenciais.',
  'Reserva/Dívidas': 'Dinheiro guardado no seu cofrinho para o futuro, investimentos ou amortização de dívidas.'
};

export const CATEGORIES = {
  'Necessidades': ['Aluguel/Prestação', 'Alimentação', 'Transporte', 'Contas (Água, Luz, Net)', 'Saúde', 'Educação'],
  'Desejos': ['Lazer', 'Restaurantes', 'Compras', 'Assinaturas', 'Cuidados Pessoais', 'Presentes'],
  'Reserva/Dívidas': ['Transferência para Reserva', 'Investimento', 'Aporte Cofrinho', 'Pagamento de Dívidas'],
  'Renda': ['Salário', 'Freelance', 'Renda Extra', 'Rendimento', 'Resgate de Reserva']
};


