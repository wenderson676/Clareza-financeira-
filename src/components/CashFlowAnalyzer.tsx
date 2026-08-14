import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays, endOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthlyData, BudgetMode, Account, Debt } from '../types';
import { formatCurrency, BUDGET_MODES_INFO } from '../lib/utils';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  CalendarClock, 
  Target, 
  Compass, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRight,
  Activity,
  PiggyBank,
  CreditCard,
  Calculator,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Scissors,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';

interface CashFlowAnalyzerProps {
  data: MonthlyData;
  allData: Record<string, MonthlyData>;
  currentBalance: number;
  budgetMode: BudgetMode;
  accounts: Account[];
  debts?: Debt[];
}

interface ExpenseCutSuggestion {
  category: string;
  currentAmount: number;
  suggestedCutAmount: number;
  newAmount: number;
  percentageCut: number;
  impactLevel: 'Alto' | 'Médio' | 'Baixo';
  reasoning: string;
}

interface ModeEligibility {
  modeKey: BudgetMode;
  name: string;
  needsRatio: number;
  wantsRatio: number;
  savingsRatio: number;
  isEligible: boolean;
  ineligibilityReason?: string;
  fitsNeeds: boolean;
}

interface Recommendation {
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  icon: React.ReactNode;
  action?: string;
  priority: 'Crítica' | 'Alta' | 'Média' | 'Normal';
  category: 'Caixa' | 'Reserva' | 'Dívidas' | 'Orçamento' | 'Ritmo' | 'Cortes';
}

