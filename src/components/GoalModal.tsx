import React, { useState, useEffect } from 'react';
import { Target, X } from 'lucide-react';
import { Goal } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Omit<Goal, 'id'>) => void;
  onUpdate: (id: string, goal: Partial<Goal>) => void;
  editingGoal?: Goal | null;
}

export function GoalModal({ isOpen, onClose, onSave, onUpdate, editingGoal }: GoalModalProps) {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingGoal) {
        setTitle(editingGoal.title);
        setTargetAmount(editingGoal.targetAmount.toString());
        setCurrentAmount(editingGoal.currentAmount.toString());
      } else {
        setTitle('');
        setTargetAmount('');
        setCurrentAmount('');
      }
    }
  }, [isOpen, editingGoal]);

  const handleSave = () => {
    if (!title || !targetAmount) return;
    
    if (editingGoal) {
      onUpdate(editingGoal.id, {
        title,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount) || 0
      });
    } else {
      onSave({
        title,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount) || 0
      });
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4"
          onClick={onClose}
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
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">O que você quer conquistar?</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: Reserva de Emergência, Viagem..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qual o valor total necessário?</label>
                  <input 
                    type="number" 
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    placeholder="R$ 0,00"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quanto você já tem guardado?</label>
                  <input 
                    type="number" 
                    value={currentAmount}
                    onChange={e => setCurrentAmount(e.target.value)}
                    placeholder="R$ 0,00"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <button
                onClick={handleSave}
                disabled={!title || !targetAmount}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl mt-6 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
              >
                {editingGoal ? 'Atualizar Meta' : 'Salvar Meta'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
