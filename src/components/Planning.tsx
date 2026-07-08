import React, { useMemo } from 'react';
import { MonthlyData, BudgetMode, Debt, Goal } from '../types';
import { getBucketsConfig, formatCurrency } from '../lib/utils';
import { BrainCircuit, AlertTriangle, TrendingUp, CheckCircle2, FileText, ArrowRight, ShieldAlert, Zap, Target } from 'lucide-react';

interface PlanningProps {
  data: MonthlyData;
  previousBalance: number;
  budgetMode?: BudgetMode;
  allData?: Record<string, MonthlyData>;
  debts?: Debt[];
  goals?: Goal[];
}

interface AccountantAdvice {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  title: string;
  problem: string;
  solution: string;
  action: string;
}

export function Planning({ data, previousBalance, budgetMode = '50-30-20', allData, debts = [], goals = [] }: PlanningProps) {
  const txs = data.transactions;
  const modeBuckets = useMemo(() => getBucketsConfig(budgetMode) as Record<string, { percentage: number; color: string; text: string }>, [budgetMode]);

  const realizedIncome = txs.filter(t => t.type === 'income' && !t.isPending).reduce((sum, t) => sum + t.amount, 0);
  const realizedExpenses = txs.filter(t => t.type === 'expense' && t.bucket !== 'Reserva/Dívidas' && !t.isPending).reduce((sum, t) => sum + t.amount, 0);
  const totalProjectedIncome = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalProjectedExpenses = txs.filter(t => t.type === 'expense' && t.bucket !== 'Reserva/Dívidas').reduce((sum, t) => sum + t.amount, 0);

  const realizedSavings = txs.filter(t => (t.type === 'transfer_to_savings' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas')) && !t.isPending).reduce((sum, t) => sum + t.amount, 0);
  const totalProjectedSavings = txs.filter(t => (t.type === 'transfer_to_savings' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas'))).reduce((sum, t) => sum + t.amount, 0);

  const getSpentByBucket = (bucketName: string, includePending: boolean) => {
    return txs.filter(t => {
      if (!includePending && t.isPending) return false;
      if (bucketName === 'Reserva/Dívidas') {
        return t.type === 'transfer_to_savings' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas');
      }
      return t.type === 'expense' && t.bucket === bucketName;
    }).reduce((sum, t) => sum + t.amount, 0);
  };

  const getStatus = (spent: number, allocated: number) => {
    if (allocated === 0) return spent > 0 ? 'danger' : 'success';
    const ratio = spent / allocated;
    if (ratio >= 1) return 'danger';
    if (ratio >= 0.85) return 'warning';
    return 'success';
  };

  const advices = useMemo(() => {
    const items: AccountantAdvice[] = [];
    
    // Check past vs current month
    if (allData) {
      const allMonths = Object.keys(allData).sort();
      const currentMonthIndex = allMonths.indexOf(data.monthId);
      if (currentMonthIndex > 0) {
        const prevMonthId = allMonths[currentMonthIndex - 1];
        const prevData = allData[prevMonthId];
        const prevExpenses = prevData.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const currentExpenses = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        if (currentExpenses > prevExpenses * 1.2 && prevExpenses > 0) {
          items.push({
            id: 'spending-spike',
            type: 'warning',
            title: 'Aumento de Gastos Identificado',
            problem: `Seus gastos totais projetados este mês (${formatCurrency(currentExpenses)}) estão consideravelmente maiores do que no mês anterior (${formatCurrency(prevExpenses)}).`,
            solution: 'Seja rigoroso nas próximas compras. Identifique se o aumento foi devido a uma emergência ou aumento no custo de vida.',
            action: 'Use a aba de Histórico e revise quais categorias puxaram esse aumento.'
          });
        }
      }
    }

    // 1. Check if expenses are exceeding income
    // Consider previous balance plus total income to see if they are in absolute deficit
    const totalAvailable = previousBalance + totalProjectedIncome;
    if (totalProjectedExpenses > totalProjectedIncome && totalProjectedIncome > 0) {
      if (totalProjectedExpenses > totalAvailable) {
        items.push({
          id: 'deficit-critical',
          type: 'danger',
          title: 'Déficit Financeiro Crítico',
          problem: `Suas despesas projetadas (${formatCurrency(totalProjectedExpenses)}) ultrapassam todo seu saldo disponível e renda (${formatCurrency(totalAvailable)}). Você está acumulando dívida.`,
          solution: 'Corte imediatamente gastos não essenciais (Desejos). Cancele compras pendentes.',
          action: 'Avalie mudar seu modo de orçamento para 70-0-30 (Modo Sobrevivência).'
        });
      } else {
        items.push({
          id: 'deficit-warning',
          type: 'warning',
          title: 'Déficit Financeiro Mensal',
          problem: `Suas despesas projetadas (${formatCurrency(totalProjectedExpenses)}) ultrapassam sua renda do mês (${formatCurrency(totalProjectedIncome)}), consumindo seu caixa acumulado.`,
          solution: 'Evite usar seu caixa para cobrir custos de vida do dia a dia.',
          action: 'Reduza os gastos em Desejos para estabilizar.'
        });
      }
    }

    // 2. Check Wants bucket
    const allocatedWants = totalProjectedIncome * (modeBuckets['Desejos']?.percentage || 0);
    const spentWants = getSpentByBucket('Desejos', true);
    if (allocatedWants > 0 && spentWants > allocatedWants) {
      items.push({
        id: 'high-wants',
        type: 'warning',
        title: 'Excesso em Desejos (Estilo de Vida)',
        problem: `Você estourou o teto de gastos com Desejos (${formatCurrency(spentWants)} de ${formatCurrency(allocatedWants)} permitidos).`,
        solution: 'Pause compras impulsivas, saídas a restaurantes ou assinaturas não essenciais no resto do mês.',
        action: 'Ajuste sua rotina de lazer para opções gratuitas ou adie a compra de itens não urgentes.'
      });
    }

    // 3. Check Savings / Debts target
    const allocatedSavings = totalProjectedIncome * (modeBuckets['Reserva/Dívidas']?.percentage || 0);
    if (totalProjectedIncome > 0 && totalProjectedSavings < allocatedSavings) {
      items.push({
        id: 'low-savings',
        type: 'warning',
        title: 'Falta de Aportes na Reserva',
        problem: `Seu plano exige guardar ou pagar dívidas no valor de ${formatCurrency(allocatedSavings)}, mas você só alocou ${formatCurrency(totalProjectedSavings)}.`,
        solution: 'Antes de gastar com desejos, pague a si mesmo (ou suas dívidas) primeiro.',
        action: 'Adicione uma transação de transferência para reserva no valor faltante agora mesmo.'
      });
    }

    // 4. Check Late Debts
    const lateDebts = debts.filter(d => d.isLate);
    if (lateDebts.length > 0) {
      const totalLate = lateDebts.reduce((sum, d) => sum + d.monthlyPayment, 0);
      items.push({
        id: 'late-debts',
        type: 'danger',
        title: 'Atenção: Dívidas em Atraso',
        problem: `Você possui ${lateDebts.length} dívida(s) atrasada(s) totalizando parcelas de ${formatCurrency(totalLate)}. Os juros compostos estão trabalhando contra você.`,
        solution: 'Priorize o pagamento dessas dívidas imediatamente. Zere seus gastos com desejos até quitar os atrasos.',
        action: 'Mude temporariamente para a estratégia 50-20-30 para focar 30% da sua renda apenas em quitar essas dívidas.'
      });
    }

    // 5. Goals progress
    if (goals.length > 0 && totalProjectedSavings > 0) {
      items.push({
        id: 'goals-progress',
        type: 'success',
        title: 'Metas em Andamento',
        problem: 'Metas exigem disciplina contínua para serem alcançadas. É fácil perder o foco.',
        solution: `Você tem ${formatCurrency(totalProjectedSavings)} sendo aportados em Reserva/Dívidas neste mês. Certifique-se de direcionar esse valor para suas metas registradas.`,
        action: 'Mantenha os aportes mensais consistentes para alcançar seus objetivos mais rápido.'
      });
    }

    // 6. Healthy finances
    if (items.filter(i => i.type === 'danger' || i.type === 'warning').length === 0 && totalProjectedIncome > 0) {
      items.push({
        id: 'healthy',
        type: 'success',
        title: 'Saúde Financeira Excelente',
        problem: 'Manter a consistência é o maior desafio financeiro no longo prazo.',
        solution: 'Seus gastos e investimentos estão perfeitamente alinhados com seu orçamento atual.',
        action: 'Considere aumentar o percentual de Reserva (ex: tentar o Modo 50-20-30) se quiser acelerar sua independência financeira.'
      });
    }

    // 7. No data yet
    if (totalProjectedIncome === 0 && totalProjectedExpenses === 0) {
      items.push({
        id: 'no-data',
        type: 'info',
        title: 'Precisamos de Dados',
        problem: 'Não há transações registradas neste mês para analisar.',
        solution: 'Comece adicionando suas rendas e despesas fixas para eu poder gerar estratégias personalizadas.',
        action: 'Vá na aba principal e clique em "Adicionar Transação".'
      });
    }

    return items;
  }, [totalProjectedIncome, totalProjectedExpenses, totalProjectedSavings, txs, modeBuckets, debts, goals, allData, data.monthId, previousBalance]);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BrainCircuit className="text-indigo-500" size={28} />
            Contador Inteligente
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Análise automática e sugestões baseadas na sua realidade.</p>
        </div>
      </div>

      {/* PAINEL DE ANÁLISE E SOLUÇÕES */}
      <div className="space-y-4">
        {advices.map(advice => (
          <div key={advice.id} className={`rounded-2xl border-2 p-1 overflow-hidden transition-all ${
            advice.type === 'danger' ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-500/20' :
            advice.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-500/20' :
            advice.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/20' :
            'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-500/20'
          }`}>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="mt-1 shrink-0">
                  {advice.type === 'danger' && <ShieldAlert className="text-rose-600 dark:text-rose-400" size={26} />}
                  {advice.type === 'warning' && <AlertTriangle className="text-amber-600 dark:text-amber-400" size={26} />}
                  {advice.type === 'success' && <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={26} />}
                  {advice.type === 'info' && <FileText className="text-indigo-600 dark:text-indigo-400" size={26} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className={`text-lg font-black mb-3 ${
                    advice.type === 'danger' ? 'text-rose-900 dark:text-rose-300' :
                    advice.type === 'warning' ? 'text-amber-900 dark:text-amber-300' :
                    advice.type === 'success' ? 'text-emerald-900 dark:text-emerald-300' :
                    'text-indigo-900 dark:text-indigo-300'
                  }`}>{advice.title}</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">O Problema</p>
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{advice.problem}</p>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">A Solução</p>
                      <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-relaxed mb-3">{advice.solution}</p>
                      <div className="flex items-start gap-2 text-sm text-indigo-700 dark:text-indigo-400 mt-2 bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                        <Zap size={16} className="mt-0.5 shrink-0" />
                        <p><strong>Ação Recomendada:</strong> {advice.action}</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* RAIO-X DO ORÇAMENTO ATUAL */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          <TrendingUp className="text-emerald-500" size={24} />
          Raio-X do Orçamento ({budgetMode})
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Auditoria em tempo real da alocação do seu dinheiro com base no modelo escolhido.</p>
        
        <div className="space-y-8">
          {Object.entries(modeBuckets).map(([name, conf]) => {
            const config = conf as { percentage: number; color: string; text: string };
            const allocated = totalProjectedIncome * config.percentage;
            const spent = getSpentByBucket(name, true);
            const status = getStatus(spent, allocated);
            
            return (
              <div key={name} className="relative group">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{name} <span className="text-slate-400 font-medium text-sm ml-1">(Teto de {(config.percentage * 100).toFixed(0)}%)</span></h4>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                      Realizado: {formatCurrency(spent)} <span className="mx-1 text-slate-300 dark:text-slate-600">/</span> {formatCurrency(allocated)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-xl border ${
                    status === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400' :
                    status === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' :
                    'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
                  }`}>
                    {status === 'danger' ? 'Alerta Crítico' : status === 'warning' ? 'Atenção ao Teto' : 'Controle Excelente'}
                  </span>
                </div>
                
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div 
                    className={`h-full transition-all duration-700 ${
                      status === 'danger' ? 'bg-rose-500' :
                      status === 'warning' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((spent / (allocated || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
