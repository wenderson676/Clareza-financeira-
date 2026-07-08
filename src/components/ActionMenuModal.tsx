import React from 'react';
import { Plus, Minus, ArrowRightLeft, Target, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActionMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: 'income' | 'expense' | 'transfer' | 'goal') => void;
}

export function ActionMenuModal({ isOpen, onClose, onSelectAction }: ActionMenuModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">
              Adicionar
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => onSelectAction('income')}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl transition-colors"
              >
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                  <Plus size={24} />
                </div>
                <span className="font-semibold text-sm">Receita</span>
              </button>
              
              <button 
                onClick={() => onSelectAction('expense')}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl transition-colors"
              >
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                  <Minus size={24} />
                </div>
                <span className="font-semibold text-sm">Gasto</span>
              </button>
              
              <button 
                onClick={() => onSelectAction('transfer')}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl transition-colors"
              >
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                  <ArrowRightLeft size={24} />
                </div>
                <span className="font-semibold text-sm">Transferência</span>
              </button>
              
              <button 
                onClick={() => onSelectAction('goal')}
                className="flex flex-col items-center justify-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl transition-colors"
              >
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                  <Target size={24} />
                </div>
                <span className="font-semibold text-sm">Adicionar Meta</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
