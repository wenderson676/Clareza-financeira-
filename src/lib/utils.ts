export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const verses = [
  "Honra ao Senhor com os teus bens e com as primícias de toda a tua renda. - Provérbios 3:9",
  "O rico domina sobre os pobres; quem toma emprestado é escravo de quem empresta. - Provérbios 22:7",
  "Quem é fiel no pouco, também é fiel no muito. - Lucas 16:10",
  "O dinheiro ganho com desonestidade diminuirá, mas quem o ajunta aos poucos terá cada vez mais. - Provérbios 13:11",
  "Os planos bem elaborados levam à fartura; mas o apressado sempre acaba na miséria. - Provérbios 21:5",
  "Pois onde estiver o seu tesouro, aí também estará o seu coração. - Mateus 6:21",
  "Mas busquem em primeiro lugar o Reino de Deus e a sua justiça, e todas estas coisas lhes serão acrescentadas. - Mateus 6:33",
  "Ninguém pode servir a dois senhores; pois odiará um e amará o outro, ou se dedicará a um e desprezará o outro. Vocês não podem servir a Deus e ao Dinheiro. - Mateus 6:24",
  "Mantenham a vida livre do amor ao dinheiro e contentem-se com o que têm. - Hebreus 13:5",
  "Lembrem-se disto: Quem semeia pouco, também colherá pouco, e quem semeia com fartura, também colherá com fartura. - 2 Coríntios 9:6"
];

export const getRandomVerse = () => {
  const index = Math.floor(Math.random() * verses.length);
  return verses[index];
};

// Buckets rules
export const BUCKETS = {
  'Dízimo': { percentage: 0.10, color: 'bg-emerald-500', text: 'text-emerald-700' },
  'Necessidades': { percentage: 0.50, color: 'bg-blue-500', text: 'text-blue-700' },
  'Vida': { percentage: 0.30, color: 'bg-amber-500', text: 'text-amber-700' },
  'Poupança': { percentage: 0.10, color: 'bg-indigo-500', text: 'text-indigo-700' }
};

export const BUCKET_EXPLANATIONS = {
  'Dízimo': 'A décima parte da sua renda dedicada a Deus, como um ato de fé e obediência. Também inclui ofertas.',
  'Necessidades': 'Gastos essenciais para a sobrevivência e trabalho. Ex: Aluguel, alimentação, transporte, luz, água e saúde.',
  'Vida': 'Gastos flexíveis com lazer e estilo de vida. Ex: Restaurantes, viagens, assinaturas (Netflix), compras não essenciais.',
  'Poupança': 'Dinheiro guardado no seu cofrinho para o futuro. Ex: Fundo de emergência, investimentos, quitação de dívidas e aposentadoria.'
};

export const CATEGORIES = {
  'Necessidades': ['Aluguel/Prestação', 'Alimentação', 'Transporte', 'Contas (Água, Luz, Net)', 'Saúde', 'Educação'],
  'Vida': ['Lazer', 'Restaurantes', 'Compras', 'Assinaturas', 'Cuidados Pessoais', 'Presentes'],
  'Poupança': ['Transferência para Poupança', 'Resgate da Poupança'],
  'Dízimo': ['Dízimo', 'Oferta'],
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
  'dizimo': { formTab: 'expense', bucket: 'Dízimo', category: 'Dízimo' },
  'dízimo': { formTab: 'expense', bucket: 'Dízimo', category: 'Dízimo' },
  'oferta': { formTab: 'expense', bucket: 'Dízimo', category: 'Oferta' },
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
