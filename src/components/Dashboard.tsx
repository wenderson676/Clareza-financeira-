import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { HelpCircle, X, Calendar, ArrowRight, Target, Plus, Trash, Edit2, CheckCircle2, Lightbulb, SlidersHorizontal, ArrowUp, ArrowDown, RotateCcw, GripVertical } from 'lucide-react';
import { formatCurrency, getBucketsConfig, BUCKET_EXPLANATIONS, getRandomVerse } from '../lib/utils';
import { MonthlyData, Goal, BudgetMode, Debt } from '../types';
import { DebtsSection } from './DebtsSection';
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
  debts?: Debt[];
  addDebt?: (debt: Omit<Debt, 'id'>) => void;
  updateDebt?: (id: string, debt: Partial<Debt>) => void;
  deleteDebt?: (id: string) => void;
  onSaveNote?: (note: string) => void;
  budgetMode?: BudgetMode;
  dashboardCardOrder?: string[];
  setCardOrder?: (order: string[]) => void;
}

export function Dashboard({ 
  data, 
  previousBalance, 
  allData, 
  goals = [], 
  addGoal, 
  updateGoal, 
  deleteGoal, 
  debts = [],
  addDebt,
  updateDebt,
  deleteDebt,
  onSaveNote, 
  budgetMode = '50-30-20',
  dashboardCardOrder = [],
  setCardOrder
}: DashboardProps) {
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
    'raioX',
    'analiseMensal',
    'contasAPagar',
    'distribuicao',
    'envelopes',
    'dividas',
    'cofrinho',
    'evolucao',
    'reflexao',
    'sabedoria'
  ];

  const CARD_LABELS: Record<string, { label: string; icon: string }> = {
    raioX: { label: 'Raio-X Financeiro', icon: '🔍' },
    analiseMensal: { label: 'Análise Mensal', icon: '📊' },
    contasAPagar: { label: 'Contas a Pagar', icon: '📅' },
    distribuicao: { label: 'Distribuição de Gastos', icon: '🍕' },
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

  const renderRaioX = () => (
    <motion.div 
      key="raioX"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-6 border-emerald-500/10 dark:border-emerald-500/20 bg-gradient-to-b from-white to-emerald-50/5 dark:from-slate-900 dark:to-emerald-950/5 relative overflow-hidden animate-fade-in"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full filter blur-2xl pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
          🔍
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">Raio-X Financeiro</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Diagnóstico automático do seu comportamento de gastos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* 1. Seu modo atual */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">1. Seu Modo Atual</span>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{raioX.status.icon}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${raioX.status.color}`}>
                {raioX.status.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {raioX.status.desc}
            </p>
          </div>
          <div className="text-[10px] text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            Modo Operacional: <span className="font-semibold">{budgetMode === '50-30-20' ? '50/30/20 (Padrão)' : budgetMode === '80-10-10' ? '80/10/10 (Sobrevivência)' : '90/5/5 (Crise)'}</span>
          </div>
        </div>

        {/* 2. Maior problema hoje */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">2. Maior Problema Hoje</span>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">
                {raioX.problem.type === 'danger' ? '🚨' : raioX.problem.type === 'warning' ? '⚠️' : raioX.problem.type === 'success' ? '✨' : 'ℹ️'}
              </span>
              <span className={`text-xs font-bold ${
                raioX.problem.type === 'danger' ? 'text-rose-600 dark:text-rose-400' :
                raioX.problem.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                raioX.problem.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                'text-slate-600 dark:text-slate-400'
              }`}>
                {raioX.problem.title}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {raioX.problem.desc}
            </p>
          </div>
        </div>

        {/* 3. O que fazer agora */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">3. O que Fazer Agora</span>
            <div className="flex items-start gap-2">
              <Lightbulb size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {raioX.action}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Previsão do mês */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">4. Previsão do Mês</span>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {raioX.forecast}
            </p>
          </div>
        </div>

        {/* 5. Missão da semana */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 flex flex-col justify-between md:col-span-2 lg:col-span-2">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-2">5. Missão da Semana</span>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs font-bold">
                ✓
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {raioX.mission}
              </p>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );

  const renderAnaliseMensal = () => (
    <div key="analiseMensal" className="glass-card p-6 animate-fade-in">
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

    return (
      <div key="distribuicao" className="glass-card p-6 animate-fade-in">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Distribuição de Gastos</h2>
        
        {pieData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            Nenhum dado para exibir ainda.
          </div>
        ) : (
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
              <span className={`font-medium ${remaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                Resta: {formatCurrency(remaining)}
              </span>
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
    <div key="reflexao" className="glass-card p-6 animate-fade-in">
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
