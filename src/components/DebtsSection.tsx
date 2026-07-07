import React, { useState } from 'react';
import { Trash, Plus, AlertCircle, Calendar, TrendingUp, ShieldAlert, Sparkles, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Debt } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface DebtsSectionProps {
  debts: Debt[];
  addDebt: (debt: Omit<Debt, 'id'>) => void;
  deleteDebt: (id: string) => void;
  totalIncome: number;
}

const DEBT_TYPES_INFO: Record<Debt['type'], { label: string; priority: 'Máxima' | 'Média' | 'Baixa'; desc: string }> = {
  rent_late: { label: 'Aluguel Atrasado', priority: 'Máxima', desc: 'Risco de despejo ou perda de moradia.' },
  utility_risk: { label: 'Água/Luz em Risco de Corte', priority: 'Máxima', desc: 'Serviços essenciais que podem ser interrompidos.' },
  pension: { label: 'Pensão Alimentícia', priority: 'Máxima', desc: 'Risco de sanções legais graves.' },
  loan_shark: { label: 'Agiota / Empréstimo Informal urgente', priority: 'Máxima', desc: 'Altíssimo risco pessoal ou juros abusivos de curto prazo.' },
  card_revolving: { label: 'Cartão de Crédito (Rotativo/Atrasado)', priority: 'Máxima', desc: 'Os maiores juros do mercado financeiro brasileiro.' },
  loan_installments: { label: 'Empréstimos Parcelados (Banco)', priority: 'Média', desc: 'Empréstimo pessoal com parcelas recorrentes e juros médios.' },
  card_installments: { label: 'Fatura de Cartão Parcelada', priority: 'Média', desc: 'Financiamento da fatura com taxa de juros parcelada.' },
  store_installments: { label: 'Carnê ou Parcelamento de Loja', priority: 'Média', desc: 'Financiamento de consumo direto com estabelecimento.' },
  no_interest: { label: 'Dívida Sem Juros', priority: 'Baixa', desc: 'Compras parceladas sem cobrança de encargos ativos.' },
  family: { label: 'Empréstimo com Familiar ou Amigo', priority: 'Baixa', desc: 'Dívida de relacionamento, sem pressão agressiva de juros.' },
  other: { label: 'Outras Parcelas Leves', priority: 'Baixa', desc: 'Outros compromissos financeiros de baixo impacto.' },
};

