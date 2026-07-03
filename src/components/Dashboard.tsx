import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { HelpCircle, X } from 'lucide-react';
import { formatCurrency, BUCKETS, BUCKET_EXPLANATIONS, getRandomVerse } from '../lib/utils';
import { MonthlyData } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  data: MonthlyData;
  previousBalance: number;
}

export function Dashboard({ data, previousBalance }: DashboardProps) {
  const [verse, setVerse] = useState('');
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  useEffect(() => {
    setVerse(getRandomVerse());
  }, []);

  const totalIncome = data.transactions
    .filter(t => t.type === 'income' && !t.isPending)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = data.transactions
    .filter(t => t.type === 'expense' && !t.isPending)
    .reduce((sum, t) => sum + t.amount, 0);

  const netTransfersToSavings = data.transactions
    .filter(t => !t.isPending)
    .reduce((sum, t) => {
      if (t.type === 'transfer_to_savings') return sum + t.amount;
      if (t.type === 'transfer_from_savings') return sum - t.amount;
      return sum;
    }, 0);

  const currentBalance = previousBalance + totalIncome - totalExpenses - netTransfersToSavings;

  const projectedIncome = data.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const projectedExpenses = data.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const projectedNetTransfersToSavings = data.transactions
    .reduce((sum, t) => {
      if (t.type === 'transfer_to_savings') return sum + t.amount;
      if (t.type === 'transfer_from_savings') return sum - t.amount;
      return sum;
    }, 0);

  const projectedBalance = previousBalance + projectedIncome - projectedExpenses - projectedNetTransfersToSavings;

  const getBucketSpent = (bucket: string) => {
    return data.transactions
      .filter(t => t.type === 'expense' && t.bucket === bucket && !t.isPending)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const chartData = Object.entries(BUCKETS).map(([key, config]) => ({
    name: key,
    value: getBucketSpent(key) > 0 ? getBucketSpent(key) : 1, // Minimum for visual
    color: config.color.replace('bg-', '')
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1'];

  return (
    <div className="space-y-6 pb-24">
      <header className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/90 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100/80 dark:border-slate-800 transition-colors">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Saldo Real</h2>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-5xl font-black tracking-tight ${currentBalance >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(currentBalance)}
          </span>
        </div>
        
        <div className="mt-8 space-y-3">
          <div className="flex gap-4 text-sm">
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
              <div className="text-xs mb-1 opacity-80">Renda Adicionada</div>
              <div className="font-bold">{formatCurrency(totalIncome)}</div>
            </div>
            <div className="flex-1 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 p-3 rounded-xl border border-rose-100 dark:border-rose-500/20">
              <div className="text-xs mb-1 opacity-80">Gastos</div>
              <div className="font-bold">{formatCurrency(totalExpenses)}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 transition-colors">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Análise Mensal (Inclui Lançamentos Futuros)</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 text-center">
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Prev. Saldo</div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">{formatCurrency(projectedBalance)}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 text-center">
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Prev. Gastos</div>
            <div className="font-bold text-rose-600 dark:text-rose-400 text-sm sm:text-base">{formatCurrency(projectedExpenses)}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 text-center">
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Balanço Final</div>
            <div className={`font-bold text-sm sm:text-base ${projectedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {projectedBalance >= 0 ? '+' : ''}{formatCurrency(projectedBalance)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(BUCKETS).map(([name, config]) => {
          const allocated = totalIncome * config.percentage;
          
          let spent = 0;
          let remaining = 0;
          let percentSpent = 0;
          let spentLabel = 'Gasto';
          
          if (name === 'Poupança') {
            spent = netTransfersToSavings;
            remaining = allocated - spent;
            percentSpent = allocated > 0 ? (spent / allocated) * 100 : 0;
            spentLabel = 'Guardado';
          } else {
            spent = getBucketSpent(name);
            remaining = allocated - spent;
            percentSpent = allocated > 0 ? (spent / allocated) * 100 : 0;
          }
          
          return (
            <div key={name} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 transition-colors relative">
              <button 
                onClick={() => setActiveInfo(name)}
                className="absolute top-4 right-4 text-slate-300 hover:text-emerald-500 dark:text-slate-600 dark:hover:text-emerald-400 transition-colors"
                aria-label={`Informações sobre ${name}`}
              >
                <HelpCircle size={18} />
              </button>
              
              <div className="flex justify-between items-center mb-3 pr-8">
                <h3 className={`font-semibold ${config.text} dark:text-opacity-90 flex items-center gap-2`}>
                  <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                  {name}
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">({config.percentage * 100}%)</span>
                </h3>
              </div>
              
              <div className="mb-2">
                <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{formatCurrency(allocated)}</span>
              </div>
              
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full ${config.color} transition-all duration-500`}
                  style={{ width: `${Math.min(percentSpent, 100)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{spentLabel}: {formatCurrency(spent)}</span>
                <span className={`font-medium ${remaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  Resta: {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 text-slate-100 p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-900/20 dark:shadow-black/40 border border-slate-700/50">
        <div className="absolute -top-6 -right-6 p-4 opacity-5 transform rotate-12 scale-150">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Palavra do Dia</h3>
        <p className="font-serif italic text-lg leading-relaxed text-slate-200 dark:text-slate-300">{verse.split(' - ')[0]}</p>
      </div>

      <AnimatePresence>
        {activeInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setActiveInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${BUCKETS[activeInfo as keyof typeof BUCKETS].color} bg-opacity-20`}>
                      <div className={`w-4 h-4 rounded-full ${BUCKETS[activeInfo as keyof typeof BUCKETS].color}`}></div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{activeInfo}</h3>
                  </div>
                  <button onClick={() => setActiveInfo(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X size={24} />
                  </button>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                  {BUCKET_EXPLANATIONS[activeInfo as keyof typeof BUCKET_EXPLANATIONS]}
                </p>
                <button
                  onClick={() => setActiveInfo(null)}
                  className="w-full mt-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-xl py-3 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
