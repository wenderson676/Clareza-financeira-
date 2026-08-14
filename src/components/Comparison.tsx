import React, { useState, useMemo } from 'react';
import { MonthlyData, Transaction, BudgetMode, Account, Debt } from '../types';
import { formatCurrency } from '../lib/utils';
import { subMonths, subWeeks, subDays, startOfMonth, startOfWeek, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info, Sparkles, Compass, BarChart2 } from 'lucide-react';
import { CashFlowAnalyzer } from './CashFlowAnalyzer';

interface ComparisonProps {
  data: MonthlyData;
  allData: Record<string, MonthlyData>;
  currentBalance: number;
  budgetMode: BudgetMode;
  accounts: Account[];
  debts?: Debt[];
  onSetBudgetMode?: (mode: BudgetMode) => void;
}

type Period = 'month' | 'week' | 'day';
type ActiveSection = 'all' | 'analysis' | 'comparison';

export function Comparison({ data, allData, currentBalance, budgetMode, accounts, debts = [] }: ComparisonProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('all');
  const [period, setPeriod] = useState<Period>('month');

  const allTransactions = useMemo(() => {
    return Object.values(allData).flatMap(m => m.transactions);
  }, [allData]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date;
    let periodLabel = '';
    let prevPeriodLabel = '';

    if (period === 'month') {
      currentStart = startOfMonth(today);
      currentEnd = today;
      prevStart = startOfMonth(subMonths(today, 1));
      prevEnd = subMonths(today, 1); // Same day last month
      periodLabel = 'Este Mês';
      prevPeriodLabel = 'Mês Passado';
    } else if (period === 'week') {
      currentStart = startOfWeek(today, { weekStartsOn: 0 });
      currentEnd = today;
      prevStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
      prevEnd = subWeeks(today, 1);
      periodLabel = 'Esta Semana';
      prevPeriodLabel = 'Semana Passada';
    } else {
      currentStart = today;
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = today;
      prevStart = subDays(today, 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd = subDays(today, 1);
      prevEnd.setHours(23, 59, 59, 999);
      periodLabel = 'Hoje';
      prevPeriodLabel = 'Ontem';
    }

    const isCurrentPeriod = (d: Date) => isWithinInterval(d, { start: currentStart, end: currentEnd });
    const isPrevPeriod = (d: Date) => isWithinInterval(d, { start: prevStart, end: prevEnd });

    let currentTotal = 0;
    let prevTotal = 0;

    const currentByCategory: Record<string, number> = {};
    const prevByCategory: Record<string, number> = {};

    allTransactions.forEach(t => {
      if (t.type === 'expense' && t.bucket !== 'Reserva/Dívidas' && !t.isPending) {
        const d = parseISO(t.date);
        if (period === 'day' ? isSameDay(d, currentStart) : isCurrentPeriod(d)) {
          currentTotal += t.amount;
          currentByCategory[t.category] = (currentByCategory[t.category] || 0) + t.amount;
        } else if (period === 'day' ? isSameDay(d, prevStart) : isPrevPeriod(d)) {
          prevTotal += t.amount;
          prevByCategory[t.category] = (prevByCategory[t.category] || 0) + t.amount;
        }
      }
    });

    const categories = Array.from(new Set([...Object.keys(currentByCategory), ...Object.keys(prevByCategory)]));
    
    const chartData = categories.map(cat => ({
      name: cat,
      [periodLabel]: currentByCategory[cat] || 0,
      [prevPeriodLabel]: prevByCategory[cat] || 0,
      diff: (currentByCategory[cat] || 0) - (prevByCategory[cat] || 0)
    })).sort((a: any, b: any) => b[periodLabel] - a[periodLabel] || b[prevPeriodLabel] - a[prevPeriodLabel]);

    const percentChange = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);

    let topIncreaseCat = '';
    let maxIncrease = 0;
    chartData.forEach(d => {
      if (d.diff > maxIncrease) {
        maxIncrease = d.diff;
        topIncreaseCat = d.name;
      }
    });

    return {
      currentTotal,
      prevTotal,
      percentChange,
      chartData,
      periodLabel,
      prevPeriodLabel,
      topIncreaseCat,
      maxIncrease
    };
  }, [allTransactions, period]);

  const generateSuggestion = () => {
    if (stats.prevTotal === 0 && stats.currentTotal === 0) {
      return { type: 'info', text: 'Não há gastos registrados para comparar nestes períodos.' };
    }
    
    if (stats.currentTotal > stats.prevTotal) {
      return { 
        type: 'warning', 
        text: `Seus gastos estão ${stats.percentChange.toFixed(1)}% maiores do que no mesmo período anterior. ` + 
              (stats.topIncreaseCat ? `Atenção especial à categoria "${stats.topIncreaseCat}", que teve um aumento significativo.` : 'Tente rever seus últimos gastos para identificar onde economizar.')
      };
    } else if (stats.currentTotal < stats.prevTotal) {
      return { 
        type: 'success', 
        text: `Parabéns! Você economizou ${Math.abs(stats.percentChange).toFixed(1)}% em relação ao período anterior. Continue assim!` 
      };
    } else {
      return { type: 'info', text: 'Seus gastos estão exatamente iguais ao período anterior.' };
    }
  };

  const suggestion = generateSuggestion();

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 block">
              Hub de Análise
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Análise Financeira & Diagnóstico
            </h1>
          </div>
        </div>
        <p className="text-xs text-indigo-200/80 leading-relaxed max-w-lg mb-4">
          Acompanhe sua consultoria preditiva, riscos de caixa, limites de consumo e comparativo de períodos num único lugar.
        </p>

        {/* Navigation Selector */}
        <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-indigo-500/20 gap-1">
          <button
            onClick={() => setActiveSection('all')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-indigo-200/70 hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>Visão Completa</span>
          </button>
          <button
            onClick={() => setActiveSection('analysis')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'analysis'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-indigo-200/70 hover:text-white'
            }`}
          >
            <Compass size={14} />
            <span>Consultoria IA</span>
          </button>
          <button
            onClick={() => setActiveSection('comparison')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'comparison'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-indigo-200/70 hover:text-white'
            }`}
          >
            <BarChart2 size={14} />
            <span>Comparativo</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Cash Flow & AI Financial Analyzer */}
      {(activeSection === 'all' || activeSection === 'analysis') && (
        <div className="animate-fade-in">
          <CashFlowAnalyzer 
            data={data} 
            allData={allData} 
            currentBalance={currentBalance} 
            budgetMode={budgetMode} 
            accounts={accounts} 
            debts={debts} 
          />
        </div>
      )}

      {/* SECTION 2: Period Comparison & Category Analytics */}
      {(activeSection === 'all' || activeSection === 'comparison') && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] animate-fade-in space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 size={20} className="text-emerald-500" />
                <span>Comparativo de Gastos por Período</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Avalie como seus gastos evoluíram em relação ao período anterior.
              </p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full sm:w-auto">
              <button
                onClick={() => setPeriod('day')}
                className={`flex-1 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  period === 'day' 
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Diário
              </button>
              <button
                onClick={() => setPeriod('week')}
                className={`flex-1 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  period === 'week' 
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`flex-1 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  period === 'month' 
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Mensal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{stats.periodLabel}</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(stats.currentTotal)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{stats.prevPeriodLabel}</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(stats.prevTotal)}</p>
                
                <div className={`flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-xl ${
                  stats.percentChange > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                  stats.percentChange < 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                  'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {stats.percentChange > 0 ? <TrendingUp size={14} /> : stats.percentChange < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                  {Math.abs(stats.percentChange).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-2xl flex gap-3 border ${
            suggestion.type === 'warning' ? 'bg-rose-50/80 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-800 dark:text-rose-300' :
            suggestion.type === 'success' ? 'bg-emerald-50/80 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300' :
            'bg-blue-50/80 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 text-blue-800 dark:text-blue-300'
          }`}>
            <div className="shrink-0 mt-0.5">
              {suggestion.type === 'warning' ? <AlertTriangle size={18} /> :
               suggestion.type === 'success' ? <CheckCircle size={18} /> :
               <Info size={18} />}
            </div>
            <p className="text-xs sm:text-sm font-medium leading-relaxed">{suggestion.text}</p>
          </div>

          {stats.chartData.length > 0 ? (
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
                Gráfico Comparativo por Categoria
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `R$${val}`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey={stats.periodLabel} fill="#10b981" radius={[6, 6, 0, 0]} name={stats.periodLabel} />
                    <Bar dataKey={stats.prevPeriodLabel} fill="#cbd5e1" radius={[6, 6, 0, 0]} name={stats.prevPeriodLabel} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detail Table / List */}
              <div className="mt-6 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Detalhamento por Categoria
                </h4>
                {stats.chartData.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex justify-between items-center p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-200">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400">{formatCurrency(item[stats.periodLabel])}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        item.diff > 0 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' 
                          : item.diff < 0 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {item.diff > 0 ? `+${formatCurrency(item.diff)}` : formatCurrency(item.diff)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
              Nenhuma despesa para exibir no gráfico neste período.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
