import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Transaction, TransactionType, Bucket, AccountType } from '../types';
import { formatCurrency, CATEGORIES, BUCKETS } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (t: Omit<Transaction, 'id'>) => void;
  editingTransaction?: Transaction | null;
  initialTab?: 'expense' | 'income' | 'transfer';
  accountBalances?: { banco: number; reserva: number; carteira: number; };
}

export function TransactionModal({ isOpen, onClose, onSave, editingTransaction, initialTab, accountBalances }: TransactionModalProps) {
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
  }, [isOpen, editingTransaction, initialTab]);

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
    setTransferFrom("banco");
    setTransferTo("reserva");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setAccount("banco");
    setError("");
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveTransaction(true);
  };

  const handleSaveTransaction = (shouldClose: boolean) => {
    setError('');
    const parsedAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (!parsedAmount || isNaN(parsedAmount) || !description || (formTab !== 'transfer' && !category)) return;

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
        setError(`Saldo insuficiente na conta de origem (${transferFrom}). Saldo disponível: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(availableBalance)}`);
        return;
      }
    }

    let finalType: TransactionType = 'expense';
    let finalBucket: Bucket = bucket;
    let finalCategory = category;
    let finalAccount = account;
    let finalToAccount: AccountType | undefined;

    if (formTab === 'income') {
      finalType = 'income';
      finalBucket = 'Renda';
    } else if (formTab === 'transfer') {
      if (transferFrom === 'banco' && transferTo === 'reserva') {
        finalType = 'transfer_to_savings';
        finalCategory = 'Transferência para Reserva/Dívidas';
        finalAccount = 'banco';
        finalToAccount = undefined;
      } else if (transferFrom === 'reserva' && transferTo === 'banco') {
        finalType = 'transfer_from_savings';
        finalCategory = 'Resgate de Reserva/Dívidas';
        finalAccount = 'banco';
        finalToAccount = undefined;
      } else {
        finalType = 'transfer_between_accounts';
        finalCategory = `Transferência de ${transferFrom} para ${transferTo}`;
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
      description,
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {error && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setFormTab(initialTab || 'expense'); setCategory(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    formTab === 'expense' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => { setFormTab('income'); setCategory(''); setBucket('Renda'); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    formTab === 'income' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => { setFormTab('transfer'); setCategory(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    formTab === 'transfer' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Transferência
                </button>
              </div>

              {formTab === 'transfer' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">De (Origem)</label>
                    <select
                      value={transferFrom}
                      onChange={e => setTransferFrom(e.target.value as AccountType)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 px-4 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    >
                      <option value="banco">🏦 Banco</option>
                      <option value="reserva">💰 Reserva (Cofrinho)</option>
                      <option value="carteira">💵 Carteira (Dinheiro Físico)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Para (Destino)</label>
                    <select
                      value={transferTo}
                      onChange={e => setTransferTo(e.target.value as AccountType)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 px-4 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    >
                      <option value="banco">🏦 Banco</option>
                      <option value="reserva">💰 Reserva (Cofrinho)</option>
                      <option value="carteira">💵 Carteira (Dinheiro Físico)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                  <input
                    type="text"
                    required
                    value={amount}
                    onChange={e => {
                      // Allow numbers and comma
                      const val = e.target.value.replace(/[^0-9,]/g, '');
                      // Only allow one comma
                      const parts = val.split(',');
                      if (parts.length > 2) {
                        setAmount(parts[0] + ',' + parts.slice(1).join(''));
                      } else {
                        setAmount(val);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-semibold text-lg"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={e => {
                    setDescription(e.target.value);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 px-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="Ex: Mercado, Salário, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 px-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    style={{ colorScheme: 'light dark' }}
                  />
                </div>
                
                {formTab === 'expense' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Balde</label>
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
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 px-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    >
                      <option value="Necessidades">Necessidades</option>
                      <option value="Desejos">Desejos</option>
                      <option value="Reserva/Dívidas">Reserva/Dívidas</option>
                    </select>
                  </div>
                )}
              </div>

              {formTab !== 'transfer' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Categoria</label>
                  <input
                    required
                    list="categories-list"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 px-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    placeholder="Selecione ou digite uma nova categoria..."
                  />
                  <datalist id="categories-list">
                    {(formTab === 'income' ? CATEGORIES['Renda'] : CATEGORIES[bucket]).map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              )}

              {formTab !== 'transfer' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {formTab === 'expense' ? 'Pagar usando' : 'Receber em'}
                  </label>
                  <select
                    value={account === 'reserva' && bucket === 'Reserva/Dívidas' ? 'banco' : account}
                    onChange={e => setAccount(e.target.value as AccountType)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 px-4 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-sm"
                  >
                    <option value="banco">🏦 Banco</option>
                    {bucket !== 'Reserva/Dívidas' && <option value="reserva">💰 Reserva (Cofrinho)</option>}
                    <option value="carteira">💵 Carteira (Dinheiro Físico)</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isPending"
                  checked={isPending}
                  onChange={(e) => setIsPending(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="isPending" className="text-sm text-slate-700 dark:text-slate-300">
                  Lançamento futuro (pendente)
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {!editingTransaction && (
                  <button
                    type="button"
                    onClick={() => handleSaveTransaction(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl py-3.5 transition-colors text-sm"
                  >
                    Salvar e Continuar
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl py-3.5 transition-colors text-sm shadow-md"
                >
                  {editingTransaction ? 'Atualizar' : 'Salvar e Fechar'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
