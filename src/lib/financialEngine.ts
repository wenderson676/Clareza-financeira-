import { MonthlyData, Debt, Goal, Account, Transaction } from '../types';

export type FinancialMode = 'Crise' | 'Sobrevivência' | 'Estabilização' | 'Construção' | 'Expansão';
export type RiskLevel = 'Crítico' | 'Alto' | 'Moderado' | 'Baixo' | 'Mínimo';

export interface FinancialMetrics {
  dtiRatio: number;          // Debt-to-Income ratio in %
  savingsRate: number;       // Savings rate in %
  fixedOverheadIndex: number; // Percentage of income spent on essential fixed needs
  runwayMonths: number;      // How many months the current balance can sustain current expenses
  totalAssets: number;
  totalDebts: number;
  monthlySurplus: number;
}

export interface ParsedCommitment {
  type: 'receita' | 'despesa' | 'divida' | 'aviso' | 'oportunidade';
  category: string;
  text: string;
  amount?: number;
  dateStr?: string;
  source: 'nota_geral' | 'transacao';
}

export interface FinancialProjection {
  period: string; // e.g. "Julho 2026", "Agosto 2026", etc.
  projectedIncome: number;
  projectedExpense: number;
  projectedBalance: number;
}

export interface FinancialDiagnosis {
  mode: FinancialMode;
  riskLevel: RiskLevel;
  mainProblem: string;
  strongPoints: string[];
  attentionPoints: string[];
  biggestDrain: string | null;
  biggestDebt: string | null;
  recommendation: string;
  metrics: FinancialMetrics;
  parsedCommitments: ParsedCommitment[];
  projections: FinancialProjection[];
  actionPlan: {
    today: string[];
    next7Days: string[];
    next30Days: string[];
    next90Days: string[];
  };
  insights: string[];
}

/**
 * Deep text processing to extract numbers, dates, and intent keywords from annotations/notes
 */
