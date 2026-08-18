import React, { useState, useRef, useEffect } from 'react';
import { useAIManager as useAI } from '../ai/useAIManager';
import { useStore } from '../lib/store';
import { 
  Bot, ShieldCheck, X, CheckCircle, Download, 
  BrainCircuit, Send, Settings2, User, Sparkles, Cpu, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AIModelType } from '../ai/types';

export const AIConselheiro = () => {
  const { messages, sendMessage, aiState, statusText, installedModels, installModel } = useAI();
  const store = useStore();
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim(), (store.state.debts?.length || 0) > 0);
    setInput('');
  };

  const hasAnyModelInstalled = installedModels['Assistente-Rápido'] || installedModels['Conselheiro-Avançado'];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-slate-950 relative overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
             <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
               Clareza IA
             </h2>
             <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
               <ShieldCheck size={12} /> 100% Privado (Offline)
             </span>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors relative"
        >
          <Settings2 size={20} />
          {!hasAnyModelInstalled && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
          )}
        </button>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 z-0 pb-24">
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 max-w-xs mx-auto"
          >
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
              <Bot size={32} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Como posso ajudar?</h3>
            <p className="text-sm leading-relaxed">
              Diga coisas como <span className="font-medium text-indigo-600 dark:text-indigo-400">"Gastei R$50 de gasolina"</span> ou <span className="font-medium text-indigo-600 dark:text-indigo-400">"Me dê dicas para economizar"</span>.
            </p>
          </motion.div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          if (isSystem) {
            return (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={msg.id} 
                className="flex justify-center my-4"
              >
                <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs px-4 py-2 rounded-xl font-medium border border-rose-100 dark:border-rose-800/50 flex items-center gap-2 max-w-[90%] text-center shadow-sm">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{msg.content}</span>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isUser ? 'bg-slate-200 dark:bg-slate-700' : 'bg-gradient-to-tr from-indigo-500 to-purple-500'}`}>
                {isUser ? <User size={16} className="text-slate-600 dark:text-slate-300" /> : <Sparkles size={16} className="text-white" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                isUser 
                  ? 'bg-indigo-600 text-white rounded-br-sm' 
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-100 dark:border-slate-700/50'
              }`}>
                 {msg.content}
              </div>
            </motion.div>
          );
        })}
        
        {statusText && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 flex-row items-end"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-tr from-indigo-500 to-purple-500">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs px-4 py-3 rounded-2xl rounded-bl-sm font-medium flex items-center gap-2 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="ml-1">{statusText}</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC] to-transparent dark:from-slate-950 dark:via-slate-950 z-10 pt-10">
         <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-white dark:bg-slate-900 p-1.5 rounded-full shadow-lg border border-slate-200 dark:border-slate-800">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={hasAnyModelInstalled ? "Mensagem..." : "Instale um modelo para conversar"}
              disabled={aiState === 'AI_LOADING' || aiState === 'AI_PROCESSING' || !hasAnyModelInstalled}
              className="flex-1 bg-transparent border-none px-4 py-2 text-sm focus:ring-0 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 disabled:opacity-50 outline-none"
            />
            <button 
              type="submit"
              disabled={!input.trim() || aiState === 'AI_LOADING' || aiState === 'AI_PROCESSING' || !hasAnyModelInstalled}
              className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition-colors flex-shrink-0"
            >
              <Send size={18} className="ml-0.5" />
            </button>
         </form>
      </div>

      {/* Settings/Models Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Cpu className="text-indigo-500" /> Modelos Offline
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Baixe a IA para o seu dispositivo</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-300 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                  <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">
                    O processamento acontece 100% no seu processador (CPU). Nenhum dado é enviado à internet.
                  </p>
                </div>

                {/* Modelo Rápido */}
                <div className={`p-5 rounded-2xl border-2 transition-colors ${installedModels['Assistente-Rápido'] ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/50' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Assistente Rápido</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Qwen 0.5B (Recomendado)</p>
                    </div>
                    {installedModels['Assistente-Rápido'] ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full">
                        <CheckCircle size={14} /> Pronto
                      </span>
                    ) : (
                      <button 
                        disabled={aiState === 'AI_LOADING'}
                        onClick={() => installModel('Assistente-Rápido')} 
                        className="flex items-center gap-1.5 text-white text-xs font-bold bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-full disabled:opacity-50 transition-colors shadow-sm"
                      >
                        <Download size={14} /> Baixar
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Perfeito para registrar gastos diários e responder perguntas simples rapidamente.
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">Tamanho aprox: ~350MB</p>
                </div>

                {/* Modelo Avançado */}
                <div className={`p-5 rounded-2xl border-2 transition-colors ${installedModels['Conselheiro-Avançado'] ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/50' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Conselheiro Avançado</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">TinyLlama 1.1B</p>
                    </div>
                    {installedModels['Conselheiro-Avançado'] ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full">
                        <CheckCircle size={14} /> Pronto
                      </span>
                    ) : (
                      <button 
                        disabled={aiState === 'AI_LOADING'}
                        onClick={() => installModel('Conselheiro-Avançado')} 
                        className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3.5 py-1.5 rounded-full disabled:opacity-50 transition-colors shadow-sm"
                      >
                        <Download size={14} /> Baixar
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Mais inteligente, focado em dar conselhos financeiros complexos e análises do seu orçamento.
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">Tamanho aprox: ~700MB</p>
                </div>

                {statusText && aiState === 'AI_LOADING' && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 p-4 rounded-xl mt-4 text-center">
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center gap-2 animate-pulse">
                      <Download size={16} /> {statusText}
                    </p>
                  </div>
                )}
                
                {aiState === 'AI_ERROR' && messages.filter(m => m.role === 'system').length > 0 && (
                  <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 p-4 rounded-xl mt-4">
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1.5">
                      <AlertCircle size={14} /> Falha no Download
                    </p>
                    <p className="text-[11px] text-rose-600/80 dark:text-rose-300/80 break-words leading-relaxed">
                      {messages.filter(m => m.role === 'system').pop()?.content}
                    </p>
                  </div>
                )}
                <div className="h-6"></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
