import { useState, useEffect, useRef, useCallback } from 'react';
import { AIState, AIModelType, AIMessage } from './types';
import { useStore } from '../lib/store';

export function useAIManager() {
  const [aiState, setAiState] = useState<AIState>('AI_UNLOADED');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [statusText, setStatusText] = useState('');
  const [installedModels, setInstalledModels] = useState<Record<AIModelType, boolean>>({
    'LFM2.5-350M': false,
    'Gemma-3-1B': false
  });
  
  const workerRef = useRef<Worker | null>(null);
  const unloadTimerRef = useRef<number | null>(null);
  const store = useStore();

  const resetUnloadTimer = useCallback(() => {
    if (unloadTimerRef.current) {
      window.clearTimeout(unloadTimerRef.current);
    }
    // Auto unload after 2 minutes of inactivity
    unloadTimerRef.current = window.setTimeout(() => {
      unloadModels();
    }, 2 * 60 * 1000);
  }, []);

  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data;
        switch (type) {
          case 'STATE_CHANGE':
            setAiState(payload.state);
            if (payload.state !== 'AI_PROCESSING' && payload.state !== 'AI_LOADING') {
               setStatusText('');
            }
            break;
          case 'STATUS_UPDATE':
            if (typeof payload === 'string') {
              setStatusText(payload);
            } else if (payload.installedModels) {
              setInstalledModels(payload.installedModels);
            }
            break;
          case 'RESPONSE':
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: payload,
              timestamp: Date.now()
            }]);
            break;
          case 'TOOL_CALL':
             // Execute tool call safely
             if (payload.action === 'create_transaction') {
                const monthId = new Date().toISOString().slice(0, 7);
                store.addTransaction(monthId, {
                   ...payload.data,
                   isPending: false
                });
             }
             break;
          case 'ERROR':
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'system',
              content: `Erro: ${payload}`,
              timestamp: Date.now()
            }]);
            break;
        }
      };
      
      workerRef.current.postMessage({ type: 'CHECK_STATUS' });
    }
  }, [store]);

  const sendMessage = useCallback((text: string) => {
    if (!workerRef.current) initWorker();
    
    resetUnloadTimer();
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    }]);

    // Build context
    const context = {
       balance: 0, // Mocked for now, you can pass store data
       hasDebts: (store.state.debts?.length || 0) > 0
    };

    workerRef.current?.postMessage({ type: 'QUERY', payload: { text, context } });
  }, [initWorker, resetUnloadTimer, store.state.debts]);

  const installModel = useCallback((model: AIModelType) => {
     if (!workerRef.current) initWorker();
     workerRef.current?.postMessage({ type: 'INSTALL', payload: { model } });
  }, [initWorker]);

  const unloadModels = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'UNLOAD' });
    }
  }, []);

  // Check initial installation status
  useEffect(() => {
    initWorker();
    return () => {
      if (unloadTimerRef.current) window.clearTimeout(unloadTimerRef.current);
      // We don't terminate the worker entirely immediately because the app might still want it alive,
      // but unloading memory is fine.
      unloadModels();
    };
  }, [initWorker, unloadModels]);

  return {
    aiState,
    messages,
    sendMessage,
    unloadModels,
    statusText,
    installedModels,
    installModel
  };
}
