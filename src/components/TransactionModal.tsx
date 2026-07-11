import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Transaction, TransactionType, Bucket, AccountType, Account } from '../types';
import { formatCurrency, CATEGORIES, BUCKETS } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (t: Omit<Transaction, 'id'>) => void;
  editingTransaction?: Transaction | null;
  initialTab?: 'expense' | 'income' | 'transfer';
  accountBalances?: Record<string, number>;
  accounts?: Account[];
  customCategories?: {
    expense?: string[];
    income?: string[];
    transfer?: string[];
  };
  addCustomCategory?: (type: 'expense' | 'income' | 'transfer', category: string) => void;
}

export function TransactionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingTransaction, 
  initialTab, 
  accountBalances, 
  accounts,
  customCategories,
  addCustomCategory
}: TransactionModalProps) {
  const [formTab, setFormTab] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [transferFrom, setTransferFrom] = useState<AccountType>('banco');
  const [transferTo, setTransferTo] = useState<AccountType>('reserva');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bucket, setBucket] = useState<Bucket>('Necessidades');
  const [category, setCategory] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [account, setAccount] = useState<AccountType>('banco');
  const [error, setError] = useState('');

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const getAvailableCategories = () => {
    if (formTab === 'income') {
      const defaultCats = CATEGORIES['Renda'] || [];
      const customCats = customCategories?.income || [];
      return [...defaultCats, ...customCats];
    } else if (formTab === 'transfer') {
      const defaultCats = [
        'Aporte Cofrinho',
        'Resgate de Reserva',
        'Transferência de Saldos',
        'Investimentos',
        'Ajuste de Conta'
      ];
      const customCats = customCategories?.transfer || [];
      return [...defaultCats, ...customCats];
    } else {
      const defaultCats = CATEGORIES[bucket] || [];
      const customCats = customCategories?.expense || [];
      return [...defaultCats, ...customCats];
    }
  };

  const availableCategories = getAvailableCategories();

  const handleCreateCustomCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    
    const type = formTab === 'expense' ? 'expense' : formTab === 'income' ? 'income' : 'transfer';
    if (addCustomCategory) {
      addCustomCategory(type, trimmed);
    }
    setCategory(trimmed);
    setNewCatName('');
    setIsAddingCustom(false);
  };

  // Auto-select first category if empty or not in the list (unless editing)
  useEffect(() => {
    if (isOpen && !editingTransaction) {
      const cats = getAvailableCategories();
      if (cats.length > 0 && (!category || !cats.includes(category))) {
        setCategory(cats[0]);
      }
    }
  }, [formTab, bucket, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setAmount(editingTransaction.amount.toString().replace('.', ','));
        setDescription(editingTransaction.description);
        setDate(editingTransaction.date);
        setIsPending(editingTransaction.isPending);
        setAccount(editingTransaction.account || 'banco');
        
        if (editingTransaction.type === 'income') {
          setFormTab('income');
          setCategory(editingTransaction.category);
          setBucket('Renda');
        } else if (editingTransaction.type === 'transfer_to_savings' || editingTransaction.type === 'transfer_from_savings' || editingTransaction.type === 'transfer_between_accounts') {
          setFormTab('transfer');
          if (editingTransaction.type === 'transfer_to_savings') {
            setTransferFrom('banco');
            setTransferTo('reserva');
          } else if (editingTransaction.type === 'transfer_from_savings') {
            setTransferFrom('reserva');
            setTransferTo('banco');
          } else {
            setTransferFrom(editingTransaction.account || 'banco');
            setTransferTo(editingTransaction.toAccount || 'carteira');
          }
        } else {
          setFormTab(initialTab || 'expense');
          setBucket(editingTransaction.bucket);
          setCategory(editingTransaction.category);
        }
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingTransaction, initialTab, accounts]);

  // Effect to auto-check "isPending" if date is in the future
  useEffect(() => {
    // Only auto-update if not editing an existing transaction to avoid overriding user's saved state
    if (!editingTransaction) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(date + 'T00:00:00'); // avoid timezone offset issues
      if (selectedDate > today) {
        setIsPending(true);
      } else {
        setIsPending(false);
      }
    }
  }, [date, editingTransaction]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategory("");
    setBucket(initialTab === "income" ? "Renda" : "Necessidades");
    setFormTab(initialTab || "expense");
    setIsPending(false);
    
    const mainAcc = accounts?.find(a => a.isMain)?.id || "banco";
    const savingsAcc = accounts?.find(a => a.type === 'reserva')?.id || "reserva";
    
    setTransferFrom(mainAcc);
    setTransferTo(savingsAcc);
    setDate(format(new Date(), "yyyy-MM-dd"));
    setAccount(mainAcc);
    setError("");
  };


  const getAccountLabel = (accountId?: string) => {
    const found = accounts?.find(a => a.id === accountId);
    if (found) {
      return `${found.icon} ${found.name}`;
    }
    if (accountId === 'reserva') return 'Reserva';
    if (accountId === 'carteira') return 'Carteira';
    return 'Banco';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveTransaction(true);
  };

  const handleSaveTransaction = (shouldClose: boolean) => {
    setError('');
    const parsedAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    
    if (!parsedAmount || isNaN(parsedAmount)) {
      setError('Por favor, insira um valor válido.');
      return;
    }

    if (formTab !== 'transfer' && !category) {
      setError('Por favor, selecione uma categoria.');
      return;
    }

    if (formTab === 'transfer' && accountBalances) {
      if (transferFrom === transferTo) {
        setError('A conta de origem e destino não podem ser as mesmas.');
        return;
      }
      
      const availableBalance = accountBalances[transferFrom] || 0;
      
      let amountDifference = parsedAmount;
      if (editingTransaction && editingTransaction.type.startsWith('transfer_')) {
        let originalFrom: AccountType = 'banco';
        if (editingTransaction.type === 'transfer_to_savings') {
          originalFrom = 'banco';
        } else if (editingTransaction.type === 'transfer_from_savings') {
          originalFrom = 'reserva';
        } else if (editingTransaction.type === 'transfer_between_accounts') {
          originalFrom = editingTransaction.account || 'banco';
        }

        if (originalFrom === transferFrom) {
          amountDifference = parsedAmount - editingTransaction.amount;
        }
      }

      if (amountDifference > 0 && amountDifference > availableBalance) {
        setError(`Saldo insuficiente na conta de origem (${getAccountLabel(transferFrom)}). Saldo disponível: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(availableBalance)}`);
        return;
      }
    }

    let finalType: TransactionType = 'expense';
    let finalBucket: Bucket = bucket;
    let finalCategory = category;
    let finalAccount = account;
    let finalToAccount: AccountType | undefined;

    const finalDescription = description.trim() || finalCategory || 'Sem descrição';

    if (formTab === 'income') {
      finalType = 'income';
      finalBucket = 'Renda';
    } else if (formTab === 'transfer') {
      if (transferFrom === 'banco' && transferTo === 'reserva') {
        finalType = 'transfer_to_savings';
        finalCategory = category || 'Transferência para Reserva/Dívidas';
        finalAccount = 'banco';
        finalToAccount = undefined;
      } else if (transferFrom === 'reserva' && transferTo === 'banco') {
        finalType = 'transfer_from_savings';
        finalCategory = category || 'Resgate de Reserva/Dívidas';
        finalAccount = 'banco';
        finalToAccount = undefined;
      } else {
        finalType = 'transfer_between_accounts';
        finalCategory = category || `Transferência de ${transferFrom} para ${transferTo}`;
        finalAccount = transferFrom;
        finalToAccount = transferTo;
      }
      finalBucket = 'Transferência';
    } else {
      finalType = 'expense';
      if (finalBucket === 'Reserva/Dívidas' && finalAccount === 'reserva') {
        finalAccount = 'banco';
      }
    }

    onSave({
      type: finalType,
      amount: parsedAmount,
      description: finalDescription,
      date,
      bucket: finalBucket,
      category: finalCategory,
      isPending,
      account: finalAccount,
      toAccount: finalToAccount
    });

    if (shouldClose) {
      onClose();
    } else {
      setAmount('');
      setDescription('');
      setCategory('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white dark:bg-slate-900 w-full max-w-[350px] rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden border border-slate-100 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex justify-between items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  {formTab === 'expense' ? 'Registrar uma despesa' : formTab === 'income' ? 'Registrar uma receita' : 'Transferência entre contas'}
                </p>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {error && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-lg text-xs leading-relaxed">
                  {error}
                </div>
              )}

              {/* Transaction Type Tabs */}
              <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setFormTab(initialTab || 'expense'); setCategory(''); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                    formTab === 'expense' 
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600 dark:text-rose-400' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => { setFormTab('income'); setCategory(''); setBucket('Renda'); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                    formTab === 'income' 
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => { setFormTab('transfer'); setCategory(''); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                    formTab === 'transfer' 
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Transf.
                </button>
              </div>

              {/* Transfer Accounts */}
              {formTab === 'transfer' && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">De (Origem)</label>
                    <select
                      value={transferFrom}
                      onChange={e => setTransferFrom(e.target.value)}
                      className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg py-2 px-2.5 outline-none focus:border-indigo-500 transition-all text-xs font-semibold"
                    >
                      {(accounts && accounts.length > 0 ? accounts : [
                        { id: 'banco', name: 'Banco', icon: '🏦' },
                        { id: 'reserva', name: 'Reserva (Cofrinho)', icon: '💰' },
                        { id: 'carteira', name: 'Carteira (Dinheiro Físico)', icon: '💵' }
                      ]).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Para (Destino)</label>
                    <select
                      value={transferTo}
                      onChange={e => setTransferTo(e.target.value)}
                      className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg py-2 px-2.5 outline-none focus:border-indigo-500 transition-all text-xs font-semibold"
                    >
                      {(accounts && accounts.length > 0 ? accounts : [
                        { id: 'banco', name: 'Banco', icon: '🏦' },
                        { id: 'reserva', name: 'Reserva (Cofrinho)', icon: '💰' },
                        { id: 'carteira', name: 'Carteira (Dinheiro Físico)', icon: '💵' }
                      ]).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Amount Field */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500">R$</span>
                  <input
                    type="text"
                    required
                    value={amount}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9,]/g, '');
                      const parts = val.split(',');
                      if (parts.length > 2) {
                        setAmount(parts[0] + ',' + parts.slice(1).join(''));
                      } else {
                        setAmount(val);
                      }
                    }}
                    className={`w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-950 dark:text-white rounded-lg py-2.5 pl-9 pr-3 outline-none transition-all font-bold text-base focus:ring-1 ${
                      formTab === 'expense' 
                        ? 'focus:border-rose-500 focus:ring-rose-500/20 text-rose-600 dark:text-rose-400' 
                        : formTab === 'income' 
                          ? 'focus:border-emerald-500 focus:ring-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                          : 'focus:border-indigo-500 focus:ring-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                    }`}
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg py-2 px-3 outline-none focus:border-slate-400 text-xs font-medium"
                  placeholder="Ex: Mercado, Salário, etc."
                />
              </div>

              {/* Date & Bucket Grid */}
              <div className={formTab === 'expense' ? "grid grid-cols-2 gap-3" : "w-full"}>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg py-2 px-2.5 outline-none focus:border-slate-400 text-xs font-medium"
                    style={{ colorScheme: 'light dark' }}
                  />
                </div>
                
                {formTab === 'expense' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Balde</label>
                    <select
                      value={bucket}
                      onChange={e => {
                        const val = e.target.value as Bucket;
                        setBucket(val);
                        setCategory('');
                        if (val === 'Reserva/Dívidas' && account === 'reserva') {
                          setAccount('banco');
                        }
                      }}
                      className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg py-2 px-2 transition-all text-xs font-semibold"
                    >
                      <option value="Necessidades">Necessidades</option>
                      <option value="Desejos">Desejos</option>
                      <option value="Reserva/Dívidas">Reserva/Dívidas</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Categories block */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Categoria</label>
                  {category && (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      formTab === 'expense' 
                        ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                        : formTab === 'income' 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {category}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 border border-slate-200/80 dark:border-slate-800 rounded-lg bg-slate-50/30 dark:bg-slate-900/10 scrollbar-thin">
                  {availableCategories.map(cat => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? formTab === 'expense'
                              ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/25'
                              : formTab === 'income'
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25'
                                : 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-150 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                  
                  {!isAddingCustom ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(true)}
                      className={`px-2 py-1 rounded text-[11px] font-bold border border-dashed transition-all cursor-pointer ${
                        formTab === 'expense'
                          ? 'bg-rose-50/50 dark:bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100/50'
                          : formTab === 'income'
                            ? 'bg-emerald-50/50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100/50'
                            : 'bg-indigo-50/50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100/50'
                      }`}
                    >
                      + Nova
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 w-full mt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <input
                        type="text"
                        placeholder="Nome..."
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateCustomCategory();
                          }
                        }}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded px-2 py-0.5 text-[11px] outline-none focus:border-slate-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCreateCustomCategory}
                        className={`px-2 py-0.5 text-[11px] font-semibold text-white rounded transition-colors cursor-pointer ${
                          formTab === 'expense'
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : formTab === 'income'
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsAddingCustom(false); setNewCatName(''); }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Selection */}
              {formTab !== 'transfer' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    {formTab === 'expense' ? 'Pagar usando' : 'Receber em'}
                  </label>
                  <select
                    value={account === 'reserva' && bucket === 'Reserva/Dívidas' ? 'banco' : account}
                    onChange={e => setAccount(e.target.value as AccountType)}
                    className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg py-2 px-2.5 outline-none focus:border-slate-400 text-xs font-semibold"
                  >
                    {(accounts && accounts.length > 0 ? accounts : [
                      { id: 'banco', name: 'Banco', icon: '🏦' },
                      { id: 'reserva', name: 'Reserva (Cofrinho)', icon: '💰', type: 'reserva' },
                      { id: 'carteira', name: 'Carteira (Dinheiro Físico)', icon: '💵' }
                    ]).filter(acc => bucket !== 'Reserva/Dívidas' || acc.id !== 'reserva').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pending Switcher */}
              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="isPending"
                  checked={isPending}
                  onChange={(e) => setIsPending(e.target.checked)}
                  className={`w-3.5 h-3.5 rounded border-slate-300 focus:ring-opacity-20 ${
                    formTab === 'expense' 
                      ? 'text-rose-600 focus:ring-rose-500' 
                      : formTab === 'income'
                        ? 'text-emerald-600 focus:ring-emerald-500'
                        : 'text-indigo-600 focus:ring-indigo-500'
                  }`}
                />
                <label htmlFor="isPending" className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  Lançamento futuro (pendente)
                </label>
              </div>
            </div>

            {/* Fixed/Sticky Footer Actions */}
            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3 flex gap-2">
              {!editingTransaction && (
                <button
                  type="button"
                  onClick={() => handleSaveTransaction(false)}
                  className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg py-2 transition-all text-xs cursor-pointer text-center"
                >
                  Continuar
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSaveTransaction(true)}
                className={`flex-1 text-white font-bold rounded-lg py-2 transition-all text-xs cursor-pointer shadow-md text-center ${
                  formTab === 'expense'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10'
                    : formTab === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/10'
                }`}
              >
                {editingTransaction ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
