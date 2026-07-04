import React, { useMemo } from 'react';
import { MonthlyData } from '../types';
import { BUCKETS, formatCurrency } from '../lib/utils';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Compass, Activity, ArrowRight, BrainCircuit, BarChart4 } from 'lucide-react';

interface PlanningProps {
  data: MonthlyData;
  previousBalance: number;
}

interface StrategyItem {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  actionable: string;
}

export function Planning({ data, previousBalance }: PlanningProps) {
  const txs = data.transactions;

  // Calculando valores realizados e pendentes
  const realizedIncome = txs.filter(t => t.type === 'income' && !t.isPending).reduce((sum, t) => sum + t.amount, 0);
  const realizedExpenses = txs.filter(t => t.type === 'expense' && !t.isPending).reduce((sum, t) => sum + t.amount, 0);
  const realizedSavings = txs.filter(t => t.type === 'transfer_to_savings' && !t.isPending).reduce((sum, t) => sum + t.amount, 0);
  const realizedSavingsWithdraw = txs.filter(t => t.type === 'transfer_from_savings' && !t.isPending).reduce((sum, t) => sum + t.amount, 0);
  const netRealizedSavings = realizedSavings - realizedSavingsWithdraw;

  const pendingIncome = txs.filter(t => t.type === 'income' && t.isPending).reduce((sum, t) => sum + t.amount, 0);
  const pendingExpenses = txs.filter(t => t.type === 'expense' && t.isPending).reduce((sum, t) => sum + t.amount, 0);
  const pendingSavings = txs.filter(t => t.type === 'transfer_to_savings' && t.isPending).reduce((sum, t) => sum + t.amount, 0);
  const pendingSavingsWithdraw = txs.filter(t => t.type === 'transfer_from_savings' && t.isPending).reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = previousBalance + realizedIncome - realizedExpenses - netRealizedSavings;
  const totalProjectedIncome = realizedIncome + pendingIncome;
  const projectedBalance = currentBalance + pendingIncome - pendingExpenses - pendingSavings + pendingSavingsWithdraw;

  const getSpentByBucket = (bucket: string, includePending: boolean) => {
    if (bucket === 'Reserva Financeira') {
      const rs = txs.filter(t => t.type === 'transfer_to_savings' && (includePending ? true : !t.isPending)).reduce((sum, t) => sum + t.amount, 0);
      const rw = txs.filter(t => t.type === 'transfer_from_savings' && (includePending ? true : !t.isPending)).reduce((sum, t) => sum + t.amount, 0);
      return rs - rw;
    }
    return txs
      .filter(t => t.type === 'expense' && t.bucket === bucket && (includePending ? true : !t.isPending))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getCategoryTotals = (bucket: string, includePending: boolean) => {
    const cats: Record<string, number> = {};
    if (bucket === 'Reserva Financeira') {
      txs.filter(t => (t.type === 'transfer_to_savings' || t.type === 'transfer_from_savings') && (includePending ? true : !t.isPending))
         .forEach(t => {
           const val = t.type === 'transfer_to_savings' ? t.amount : -t.amount;
           cats[t.category] = (cats[t.category] || 0) + val;
         });
    } else {
      txs.filter(t => t.type === 'expense' && t.bucket === bucket && (includePending ? true : !t.isPending))
         .forEach(t => {
           cats[t.category] = (cats[t.category] || 0) + t.amount;
         });
    }
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  };

  const isNegative = currentBalance < 0;

  const strategies = useMemo(() => {
    const strat: StrategyItem[] = [];
    if (totalProjectedIncome === 0) {
      strat.push({
        id: 'no-income',
        type: 'info',
        title: 'Vamos começar a organizar!',
        description: 'Parece que ainda não temos nenhuma renda registrada (recebida ou a receber) para este mês.',
        actionable: 'Sugestão: Registre o seu salário ou outras rendas esperadas para que possamos fazer um planejamento financeiro completo para você.'
      });
      return strat;
    }

    // 1. Risco de Déficit Projetado (Falta de Dinheiro)
    if (projectedBalance < 0) {
      const pendingExpensesList = txs.filter(t => t.type === 'expense' && t.isPending).sort((a, b) => b.amount - a.amount);
      
      let actionable = '';
      if (pendingExpensesList.length > 0) {
        actionable = `Sugestão de Contador: Você tem despesas futuras cadastradas (como "${pendingExpensesList[0].description}" no valor de ${formatCurrency(pendingExpensesList[0].amount)}). Para não fechar o mês no vermelho, reavalie imediatamente se é possível cancelar ou adiar essas compras que ainda não foram pagas.`;
      } else {
        // Encontra a área com maior excesso
        let worstBucket = '';
        let maxOver = 0;
        Object.entries(BUCKETS).forEach(([b, conf]) => {
          const spent = getSpentByBucket(b, true);
          const allocated = totalProjectedIncome * conf.percentage;
          if (spent - allocated > maxOver) {
            maxOver = spent - allocated;
            worstBucket = b;
          }
        });
        
        const topCat = worstBucket ? getCategoryTotals(worstBucket, false)[0] : null;
        
        actionable = topCat 
          ? `Sugestão de Contador: O maior desvio do orçamento até agora ocorreu na categoria "${worstBucket}", com os gastos puxados por "${topCat[0]}". Tente não gastar mais nessa área e, se possível, busque uma renda extra para equilibrar as contas.` 
          : `Sugestão de Contador: Os gastos que você já realizou ou registrou ultrapassaram sua renda prevista. A recomendação profissional imediata é pausar qualquer novo gasto que não seja vital.`;
      }

      strat.push({
        id: 'deficit',
        type: 'danger',
        title: 'Alerta: Previsão de Falta de Dinheiro',
        description: `Com base na sua renda atual e no que ainda vai receber (${formatCurrency(pendingIncome)}), somado aos gastos já feitos e contas futuras a pagar, a estimativa é que falte ${formatCurrency(Math.abs(projectedBalance))} no final do mês.`,
        actionable
      });
    }

    // 2. Alerta de Fluxo de Caixa (Descompasso de Datas)
    if (projectedBalance >= 0 && currentBalance < pendingExpenses && pendingIncome > 0) {
      strat.push({
        id: 'cashflow',
        type: 'warning',
        title: 'Atenção ao Fluxo de Caixa (Datas)',
        description: `Você tem ${formatCurrency(currentBalance)} disponíveis no caixa hoje, mas cadastrou ${formatCurrency(pendingExpenses)} em contas que ainda vão vencer. A conta só fechará no azul quando a renda futura prevista de ${formatCurrency(pendingIncome)} for efetivamente recebida.`,
        actionable: `Sugestão de Contador: Certifique-se de que a renda futura vai cair na conta ANTES do vencimento das próximas contas. Caso contrário, negocie o adiamento das contas com os credores para evitar juros.`
      });
    }

    // 3. Análise Dinâmica para Otimização
    const vidaCategories = getCategoryTotals('Vida', true);
    const vidaTotalRealized = getSpentByBucket('Vida', false);
    const vidaTotalPending = getSpentByBucket('Vida', true) - vidaTotalRealized;
    const vidaTotal = vidaTotalRealized + vidaTotalPending;
    
    if (vidaTotal > (totalProjectedIncome * BUCKETS['Vida'].percentage)) {
      if (vidaCategories.length > 0) {
        const biggestDrain = vidaCategories[0];
        const drainPercent = (biggestDrain[1] / vidaTotal) * 100;
        const overAmount = vidaTotal - (totalProjectedIncome * BUCKETS['Vida'].percentage);
        
        strat.push({
          id: 'pareto-vida',
          type: 'warning',
          title: 'Estilo de Vida consumindo acima do limite',
          description: `Os gastos (pagos + futuros) com "Vida" (lazer, supérfluos) já somam ${formatCurrency(vidaTotal)} e estouram o teto ideal de 30% em ${formatCurrency(overAmount)}. Cerca de ${drainPercent.toFixed(0)}% deste valor está concentrado em "${biggestDrain[0]}".`,
          actionable: `Sugestão de Contador: Para voltar aos trilhos sem dor, corte ou reduza drasticamente as próximas despesas com "${biggestDrain[0]}". Se houverem despesas futuras pendentes nessa categoria, tente cancelá-las.`
        });
      }
    }

    // 4. Análise de Custo Fixo
    const necessidadesRealized = getSpentByBucket('Necessidades', false);
    const necessidadesPending = getSpentByBucket('Necessidades', true) - necessidadesRealized;
    const necessidadesTotal = necessidadesRealized + necessidadesPending;
    const necessidadesLimit = totalProjectedIncome * BUCKETS['Necessidades'].percentage;
    
    if (necessidadesTotal > necessidadesLimit) {
       const overAmount = necessidadesTotal - necessidadesLimit;
       strat.push({
         id: `bucket-necessidades-high`,
         type: 'warning',
         title: `Custo de Vida Básico Elevado`,
         description: `Seus custos de vida essenciais (já pagos: ${formatCurrency(necessidadesRealized)} | a pagar: ${formatCurrency(necessidadesPending)}) comprometem mais de 50% da sua renda total projetada, excedendo o limite saudável em ${formatCurrency(overAmount)}.`,
         actionable: `Sugestão de Contador: Custos fixos altos deixam você sem margem de manobra. Avalie suas contas futuras e veja se pode renegociar contratos (aluguel, internet) ou mudar hábitos de consumo no supermercado.`
       });
    }

    // 5. Planejamento de Crescimento (Reserva Financeira)
    const currentSavRealized = getSpentByBucket('Reserva Financeira', false);
    const currentSavPending = getSpentByBucket('Reserva Financeira', true) - currentSavRealized;
    const currentSavTotal = currentSavRealized + currentSavPending;
    const idealSavings = totalProjectedIncome * BUCKETS['Reserva Financeira'].percentage;
    
    if (currentSavTotal < idealSavings && projectedBalance > 0) {
      const missingSavings = idealSavings - currentSavTotal;
      strat.push({
        id: `savings-growth`,
        type: 'info',
        title: 'Oportunidade para Aumentar a Reserva',
        description: `Você separou ${formatCurrency(currentSavRealized)} já transferidos (mais ${formatCurrency(currentSavPending)} planejados) para economia. O alvo ideal para o seu salário seria no mínimo ${formatCurrency(idealSavings)}. Como há uma sobra projetada no seu caixa, podemos melhorar isso!`,
        actionable: projectedBalance >= missingSavings 
          ? `Sugestão de Contador: Registre agora uma transferência futura de ${formatCurrency(missingSavings)} para a sua poupança ou investimentos. Acostume-se a investir a diferença antes de gastar com outras coisas.` 
          : `Sugestão de Contador: A previsão é sobrar cerca de ${formatCurrency(projectedBalance)} após o pagamento de tudo. Planeje alocar todo esse saldo diretamente para a poupança.`
      });
    }

    // 6. Sucesso
    if (!strat.some(s => s.type === 'danger' || s.type === 'warning') && totalProjectedIncome > 0) {
      strat.push({
        id: 'success',
        type: 'success',
        title: 'Excelente Saúde Financeira!',
        description: 'Meus parabéns! Analisando seus números, suas contas estão equilibradas. Seus gastos essenciais e estilo de vida estão dentro do planejado e o seu dinheiro está sendo bem direcionado.',
        actionable: 'Sugestão de Contador: Continue com esse excelente controle! O próximo passo é estudar sobre investimentos para fazer o dinheiro poupado render ainda mais.'
      });
    }

    return strat;
  }, [txs, currentBalance, projectedBalance, totalProjectedIncome, pendingIncome, pendingExpenses]);

  const getStatus = (spent: number, allocated: number) => {
    if (allocated === 0) return 'neutral';
    const percent = spent / allocated;
    if (percent > 1.05) return 'danger';
    if (percent > 0.90) return 'warning';
    return 'good';
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="bg-slate-900 dark:bg-slate-950 p-6 sm:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden border border-slate-800">
        <div className="absolute -right-10 -bottom-10 opacity-[0.03] dark:opacity-10 pointer-events-none">
          <BrainCircuit size={180} />
        </div>
        <div className="relative z-10">
          <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Inteligência Financeira</h2>
          <p className="text-2xl sm:text-3xl font-bold mb-4 leading-tight text-white">Engenharia de Crescimento</p>
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50">
            <p className="text-sm font-serif italic mb-3 text-slate-300">
              "A riqueza do sábio é a sua coroa... Os planos bem elaborados levam à fartura; mas o apressado sempre acaba na miséria."
            </p>
            <p className="text-xs text-emerald-400 font-semibold text-right">— Princípio Milenar (Pv 14:24 / 21:5)</p>
          </div>
        </div>
      </header>

      {totalProjectedIncome === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 text-center">
          <Target className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Adicione uma Receita</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Para que o motor de análise gere um planejamento financeiro completo, você precisa adicionar ao menos uma receita (realizada ou pendente/futura) no mês.
          </p>
        </div>
      ) : (
        <>
          {/* Sessão de Análise Inteligente */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Activity className="text-emerald-500" size={22} />
              Diagnóstico Estratégico
            </h3>
            
            <div className="space-y-4">
              {strategies.map(strat => (
                <div key={strat.id} className={`p-5 rounded-2xl border ${
                  strat.type === 'danger' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20' :
                  strat.type === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' :
                  strat.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' :
                  'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20'
                }`}>
                  <div className="flex gap-4">
                    <div className="mt-1 shrink-0">
                      {strat.type === 'danger' && <AlertTriangle className="text-rose-600 dark:text-rose-400" size={24} />}
                      {strat.type === 'warning' && <AlertTriangle className="text-amber-600 dark:text-amber-400" size={24} />}
                      {strat.type === 'success' && <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={24} />}
                      {strat.type === 'info' && <Activity className="text-indigo-600 dark:text-indigo-400" size={24} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-base font-bold mb-2 ${
                        strat.type === 'danger' ? 'text-rose-900 dark:text-rose-300' :
                        strat.type === 'warning' ? 'text-amber-900 dark:text-amber-300' :
                        strat.type === 'success' ? 'text-emerald-900 dark:text-emerald-300' :
                        'text-indigo-900 dark:text-indigo-300'
                      }`}>{strat.title}</h4>
                      <p className={`text-sm leading-relaxed mb-4 ${
                        strat.type === 'danger' ? 'text-rose-800 dark:text-rose-400/90' :
                        strat.type === 'warning' ? 'text-amber-800 dark:text-amber-400/90' :
                        strat.type === 'success' ? 'text-emerald-800 dark:text-emerald-400/90' :
                        'text-indigo-800 dark:text-indigo-400/90'
                      }`}>{strat.description}</p>
                      
                      <div className={`text-sm p-4 rounded-xl border ${
                        strat.type === 'danger' ? 'bg-white/80 dark:bg-slate-900/60 border-rose-200/60 dark:border-rose-500/30 text-rose-900 dark:text-rose-200' :
                        strat.type === 'warning' ? 'bg-white/80 dark:bg-slate-900/60 border-amber-200/60 dark:border-amber-500/30 text-amber-900 dark:text-amber-200' :
                        strat.type === 'success' ? 'bg-white/80 dark:bg-slate-900/60 border-emerald-200/60 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200' :
                        'bg-white/80 dark:bg-slate-900/60 border-indigo-200/60 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <ArrowRight size={18} className="mt-0.5 shrink-0 opacity-70" />
                          <p className="leading-relaxed"><strong className="font-bold">Estratégia Aplicada:</strong> {strat.actionable}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <BarChart4 className="text-emerald-500" size={22} />
              Auditoria de Alocação de Capital
            </h3>
            
            <div className="space-y-8">
              {Object.entries(BUCKETS).map(([name, config]) => {
                const allocated = totalProjectedIncome * config.percentage;
                const spent = getSpentByBucket(name, true);
                const status = getStatus(spent, allocated);
                
                return (
                  <div key={name} className="relative">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{name} <span className="text-slate-400 font-medium text-sm ml-1">(Teto de {config.percentage * 100}%)</span></h4>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                          Consolidado: {formatCurrency(spent)} <span className="mx-1 text-slate-300 dark:text-slate-600">/</span> {formatCurrency(allocated)}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1.5 rounded-lg ${
                        status === 'danger' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                        status === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      }`}>
                        {status === 'danger' ? 'Sinal Vermelho' : status === 'warning' ? 'Teto Próximo' : 'Dentro da Meta'}
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-3 rounded-full overflow-hidden mb-3 border border-slate-200 dark:border-slate-700">
                      <div 
                        className={`h-full transition-all duration-700 ${
                          status === 'danger' ? 'bg-rose-500' :
                          status === 'warning' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min((spent / (allocated || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    
                    <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      {name === 'Necessidades' && (
                        <p><strong className="text-slate-800 dark:text-slate-200">Fundamento:</strong> Limiar de Sustentabilidade. Manter o custo de vida (moradia, contas, mercado) abaixo de 50% garante elasticidade contra imprevistos financeiros.</p>
                      )}
                      {name === 'Vida' && (
                        <p><strong className="text-slate-800 dark:text-slate-200">Fundamento:</strong> Variável de Qualidade. Teto de 30% destinado ao estilo de vida. É o primeiro centro de custos que deve sofrer cortes caso o orçamento fique apertado.</p>
                      )}
                      {name === 'Reserva Financeira' && (
                        <p><strong className="text-slate-800 dark:text-slate-200">Fundamento:</strong> Fator Multiplicador. A retenção de pelo menos 20% financia seu fundo de emergência e a realização de sonhos. É a linha divisória entre aperto e prosperidade.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
