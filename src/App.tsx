import React, { useState, useEffect } from 'react';
import { Home, ListOrdered, Lightbulb, Moon, Sun, Target, Menu, X, Trash2, Plus, ChevronLeft, ChevronRight, Download, Upload, BarChart2 } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Comparison } from './components/Comparison';
import { Planning } from './components/Planning';
import { TransactionModal } from './components/TransactionModal';
import { ActionMenuModal } from './components/ActionMenuModal';
import { GoalModal } from './components/GoalModal';
import { useStore } from './lib/store';
import { format, addMonths, subMonths, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, BudgetMode, Goal } from './types';
import { BUDGET_MODES_INFO } from './lib/utils';

type Tab = 'dashboard' | 'transactions' | 'planning' | 'comparison';

export default function App() {
  const { 
    state, 
    getCurrentMonthId, 
    initMonth, 
    getMonthlyData, 
    getAccumulatedBalance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    toggleTransactionPending,
    setDevotionalNote,
    addAsset,
    deleteAsset,
    addGoal,
    updateGoal,
    deleteGoal,
    addDebt,
    updateDebt,
    deleteDebt,
    resetStore,
    importState,
    setUserName,
    setBudgetMode,
    setCardOrder
  } = useStore();

  const [currentTab, setCurrentTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [initialTransactionTab, setInitialTransactionTab] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [tempUserName, setTempUserName] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => !state.userName);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [selectedBudgetMode, setSelectedBudgetMode] = useState<BudgetMode>('50-30-20');
  
  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `clareza-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedState = JSON.parse(content);
        if (parsedState && parsedState.monthlyData) {
          importState(parsedState);
          alert('Dados importados com sucesso!');
          setIsSidebarOpen(false);
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao importar arquivo.');
      }
    };
    reader.readAsText(file);
    // clear the input
    event.target.value = '';
  };
  
  const monthId = format(currentMonthDate, 'yyyy-MM');

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('mordomia_theme') === 'dark' ||
      (!('mordomia_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    initMonth(monthId);
  }, [monthId]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mordomia_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mordomia_theme', 'light');
    }
  }, [isDarkMode]);

  const monthData = getMonthlyData(monthId);

  const formattedMonth = format(currentMonthDate, 'MMMM yyyy', { locale: ptBR });
  const capitalizedMonth = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);

  const handlePrevMonth = () => setCurrentMonthDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonthDate(prev => addMonths(prev, 1));

  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  const confirmResetData = () => {
    resetStore();
    setShowResetConfirm(false);
    setIsSidebarOpen(false);
    setCurrentMonthDate(new Date());
  };

  const handleSaveTransaction = (transaction: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      updateTransaction(monthId, editingTransaction.id, transaction);
    } else {
      addTransaction(monthId, transaction);
    }
  };

  const handleEditTransaction = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleOpenActionMenu = () => {
    setIsActionMenuOpen(true);
  };

  const handleActionSelect = (action: "income" | "expense" | "transfer" | "goal") => {
    setIsActionMenuOpen(false);
    if (action === "goal") {
      setEditingGoal(null);
      setIsGoalModalOpen(true);
    } else {
      setEditingTransaction(null);
      setInitialTransactionTab(action);
      setIsModalOpen(true);
    }
  };

  const handleOpenGoalForm = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
    } else {
      setEditingGoal(null);
    }
    setIsGoalModalOpen(true);
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-safe transition-colors duration-300">
      <div className="max-w-xl mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 shadow-2xl relative flex flex-col overflow-hidden transition-colors duration-300">
        
        {/* Header */}
        <header className="px-6 pt-12 pb-4 sticky top-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md z-30 flex justify-center items-center">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors absolute left-6"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-lg text-slate-800 dark:text-slate-100 font-bold capitalize min-w-[130px] text-center tracking-wide">
              {formattedMonth}
            </h1>
            <button onClick={handleNextMonth} className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </header>

        {/* Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 max-w-xl mx-auto"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 pt-12">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Clareza Financeira</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <X size={24} />
                    </button>
                  </div>
                  {state.userName && (
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold text-xl uppercase">
                        {state.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Olá,</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{state.userName}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Configurações</p>
                </div>
                
                <div className="p-4 flex-1">
                  <div className="space-y-2">
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 font-medium">
                        {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                        Modo {isDarkMode ? 'Noturno' : 'Claro'}
                      </div>
                      <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors">
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-4 bg-emerald-500' : ''}`} />
                      </div>
                    </button>

                    <div className="w-full p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left flex flex-col gap-1.5">
                      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 font-medium text-sm">
                        <Target size={20} className="text-emerald-500" />
                        Modo de Orçamento
                      </div>
                      <select
                        value={state.budgetMode || '50-30-20'}
                        onChange={(e) => setBudgetMode(e.target.value as BudgetMode)}
                        className="w-full mt-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="50-30-20">Padrão (50/30/20)</option>
                        <option value="80-10-10">Sobrevivência (80/10/10)</option>
                        <option value="90-5-5">Crise (90/5/5)</option>
                        <option value="70-0-30">Quitar Dívidas (70/0/30)</option>
                        <option value="50-20-30">Prosperar (50/20/30)</option>
                      </select>
                    </div>

                    <button 
                      onClick={handleExportData}
                      className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors text-left"
                    >
                      <Download size={20} />
                      Fazer Backup (Exportar JSON)
                    </button>

                    <label className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors text-left cursor-pointer">
                      <Upload size={20} />
                      Restaurar Backup
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={handleImportData}
                      />
                    </label>

                    <button 
                      onClick={handleResetData}
                      className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium transition-colors text-left"
                    >
                      <Trash2 size={20} />
                      Apagar todos os dados
                    </button>
                  </div>
                </div>
                
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Clareza Financeira v1.0</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 max-w-xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 dark:border-slate-800"
              >
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 mx-auto">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">Apagar todos os dados?</h3>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm">
                  Essa ação não pode ser desfeita. Todos os lançamentos, reservas e metas serão apagados permanentemente.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmResetData}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-rose-200 dark:shadow-rose-900/20"
                  >
                    Apagar Tudo
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome Modal */}
        <AnimatePresence>
          {showWelcomeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 max-w-xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 dark:border-slate-800 text-center max-h-[90vh] overflow-y-auto"
              >
                {onboardingStep === 1 ? (
                  <>
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Home size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Bem-vindo(a) à Clareza Financeira</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                      Como você gostaria de ser chamado(a)?
                    </p>
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={tempUserName}
                      onChange={(e) => setTempUserName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-6 text-center text-lg font-medium"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tempUserName.trim()) {
                          setOnboardingStep(2);
                        }
                      }}
                    />
                    <button
                      disabled={!tempUserName.trim()}
                      onClick={() => setOnboardingStep(2)}
                      className="w-full py-3.5 px-4 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base flex justify-center items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/10"
                    >
                      Avançar
                      <ChevronRight size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Olá, {tempUserName}!</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                      Escolha o modo de divisão financeira ideal para o seu momento atual:
                    </p>
                    
                    <div className="space-y-4 mb-6">
                      {Object.entries(BUDGET_MODES_INFO).map(([key, modeInfo]) => {
                        const isSelected = selectedBudgetMode === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedBudgetMode(key as BudgetMode)}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                              isSelected 
                                ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-500/5 shadow-sm' 
                                : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{modeInfo.name}</span>
                              {isSelected && <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-2">{modeInfo.description}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">{modeInfo.explanation}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setOnboardingStep(1)}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors text-sm"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={() => {
                          if (tempUserName.trim()) {
                            setUserName(tempUserName.trim());
                            setBudgetMode(selectedBudgetMode);
                            setShowWelcomeModal(false);
                          }
                        }}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900/10"
                      >
                        Começar
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <main className="flex-1 px-4 py-4 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <Dashboard 
              data={monthData} 
              previousBalance={getAccumulatedBalance(monthId)} 
              allData={state.monthlyData} 
              goals={state.goals} 
              addGoal={addGoal}
              onOpenGoalForm={handleOpenGoalForm} 
              updateGoal={updateGoal} 
              deleteGoal={deleteGoal}
              debts={state.debts || []}
              addDebt={addDebt}
              updateDebt={updateDebt}
              deleteDebt={deleteDebt}
              onSaveNote={(note) => setDevotionalNote(monthId, note)}
              budgetMode={state.budgetMode || '50-30-20'}
              dashboardCardOrder={state.dashboardCardOrder || []}
              setCardOrder={setCardOrder}
            />
          )}
          {currentTab === 'transactions' && (
            <Transactions 
              data={monthData} 
              onDelete={(id) => deleteTransaction(monthId, id)} 
              onTogglePending={(id) => toggleTransactionPending(monthId, id)}
              onEdit={handleEditTransaction}
            />
          )}
          {currentTab === 'planning' && (
            <Planning 
              data={monthData} 
              previousBalance={getAccumulatedBalance(monthId)} 
              budgetMode={state.budgetMode || '50-30-20'}
              allData={state.monthlyData}
              debts={state.debts}
              goals={state.goals}
            />
          )}
          {currentTab === 'comparison' && (
            <Comparison allData={state.monthlyData} />
          )}
        </main>

        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
          editingTransaction={editingTransaction}
          initialTab={initialTransactionTab}
        />

        <ActionMenuModal
          isOpen={isActionMenuOpen}
          onClose={() => setIsActionMenuOpen(false)}
          onSelectAction={handleActionSelect}
        />

        <GoalModal
          isOpen={isGoalModalOpen}
          onClose={() => setIsGoalModalOpen(false)}
          onSave={addGoal}
          onUpdate={updateGoal}
          editingGoal={editingGoal}
        />


        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full max-w-xl bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-between items-center z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] pb-safe transition-colors duration-300">
          <NavItem 
            icon={<Home size={24} />} 
            label="Início" 
            isActive={currentTab === 'dashboard'} 
            onClick={() => setCurrentTab('dashboard')} 
          />
          <NavItem 
            icon={<ListOrdered size={24} />} 
            label="Extrato" 
            isActive={currentTab === 'transactions'} 
            onClick={() => setCurrentTab('transactions')} 
          />
          
          {/* Centered Add Button */}
          <div className="relative -top-6">
            <button
              onClick={handleOpenActionMenu}
              className="w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 flex items-center justify-center hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={28} />
            </button>
          </div>

          <NavItem 
            icon={<Target size={24} />} 
            label="Contador" 
            isActive={currentTab === 'planning'} 
            onClick={() => setCurrentTab('planning')} 
          />
          <NavItem 
            icon={<BarChart2 size={24} />}
            label="Análise"
            isActive={currentTab === 'comparison'}
            onClick={() => setCurrentTab('comparison')}
          />
        </nav>
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 min-w-[70px] transition-colors ${
        isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
      }`}
    >
      <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-transparent'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
}
