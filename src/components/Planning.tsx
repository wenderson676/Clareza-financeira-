import React, { useMemo, useState } from 'react';
import { MonthlyData, BudgetMode, Debt, Goal, Account } from '../types';
import { generateFinancialDiagnosis, answerFinancialQuery, FinancialMode, RiskLevel } from '../lib/financialEngine';
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Compass, 
  Activity, 
  ArrowRight, 
  BrainCircuit, 
  ShieldAlert, 
  Zap, 
  Lightbulb, 
  Clock, 
  Info, 
  FileText, 
  Save, 
  MessageSquare, 
  Send, 
  TrendingDown, 
  DollarSign, 
  User, 
  Calculator, 
  CheckSquare, 
  HelpCircle,
  RefreshCw,
  X
} from 'lucide-react';

interface PlanningProps {
  data: MonthlyData;
  allData: Record<string, MonthlyData>;
  previousBalance: number;
  budgetMode?: BudgetMode;
  debts: Debt[];
  goals: Goal[];
  accounts: Account[];
  onSaveNote?: (note: string) => void;
}

export function Planning({ 
  data, 
  allData, 
  previousBalance, 
  budgetMode = '50-30-20', 
  debts, 
  goals, 
  accounts,
  onSaveNote 
}: PlanningProps) {
  
  const [selectedMetricHelp, setSelectedMetricHelp] = useState<string | null>(null);

  // Friendly explanations for metrics
  const metricDescriptions: Record<string, { title: string; desc: string }> = {
    savingsRate: {
      title: 'Taxa de Poupança',
      desc: 'Este índice mostra o percentual de dinheiro que sobra limpo no fim do mês. Guardar parte do que você ganha é o motor para realizar seus sonhos e metas!'
    },
    dtiRatio: {
      title: 'Índice DTI (Compromisso de Dívidas)',
      desc: 'Mapeia quanto da sua renda mensal está sendo engolida pelo pagamento de parcelas, carnês ou dívidas ativas. O recomendado é manter esse percentual abaixo de 35% para evitar sufoco.'
    },
    fixedOverhead: {
      title: 'Custo de Vida Fixo',
      desc: 'Mede o peso das suas despesas fixas obrigatórias (como aluguel, condomínio, luz, água e mercado básico) sobre sua receita. O ideal de segurança é manter este valor sob 50%.'
    },
    runway: {
      title: 'Runway (Reserva de Sobrevivência)',
      desc: 'Mostra quantos meses você conseguiria honrar seus custos de vida caso ficasse sem qualquer receita a partir de hoje. É o índice que mede sua paz financeira e proteção em imprevistos.'
    },
    cashFlowPressure: {
      title: 'Pressão de Caixa (30 Dias)',
      desc: 'Mede o nível de aperto do seu dinheiro para as próximas semanas. Acima de 90% significa risco de déficit, ou seja, quase todo o dinheiro disponível já está comprometido.'
    }
  };

  // Action plan completed state (local UI feedback to allow checking items off)
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  // Memoized dynamic diagnostic engine
  const diagnosis = useMemo(() => {
    return generateFinancialDiagnosis(data, allData, previousBalance, debts, goals, accounts);
  }, [data, allData, previousBalance, debts, goals, accounts]);

  const toggleTask = (taskKey: string) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };

  // Color mappings
  const modeStyles: Record<FinancialMode, { bg: string; text: string; border: string; desc: string }> = {
    'Crise': {
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-900/30',
      desc: 'Renda comprometida ou déficit. Foco total em proteção de caixa e quitação vital.'
    },
    'Sobrevivência': {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-900/30',
      desc: 'Contas pagas no limite, sem margem. Foco em estancar vazamentos e criar micro-reserva.'
    },
    'Estabilização': {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-900/30',
      desc: 'Orçamento equilibrado, mas com pouca reserva. Foco em poupar 15% e quitar parcelamentos.'
    },
    'Construção': {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-900/30',
      desc: 'Superávit saudável e constante. Foco em investimentos inteligentes e metas ousadas.'
    },
    'Expansão': {
      bg: 'bg-indigo-50 dark:bg-indigo-950/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-900/30',
      desc: 'Patrimônio blindado e renda passiva em crescimento. Foco em diversificação e liberdade.'
    }
  };

  const riskStyles: Record<RiskLevel, { bg: string; text: string; badge: string }> = {
    'Crítico': { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
    'Alto': { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
    'Moderado': { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
    'Baixo': { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
    'Mínimo': { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const hasNoData = data.transactions.length === 0 && debts.length === 0 && goals.length === 0;

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Header Banner */}
      <header className="bg-slate-900 dark:bg-slate-950 p-6 sm:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden border border-slate-800">
        <div className="absolute -right-10 -bottom-10 opacity-[0.03] dark:opacity-10 pointer-events-none">
          <BrainCircuit size={180} />
        </div>
        <div className="relative z-10">
          <span className="text-[10px] font-black tracking-widest bg-emerald-500/20 text-emerald-400 uppercase py-1 px-3 rounded-full">
            Módulo de Inteligência
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">Contador Pessoal Inteligente</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md">
            Análise profunda de anotações, projeções matemáticas e consultoria de bolso baseada inteiramente nos dados do seu app.
          </p>
        </div>
      </header>

      {hasNoData ? (
        <div className="glass-card p-10 text-center rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <Target className="mx-auto text-slate-300 dark:text-slate-600" size={56} />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Sem dados suficientes</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Para liberar a consultoria e os cálculos de projeção do seu contador, registre suas receitas, despesas, parcelamentos ou anotações na aba principal.
          </p>
        </div>
      ) : (
        <>
          {/* Main Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Financial Mode Diagnostic */}
            <div id="planning-diagnosis" className={`p-6 rounded-3xl border ${modeStyles[diagnosis.mode].border} ${modeStyles[diagnosis.mode].bg} space-y-4 shadow-sm`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fase Financeira Atual</span>
                  <h4 className={`text-2xl font-black ${modeStyles[diagnosis.mode].text}`}>{diagnosis.mode}</h4>
                </div>
                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${riskStyles[diagnosis.riskLevel].badge}`}>
                  Risco: {diagnosis.riskLevel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {modeStyles[diagnosis.mode].desc}
              </p>
              <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800/40">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Compass size={14} className={modeStyles[diagnosis.mode].text} /> Diretriz Principal:
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {diagnosis.recommendation}
                </p>
                {diagnosis.recommendedBudgetMode && diagnosis.recommendedBudgetMode !== budgetMode && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-slate-950/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Recomendação de Configuração:</span> O modelo financeiro identificou que seu momento requer a distribuição <span className="font-bold text-indigo-600 dark:text-indigo-400">{
                      diagnosis.recommendedBudgetMode === '90-5-5' ? 'Crise (90/5/5)' :
                      diagnosis.recommendedBudgetMode === '80-10-10' ? 'Sobrevivência (80/10/10)' :
                      diagnosis.recommendedBudgetMode === '70-0-30' ? 'Quitar Dívidas (70/0/30)' :
                      diagnosis.recommendedBudgetMode === '50-20-30' ? 'Prosperar (50/20/30)' :
                      'Padrão (50/30/20)'
                    }</span>, mas você está operando em <b>{
                      budgetMode === '90-5-5' ? 'Crise (90/5/5)' :
                      budgetMode === '80-10-10' ? 'Sobrevivência (80/10/10)' :
                      budgetMode === '70-0-30' ? 'Quitar Dívidas (70/0/30)' :
                      budgetMode === '50-20-30' ? 'Prosperar (50/20/30)' :
                      'Padrão (50/30/20)'
                    }</b>. Para alterar, use a configuração de Divisão de Orçamento (ícone de alvo).
                  </div>
                )}
              </div>
            </div>

            {/* Crucial Alerts & Problem Mappings */}
            <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="text-rose-500" size={14} /> Principal Gargalo / Alerta
                </h4>
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400 leading-relaxed bg-rose-50 dark:bg-rose-950/10 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/20">
                  <strong className="block font-black uppercase tracking-wider text-[10px] mb-1 text-rose-800 dark:text-rose-300">{diagnosis.mainProblem?.title}</strong>
                  <span className="font-medium">{diagnosis.mainProblem?.desc}</span>
                </p>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="text-emerald-500" size={14} /> Seus Pontos Fortes
                </h4>
                <ul className="space-y-1.5">
                  {diagnosis.strongPoints.slice(0, 2).map((pt, index) => (
                    <li key={index} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5 font-medium leading-tight">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

          {/* Professional Financial Metrics Dashboard */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calculator size={18} className="text-emerald-500" />
                Gauges e Projeções de Custos
              </h3>
              <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 animate-pulse bg-indigo-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                Clique nos <HelpCircle size={10} /> para entender
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              
              {/* Savings Rate */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center relative group">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1 mb-1">
                  Taxa de Poupança
                  <button 
                    onClick={() => setSelectedMetricHelp(selectedMetricHelp === 'savingsRate' ? null : 'savingsRate')}
                    className="p-0.5 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
                    title="Explicar"
                  >
                    <HelpCircle size={12} />
                  </button>
                </span>
                <span className={`text-lg font-black block ${diagnosis.metrics.savingsRate > 20 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {diagnosis.metrics.savingsRate.toFixed(1)}%
                </span>
                <p className="text-[9px] text-slate-400 mt-1">Ideal: acima de 20%</p>
              </div>

              {/* Debt to Income Ratio */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center relative group">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1 mb-1">
                  Índice DTI
                  <button 
                    onClick={() => setSelectedMetricHelp(selectedMetricHelp === 'dtiRatio' ? null : 'dtiRatio')}
                    className="p-0.5 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
                    title="Explicar"
                  >
                    <HelpCircle size={12} />
                  </button>
                </span>
                <span className={`text-lg font-black block ${diagnosis.metrics.dtiRatio > 35 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {diagnosis.metrics.dtiRatio.toFixed(1)}%
                </span>
                <p className="text-[9px] text-slate-400 mt-1">Alerta: acima de 35%</p>
              </div>

              {/* Fixed Cost Overhead */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center relative group">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1 mb-1">
                  Custo Fixo
                  <button 
                    onClick={() => setSelectedMetricHelp(selectedMetricHelp === 'fixedOverhead' ? null : 'fixedOverhead')}
                    className="p-0.5 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
                    title="Explicar"
                  >
                    <HelpCircle size={12} />
                  </button>
                </span>
                <span className={`text-lg font-black block ${diagnosis.metrics.fixedOverheadIndex > 65 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {diagnosis.metrics.fixedOverheadIndex.toFixed(1)}%
                </span>
                <p className="text-[9px] text-slate-400 mt-1">Recomendado: até 50%</p>
              </div>

              {/* Runway months */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center relative group">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1 mb-1">
                  Runway
                  <button 
                    onClick={() => setSelectedMetricHelp(selectedMetricHelp === 'runway' ? null : 'runway')}
                    className="p-0.5 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
                    title="Explicar"
                  >
                    <HelpCircle size={12} />
                  </button>
                </span>
                <span className={`text-lg font-black block ${diagnosis.metrics.runwayMonths < 1 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {diagnosis.metrics.runwayMonths === 99 ? '∞' : `${diagnosis.metrics.runwayMonths.toFixed(1)}m`}
                </span>
                <p className="text-[9px] text-slate-400 mt-1">Paz em emergências</p>
              </div>

              {/* Cash Flow Pressure 30D */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-center relative group">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1 mb-1">
                  Pressão 30D
                  <button 
                    onClick={() => setSelectedMetricHelp(selectedMetricHelp === 'cashFlowPressure' ? null : 'cashFlowPressure')}
                    className="p-0.5 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
                    title="Explicar"
                  >
                    <HelpCircle size={12} />
                  </button>
                </span>
                <span className={`text-lg font-black block ${diagnosis.metrics.cashFlowPressure30D > 90 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {diagnosis.metrics.cashFlowPressure30D.toFixed(0)}%
                </span>
                <p className="text-[9px] text-slate-400 mt-1">Risco &gt; 90%</p>
              </div>

            </div>

            {/* Dynamic Metric Explanation Drawer */}
            {selectedMetricHelp && metricDescriptions[selectedMetricHelp] && (
              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-950/20 p-4 rounded-2xl relative animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={() => setSelectedMetricHelp(null)}
                  className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  title="Fechar explicação"
                >
                  <X size={14} />
                </button>
                <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
                  <HelpCircle size={14} className="text-indigo-500" />
                  Como ler seu indicador: {metricDescriptions[selectedMetricHelp].title}
                </h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pr-6">
                  {metricDescriptions[selectedMetricHelp].desc}
                </p>
              </div>
            )}

            {/* Calculations and Surplus info */}
            <div className="bg-slate-100/50 dark:bg-slate-900/30 p-4 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                <span>Total de Recursos Disponíveis (Patrimônio Líquido Estimado):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatBRL(diagnosis.metrics.totalAssets)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                <span>Dívidas de Consumo/Passivos Ativos:</span>
                <span className="font-bold text-rose-500">-{formatBRL(diagnosis.metrics.totalDebts)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Sobras Reais do Período (Superávit Livre):</span>
                <span className={`font-black ${diagnosis.metrics.monthlySurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatBRL(diagnosis.metrics.monthlySurplus)}
                </span>
              </div>
            </div>
          </div>



          {/* Structured Interactive Action Plan */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Zap size={18} className="text-amber-500" />
                Roteiro de Ação Recomendado (Checklist)
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                Complete as metas do ciclo
              </span>
            </div>

            <div className="space-y-6">
              
              {/* TODAY */}
              {diagnosis.actionPlan.today.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1.5 uppercase">
                    <Clock size={12} /> Hoje (Foco Imediato)
                  </h4>
                  <div className="space-y-1.5">
                    {diagnosis.actionPlan.today.map((task, i) => {
                      const key = `today-${i}`;
                      const isDone = completedTasks[key];
                      return (
                        <div 
                          key={i} 
                          onClick={() => toggleTask(key)}
                          className={`p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer text-xs select-none ${
                            isDone 
                              ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-100 dark:border-slate-800 line-through' 
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-rose-100 dark:border-rose-950/20 hover:bg-slate-50/50'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={!!isDone} 
                            readOnly 
                            className="mt-0.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" 
                          />
                          <span>{task}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NEXT 7 DAYS */}
              {diagnosis.actionPlan.next7Days.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5 uppercase">
                    <Clock size={12} /> Próximos 7 dias (Tático)
                  </h4>
                  <div className="space-y-1.5">
                    {diagnosis.actionPlan.next7Days.map((task, i) => {
                      const key = `week-${i}`;
                      const isDone = completedTasks[key];
                      return (
                        <div 
                          key={i} 
                          onClick={() => toggleTask(key)}
                          className={`p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer text-xs select-none ${
                            isDone 
                              ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-100 dark:border-slate-800 line-through' 
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-amber-100 dark:border-amber-950/20 hover:bg-slate-50/50'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={!!isDone} 
                            readOnly 
                            className="mt-0.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" 
                          />
                          <span>{task}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NEXT 30 DAYS */}
              {diagnosis.actionPlan.next30Days.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 uppercase">
                    <Clock size={12} /> Próximos 30 dias (Mensal)
                  </h4>
                  <div className="space-y-1.5">
                    {diagnosis.actionPlan.next30Days.map((task, i) => {
                      const key = `month-${i}`;
                      const isDone = completedTasks[key];
                      return (
                        <div 
                          key={i} 
                          onClick={() => toggleTask(key)}
                          className={`p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer text-xs select-none ${
                            isDone 
                              ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-100 dark:border-slate-800 line-through' 
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-emerald-100 dark:border-emerald-950/20 hover:bg-slate-50/50'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={!!isDone} 
                            readOnly 
                            className="mt-0.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" 
                          />
                          <span>{task}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NEXT 90 DAYS */}
              {diagnosis.actionPlan.next90Days && diagnosis.actionPlan.next90Days.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-indigo-500 flex items-center gap-1.5 uppercase">
                    <Clock size={12} /> Próximos 90 dias (Estratégico)
                  </h4>
                  <div className="space-y-1.5">
                    {diagnosis.actionPlan.next90Days.map((task, i) => {
                      const key = `strategic-${i}`;
                      const isDone = completedTasks[key];
                      return (
                        <div 
                          key={i} 
                          onClick={() => toggleTask(key)}
                          className={`p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer text-xs select-none ${
                            isDone 
                              ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-100 dark:border-slate-800 line-through' 
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-indigo-100 dark:border-indigo-950/20 hover:bg-slate-50/50'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={!!isDone} 
                            readOnly 
                            className="mt-0.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" 
                          />
                          <span>{task}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>



          {/* Educational Insight Corner */}
          {diagnosis.insights.length > 0 && (
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-white space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb size={16} className="text-amber-400" /> Insight de Educação Financeira
              </h3>
              <div className="space-y-3">
                {diagnosis.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="p-1.5 bg-white/10 rounded-full shrink-0">
                      <Info size={14} className="text-amber-300" />
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed italic">"{insight}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}

    </div>
  );
}
