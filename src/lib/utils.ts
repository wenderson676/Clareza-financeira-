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
  'Vida': { percentage: 0.30, color: 'bg-amber-500', text: 'text-amber-700' },
  'Reserva Financeira': { percentage: 0.20, color: 'bg-emerald-500', text: 'text-emerald-700' }
};

export const BUCKET_EXPLANATIONS = {
  'Necessidades': 'Gastos essenciais para a sobrevivência e trabalho. Ex: Aluguel, alimentação, transporte, luz, água e saúde.',
  'Vida': 'Gastos flexíveis com lazer e estilo de vida. Ex: Restaurantes, viagens, assinaturas (Netflix), compras não essenciais.',
  'Reserva Financeira': 'Dinheiro guardado no seu cofrinho para o futuro e para a realização de sonhos. Ex: Fundo de emergência, investimentos e aposentadoria.'
};

export const CATEGORIES = {
  'Necessidades': ['Aluguel/Prestação', 'Alimentação', 'Transporte', 'Contas (Água, Luz, Net)', 'Saúde', 'Educação'],
  'Vida': ['Lazer', 'Restaurantes', 'Compras', 'Assinaturas', 'Cuidados Pessoais', 'Presentes'],
  'Reserva Financeira': ['Transferência para Reserva', 'Investimento', 'Aporte Cofrinho'],
  'Renda': ['Salário', 'Freelance', 'Renda Extra', 'Rendimento', 'Resgate de Reserva']
};


