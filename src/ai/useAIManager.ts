import { useState, useEffect, useRef, useCallback } from 'react';
import { AIState, AIModelType, AIMessage } from './types';

// Global singleton worker to prevent reloading models when switching tabs
let globalWorker: Worker | null = null;
let inactivityTimer: number | null = null;
let globalAiState: AIState = 'AI_UNLOADED';
let globalMessages: AIMessage[] = [];
let globalStatusText = '';
let globalInstalledModels: Record<AIModelType, boolean> = {
  'LFM2.5-350M': false,
  'Gemma-3-1B': false
};

const listeners = new Set<() => void>();
const notifyListeners = () => listeners.forEach(l => l());

const resetUnloadTimer = () => {
  if (inactivityTimer) window.clearTimeout(inactivityTimer);
  // Unload after 5 minutes of inactivity instead of 2 for better UX
  inactivityTimer = window.setTimeout(() => {
    if (globalWorker) {
      globalWorker.postMessage({ type: 'UNLOAD' });
    }
  }, 5 * 60 * 1000);
};

export function useAIManager(storeAddTransaction?: (monthId: string, transaction: any) => void) {
  // Local state tied to global state
  const [aiState, setAiState] = useState<AIState>(globalAiState);
  const [messages, setMessages] = useState<AIMessage[]>(globalMessages);
  const [statusText, setStatusText] = useState(globalStatusText);
  const [installedModels, setInstalledModels] = useState<Record<AIModelType, boolean>>(globalInstalledModels);

  const initWorker = useCallback(() => {
    if (!globalWorker) {
      globalWorker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
      
      globalWorker.onmessage = (e) => {
        const { type, payload } = e.data;
        switch (type) {
          case 'STATE_CHANGE':
            globalAiState = payload.state;
            if (payload.state !== 'AI_PROCESSING' && payload.state !== 'AI_LOADING') {
               globalStatusText = '';
            }
            notifyListeners();
            break;
          case 'STATUS_UPDATE':
            if (typeof payload === 'string') {
              globalStatusText = payload;
            } else if (payload.installedModels) {
              globalInstalledModels = payload.installedModels;
            }
            notifyListeners();
            break;
          case 'RESPONSE':
            globalMessages = [...globalMessages, {
              id: Date.now().toString(),
              role: 'assistant',
              content: payload,
              timestamp: Date.now()
            }];
            notifyListeners();
            break;
          case 'TOOL_CALL':
             if (payload.action === 'create_transaction' && storeAddTransaction) {
                const monthId = new Date().toISOString().slice(0, 7);
                storeAddTransaction(monthId, {
                   ...payload.data,
                   isPending: false
                });
             }
             break;
          case 'ERROR':
            globalMessages = [...globalMessages, {
              id: Date.now().toString(),
              role: 'system',
              content: `Erro: ${payload}`,
              timestamp: Date.now()
            }];
            notifyListeners();
            break;
        }
      };
      
      globalWorker.postMessage({ type: 'CHECK_STATUS' });
    }
  }, [storeAddTransaction]);

  useEffect(() => {
    const handleUpdate = () => {
      setAiState(globalAiState);
      setMessages(globalMessages);
      setStatusText(globalStatusText);
      setInstalledModels(globalInstalledModels);
    };

    listeners.add(handleUpdate);
    initWorker();

    return () => {
      listeners.delete(handleUpdate);
      // We DO NOT unload the worker here! It survives component unmounts.
    };
  }, [initWorker]);

  const sendMessage = useCallback((text: string, contextHasDebts: boolean) => {
    if (!globalWorker) initWorker();
    
    resetUnloadTimer();
    
    globalMessages = [...globalMessages, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    }];
    notifyListeners();

    const context = {
       balance: 0, 
       hasDebts: contextHasDebts
    };

    globalWorker?.postMessage({ type: 'QUERY', payload: { text, context } });
  }, [initWorker]);

  const installModel = useCallback((model: AIModelType) => {
     if (!globalWorker) initWorker();
     globalWorker?.postMessage({ type: 'INSTALL', payload: { model } });
  }, [initWorker]);

  return {
    aiState,
    messages,
    sendMessage,
    statusText,
    installedModels,
    installModel
  };
}
