import React, { useMemo } from 'react';
import { format, parseISO, differenceInDays, endOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthlyData, BudgetMode, Account, Debt } from '../types';
import { formatCurrency, BUDGET_MODES_INFO } from '../lib/utils';
import { AlertTriangle, CheckCircle, Info, CalendarClock, Target, Compass, ShieldCheck } from 'lucide-react';

interface CashFlowAnalyzerProps {
  data: MonthlyData;
  currentBalance: number;
  budgetMode: BudgetMode;
  accounts: Account[];
}

export function CashFlowAnalyzer({ data, currentBalance, budgetMode, accounts }: CashFlowAnalyzerProps) {
  const analysis = useMemo(() => {
    const isReserva = (id?: string) => id === 'reserva' || accounts.find(a => a.id === id)?.type === 'reserva';
    
    // 1. Sort pending transactions by date AND prioritize income on the same day
    const pendingTransactions = data.transactions
      .filter(t => t.isPending)
      .sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        if (a.type === 'income' && b.type !== 'income') return -1;
        if (b.type === 'income' && a.type !== 'income') return 1;
        return 0;
      });
      
    let runningBalance = currentBalance;
    let minFutureBalance = currentBalance;
    let bottleneckDate: string | null = null;
    
    // 2. Track total metrics across all transactions (pending + completed)
    let totalIncome = data.transactions.filter(t => t.type === 'income' && !isReserva(t.account)).reduce((sum, t) => sum + t.amount, 0);
    let totalNeeds = data.transactions.filter(t => t.type === 'expense' && t.bucket === 'Necessidades' && !isReserva(t.account)).reduce((sum, t) => sum + t.amount, 0);
    let totalDesejos = data.transactions.filter(t => t.type === 'expense' && t.bucket === 'Desejos' && !isReserva(t.account)).reduce((sum, t) => sum + t.amount, 0);

    // Calculate future balances based on pending transactions
    for (const t of pendingTransactions) {
      const act = t.account || 'banco';
      const toAct = t.toAccount || 'banco';
      
      let amount = 0;
      if (t.type === 'income' && !isReserva(act)) amount = t.amount;
      else if (t.type === 'expense' && !isReserva(act)) amount = -t.amount;
      else if (t.type === 'transfer_to_savings' && !isReserva(act)) amount = -t.amount;
      else if (t.type === 'transfer_from_savings' && !isReserva(act)) amount = t.amount;
      else if (t.type === 'transfer_between_accounts') {
         if (!isReserva(act)) amount -= t.amount;
         if (!isReserva(toAct)) amount += t.amount;
      }
      
      runningBalance += amount;
      if (runningBalance < minFutureBalance) {
        minFutureBalance = runningBalance;
        bottleneckDate = t.date;
      }
    }
    
    const endOfMonthBalance = runningBalance;
    const safeToSpendToday = Math.max(0, minFutureBalance);
    const hasCashGap = minFutureBalance < 0;
    
    // Budget Mode Compatibility Check
    const modeInfo = BUDGET_MODES_INFO[budgetMode] || BUDGET_MODES_INFO['50-30-20'];
    let modeWarning = null;
    let recommendedMode = null;
    
    if (totalIncome > 0) {
      const needsPercentage = totalNeeds / totalIncome;
      if (needsPercentage > modeInfo.ratios['Necessidades']) {
        // Find a better mode
        if (needsPercentage <= 0.5) recommendedMode = '50-30-20';
        else if (needsPercentage <= 0.7) recommendedMode = '70-0-30';
        else if (needsPercentage <= 0.8) recommendedMode = '80-10-10';
        else recommendedMode = '90-5-5';
        
        modeWarning = `O modo ${modeInfo.name} não entra no orçamento de acordo com as despesas e receitas. Suas despesas básicas exigem ${(needsPercentage*100).toFixed(0)}% da renda. Utilize o modo ${BUDGET_MODES_INFO[recommendedMode as BudgetMode]?.name || 'adequado'} para que os pagamentos sejam efetuados de forma correta e Manter a estabilidade.`;
      }
    }
    
    if (hasCashGap && !modeWarning) {
       modeWarning = `O fluxo não entra no orçamento com as datas atuais. As saídas antes das entradas causarão um furo no dia ${bottleneckDate ? format(parseISO(bottleneckDate), 'dd/MM') : ''}. Revise os vencimentos para Manter a estabilidade.`;
    }

    // 3. Compute limits following the divisions (budget rules)
    const budgetBase = totalIncome > 0 ? totalIncome : Math.max(0, currentBalance);
    const limitDesejos = budgetBase * modeInfo.ratios['Desejos'];
    const remainingDesejos = Math.max(0, limitDesejos - totalDesejos);
    
    // Monthly discretionary limit is bounded by end of month leftover AND budget rules
    const monthlyAllowedToSpend = Math.max(0, Math.min(endOfMonthBalance, remainingDesejos));

    // Calculate days remaining
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
    
    // Daily limits are based on the monthly allowed to spend, not just today's safety
    // (If they have 0 safe today, they still want to know their daily pace for the month)
    const dailyLimit = monthlyAllowedToSpend / daysRemaining;
    const weeklyLimit = dailyLimit * 7;
    
    return {
      minFutureBalance,
      bottleneckDate,
      safeToSpendToday,
      endOfMonthBalance,
      hasCashGap,
      monthlyAllowedToSpend,
      dailyLimit,
      weeklyLimit,
      daysRemaining,
      modeWarning,
      modeName: modeInfo.name
    };
  }, [data, currentBalance, budgetMode, accounts]);

  return (
    <div className="glass-card p-5 border-indigo-500/20 bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/20 rounded-3xl shadow-sm mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Compass size={22} className="animate-spin-slow" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Análise de Caixa e Divisões</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Projeção com base no modo {analysis.modeName}</p>
        </div>
      </div>

      {analysis.modeWarning && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-2xl flex gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Atenção: </strong>
            {analysis.modeWarning}
          </div>
        </div>
      )}

      {analysis.hasCashGap ? (
        <div className="mb-5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 rounded-2xl flex gap-3">
          <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-rose-800 dark:text-rose-300">
            <strong>Furo de Caixa Detectado! </strong>
            Você não terá saldo suficiente para pagar as contas no dia <strong>{analysis.bottleneckDate ? format(parseISO(analysis.bottleneckDate), 'dd/MM') : ''}</strong>. 
            Faltarão <strong>{formatCurrency(Math.abs(analysis.minFutureBalance))}</strong>. Evite qualquer gasto agora!
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              Livre do Mês (Lazer/Desejos)
            </span>
            <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
              {formatCurrency(analysis.monthlyAllowedToSpend)}
            </div>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              O que pode ser gasto no mês todo respeitando a divisão <strong>{analysis.modeName}</strong>.
            </p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-500" />
              Seguro para Gastar HOJE
            </span>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {formatCurrency(analysis.safeToSpendToday)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              O máximo que pode sair <strong>hoje</strong> sem gerar saldo negativo antes de novas receitas.
            </p>
          </div>
        </div>
      )}

      {!analysis.hasCashGap && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <CalendarClock size={16} className="text-indigo-500" />
            Limites Pessoais (Modo: {analysis.modeName})
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Por Dia</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{formatCurrency(analysis.dailyLimit)}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Por Semana</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{formatCurrency(analysis.weeklyLimit)}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Restante</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{formatCurrency(analysis.monthlyAllowedToSpend)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
