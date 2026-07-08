import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Sparkles, X, Send, Sliders, Target, CreditCard, ArrowDownRight, ArrowUpRight, Check, CornerDownLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, BudgetMode, Bucket, TransactionType } from '../types';
import { formatCurrency, BUDGET_MODES_INFO } from '../lib/utils';

interface CopilotChatProps {
  monthId: string;
  state: AppState;
  addTransaction: (monthId: string, transaction: any) => void;
  addDebt: (debt: any) => void;
  addGoal: (goal: any) => void;
  setBudgetMode: (mode: BudgetMode) => void;
  setUserName: (name: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  commands?: any[];
  appliedCommands?: Record<number, boolean>; // map index to boolean
}

export function CopilotChat({
  monthId,
  state,
  addTransaction,
  addDebt,
  addGoal,
  setBudgetMode,
  setUserName
}: CopilotChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('clareza_copilot_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse copilot messages', e);
      }
    }
    return [
      {
        id: 'welcome',
        sender: 'assistant',
        text: `Olá, **${state.userName || 'parceiro(a)'}**! Sou o **Clareza**, seu copiloto financeiro pessoal. 🦾💰\n\nPode falar comigo em linguagem natural, do jeito que preferir! Por exemplo, digite:\n- *"ganhei 1500 hoje"* \n- *"gastei 40 com cigarro"* \n- *"estou apertado, qual modo devo usar?"*\n- *"devo 800 pro agiota"* \n- *"quero juntar 5 mil pra ferramentas"*\n\nEstou aqui para te ouvir, analisar sua situação real e te ajudar a organizar tudo! O que vamos fazer hoje?`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSendRef = useRef<(text: string) => void>();

  useEffect(() => {
    localStorage.setItem('clareza_copilot_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  useEffect(() => {
    const handleClear = () => {
      localStorage.removeItem('clareza_copilot_messages');
      setMessages([{
        id: 'welcome',
        sender: 'assistant',
        text: `Olá! Eu sou o seu **Copiloto Financeiro**. Como posso ajudar a organizar suas finanças hoje?`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);
    };

    const handleStartAnalysis = () => {
      setIsOpen(true);
      setTimeout(() => {
        if (handleSendRef.current) {
          handleSendRef.current("Quero fazer uma análise da minha vida financeira para saber qual o modo de divisão de gastos ideal e planejar minhas metas.");
        }
      }, 500);
    };

    window.addEventListener('clear_copilot_messages', handleClear);
    window.addEventListener('start_financial_analysis', handleStartAnalysis);
    return () => {
      window.removeEventListener('clear_copilot_messages', handleClear);
      window.removeEventListener('start_financial_analysis', handleStartAnalysis);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          state,
          monthId
        })
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await response.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: data.reply || 'Desculpe, não consegui processar sua mensagem.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        commands: data.commands || [],
        appliedCommands: {}
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: 'Epa! Tive uma pequena instabilidade de conexão aqui. Você poderia repetir ou tentar em alguns segundos? 🔌⏳',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyCommand = (msgId: string, cmdIndex: number, cmd: any) => {
    try {
      if (cmd.type === 'ADD_TRANSACTION') {
        const trans = cmd.data;
        
        // Normalize type
        let normalizedType: TransactionType = 'expense';
        const rawType = String(trans.type).toLowerCase();
        if (rawType === 'income' || rawType === 'entrada') normalizedType = 'income';
        else if (rawType === 'transfer_to_savings') normalizedType = 'transfer_to_savings';
        else if (rawType === 'transfer_from_savings') normalizedType = 'transfer_from_savings';
        else if (rawType === 'expense' || rawType === 'saida' || rawType === 'saída') normalizedType = 'expense';

        const cmdMonthId = trans.date ? trans.date.substring(0, 7) : monthId;
        addTransaction(cmdMonthId, {
          description: trans.description || 'Lançamento via Chat',
          amount: Number(trans.amount) || 0,
          type: normalizedType,
          category: trans.category || 'Outros',
          bucket: (trans.bucket || 'Desejos') as Bucket,
          isPending: trans.isPending ?? false,
          date: trans.date || new Date().toISOString().split('T')[0]
        });
      } else if (cmd.type === 'ADD_DEBT') {
        const debt = cmd.data;
        addDebt({
          name: debt.name || debt.creditor || 'Dívida',
          totalAmount: Number(debt.totalAmount) || 0,
          monthlyPayment: Number(debt.monthlyPayment) || 0,
          interestRate: Number(debt.interestRate) || 0,
          isLate: debt.isLate ?? false,
          creditor: debt.creditor || 'Credor',
          type: debt.debtType || 'other'
        });
      } else if (cmd.type === 'ADD_GOAL') {
        const goal = cmd.data;
        addGoal({
          title: goal.title || 'Objetivo',
          targetAmount: Number(goal.targetAmount) || 0,
          currentAmount: Number(goal.currentAmount) || 0
        });
      } else if (cmd.type === 'SET_BUDGET_MODE') {
        const targetMode = cmd.data?.budgetMode || cmd.mode;
        if (targetMode) {
          setBudgetMode(targetMode as BudgetMode);
        }
      } else if (cmd.type === 'SET_USERNAME') {
        const name = cmd.data?.name || cmd.name;
        if (name) {
          setUserName(name);
        }
      }

      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            appliedCommands: {
              ...(m.appliedCommands || {}),
              [cmdIndex]: true
            }
          };
        }
        return m;
      }));
    } catch (e) {
      console.error('Failed to apply command', e);
    }
  };

  const renderFormattedText = (text: string) => {
    // Basic bold **text** parsing
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      
      // Handle simple bullet lines
      if (part.startsWith('- ')) {
        return (
          <span key={index} className="block pl-3 my-0.5 relative">
            <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {part.substring(2)}
          </span>
        );
      }
      
      return part;
    });
  };

  const getDynamicSuggestions = () => {
    const currentMonth = state.monthlyData[monthId] || { transactions: [] };
    const hasDebts = state.debts && state.debts.length > 0;
    const hasGoals = state.goals && state.goals.length > 0;

    let dynamicSuggestions = [
      { label: "💰 Qual meu saldo livre?", text: "Qual meu saldo atual livre depois de pagar todas as contas desse mês?" },
      { label: "📉 Resumo dos gastos", text: "Faz um resumo de como estão meus gastos esse mês e previsões futuras" },
    ];

    if (hasDebts) {
       dynamicSuggestions.push({ label: "💳 Dívidas primeiro?", text: "Qual das minhas dívidas você sugere quitar primeiro e por que?" });
    }

    if (hasGoals) {
       dynamicSuggestions.push({ label: "🎯 Progresso das metas", text: "Como está o progresso das minhas metas?" });
    }

    dynamicSuggestions.push({ label: "🔍 Raio-X do mês", text: "Faz um raio-x do meu mês atual de acordo com minhas entradas e saídas" });
    dynamicSuggestions.push({ label: "📝 Registrar gasto", text: "gastei 50 no mercado hoje" });

    return dynamicSuggestions;
  };

  const suggestions = getDynamicSuggestions();

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 left-0 right-0 mx-auto max-w-xl z-40 pointer-events-none px-4 sm:px-6 flex justify-end">
        <div className="pointer-events-auto">
          <motion.button
            onClick={() => setIsOpen(true)}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer relative"
            aria-label="Abrir Copiloto Clareza"
          >
            <Sparkles size={16} className="animate-pulse" />
            
            {/* Pulsing ring animation */}
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400 opacity-75 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
          </motion.button>
        </div>
      </div>

      {/* Slide-Up Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 max-w-xl mx-auto"
            />

            {/* Chat content pane */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto h-[85vh] bg-white dark:bg-slate-900 shadow-2xl rounded-t-[32px] flex flex-col z-50 overflow-hidden border-t border-slate-100 dark:border-slate-800"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                    🔮
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-tight">
                      Copiloto Clareza
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">IA Ativa</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Seu assistente financeiro inteligente e pessoal</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (confirm("Deseja limpar o histórico da conversa?")) {
                        localStorage.removeItem('clareza_copilot_messages');
                        setMessages([
                          {
                            id: 'welcome',
                            sender: 'assistant',
                            text: `Histórico limpo! Como posso te ajudar a organizar as finanças agora, **${state.userName || 'parceiro(a)'}**?`,
                            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          }
                        ]);
                      }
                    }}
                    title="Limpar Conversa"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Messages viewport */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50 dark:bg-slate-950/20 custom-scrollbar">
                {messages.map((msg) => {
                  const isAssistant = msg.sender === 'assistant';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-end gap-2 max-w-[85%]">
                        {isAssistant && (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 select-none">
                            C
                          </div>
                        )}
                        <div
                          className={`p-4 rounded-3xl text-sm leading-relaxed text-left shadow-sm ${
                            isAssistant
                              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-100 dark:border-slate-800/60'
                              : 'bg-emerald-600 text-white rounded-br-none font-medium'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{renderFormattedText(msg.text)}</div>
                        </div>
                      </div>
                      
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-9">
                        {msg.timestamp}
                      </span>

                      {/* Display interactive Commands Cards if Assistant returned any */}
                      {isAssistant && msg.commands && msg.commands.length > 0 && (
                        <div className="pl-9 pr-4 w-full mt-3 space-y-3 max-w-md text-left">
                          {msg.commands.map((cmd, idx) => {
                            const isApplied = msg.appliedCommands?.[idx];
                            
                            // 1. ADD_TRANSACTION preview
                            if (cmd.type === 'ADD_TRANSACTION') {
                              const trans = cmd.data;
                              const isIncome = String(trans.type).toLowerCase() === 'income' || String(trans.type).toLowerCase() === 'entrada' || String(trans.bucket).toLowerCase() === 'renda';
                              return (
                                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs relative overflow-hidden transition-colors">
                                  <div className="flex items-center gap-3 mb-2.5">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                                      {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Confirmar {isIncome ? 'Entrada' : 'Saída'}?
                                      </h4>
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Sugerido por IA</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 mb-3 bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800/50">
                                    <p><strong className="text-slate-500">Descrição:</strong> {trans.description}</p>
                                    <p><strong className="text-slate-500">Valor:</strong> <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(trans.amount)}</span></p>
                                    <p><strong className="text-slate-500">Categoria:</strong> {trans.category} ({trans.bucket})</p>
                                    <p><strong className="text-slate-500">Data:</strong> {trans.date}</p>
                                  </div>

                                  <div className="flex gap-2">
                                    {isApplied ? (
                                      <span className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-100 dark:border-emerald-950/50">
                                        <Check size={14} /> Registrado com sucesso!
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => applyCommand(msg.id, idx, cmd)}
                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                                      >
                                        Registrar no Extrato
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            // 2. ADD_DEBT preview
                            if (cmd.type === 'ADD_DEBT') {
                              const debt = cmd.data;
                              return (
                                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs relative overflow-hidden transition-colors">
                                  <div className="flex items-center gap-3 mb-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
                                      <CreditCard size={16} />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Cadastrar Nova Dívida?
                                      </h4>
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Sugerido por IA</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 mb-3 bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800/50">
                                    <p><strong className="text-slate-500">Credor:</strong> {debt.creditor || debt.name}</p>
                                    <p><strong className="text-slate-500">Total Devido:</strong> <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(debt.totalAmount)}</span></p>
                                    {debt.monthlyPayment > 0 && <p><strong className="text-slate-500">Parcela Mensal:</strong> {formatCurrency(debt.monthlyPayment)}</p>}
                                    <p><strong className="text-slate-500">Tipo:</strong> {debt.debtType || 'Outros'}</p>
                                  </div>

                                  <div className="flex gap-2">
                                    {isApplied ? (
                                      <span className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-100 dark:border-emerald-950/50">
                                        <Check size={14} /> Dívida Salva!
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => applyCommand(msg.id, idx, cmd)}
                                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                                      >
                                        Adicionar Dívida
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            // 3. ADD_GOAL preview
                            if (cmd.type === 'ADD_GOAL') {
                              const goal = cmd.data;
                              return (
                                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs relative overflow-hidden transition-colors">
                                  <div className="flex items-center gap-3 mb-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                      <Target size={16} />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Criar Nova Meta?
                                      </h4>
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Sugerido por IA</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 mb-3 bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800/50">
                                    <p><strong className="text-slate-500">Objetivo:</strong> {goal.title}</p>
                                    <p><strong className="text-slate-500">Valor Alvo:</strong> <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(goal.targetAmount)}</span></p>
                                  </div>

                                  <div className="flex gap-2">
                                    {isApplied ? (
                                      <span className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-100 dark:border-emerald-950/50">
                                        <Check size={14} /> Meta Criada!
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => applyCommand(msg.id, idx, cmd)}
                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                                      >
                                        Criar Meta
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            // 4. SET_BUDGET_MODE preview
                            if (cmd.type === 'SET_BUDGET_MODE') {
                              const targetMode = cmd.data?.budgetMode || cmd.mode;
                              const modeDetails = BUDGET_MODES_INFO[targetMode as keyof typeof BUDGET_MODES_INFO];
                              if (!modeDetails) return null;
                              return (
                                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs relative overflow-hidden transition-colors">
                                  <div className="flex items-center gap-3 mb-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 flex items-center justify-center shrink-0">
                                      <Sliders size={16} />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Mudar Modo de Orçamento?
                                      </h4>
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Sugerido por IA</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 mb-3 bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800/50">
                                    <p><strong className="text-slate-500">Novo Modo:</strong> <span className="font-semibold text-slate-800 dark:text-slate-200">{modeDetails.name}</span></p>
                                    <p className="text-[10px] mt-1 italic text-slate-400">{modeDetails.description}</p>
                                  </div>

                                  <div className="flex gap-2">
                                    {isApplied ? (
                                      <span className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-100 dark:border-emerald-950/50">
                                        <Check size={14} /> Modo Atualizado!
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => applyCommand(msg.id, idx, cmd)}
                                        className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                                      >
                                        Alterar Modo
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-end gap-2 max-w-[85%]">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 select-none">
                      C
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 rounded-3xl rounded-bl-none shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Suggestions Chips Bar */}
              <div className="px-6 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto select-none no-scrollbar">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(sug.text)}
                    disabled={isLoading}
                    className="shrink-0 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/10 dark:hover:bg-emerald-500/5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend(input);
                  }}
                  disabled={isLoading}
                  placeholder="Fale com o copiloto... (ex: gastei 20 de lanche hj)"
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500 rounded-2xl py-3 px-4 outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-all disabled:opacity-55"
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isLoading}
                  className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center disabled:opacity-40 disabled:hover:bg-emerald-600 transition-all cursor-pointer"
                  aria-label="Enviar mensagem"
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
