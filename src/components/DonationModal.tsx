import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Copy, Check, Sparkles, Coffee, ShieldCheck, QrCode } from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  const pixKey = '2f4304ec-b441-4cb3-91fb-e5203b7ce479';
  const recipientName = 'Wenderson Gomes';
  const bankName = 'Banco Inter';

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4 max-w-xl mx-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-amber-500/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-inner">
                <Heart size={20} className="fill-rose-500/30" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                  Apoiar o Criador
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Contribuição espontânea via Pix
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-5 text-left scrollbar-thin">
            
            {/* Friendly Encouraging Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-emerald-500/10 border border-amber-200/60 dark:border-amber-500/20 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <Sparkles size={16} className="text-amber-500 shrink-0" />
                <span>O APK tem sido útil para você?</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Este aplicativo foi desenvolvido de forma 100% independente para te ajudar a ter total clareza sobre suas finanças, sem cobranças de mensalidades ou anúncios invasivos.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                Se você está gostando e puder apoiar com qualquer valor (R$ 2, R$ 5, R$ 10 ou mais), sua contribuição ajuda muito a manter o projeto ativo e com contínuas melhorias! ❤️
              </p>
            </div>

            {/* Pix Details Box */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Dados para Transferência
                </span>
                <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Pix Seguro
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 dark:text-slate-500 font-medium">Nome do Beneficiário:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{recipientName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 dark:text-slate-500 font-medium">Banco:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{bankName}</span>
                </div>
              </div>

              {/* Pix Key Box */}
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Chave Pix (Chave Aleatória)
                </label>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl">
                  <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 flex-1 truncate select-all">
                    {pixKey}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/30'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copiar Chave</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Value Suggestion Badges */}
            <div>
              <span className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Sugestões de Apoio
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl text-center">
                  <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">R$ 2,00</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center justify-center gap-1 mt-0.5">
                    <Coffee size={10} /> Um café
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl text-center">
                  <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">R$ 5,00</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center justify-center gap-1 mt-0.5">
                    <Sparkles size={10} /> Incentivo
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl text-center">
                  <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">R$ 10,00+</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center justify-center gap-1 mt-0.5">
                    <Heart size={10} className="fill-rose-500 text-rose-500" /> Super Apoio
                  </span>
                </div>
              </div>
            </div>

            {/* Thank you Note */}
            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 font-medium pt-1">
              Muito obrigado por incentivar o desenvolvimento contínuo do Clareza Financeira! 🙏
            </p>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex gap-2.5">
            <button
              onClick={handleCopyPix}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Chave Copiada!' : 'Copiar Chave Pix'}</span>
            </button>
            <button
              onClick={onClose}
              className="py-3 px-4 rounded-xl text-xs font-bold bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
