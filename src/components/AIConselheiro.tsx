import React, { useState, useEffect, useRef } from 'react';
import { useAIManager } from '../ai/useAIManager';
import { useStore } from '../lib/store';
import { Send, Bot, BrainCircuit, Download, CheckCircle, Trash2, ShieldCheck, X } from 'lucide-react';
import { format } from 'date-fns';

interface AIConselheiroProps {
  onClose?: () => void;
}

export function AIConselheiro({ onClose }: AIConselheiroProps) {
  const store = useStore();
  const { aiState, messages, sendMessage, statusText, installedModels, installModel } = useAIManager(store.addTransaction);
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

  if (showSettings) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
           <h2 className="text-lg font-bold flex items-center gap-2">
              <BrainCircuit className="text-indigo-500" /> IA Offline
           </h2>
           <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
             <X size={20} />
           </button>
        </div>
        <div className="p-4 space-y-4">
           <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
             <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
               Seus dados permanecem no dispositivo. Nenhum dado financeiro é enviado para servidores externos.
             </p>
           </div>

           <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">LFM2.5-350M</h3>
                <p className="text-xs text-slate-500">IA Rápida (Recomendado)</p>
              </div>
              {installedModels['LFM2.5-350M'] ? (
                 <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-100 px-2 py-1 rounded">
                   <CheckCircle size={14} /> Instalado
                 </span>
              ) : (
                 <button onClick={() => installModel('LFM2.5-350M')} className="flex items-center gap-1 text-indigo-600 text-xs font-bold bg-indigo-100 px-3 py-1.5 rounded-lg">
                   <Download size={14} /> Instalar
                 </button>
              )}
           </div>

           <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Gemma 3 1B</h3>
                <p className="text-xs text-slate-500">IA Avançada (Análises complexas)</p>
              </div>
              {installedModels['Gemma-3-1B'] ? (
                 <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-100 px-2 py-1 rounded">
                   <CheckCircle size={14} /> Instalado
                 </span>
              ) : (
                 <button onClick={() => installModel('Gemma-3-1B')} className="flex items-center gap-1 text-indigo-600 text-xs font-bold bg-indigo-100 px-3 py-1.5 rounded-lg">
                   <Download size={14} /> Instalar
                 </button>
              )}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative">
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm z-10">
        <div>
           <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
             <Bot className="text-indigo-600" /> Conselheiro IA
           </h2>
           <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
             <ShieldCheck size={12} /> 100% Offline e Privado
           </span>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-200"
        >
          Modelos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 opacity-60">
            <Bot size={48} className="mb-2" />
            <p className="text-sm font-medium">Como posso ajudar com suas finanças hoje?</p>
            <p className="text-xs mt-1">Ex: "Gastei R$50 no mercado" ou "Analise meus gastos"</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
               msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : msg.role === 'system'
                ? 'bg-rose-100 text-rose-800 border border-rose-200 w-full text-center'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm'
            }`}>
               {msg.content}
            </div>
          </div>
        ))}
        
        {statusText && (
          <div className="flex justify-center">
             <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs px-3 py-1.5 rounded-full font-medium animate-pulse flex items-center gap-2">
               <BrainCircuit size={14} /> {statusText}
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
         <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Fale com a IA..."
              disabled={aiState === 'AI_LOADING' || aiState === 'AI_PROCESSING'}
              className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 outline-none"
            />
            <button 
              type="submit"
              disabled={!input.trim() || aiState === 'AI_LOADING' || aiState === 'AI_PROCESSING'}
              className="w-12 h-[44px] bg-indigo-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700"
            >
              <Send size={18} />
            </button>
         </form>
      </div>
    </div>
  );
}
