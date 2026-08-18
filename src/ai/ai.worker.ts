import { MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';
import { AIWorkerMessage, AIState, AIModelType } from './types';

let state: AIState = 'AI_UNLOADED';

// MLC Engine instance
let engine: MLCEngine | null = null;
let currentModelLoaded: string | null = null;

// In browser memory, we map your requested models to the closest available real open-weight models in WebLLM.
// LFM2.5-350M -> Qwen2.5 0.5B (Super fast, small, great for instruction/JSON)
// Gemma 3 1B -> Gemma 2 2B (Closest real equivalent optimized for WebGPU)
const MODEL_MAPPING = {
  'LFM2.5-350M': 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'Gemma-3-1B': 'gemma-2b-it-q4f16_1-MLC'
};

let installedModels: Record<AIModelType, boolean> = {
  'LFM2.5-350M': false,
  'Gemma-3-1B': false
};

const setState = (newState: AIState) => {
  state = newState;
  self.postMessage({ type: 'STATE_CHANGE', payload: { state } });
};

async function getEngine() {
  if (!engine) {
    engine = new MLCEngine();
    engine.setInitProgressCallback((progress: InitProgressReport) => {
      self.postMessage({ type: 'STATUS_UPDATE', payload: progress.text });
      // Estimate progress
      if (progress.progress !== undefined) {
         // Could dispatch INSTALL_PROGRESS here if needed
      }
    });
  }
  return engine;
}

async function loadModel(modelType: AIModelType) {
  const actualModelId = MODEL_MAPPING[modelType];
  if (currentModelLoaded === actualModelId && engine) return;
  
  setState('AI_LOADING');
  self.postMessage({ type: 'STATUS_UPDATE', payload: `Preparando modelo ${modelType} (GPU offline)...` });
  
  const eng = await getEngine();
  
  try {
    await eng.reload(actualModelId);
    currentModelLoaded = actualModelId;
    installedModels[modelType] = true; // Mark as installed once successfully loaded
    self.postMessage({ type: 'STATUS_UPDATE', payload: { installedModels } });
    setState('AI_READY');
  } catch (err: any) {
    throw new Error(`Falha ao iniciar WebGPU ou carregar modelo: ${err.message}. Verifique se seu navegador suporta WebGPU.`);
  }
}

const FAST_SYSTEM_PROMPT = `Você é um assistente financeiro local.
Regra 1: Se o usuário expressar um GASTO (ex: gastei, comprei, paguei), você DEVE responder EXATAMENTE e APENAS com um JSON neste formato:
{"intent": "create_transaction", "type": "expense", "amount": 50, "description": "mercado"}

Regra 2: Se expressar uma RECEITA (ex: recebi, ganhei), responda APENAS com:
{"intent": "create_transaction", "type": "income", "amount": 100, "description": "salario"}

Regra 3: Se a pergunta for sobre saldo, orçamento ou dicas gerais, responda como um conselheiro amigável em português.
Nunca use markdown ou formatação extra ao retornar o JSON. Apenas o objeto JSON puro.`;

const ADVANCED_SYSTEM_PROMPT = `Você é o Clareza, um Conselheiro Financeiro Avançado operando offline.
Analise os dados fornecidos no contexto e dê uma resposta inteligente, aprofundada e direta em português do Brasil.
Dê dicas claras sobre onde cortar gastos e como melhorar o orçamento.`;

const processQuery = async (query: string, context: any) => {
  setState('AI_PROCESSING');

  const isComplex = query.toLowerCase().includes('analise') || 
                    query.toLowerCase().includes('por que') || 
                    query.toLowerCase().includes('como posso') ||
                    query.length > 60;

  let responseText = '';

  try {
    if (isComplex) {
      if (!installedModels['Gemma-3-1B']) {
          setState('AI_IDLE');
          return "Essa análise exige o Conselheiro IA avançado. Instale o Gemma 3 1B nas configurações para utilizar essa função.";
      }
      
      await loadModel('Gemma-3-1B');
      self.postMessage({ type: 'STATUS_UPDATE', payload: 'Analisando profundamente seus dados...' });
      
      const eng = await getEngine();
      const contextStr = JSON.stringify(context);
      
      const reply = await eng.chat.completions.create({
        messages: [
          { role: 'system', content: ADVANCED_SYSTEM_PROMPT },
          { role: 'user', content: `Contexto atual do usuário: ${contextStr}\n\nPergunta: ${query}` }
        ],
        temperature: 0.7,
      });
      
      responseText = reply.choices[0].message.content || 'Não consegui formular uma resposta.';
    } else {
      if (!installedModels['LFM2.5-350M']) {
          setState('AI_IDLE');
          return "Por favor, instale o modelo LFM2.5-350M na aba 'Modelos' primeiro.";
      }
      
      await loadModel('LFM2.5-350M');
      self.postMessage({ type: 'STATUS_UPDATE', payload: 'Processando com IA Rápida...' });
      
      const eng = await getEngine();
      const reply = await eng.chat.completions.create({
        messages: [
          { role: 'system', content: FAST_SYSTEM_PROMPT },
          { role: 'user', content: query }
        ],
        temperature: 0.1, // Low temp for more deterministic JSON
      });
      
      const resultStr = reply.choices[0].message.content || '';
      
      // Attempt to parse JSON for intent
      try {
        const jsonMatch = resultStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const lfmIntent = JSON.parse(jsonMatch[0]);
          if (lfmIntent.intent === 'create_transaction') {
             self.postMessage({ 
               type: 'TOOL_CALL', 
               payload: {
                 action: 'create_transaction',
                 data: {
                   type: lfmIntent.type,
                   amount: Number(lfmIntent.amount),
                   description: lfmIntent.description,
                   bucket: lfmIntent.type === 'expense' ? 'Necessidades' : 'Renda',
                   category: lfmIntent.type === 'expense' ? 'Gastos' : 'Receita',
                   date: new Date().toISOString().split('T')[0]
                 }
               } 
             });
             responseText = `Entendi. Registrei ${lfmIntent.type === 'expense' ? 'um gasto' : 'uma receita'} de R$ ${lfmIntent.amount}.`;
             setState('AI_IDLE');
             return responseText;
          }
        }
      } catch (e) {
        // Not a JSON response, fallback to text
      }
      
      responseText = resultStr;
    }
  } catch (err: any) {
    throw err;
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
            payload: { installedModels } 
        });
        break;

      case 'INSTALL':
        const modelToInstall = payload.model as AIModelType;
        try {
           await loadModel(modelToInstall);
        } catch (installErr: any) {
           self.postMessage({ type: 'ERROR', payload: installErr.message });
        }
        break;

      case 'INIT':
        setState('AI_LOADING');
        setState('AI_READY');
        break;

      case 'QUERY':
        const { text, context } = payload;
        const res = await processQuery(text, context);
        self.postMessage({ type: 'RESPONSE', payload: res });
        break;

      case 'UNLOAD':
        setState('AI_UNLOADING');
        if (engine) {
           await engine.unload(); // Unload from GPU memory
           engine = null;
        }
        currentModelLoaded = null;
        setState('AI_UNLOADED');
        break;
    }
  } catch (err: any) {
    setState('AI_ERROR');
    self.postMessage({ type: 'ERROR', payload: err.message });
    setState('AI_IDLE');
  }
};