export function DebtsSection({ debts, addDebt, deleteDebt, totalIncome }: DebtsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [isLate, setIsLate] = useState(false);
  const [creditor, setCreditor] = useState('');
  const [type, setType] = useState<Debt['type']>('other');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !totalAmount) return;

    addDebt({
      name,
      totalAmount: parseFloat(totalAmount.replace(/\./g, '').replace(',', '.')) || 0,
      monthlyPayment: parseFloat(monthlyPayment.replace(/\./g, '').replace(',', '.')) || 0,
      interestRate: parseFloat(interestRate.replace(',', '.')) || 0,
      isLate,
      creditor: creditor || 'Não informado',
      type,
    });

    // Reset form
    setName('');
    setTotalAmount('');
    setMonthlyPayment('');
    setInterestRate('');
    setIsLate(false);
    setCreditor('');
    setType('other');
    setShowForm(false);
  };

  // Helper to format currency values during input
  const handleCurrencyInput = (value: string, setter: (val: string) => void) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) {
      setter('');
      return;
    }
    const floatValue = parseFloat(cleanValue) / 100;
    setter(
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(floatValue)
    );
  };

  // Auto classify priority
  const getPriority = (debtType: Debt['type']) => {
    return DEBT_TYPES_INFO[debtType]?.priority || 'Baixa';
  };

  // Sort debts automatically
  const sortedDebts = [...debts].sort((a, b) => {
    const pA = getPriority(a.type);
    const pB = getPriority(b.type);

    const score = { 'Máxima': 3, 'Média': 2, 'Baixa': 1 };
    if (score[pA] !== score[pB]) {
      return score[pB] - score[pA]; // Higher priority first
    }
    // Secondary sort: highest interest rate first
    return b.interestRate - a.interestRate;
  });

  const totalDebtAmount = debts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalMonthlyPayments = debts.reduce((sum, d) => sum + d.monthlyPayment, 0);

  // Math for Attack Plan
  const plannedAttackAmount = Math.max(totalIncome * 0.3, 300);

  // Exit Forecasts
  const monthsToFree = totalDebtAmount > 0 ? Math.ceil(totalDebtAmount / plannedAttackAmount) : 0;
  const monthsWith150Cut = totalDebtAmount > 0 ? Math.ceil(totalDebtAmount / (plannedAttackAmount + 150)) : 0;
  const monthsWith300Increase = totalDebtAmount > 0 ? Math.ceil(totalDebtAmount / (plannedAttackAmount + 300)) : 0;
  const monthsWithBoth = totalDebtAmount > 0 ? Math.ceil(totalDebtAmount / (plannedAttackAmount + 450)) : 0;

  const highestPriorityDebt = sortedDebts[0];

  return (
    <div id="debts-management-panel" className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-xl overflow-hidden mt-6 transition-all duration-300">
      <div className="p-6 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border-b border-slate-100 dark:border-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
                <ShieldAlert size={20} />
              </span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Painel de Quitação & Plano de Ataque</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Organize, priorize e elimine suas dívidas usando o método inteligente de aceleração.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 self-start sm:self-center bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-rose-200 dark:shadow-none"
          >
            {showForm ? 'Fechar Formulário' : 'Adicionar Dívida'}
            {!showForm && <Plus size={16} />}
          </button>
        </div>

        {/* Global Summary Metrics */}
        {debts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/50 p-4 rounded-2xl">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Volume Total Devido</p>
              <p className="text-xl font-black text-rose-600 mt-1">{formatCurrency(totalDebtAmount)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{debts.length} {debts.length === 1 ? 'pendência registrada' : 'pendências registradas'}</p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/50 p-4 rounded-2xl">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Compromisso Mensal Atual</p>
              <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">{formatCurrency(totalMonthlyPayments)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Soma das parcelas mínimas</p>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-rose-600/5 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl">
              <p className="text-[10px] uppercase tracking-wider text-rose-500 font-bold flex items-center gap-1">
                <Sparkles size={10} /> Capacidade de Ataque (30%)
              </p>
              <p className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">{formatCurrency(plannedAttackAmount)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Aporte mensal focado sugerido</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="mb-8 p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl space-y-4 overflow-hidden"
            >
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Plus size={16} className="text-rose-500" /> Cadastrar Nova Dívida
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nome da Dívida *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cartão Nubank, Empréstimo Itaú"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Credor (Com quem é?) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Banco, Loja Cem, Primo João"
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Tipo de Dívida (Auto-Classificar) *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Debt['type'])}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:outline-none font-medium"
                  >
                    {Object.entries(DEBT_TYPES_INFO).map(([key, info]) => (
                      <option key={key} value={key}>
                        [{info.priority}] {info.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Valor Total Devido *</label>
                  <input
                    type="text"
                    required
                    placeholder="R$ 0,00"
                    value={totalAmount}
                    onChange={(e) => handleCurrencyInput(e.target.value, setTotalAmount)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-rose-600 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Parcela Mensal Mínima</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00 (Opcional)"
                    value={monthlyPayment}
                    onChange={(e) => handleCurrencyInput(e.target.value, setMonthlyPayment)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Taxa de Juros (% ao mês)</label>
                  <input
                    type="text"
                    placeholder="Ex: 8.5 (Opcional)"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="isLate"
                    checked={isLate}
                    onChange={(e) => setIsLate(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="isLate" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Esta dívida está em atraso? ⚠️
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all mt-4"
              >
                Cadastrar Dívida
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {debts.length === 0 ? (
          <div className="text-center py-12 px-6 border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-3xl">
            <span className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full inline-block mb-4">
              <AlertCircle size={32} />
            </span>
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">Nenhuma dívida cadastrada</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
              O modo Quitar Dívidas precisa das suas pendências financeiras registradas para montar o seu plano de ataque estratégico.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 font-bold py-2 px-4 rounded-xl text-xs transition-colors"
            >
              Cadastrar primeira dívida
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Automatic Classification Debt List */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Suas Pendências Classificadas Automaticamente:
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedDebts.map((debt) => {
                  const priority = getPriority(debt.type);
                  const typeInfo = DEBT_TYPES_INFO[debt.type];

                  const borderClass =
                    priority === 'Máxima'
                      ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/5'
                      : priority === 'Média'
                      ? 'border-amber-500 bg-amber-50/10 dark:bg-amber-950/5'
                      : 'border-slate-300 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10';

                  const badgeClass =
                    priority === 'Máxima'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/50'
                      : priority === 'Média'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/50'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/50';

                  return (
                    <div
                      key={debt.id}
                      className={`p-4 rounded-2xl border-l-4 ${borderClass} flex flex-col justify-between relative hover:shadow-md transition-shadow group`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{debt.name}</h5>
                            <p className="text-[10px] text-slate-400 mt-0.5">Credor: <span className="font-semibold text-slate-600 dark:text-slate-300">{debt.creditor}</span></p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                            Prioridade {priority}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug italic">
                          {typeInfo?.desc}
                        </p>

                        <div className="grid grid-cols-3 gap-2 mt-4 text-center bg-white/50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100/50 dark:border-slate-800/30">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Total</span>
                            <span className="text-xs font-extrabold text-rose-600">{formatCurrency(debt.totalAmount)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Parcela</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {debt.monthlyPayment > 0 ? formatCurrency(debt.monthlyPayment) : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Juros/mês</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {debt.interestRate > 0 ? `${debt.interestRate}%` : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/30 dark:border-slate-800/20">
                        {debt.isLate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-lg border border-rose-100 dark:border-rose-900/20 animate-pulse">
                            <AlertTriangle size={10} /> Dívida em Atraso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
                            <CheckCircle2 size={10} /> Em dia
                          </span>
                        )}

                        <button
                          onClick={() => deleteDebt(debt.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attack Plan Card */}
            {highestPriorityDebt && (
              <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-rose-950/40">
                <div className="flex items-center gap-2 mb-3">
                  <span className="p-1.5 bg-rose-500/20 text-rose-400 rounded-xl">
                    <Sparkles size={16} />
                  </span>
                  <h5 className="font-extrabold text-sm tracking-wider uppercase">Plano de Ataque Recomendado</h5>
                </div>

                <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                  <p>
                    Com base no diagnóstico da sua carteira, sua melhor estratégia de quitação é focar seus esforços de forma direcionada, seguindo o <strong className="text-white">Método Avalanche Consolidado</strong>:
                  </p>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex gap-2">
                      <span className="font-bold text-rose-400 flex-shrink-0">1º</span>
                      <p>
                        Pague apenas o valor mínimo das outras dívidas para manter seu CPF limpo e evitar multas por atraso.
                      </p>
                    </div>

                    <div className="flex gap-2 border-t border-white/5 pt-3">
                      <span className="font-bold text-rose-400 flex-shrink-0">2º</span>
                      <p>
                        Concentre toda a sua <strong className="text-rose-400">Capacidade de Ataque de {formatCurrency(plannedAttackAmount)}</strong> para pagar o máximo possível da dívida <strong className="text-white uppercase">{highestPriorityDebt.name}</strong>, que está classificada com <strong className="text-rose-400">Prioridade {getPriority(highestPriorityDebt.type)}</strong> e com juros de <strong className="text-white">{highestPriorityDebt.interestRate}% ao mês</strong>.
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-rose-300 flex items-center gap-1 italic">
                    <Info size={12} /> A dívida "{highestPriorityDebt.name}" foi selecionada automaticamente como o alvo prioritário nº 1 devido à gravidade do tipo de débito e peso de juros acumulativos.
                  </p>
                </div>
              </div>
            )}

            {/* Exit Forecasts Card */}
            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Calendar size={16} />
                </span>
                <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">Simulação e Previsão de Saída</h5>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 flex items-center gap-4">
                  <span className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold flex-shrink-0">
                    {monthsToFree}
                  </span>
                  <div>
                    <h6 className="font-bold text-xs text-slate-700 dark:text-slate-300">Prazo Estimado Normal</h6>
                    <p className="text-[10px] text-slate-500 mt-0.5">Mantendo o aporte de {formatCurrency(plannedAttackAmount)}/mês.</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 flex items-center gap-4">
                  <span className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold flex-shrink-0">
                    {monthsWith150Cut}
                  </span>
                  <div>
                    <h6 className="font-bold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      Se cortar R$ 150 de extras <TrendingUp size={12} />
                    </h6>
                    <p className="text-[10px] text-slate-500 mt-0.5">Aporte aumenta para {formatCurrency(plannedAttackAmount + 150)}/mês.</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 flex items-center gap-4">
                  <span className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold flex-shrink-0">
                    {monthsWith300Increase}
                  </span>
                  <div>
                    <h6 className="font-bold text-xs text-indigo-700 dark:text-indigo-400">Renda Extra + R$ 300/mês</h6>
                    <p className="text-[10px] text-slate-500 mt-0.5">Aporte aumenta para {formatCurrency(plannedAttackAmount + 300)}/mês.</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 flex items-center gap-4">
                  <span className="w-10 h-10 bg-gradient-to-br from-amber-400 to-rose-500 text-white rounded-full flex items-center justify-center font-extrabold flex-shrink-0 shadow-sm shadow-rose-200 dark:shadow-none">
                    {monthsWithBoth}
                  </span>
                  <div>
                    <h6 className="font-bold text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      Fazer Ambos (Ganhar + Poupar) ✨
                    </h6>
                    <p className="text-[10px] text-slate-500 mt-0.5">Aporte aumenta para {formatCurrency(plannedAttackAmount + 450)}/mês.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
