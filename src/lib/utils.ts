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

const KEYWORD_MAP: Record<string, { formTab: 'expense' | 'income', bucket: any, category: string }> = {
  'supermercado': { formTab: 'expense', bucket: 'Necessidades', category: 'Alimentação' },
  'mercado': { formTab: 'expense', bucket: 'Necessidades', category: 'Alimentação' },
  'padaria': { formTab: 'expense', bucket: 'Necessidades', category: 'Alimentação' },
  'açougue': { formTab: 'expense', bucket: 'Necessidades', category: 'Alimentação' },
  'sacolão': { formTab: 'expense', bucket: 'Necessidades', category: 'Alimentação' },
  'feira': { formTab: 'expense', bucket: 'Necessidades', category: 'Alimentação' },
  'comida': { formTab: 'expense', bucket: 'Necessidades', category: 'Alimentação' },
  'gasolina': { formTab: 'expense', bucket: 'Necessidades', category: 'Transporte' },
  'uber': { formTab: 'expense', bucket: 'Necessidades', category: 'Transporte' },
  'ônibus': { formTab: 'expense', bucket: 'Necessidades', category: 'Transporte' },
  'metro': { formTab: 'expense', bucket: 'Necessidades', category: 'Transporte' },
  'passagem': { formTab: 'expense', bucket: 'Necessidades', category: 'Transporte' },
  'estacionamento': { formTab: 'expense', bucket: 'Necessidades', category: 'Transporte' },
  'luz': { formTab: 'expense', bucket: 'Necessidades', category: 'Contas (Água, Luz, Net)' },
  'energia': { formTab: 'expense', bucket: 'Necessidades', category: 'Contas (Água, Luz, Net)' },
  'enel': { formTab: 'expense', bucket: 'Necessidades', category: 'Contas (Água, Luz, Net)' },
  'água': { formTab: 'expense', bucket: 'Necessidades', category: 'Contas (Água, Luz, Net)' },
  'sabesp': { formTab: 'expense', bucket: 'Necessidades', category: 'Contas (Água, Luz, Net)' },
  'internet': { formTab: 'expense', bucket: 'Necessidades', category: 'Contas (Água, Luz, Net)' },
  'telefone': { formTab: 'expense', bucket: 'Necessidades', category: 'Contas (Água, Luz, Net)' },
  'claro': { formTab: 'expense', bucket: 'Necessidades', category: 'Contas (Água, Luz, Net)' },
  'vivo': { formTab: 'expense', bucket: 'Necessidades', category: 'Contas (Água, Luz, Net)' },
  'tim': { formTab: 'expense', bucket: 'Necessidades', category: 'Contas (Água, Luz, Net)' },
  'aluguel': { formTab: 'expense', bucket: 'Necessidades', category: 'Aluguel/Prestação' },
  'condomínio': { formTab: 'expense', bucket: 'Necessidades', category: 'Aluguel/Prestação' },
  'farmácia': { formTab: 'expense', bucket: 'Necessidades', category: 'Saúde' },
  'remédio': { formTab: 'expense', bucket: 'Necessidades', category: 'Saúde' },
  'médico': { formTab: 'expense', bucket: 'Necessidades', category: 'Saúde' },
  'consulta': { formTab: 'expense', bucket: 'Necessidades', category: 'Saúde' },
  'cinema': { formTab: 'expense', bucket: 'Vida', category: 'Lazer' },
  'show': { formTab: 'expense', bucket: 'Vida', category: 'Lazer' },
  'viagem': { formTab: 'expense', bucket: 'Vida', category: 'Lazer' },
  'hotel': { formTab: 'expense', bucket: 'Vida', category: 'Lazer' },
  'restaurante': { formTab: 'expense', bucket: 'Vida', category: 'Restaurantes' },
  'ifood': { formTab: 'expense', bucket: 'Vida', category: 'Restaurantes' },
  'pizza': { formTab: 'expense', bucket: 'Vida', category: 'Restaurantes' },
  'lanche': { formTab: 'expense', bucket: 'Vida', category: 'Restaurantes' },
  'hamburguer': { formTab: 'expense', bucket: 'Vida', category: 'Restaurantes' },
  'bar': { formTab: 'expense', bucket: 'Vida', category: 'Restaurantes' },
  'netflix': { formTab: 'expense', bucket: 'Vida', category: 'Assinaturas' },
  'spotify': { formTab: 'expense', bucket: 'Vida', category: 'Assinaturas' },
  'amazon': { formTab: 'expense', bucket: 'Vida', category: 'Assinaturas' },
  'prime': { formTab: 'expense', bucket: 'Vida', category: 'Assinaturas' },
  'academia': { formTab: 'expense', bucket: 'Vida', category: 'Assinaturas' },
  'cabelo': { formTab: 'expense', bucket: 'Vida', category: 'Cuidados Pessoais' },
  'barbeiro': { formTab: 'expense', bucket: 'Vida', category: 'Cuidados Pessoais' },
  'salão': { formTab: 'expense', bucket: 'Vida', category: 'Cuidados Pessoais' },
  'unha': { formTab: 'expense', bucket: 'Vida', category: 'Cuidados Pessoais' },
  'roupa': { formTab: 'expense', bucket: 'Vida', category: 'Compras' },
  'tênis': { formTab: 'expense', bucket: 'Vida', category: 'Compras' },
  'presente': { formTab: 'expense', bucket: 'Vida', category: 'Presentes' },
  'reserva': { formTab: 'expense', bucket: 'Reserva Financeira', category: 'Transferência para Reserva' },
  'investimento': { formTab: 'expense', bucket: 'Reserva Financeira', category: 'Investimento' },
  'cofrinho': { formTab: 'expense', bucket: 'Reserva Financeira', category: 'Aporte Cofrinho' },
  'salário': { formTab: 'income', bucket: 'Renda', category: 'Salário' },
  'salario': { formTab: 'income', bucket: 'Renda', category: 'Salário' },
  'adiantamento': { formTab: 'income', bucket: 'Renda', category: 'Salário' },
  'pagamento': { formTab: 'income', bucket: 'Renda', category: 'Salário' },
  'freela': { formTab: 'income', bucket: 'Renda', category: 'Freelance' },
  'venda': { formTab: 'income', bucket: 'Renda', category: 'Renda Extra' }
};

export const suggestCategory = (description: string) => {
  const lowerDesc = description.toLowerCase();
  for (const [keyword, suggestion] of Object.entries(KEYWORD_MAP)) {
    if (lowerDesc.includes(keyword)) {
      return suggestion;
    }
  }
  return null;
};
