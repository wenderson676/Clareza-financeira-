import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, HelpCircle, Sparkles } from 'lucide-react';

export interface TourStep {
  title: string;
  description: string;
  targetId?: string; // HTML element ID to point to
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  tab?: 'dashboard' | 'transactions' | 'planning' | 'comparison';
}

interface TutorialTourProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  setCurrentTab: (tab: any) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

export function TutorialTour({
  isOpen,
  onClose,
  currentTab,
  setCurrentTab,
  openSidebar,
  closeSidebar,
}: TutorialTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const steps: TourStep[] = [
    {
      title: '👋 Bem-vindo ao Clareza Financeira!',
      description: 'Neste tour rápido, vamos ensinar você a usar as principais funções para controlar seu dinheiro, economizar e alcançar seus objetivos de forma simples e intuitiva.',
      placement: 'center',
    },
    {
      title: '🍔 Menu Lateral & Configurações',
      description: 'Toque no ícone do Menu no topo esquerdo para alternar o modo escuro, ajustar suas preferências de orçamento, exportar seus dados ou falar conosco no WhatsApp.',
      targetId: 'sidebar-trigger',
      placement: 'bottom',
    },
    {
      title: '🏦 Suas Contas e Patrimônio',
      description: 'Aqui você acompanha o saldo de todas as suas contas cadastradas (Banco, Reserva, Carteira) e seu saldo total consolidado em tempo real.',
      targetId: 'dashboard-accounts',
      placement: 'bottom',
      tab: 'dashboard',
    },
    {
      title: '➕ Registrar Lançamentos',
      description: 'Este botão verde flutuante no centro é onde tudo acontece! Toque nele para registrar receitas, despesas ou realizar transferências de forma super rápida.',
      targetId: 'nav-add-btn',
      placement: 'top',
    },
    {
      title: '📜 Extrato Completo e Filtros',
      description: 'Na aba Extrato você visualiza o histórico detalhado dos seus lançamentos, pesquisa termos específicos e filtra por categorias para ver onde gastou.',
      targetId: 'nav-transactions',
      placement: 'top',
      tab: 'transactions',
    },
    {
      title: '🎯 Metas e Reserva Financeira',
      description: 'Na aba Contador, crie e acompanhe suas metas de economia (reserva de emergência, viagens) e controle suas dívidas com facilidade.',
      targetId: 'nav-planning',
      placement: 'top',
      tab: 'planning',
    },
    {
      title: '📊 Gráficos e Comparativos',
      description: 'Na aba Análise, visualize gráficos interativos, divisões de porcentagem por categorias e compare a evolução do seu patrimônio mês a mês.',
      targetId: 'nav-comparison',
      placement: 'top',
      tab: 'comparison',
    },
    {
      title: '🚀 Tudo Pronto para Decolar!',
      description: 'Você agora tem o controle total nas mãos. Se tiver qualquer dúvida, basta clicar no item "Como Usar o App" dentro do menu lateral para iniciar este tour novamente!',
      placement: 'center',
    },
  ];

  const step = steps[currentStep];

  // Detect mobile width to switch to bulletproof docked presentation
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync tab active states automatically as the user progresses
  useEffect(() => {
    if (!isOpen) return;

    if (step.tab && currentTab !== step.tab) {
      setCurrentTab(step.tab);
    }

    if (step.targetId !== 'sidebar-trigger') {
      closeSidebar();
    }
  }, [currentStep, isOpen]);

  // Track coordinates of the targeted HTML elements and scroll them into view
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!step.targetId) {
        setCoords(null);
        return;
      }

      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setCoords(null);
      }
    };

    // Scroll target element to center of view so the user can easily see it
    const scrollTimer = setTimeout(() => {
      if (step.targetId) {
        const element = document.getElementById(step.targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
      }
    }, 180);

    updatePosition();
    const interval = setInterval(updatePosition, 150);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(scrollTimer);
      clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [currentStep, isOpen, currentTab]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleCloseTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCloseTour = () => {
    setCurrentStep(0);
    setCoords(null);
    onClose();
  };

  if (!isOpen) return null;

  // Calculate coordinates for floating bubble on desktop
  const getFloatingBubbleStyle = (): React.CSSProperties => {
    if (!coords) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '340px',
        zIndex: 120,
      };
    }

    const margin = 24; // Margin to prevent overlapping target element
    const bubbleWidth = 340;
    
    // Center horizontally but keep within screen bounds
    const left = Math.min(
      Math.max(margin, coords.left + coords.width / 2 - bubbleWidth / 2),
      window.innerWidth - bubbleWidth - margin
    );

    let top = 0;
    let transform = '';

    if (step.placement === 'bottom') {
      top = coords.top + coords.height + margin;
    } else if (step.placement === 'top') {
      top = coords.top - margin;
      transform = 'translateY(-100%)';
    } else {
      top = coords.top + coords.height + margin;
    }

    // Safety checks for vertical clipping
    if (transform === 'translateY(-100%)' && top < 120) {
      top = coords.top + coords.height + margin;
      transform = '';
    } else if (transform === '' && top + 220 > window.innerHeight) {
      top = coords.top - margin;
      transform = 'translateY(-100%)';
    }

    // Double lock bounds
    top = Math.max(margin, Math.min(top, window.innerHeight - margin));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform,
      width: `${bubbleWidth}px`,
      zIndex: 120,
      pointerEvents: 'auto',
    };
  };

  // Determine mobile docking position to strictly avoid overlapping the highlighted element
  const getMobileBubbleStyle = (): React.CSSProperties => {
    if (!coords) {
      return {
        position: 'fixed',
        top: '50%',
        left: '16px',
        right: '16px',
        transform: 'translateY(-50%)',
        width: 'calc(100% - 32px)',
        zIndex: 120,
      };
    }

    // If target button is in the lower half of the screen (e.g. bottom navigation buttons)
    // we dock the tutorial bubble at the top of the screen to give it lots of space.
    // If it's in the top half, we dock it at the bottom.
    const isTargetInLowerHalf = coords.top > window.innerHeight / 2;

    if (isTargetInLowerHalf) {
      return {
        position: 'fixed',
        top: '24px',
        left: '16px',
        right: '16px',
        width: 'calc(100% - 32px)',
        zIndex: 120,
      };
    } else {
      return {
        position: 'fixed',
        bottom: '24px',
        left: '16px',
        right: '16px',
        width: 'calc(100% - 32px)',
        zIndex: 120,
      };
    }
  };

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none select-none">
      {/* 
        Intelligent Dynamic Backdrop:
        - When a specific element is highlighted (coords exists), we render a completely transparent backdrop.
          This ensures the target button has 100% clarity/brightness because there is no dark layer on top of it.
        - When there is no highlighted element (center step), we render a classic solid dimmed overlay.
      */}
      {!coords ? (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-auto"
          style={{ zIndex: 90 }}
          onClick={handleCloseTour}
        />
      ) : (
        <div 
          className="fixed inset-0 bg-transparent transition-opacity duration-300 pointer-events-auto"
          style={{ zIndex: 90 }}
          onClick={handleCloseTour}
        />
      )}

      {/* Target Element Spotlight with high-contrast emerald borders and glowing neon shadow */}
      {coords && (
        <>
          {/* Outer glowing pulsing halo */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: [0.95, 1.15, 0.95],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut"
            }}
            className="fixed rounded-full bg-emerald-500/20 border-2 border-emerald-400 pointer-events-none"
            style={{
              top: coords.top - 12,
              left: coords.left - 12,
              width: coords.width + 24,
              height: coords.height + 24,
              zIndex: 105,
              boxShadow: '0 0 20px rgba(16,185,129,0.4)',
            }}
          />

          {/* Core Spotlight clipping target - The shadow here handles the dark overlay with the cut-out */}
          <motion.div
            layout
            className="fixed rounded-2xl border-[3px] border-emerald-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.78)] pointer-events-none"
            style={{
              top: coords.top - 6,
              left: coords.left - 6,
              width: coords.width + 12,
              height: coords.height + 12,
              zIndex: 110,
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          />
        </>
      )}

      {/* Floating Tour Bubble / Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={
            isMobile 
              ? { opacity: 0, y: 50 } 
              : { opacity: 0, scale: 0.92, y: coords && step.placement === 'top' ? -20 : 20 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={isMobile ? { opacity: 0, y: 50 } : { opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          style={isMobile ? getMobileBubbleStyle() : getFloatingBubbleStyle()}
          className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-6 flex flex-col text-left gap-4 pointer-events-auto select-text"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black tracking-wider uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-1 px-3 rounded-full">
                Tutorial • Passo {currentStep + 1} de {steps.length}
              </span>
              {step.placement === 'center' && (
                <Sparkles size={14} className="text-amber-500 animate-pulse" />
              )}
            </div>
            <button
              onClick={handleCloseTour}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Description Block */}
          <div className="space-y-2">
            <h4 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 leading-snug flex items-center gap-1.5">
              {step.title}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {step.description}
            </p>
          </div>

          {/* Progress bar indicator */}
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full" 
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Footer Controls */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleCloseTour}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              Pular tutorial
            </button>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Voltar
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all flex items-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/15"
              >
                <span>{currentStep === steps.length - 1 ? 'Concluir' : 'Avançar'}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
