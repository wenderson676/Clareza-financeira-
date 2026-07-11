import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { HelpCircle, X, Calendar, ArrowRight, Target, Plus, Trash, Edit2, CheckCircle2, Lightbulb, SlidersHorizontal, ArrowUp, ArrowDown, RotateCcw, GripVertical, Wallet, PiggyBank, CreditCard, Coins, Bell, BellRing, Check } from 'lucide-react';
import { formatCurrency, getBucketsConfig, BUCKET_EXPLANATIONS, getRandomVerse } from '../lib/utils';
import { MonthlyData, Goal, BudgetMode, Debt, AccountType, Account, Transaction, Bucket } from '../types';
import { DebtsSection } from './DebtsSection';
import { motion, AnimatePresence } from 'motion/react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { checkAndTriggerNotifications, requestNotificationPermission, getNotificationPermissionStatus, TransactionAlert } from '../lib/notifications';
import { generateFinancialDiagnosis } from '../lib/financialEngine';
import { TrendingUp, TrendingDown, Activity, Gauge, Sparkles, Eye } from 'lucide-react';

interface DashboardProps {
  data: MonthlyData;
  previousBalance: number;
  allData: Record<string, MonthlyData>;
  goals?: Goal[];
  addGoal?: (goal: Omit<Goal, 'id'>) => void;
  onOpenGoalForm?: (goal?: Goal) => void;
  updateGoal?: (id: string, goal: Partial<Goal>) => void;
  deleteGoal?: (id: string) => void;
  debts?: Debt[];
  addDebt?: (debt: Omit<Debt, 'id'>) => void;
  updateDebt?: (id: string, debt: Partial<Debt>) => void;
  deleteDebt?: (id: string) => void;
  onSaveNote?: (note: string) => void;
  budgetMode?: BudgetMode;
  dashboardCardOrder?: string[];
  setCardOrder?: (order: string[]) => void;
  accounts?: Account[];
  addAccount?: (account: Omit<Account, 'id'>) => void;
  updateAccount?: (id: string, updated: Partial<Account>) => void;
  deleteAccount?: (id: string) => void;
  onTogglePending?: (monthId: string, id: string) => void;
  addTransaction?: (monthId: string, transaction: Omit<Transaction, 'id'>) => void;
}

