import React, { useMemo } from 'react';
import { format, parseISO, differenceInDays, endOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthlyData, BudgetMode, Account, Debt } from '../types';
import { formatCurrency, BUDGET_MODES_INFO } from '../lib/utils';
import { AlertTriangle, CheckCircle, Info, CalendarClock, Target, Compass } from 'lucide-react';

interface CashFlowAnalyzerProps {
  data: MonthlyData;
  currentBalance: number;
  budgetMode: BudgetMode;
  accounts: Account[];
}

export function CashFlowAnalyzer({ data, currentBalance, budgetMode, accounts }: CashFlowAnalyzerProps) {
  const analysis = useMemo(() => {
    // 1. Gather all transactions
    const isReserva = (id?: string) => id === 'reserva' || accounts.find(a => a.id === id)?.type === 'reserva';
    
    // Sort pending transactions by date
    const pendingTransactions = data.transactions
      .filter(t => t.isPending)
      .sort((a, b) => a.date.localeCompare(b.date));
      
    let runningBalance = currentBalance;
    let minFutureBalance = currentBalance;
    let bottleneckDate: string | null = null;
    
    // Track limits for mode compatibility
    let totalIncome = data.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    // If no income, maybe we shouldn't divide by zero, but let's calculate total Needs
    let totalNeeds = data.transactions.filter(t => t.type === 'expense' && t.bucket === 'Necessidades').reduce((sum, t) => sum + t.amount, 0);
    let totalDebts = data.transactions.filter(t => t.type === 'expense' && t.bucket === 'Reserva/Dívidas').reduce((sum, t) => sum + t.amount, 0);

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
    
    const dailyLimit = Math.max(0, endOfMonthBalance) / daysRemaining;
    const weeklyLimit = dailyLimit * 7;
    
    // Budget Mode Compatibility Check
    const modeInfo = BUDGET_MODES_INFO[budgetMode];
    let modeWarning = null;
    let recommendedMode = null;
    
    if (totalIncome > 0) {
      const needsPercentage = totalNeeds / totalIncome;
      if (needsPercentage > modeInfo.ratios['Necessidades']) {
        const excess = (needsPercentage - modeInfo.ratios['Necessidades']) * 100;
        
        // Find a better mode
        if (needsPercentage <= 0.5) recommendedMode = '50-30-20';
        else if (needsPercentage <= 0.7) recommendedMode = '70-0-30';
        else if (needsPercentage <= 0.8) recommendedMode = '80-10-10';
        else recommendedMode = '90-5-5';
        
        modeWarning = `O modo ${modeInfo.name} não entra no orçamento de acordo com os recebíveis e despesas fixas atuais (que tomam ${(needsPercentage*100).toFixed(0)}% da renda). Utilize o modo ${BUDGET_MODES_INFO[recommendedMode as BudgetMode]?.name || 'adequado'} para que os pagamentos sejam efetuados de forma correta e manter a estabilidade.`;
      }
    }
    
    // Check if mode has cash gap issue specifically
    if (hasCashGap && !modeWarning) {
       modeWarning = `Atenção: O fluxo de caixa atual não entra no orçamento de acordo com as datas de recebíveis e despesas (furo no dia ${bottleneckDate ? format(parseISO(bottleneckDate), 'dd/MM') : ''}). Revise as datas de vencimento ou adicione saldo para que os pagamentos sejam efetuados de forma correta.`;
    }
    
    return {
      minFutureBalance,
      bottleneckDate,
      safeToSpendToday,
      endOfMonthBalance,
      hasCashGap,
      dailyLimit,
      weeklyLimit,
      daysRemaining,
      modeWarning
    };
  }, [data, currentBalance, budgetMode, accounts]);

  return (
    <div className="glass-card p-5 border-indigo-500/20 bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/20 rounded-3xl shadow-sm mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Compass size={22} className="animate-spin-slow" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Análise de Fluxo Futuro</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Organização com base nas datas de entrada e saída</p>
        </div>
      </div>

      {analysis.modeWarning && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-2xl flex gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Modo Incompatível: </strong>
            {analysis.modeWarning}
          </div>
        </div>
      )}

      {analysis.hasCashGap ? (
        <div className="mb-5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 rounded-2xl flex gap-3">
          <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-rose-800 dark:text-rose-300">
            <strong>Alerta de Furo de Caixa! </strong>
            Seu saldo atual mais suas receitas não cobrirão as contas no dia <strong>{analysis.bottleneckDate ? format(parseISO(analysis.bottleneckDate), 'dd/MM') : ''}</strong>. 
            Faltarão <strong>{formatCurrency(Math.abs(analysis.minFutureBalance))}</strong>. Você não deve gastar nada agora!
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              Seguro para gastar Hoje
            </span>
            <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
              {formatCurrency(analysis.safeToSpendToday)}
            </div>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              Gastar até esse valor não atrapalha o pagamento de nenhuma despesa futura.
            </p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Sobra Prevista no Fim do Mês
            </span>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {formatCurrency(analysis.endOfMonthBalance)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              O que vai sobrar se você pagar e receber tudo o que está agendado.
            </p>
          </div>
        </div>
      )}

      {analysis.endOfMonthBalance > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <CalendarClock size={16} className="text-indigo-500" />
            Limites Seguros (Rateio da Sobra)
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
              <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Este Mês</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{formatCurrency(analysis.endOfMonthBalance)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