export function parseNotesAndAnnotations(
  devotionalNote: string,
  transactions: Transaction[]
): ParsedCommitment[] {
  const commitments: ParsedCommitment[] = [];

  // Helper to extract first monetary value from a string (e.g. "R$ 750", "750", "120 de luz")
  const extractAmount = (text: string): number | undefined => {
    // Look for R$ followed by numbers, or just numbers with decimal formats
    const match = text.match(/(?:R\$\s*)?(\d+(?:[.,]\d{2})?)/i);
    if (match) {
      const value = match[1].replace('.', '').replace(',', '.');
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  };

  // Helper to extract day of month (e.g., "dia 15", "vence dia 10")
  const extractDay = (text: string): string | undefined => {
    const match = text.match(/dia\s*(\d{1,2})/i);
    if (match) {
      return `Dia ${match[1]}`;
    }
    return undefined;
  };

  // 1. Parse Monthly General Note (devotionalNote)
  if (devotionalNote && devotionalNote.trim()) {
    const lines = devotionalNote.split('\n');
    lines.forEach(line => {
      if (!line.trim()) return;

      const lower = line.toLowerCase();
      const amt = extractAmount(line);
      const day = extractDay(line);

      if (lower.includes('recebi') || lower.includes('receber') || lower.includes('renda') || lower.includes('entrada') || lower.includes('salário') || lower.includes('bico')) {
        commitments.push({
          type: 'receita',
          category: 'Entrada Planejada',
          text: line.trim(),
          amount: amt,
          dateStr: day || 'Neste ciclo',
          source: 'nota_geral'
        });
      } else if (lower.includes('paguei') || lower.includes('pagar') || lower.includes('despesa') || lower.includes('vence') || lower.includes('fatura') || lower.includes('luz') || lower.includes('água') || lower.includes('aluguel') || lower.includes('mercado')) {
        commitments.push({
          type: 'despesa',
          category: 'Compromisso Fixo',
          text: line.trim(),
          amount: amt,
          dateStr: day || 'Neste ciclo',
          source: 'nota_geral'
        });
      } else if (lower.includes('dívida') || lower.includes('devo') || lower.includes('agiota') || lower.includes('empréstimo') || lower.includes('parcela')) {
        commitments.push({
          type: 'divida',
          category: 'Passivo Urgente',
          text: line.trim(),
          amount: amt,
          dateStr: day || 'Vencimento mensal',
          source: 'nota_geral'
        });
      } else if (lower.includes('guardar') || lower.includes('reserva') || lower.includes('poupar') || lower.includes('meta')) {
        commitments.push({
          type: 'oportunidade',
          category: 'Acúmulo de Reserva',
          text: line.trim(),
          amount: amt,
          dateStr: 'Planejamento',
          source: 'nota_geral'
        });
      } else {
        commitments.push({
          type: 'aviso',
          category: 'Anotação Relevante',
          text: line.trim(),
          source: 'nota_geral'
        });
      }
    });
  }

  // 2. Parse Transaction notes for extra metadata (e.g. installments, delays)
  transactions.forEach(t => {
    if (t.notes && t.notes.trim()) {
      const lowerNotes = t.notes.toLowerCase();
      const lowerDesc = t.description.toLowerCase();
      
      if (lowerNotes.includes('atrasad') || lowerNotes.includes('atraso') || lowerNotes.includes('risco')) {
        commitments.push({
          type: 'divida',
          category: 'Compromisso Atrasado/Crítico',
          text: `[${t.description}] Alerta em anotação: ${t.notes}`,
          amount: t.amount,
          source: 'transacao'
        });
      } else if (lowerNotes.includes('parcela') || lowerNotes.includes('/') || lowerNotes.includes('vezes')) {
        commitments.push({
          type: 'despesa',
          category: 'Gasto Parcelado Recorrente',
          text: `[${t.description}] ${t.notes}`,
          amount: t.amount,
          source: 'transacao'
        });
      } else if (lowerNotes.includes('recorrente') || lowerNotes.includes('todo mês') || lowerNotes.includes('mensal')) {
        commitments.push({
          type: 'despesa',
          category: 'Compromisso Fixo Recorrente',
          text: `[${t.description}] Despesa mensal: ${t.notes}`,
          amount: t.amount,
          source: 'transacao'
        });
      }
    }
  });

  return commitments;
}

/**
 * Professional algorithm to generate financial diagnosis, projections, and metrics
 */
export function generateFinancialDiagnosis(
  currentMonthData: MonthlyData,
  allData: Record<string, MonthlyData>,
  previousBalance: number,
  debts: Debt[],
  goals: Goal[],
  accounts: Account[]
): FinancialDiagnosis {
  const txs = currentMonthData.transactions || [];
  const devotionalNote = currentMonthData.devotionalNote || '';

  // 1. Basic calculations (Income & Expenses)
  const realizedIncome = txs.filter(t => t.type === 'income' && !t.isPending).reduce((acc, t) => acc + t.amount, 0);
  const pendingIncome = txs.filter(t => t.type === 'income' && t.isPending).reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = realizedIncome + pendingIncome;

  const realizedExpenses = txs.filter(t => t.type === 'expense' && !t.isPending).reduce((acc, t) => acc + t.amount, 0);
  const pendingExpenses = txs.filter(t => t.type === 'expense' && t.isPending).reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = realizedExpenses + pendingExpenses;

  // 2. Account balances & net worth
  const currentBalance = accounts.reduce((acc, a) => {
    // Look up real account balances if tracked, or default to previous + current month flow
    return acc + (a.id === 'reserva' ? 0 : 0); // we will use previousBalance + realized income/expense
  }, 0) || (previousBalance + realizedIncome - realizedExpenses);

  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0) + (accounts.find(a => a.id === 'reserva') ? previousBalance : 0);
  const totalAssets = Math.max(0, currentBalance) + totalSaved;

  // 3. Debt metrics
  const totalDebtAmount = debts.reduce((acc, d) => acc + d.totalAmount, 0);
  const totalDebtMonthly = debts.reduce((acc, d) => acc + d.monthlyPayment, 0);
  const hasLateDebts = debts.some(d => d.isLate);

  // 4. Necessity spending overhead
  const totalNecessities = txs.filter(t => t.type === 'expense' && t.bucket === 'Necessidades').reduce((acc, t) => acc + t.amount, 0);
  const necessitiesPercent = totalIncome > 0 ? (totalNecessities / totalIncome) * 100 : 0;

  // 5. Run Parse of Text Notes / Annotations
  const parsedCommitments = parseNotesAndAnnotations(devotionalNote, txs);

  // Take parsed notes amounts into account if they aren't registered transactions
  let additionalUnregisteredExpenses = 0;
  let additionalUnregisteredIncome = 0;

  parsedCommitments.forEach(c => {
    if (c.source === 'nota_geral' && c.amount) {
      if (c.type === 'despesa' || c.type === 'divida') {
        additionalUnregisteredExpenses += c.amount;
      } else if (c.type === 'receita') {
        additionalUnregisteredIncome += c.amount;
      }
    }
  });

  const adjustedIncome = totalIncome + additionalUnregisteredIncome;
  const adjustedExpenses = totalExpenses + additionalUnregisteredExpenses;
  const monthlySurplus = adjustedIncome - adjustedExpenses;

  // 6. Professional Financial Metrics
  const dtiRatio = adjustedIncome > 0 ? (totalDebtMonthly / adjustedIncome) * 100 : (totalDebtMonthly > 0 ? 100 : 0);
  const savingsRate = adjustedIncome > 0 ? (Math.max(0, monthlySurplus) / adjustedIncome) * 100 : 0;
  const fixedOverheadIndex = adjustedIncome > 0 ? ((totalNecessities + totalDebtMonthly) / adjustedIncome) * 100 : (totalNecessities > 0 ? 100 : 0);
  const runwayMonths = adjustedExpenses > 0 ? (totalAssets / adjustedExpenses) : (totalAssets > 0 ? 99 : 0);

  // 7. Determine Financial Mode & Risk
  let mode: FinancialMode = 'Estabilização';
  let riskLevel: RiskLevel = 'Moderado';
  let mainProblem = '';

  const hasHighSurvivalRisk = hasLateDebts || (currentBalance < -100) || (runwayMonths < 0.2 && adjustedExpenses > 0 && totalDebtMonthly > adjustedIncome * 0.35);

  if (adjustedIncome === 0 && adjustedExpenses > 0) {
    mode = 'Crise';
    riskLevel = 'Crítico';
    mainProblem = 'Você ainda não registrou nenhum dinheiro entrando este mês para pagar as contas ativas. Precisamos ajustar isso!';
  } else if (hasHighSurvivalRisk) {
    mode = 'Crise';
    riskLevel = 'Crítico';
    mainProblem = hasLateDebts 
      ? 'Tem contas em atraso ou parcelas urgentes sufocando seu bolso agora. Vamos resolver isso juntos!' 
      : 'Sua carteira está no vermelho! Gastar mais do que ganha traz riscos graves para os próximos dias.';
  } else if (fixedOverheadIndex > 75 || runwayMonths < 1) {
    mode = 'Sobrevivência';
    riskLevel = 'Alto';
    mainProblem = 'As contas fixas e parcelas engolem quase todo o seu ganho. Sobra muito pouco para respirar se algo der errado.';
  } else if (runwayMonths < 3) {
    mode = 'Estabilização';
    riskLevel = 'Moderado';
    mainProblem = 'Suas contas estão em dia, mas seu dinheiro guardado para emergências ainda é menor do que 3 meses de despesas.';
  } else if (totalDebtAmount === 0 && savingsRate > 20 && runwayMonths >= 3) {
    if (runwayMonths >= 6 && savingsRate > 35) {
      mode = 'Expansão';
      riskLevel = 'Mínimo';
      mainProblem = 'Sua saúde financeira está excelente! O caminho agora é fazer o dinheiro trabalhar para você de forma segura.';
    } else {
      mode = 'Construção';
      riskLevel = 'Baixo';
      mainProblem = 'Você tem um bom dinheiro sobrando! É hora de acelerar suas metas de vida e realizar seus sonhos.';
    }
  }

  // Find biggest drain (desejos)
  const desires = txs.filter(t => t.type === 'expense' && t.bucket === 'Desejos');
  const catTotals = desires.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const biggestDrain = sortedCats.length > 0 && sortedCats[0][1] > 0 ? sortedCats[0][0] : null;

  // Find biggest debt
  const sortedDebts = [...debts].sort((a, b) => b.totalAmount - a.totalAmount);
  const biggestDebt = sortedDebts.length > 0 ? sortedDebts[0].name : null;

  // 8. Generate Multi-Month Projections (next 3 periods)
  const projections: FinancialProjection[] = [];
  const monthNames = ['Mês Atual', 'Mês que vem (Projeção)', 'Daqui a 2 Meses (Projeção)'];
  
  // Check if we have active debts, active goals or custom annotations indicating future inputs
  const hasFutureAnnotations = parsedCommitments.some(c => c.source === 'nota_geral');
  const hasDebts = debts.length > 0;
  const hasGoals = goals.length > 0;
  
  let tempBalance = currentBalance;
  for (let i = 0; i < 3; i++) {
    if (i === 0) {
      projections.push({
        period: monthNames[i],
        projectedIncome: adjustedIncome,
        projectedExpense: adjustedExpenses,
        projectedBalance: currentBalance
      });
    } else {
      // Future months: Only calculate if we have active debts or future annotations/goals
      if (hasDebts || hasFutureAnnotations || hasGoals) {
        // Collect future income from annotations/recurring
        let pIncome = 0;
        parsedCommitments.forEach(c => {
          if (c.type === 'receita' && c.amount) {
            pIncome += c.amount;
          }
        });
        
        // Collect future expense from active debts (monthly payment) + goals + annotations
        let pExpense = totalDebtMonthly;
        parsedCommitments.forEach(c => {
          if ((c.type === 'despesa' || c.type === 'divida') && c.amount) {
            pExpense += c.amount;
          }
        });
        
        tempBalance += (pIncome - pExpense);
        projections.push({
          period: monthNames[i],
          projectedIncome: pIncome,
          projectedExpense: pExpense,
          projectedBalance: tempBalance
        });
      } else {
        // If there are no future notes/commitments/debts, do not compute or invent values
        projections.push({
          period: monthNames[i],
          projectedIncome: 0,
          projectedExpense: 0,
          projectedBalance: 0
        });
      }
    }
  }

  // Strong points
  const strongPoints: string[] = [];
  if (adjustedIncome > adjustedExpenses && adjustedIncome > 0) strongPoints.push('Seu saldo mensal está positivo: entra mais dinheiro do que sai!');
  if (totalSaved > 0) strongPoints.push(`Você já guardou R$ ${totalSaved.toFixed(2)} como reserva ou meta de economia.`);
  if (dtiRatio < 20 && totalDebtMonthly > 0) strongPoints.push('O valor mensal pago em dívidas e parcelas está bem pequeno e sob controle.');
  if (debts.length === 0) strongPoints.push('Parabéns! Você não tem nenhuma dívida ativa cadastrada no sistema.');
  if (runwayMonths >= 3) strongPoints.push(`Excelente! Seus recursos cobrem pelo menos ${runwayMonths.toFixed(1)} meses de custos de vida.`);

  if (strongPoints.length === 0) {
    strongPoints.push('Você deu o primeiro passo inteligente: encarar seus números de frente para tomar o controle!');
  }

  // Attention points
  const attentionPoints: string[] = [];
  if (fixedOverheadIndex > 70) attentionPoints.push(`Suas contas fixas estão muito altas (${fixedOverheadIndex.toFixed(0)}% da renda). Tente abaixar esse peso.`);
  if (biggestDrain) attentionPoints.push(`Identificamos um gasto relevante em lazer/desejos na categoria: "${biggestDrain}".`);
  if (totalDebtAmount > adjustedIncome * 2 && totalDebtAmount > 0) attentionPoints.push('Sua dívida total acumulada é maior que duas vezes sua renda mensal. Cuidado com o acúmulo.');
  if (runwayMonths < 1 && adjustedExpenses > 0) attentionPoints.push('Sua reserva dura menos de 1 mês. Qualquer imprevisto pode te deixar apertado.');

  // Check if any specific warning word exists in general note
  const noteLower = devotionalNote.toLowerCase();
  if (noteLower.includes('atrasado') || noteLower.includes('atrasar') || noteLower.includes('aluguel')) {
    attentionPoints.push('Anotações do sistema apontam que você tem preocupações com atrasos ou contas de moradia.');
  }
  if (noteLower.includes('agiota') || noteLower.includes('juro') || noteLower.includes('empréstimo')) {
    attentionPoints.push('Atenção a juros altos de empréstimos ativos informados.');
  }

  // 9. Structured Action Plan based ONLY on user's active APK data & annotations
  let recommendation = 'Seu foco agora deve ser manter seu fluxo de caixa anotado e saudável.';
  const actionPlan = { today: [], next7Days: [], next30Days: [], next90Days: [] };
  const insights: string[] = [];

  const activeDebts = debts.filter(d => d.totalAmount > 0);
  const activeGoals = goals.filter(g => g.targetAmount > g.currentAmount);
  const noteExpenses = parsedCommitments.filter(c => c.source === 'nota_geral' && (c.type === 'despesa' || c.type === 'divida'));
  const noteIncomes = parsedCommitments.filter(c => c.source === 'nota_geral' && c.type === 'receita');

  // Today's actions
  if (hasLateDebts) {
    const lateDebtsList = debts.filter(d => d.isLate).map(d => d.name).join(', ');
    actionPlan.today.push(`Priorizar o contato imediato para regularizar as contas em atraso: ${lateDebtsList}.`);
  }
  
  if (biggestDrain) {
    actionPlan.today.push(`Colocar um teto limite hoje mesmo na categoria de gastos "${biggestDrain}" para evitar vazamentos.`);
  }

  noteExpenses.forEach(c => {
    if (c.amount && c.amount > 150) {
      actionPlan.today.push(`Separar o valor de R$ ${c.amount.toFixed(2)} para cobrir o compromisso anotado: "${c.text}".`);
    }
  });

  if (actionPlan.today.length === 0) {
    actionPlan.today.push('Revisar os lançamentos do dia e conferir se todos os seus gastos diários estão registrados.');
  }

  // Next 7 days actions
  if (activeDebts.length > 0) {
    const firstDebt = activeDebts[0];
    actionPlan.next7Days.push(`Avaliar uma proposta de amortização ou quitação antecipada da dívida "${firstDebt.name}".`);
  }

  noteIncomes.forEach(c => {
    actionPlan.next7Days.push(`Acompanhar a entrada prevista anotada: "${c.text}".`);
  });

  if (activeGoals.length > 0) {
    const firstGoal = activeGoals[0];
    actionPlan.next7Days.push(`Transferir qualquer sobra desta semana para acelerar a meta de economia "${firstGoal.title}".`);
  }

  if (actionPlan.next7Days.length === 0) {
    actionPlan.next7Days.push('Se houver algum novo compromisso ou boleto esta semana, anote no aplicativo.');
  }

  // Next 30 days actions
  if (activeDebts.length > 1) {
    actionPlan.next30Days.push(`Organizar as parcelas do próximo mês, com foco especial na dívida "${activeDebts[1].name}".`);
  } else if (activeDebts.length === 1) {
    actionPlan.next30Days.push(`Tentar poupar uma quantia extra este mês para abater o saldo devedor de "${activeDebts[0].name}".`);
  }

  if (activeGoals.length > 1) {
    actionPlan.next30Days.push(`Dividir as sobras do mês de forma equilibrada para impulsionar a meta "${activeGoals[1].title}".`);
  }

  parsedCommitments.filter(c => c.type === 'oportunidade').forEach(c => {
    actionPlan.next30Days.push(`Executar a oportunidade de acúmulo anotada: "${c.text}".`);
  });

  if (actionPlan.next30Days.length === 0) {
    actionPlan.next30Days.push('Avaliar o fechamento do seu mês para garantir que suas receitas foram maiores que as despesas.');
  }

  // Next 90 days actions
  if (activeGoals.length > 0) {
    actionPlan.next90Days.push(`Revisar o progresso das suas metas de poupança, mirando concluir a meta "${activeGoals[0].title}".`);
  }
  if (activeDebts.length > 0) {
    actionPlan.next90Days.push('Buscar reduzir o seu endividamento total em relação ao nível atual.');
  }

  if (actionPlan.next90Days.length === 0) {
    actionPlan.next90Days.push('Manter o hábito de registrar tudo para consolidar seu histórico financeiro de 3 meses.');
  }

  // Recommendations based on MODE & real features
  if (mode === 'Crise') {
    recommendation = 'O foco absoluto agora é estancar saídas. Use o botão (+) para registrar cada centavo e priorize o pagamento de contas essenciais.';
    insights.push('Com contas em atraso ou saldo negativo, qualquer compra supérflua aumenta o risco de insolvência.');
    insights.push('Utilize os lembretes de vencimento para evitar multas adicionais em suas contas.');
  } else if (mode === 'Sobrevivência') {
    recommendation = `Você está equilibrando as contas, mas o orçamento está apertado na categoria "${biggestDrain || 'Geral'}". Use as Metas de economia para criar um colchão seguro.`;
    insights.push('Construir uma pequena reserva de segurança na aba de Metas trará a tranquilidade necessária para respirar.');
  } else if (mode === 'Estabilização') {
    recommendation = 'Ótimo trabalho mantendo as contas em dia! Aproveite este momento de equilíbrio para focar na eliminação completa de suas parcelas e dívidas ativas.';
    insights.push('Eliminar as parcelas ativas vai liberar uma fatia enorme da sua renda mensal para você realizar novos planos.');
  } else {
    recommendation = 'Seus números estão saudáveis e estáveis! Continue abastecendo suas Metas de economia e planeje novos objetivos no aplicativo.';
    insights.push('A constância em registrar e poupar mensalmente é o que garante sua segurança de longo prazo.');
  }

  return {
    mode,
    riskLevel,
    mainProblem,
    strongPoints,
    attentionPoints,
    biggestDrain,
    biggestDebt,
    recommendation,
    metrics: {
      dtiRatio,
      savingsRate,
      fixedOverheadIndex,
      runwayMonths,
      totalAssets,
      totalDebts: totalDebtAmount,
      monthlySurplus
    },
    parsedCommitments,
    projections,
    actionPlan,
    insights
  };
}