export function Dashboard({ 
  data, 
  previousBalance, 
  allData, 
  goals = [], 
  addGoal,
  onOpenGoalForm, 
  updateGoal, 
  deleteGoal, 
  debts = [],
  addDebt,
  updateDebt,
  deleteDebt,
  onSaveNote, 
  budgetMode = '50-30-20',
  dashboardCardOrder = [],
  setCardOrder,
  accounts = [],
  addAccount,
  updateAccount,
  deleteAccount,
  onTogglePending,
  addTransaction
}: DashboardProps) {
  const [quote, setQuote] = useState('');
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [chartViewType, setChartViewType] = useState<'pizza' | 'barras'>('pizza');
  const [chartDataType, setChartDataType] = useState<'expense' | 'income'>('expense');
  
  const [note, setNote] = useState(data.devotionalNote || '');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // --- CO-PILOT SIMULATOR AND TAB STATES ---
  const [simIncomeIncrease, setSimIncomeIncrease] = useState(0);
  const [simExpenseDecrease, setSimExpenseDecrease] = useState(0);
  const [simDebtReduction, setSimDebtReduction] = useState(0);
  const [raioXTab, setRaioXTab] = useState<'resumo' | 'saude' | 'tendencias' | 'previsoes' | 'simulador'>('resumo');

  const fullDiagnosis = useMemo(() => {
    return generateFinancialDiagnosis(
      data,
      allData as any,
      previousBalance,
      debts,
      goals,
      accounts
    );
  }, [data, allData, previousBalance, debts, goals, accounts]);

  const simulatedDiagnosis = useMemo(() => {
    if (simIncomeIncrease === 0 && simExpenseDecrease === 0 && simDebtReduction === 0) {
      return fullDiagnosis;
    }
    
    const simulatedData = {
      ...data,
      transactions: [
        ...(data.transactions || []),
        ...(simIncomeIncrease > 0 ? [{
          id: 'sim_income',
          type: 'income' as const,
          amount: simIncomeIncrease,
          description: 'Renda Simulada Extra',
          date: new Date().toISOString().split('T')[0],
          bucket: 'Renda' as const,
          category: 'Entradas',
          isPending: false
        }] : []),
        ...(simExpenseDecrease > 0 ? [{
          id: 'sim_expense_reduction',
          type: 'income' as const,
          amount: simExpenseDecrease,
          description: 'Economia Simulada',
          date: new Date().toISOString().split('T')[0],
          bucket: 'Renda' as const,
          category: 'Economias',
          isPending: false
        }] : [])
      ]
    };

    const simulatedDebts = debts.map(d => {
      if (simDebtReduction <= 0) return d;
      const reduction = Math.min(d.totalAmount, simDebtReduction);
      return {
        ...d,
        totalAmount: d.totalAmount - reduction,
        monthlyPayment: d.totalAmount - reduction <= 0 ? 0 : d.monthlyPayment * ((d.totalAmount - reduction) / d.totalAmount)
      };
    });

    return generateFinancialDiagnosis(
      simulatedData,
      allData as any,
      previousBalance,
      simulatedDebts,
      goals,
      accounts
    );
  }, [data, allData, previousBalance, debts, goals, accounts, simIncomeIncrease, simExpenseDecrease, simDebtReduction, fullDiagnosis]);

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' ? getNotificationPermissionStatus() : 'default';
  });

  const alerts = useMemo(() => {
    return checkAndTriggerNotifications(allData as any);
  }, [allData]);

  const handleRequestPermission = async () => {
    const status = await requestNotificationPermission();
    setPermissionStatus(status);
  };

  const [isManagingAccounts, setIsManagingAccounts] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  const [accFormName, setAccFormName] = useState('');
  const [accFormIcon, setAccFormIcon] = useState('🏦');
  const [accFormIsMain, setAccFormIsMain] = useState(false);

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccFormName(acc.name);
    setAccFormIcon(acc.icon);
    setAccFormIsMain(!!acc.isMain);
    setShowCreateAccount(false);
  };

  const handleOpenCreateAccount = () => {
    setEditingAccount(null);
    setAccFormName('');
    setAccFormIcon('💳');
    setAccFormIsMain(false);
    setShowCreateAccount(true);
  };

  const handleCancelForm = () => {
    setEditingAccount(null);
    setShowCreateAccount(false);
  };

  const handleSaveAccountForm = () => {
    if (!accFormName.trim()) return;

    if (showCreateAccount) {
      addAccount?.({
        name: accFormName.trim(),
        icon: accFormIcon,
        isMain: accFormIsMain,
        type: 'custom'
      });
    } else if (editingAccount) {
      updateAccount?.(editingAccount.id, {
        name: accFormName.trim(),
        icon: accFormIcon,
        isMain: accFormIsMain
      });
    }

    setEditingAccount(null);
    setShowCreateAccount(false);
  };

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

  const isReserva = (id?: string) => id === 'reserva' || accounts.find(a => a.id === id)?.type === 'reserva';

  const netTransfersToSavings = data.transactions
    .filter(t => !t.isPending)
    .reduce((sum, t) => {
      const act = t.account || 'banco';
      const toAct = t.toAccount;
      if (t.type === 'transfer_to_savings' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas') || (t.type === 'income' && isReserva(act)) || (t.type === 'transfer_between_accounts' && isReserva(toAct))) {
        return sum + t.amount;
      }
      if (t.type === 'transfer_from_savings' || (t.type === 'expense' && isReserva(act) && t.bucket !== 'Reserva/Dívidas') || (t.type === 'transfer_between_accounts' && isReserva(act))) {
        return sum - t.amount;
      }
      return sum;
    }, 0);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach(acc => {
      balances[acc.id] = 0;
    });
    if (balances['banco'] === undefined) balances['banco'] = 0;
    if (balances['reserva'] === undefined) balances['reserva'] = 0;
    if (balances['carteira'] === undefined) balances['carteira'] = 0;

    const sortedMonthIds = Object.keys(allData).sort();
    for (const mId of sortedMonthIds) {
      if (mId > data.monthId) continue;
      const month = allData[mId];
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
          if (balances[act] !== undefined) {
            balances[act] -= amt;
          } else {
            balances['banco'] -= amt;
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
  }, [allData, data.monthId, accounts]);

  const currentBalance = accounts.reduce((sum, acc) => (acc.id !== 'reserva' && acc.type !== 'reserva') ? sum + (accountBalances[acc.id] || 0) : sum, 0) + (accounts.find(a => a.id === 'banco') ? 0 : (accountBalances['banco'] || 0)) + (accounts.find(a => a.id === 'carteira') ? 0 : (accountBalances['carteira'] || 0));

  const projectedIncome = data.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const projectedExpenses = data.transactions
    .filter(t => t.type === 'expense' && t.bucket !== 'Reserva/Dívidas')
    .reduce((sum, t) => sum + t.amount, 0);

  const projectedBalance = useMemo(() => {
    let balance = currentBalance;
    const sortedMonthIds = Object.keys(allData).sort();
    for (const mId of sortedMonthIds) {
      if (mId > data.monthId) continue;
      const month = allData[mId];
      if (!month || !month.transactions) continue;
      
      for (const t of month.transactions) {
        if (!t.isPending) continue;
        
        const amt = t.amount;
        const act = t.account || 'banco';
        const toAct = t.toAccount;
        
        if (t.type === 'income' && !isReserva(act)) {
          balance += amt;
        } else if (t.type === 'expense' && !isReserva(act)) {
          balance -= amt;
        } else if (t.type === 'transfer_to_savings' && !isReserva(act)) {
          balance -= amt;
        } else if (t.type === 'transfer_from_savings' && !isReserva(act)) {
          balance += amt;
        } else if (t.type === 'transfer_between_accounts') {
          if (!isReserva(act)) balance -= amt;
          if (toAct && !isReserva(toAct)) balance += amt;
        }
      }
    }
    return balance;
  }, [allData, data.monthId, currentBalance, accounts]);

  const raioX = useMemo(() => {
    const savingsRatio = totalIncome > 0 ? (netTransfersToSavings / totalIncome) : 0;
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) : 0;
    const projectedRatio = totalIncome > 0 ? (projectedBalance / totalIncome) : 0;

    let status = {
      name: 'Prosperar',
      color: 'text-indigo-600 bg-indigo-50/70 dark:text-indigo-400 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30',
      icon: '🚀',
      desc: 'Sua base está sólida! Foco total em investir, bater metas e expandir seu patrimônio.'
    };

    if (budgetMode === '70-0-30') {
      status = {
        name: 'Quitar Dívidas',
        color: 'text-rose-600 bg-rose-50/70 dark:text-rose-400 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
        icon: '🎯',
        desc: 'Modo de Guerra ativado! Seu foco absoluto é liquidar as contas pendentes e retomar o controle da sua vida financeira.'
      };
    } else if (budgetMode === '50-20-30') {
      status = {
        name: 'Prosperar',
        color: 'text-indigo-600 bg-indigo-50/70 dark:text-indigo-400 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30',
        icon: '🚀',
        desc: 'Sua base está sólida! Foco total em investir, bater metas e expandir seu patrimônio.'
      };
    } else if (totalIncome === 0) {
      status = {
        name: 'Ajustando',
        color: 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800',
        icon: '⚙️',
        desc: 'Aguardando receitas serem registradas para definir o seu diagnóstico.'
      };
    } else if (projectedBalance < 0 || expenseRatio > 0.95) {
      status = {
        name: 'Crise',
        color: 'text-rose-600 bg-rose-50/70 dark:text-rose-400 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
        icon: '🚨',
        desc: 'Seu saldo projetado está negativo ou as despesas consomem toda a receita. Alerta máximo!'
      };
    } else if (projectedRatio < 0.1 || savingsRatio <= 0.05) {
      status = {
        name: 'Sobrevivência',
        color: 'text-amber-600 bg-amber-50/70 dark:text-amber-400 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
        icon: '⚠️',
        desc: 'Você consegue pagar o básico, mas sobra muito pouco e quase não há margem para reserva.'
      };
    } else if (savingsRatio > 0.05 && savingsRatio <= 0.15) {
      status = {
        name: 'Equilíbrio',
        color: 'text-sky-600 bg-sky-50/70 dark:text-sky-400 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/30',
        icon: '⚖️',
        desc: 'Você já fecha o mês no azul e está criando uma rotina financeira saudável.'
      };
    } else if (savingsRatio > 0.15 && savingsRatio <= 0.25) {
      status = {
        name: 'Estável',
        color: 'text-emerald-600 bg-emerald-50/70 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
        icon: '🛡️',
        desc: 'Orçamento sob controle, reserva crescendo e um excelente nível de segurança.'
      };
    }

    let problem = {
      title: 'Equilíbrio geral',
      desc: 'Parabéns! Seus limites estão equilibrados e suas despesas seguem o planejamento.',
      type: 'success'
    };

    if (budgetMode === '70-0-30') {
      const totalDebt = debts.reduce((sum, d) => sum + d.totalAmount, 0);
      problem = {
        title: 'Foco em Quitação de Dívidas',
        desc: debts.length > 0 
          ? `Você tem ${debts.length} dívidas cadastradas que somam ${formatCurrency(totalDebt)}.` 
          : 'Nenhuma dívida cadastrada ainda. Adicione suas dívidas para gerar o plano de ataque.',
        type: debts.length > 0 ? 'danger' : 'neutral'
      };
    } else if (budgetMode === '50-20-30') {
      problem = {
        title: 'Expansão de Patrimônio',
        desc: 'Seu foco está em acelerar conquistas. Você está direcionando 30% do orçamento para investimento e reserva.',
        type: 'success'
      };
    } else if (totalIncome === 0) {
      problem = {
        title: 'Sem receitas cadastradas',
        desc: 'Registre suas fontes de renda para habilitar a análise e diagnóstico.',
        type: 'neutral'
      };
    } else if (projectedBalance < 0) {
      problem = {
        title: 'Contas acima do limite de ganho',
        desc: `Suas despesas projetadas estão superando suas receitas por ${formatCurrency(Math.abs(projectedBalance))}.`,
        type: 'danger'
      };
    } else {
      const getBucketExp = (bName: string) => data.transactions
        .filter(t => t.type === 'expense' && t.bucket === bName && !t.isPending)
        .reduce((sum, t) => sum + t.amount, 0);

      const needsSpent = getBucketExp('Necessidades');
      const needsAllocated = totalIncome * ((modeBuckets['Necessidades'] as any)?.percentage || 0.5);
      const desiresSpent = getBucketExp('Desejos');
      const desiresAllocated = totalIncome * ((modeBuckets['Desejos'] as any)?.percentage || 0.3);
      const savings = netTransfersToSavings;
      const savingsAllocated = totalIncome * ((modeBuckets['Reserva/Dívidas'] as any)?.percentage || 0.2);

      if (needsSpent > needsAllocated) {
        problem = {
          title: 'Custos Fixos elevados',
          desc: `As despesas essenciais (${formatCurrency(needsSpent)}) estão sufocando a meta de ${formatCurrency(needsAllocated)}.`,
          type: 'warning'
        };
      } else if (desiresSpent > desiresAllocated) {
        problem = {
          title: 'Excesso de gastos livres',
          desc: `Lazer e Desejos somam ${formatCurrency(desiresSpent)}, estourando o limite sugerido de ${formatCurrency(desiresAllocated)}.`,
          type: 'warning'
        };
      } else if (savings < savingsAllocated) {
        problem = {
          title: 'Reserva desabrigada',
          desc: `Você poupou apenas ${formatCurrency(savings)} do alvo ideal de ${formatCurrency(savingsAllocated)}.`,
          type: 'warning'
        };
      }
    }

    let action = 'Continue mantendo os registros diários para refinar seu histórico.';
    if (budgetMode === '70-0-30') {
      action = debts.length > 0 
        ? 'Siga o plano de ataque listado abaixo para eliminar primeiro as dívidas de prioridade máxima.' 
        : 'Clique em "Adicionar Dívida" no painel abaixo para começarmos a traçar seu plano de ação.';
    } else if (budgetMode === '50-20-30') {
      action = 'Aproveite o limite de 20% com desejos e lazer de alta qualidade, mantendo o investimento de 30% intocado no início do mês.';
    } else if (problem.title === 'Sem receitas cadastradas') {
      action = 'Adicione seu salário ou renda extra para podermos traçar seu plano de ação.';
    } else if (problem.title === 'Contas acima do limite de ganho') {
      action = 'Evite novas compras parceladas imediatamente, pause assinaturas supérfluas e reduza em 30% despesas de lazer nesta semana.';
    } else if (problem.title === 'Custos Fixos elevados') {
      action = 'Seu custo de vida fixo está pesado. Avalie renegociar planos de internet, seguros ou contas recorrentes para abrir margem.';
    } else if (problem.title === 'Excesso de gastos livres') {
      action = 'Estipule uma meta rígida de gastar no máximo R$ 80 com lazer/alimentação fora neste próximo fim de semana.';
    } else if (problem.title === 'Reserva desabrigada') {
      action = 'Acostume-se a investir a diferença antes de gastar. Programe uma transferência futura de R$ 30 para a reserva logo hoje.';
    }

    let forecast = 'Aguardando dados...';
    if (budgetMode === '70-0-30') {
      const totalDebt = debts.reduce((sum, d) => sum + d.totalAmount, 0);
      const plannedAttackAmount = Math.max(totalIncome * 0.3, 300);
      forecast = debts.length > 0 
        ? `Seu plano projeta eliminar todas as dívidas em aproximadamente ${Math.ceil(totalDebt / plannedAttackAmount)} meses.` 
        : 'Aguardando o cadastro das dívidas para simular sua liberação.';
    } else if (budgetMode === '50-20-30') {
      forecast = totalIncome > 0 
        ? `Projeção de acumular ${formatCurrency(totalIncome * 0.3)} em novos investimentos ou reservas só este mês.` 
        : 'Registre suas entradas para simular o ritmo de crescimento do seu patrimônio.';
    } else if (totalIncome > 0) {
      if (projectedBalance < 0) {
        const daysInMonth = 30;
        const currentDay = new Date().getDate();
        const dailySpend = totalExpenses / Math.max(currentDay, 1);
        if (dailySpend > 0) {
          const daysLeft = Math.floor(totalIncome / dailySpend);
          const runOutDay = Math.min(daysLeft, daysInMonth);
          if (runOutDay < daysInMonth) {
            forecast = `Mantendo o ritmo atual de gastos, seu saldo projetado zerará por volta do dia ${runOutDay} deste mês.`;
          } else {
            forecast = `Você deve fechar o mês no vermelho com um saldo negativo de aproximadamente ${formatCurrency(Math.abs(projectedBalance))}.`;
          }
        } else {
          forecast = `Você deve fechar o mês no vermelho com um saldo negativo de aproximadamente ${formatCurrency(Math.abs(projectedBalance))}.`;
        }
      } else if (projectedBalance > 0) {
        forecast = `Seu orçamento está controlado! Projeção de encerrar o mês com sobra líquida de ${formatCurrency(projectedBalance)}.`;
      } else {
        forecast = 'Você deve fechar o mês perfeitamente equilibrado, sem sobras e sem dívidas adicionais.';
      }
    } else {
      forecast = 'Registre suas entradas para que o modelo possa projetar sua saúde no fim do mês.';
    }

    let mission = 'Registrar cada gasto diário em tempo real para não acumular recibos.';
    if (budgetMode === '70-0-30') {
      mission = 'Executar o pagamento mínimo de menor prioridade e amortizar o máximo possível na dívida prioritária.';
    } else if (budgetMode === '50-20-30') {
      mission = 'Garantir o aporte de 30% em investimentos logo após o recebimento da receita.';
    } else if (problem.title === 'Sem receitas cadastradas') {
      mission = 'Registrar sua primeira entrada de dinheiro no aplicativo.';
    } else if (problem.title === 'Contas acima do limite de ganho') {
      mission = 'Passar 5 dias sem fazer uso algum de cartões de crédito e zerar despesas supérfluas.';
    } else if (problem.title === 'Custos Fixos elevados') {
      mission = 'Listar suas 3 maiores contas fixas e encontrar um ponto de corte ou redução.';
    } else if (problem.title === 'Excesso de gastos livres') {
      mission = 'Substituir duas refeições fora ou deliveries por pratos preparados em casa neste fim de semana.';
    } else if (problem.title === 'Reserva desabrigada') {
      mission = 'Alocar pelo menos R$ 15 reais na Reserva Financeira e registrar a transferência no app.';
    }

    return { status, problem, action, forecast, mission };
  }, [data.transactions, totalIncome, totalExpenses, netTransfersToSavings, projectedBalance, modeBuckets, budgetMode, debts]);

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

  const [isOrganizerOpen, setIsOrganizerOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const DEFAULT_CARD_ORDER = [
    'contas',
    'contasAPagar',
    'envelopes',
    'analiseMensal',
    'raioX',
    'distribuicao',
    'cofrinho',
    'dividas',
    'evolucao',
    'reflexao',
    'sabedoria'
  ];

  const CARD_LABELS: Record<string, { label: string; icon: string }> = {
    raioX: { label: 'Raio-X Financeiro', icon: '🔍' },
    contas: { label: 'Minhas Contas e Saldos', icon: '🏦' },
    analiseMensal: { label: 'Análise Mensal', icon: '📊' },
    contasAPagar: { label: 'Contas a Pagar', icon: '📅' },
    distribuicao: { label: 'Análise por Categoria', icon: '📊' },
    envelopes: { label: 'Progresso dos Envelopes', icon: '✉️' },
    dividas: { label: 'Painel de Dívidas', icon: '🎯' },
    cofrinho: { label: 'Cofrinho (Metas e Sonhos)', icon: '🐷' },
    evolucao: { label: 'Evolução (Últimos 6 Meses)', icon: '📈' },
    reflexao: { label: 'Reflexão do Mês', icon: '💡' },
    sabedoria: { label: 'Sabedoria Financeira', icon: '📖' }
  };

  const activeCardOrder = useMemo(() => {
    const userOrder = dashboardCardOrder || [];
    const filteredUserOrder = userOrder.filter(k => DEFAULT_CARD_ORDER.includes(k));
    const missingCards = DEFAULT_CARD_ORDER.filter(k => !filteredUserOrder.includes(k));
    return [...filteredUserOrder, ...missingCards];
  }, [dashboardCardOrder]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...activeCardOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    
    if (setCardOrder) {
      setCardOrder(newOrder);
    }
  };

  const handleResetOrder = () => {
    if (setCardOrder) {
      setCardOrder(DEFAULT_CARD_ORDER);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newOrder = [...activeCardOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    if (setCardOrder) {
      setCardOrder(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const renderRaioX = () => {
    const diag = simulatedDiagnosis;
    const isSimulated = simIncomeIncrease > 0 || simExpenseDecrease > 0 || simDebtReduction > 0;
    
    const scoreColor = 
      diag.metrics.healthScore >= 80 ? 'text-emerald-500' :
      diag.metrics.healthScore >= 60 ? 'text-sky-500' :
      diag.metrics.healthScore >= 40 ? 'text-amber-500' :
      'text-rose-500';

    const scoreBg = 
      diag.metrics.healthScore >= 80 ? 'bg-emerald-500/10' :
      diag.metrics.healthScore >= 60 ? 'bg-sky-500/10' :
      diag.metrics.healthScore >= 40 ? 'bg-amber-500/10' :
      'bg-rose-500/10';

    const getModeColor = (modeName: string) => {
      switch (modeName) {
        case 'Crise': return 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30';
        case 'Sobrevivência': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30';
        case 'Estabilização': return 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/30';
        case 'Construção': return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30';
        case 'Expansão': return 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30';
        default: return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800';
      }
    };

    return (
      <motion.div 
        key="raioX"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-6 border-indigo-500/10 dark:border-indigo-500/20 bg-gradient-to-b from-white to-indigo-50/5 dark:from-slate-900 dark:to-indigo-950/5 relative overflow-hidden animate-fade-in shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
              🔍
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight flex items-center gap-2">
                Copiloto Financeiro Inteligente
                {isSimulated && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-purple-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    Modo Simulação
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Diagnósticos, tendências, padrões e simulador de decisões financeiras</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Confiança:</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              diag.metrics.confidenceRating?.includes('Alta') ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
              diag.metrics.confidenceRating?.includes('Média') ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
              'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {diag.metrics.confidenceRating}
            </span>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-1 border-b border-slate-100 dark:border-slate-800/80 mb-5 pb-2 -mx-2 px-2 no-scrollbar scroll-smooth">
          {[
            { id: 'resumo', label: 'Resumo Diário', icon: <Activity size={13} /> },
            { id: 'saude', label: 'Índice de Saúde', icon: <Gauge size={13} /> },
            { id: 'tendencias', label: 'Tendências & Padrões', icon: <TrendingUp size={13} /> },
            { id: 'previsoes', label: 'Fluxo de Caixa', icon: <Coins size={13} /> },
            { id: 'simulador', label: 'Simulador Financeiro', icon: <Sparkles size={13} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRaioXTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                raioXTab === tab.id
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500 shadow-sm shadow-indigo-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800/30 dark:hover:bg-slate-800/70 dark:text-slate-400'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={raioXTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="min-h-[220px]"
          >
            {raioXTab === 'resumo' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">1. Modo de Saúde Atual</span>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {diag.mode === 'Crise' ? '🚨' : diag.mode === 'Sobrevivência' ? '⚠️' : diag.mode === 'Estabilização' ? '⚖️' : diag.mode === 'Construção' ? '🛡️' : '🚀'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getModeColor(diag.mode)}`}>
                        {diag.mode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      {diag.metrics.explanation}
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 border-t border-slate-100 dark:border-slate-800/60 pt-2 flex justify-between items-center">
                    <span>Divisão de Orçamento Recomendada:</span>
                    <span className="font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md">{diag.recommendedBudgetMode}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">2. Atenção & Diagnóstico</span>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">
                        {diag.riskLevel === 'Crítico' ? '🚨' : diag.riskLevel === 'Alto' ? '⚠️' : diag.riskLevel === 'Médio' ? '⚖️' : '✨'}
                      </span>
                      <span className={`text-xs font-bold ${
                        diag.riskLevel === 'Crítico' ? 'text-rose-600 dark:text-rose-400' :
                        diag.riskLevel === 'Alto' ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        Nível de Risco: {diag.riskLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      <strong className="text-slate-700 dark:text-slate-300 font-bold block mb-1">{diag.mainProblem?.title}</strong>
                      {diag.mainProblem?.desc}
                    </p>
                  </div>
                  {diag.biggestDrain && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 border-t border-slate-100 dark:border-slate-800/60 pt-2 truncate">
                      Maior dreno de caixa: <span className="font-extrabold text-rose-600 dark:text-rose-400">{diag.biggestDrain.category} ({formatCurrency(diag.biggestDrain.amount)})</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">3. Recomendação Inteligente</span>
                    <div className="flex items-start gap-2">
                      <Lightbulb size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                        {diag.recommendation}
                      </p>
                    </div>
                  </div>
                  {diag.biggestDebt && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 border-t border-slate-100 dark:border-slate-800/60 pt-2 truncate">
                      Foco de dívida: <span className="font-bold text-indigo-600 dark:text-indigo-400">{diag.biggestDebt.description} ({formatCurrency(diag.biggestDebt.totalAmount)})</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">✨ Pontos Fortes</span>
                    <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4 leading-tight">
                      {diag.strongPoints?.slice(0, 3).map((pt, i) => <li key={i}>{pt}</li>)}
                      {(!diag.strongPoints || diag.strongPoints.length === 0) && <li>Nenhum ponto de destaque positivo registrado ainda.</li>}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">⚠️ Pontos de Atenção</span>
                    <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4 leading-tight">
                      {diag.attentionPoints?.slice(0, 3).map((pt, i) => <li key={i}>{pt}</li>)}
                      {(!diag.attentionPoints || diag.attentionPoints.length === 0) && <li>Tudo limpo! Sem preocupações imediatas extras detectadas.</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {raioXTab === 'saude' && (
              <div className="flex flex-col lg:flex-row gap-6 items-center">
                <div className="flex flex-col items-center justify-center shrink-0 w-full lg:w-1/3">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-100 dark:text-slate-800"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="currentColor"
                        strokeWidth="8"
                        className={`${
                          diag.metrics.healthScore >= 85 ? 'text-emerald-500' :
                          diag.metrics.healthScore >= 70 ? 'text-emerald-400' :
                          diag.metrics.healthScore >= 50 ? 'text-sky-500' :
                          diag.metrics.healthScore >= 30 ? 'text-amber-500' :
                          'text-rose-500'
                        } transition-all duration-1000 ease-out`}
                        strokeDasharray="264"
                        strokeDashoffset={264 - (264 * diag.metrics.healthScore) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center text-center">
                      <span className="text-4xl font-black text-slate-800 dark:text-slate-50 leading-none">
                        {diag.metrics.healthScore}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Pontos</span>
                    </div>
                  </div>

                  <span className={`mt-3 px-3 py-0.5 rounded-full text-xs font-black uppercase ${scoreBg} ${scoreColor}`}>
                    {diag.metrics.healthScore >= 80 ? 'Excelente' :
                     diag.metrics.healthScore >= 60 ? 'Boa Saúde' :
                     diag.metrics.healthScore >= 40 ? 'Regular' : 'Crítica'}
                  </span>
                </div>

                <div className="flex-1 w-full">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-3">Critérios de Cálculo de Saúde Financeira</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Liquidez em Conta', value: diag.metrics.healthScoreDetails?.liquidityScore || 0, max: 20, icon: '💧' },
                      { label: 'Controle de Dívidas', value: diag.metrics.healthScoreDetails?.debtScore || 0, max: 20, icon: '🎯' },
                      { label: 'Taxa de Poupança', value: diag.metrics.healthScoreDetails?.savingsScore || 0, max: 20, icon: '🐷' },
                      { label: 'Reserva de Emergência', value: diag.metrics.healthScoreDetails?.emergencyReserveScore || 0, max: 20, icon: '🛡️' },
                      { label: 'Regularidade da Renda', value: diag.metrics.healthScoreDetails?.incomeRegularityScore || 0, max: 10, icon: '📅' },
                      { label: 'Progresso das Metas', value: diag.metrics.healthScoreDetails?.goalsScore || 0, max: 10, icon: '🎯' }
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/50 flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-xs shrink-0">{item.icon}</span>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-tight truncate">{item.label}</span>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">{item.value.toFixed(0)}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">máx {item.max}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div 
                            className="h-full bg-indigo-500 dark:bg-indigo-400" 
                            style={{ width: `${(item.value / item.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {raioXTab === 'tendencias' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/50">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Evolução Líquida</span>
                    <div className="flex items-center gap-2">
                      {diag.metrics.trends?.status === 'Melhorando' ? (
                        <TrendingUp className="text-emerald-500 shrink-0" size={18} />
                      ) : diag.metrics.trends?.status === 'Piorando' ? (
                        <TrendingDown className="text-rose-500 shrink-0" size={18} />
                      ) : (
                        <Activity className="text-indigo-500 shrink-0" size={18} />
                      )}
                      <span className={`text-sm font-bold ${
                        diag.metrics.trends?.status === 'Melhorando' ? 'text-emerald-600 dark:text-emerald-400' :
                        diag.metrics.trends?.status === 'Piorando' ? 'text-rose-600 dark:text-rose-400' :
                        'text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {diag.metrics.trends?.status || 'Estável'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
                      {diag.metrics.trends?.statusExplanation}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/50">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Estabilidade de Renda</span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-1">
                      💼 {diag.metrics.trends?.incomeStability || 'Estável'}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-1.5">
                      Avalia o desvio padrão de suas entradas ativas nos últimos meses.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/50">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Alerta de Crescimento</span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-1">
                      📈 {diag.metrics.trends?.topGrowingExpenseCategory ? diag.metrics.trends.topGrowingExpenseCategory : 'Nenhuma categoria em aceleração'}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-1.5">
                      {diag.metrics.trends?.topGrowingExpenseCategory 
                        ? `A categoria ${diag.metrics.trends.topGrowingExpenseCategory} cresceu de peso em relação aos meses anteriores.`
                        : 'Seus custos categorizados mantêm-se regulares sem saltos abruptos.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-2">Comportamento de Consumo Detectado</span>
                  <div className="space-y-2">
                    {diag.metrics.behaviorPatterns?.map((pattern, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        <span className="text-indigo-500 flex-shrink-0 mt-0.5">•</span>
                        <span>{pattern}</span>
                      </div>
                    ))}
                    {(!diag.metrics.behaviorPatterns || diag.metrics.behaviorPatterns.length === 0) && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 block italic">Analisando comportamentos de transações cadastradas...</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {raioXTab === 'previsoes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/50">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Previsão de Saldo (7 Dias)</span>
                    <span className={`text-base font-black block mt-1 ${diag.metrics.cashFlowForecast?.balance7D >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(diag.metrics.cashFlowForecast?.balance7D || 0)}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                      Saldo em conta estimado considerando despesas fixas prorrateadas e contas pendentes a vencer nos próximos 7 dias.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/50">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Previsão de Saldo (30 Dias)</span>
                    <span className={`text-base font-black block mt-1 ${diag.metrics.cashFlowForecast?.balance30D >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(diag.metrics.cashFlowForecast?.balance30D || 0)}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                      Resultado planejado ao fim do ciclo atual de competência com base em suas receitas estimadas e todas as despesas lançadas.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/50">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Tempo Limite de Caixa</span>
                    <span className="text-base font-black block mt-1 text-indigo-600 dark:text-indigo-400">
                      {diag.metrics.cashFlowForecast?.daysUntilZero !== null && diag.metrics.cashFlowForecast?.daysUntilZero !== undefined ? (
                        diag.metrics.cashFlowForecast.daysUntilZero === 0 ? '🚨 Caixa Zerado' : `⏳ ${diag.metrics.cashFlowForecast.daysUntilZero} dias`
                      ) : (
                        `🛡️ ${diag.metrics.runwayMonths?.toFixed(1)} meses`
                      )}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                      {diag.metrics.cashFlowForecast?.daysUntilZero !== null && diag.metrics.cashFlowForecast?.daysUntilZero !== undefined
                        ? 'Seu caixa mensal está deficitário. Indica em quantos dias seus recursos em conta zerarão neste ritmo.'
                        : 'Sua reserva de emergência e saldos cobrem esse tempo de despesas totais (Survival runway).'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">Sobras Mensais</span>
                    <span className={`text-sm font-black ${diag.metrics.monthlySurplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(diag.metrics.monthlySurplus)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">Pressão de Caixa (30D)</span>
                    <span className={`text-sm font-black ${diag.metrics.cashFlowPressure30D > 100 ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {diag.metrics.cashFlowPressure30D?.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">Comprometimento DTI</span>
                    <span className={`text-sm font-black ${diag.metrics.dtiRatio > 36 ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {diag.metrics.dtiRatio?.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">Custos de Vida Fixo</span>
                    <span className={`text-sm font-black ${diag.metrics.fixedOverheadIndex > 65 ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {diag.metrics.fixedOverheadIndex?.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {raioXTab === 'simulador' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Ajuste os valores abaixo para simular cenários de melhoria financeira ("E se...?") e veja o impacto instantâneo calculado de forma determinística no seu Score, Modo e Reserva!
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-3.5 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        <span>Aumento de Renda Mensal (+ R$)</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(simIncomeIncrease)}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="5000"
                        step="100"
                        value={simIncomeIncrease}
                        onChange={e => setSimIncomeIncrease(parseFloat(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        <span>Economia em Gastos Supérfluos (- R$)</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(simExpenseDecrease)}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="3000"
                        step="50"
                        value={simExpenseDecrease}
                        onChange={e => setSimExpenseDecrease(parseFloat(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    {debts.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          <span>Quitação/Amortização de Dívidas (R$)</span>
                          <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(simDebtReduction)}</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max={Math.round(debts.reduce((sum, d) => sum + d.totalAmount, 0))}
                          step="100"
                          value={simDebtReduction}
                          onChange={e => setSimDebtReduction(parseFloat(e.target.value))}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          setSimIncomeIncrease(0);
                          setSimExpenseDecrease(0);
                          setSimDebtReduction(0);
                        }}
                        className="text-[10px] font-black text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/15 py-1 px-3 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw size={10} />
                        Limpar Simulações
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-500/[0.02] border border-indigo-500/10 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-3.5">Resultado Simulado</span>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="font-semibold text-slate-500">Índice de Saúde:</span>
                          <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-100">
                            {fullDiagnosis.metrics.healthScore !== diag.metrics.healthScore && (
                              <span className="text-[10px] line-through text-slate-400">{fullDiagnosis.metrics.healthScore}</span>
                            )}
                            <span className={
                              diag.metrics.healthScore >= 80 ? 'text-emerald-500' :
                              diag.metrics.healthScore >= 60 ? 'text-sky-500' :
                              diag.metrics.healthScore >= 40 ? 'text-amber-500' :
                              'text-rose-500'
                            }>
                              {diag.metrics.healthScore} / 100
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="font-semibold text-slate-500">Modo de Saúde Reativo:</span>
                          <div className="flex items-center gap-1.5 font-bold">
                            {fullDiagnosis.mode !== diag.mode && (
                              <span className="text-[10px] line-through text-slate-400">{fullDiagnosis.mode}</span>
                            )}
                            <span className={`text-[10px] uppercase font-black tracking-wide border px-2 py-0.5 rounded-md ${getModeColor(diag.mode)}`}>
                              {diag.mode}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="font-semibold text-slate-500">Sobrevivência da Reserva (Runway):</span>
                          <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-100">
                            {fullDiagnosis.metrics.runwayMonths !== diag.metrics.runwayMonths && (
                              <span className="text-[10px] line-through text-slate-400">{fullDiagnosis.metrics.runwayMonths?.toFixed(1)}m</span>
                            )}
                            <span>{diag.metrics.runwayMonths?.toFixed(1)} meses</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-1">
                          <span className="font-semibold text-slate-500">Novas Sobras Mensais:</span>
                          <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-100">
                            {fullDiagnosis.metrics.monthlySurplus !== diag.metrics.monthlySurplus && (
                              <span className="text-[10px] line-through text-slate-400">{formatCurrency(fullDiagnosis.metrics.monthlySurplus)}</span>
                            )}
                            <span className={diag.metrics.monthlySurplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {formatCurrency(diag.metrics.monthlySurplus)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 leading-normal italic border-t border-slate-100 dark:border-slate-800/60 pt-2 text-center">
                      Cálculos em tempo real baseados em inteligência regulatória e lógica determinística.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderContas = () => {
    const totalPatrimonio = accounts.reduce((sum, curr) => sum + (accountBalances[curr.id] || 0), 0);

    return (
      <motion.div 
        key="contas"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-6 border-slate-100/80 dark:border-slate-800 bg-white dark:bg-slate-900 relative overflow-hidden animate-fade-in shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
              🏦
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">Distribuição do Dinheiro</h2>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Onde estão alocados seus recursos</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsManagingAccounts(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-colors flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-500/20 cursor-pointer"
            >
              <SlidersHorizontal size={13} />
              Gerenciar Contas
            </button>
            
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 px-4 py-2 rounded-2xl text-left sm:text-right">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">Patrimônio Total</span>
              <span className={`text-lg font-black ${totalPatrimonio >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(totalPatrimonio)}
              </span>
            </div>
          </div>
        </div>

        <div id="dashboard-accounts" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {accounts.map(acc => {
            const bal = accountBalances[acc.id] || 0;
            return (
              <div 
                key={acc.id} 
                className={`p-4 rounded-2xl bg-slate-50/40 dark:bg-slate-800/10 border ${acc.isMain ? 'border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-500/5' : 'border-slate-100/60 dark:border-slate-800/40'} flex items-center justify-between gap-3 group relative`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-xl">
                    {acc.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-semibold leading-none mb-1 flex items-center gap-1.5">
                      {acc.name}
                      {acc.isMain && (
                        <span className="text-[8px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap">
                          Principal
                        </span>
                      )}
                    </span>
                    <span className={`text-base font-bold block truncate ${bal >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(bal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const renderAnaliseMensal = () => (
    <div key="analiseMensal" className="glass-card p-6 animate-fade-in">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Análise Mensal (Inclui Lançamentos Futuros)</h2>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 text-center">
          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Prev. Receitas</div>
          <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">{formatCurrency(projectedIncome)}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 text-center">
          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Prev. Gastos</div>
          <div className="font-bold text-rose-600 dark:text-rose-400 text-sm sm:text-base">{formatCurrency(projectedExpenses)}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 text-center">
          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">Previsão de Saldo</div>
          <div className={`font-bold text-sm sm:text-base ${projectedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {projectedBalance >= 0 ? '+' : ''}{formatCurrency(projectedBalance)}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContasAPagar = () => {
    if (pendingBills.length === 0) return null;
    return (
      <div key="contasAPagar" className="glass-card p-6 animate-fade-in">
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
    );
  };

  const renderDistribuicao = () => {
    const isDarkMode = typeof window !== 'undefined' ? document.documentElement.classList.contains('dark') : false;
    const transactions = data.transactions || [];
    
    // Group transactions by category based on selected type ('expense' or 'income')
    const grouped: Record<string, number> = {};
    transactions
      .filter(t => t.type === chartDataType && !t.isPending)
      .forEach(t => {
        const cat = t.category || (chartDataType === 'income' ? 'Outras Receitas' : 'Outras Despesas');
        grouped[cat] = (grouped[cat] || 0) + t.amount;
      });
      
    const total = Object.values(grouped).reduce((sum, val) => sum + val, 0);
    
    // Convert to array and sort descending by amount
    const chartDataList = Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    const CATEGORY_COLORS = [
      '#3b82f6', // blue-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#ef4444', // red-500
      '#06b6d4', // cyan-500
      '#14b8a6', // teal-500
      '#6366f1', // indigo-500
      '#f97316', // orange-500
      '#a855f7', // purple-500
    ];

    const pieData = chartDataList.map((item, idx) => ({
      ...item,
      fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
    }));

    return (
      <div key="distribuicao" className="glass-card p-6 animate-fade-in border-slate-100/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="text-left">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>📊</span> Análise por Categoria
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Veja onde está gastando ou recebendo este mês</p>
          </div>
          
          {/* Controls Container */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Expense vs Income Toggle */}
            <div className="bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex shrink-0">
              <button
                onClick={() => setChartDataType('expense')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartDataType === 'expense'
                    ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Gastos
              </button>
              <button
                onClick={() => setChartDataType('income')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartDataType === 'income'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Receitas
              </button>
            </div>

            {/* Pie vs Bar Chart Toggle */}
            <div className="bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex shrink-0">
              <button
                onClick={() => setChartViewType('pizza')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartViewType === 'pizza'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Gráfico de Pizza"
              >
                🍕 Pizza
              </button>
              <button
                onClick={() => setChartViewType('barras')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartViewType === 'barras'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Gráfico de Barras"
              >
                📊 Barras
              </button>
            </div>
          </div>
        </div>

        {pieData.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-2 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <span>📭</span>
            <span>Nenhuma transação de {chartDataType === 'expense' ? 'gasto' : 'receita'} lançada este mês.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Chart Side */}
            <div className="lg:col-span-6 h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                {chartViewType === 'pizza' ? (
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a'
                      }}
                    />
                  </PieChart>
                ) : (
                  <BarChart data={pieData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `R$${val}`}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a'
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* List Side */}
            <div className="lg:col-span-6 space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              <div className="flex justify-between items-center mb-1 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Categoria</span>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Total ({formatCurrency(total)})</span>
              </div>
              {pieData.map((item, index) => (
                <div 
                  key={item.name} 
                  className="flex items-center justify-between p-2 rounded-2xl bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100/30 dark:border-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: item.fill }} 
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEnvelopes = () => (
    <div key="envelopes" className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
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
              {name === 'Reserva/Dívidas' ? (
                remaining < 0 ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Superávit: +{formatCurrency(Math.abs(remaining))}
                  </span>
                ) : remaining === 0 ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Meta Atingida!
                  </span>
                ) : (
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Falta: {formatCurrency(remaining)}
                  </span>
                )
              ) : (
                remaining < 0 ? (
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    Excedido: {formatCurrency(Math.abs(remaining))}
                  </span>
                ) : remaining === 0 ? (
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Limite Atingido
                  </span>
                ) : (
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Resta: {formatCurrency(remaining)}
                  </span>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderDividas = () => {
    if (budgetMode !== '70-0-30' && debts.length === 0) return null;
    return (
      <div key="dividas" className="animate-fade-in">
        <DebtsSection 
          debts={debts} 
          addDebt={addDebt!} 
          deleteDebt={deleteDebt!} 
          totalIncome={totalIncome}
        />
      </div>
    );
  };

  const renderCofrinho = () => (
    <div key="cofrinho" className="glass-card p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Target size={18} className="text-indigo-500" />
          Resumo do Cofrinho (Metas e Sonhos)
        </h2>
        <button 
          onClick={() => {
            if (onOpenGoalForm) onOpenGoalForm();
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
                const act = t.account || 'banco';
                const toAct = t.toAccount;
                if (t.type === 'transfer_to_savings' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas') || (t.type === 'income' && isReserva(act)) || (t.type === 'transfer_between_accounts' && isReserva(toAct))) {
                  return mSum + t.amount;
                }
                if (t.type === 'transfer_from_savings' || (t.type === 'expense' && isReserva(act) && t.bucket !== 'Reserva/Dívidas') || (t.type === 'transfer_between_accounts' && isReserva(act))) {
                  return mSum - t.amount;
                }
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
                        if (onOpenGoalForm) onOpenGoalForm(goal);
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
  );

  const renderEvolucao = () => (
    <div key="evolucao" className="glass-card p-6 animate-fade-in">
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
  );

  const renderReflexao = () => (
    <div key="reflexao" id="dashboard-reflexao" className="glass-card p-6 animate-fade-in">
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
      {(() => {
        const unconfirmed = fullDiagnosis.parsedCommitments.filter(c => c.source === 'nota_geral' && c.amount && c.amount > 0);
        if (unconfirmed.length === 0) return null;

        const handleConfirmCommitment = (c: typeof unconfirmed[0]) => {
          if (!addTransaction || !c.amount) return;
          
          let txType: 'income' | 'expense' | 'transfer_to_savings' = 'expense';
          let bucket: Bucket = 'Necessidades';
          let category = c.category || 'Outros';

          if (c.type === 'receita') {
            txType = 'income';
            bucket = 'Renda';
            category = 'Entradas';
          } else if (c.type === 'divida') {
            txType = 'expense';
            bucket = 'Reserva/Dívidas';
            category = 'Passivos';
          } else if (c.type === 'oportunidade') {
            txType = 'transfer_to_savings';
            bucket = 'Reserva/Dívidas';
            category = 'Poupança';
          } else if (c.type === 'despesa') {
            txType = 'expense';
            bucket = 'Necessidades';
            category = 'Contas Fixas';
          }

          let date = `${data.monthId}-01`;
          if (c.dateStr) {
            const match = c.dateStr.match(/(\d+)/);
            if (match) {
              const day = Math.max(1, Math.min(28, parseInt(match[1])));
              date = `${data.monthId}-${String(day).padStart(2, '0')}`;
            }
          } else {
            const todayStr = new Date().toISOString().split('T')[0];
            if (todayStr.startsWith(data.monthId)) {
              date = todayStr;
            }
          }

          addTransaction(data.monthId, {
            type: txType,
            amount: c.amount,
            description: c.text,
            date,
            bucket,
            category,
            isPending: false,
            account: 'banco'
          });
        };

        return (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
              <span>✨</span> Anotações Inteligentes Detectadas
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 leading-relaxed">
              O Copiloto identificou compromissos em seu texto. Clique para confirmar e lançá-los como transações reais:
            </p>
            <div className="space-y-2">
              {unconfirmed.map((c, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">
                      {c.type === 'receita' ? '💰' : c.type === 'divida' ? '🎯' : c.type === 'oportunidade' ? '🛡️' : '📅'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate leading-snug">{c.text}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold uppercase tracking-wider bg-slate-150 dark:bg-slate-800 px-1.5 py-0.2 rounded-md text-[9px]">
                          {c.category}
                        </span>
                        <span>•</span>
                        <span>{c.dateStr || 'Neste ciclo'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                      {formatCurrency(c.amount || 0)}
                    </span>
                    <button
                      onClick={() => handleConfirmCommitment(c)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-xl text-[10px] font-bold shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer h-8 w-8"
                      title="Confirmar e Lançar Transação"
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );

  const renderSabedoria = () => (
    <div key="sabedoria" className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 text-slate-100 p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-900/20 dark:shadow-black/40 border border-slate-700/50 animate-fade-in">
      <div className="absolute -top-6 -right-6 p-4 opacity-5 transform rotate-12 scale-150">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Sabedoria Financeira</h3>
      <p className="font-serif italic text-lg leading-relaxed text-slate-200 dark:text-slate-300">{quote}</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-24">
      <header className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/90 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100/80 dark:border-slate-800 transition-colors">
        <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 mb-4">
          {/* Saldo Inicial - Esquerda */}
          <div className="text-center sm:text-left bg-slate-50/50 dark:bg-slate-800/10 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1">Inicial</span>
            <span className={`font-bold text-xs sm:text-sm block truncate ${previousBalance >= 0 ? 'text-slate-600 dark:text-slate-300' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(previousBalance)}
            </span>
          </div>

          {/* Saldo Atual - Centro (Tamanho Maior) */}
          <div className="text-center py-2 px-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider block mb-0.5">Saldo Atual</span>
            <span className={`text-xl sm:text-4xl md:text-5xl font-black tracking-tight block truncate ${currentBalance >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(currentBalance)}
            </span>
          </div>

          {/* Previsão - Direita */}
          <div className="text-center sm:text-right bg-slate-50/50 dark:bg-slate-800/10 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1">Previsão</span>
            <span className={`font-bold text-xs sm:text-sm block truncate ${projectedBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(projectedBalance)}
            </span>
          </div>
        </div>

        <div className="flex gap-4 text-xs mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 justify-around text-slate-500 dark:text-slate-400">
          <div>
            Entradas: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncome)}</span>
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
          <div>
            Saídas: <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(totalExpenses)}</span>
          </div>
        </div>
      </header>

      {/* Central de Notificações e Alertas do APK/Web */}
      {(alerts.length > 0 || permissionStatus === 'default') && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-colors flex flex-col gap-4 text-left"
        >
          {/* Solicitar Permissão de Notificação */}
          {permissionStatus === 'default' && (
            <div className="flex items-center justify-between gap-3 bg-emerald-50/50 dark:bg-emerald-500/5 p-3.5 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Bell size={18} className="animate-bounce" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">Habilitar Notificações</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Quer receber avisos de contas e receitas a vencer no seu celular?
                  </p>
                </div>
              </div>
              <button
                onClick={handleRequestPermission}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
              >
                Ativar
              </button>
            </div>
          )}

          {/* Lista de Alertas Ativos */}
          {alerts.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <BellRing size={16} className="text-amber-500 animate-pulse" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                </div>
                <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Avisos Importantes ({alerts.length})</h3>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {alerts.map((alert) => {
                  const tx = alert.transaction;
                  const isIncome = tx.type === 'income';
                  const isToday = alert.type === 'today';
                  return (
                    <div 
                      key={`${tx.id}_${alert.type}`}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                        isToday 
                          ? 'bg-rose-50/30 dark:bg-rose-950/5 border-rose-100/50 dark:border-rose-900/10' 
                          : 'bg-amber-50/30 dark:bg-amber-950/5 border-amber-100/50 dark:border-amber-900/10'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className={`shrink-0 mt-0.5 text-[9px] px-2 py-0.5 rounded-full font-extrabold tracking-wider uppercase ${
                          isToday 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' 
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {isToday ? 'Vence Hoje' : 'Amanhã'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate leading-snug">
                            {tx.description}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                            {isIncome ? 'Receita' : 'Conta'} de <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-700 dark:text-slate-300 font-extrabold'}>{formatCurrency(tx.amount)}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (onTogglePending) {
                            onTogglePending(alert.monthId, tx.id);
                          }
                        }}
                        className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-extrabold transition-all border cursor-pointer ${
                          isIncome 
                            ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700' 
                            : 'bg-slate-800 border-slate-800 text-white hover:bg-slate-900 dark:bg-slate-700 dark:border-slate-700 dark:hover:bg-slate-600'
                        }`}
                      >
                        <Check size={11} strokeWidth={3} />
                        <span>{isIncome ? 'Marcar Recebido' : 'Confirmar Pagamento'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Barra de Ações para Reordenação */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/60 dark:border-slate-800/80 transition-colors">
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <SlidersHorizontal size={16} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block leading-tight">Organizar Painel</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Mude a ordem dos cartões da forma que desejar</span>
          </div>
        </div>
        <button
          onClick={() => setIsOrganizerOpen(true)}
          className="flex items-center gap-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800 hover:border-emerald-500 hover:bg-white dark:hover:bg-slate-900 hover:text-emerald-600 dark:hover:text-emerald-400 py-2.5 px-4 rounded-2xl transition-all shadow-sm cursor-pointer"
        >
          Personalizar Layout
        </button>
      </div>

      {/* Cartões Dinâmicos Ordenados */}
      {activeCardOrder.map((key) => {
        switch (key) {
          case 'raioX': return renderRaioX();
          case 'contas': return renderContas();
          case 'analiseMensal': return renderAnaliseMensal();
          case 'contasAPagar': return renderContasAPagar();
          case 'distribuicao': return renderDistribuicao();
          case 'envelopes': return renderEnvelopes();
          case 'dividas': return renderDividas();
          case 'cofrinho': return renderCofrinho();
          case 'evolucao': return renderEvolucao();
          case 'reflexao': return renderReflexao();
          case 'sabedoria': return renderSabedoria();
          default: return null;
        }
      })}

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

        {isOrganizerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOrganizerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div className="text-left">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <SlidersHorizontal className="text-emerald-500" size={20} />
                    Organizar Painel
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Reordene os blocos usando as setas ou arrastando</p>
                </div>
                <button onClick={() => setIsOrganizerOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-3 flex-1">
                {activeCardOrder.map((key, index) => {
                  const card = CARD_LABELS[key];
                  if (!card) return null;
                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800 rounded-2xl transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-400 dark:text-slate-600 cursor-grab active:cursor-grabbing">
                          <GripVertical size={16} />
                        </div>
                        <span className="text-lg">{card.icon}</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{card.label}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          disabled={index === 0}
                          onClick={() => handleMove(index, 'up')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-all cursor-pointer"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          disabled={index === activeCardOrder.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-all cursor-pointer"
                        >
                          <ArrowDown size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  onClick={handleResetOrder}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  Restaurar Padrão
                </button>
                <button
                  onClick={() => setIsOrganizerOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                >
                  Confirmar Layout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal de Gerenciamento de Contas */}
        {isManagingAccounts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-4 sm:p-0"
            onClick={() => {
              setIsManagingAccounts(false);
              handleCancelForm();
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  🏦 Gerenciar Contas
                </h3>
                <button 
                  onClick={() => {
                    setIsManagingAccounts(false);
                    handleCancelForm();
                  }} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {(editingAccount || showCreateAccount) ? (
                  <div className="space-y-4 animate-fade-in bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-left">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {showCreateAccount ? 'Criar Nova Conta' : `Editar Conta: ${editingAccount?.name}`}
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nome da Conta</label>
                      <input
                        type="text"
                        required
                        value={accFormName}
                        onChange={e => setAccFormName(e.target.value)}
                        placeholder="Ex: Nubank, Carteira de Investimentos"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3 px-4 outline-none focus:border-indigo-500 transition-all font-medium text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Ícone / Emoji</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {['🏦', '💰', '💵', '💳', '🐷', '🪙', '📈', '🏠', '💼', '🎒', '⚡', '🚗'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setAccFormIcon(emoji)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg border transition-all ${accFormIcon === emoji ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 scale-105' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Ou digite o seu:</span>
                        <input
                          type="text"
                          maxLength={2}
                          value={accFormIcon}
                          onChange={e => setAccFormIcon(e.target.value)}
                          className="w-12 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg py-1 px-1.5 outline-none font-medium text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 py-1">
                      <input
                        type="checkbox"
                        id="accFormIsMain"
                        checked={accFormIsMain}
                        onChange={e => setAccFormIsMain(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <label htmlFor="accFormIsMain" className="text-sm text-slate-700 dark:text-slate-300 select-none cursor-pointer font-medium">
                        Definir como Conta Principal
                      </label>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={handleCancelForm}
                        className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveAccountForm}
                        disabled={!accFormName.trim()}
                        className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 disabled:pointer-events-none transition-colors shadow-sm"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900">
                      {accounts.map(acc => (
                        <div key={acc.id} className="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-colors text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl font-bold">{acc.icon}</span>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 block truncate flex items-center gap-1.5">
                                {acc.name}
                                {acc.isMain && (
                                  <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap">
                                    Principal
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {acc.type === 'custom' ? 'Conta Customizada' : 'Conta do Sistema'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleOpenEditAccount(acc)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            {acc.type === 'custom' && (
                              <button
                                onClick={() => deleteAccount && deleteAccount(acc.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleOpenCreateAccount}
                      className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                    >
                      <Plus size={15} />
                      Criar Nova Conta
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 flex justify-end">
                <button
                  onClick={() => {
                    setIsManagingAccounts(false);
                    handleCancelForm();
                  }}
                  className="py-3 px-6 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