export function CashFlowAnalyzer({ data, allData, currentBalance, budgetMode, accounts, debts = [] }: CashFlowAnalyzerProps) {
  const [simulatedPurchase, setSimulatedPurchase] = useState<string>('');
  const [showModeDetails, setShowModeDetails] = useState<boolean>(false);

  const isReserva = (accId?: string) => {
    if (!accId) return false;
    if (accId === 'reserva') return true;
    const found = accounts.find(a => a.id === accId);
    return found?.type === 'reserva';
  };

  // Quantia acumulada na reserva
  const reservaBalance = useMemo(() => {
    return accounts.filter(a => a.type === 'reserva' || a.id === 'reserva').reduce((sum, a) => sum + (a.initialBalance || 0), 0);
  }, [accounts]);

  const analysis = useMemo(() => {
    const modeInfo = BUDGET_MODES_INFO[budgetMode];
    const recommendations: Recommendation[] = [];

    // --- 1. METRICAS FINANCEIRAS DO MÊS ATUAL E GLOBAL ---
    const totalIncome = data.transactions.filter(t => t.type === 'income' && !isReserva(t.account)).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = data.transactions.filter(t => t.type === 'expense' && !isReserva(t.account)).reduce((sum, t) => sum + t.amount, 0);

    const needs = data.transactions.filter(t => t.type === 'expense' && t.bucket === 'Necessidades' && !isReserva(t.account)).reduce((sum, t) => sum + t.amount, 0);
    const wants = data.transactions.filter(t => t.type === 'expense' && t.bucket === 'Desejos' && !isReserva(t.account)).reduce((sum, t) => sum + t.amount, 0);
    const savings = data.transactions.filter(t => (t.type === 'expense' && t.bucket === 'Reserva/Dívidas' && !isReserva(t.account)) || (t.type === 'transfer_to_savings' && !isReserva(t.account))).reduce((sum, t) => sum + t.amount, 0);

    const activeDebtsValue = debts.reduce((sum, d) => sum + d.totalAmount, 0);

    // Base do orçamento para cálculo de proporções
    const budgetBase = totalIncome > 0 ? totalIncome : Math.max(1, currentBalance);

    const needsPercentage = budgetBase > 0 ? (needs / budgetBase) : 0;
    const wantsPercentage = budgetBase > 0 ? (wants / budgetBase) : 0;
    const savingsPercentage = budgetBase > 0 ? (savings / budgetBase) : 0;

    // --- 2. AVALIAÇÃO RIGOROSA DE ELEGIBILIDADE DE TODOS OS MODOS ---
    const allModesKeys: BudgetMode[] = ['50-30-20', '80-10-10', '90-5-5', '70-0-30', '50-20-30'];
    const modeEvaluations: ModeEligibility[] = allModesKeys.map(key => {
      const info = BUDGET_MODES_INFO[key];
      const maxNeedsRatio = info.ratios['Necessidades'];
      const maxWantsRatio = info.ratios['Desejos'];
      const maxSavingsRatio = info.ratios['Reserva/Dívidas'];

      // O modo DEVE cobrir as contas essenciais/fixas do usuário!
      const fitsNeeds = needsPercentage <= maxNeedsRatio + 0.02; // tolerância de 2%
      
      let isEligible = true;
      let reason = '';

      if (!fitsNeeds) {
        isEligible = false;
        reason = `Contas essenciais (${Math.round(needsPercentage * 100)}%) ultrapassam o limite de ${Math.round(maxNeedsRatio * 100)}% deste modo.`;
      } else if (key === '70-0-30' && wantsPercentage > 0.15) {
        isEligible = false;
        reason = `O modo 70/0/30 exige zerar gastos supérfluos, mas você tem ${Math.round(wantsPercentage * 100)}% comprometidos com lazer.`;
      } else if (needsPercentage + wantsPercentage > 0.98 && maxSavingsRatio > 0.10) {
        isEligible = false;
        reason = `Seus gastos totais não deixam margem para os ${Math.round(maxSavingsRatio * 100)}% de investimentos deste modo.`;
      }

      return {
        modeKey: key,
        name: info.name,
        needsRatio: maxNeedsRatio,
        wantsRatio: maxWantsRatio,
        savingsRatio: maxSavingsRatio,
        isEligible,
        ineligibilityReason: reason,
        fitsNeeds
      };
    });

    const eligibleModes = modeEvaluations.filter(m => m.isEligible);

    let recommendedMode: BudgetMode | null = null;
    let modeRecommendationReason = '';

    if (eligibleModes.length > 0) {
      // Priorizar melhor modo viável
      if (activeDebtsValue > 0 && eligibleModes.some(m => m.modeKey === '70-0-30')) {
        recommendedMode = '70-0-30';
        modeRecommendationReason = 'Você possui dívidas ativas e suas contas fixas cabem dentro de 70%. Recomendamos o modo Quitar Dívidas (70/0/30).';
      } else if (eligibleModes.some(m => m.modeKey === '50-30-20')) {
        recommendedMode = '50-30-20';
        modeRecommendationReason = 'Suas contas essenciais consomem menos de 50% da renda. O modo Padrão (50/30/20) é o mais equilibrado para você!';
      } else if (eligibleModes.some(m => m.modeKey === '50-20-30')) {
        recommendedMode = '50-20-30';
        modeRecommendationReason = 'Suas contas cabem em 50% e você pode acelerar a construção de patrimônio com o modo Prosperar (50/20/30).';
      } else if (eligibleModes.some(m => m.modeKey === '80-10-10')) {
        recommendedMode = '80-10-10';
        modeRecommendationReason = 'Seus custos essenciais exigem até 80% da renda. Os modos de 50% foram desqualificados por não cobrirem suas contas.';
      } else if (eligibleModes.some(m => m.modeKey === '90-5-5')) {
        recommendedMode = '90-5-5';
        modeRecommendationReason = 'Suas contas essenciais exigem quase toda a renda. O modo Crise (90/5/5) é o único plano que suporta sua realidade atual.';
      } else {
        recommendedMode = eligibleModes[0].modeKey;
        modeRecommendationReason = `O modo ${BUDGET_MODES_INFO[recommendedMode].name} é o mais adequado que cobre suas despesas atuais.`;
      }
    } else {
      // NENHUM modo padrão é viável sem cortes!
      recommendedMode = null;
      modeRecommendationReason = `Suas contas essenciais consomem ${Math.round(needsPercentage * 100)}% da sua renda total, ultrapassando até o limite do modo Crise (90/5/5). Nenhum modo padrão cobre seu orçamento atual sem uma reestruturação de gastos.`;
    }

    // --- 3. ANÁLISE INTELIGENTE DE CORTES DE GASTOS SUPÉRFLUOS ---
    const nonEssentialCategories = ['Lazer', 'Restaurantes', 'Compras', 'Assinaturas', 'Cuidados Pessoais', 'Presentes', 'Delivery', 'Entretenimento'];
    
    // Mapear gastos da categoria no mês atual
    const categoryExpensesMap: Record<string, number> = {};
    data.transactions.forEach(t => {
      if (t.type === 'expense' && !isReserva(t.account)) {
        if (t.bucket === 'Desejos' || nonEssentialCategories.includes(t.category)) {
          categoryExpensesMap[t.category] = (categoryExpensesMap[t.category] || 0) + t.amount;
        }
      }
    });

    const cutSuggestions: ExpenseCutSuggestion[] = [];
    let totalPotentialSavings = 0;

    Object.entries(categoryExpensesMap).forEach(([cat, amount]) => {
      if (amount <= 0) return;

      let cutPercentage = 0.40; // 40% de corte padrão
      let reasoning = 'Gasto flexível de estilo de vida que pode ser reduzido temporariamente.';
      let impact: 'Alto' | 'Médio' | 'Baixo' = 'Médio';

      if (cat.toLowerCase().includes('assinatura') || cat.toLowerCase().includes('streaming')) {
        cutPercentage = 0.60;
        reasoning = 'Cancele ou pause serviços de streaming e assinaturas pouco utilizadas.';
        impact = 'Baixo';
      } else if (cat.toLowerCase().includes('restaurante') || cat.toLowerCase().includes('delivery')) {
        cutPercentage = 0.50;
        reasoning = 'Substitua parte do delivery por refeições preparadas em casa.';
        impact = 'Baixo';
      } else if (cat.toLowerCase().includes('compras') || cat.toLowerCase().includes('presente')) {
        cutPercentage = 0.50;
        reasoning = 'Adie compras de roupas, eletrônicos e itens não essenciais.';
        impact = 'Médio';
      } else if (cat.toLowerCase().includes('lazer')) {
        cutPercentage = 0.40;
        reasoning = 'Opte por opções de lazer gratuitas ou de menor custo neste mês.';
        impact = 'Médio';
      }

      const cutAmount = Math.round(amount * cutPercentage);
      const newAmt = amount - cutAmount;
      totalPotentialSavings += cutAmount;

      cutSuggestions.push({
        category: cat,
        currentAmount: amount,
        suggestedCutAmount: cutAmount,
        newAmount: newAmt,
        percentageCut: Math.round(cutPercentage * 100),
        impactLevel: impact,
        reasoning
      });
    });

    cutSuggestions.sort((a, b) => b.suggestedCutAmount - a.suggestedCutAmount);

    // --- 4. FLUXO DE CAIXA FUTURO E RISCO DE SALDO NEGATIVO (60 DIAS) ---
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let runningBalance = currentBalance;
    let minBalance = currentBalance;
    let bottleneckDate: string | null = null;

    const futurePending: { date: string; type: string; amount: number }[] = [];
    
    Object.values(allData).forEach(month => {
      month.transactions.forEach(t => {
        if (t.isPending && t.date >= todayStr) {
          futurePending.push({ date: t.date, type: t.type, amount: t.amount });
        }
      });
    });

    futurePending.sort((a, b) => a.date.localeCompare(b.date));

    for (const t of futurePending) {
      if (t.type === 'income') {
        runningBalance += t.amount;
      } else if (t.type === 'expense') {
        runningBalance -= t.amount;
      }
      if (runningBalance < minBalance) {
        minBalance = runningBalance;
        if (minBalance < 0 && !bottleneckDate) {
          bottleneckDate = t.date;
        }
      }
    }

    const hasCashGap = minBalance < 0;
    const safeToSpendToday = Math.max(0, minBalance);

    // --- 5. MONTAGEM DE RECOMENDAÇÕES PERSONALIZADAS ---

    // A) Alerta de Incompatibilidade de Modo
    if (recommendedMode === null) {
      recommendations.push({
        title: 'Alerta Crítico: Incompatibilidade de Orçamento',
        message: modeRecommendationReason,
        type: 'danger',
        icon: <ShieldAlert size={18} />,
        action: `Aplique os cortes sugeridos abaixo para economizar até ${formatCurrency(totalPotentialSavings)} e adequar suas contas.`,
        priority: 'Crítica',
        category: 'Orçamento'
      });
    } else if (recommendedMode !== budgetMode) {
      recommendations.push({
        title: 'Recomendação de Modo Orçamentário',
        message: `${modeRecommendationReason} O modo atual (${BUDGET_MODES_INFO[budgetMode].name}) não é o mais seguro.`,
        type: 'warning',
        icon: <Sliders size={18} />,
        action: `Sugerimos alterar para o modo "${BUDGET_MODES_INFO[recommendedMode].name}".`,
        priority: 'Alta',
        category: 'Orçamento'
      });
    }

    // B) Furo de Caixa Previsto
    if (hasCashGap && bottleneckDate) {
      const gapAmount = Math.abs(minBalance);
      recommendations.push({
        title: 'Risco de Furo de Caixa Previsto',
        message: `Seu saldo ficará negativo em ${formatCurrency(-gapAmount)} por volta de ${format(parseISO(bottleneckDate), 'dd/MM')}. Faltam ${formatCurrency(gapAmount)} para cobrir compromissos futuros.`,
        type: 'danger',
        icon: <AlertTriangle size={18} />,
        action: 'Adie despesas flexíveis ou antecipe recebimentos.',
        priority: 'Crítica',
        category: 'Caixa'
      });
    }

    // C) Plano de Cortes de Gastos Supérfluos
    if (cutSuggestions.length > 0 && (hasCashGap || recommendedMode === null || needsPercentage > 0.60)) {
      recommendations.push({
        title: 'Plano de Redução de Gastos Supérfluos',
        message: `Identificamos ${cutSuggestions.length} categoria(s) de lazer/compras onde é possível economizar até ${formatCurrency(totalPotentialSavings)} por mês sem comprometer suas necessidades básicas.`,
        type: 'warning',
        icon: <Scissors size={18} />,
        action: 'Confira o detalhamento de cortes sugeridos logo abaixo.',
        priority: 'Alta',
        category: 'Cortes'
      });
    }

    // D) Dívidas Ativas
    if (activeDebtsValue > 0) {
      const debtRatio = totalIncome > 0 ? (activeDebtsValue / totalIncome) : 0;
      recommendations.push({
        title: 'Comprometimento com Dívidas',
        message: `Sua dívida acumulada de ${formatCurrency(activeDebtsValue)} representa ${Math.round(debtRatio * 100)}% da sua receita mensal.`,
        type: debtRatio > 0.3 ? 'danger' : 'warning',
        icon: <CreditCard size={18} />,
        action: 'Priorize a quitação da dívida com maior taxa de juros (Método Avalanche).',
        priority: debtRatio > 0.3 ? 'Crítica' : 'Alta',
        category: 'Dívidas'
      });
    }

    // E) Reserva de Emergência
    const monthlyNeedsCost = needs > 0 ? needs : (totalIncome * 0.5);
    const reserveCoverageMonths = monthlyNeedsCost > 0 ? (reservaBalance / monthlyNeedsCost) : 0;

    if (reservaBalance === 0) {
      recommendations.push({
        title: 'Reserva de Emergência Ausente',
        message: 'Você ainda não possui valor guardado na Reserva. Ter uma reserva evita cair em dívidas diante de imprevistos.',
        type: 'info',
        icon: <PiggyBank size={18} />,
        action: `Meta inicial: Guardar ${formatCurrency(monthlyNeedsCost)} (1 mês de custo fixo).`,
        priority: 'Normal',
        category: 'Reserva'
      });
    }

    // Sort recommendations by priority
    const priorityOrder = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Normal': 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // --- 6. HEALTH SCORE ---
    let score = 100;
    if (hasCashGap) score -= 35;
    if (recommendedMode === null) score -= 25;
    else if (recommendedMode !== budgetMode) score -= 10;
    if (activeDebtsValue > 0) score -= 15;
    if (reserveCoverageMonths < 1) score -= 15;

    score = Math.max(10, Math.min(100, score));

    let healthBadge = { label: 'Fortaleza Financeira', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200' };
    if (score < 45) {
      healthBadge = { label: 'Alerta Crítico', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 border-rose-200' };
    } else if (score < 70) {
      healthBadge = { label: 'Atenção Necessária', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-200' };
    } else if (score < 85) {
      healthBadge = { label: 'Financeiramente Estável', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200' };
    }

    // Limits & pace
    const activeModeInfo = BUDGET_MODES_INFO[recommendedMode || budgetMode];
    const limitDesejos = budgetBase * activeModeInfo.ratios['Desejos'];
    const remainingDesejos = Math.max(0, limitDesejos - wants);
    const projectedMonthBalance = currentBalance + 
      data.transactions.filter(t => t.type === 'income' && t.isPending).reduce((sum, t) => sum + t.amount, 0) -
      data.transactions.filter(t => t.type === 'expense' && t.isPending).reduce((sum, t) => sum + t.amount, 0);

    const monthlyAllowedToSpend = Math.max(0, Math.min(projectedMonthBalance, remainingDesejos));

    let daysRemaining = 1;
    try {
      const [year, month] = data.monthId.split('-');
      const viewDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const today = new Date();
      if (isSameMonth(viewDate, today)) {
        daysRemaining = Math.max(1, differenceInDays(endOfMonth(today), today) + 1);
      } else {
        daysRemaining = Math.max(1, differenceInDays(endOfMonth(viewDate), viewDate) + 1);
      }
    } catch (e) {
      daysRemaining = 30;
    }

    const dailyLimit = monthlyAllowedToSpend / daysRemaining;
    const weeklyLimit = dailyLimit * 7;

    return {
      score,
      healthBadge,
      needsPercentage,
      wantsPercentage,
      savingsPercentage,
      modeEvaluations,
      recommendedMode,
      modeRecommendationReason,
      cutSuggestions,
      totalPotentialSavings,
      minFutureBalance: minBalance,
      bottleneckDate,
      safeToSpendToday,
      projectedMonthBalance,
      hasCashGap,
      monthlyAllowedToSpend,
      dailyLimit,
      weeklyLimit,
      daysRemaining,
      reserveCoverageMonths,
      reservaBalance,
      recommendations
    };
  }, [data, allData, currentBalance, budgetMode, accounts, debts, reservaBalance]);

  // Simulador "Posso Comprar?"
  const simValue = parseFloat(simulatedPurchase.replace(',', '.')) || 0;
  const simResult = useMemo(() => {
    if (simValue <= 0) return null;
    const newMinBalance = analysis.minFutureBalance - simValue;
    if (newMinBalance < 0) {
      return {
        status: 'danger',
        title: 'Não Recomendado!',
        message: `Esta compra gerará um saldo negativo de ${formatCurrency(Math.abs(newMinBalance))} na sua conta futura.`
      };
    } else if (simValue > analysis.safeToSpendToday) {
      return {
        status: 'warning',
        title: 'Atenção: Compra Acima da Margem Diária',
        message: `Embora não deixe a conta negativa de imediato, esta compra consome toda a sua margem de folga do dia.`
      };
    } else {
      return {
        status: 'success',
        title: 'Compra Segura!',
        message: `Sua conta continuará com saldo positivo e margem de folga de ${formatCurrency(newMinBalance)}.`
      };
    }
  }, [simValue, analysis]);

  return (
    <div className="space-y-6">
      {/* 1. SAÚDE FINANCEIRA & PONTUAÇÃO */}
      <div className="p-6 border-indigo-500/20 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/40 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Activity size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Análise & Diagnóstico
                </h2>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${analysis.healthBadge.color}`}>
                  {analysis.healthBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Avaliando a viabilidade de pagamentos e adequação aos modos financeiros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm self-stretch sm:self-auto justify-between sm:justify-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pontuação</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{analysis.score}</span>
              <span className="text-xs text-slate-400 font-bold">/100</span>
            </div>
          </div>
        </div>

        {/* Progress Score Bar */}
        <div className="space-y-1 mb-6">
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                analysis.score >= 85 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                analysis.score >= 70 ? 'bg-gradient-to-r from-indigo-500 to-blue-400' :
                analysis.score >= 45 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                'bg-gradient-to-r from-rose-600 to-pink-500'
              }`}
              style={{ width: `${analysis.score}%` }}
            />
          </div>
        </div>

        {/* METRICAS DE CAIXA E LIMITES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500" />
              Seguro Para Gastar Hoje
            </span>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100 block">
              {formatCurrency(analysis.safeToSpendToday)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Margem sem comprometer pagamentos futuros
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <CalendarClock size={14} className="text-indigo-500" />
              Ritmo Lazer Sugerido/Dia
            </span>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 block">
              {formatCurrency(analysis.dailyLimit)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              {formatCurrency(analysis.weeklyLimit)} por semana
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <PiggyBank size={14} className="text-purple-500" />
              Autonomia da Reserva
            </span>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100 block">
              {analysis.reserveCoverageMonths.toFixed(1)} <span className="text-xs font-bold text-slate-500">meses</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block truncate">
              {formatCurrency(analysis.reservaBalance)} alocados
            </span>
          </div>
        </div>
      </div>

      {/* 2. DIAGNÓSTICO DE COMPATIBILIDADE DE MODOS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Análise de Viabilidade dos Modos Financeiros</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verificação de capacidade para honrar seus pagamentos</p>
            </div>
          </div>

          <button 
            onClick={() => setShowModeDetails(!showModeDetails)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showModeDetails ? 'Ocultar Modos' : 'Ver Todos os Modos'}</span>
            {showModeDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Resumo do Modo Indicado */}
        <div className={`p-4 rounded-2xl border ${
          analysis.recommendedMode === null 
            ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200'
            : 'bg-indigo-50/70 border-indigo-100 text-indigo-900 dark:bg-indigo-950/30 dark:border-indigo-800/50 dark:text-indigo-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {analysis.recommendedMode === null ? <ShieldAlert size={20} className="text-rose-600" /> : <Sparkles size={20} className="text-indigo-600" />}
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-0.5 opacity-80">
                {analysis.recommendedMode === null ? 'Sem Modo Padrão Viável' : 'Modo Recomendado'}
              </span>
              <h4 className="text-base font-black mb-1">
                {analysis.recommendedMode === null 
                  ? 'Orçamento Requer Reestruturação' 
                  : BUDGET_MODES_INFO[analysis.recommendedMode].name}
              </h4>
              <p className="text-xs leading-relaxed">
                {analysis.modeRecommendationReason}
              </p>
            </div>
          </div>
        </div>

        {/* Lista Detalhada de Elegibilidade de Todos os Modos */}
        {showModeDetails && (
          <div className="mt-4 space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
            <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Status de Aprovação de Cada Modo
            </h4>
            {analysis.modeEvaluations.map(m => (
              <div 
                key={m.modeKey}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                  m.isEligible 
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-800 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    m.isEligible ? 'bg-emerald-500 text-white' : 'bg-rose-500/20 text-rose-600'
                  }`}>
                    {m.isEligible ? <Check size={14} /> : <X size={14} />}
                  </div>
                  <div>
                    <span className="font-bold block">{m.name}</span>
                    <span className="text-[11px] opacity-80">
                      Limite Essenciais: {Math.round(m.needsRatio * 100)}% | Lazer: {Math.round(m.wantsRatio * 100)}%
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {m.isEligible ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-extrabold text-[10px]">
                      Aprovado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 font-extrabold text-[10px] block max-w-[150px] truncate" title={m.ineligibilityReason}>
                      Inviável
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. PLANO INTELIGENTE DE RECORTE DE GASTOS SUPÉRFLUOS */}
      {analysis.cutSuggestions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Scissors size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sugestões de Redução de Gastos Supérfluos</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Opções de economia em lazer e consumo não essenciais</p>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 rounded-xl text-right">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Economia Potencial</span>
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(analysis.totalPotentialSavings)}/mês</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {analysis.cutSuggestions.map(item => (
              <div key={item.category} className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {item.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-slate-400">{formatCurrency(item.currentAmount)}</span>
                    <ArrowRight size={12} className="text-slate-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{formatCurrency(item.newAmount)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <p className="italic">{item.reasoning}</p>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 shrink-0 ml-2">
                    Corte de -{item.percentageCut}% (-{formatCurrency(item.suggestedCutAmount)})
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500 shrink-0" />
            <p className="leading-relaxed">
              Ao aplicar essas reduções, você recupera <strong>{formatCurrency(analysis.totalPotentialSavings)}</strong> para quitar dívidas, equilibrar suas contas ou reforçar sua reserva!
            </p>
          </div>
        </div>
      )}

      {/* 4. SIMULADOR "POSSO COMPRAR?" */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Calculator size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Simulador "Posso Comprar?"</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Teste o impacto de uma compra no seu caixa antes de pagar</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
            <input 
              type="number"
              placeholder="Digite o valor do gasto extra (ex: 200)"
              value={simulatedPurchase}
              onChange={(e) => setSimulatedPurchase(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          {simulatedPurchase && (
            <button 
              onClick={() => setSimulatedPurchase('')}
              className="px-4 py-2.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>

        {simResult && (
          <div className={`mt-3 p-3.5 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed animate-fade-in ${
            simResult.status === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300' :
            simResult.status === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300' :
            'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
          }`}>
            <div className="shrink-0 mt-0.5">
              {simResult.status === 'danger' ? <ShieldAlert size={16} /> :
               simResult.status === 'warning' ? <AlertTriangle size={16} /> :
               <CheckCircle2 size={16} />}
            </div>
            <div>
              <strong className="font-bold block mb-0.5">{simResult.title}</strong>
              {simResult.message}
            </div>
          </div>
        )}
      </div>

      {/* 5. RECOMENDAÇÕES DA CONSULTORIA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Compass size={16} className="text-indigo-500" />
            Planos de Ação Recomendados
          </h3>
          <span className="text-xs text-slate-400 font-bold">
            {analysis.recommendations.length} diagnóstico(s)
          </span>
        </div>

        {analysis.recommendations.map((rec, index) => (
          <div 
            key={index}
            className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm flex gap-3.5 transition-all hover:shadow-md"
          >
            <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${
              rec.type === 'danger' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' :
              rec.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
              rec.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
              'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
            }`}>
              {rec.icon}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  {rec.title}
                </h4>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {rec.category}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                    rec.priority === 'Crítica' ? 'bg-rose-500 text-white' :
                    rec.priority === 'Alta' ? 'bg-amber-500 text-white' :
                    'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {rec.message}
              </p>

              {rec.action && (
                <div className="pt-1.5 flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 italic">
                  <ArrowRight size={12} className="shrink-0" />
                  <span>{rec.action}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
