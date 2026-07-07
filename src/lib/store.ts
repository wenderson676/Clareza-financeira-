import { useState, useEffect } from 'react';
import { AppState, MonthlyData, Transaction, Goal, Asset, Bucket, BudgetMode, Debt } from '../types';
import { format, subMonths, parse } from 'date-fns';

const STORAGE_KEY = 'mordomia_simples_data';

const defaultState: AppState = {
  monthlyData: {},
  goals: [],
  assets: [],
  debts: [],
  dashboardCardOrder: []
};

export function useStore() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
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
      dashboardCardOrder: []
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
    resetStore,
    importState,
    setUserName,
    setBudgetMode,
    setCardOrder
  };
}
