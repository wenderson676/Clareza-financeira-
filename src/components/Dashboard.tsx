import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { HelpCircle, X, Calendar, ArrowRight, Target, Plus, Trash, Edit2, CheckCircle2, Lightbulb } from 'lucide-react';
import { formatCurrency, getBucketsConfig, BUCKET_EXPLANATIONS, getRandomVerse } from '../lib/utils';
import { MonthlyData, Goal, BudgetMode } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  data: MonthlyData;
  previousBalance: number;
  allData: Record<string, MonthlyData>;
  goals?: Goal[];
  addGoal?: (goal: Omit<Goal, 'id'>) => void;
  updateGoal?: (id: string, goal: Partial<Goal>) => void;
  deleteGoal?: (id: string) => void;
  onSaveNote?: (note: string) => void;
  budgetMode?: BudgetMode;
}

export function Dashboard({ data, previousBalance, allData, goals = [], addGoal, updateGoal, deleteGoal, onSaveNote, budgetMode = '50-30-20' }: DashboardProps) {
  const [quote, setQuote] = useState('');
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({ title: '', targetAmount: '', currentAmount: '' });
  
  const [note, setNote] = useState(data.devotionalNote || '');
  const [isEditingNote, setIsEditingNote] = useState(false);

  const modeBuckets = useMemo(() => getBucketsConfig(budgetMode), [budgetMode]);

  useEffect(() => {
    setQuote(getRandomVerse());
  }, []);

  useEffect(() => {
    setNote(data.devotionalNote || '');
  }, [data.devotionalNote]);

  const totalIncome = data.transactions
    .filter(t => t.type === 'income' && !t.isPending)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = data.transactions
    .filter(t => t.type === 'expense' && t.bucket !== 'Reserva/Dívidas' && !t.isPending)
    .reduce((sum, t) => sum + t.amount, 0);

  const netTransfersToSavings = data.transactions
    .filter(t => !t.isPending)
    .reduce((sum, t) => {
      if (t.type === 'transfer_to_savings' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas')) return sum + t.amount;
      if (t.type === 'transfer_from_savings') return sum - t.amount;
      return sum;
    }, 0);

  const currentBalance = previousBalance + totalIncome - totalExpenses - netTransfersToSavings;

  const projectedIncome = data.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const projectedExpenses = data.transactions
    .filter(t => t.type === 'expense' && t.bucket !== 'Reserva/Dívidas')
    .reduce((sum, t) => sum + t.amount, 0);

  const projectedNetTransfersToSavings = data.transactions
    .reduce((sum, t) => {
      if (t.type === 'transfer_to_savings' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas')) return sum + t.amount;
      if (t.type === 'transfer_from_savings') return sum - t.amount;
      return sum;
    }, 0);

  const projectedBalance = previousBalance + projectedIncome - projectedExpenses - projectedNetTransfersToSavings;

  const getBucketSpent = (bucket: string) => {
    return data.transactions
      .filter(t => t.type === 'expense' && t.bucket === bucket && !t.isPending)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const chartData = Object.entries(modeBuckets).map(([key, conf]) => {
    const config = conf as { percentage: number; color: string; text: string };
    return {
      name: key,
      value: getBucketSpent(key) > 0 ? getBucketSpent(key) : 1, // Minimum for visual
      color: config.color.replace('bg-', '')
    };
  });

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1'];

  const pendingBills = useMemo(() => {
    return data.transactions
      .filter(t => t.type === 'expense' && t.isPending)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data.transactions]);

  const historyData = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(data.monthId + '-01T00:00:00'), i);
      const mId = format(d, 'yyyy-MM');
      const mData = allData[mId];
      
      let inc = 0;
      let exp = 0;
      
      if (mData) {
        inc = mData.transactions.filter(t => t.type === 'income' && !t.isPending).reduce((sum, t) => sum + t.amount, 0);
        exp = mData.transactions.filter(t => t.type === 'expense' && t.bucket !== 'Reserva/Dívidas' && !t.isPending).reduce((sum, t) => sum + t.amount, 0);
      }
      
      result.push({
        name: format(d, 'MMM', { locale: ptBR }).toUpperCase(),
        Receitas: inc,
        Despesas: exp
      });
    }
    return result;
  }, [allData, data.monthId]);

  return (
    <div className="space-y-6 pb-24">
      <header className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/90 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100/80 dark:border-slate-800 transition-colors text-center">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Saldo Total</h2>
        <div className="flex justify-center items-center gap-3 mt-1 mb-6">
          <span className={`text-5xl font-black tracking-tight ${currentBalance >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(currentBalance)}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-left">
              <div className="text-xs mb-1 opacity-80">Entrada</div>
              <div className="font-bold">{formatCurrency(totalIncome)}</div>
            </div>
            <div className="flex-1 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 p-3 rounded-xl border border-rose-100 dark:border-rose-500/20 text-left">
              <div className="text-xs mb-1 opacity-80">Saída</div>
              <div className="font-bold">{formatCurrency(totalExpenses)}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="glass-card p-6">
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

      {pendingBills.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar size={18} className="text-rose-500" />
              Contas a Pagar ({pendingBills.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendingBills.slice(0, 3).map(bill => (
              <div key={bill.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{bill.description}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Vence dia {format(new Date(bill.date + 'T00:00:00'), 'dd/MM')}</span>
                </div>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                  {formatCurrency(bill.amount)}
                </span>
              </div>
            ))}
            {pendingBills.length > 3 && (
              <div className="text-center pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">E mais {pendingBills.length - 3} {pendingBills.length - 3 === 1 ? 'conta' : 'contas'}...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Distribuição de Gastos</h2>
        
        {(() => {
          const CHART_COLORS: Record<string, string> = {
            'Necessidades': '#3b82f6', // blue-500
            'Desejos': '#f59e0b', // amber-500
            'Reserva/Dívidas': '#10b981' // emerald-500
          };
          
          const pieData = Object.keys(modeBuckets).map((name) => {
            let spent = 0;
            if (name === 'Reserva/Dívidas') {
              spent = netTransfersToSavings;
            } else {
              spent = getBucketSpent(name);
            }
            return {
              name,
              value: spent > 0 ? spent : 0,
              fill: CHART_COLORS[name] || '#ccc'
            };
          }).filter(item => item.value > 0);

          if (pieData.length === 0) {
            return (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Nenhum dado para exibir ainda.
              </div>
            );
          }

          return (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(modeBuckets).map(([name, conf]) => {
          const config = conf as { percentage: number; color: string; text: string };
          const allocated = totalIncome * config.percentage;
          
          let spent = 0;
          let remaining = 0;
          let percentSpent = 0;
          let spentLabel = 'Gasto';
          
          if (name === 'Reserva/Dívidas') {
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
            <div key={name} className="glass-card p-6 relative">
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

      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target size={18} className="text-indigo-500" />
            Resumo do Cofrinho (Metas e Sonhos)
          </h2>
          <button 
            onClick={() => {
              setGoalForm({ title: '', targetAmount: '', currentAmount: '' });
              setEditingGoal(null);
              setShowGoalForm(true);
            }}
            className="text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
          >
            <Plus size={14} /> Nova Meta
          </button>
        </div>
        
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
          <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mb-1 font-medium">Total Guardado (Cofrinho Geral)</p>
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            {formatCurrency(
              Object.values(allData).reduce((sum, month) => {
                return sum + month.transactions.reduce((mSum, t) => {
                  if (t.isPending) return mSum;
                  if (t.type === 'transfer_to_savings' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas')) return mSum + t.amount;
                  if (t.type === 'transfer_from_savings') return mSum - t.amount;
                  return mSum;
                }, 0);
              }, 0)
            )}
          </p>
        </div>

        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhuma meta criada ainda. O que você deseja conquistar?</p>
            </div>
          ) : (
            goals.map(goal => {
              const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              return (
                <div key={goal.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">{goal.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setGoalForm({ 
                            title: goal.title, 
                            targetAmount: goal.targetAmount.toString(), 
                            currentAmount: goal.currentAmount.toString() 
                          });
                          setEditingGoal(goal);
                          setShowGoalForm(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteGoal?.(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-3">
                    <div 
                      className={`h-full transition-all duration-500 ${percent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Evolução (Últimos 6 meses)</h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `R$${val/1000}k`} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'var(--tw-colors-white, #fff)' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reflexão Financeira Card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Lightbulb size={22} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Reflexão do Mês</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Avaliação do seu progresso financeiro</p>
          </div>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl p-4 mb-4 border border-emerald-100/30 dark:border-emerald-500/10">
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed italic">
            "Como você avalia suas escolhas financeiras este mês? Onde você poderia ter administrado melhor os seus recursos?"
          </p>
        </div>

        {isEditingNote ? (
          <div className="space-y-3">
            <textarea
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-3 text-sm text-slate-700 dark:text-slate-200 outline-none h-28 transition-all resize-none"
              placeholder="Escreva aqui as lições aprendidas, conquistas ou pontos de melhoria neste mês..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setNote(data.devotionalNote || '');
                  setIsEditingNote(false);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onSaveNote) {
                    onSaveNote(note);
                  }
                  setIsEditingNote(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-4 min-h-[70px] cursor-pointer border border-transparent hover:border-emerald-100 dark:hover:border-emerald-500/10 transition-all flex flex-col justify-center"
            onClick={() => setIsEditingNote(true)}
          >
            {note ? (
              <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{note}</p>
            ) : (
              <div className="text-center py-2">
                <span className="text-xs text-slate-400 dark:text-slate-500 italic block">Nenhuma reflexão salva ainda. Clique aqui para escrever suas anotações...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 text-slate-100 p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-900/20 dark:shadow-black/40 border border-slate-700/50">
        <div className="absolute -top-6 -right-6 p-4 opacity-5 transform rotate-12 scale-150">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Sabedoria Financeira</h3>
        <p className="font-serif italic text-lg leading-relaxed text-slate-200 dark:text-slate-300">{quote}</p>
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
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${modeBuckets[activeInfo as keyof typeof modeBuckets]?.color || ''} bg-opacity-20`}>
                      <div className={`w-4 h-4 rounded-full ${modeBuckets[activeInfo as keyof typeof modeBuckets]?.color || ''}`}></div>
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

        {showGoalForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4"
            onClick={() => setShowGoalForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Target className="text-indigo-500" size={24} />
                  {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                </h3>
                <button onClick={() => setShowGoalForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">O que você quer conquistar?</label>
                    <input 
                      type="text" 
                      value={goalForm.title}
                      onChange={e => setGoalForm({...goalForm, title: e.target.value})}
                      placeholder="Ex: Reserva de Emergência, Viagem..."
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qual o valor total necessário?</label>
                    <input 
                      type="number" 
                      value={goalForm.targetAmount}
                      onChange={e => setGoalForm({...goalForm, targetAmount: e.target.value})}
                      placeholder="R$ 0,00"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quanto você já tem guardado?</label>
                    <input 
                      type="number" 
                      value={goalForm.currentAmount}
                      onChange={e => setGoalForm({...goalForm, currentAmount: e.target.value})}
                      placeholder="R$ 0,00"
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    if (goalForm.title && goalForm.targetAmount) {
                      if (editingGoal && updateGoal) {
                        updateGoal(editingGoal.id, {
                          title: goalForm.title,
                          targetAmount: Number(goalForm.targetAmount),
                          currentAmount: Number(goalForm.currentAmount || 0)
                        });
                      } else if (addGoal) {
                        addGoal({
                          title: goalForm.title,
                          targetAmount: Number(goalForm.targetAmount),
                          currentAmount: Number(goalForm.currentAmount || 0)
                        });
                      }
                      setShowGoalForm(false);
                    }
                  }}
                  disabled={!goalForm.title || !goalForm.targetAmount}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl py-4 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={20} />
                  {editingGoal ? 'Salvar Alterações' : 'Criar Meta'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