/**
 * Advanced Client-Side Consulting Simulator
 * Responds intelligently to questions and notes typed by the user, providing customized financial planning answers
 */
export function answerFinancialQuery(
  query: string,
  diagnosis: FinancialDiagnosis,
  goals: Goal[],
  debts: Debt[]
): string {
  const cleanQuery = query.toLowerCase().trim();
  const balance = diagnosis.metrics.totalAssets - diagnosis.metrics.totalDebts;
  const surplus = diagnosis.metrics.monthlySurplus;

  // Extract amount from query if user asks about a purchase
  const extractQueryAmount = (text: string): number | undefined => {
    const match = text.match(/(?:r\$\s*)?(\d+(?:\s*\d{3})*(?:[.,]\d{2})?)/i);
    if (match) {
      const value = match[1].replace(/\s/g, '').replace('.', '').replace(',', '.');
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  };

  const amount = extractQueryAmount(cleanQuery);

  // 1. Check for specific question types or patterns
  if (cleanQuery.includes('recebi') || cleanQuery.includes('ganhei') || cleanQuery.includes('paguei') || cleanQuery.includes('gastei')) {
    return `📝 **Entendido! Para manter tudo organizadinho e com análises perfeitas:**\n\n` +
           `Por favor, cadastre esse valor na primeira aba **"Início"** clicando no botão **(+)**!\n\n` +
           `* Se for um **Ganho (Entrada):** Isso vai aumentar suas sobras mensais (que hoje estão em R$ ${surplus.toFixed(2)}) e te dar mais meses de tranquilidade.\n` +
           `* Se for um **Gasto (Saída):** Lembra de marcar se é "Necessidades" ou "Desejos" para sabermos se está dentro do planejado para a sua fase atual (**Modo ${diagnosis.mode}**).`;
  }

  if (cleanQuery.includes('consigo comprar') || cleanQuery.includes('posso comprar') || cleanQuery.includes('comprar') || cleanQuery.includes('gastar')) {
    if (amount) {
      const formattedAmount = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      
      if (diagnosis.mode === 'Crise' || diagnosis.mode === 'Sobrevivência') {
        return `⚠️ **Alerta Amigo do Contador:**\n\n` +
               `Como sua fase atual é o **Modo ${diagnosis.mode}**, gastar **${formattedAmount}** agora não é uma boa ideia. Suas sobras estimadas livres estão em R$ ${surplus.toFixed(2)}.\n\n` +
               `**O que fazer exatamente:** Guarde essa vontade por enquanto. Foque primeiro em construir sua segurança e cobrir o básico. Comprar isso hoje colocaria você em risco de se endividar ainda mais.`;
      }

      if (amount > diagnosis.metrics.totalAssets * 0.2) {
        return `🤔 **Olha só, fiz as contas aqui:** Comprar esse item de **${formattedAmount}** vai levar mais do que 20% de todas as suas economias guardadas (R$ ${diagnosis.metrics.totalAssets.toFixed(2)}).\n\n` +
               `Mesmo que você esteja numa fase de **${diagnosis.mode}**, essa compra vai pesar bastante na sua carteira. Se for muito urgente, tente criar uma meta de economia aqui no aplicativo e vá guardando um pouquinho por mês até atingir o valor sem sofrer!`;
      }

      return `✅ **Pode ir em frente com segurança!** Com base nos seus números atuais (estamos na fase de **${diagnosis.mode}**), a compra de **${formattedAmount}** cabe no seu orçamento atual!\n\n` +
             `Suas economias totais somam R$ ${diagnosis.metrics.totalAssets.toFixed(2)} e suas sobras estão confortáveis. Dica de ouro: pague à vista para pedir um bom desconto e evite parcelar para não prender seu dinheiro no futuro!`;
    }

    return `🛒 **Quer saber se uma compra cabe no bolso?** Digite o valor que pretende gastar (ex: "Posso comprar algo de R$ 1200?").\n\n` +
           `Como regra simples: evite gastos que sejam maiores do que as suas sobras livres do mês (R$ ${surplus.toFixed(2)}), a menos que tenha guardado um dinheiro específico só para essa compra.`;
  }

  if (cleanQuery.includes('dívida') || cleanQuery.includes('devo') || cleanQuery.includes('pagar dívida') || cleanQuery.includes('atrasad') || cleanQuery.includes('agiota')) {
    const totalDebt = diagnosis.metrics.totalDebts;
    if (totalDebt > 0) {
      const activeDebtsText = debts.map(d => `* **${d.name}:** R$ ${d.totalAmount.toFixed(2)} (${d.isLate ? '⚠️ EM ATRASO' : 'Em dia'})`).join('\n');
      return `🏦 **Estratégia prática para eliminar suas dívidas:**\n\n` +
             `Vi que você tem R$ ${totalDebt.toFixed(2)} em dívidas cadastradas:\n${activeDebtsText}\n\n` +
             `**O que fazer passo a passo:**\n` +
             `1. **Feche a torneira:** Não compre mais nada parcelado nem faça novos cartões sob nenhuma hipótese.\n` +
             `2. **Método da Bola de Neve:** Comece quitando as dívidas que cobram os juros mais caros (como cartões ou cheque especial) ou comece pelas menores para se motivar limpando seu nome rápido.\n` +
             `3. **Ligue para negociar:** Peça descontos para quitar à vista. Eles costumam dar descontos incríveis de até 80% do valor total quando você propõe pagar à vista.`;
    }
    return `✨ **Notícia maravilhosa!** Você não tem nenhuma dívida cadastrada no aplicativo!\n\n` +
           `Seu foco total agora deve ser construir sua reserva de segurança. Assim, se acontecer qualquer imprevisto, você nunca mais precisará pegar dinheiro emprestado.`;
  }

  if (cleanQuery.includes('investir') || cleanQuery.includes('investimento') || cleanQuery.includes('aplicar') || cleanQuery.includes('guardar')) {
    if (diagnosis.mode === 'Crise' || diagnosis.mode === 'Sobrevivência') {
      return `❌ **Conselho sincero:** Ainda não é a hora de investir em ações ou coisas de longo prazo.\n\n` +
             `Como estamos na fase de **${diagnosis.mode}**, sua única missão é ter dinheiro vivo na mão para emergências. Deixe suas economias em uma poupança simples ou conta digital de fácil acesso que renda 100% do CDI, para que você possa sacar no mesmo minuto se precisar de ajuda.`;
    }
    return `📈 **Sugestão simples para fazer seu dinheiro render:**\n\n` +
           `Como sua fase é a de **${diagnosis.mode}** com ${diagnosis.metrics.runwayMonths.toFixed(1)} meses de tranquilidade garantidos:\n\n` +
           `1. **Reserva de Emergência (Seu foco agora):** Deixe o dinheiro em CDBs de Liquidez Diária de bancos conhecidos ou no Tesouro Selic.\n` +
           `2. **Planos para os próximos anos (Metas):** Escolha investimentos de Renda Fixa (como CDBs ou LCI/LCA) com o prazo de vencimento casado com o ano do seu sonho.\n` +
           `3. **Futuro distante (Aposentadoria):** Comece a ler sobre Fundos Imobiliários (que pagam aluguéis na sua conta todo mês) e boas ações de empresas fortes de energia ou saneamento básico.`;
  }

  if (cleanQuery.includes('apertad') || cleanQuery.includes('crise') || cleanQuery.includes('sobra nada') || cleanQuery.includes('fim do mês') || cleanQuery.includes('socorro')) {
    return `🚨 **Roteiro rápido de sobrevivência para o aperto:**\n\n` +
           `Sei muito bem como é passar por isso. Respire fundo, isso é apenas uma fase passageira. Ter cadastrado seus dados aqui já prova que você decidiu mudar sua história financeira!\n\n` +
           `**O que fazer nos próximos 7 dias:**\n` +
           `1. **Corte vazamentos pequenos:** Aplicativos de transporte, entregas de comida e compras de impulso precisam parar por duas semanas.\n` +
           `2. **Economize nas contas de casa:** Tente diminuir o tempo no banho, apague luzes e pesquise preços antes de ir ao supermercado.\n"`;
  }

  // Default intelligent response matching the diagnosis
  return `🤖 **Análise do seu Amigo Contador:**\n\n` +
         `Fiz uma análise detalhada dos seus dados cadastrados. Atualmente você está na fase de **${diagnosis.mode}** com nível de risco **${diagnosis.riskLevel}**.\n\n` +
         `**Veja como está seu bolso de forma bem simples:**\n` +
         `* Suas contas obrigatórias pegam **${diagnosis.metrics.fixedOverheadIndex.toFixed(0)}%** de tudo que você ganha.\n` +
         `* Sobra aproximadamente **R$ ${surplus.toFixed(2)}** livres no fim do mês.\n` +
         `* Seus recursos guardados conseguem te dar **${diagnosis.metrics.runwayMonths.toFixed(1)} meses de tranquilidade** sem nenhuma renda.\n\n` +
         `O que você gostaria de planejar hoje? Pode me perguntar se consegue comprar alguma coisa específica, como sair das dívidas ou onde guardar o dinheiro que sobra!`;
}
