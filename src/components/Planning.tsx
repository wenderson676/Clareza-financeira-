import React, { useMemo } from 'react';
import { MonthlyData, BudgetMode, Debt, Goal } from '../types';
import { getBucketsConfig, formatCurrency } from '../lib/utils';
import { BrainCircuit, AlertTriangle, TrendingUp, CheckCircle2, FileText, ArrowRight, ShieldAlert, Zap, Target, ArrowUpCircle } from 'lucide-react';

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

  const getStatus = (spent: number, allocated: number, isSavings: boolean) => {
    if (isSavings) {
      if (allocated === 0) return 'success';
      const ratio = spent / allocated;
      if (ratio >= 1) return 'success';
      if (ratio >= 0.5) return 'warning';
      return 'danger';
    }
    if (allocated === 0) return spent > 0 ? 'danger' : 'success';
    const ratio = spent / allocated;
    if (ratio >= 1) return 'danger';
    if (ratio >= 0.85) return 'warning';
    return 'success';
  };

  const advices = useMemo(() => {
    const items: AccountantAdvice[] = [];
    
    // 1. Check past vs current month
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
            title: 'Alerta de Inflação de Estilo de Vida',
            problem: `Seus gastos totais projetados este mês (${formatCurrency(currentExpenses)}) cresceram mais de 20% em relação ao mês anterior (${formatCurrency(prevExpenses)}).`,
            solution: 'Cuidado para não estar inflando seu padrão de vida acompanhando alguma alta de renda. Gastos não podem subir mais rápido que sua receita.',
            action: 'Use a aba de Histórico e analise friamente quais categorias puxaram esse aumento e corte excessos imediatos.'
          });
        }
      }
    }

    // 2. Check Deficit
    const totalAvailable = previousBalance + totalProjectedIncome;
    if (totalProjectedExpenses > totalProjectedIncome && totalProjectedIncome > 0) {
      if (totalProjectedExpenses > totalAvailable) {
        items.push({
          id: 'deficit-critical',
          type: 'danger',
          title: 'Risco Crítico de Insolvência',
          problem: `Suas despesas projetadas (${formatCurrency(totalProjectedExpenses)}) ultrapassam todo seu saldo disponível e renda (${formatCurrency(totalAvailable)}). Você está fabricando dívidas ativamente.`,
          solution: 'Situações extremas exigem medidas extremas. Cancele qualquer assinatura, saída ou compra de desejos IMEDIATAMENTE.',
          action: 'Avalie mudar seu modo de orçamento para 70-0-30 (Modo Sobrevivência) até recuperar o controle do seu fluxo de caixa.'
        });
      } else {
        items.push({
          id: 'deficit-warning',
          type: 'warning',
          title: 'Queima de Patrimônio (Burn Rate)',
          problem: `Suas despesas projetadas (${formatCurrency(totalProjectedExpenses)}) ultrapassam sua renda do mês (${formatCurrency(totalProjectedIncome)}), forçando você a queimar o seu caixa acumulado.`,
          solution: 'Caixa guardado deve ser usado estrategicamente para investimentos ou emergências reais, não para financiar custo de vida excedente.',
          action: 'Reduza drasticamente os gastos no balde de Desejos neste mês e avalie fazer uma renda extra urgente (Side Hustle).'
        });
      }
    }

    // 3. Needs & Wants Breakdown
    const allocatedNeeds = totalProjectedIncome * (modeBuckets['Necessidades']?.percentage || 0);
    const spentNeeds = getSpentByBucket('Necessidades', true);
    const allocatedWants = totalProjectedIncome * (modeBuckets['Desejos']?.percentage || 0);
    const spentWants = getSpentByBucket('Desejos', true);
    
    if (allocatedNeeds > 0 && spentNeeds < allocatedNeeds * 0.8 && spentWants <= allocatedWants) {
      const remainingNeeds = allocatedNeeds - spentNeeds;
      items.push({
        id: 'maximize-aporte-needs',
        type: 'success',
        title: 'Oportunidade de Ouro: Turbinar APK (Aporte)',
        problem: `Você conseguiu manter suas despesas essenciais (${formatCurrency(spentNeeds)}) incrivelmente abaixo do teto orçamentário. Isso gera uma margem ociosa de ${formatCurrency(remainingNeeds)}.`,
        solution: 'O maior erro é pegar essa "sobra" e gastar com desejos. Transforme esse excelente controle de custos em crescimento de patrimônio.',
        action: `Use o botão de Adicionar e transfira esses ${formatCurrency(remainingNeeds)} extras diretamente para a Reserva/Investimentos agora mesmo.`
      });
    }

    if (allocatedWants > 0 && spentWants > allocatedWants) {
      items.push({
        id: 'high-wants',
        type: 'warning',
        title: 'Fuga de Capital (Estilo de Vida)',
        problem: `Você já estourou o teto de gastos com Estilo de Vida e Desejos (${formatCurrency(spentWants)} de ${formatCurrency(allocatedWants)}). Esse é o principal ralo financeiro que impede enriquecimento.`,
        solution: 'Você precisa frear o consumo impulsivo. Pare de pedir delivery e adie a compra de qualquer coisa que não seja essencial para viver.',
        action: 'Implemente um "No Spend Challenge" (Desafio de Não Gastar) até o último dia do mês nas categorias de Lazer.'
      });
    }

    // 4. Savings / APK (Aportes) Target
    const allocatedSavings = totalProjectedIncome * (modeBuckets['Reserva/Dívidas']?.percentage || 0);
    if (totalProjectedIncome > 0 && totalProjectedSavings < allocatedSavings) {
      items.push({
        id: 'low-savings',
        type: 'warning',
        title: 'Taxa de Aporte Insuficiente',
        problem: `A matemática da riqueza exige ${formatCurrency(allocatedSavings)} de aporte, mas você só aportou ${formatCurrency(totalProjectedSavings)}. O preço no futuro será caro.`,
        solution: 'A regra de ouro é "Pague a si mesmo primeiro". Você não deve esperar sobrar no fim do mês para aportar.',
        action: 'Lance agora mesmo uma transação de Transferência no valor de Aporte que falta e ajuste sua vida ao que sobrar.'
      });
    } else if (totalProjectedIncome > 0 && totalProjectedSavings >= allocatedSavings * 1.5 && allocatedSavings > 0) {
      items.push({
        id: 'super-aporte',
        type: 'success',
        title: 'Super Aporte (Nível Elite)',
        problem: `Seu ritmo de aporte (APK de ${formatCurrency(totalProjectedSavings)}) está esmagando a meta estabelecida (${formatCurrency(allocatedSavings)}). Você está acelerando fortemente sua liberdade.`,
        solution: 'Neste nível, deixar o dinheiro na Poupança é queimar poder de compra para a inflação. Você precisa rentabilizar melhor esse capital.',
        action: 'Comece a estudar sobre diversificação (Tesouro Selic/IPCA+, CDBs 100%+ CDI, ou FIIs/Ações) para alocar seus Aportes e usar os juros compostos a seu favor.'
      });
    }

    // 5. Debts Analysis
    const lateDebts = debts.filter(d => d.isLate);
    const activeDebts = debts.filter(d => !d.isLate);
    
    if (lateDebts.length > 0) {
      const totalLate = lateDebts.reduce((sum, d) => sum + d.monthlyPayment, 0);
      items.push({
        id: 'late-debts',
        type: 'danger',
        title: 'Hemorragia Financeira Severa (Atrasos)',
        problem: `Você possui ${lateDebts.length} dívida(s) em atraso totalizando parcelas de ${formatCurrency(totalLate)}. Juros de atraso (Rotativo/Cheque Especial) são destrutivos e corroem riqueza rapidamente.`,
        solution: 'Abandone completamente os gastos de Desejos temporariamente. A sua prioridade número um é estancar os juros dessas contas.',
        action: 'Ligue para os credores, tente parcelar ou consolidar a dívida para congelar a incidência de juros compostos altíssimos.'
      });
    } else if (activeDebts.length > 0 && totalProjectedSavings > 0) {
       items.push({
        id: 'debt-snowball',
        type: 'info',
        title: 'Otimização: Método Bola de Neve',
        problem: 'Pagar apenas o valor mínimo das suas dívidas ativas te mantém preso ao sistema financeiro por mais tempo pagando juros abusivos.',
        solution: `Você já alocou ${formatCurrency(totalProjectedSavings)} na categoria de Reserva/Dívidas neste mês. Use esse poder de fogo com inteligência.`,
        action: 'Aplique todo o valor excedente de aporte diretamente para AMORTIZAR (diminuir o saldo principal) da sua menor dívida ativa, destruindo-a mais rápido.'
      });
    }

    // 6. Income Dependency Risk
    const incomeSources = txs.filter(t => t.type === 'income' && !t.isPending);
    const uniqueIncomeSources = new Set(incomeSources.map(t => t.description.toLowerCase().trim())).size;
    if (totalProjectedIncome > 0 && uniqueIncomeSources === 1 && incomeSources.length === 1) {
       items.push({
        id: 'income-dependency',
        type: 'info',
        title: 'Alerta de Fonte Única de Renda',
        problem: '100% da sua capacidade de sobrevivência hoje depende de apenas uma fonte. Se algo acontecer com ela, seu sistema quebra (Alta Fragilidade).',
        solution: 'Para enriquecer de verdade e ter segurança mental (Paz), você precisa criar sistemas paralelos de geração de valor.',
        action: 'Use seu tempo livre para tentar vender um serviço, iniciar um Side Hustle (bico estratégico) ou investir em ativos geradores de dividendos.'
      });
    }

    // 7. Goals Motivation
    if (goals.length > 0 && totalProjectedSavings > 0) {
      items.push({
        id: 'goals-progress',
        type: 'success',
        title: 'Capital Direcionado a Sonhos',
        problem: 'O Aporte pelo Aporte pode causar fadiga orçamentária e te fazer desistir. O dinheiro poupado precisa de um Propósito.',
        solution: `Você tem ${formatCurrency(totalProjectedSavings)} sendo aportados este mês. Isso significa que você está ativamente comprando partes dos seus sonhos.`,
        action: 'Mantenha a consistência diária. Vá até a tela do Dashboard e adicione o valor que você aportou direto no progresso das suas Metas.'
      });
    }

    // 8. Mastery
    if (items.filter(i => i.type === 'danger' || i.type === 'warning').length === 0 && totalProjectedIncome > 0 && totalProjectedSavings >= allocatedSavings) {
      items.push({
        id: 'healthy',
        type: 'success',
        title: 'Domínio do Orçamento',
        problem: 'A maior dificuldade não é chegar no ponto de equilíbrio financeiro, mas manter a consistência brutal nele ano após ano.',
        solution: 'Seus gastos essenciais e desejos estão contidos perfeitamente dentro dos tetos do modelo, e o Aporte (APK) foi garantido.',
        action: 'Se a situação está confortável, desafie-se: Que tal reduzir os Desejos em 5% no próximo mês para aumentar seu percentual de Aporte e ser livre mais rápido?'
      });
    }

    // 9. Initial State
    if (totalProjectedIncome === 0 && totalProjectedExpenses === 0) {
      items.push({
        id: 'no-data',
        type: 'info',
        title: 'Blind Spot (Ponto Cego Analítico)',
        problem: 'Eu opero baseado em dados frios. Sem eles, você está navegando no escuro com sua vida financeira.',
        solution: 'Sempre lance os valores assim que eles acontecerem, nem um dia a mais, nem a menos. O fluxo de caixa é o pulso da sua riqueza.',
        action: 'Pareça que foi feito hoje: registre logo acima suas receitas e despesas principais.'
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
            Contador Inteligente (Auditor)
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Sua consultoria algorítmica para maximizar o Aporte (APK) e proteger seu patrimônio.</p>
        </div>
      </div>

      {/* PAINEL DE ANÁLISE E SOLUÇÕES */}
      <div className="space-y-4">
        {advices.map(advice => (
          <div key={advice.id} className={`rounded-2xl border-2 p-1 overflow-hidden transition-all ${
            advice.type === 'danger' ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-500/20 shadow-[0_0_15px_rgba(225,29,72,0.15)]' :
            advice.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-500/20 shadow-[0_0_15px_rgba(217,119,6,0.1)]' :
            advice.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
            'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
          }`}>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="mt-1 shrink-0">
                  {advice.type === 'danger' && <ShieldAlert className="text-rose-600 dark:text-rose-400 animate-pulse" size={28} />}
                  {advice.type === 'warning' && <AlertTriangle className="text-amber-600 dark:text-amber-400" size={28} />}
                  {advice.type === 'success' && <ArrowUpCircle className="text-emerald-600 dark:text-emerald-400" size={28} />}
                  {advice.type === 'info' && <FileText className="text-indigo-600 dark:text-indigo-400" size={28} />}
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
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Diagnóstico Analítico
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{advice.problem}</p>
                    </div>
                    
                    <div className={`p-4 rounded-xl border ${
                      advice.type === 'danger' ? 'bg-rose-50/50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800' :
                      advice.type === 'warning' ? 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' :
                      advice.type === 'success' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' :
                      'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'
                    }`}>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Consultoria de Estratégia</p>
                      <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-relaxed mb-4">{advice.solution}</p>
                      
                      <div className={`flex items-start gap-2.5 text-sm p-3 rounded-lg border font-medium shadow-sm ${
                         advice.type === 'danger' ? 'bg-rose-600 text-white border-rose-700' :
                         advice.type === 'warning' ? 'bg-amber-500 text-white border-amber-600' :
                         advice.type === 'success' ? 'bg-emerald-600 text-white border-emerald-700' :
                         'bg-indigo-600 text-white border-indigo-700'
                      }`}>
                        <Zap size={18} className="mt-0.5 shrink-0 text-white/90" />
                        <p><strong className="text-white">Ação:</strong> {advice.action}</p>
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
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500"></div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          <TrendingUp className="text-indigo-500" size={24} />
          Auditoria de Capital: {budgetMode}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Raio-X em tempo real do limite e execução do seu orçamento.</p>
        
        <div className="space-y-8">
          {Object.entries(modeBuckets).map(([name, conf]) => {
            const config = conf as { percentage: number; color: string; text: string };
            const allocated = totalProjectedIncome * config.percentage;
            const spent = getSpentByBucket(name, true);
            const isSavings = name === "Reserva/Dívidas";
            const status = getStatus(spent, allocated, isSavings);
            
            return (
              <div key={name} className="relative group">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{name} <span className="text-slate-400 font-medium text-sm ml-1">(Limite Teto de {(config.percentage * 100).toFixed(0)}%)</span></h4>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                      Fluxo Executado: {formatCurrency(spent)} <span className="mx-1 text-slate-300 dark:text-slate-600">/</span> {formatCurrency(allocated)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-xl border ${
                    status === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400' :
                    status === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' :
                    'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
                  }`}>
                    {isSavings ? (status === 'success' ? 'Meta Atingida' : status === 'warning' ? 'Abaixo da Meta' : 'Alerta: Sem Aportes') : (status === 'danger' ? 'Alerta Crítico (Estouro)' : status === 'warning' ? 'Atenção ao Teto' : 'Controle Excelente')}
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
