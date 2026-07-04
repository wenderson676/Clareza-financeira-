import React, { useState, useMemo } from 'react';
import { MonthlyData, Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { subMonths, subWeeks, subDays, startOfMonth, startOfWeek, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ComparisonProps {
  allData: Record<string, MonthlyData>;
}

type Period = 'month' | 'week' | 'day';

export function Comparison({ allData }: ComparisonProps) {
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
      if (t.type === 'expense' && t.bucket !== 'Reserva Financeira' && !t.isPending) {
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
    <div className="space-y-6 pb-24">
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Comparativo de Gastos</h2>
          
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setPeriod('day')}
              className={`flex-1 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all ${period === 'day' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Diário
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`flex-1 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all ${period === 'week' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Semanal
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`flex-1 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all ${period === 'month' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Mensal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stats.periodLabel}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(stats.currentTotal)}</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stats.prevPeriodLabel}</p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(stats.prevTotal)}</p>
              
              <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${
                stats.percentChange > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                stats.percentChange < 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {stats.percentChange > 0 ? <TrendingUp size={16} /> : stats.percentChange < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                {Math.abs(stats.percentChange).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl flex gap-3 mb-8 border ${
          suggestion.type === 'warning' ? 'bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-800 dark:text-rose-300' :
          suggestion.type === 'success' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300' :
          'bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 text-blue-800 dark:text-blue-300'
        }`}>
          <div className="shrink-0 mt-0.5">
            {suggestion.type === 'warning' ? <AlertTriangle size={18} /> :
             suggestion.type === 'success' ? <CheckCircle size={18} /> :
             <Info size={18} />}
          </div>
          <p className="text-sm leading-relaxed">{suggestion.text}</p>
        </div>

        {stats.chartData.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Comparativo por Categoria</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey={stats.periodLabel} fill="#10b981" radius={[4, 4, 0, 0]} name={stats.periodLabel} />
                  <Bar dataKey={stats.prevPeriodLabel} fill="#cbd5e1" radius={[4, 4, 0, 0]} name={stats.prevPeriodLabel} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
