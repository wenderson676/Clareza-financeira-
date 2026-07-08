import React, { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, Trash2, ArrowRightLeft, Clock, Pencil, Calendar, Search } from 'lucide-react';
import { MonthlyData, Transaction } from '../types';
import { formatCurrency, BUCKETS } from '../lib/utils';

interface TransactionsProps {
  data: MonthlyData;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onTogglePending: (id: string) => void;
}

export function Transactions({ data, onEdit, onDelete, onTogglePending }: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const groupedTransactions = useMemo(() => {
    let filteredTransactions = data.transactions;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filteredTransactions = filteredTransactions.filter(t => 
        t.description.toLowerCase().includes(lowerTerm) || 
        (t.category && t.category.toLowerCase().includes(lowerTerm)) ||
        (t.bucket && t.bucket.toLowerCase().includes(lowerTerm))
      );
    }

    const sorted = [...filteredTransactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const groups: { date: string; label: string; transactions: Transaction[] }[] = [];
    
    sorted.forEach(t => {
      const existing = groups.find(g => g.date === t.date);
      if (existing) {
        existing.transactions.push(t);
      } else {
        const d = new Date(t.date + 'T00:00:00');
        let label = format(d, "dd 'de' MMMM", { locale: ptBR });
        if (isToday(d)) label = 'Hoje, ' + label;
        else if (isYesterday(d)) label = 'Ontem, ' + label;
        
        groups.push({ date: t.date, label, transactions: [t] });
      }
    });
    
    return groups;
  }, [data.transactions, searchTerm]);

  return (
    <div className="pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Extrato</h2>
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar transações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      <div className="space-y-6">
        {groupedTransactions.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-500 dark:text-slate-400">
            Nenhum lançamento neste mês ainda.
          </div>
        ) : (
          groupedTransactions.map((group) => (
            <div key={group.date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-3 px-2">
                <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 capitalize">
                  {group.label}
                </h3>
              </div>
              
              <div className="glass-card overflow-hidden">
                <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {group.transactions.map(t => {
                    const isTransfer = t.type === 'transfer_to_savings' || t.type === 'transfer_from_savings' || t.type === 'transfer_between_accounts' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas');
                    const isIncome = t.type === 'income' || t.type === 'transfer_from_savings';
                    
                    return (
                      <li key={t.id} className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${t.isPending ? 'opacity-70' : ''}`}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <button 
                            onClick={() => onTogglePending(t.id)}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm ${
                              t.isPending 
                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30' 
                                : isTransfer
                                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-500/30'
                                  : isIncome 
                                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30' 
                                    : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/30'
                            }`}
                            title={t.isPending ? "Marcar como recebido/pago" : "Marcar como pendente"}
                          >
                            {t.isPending ? <Clock size={22} strokeWidth={2.5} /> : isTransfer ? <ArrowRightLeft size={22} strokeWidth={2.5} /> : isIncome ? <ArrowDownRight size={22} strokeWidth={2.5} /> : <ArrowUpRight size={22} strokeWidth={2.5} />}
                          </button>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-slate-800 dark:text-slate-100 text-base truncate">{t.description}</p>
                              {t.isPending && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  FUTURO
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md truncate">{t.category}</span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="px-2 py-1 bg-indigo-50/60 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-md text-[11px]">
                                {t.account === 'reserva' ? '💰 Reserva' : t.account === 'carteira' ? '💵 Carteira' : '🏦 Banco'}
                              </span>
                              {t.type === 'expense' && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700">•</span>
                                  <span className={`px-2 py-1 rounded-md ${BUCKETS[t.bucket]?.color || 'bg-slate-500'} bg-opacity-10 dark:bg-opacity-20 ${BUCKETS[t.bucket]?.text || 'text-slate-500'} dark:text-opacity-90`}>
                                    {t.bucket}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pl-16 sm:pl-0">
                          <span className={`text-lg font-bold tracking-tight ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                          </span>
                          
                          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-3">
                            <button 
                              onClick={() => onEdit(t)}
                              className="text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 transition-colors p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                            <button 
                              onClick={() => onDelete(t.id)}
                              className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
