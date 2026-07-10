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
  cashFlowPressure30D: number; // Percentage representing short-term cash pressure
}

export interface ParsedCommitment {
  type: 'receita' | 'despesa' | 'divida' | 'aviso' | 'oportunidade';
  category: string;
  text: string;
  amount?: number;
  dateStr?: string;
  source: 'nota_geral' | 'transacao';
  confidence: 'confirmado' | 'alta' | 'media' | 'baixa';
  status: 'realizado' | 'pendente' | 'planejado' | 'atrasado' | 'incerto';
}

export interface FinancialProjection {
  period: string; // e.g. "Julho 2026", "Agosto 2026", etc.
  projectedIncome: number;
  projectedExpense: number;
  projectedBalance: number;
}

export interface RecurrencePattern {
  category: string;
  type: 'income' | 'expense';
  averageAmount: number;
  frequency: 'mensal' | 'semanal';
  suggestedAction: string;
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
  recurrences: RecurrencePattern[];
  actionPlan: {
    today: string[];
    next7Days: string[];
    next30Days: string[];
    next90Days: string[];
  };
  insights: string[];
  recommendedBudgetMode?: string;
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
    const match = text.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?|\d+(?:\.\d{2})?)/i);
    if (match) {
      let value = match[1];
      if (value.includes(",")) {
        value = value.replace(/\./g, "").replace(",", ".");
      } else {
        const dotCount = (value.match(/\./g) || []).length;
        if (dotCount > 1) {
           value = value.replace(/\./g, "");
        } else if (dotCount === 1) {
           const parts = value.split(".");
           if (parts[1].length === 3) {
             value = value.replace(".", "");
           }
        }
      }
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

      // Determine confidence based on presence of amount
      const confidence = amt ? (day ? 'media' : 'baixa') : 'baixa';
      // Determine status based on wording
      const isPast = lower.includes('paguei') || lower.includes('recebi') || lower.includes('já foi');
      const isLate = lower.includes('atrasado') || lower.includes('venceu') || lower.includes('passou');
      const status = isPast ? 'realizado' : (isLate ? 'atrasado' : (amt && day ? 'planejado' : 'incerto'));

      if (lower.includes('recebi') || lower.includes('receber') || lower.includes('renda') || lower.includes('entrada') || lower.includes('salário') || lower.includes('bico')) {
        commitments.push({
          type: 'receita',
          category: 'Entrada Planejada',
          text: line.trim(),
          amount: amt,
          dateStr: day || 'Neste ciclo',
          source: 'nota_geral',
          confidence,
          status
        });
      } else if (lower.includes('paguei') || lower.includes('pagar') || lower.includes('despesa') || lower.includes('vence') || lower.includes('fatura') || lower.includes('luz') || lower.includes('água') || lower.includes('aluguel') || lower.includes('mercado')) {
        commitments.push({
          type: 'despesa',
          category: 'Compromisso Fixo',
          text: line.trim(),
          amount: amt,
          dateStr: day || 'Neste ciclo',
          source: 'nota_geral',
          confidence,
          status
        });
      } else if (lower.includes('dívida') || lower.includes('devo') || lower.includes('agiota') || lower.includes('empréstimo') || lower.includes('parcela')) {
        commitments.push({
          type: 'divida',
          category: 'Passivo Urgente',
          text: line.trim(),
          amount: amt,
          dateStr: day || 'Vencimento mensal',
          source: 'nota_geral',
          confidence,
          status: status === 'realizado' ? 'realizado' : (isLate ? 'atrasado' : 'pendente')
        });
      } else if (lower.includes('guardar') || lower.includes('reserva') || lower.includes('poupar') || lower.includes('meta')) {
        commitments.push({
          type: 'oportunidade',
          category: 'Acúmulo de Reserva',
          text: line.trim(),
          amount: amt,
          dateStr: 'Planejamento',
          source: 'nota_geral',
          confidence,
          status: status === 'realizado' ? 'realizado' : 'planejado'
        });
      } else {
        commitments.push({
          type: 'aviso',
          category: 'Anotação Relevante',
          text: line.trim(),
          source: 'nota_geral',
          confidence: 'baixa',
          status: 'incerto'
        });
      }
    });
  }

  // 2. Parse Transaction notes for extra metadata (e.g. installments, delays)
  transactions.forEach(t => {
    if (t.notes && t.notes.trim()) {
      const lowerNotes = t.notes.toLowerCase();
      
      if (lowerNotes.includes('atrasad') || lowerNotes.includes('atraso') || lowerNotes.includes('risco')) {
        commitments.push({
          type: 'divida',
          category: 'Compromisso Atrasado/Crítico',
          text: `[${t.description}] Alerta em anotação: ${t.notes}`,
          amount: t.amount,
          source: 'transacao',
          confidence: 'confirmado',
          status: 'atrasado'
        });
      } else if (lowerNotes.includes('parcela') || lowerNotes.includes('/') || lowerNotes.includes('vezes')) {
        commitments.push({
          type: 'despesa',
          category: 'Gasto Parcelado Recorrente',
          text: `[${t.description}] ${t.notes}`,
          amount: t.amount,
          source: 'transacao',
          confidence: 'confirmado',
          status: t.isPending ? 'pendente' : 'realizado'
        });
      } else if (lowerNotes.includes('recorrente') || lowerNotes.includes('todo mês') || lowerNotes.includes('mensal')) {
        commitments.push({
          type: 'despesa',
          category: 'Compromisso Fixo Recorrente',
          text: `[${t.description}] Despesa mensal: ${t.notes}`,
          amount: t.amount,
          source: 'transacao',
          confidence: 'confirmado',
          status: t.isPending ? 'pendente' : 'realizado'
        });
      }
    }
  });

  // 3. Deduplication: Remove "nota_geral" commitments that seem to match actual transactions
  const deduplicatedCommitments = commitments.filter(c => {
    if (c.source === 'nota_geral' && c.amount) {
      // Find a transaction with same type and exact amount
      const tType = c.type === 'receita' ? 'income' : 'expense';
      
      const cWords = c.text.toLowerCase().split(/\s+/);
      const meaningfulWords = cWords.filter(w => w.length > 2 && !['para', 'com', 'vou', 'paguei', 'recebi', 'fatura', 'pagar', 'dia', 'neste', 'mes'].includes(w) && isNaN(parseFloat(w)));

      const match = transactions.find(t => {
         if (t.type !== tType) return false;
         if (Math.abs(t.amount - (c.amount || 0)) > 5) return false; // Match within 5 BRL
         
         const tWords = t.description.toLowerCase().split(/\s+/);
         if (meaningfulWords.length === 0) return true; // Just match by amount if note has no meaningful words
         
         return meaningfulWords.some(w => tWords.some(tw => tw.includes(w) || w.includes(tw)));
      });

      if (match) {
        return false; // Skip this note, it's already a transaction
      }
    }
    return true;
  });

  return deduplicatedCommitments;
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
  // 0. Aggregate data across months (up to the current month)
  let allTxs: Transaction[] = [];
  let allNotes = '';
  Object.values(allData).forEach(mData => {
    if (mData.monthId <= currentMonthData.monthId) {
      if (mData.transactions) allTxs = allTxs.concat(mData.transactions);
      if (mData.devotionalNote) allNotes += mData.devotionalNote + '\n';
    }
  });

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
  let bancoBal = 0;
  let reservaBal = 0;
  
  const isReserva = (id?: string) => id === 'reserva' || accounts.find(a => a.id === id)?.type === 'reserva';

  allTxs.filter(t => !t.isPending).forEach(t => {
    const amt = t.amount;
    const act = t.account || 'banco';
    const toAct = t.toAccount;
    
    if (t.type === 'income') {
      if (isReserva(act)) reservaBal += amt; else bancoBal += amt;
    } else if (t.type === 'expense') {
      if (isReserva(act)) reservaBal -= amt; else bancoBal -= amt;
    } else if (t.type === 'transfer_to_savings') {
      if (isReserva(act)) reservaBal -= amt; else bancoBal -= amt;
      reservaBal += amt;
    } else if (t.type === 'transfer_from_savings') {
      reservaBal -= amt;
      bancoBal += amt;
    } else if (t.type === 'transfer_between_accounts') {
      if (isReserva(act)) reservaBal -= amt; else bancoBal -= amt;
      if (isReserva(toAct)) reservaBal += amt; else bancoBal += amt;
    }
  });

  const currentBalance = bancoBal;
  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0) + reservaBal;
  const totalAssets = Math.max(0, currentBalance) + totalSaved;

  // 3. Debt metrics
  const totalDebtAmount = debts.reduce((acc, d) => acc + d.totalAmount, 0);
  const totalDebtMonthly = debts.reduce((acc, d) => acc + d.monthlyPayment, 0);
  const hasLateDebts = debts.some(d => d.isLate);

  // 4. Necessity spending overhead
  const totalNecessities = txs.filter(t => t.type === 'expense' && t.bucket === 'Necessidades').reduce((acc, t) => acc + t.amount, 0);
  const necessitiesPercent = totalIncome > 0 ? (totalNecessities / totalIncome) * 100 : 0;

  // 5. Run Parse of Text Notes / Annotations
  // We parse current month's notes to adjust current month's balance
  const parsedCommitments = parseNotesAndAnnotations(devotionalNote, txs);
  
  // Also parse all historical notes to identify patterns and global commitments
  const globalCommitments = parseNotesAndAnnotations(allNotes, allTxs);

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

  // 6.1 Detect Recurrences
  const recurrences: RecurrencePattern[] = [];
  const categoryCounts: Record<string, { count: number, totalAmount: number, type: 'income' | 'expense' }> = {};
  
  allTxs.forEach(t => {
    if (!categoryCounts[t.category]) {
      categoryCounts[t.category] = { count: 0, totalAmount: 0, type: t.type === 'income' ? 'income' : 'expense' };
    }
    categoryCounts[t.category].count += 1;
    categoryCounts[t.category].totalAmount += t.amount;
  });

  const numMonths = Object.keys(allData).length || 1;
  Object.keys(categoryCounts).forEach(cat => {
    const data = categoryCounts[cat];
    // If it appears roughly once per month for at least 2 months
    if (data.count >= 2 && data.count >= numMonths * 0.8 && data.count <= numMonths * 1.5) {
      recurrences.push({
        category: cat,
        type: data.type,
        averageAmount: data.totalAmount / data.count,
        frequency: 'mensal',
        suggestedAction: data.type === 'expense' ? `Sugerimos automatizar ou fixar o limite mensal para ${cat}` : `Boa constância em ${cat}`
      });
    }
  });

  // Calculate 30D projected amounts for pressure score
  let projectedExpense30D = totalDebtMonthly;
  let projectedIncome30D = 0;
  
  // Add pending transactions
  txs.filter(t => t.isPending).forEach(t => {
    if (t.type === 'expense') projectedExpense30D += t.amount;
    if (t.type === 'income') projectedIncome30D += t.amount;
  });

  globalCommitments.forEach(c => {
    if ((c.status === 'pendente' || c.status === 'planejado' || c.status === 'atrasado') && c.amount) {
      // Only add from global commitments if they are nota_geral, as transactions are already covered
      if (c.source === 'nota_geral') {
         if (c.type === 'despesa' || c.type === 'divida') projectedExpense30D += c.amount;
         if (c.type === 'receita') projectedIncome30D += c.amount;
      }
    }
  });

  const availableCash30D = Math.max(0, currentBalance) + projectedIncome30D;
  const cashFlowPressure30D = availableCash30D > 0 ? (projectedExpense30D / availableCash30D) * 100 : (projectedExpense30D > 0 ? 150 : 0);

  // 7. Determine Financial Mode & Risk
  let mode: FinancialMode = 'Estabilização';
  let riskLevel: RiskLevel = 'Moderado';
  let mainProblem = '';

  const hasHighSurvivalRisk = hasLateDebts || (currentBalance < -100) || (runwayMonths < 0.2 && adjustedExpenses > 0 && totalDebtMonthly > adjustedIncome * 0.35) || cashFlowPressure30D > 120;

  if (adjustedIncome === 0 && adjustedExpenses > 0) {
    mode = 'Crise';
    riskLevel = 'Crítico';
    mainProblem = 'Você ainda não registrou dinheiro entrando este mês para cobrir as saídas. Verifique suas receitas.';
  } else if (hasHighSurvivalRisk) {
    mode = 'Crise';
    riskLevel = 'Crítico';
    mainProblem = hasLateDebts 
      ? 'Contas em atraso estão sufocando seu fluxo de caixa de curto prazo.' 
      : 'Sua pressão de caixa para os próximos 30 dias está muito alta. Risco de déficit iminente.';
  } else if (fixedOverheadIndex > 75 || runwayMonths < 1 || cashFlowPressure30D > 90) {
    mode = 'Sobrevivência';
    riskLevel = 'Alto';
    mainProblem = 'As obrigações engolem quase toda sua disponibilidade. A pressão de caixa exige atenção rápida.';
  } else if (runwayMonths < 3 || cashFlowPressure30D > 60) {
    mode = 'Estabilização';
    riskLevel = 'Moderado';
    mainProblem = 'Contas em dia, mas reserva de segurança ainda é frágil para suportar imprevistos severos.';
  } else if (totalDebtAmount === 0 && savingsRate > 20 && runwayMonths >= 3) {
    if (runwayMonths >= 6 && savingsRate > 35) {
      mode = 'Expansão';
      riskLevel = 'Mínimo';
      mainProblem = 'Saúde financeira excelente. Fluxo de caixa muito confortável para acelerar multiplicação patrimonial.';
    } else {
      mode = 'Construção';
      riskLevel = 'Baixo';
      mainProblem = 'Sobra consistente e risco baixo. Momento ideal para escalar metas de poupança e investimentos.';
    }
  }

  // Find biggest drain globally
  const desires = allTxs.filter(t => t.type === 'expense' && t.bucket === 'Desejos');
  const catTotals = desires.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const biggestDrain = sortedCats.length > 0 && sortedCats[0][1] > 0 ? sortedCats[0][0] : null;

  // Analyze spending categories globally to find trends
  const expenseCategories = allTxs.filter(t => t.type === 'expense').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const topExpenseCategories = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1]).slice(0, 3).map(c => c[0]);

  const incomeCategories = allTxs.filter(t => t.type === 'income').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const topIncomeCategories = Object.entries(incomeCategories).sort((a, b) => b[1] - a[1]).slice(0, 2).map(c => c[0]);

  // Find biggest debt
  const sortedDebts = [...debts].sort((a, b) => b.totalAmount - a.totalAmount);
  const biggestDebt = sortedDebts.length > 0 ? sortedDebts[0].name : null;

  // 8. Generate Multi-Month Projections (next 3 periods)
  const projections: FinancialProjection[] = [];
  const monthNames = ['Mês Atual', 'Mês que vem (Projeção)', 'Daqui a 2 Meses (Projeção)'];
  
  let recIncome = recurrences.filter(r => r.type === 'income').reduce((sum, r) => sum + r.averageAmount, 0);
  let recExpense = recurrences.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.averageAmount, 0);

  let pendingImpact = 0;
  allTxs.filter(t => t.isPending).forEach(t => {
    const amt = t.amount;
    const act = t.account || 'banco';
    const toAct = t.toAccount;
    
    if (t.type === 'income' && !isReserva(act)) {
      pendingImpact += amt;
    } else if (t.type === 'expense' && !isReserva(act)) {
      pendingImpact -= amt;
    } else if (t.type === 'transfer_to_savings' && !isReserva(act)) {
      pendingImpact -= amt;
    } else if (t.type === 'transfer_from_savings' && !isReserva(act)) {
      pendingImpact += amt;
    } else if (t.type === 'transfer_between_accounts') {
      if (!isReserva(act)) pendingImpact -= amt;
      if (toAct && !isReserva(toAct)) pendingImpact += amt;
    }
  });

  const projectedBalanceM0 = currentBalance + pendingImpact + additionalUnregisteredIncome - additionalUnregisteredExpenses;

  let tempBalance = projectedBalanceM0;
  for (let i = 0; i < 3; i++) {
    if (i === 0) {
      projections.push({
        period: monthNames[i],
        projectedIncome: adjustedIncome,
        projectedExpense: adjustedExpenses,
        projectedBalance: projectedBalanceM0
      });
    } else {
      let pIncome = recIncome > 0 ? recIncome : adjustedIncome;
      let pExpense = recExpense > 0 ? recExpense : adjustedExpenses;
      
      // Add debt payments if they are not already in recurring expenses
      if (recExpense === 0) {
         // If using adjustedExpenses, it already includes current month's expenses. Let's assume debts are already in there or will be paid.
         // But just to be safe and conservative, if totalDebtMonthly is large, ensure we account for it.
         pExpense = Math.max(pExpense, totalDebtMonthly);
      }
      
      tempBalance += (pIncome - pExpense);
      projections.push({
        period: monthNames[i],
        projectedIncome: pIncome,
        projectedExpense: pExpense,
        projectedBalance: tempBalance
      });
    }
  }

  // Strong points
  const strongPoints: string[] = [];
  if (adjustedIncome > adjustedExpenses && adjustedIncome > 0) strongPoints.push('Seu saldo mensal está positivo: entra mais dinheiro do que sai!');
  if (totalSaved > 0) strongPoints.push(`Você já guardou R$ ${totalSaved.toFixed(2)} como reserva ou meta de economia.`);
  if (dtiRatio < 20 && totalDebtMonthly > 0) strongPoints.push('O valor mensal pago em dívidas e parcelas está bem pequeno e sob controle.');
  if (debts.length === 0) strongPoints.push('Parabéns! Você não tem nenhuma dívida ativa cadastrada no sistema.');
  if (runwayMonths >= 3) strongPoints.push(`Excelente! Seus recursos cobrem pelo menos ${runwayMonths.toFixed(1)} meses de custos de vida.`);
  if (topIncomeCategories.length > 0) strongPoints.push(`Sua geração de receita está ancorada em: ${topIncomeCategories.join(', ')}.`);

  if (strongPoints.length === 0) {
    strongPoints.push('Você deu o primeiro passo inteligente: encarar seus números de frente para tomar o controle!');
  }

  // Attention points
  const attentionPoints: string[] = [];
  if (fixedOverheadIndex > 70) attentionPoints.push(`Suas contas fixas estão muito altas (${fixedOverheadIndex.toFixed(0)}% da renda). Tente abaixar esse peso.`);
  if (biggestDrain) attentionPoints.push(`Identificamos um padrão de gastos elevados em desejos na categoria: "${biggestDrain}".`);
  if (topExpenseCategories.length > 0) attentionPoints.push(`Suas maiores saídas gerais costumam ser em: ${topExpenseCategories.join(', ')}.`);
  if (totalDebtAmount > adjustedIncome * 2 && totalDebtAmount > 0) attentionPoints.push('Sua dívida total acumulada é maior que duas vezes sua renda mensal. Cuidado com o acúmulo.');
  if (runwayMonths < 1 && adjustedExpenses > 0) attentionPoints.push('Sua reserva dura menos de 1 mês. Qualquer imprevisto pode te deixar apertado.');

  // Check if any specific warning word exists in general note
  const noteLower = allNotes.toLowerCase();
  if (noteLower.includes('atrasado') || noteLower.includes('atrasar') || noteLower.includes('aluguel')) {
    attentionPoints.push('Anotações do histórico apontam preocupações com atrasos ou contas de moradia urgentes.');
  }
  if (noteLower.includes('agiota') || noteLower.includes('juro') || noteLower.includes('empréstimo')) {
    attentionPoints.push('Atenção a menções de juros altos de empréstimos e agiotas no seu diário financeiro.');
  }

  // 9. Structured Action Plan based ONLY on user's active APK data & annotations
  let recommendation = 'Seu foco agora deve ser manter seu fluxo de caixa anotado e saudável.';
  const actionPlan = { today: [], next7Days: [], next30Days: [], next90Days: [] };
  const insights: string[] = [];

  const activeDebts = debts.filter(d => d.totalAmount > 0);
  const activeGoals = goals.filter(g => g.targetAmount > g.currentAmount);
  const noteExpenses = globalCommitments.filter(c => c.source === 'nota_geral' && (c.type === 'despesa' || c.type === 'divida'));
  const noteIncomes = globalCommitments.filter(c => c.source === 'nota_geral' && c.type === 'receita');

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Trigger-based Recommendations
  if (hasLateDebts) {
    const totalLate = debts.filter(d => d.isLate).reduce((acc, d) => acc + d.totalAmount, 0);
    const suggestedAction = monthlySurplus > 0 ? `Sugestão: Destine 100% da sua sobra líquida (${formatBRL(monthlySurplus)}) para abater as parcelas em atraso.` : `Sugestão: Congele gastos com Desejos imediatamente para recuperar o caixa.`;
    recommendation = `Atrasos detectados. Priorize renegociação imediata para estancar os juros. ${suggestedAction}`;
    insights.push(`Você possui ${formatBRL(totalLate)} em dívidas atrasadas. Atrasos geram juros compostos que destroem o patrimônio rapidamente.`);
  } else if (cashFlowPressure30D > 90) {
    const weeklyCap = adjustedIncome > 0 ? (adjustedIncome * 0.1) / 4 : 100;
    recommendation = `Pressão de caixa perigosa (${cashFlowPressure30D.toFixed(0)}%). Crie um teto para gastos variáveis. Sugestão: Limite desejos e lazer a ${formatBRL(weeklyCap)} por semana.`;
    insights.push(`O dinheiro atual está quase todo comprometido. Evite qualquer nova parcela de cartão de crédito neste ciclo.`);
  } else if (totalDebtAmount > 0 && dtiRatio > 30) {
    const focusAmount = adjustedIncome * 0.2;
    recommendation = `Endividamento alto consumindo sua renda. Ataque a dívida com maior juros primeiro. Sugestão: Separe ${formatBRL(focusAmount)} (20% da renda) focado apenas em amortizações extras.`;
    insights.push(`Sua parcela total de dívidas compromete ${dtiRatio.toFixed(1)}% do orçamento. Reduzir esse índice é prioridade máxima.`);
  } else if (biggestDrain && fixedOverheadIndex < 70 && mode !== 'Expansão') {
    const drainWeeklyCap = adjustedIncome > 0 ? (adjustedIncome * 0.05) / 4 : 50;
    recommendation = `Gasto impulsivo detectado na categoria "${biggestDrain}". Sugestão: Adicione um teto de gasto semanal de ${formatBRL(drainWeeklyCap)} para esta categoria até normalizar.`;
    insights.push(`O excesso recente em "${biggestDrain}" está corroendo silenciosamente sua capacidade de poupança.`);
  } else if (savingsRate > 20 && runwayMonths > 3) {
    const autoSave = adjustedIncome * 0.2;
    recommendation = `Sobra consistente! Você acumulou ${formatBRL(monthlySurplus)} de excedente este mês. Sugestão: Automatize a transferência de ${formatBRL(autoSave / 4)} por semana para investimentos.`;
    insights.push(`Você já possui uma base sólida com ${runwayMonths.toFixed(1)} meses de sobrevida financeira. Faça o dinheiro trabalhar para você.`);
  } else {
    recommendation = `Manter estabilidade. Você está na fase de ${mode}. Sugestão: Para acelerar, tente otimizar os gastos correntes de "${topExpenseCategories[0] || 'Diversos'}".`;
  }

  // Today's actions
  if (hasLateDebts) {
    const lateDebtsList = debts.filter(d => d.isLate).map(d => d.name).join(', ');
    actionPlan.today.push(`Priorizar o contato imediato para regularizar as contas em atraso: ${lateDebtsList}.`);
  }
  
  if (biggestDrain) {
    const drainWeeklyCap = adjustedIncome > 0 ? (adjustedIncome * 0.05) / 4 : 50;
    actionPlan.today.push(`Colocar um limite rígido hoje na categoria "${biggestDrain}". Teto sugerido: ${formatBRL(drainWeeklyCap)} por semana.`);
  }

  noteExpenses.forEach(c => {
    if (c.amount && c.amount > 150 && c.status === 'pendente') {
      actionPlan.today.push(`Garantir a separação de ${formatBRL(c.amount)} para o compromisso futuro anotado: "${c.text}".`);
    }
  });

  if (actionPlan.today.length === 0) {
    actionPlan.today.push('Revisar os lançamentos do dia e conferir se todos os seus gastos diários estão registrados e deduplicados.');
  }

  // Next 7 days actions
  if (activeDebts.length > 0) {
    const firstDebt = activeDebts[0];
    actionPlan.next7Days.push(`Simular uma proposta de amortização ou quitação antecipada da dívida "${firstDebt.name}" (Saldo: ${formatBRL(firstDebt.totalAmount)}).`);
  }

  noteIncomes.forEach(c => {
    if (c.status === 'planejado' || c.status === 'pendente') {
      actionPlan.next7Days.push(`Acompanhar a entrada prevista anotada no seu diário: "${c.text}". (${c.confidence} confiança)`);
    }
  });

  if (activeGoals.length > 0) {
    const firstGoal = activeGoals[0];
    const missing = firstGoal.targetAmount - firstGoal.currentAmount;
    actionPlan.next7Days.push(`Transferir qualquer sobra desta semana para acelerar a meta "${firstGoal.title}" (Faltam ${formatBRL(missing)}).`);
  }

  if (actionPlan.next7Days.length === 0) {
    actionPlan.next7Days.push('Anotar qualquer mudança de cenário ou novo boleto para os próximos 7 dias.');
  }

  // Next 30 days actions
  if (activeDebts.length > 1) {
    actionPlan.next30Days.push(`Organizar as parcelas do próximo mês, mirando reduzir a dívida "${activeDebts[1].name}" em pelo menos 10%.`);
  } else if (activeDebts.length === 1) {
    const extraTarget = Math.max(50, adjustedIncome * 0.05);
    actionPlan.next30Days.push(`Tentar gerar ${formatBRL(extraTarget)} de renda extra ou economia para abater o saldo devedor de "${activeDebts[0].name}".`);
  }

  if (activeGoals.length > 1) {
    const secondGoal = activeGoals[1];
    const target = Math.max(20, (secondGoal.targetAmount - secondGoal.currentAmount) * 0.2);
    actionPlan.next30Days.push(`Destinar pelo menos ${formatBRL(target)} das sobras do mês para impulsionar a meta "${secondGoal.title}".`);
  }

  globalCommitments.filter(c => c.type === 'oportunidade').forEach(c => {
    actionPlan.next30Days.push(`Executar a oportunidade de acúmulo anotada no histórico: "${c.text}".`);
  });

  if (actionPlan.next30Days.length === 0) {
    actionPlan.next30Days.push('Avaliar o fechamento do seu mês para garantir que suas receitas superem o teto planejado.');
  }

  // Next 90 days actions
  if (activeGoals.length > 0) {
    const firstGoal = activeGoals[0];
    const missing = firstGoal.targetAmount - firstGoal.currentAmount;
    const monthlyTarget = missing / 3;
    actionPlan.next90Days.push(`Manter aportes de aprox. ${formatBRL(monthlyTarget)}/mês para concluir a meta "${firstGoal.title}" neste trimestre.`);
  }

  if (activeDebts.length > 0) {
    const totalD = activeDebts.reduce((sum, d) => sum + d.totalAmount, 0);
    const targetReduction = totalD * 0.3;
    actionPlan.next90Days.push(`Renegociar juros e buscar reduzir seu endividamento total em pelo menos 30% (aprox. ${formatBRL(targetReduction)}).`);
  }

  if (actionPlan.next90Days.length === 0) {
    actionPlan.next90Days.push('Manter o hábito de registrar tudo para consolidar seu histórico financeiro de 3 meses e destravar projeções mais precisas.');
  }

  let recommendedBudgetMode = '50-30-20';
  if (mode === 'Crise') recommendedBudgetMode = '90-5-5';
  else if (mode === 'Sobrevivência') {
    recommendedBudgetMode = activeDebts.length > 0 ? '70-0-30' : '80-10-10';
  } else if (mode === 'Estabilização') {
    recommendedBudgetMode = activeDebts.length > 0 ? '70-0-30' : '50-30-20';
  } else if (mode === 'Expansão' || mode === 'Construção') {
    recommendedBudgetMode = '50-20-30';
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
      monthlySurplus,
      cashFlowPressure30D
    },
    parsedCommitments: globalCommitments,
    projections,
    recurrences,
    actionPlan,
    insights,
    recommendedBudgetMode
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
