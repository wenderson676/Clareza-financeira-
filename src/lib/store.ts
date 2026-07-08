import { useState, useEffect } from 'react';
import { AppState, MonthlyData, Transaction, Goal, Asset, Bucket, BudgetMode, Debt, Account } from '../types';
import { format, subMonths, parse } from 'date-fns';

const STORAGE_KEY = 'mordomia_simples_data';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'banco', name: 'Banco', icon: '🏦', isMain: true, type: 'banco' },
  { id: 'reserva', name: 'Reserva (Cofrinho)', icon: '💰', type: 'reserva' },
  { id: 'carteira', name: 'Carteira (Dinheiro Físico)', icon: '💵', type: 'carteira' }
];

const defaultState: AppState = {
  monthlyData: {},
  goals: [],
  assets: [],
  debts: [],
  dashboardCardOrder: [],
  accounts: DEFAULT_ACCOUNTS
};

export function useStore() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.accounts || parsed.accounts.length === 0) {
          parsed.accounts = DEFAULT_ACCOUNTS;
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse saved state', e);
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getCurrentMonthId = () => format(new Date(), 'yyyy-MM');

  const initMonth = (monthId: string) => {
    setState(prev => {
      if (prev.monthlyData[monthId]) return prev;
      
      const prevDate = subMonths(parse(monthId, 'yyyy-MM', new Date()), 1);
      const prevMonthId = format(prevDate, 'yyyy-MM');
      const prevData = prev.monthlyData[prevMonthId];
      
      let newTransactions: Transaction[] = [];
      
      if (prevData && prevData.transactions.length > 0) {
        newTransactions = prevData.transactions.map(t => {
          const tDate = new Date(t.date + 'T00:00:00');
          const newDate = new Date(tDate.getFullYear(), tDate.getMonth() + 1, tDate.getDate());
          return {
            ...t,
            id: crypto.randomUUID(),
            date: format(newDate, 'yyyy-MM-dd'),
            isPending: true
          };
        });
      }

      return {
        ...prev,
        monthlyData: {
          ...prev.monthlyData,
          [monthId]: {
            monthId,
            transactions: newTransactions
          }
        }
      };
    });
  };

  const getMonthlyData = (monthId: string): MonthlyData => {
    return state.monthlyData[monthId] || { monthId, transactions: [] };
  };

  const getAccountBalancesUpToMonth = (targetMonthId: string) => {
    const currentAccounts = state.accounts || DEFAULT_ACCOUNTS;
    const balances: Record<string, number> = {};
    
    currentAccounts.forEach(acc => {
      balances[acc.id] = 0;
    });
    if (balances['banco'] === undefined) balances['banco'] = 0;
    if (balances['reserva'] === undefined) balances['reserva'] = 0;
    if (balances['carteira'] === undefined) balances['carteira'] = 0;

    const sortedMonthIds = Object.keys(state.monthlyData).sort();

    for (const mId of sortedMonthIds) {
      if (mId > targetMonthId) continue;

      const month = state.monthlyData[mId];
      if (!month || !month.transactions) continue;

      for (const t of month.transactions) {
        if (t.isPending) continue;

        const amt = t.amount;
        const act = t.account || 'banco';

        if (t.type === 'income') {
          if (balances[act] !== undefined) {
            balances[act] += amt;
          } else {
            balances['banco'] += amt;
          }
        } else if (t.type === 'expense') {
          if (t.bucket === 'Reserva/Dívidas') {
            if (balances[act] !== undefined) {
              balances[act] -= amt;
            } else {
              balances['banco'] -= amt;
            }
            balances['reserva'] += amt;
          } else {
            if (balances[act] !== undefined) {
              balances[act] -= amt;
            } else {
              balances['banco'] -= amt;
            }
          }
        } else if (t.type === 'transfer_to_savings') {
          if (balances[act] !== undefined) {
            balances[act] -= amt;
          } else {
            balances['banco'] -= amt;
          }
          balances['reserva'] += amt;
        } else if (t.type === 'transfer_from_savings') {
          balances['reserva'] -= amt;
          if (balances[act] !== undefined) {
            balances[act] += amt;
          } else {
            balances['banco'] += amt;
          }
        } else if (t.type === 'transfer_between_accounts') {
          const fromAct = t.account || 'banco';
          const toAct = t.toAccount || 'carteira';
          if (balances[fromAct] !== undefined) balances[fromAct] -= amt;
          else balances['banco'] -= amt;
          if (balances[toAct] !== undefined) balances[toAct] += amt;
          else balances['carteira'] += amt;
        }
      }
    }

    return balances;
  };

  const getAccumulatedBalance = (targetMonthId: string): number => {
    let balance = 0;
    const targetDate = parse(targetMonthId, 'yyyy-MM', new Date());
    
    Object.values(state.monthlyData).forEach((month: any) => {
      const monthDate = parse(month.monthId, 'yyyy-MM', new Date());
      if (monthDate < targetDate) {
        month.transactions.filter((t: any) => !t.isPending).forEach((t: any) => {
          if (t.type === 'income') balance += t.amount;
          if (t.type === 'expense') balance -= t.amount;
          if (t.type === 'transfer_to_savings') balance -= t.amount;
          if (t.type === 'transfer_from_savings') balance += t.amount;
          if (t.type === 'transfer_between_accounts') {
            if (t.toAccount === 'reserva') balance -= t.amount;
            else if (t.account === 'reserva') balance += t.amount;
          }
        });
      }
    });
    return balance;
  };

  const addTransaction = (monthId: string, transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID()
    };
    setState(prev => {
      const month = prev.monthlyData[monthId] || { monthId, transactions: [] };
      return {
        ...prev,
        monthlyData: {
          ...prev.monthlyData,
          [monthId]: {
            ...month,
            transactions: [...month.transactions, newTransaction]
          }
        }
      };
    });
  };

  const deleteTransaction = (monthId: string, transactionId: string) => {
    setState(prev => {
      const month = prev.monthlyData[monthId];
      if (!month) return prev;
      return {
        ...prev,
        monthlyData: {
          ...prev.monthlyData,
          [monthId]: {
            ...month,
            transactions: month.transactions.filter(t => t.id !== transactionId)
          }
        }
      };
    });
  };

  const updateTransaction = (monthId: string, transactionId: string, updatedTransaction: Omit<Transaction, 'id'>) => {
    setState(prev => {
      const month = prev.monthlyData[monthId];
      if (!month) return prev;
      return {
        ...prev,
        monthlyData: {
          ...prev.monthlyData,
          [monthId]: {
            ...month,
            transactions: month.transactions.map(t => 
              t.id === transactionId ? { ...updatedTransaction, id: transactionId } : t
            )
          }
        }
      };
    });
  };

  const toggleTransactionPending = (monthId: string, transactionId: string) => {
    setState(prev => {
      const month = prev.monthlyData[monthId];
      if (!month) return prev;
      return {
        ...prev,
        monthlyData: {
          ...prev.monthlyData,
          [monthId]: {
            ...month,
            transactions: month.transactions.map(t => 
              t.id === transactionId ? { ...t, isPending: !t.isPending } : t
            )
          }
        }
      };
    });
  };

  const setDevotionalNote = (monthId: string, note: string) => {
    setState(prev => {
      const month = prev.monthlyData[monthId] || { monthId, transactions: [] };
      return {
        ...prev,
        monthlyData: {
          ...prev.monthlyData,
          [monthId]: {
            ...month,
            devotionalNote: note
          }
        }
      };
    });
  };

  const addAsset = (asset: Omit<Asset, 'id'>) => {
    setState(prev => ({
      ...prev,
      assets: [...prev.assets, { ...asset, id: crypto.randomUUID() }]
    }));
  };

  const deleteAsset = (id: string) => {
    setState(prev => ({
      ...prev,
      assets: prev.assets.filter(a => a.id !== id)
    }));
  };

  const addGoal = (goal: Omit<Goal, 'id'>) => {
    setState(prev => ({
      ...prev,
      goals: [...prev.goals, { ...goal, id: crypto.randomUUID() }]
    }));
  };

  const updateGoal = (id: string, updatedGoal: Partial<Goal>) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, ...updatedGoal } : g)
    }));
  };

  const deleteGoal = (id: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id)
    }));
  };

  const addDebt = (debt: Omit<Debt, 'id'>) => {
    setState(prev => ({
      ...prev,
      debts: [...(prev.debts || []), { ...debt, id: crypto.randomUUID() }]
    }));
  };

  const updateDebt = (id: string, updatedDebt: Partial<Debt>) => {
    setState(prev => ({
      ...prev,
      debts: (prev.debts || []).map(d => d.id === id ? { ...d, ...updatedDebt } : d)
    }));
  };

  const deleteDebt = (id: string) => {
    setState(prev => ({
      ...prev,
      debts: (prev.debts || []).filter(d => d.id !== id)
    }));
  };

  const resetStore = () => {
    const monthId = format(new Date(), 'yyyy-MM');
    setState({
      monthlyData: {
        [monthId]: {
          monthId,
          transactions: []
        }
      },
      goals: [],
      assets: [],
      debts: [],
      dashboardCardOrder: [],
      accounts: DEFAULT_ACCOUNTS
    });
  };

  const addAccount = (account: Omit<Account, 'id'>) => {
    setState(prev => {
      const currentAccounts = prev.accounts || DEFAULT_ACCOUNTS;
      const newAccount: Account = {
        ...account,
        id: crypto.randomUUID()
      };
      const updatedAccounts = currentAccounts.map(acc => {
        if (newAccount.isMain) {
          return { ...acc, isMain: false };
        }
        return acc;
      });
      return {
        ...prev,
        accounts: [...updatedAccounts, newAccount]
      };
    });
  };

  const updateAccount = (id: string, updated: Partial<Account>) => {
    setState(prev => {
      const currentAccounts = prev.accounts || DEFAULT_ACCOUNTS;
      const updatedAccounts = currentAccounts.map(acc => {
        if (acc.id === id) {
          return { ...acc, ...updated };
        }
        if (updated.isMain && acc.id !== id) {
          return { ...acc, isMain: false };
        }
        return acc;
      });
      return {
        ...prev,
        accounts: updatedAccounts
      };
    });
  };

  const deleteAccount = (id: string) => {
    setState(prev => {
      const currentAccounts = prev.accounts || DEFAULT_ACCOUNTS;
      const accountToDelete = currentAccounts.find(acc => acc.id === id);
      if (!accountToDelete || accountToDelete.type !== 'custom') return prev;

      const remainingAccounts = currentAccounts.filter(acc => acc.id !== id);
      if (accountToDelete.isMain && remainingAccounts.length > 0) {
        remainingAccounts[0].isMain = true;
      }
      return {
        ...prev,
        accounts: remainingAccounts
      };
    });
  };

  const importState = (newState: AppState) => {
    setState(newState);
  };

  const setUserName = (name: string) => {
    setState(prev => ({
      ...prev,
      userName: name
    }));
  };

  const setBudgetMode = (mode: BudgetMode) => {
    setState(prev => ({
      ...prev,
      budgetMode: mode
    }));
  };

  const setCardOrder = (order: string[]) => {
    setState(prev => ({
      ...prev,
      dashboardCardOrder: order
    }));
  };

  return {
    state,
    getCurrentMonthId,
    initMonth,
    getMonthlyData,
    getAccountBalancesUpToMonth,
    getAccumulatedBalance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    toggleTransactionPending,
    setDevotionalNote,
    addAsset,
    deleteAsset,
    addGoal,
    updateGoal,
    deleteGoal,
    addDebt,
    updateDebt,
    deleteDebt,
    addAccount,
    updateAccount,
    deleteAccount,
    resetStore,
    importState,
    setUserName,
    setBudgetMode,
    setCardOrder
  };
}
