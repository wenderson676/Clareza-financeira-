import { AIWorkerMessage, AIState, AIModelType } from './types';

let state: AIState = 'AI_UNLOADED';
let lfmLoaded = false;
let gemmaLoaded = false;

// Simulated storage for model installation status
// In a real app, this might check IndexedDB for cached weights.
let installedModels: Record<AIModelType, boolean> = {
  'LFM2.5-350M': false, // Simulated default
  'Gemma-3-1B': false
};

const setState = (newState: AIState) => {
  state = newState;
  self.postMessage({ type: 'STATE_CHANGE', payload: { state } });
};

// Simulated tool calling structure
const mockLFMParse = (query: string) => {
  const q = query.toLowerCase();
  
  if (q.includes('gastei') || q.includes('comprei')) {
    // Extract intent for transaction
    return {
      intent: 'create_transaction',
      type: 'expense',
      amount: parseFloat(q.replace(/[^0-9,.]/g, '').replace(',', '.')) || 0,
      description: 'Gastos'
    };
  }
  
  if (q.includes('recebi')) {
    return {
      intent: 'create_transaction',
      type: 'income',
      amount: parseFloat(q.replace(/[^0-9,.]/g, '').replace(',', '.')) || 0,
      description: 'Receita'
    };
  }

  return { intent: 'general' };
};

const processQuery = async (query: string, context: any) => {
  setState('AI_PROCESSING');

  // LFM is required for everything
  if (!lfmLoaded) {
    if (!installedModels['LFM2.5-350M']) {
        throw new Error("LFM2.5-350M não está instalado. Por favor, instale o modelo rápido.");
    }
    setState('AI_LOADING');
    self.postMessage({ type: 'STATUS_UPDATE', payload: 'Preparando Conselheiro IA offline (LFM)...' });
    await new Promise(r => setTimeout(r, 800));
    lfmLoaded = true;
  }

  // AI Router Logic
  const lfmIntent = mockLFMParse(query);
  const isComplex = query.toLowerCase().includes('analise') || 
                    query.toLowerCase().includes('por que') || 
                    query.toLowerCase().includes('como posso') ||
                    query.length > 50;

  let responseText = '';

  if (isComplex) {
    // Needs Gemma
    if (!installedModels['Gemma-3-1B']) {
        setState('AI_IDLE');
        return "Essa análise exige o Conselheiro IA avançado. Instale o Gemma 3 1B nas configurações para utilizar essa função.";
    }

    if (!gemmaLoaded) {
        setState('AI_LOADING');
        self.postMessage({ type: 'STATUS_UPDATE', payload: 'Preparando análise avançada (Gemma 3 1B)...' });
        await new Promise(r => setTimeout(r, 1500));
        gemmaLoaded = true;
    }

    self.postMessage({ type: 'STATUS_UPDATE', payload: 'Analisando seus dados (Gemma)...' });
    await new Promise(r => setTimeout(r, 2000));
    
    responseText = "Análise concluída pelo Gemma 3 1B local: Notei que você concentra 40% dos gastos em necessidades e os fins de semana têm levado grande parte do seu lazer. Sugiro reduzir o delivery nos finais de semana para equilibrar.";
  } else {
    self.postMessage({ type: 'STATUS_UPDATE', payload: 'Processando (LFM)...' });
    await new Promise(r => setTimeout(r, 500));

    if (lfmIntent.intent === 'create_transaction') {
       // Return a tool call response
       self.postMessage({ 
         type: 'TOOL_CALL', 
         payload: {
           action: 'create_transaction',
           data: {
             type: lfmIntent.type,
             amount: lfmIntent.amount,
             description: lfmIntent.description,
             bucket: lfmIntent.type === 'expense' ? 'Necessidades' : 'Renda',
             category: lfmIntent.type === 'expense' ? 'Gastos IA' : 'Receita IA',
             date: new Date().toISOString().split('T')[0]
           }
         } 
       });
       responseText = `Entendi. Registrei ${lfmIntent.type === 'expense' ? 'um gasto' : 'uma receita'} de R$ ${lfmIntent.amount}.`;
    } else {
       responseText = "Sou seu conselheiro offline. Entendi sua mensagem: " + query;
    }
  }

  setState('AI_IDLE');
  return responseText;
};

self.onmessage = async (e: MessageEvent<AIWorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'CHECK_STATUS':
        self.postMessage({ 
            type: 'STATUS_UPDATE', 
            payload: { state, installedModels, lfmLoaded, gemmaLoaded } 
        });
        break;

      case 'INSTALL':
        const modelToInstall = payload.model as AIModelType;
        self.postMessage({ type: 'INSTALL_PROGRESS', payload: { model: modelToInstall, progress: 10 } });
        await new Promise(r => setTimeout(r, 1000));
        self.postMessage({ type: 'INSTALL_PROGRESS', payload: { model: modelToInstall, progress: 100 } });
        installedModels[modelToInstall] = true;
        self.postMessage({ type: 'STATUS_UPDATE', payload: { installedModels } });
        break;

      case 'INIT':
        setState('AI_LOADING');
        // We do lazy loading on processQuery instead, but we can setup the environment here.
        setState('AI_READY');
        break;

      case 'QUERY':
        const { text, context } = payload;
        const res = await processQuery(text, context);
        self.postMessage({ type: 'RESPONSE', payload: res });
        break;

      case 'UNLOAD':
        setState('AI_UNLOADING');
        await new Promise(r => setTimeout(r, 300));
        lfmLoaded = false;
        gemmaLoaded = false;
        setState('AI_UNLOADED');
        break;
    }
  } catch (err: any) {
    setState('AI_ERROR');
    self.postMessage({ type: 'ERROR', payload: err.message });
    setState('AI_IDLE');
  }
};
