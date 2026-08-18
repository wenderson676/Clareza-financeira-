import { pipeline, env, TextGenerationPipeline } from '@huggingface/transformers';
import { AIWorkerMessage, AIState, AIModelType } from './types';

let state: AIState = 'AI_UNLOADED';

// Desativar requisição de GPU para forçar CPU (WASM)
env.backends.onnx.wasm.numThreads = 4; // Utiliza até 4 núcleos da CPU

let generator: TextGenerationPipeline | null = null;
let currentModelLoaded: string | null = null;

// Convertendo para modelos menores compatíveis com a Transformers.js via ONNX
const MODEL_MAPPING = {
  'Assistente-Rápido': 'Xenova/Qwen1.5-0.5B-Chat',
  'Conselheiro-Avançado': 'Xenova/TinyLlama-1.1B-Chat-v1.0' // TinyLlama é leve o suficiente para rodar na CPU
};

let installedModels: Record<AIModelType, boolean> = {
  'Assistente-Rápido': false,
  'Conselheiro-Avançado': false
};

const setState = (newState: AIState) => {
  state = newState;
  self.postMessage({ type: 'STATE_CHANGE', payload: { state } });
};

async function loadModel(modelType: AIModelType) {
  const actualModelId = MODEL_MAPPING[modelType];
  if (currentModelLoaded === actualModelId && generator) return;
  
  setState('AI_LOADING');
  self.postMessage({ type: 'STATUS_UPDATE', payload: `Preparando modelo ${modelType} (CPU)...` });
  
  try {
    const cb = (progress: any) => {
      if (progress.status === 'downloading' || progress.status === 'progress') {
        let msg = progress.status === 'downloading' ? 'Baixando' : 'Carregando';
        let percent = progress.progress ? Math.round(progress.progress) : 0;
        self.postMessage({ type: 'STATUS_UPDATE', payload: `${msg}: ${percent}% (${progress.file || ''})` });
      } else if (progress.status === 'ready') {
        self.postMessage({ type: 'STATUS_UPDATE', payload: `Modelo ${modelType} pronto na CPU!` });
      }
    };

    // dtype q4 (quantizado em 4 bits) é mais eficiente para CPU e os arquivos estão disponíveis no HuggingFace
    generator = await pipeline('text-generation', actualModelId, {
      device: 'wasm', // FORÇA USO DA CPU via WebAssembly
      progress_callback: cb,
      dtype: 'q4', 
    });
    
    currentModelLoaded = actualModelId;
    installedModels[modelType] = true;
    self.postMessage({ type: 'STATUS_UPDATE', payload: { installedModels } });
    setState('AI_READY');
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
    throw new Error(`Falha ao iniciar na CPU: ${errorMsg}`);
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
    const modelToUse = isComplex ? 'Conselheiro-Avançado' : 'Assistente-Rápido';
    const systemPrompt = isComplex ? ADVANCED_SYSTEM_PROMPT : FAST_SYSTEM_PROMPT;

    if (!installedModels[modelToUse]) {
      setState('AI_IDLE');
      return `Por favor, instale o modelo ${modelToUse} na aba 'Modelos' primeiro.`;
    }
    
    await loadModel(modelToUse);
    self.postMessage({ type: 'STATUS_UPDATE', payload: 'Processando na CPU...' });
    
    if (!generator) throw new Error("Gerador IA não foi inicializado.");

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: isComplex ? `Contexto atual do usuário: ${JSON.stringify(context)}\n\nPergunta: ${query}` : query }
    ];

    const formattedPrompt = generator.tokenizer.apply_chat_template(messages, { tokenize: false, add_generation_prompt: true });

    const out = await generator(formattedPrompt as string, {
      max_new_tokens: 150,
      temperature: isComplex ? 0.7 : 0.1,
    }) as any;

    const fullResponse = out[0].generated_text;
    const generatedStr = fullResponse.slice(formattedPrompt.length).trim();
    const resultStr = generatedStr;
    
    // Attempt to parse JSON for intent
    if (!isComplex) {
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
    }
    
    responseText = resultStr;
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
           setState('AI_ERROR');
           self.postMessage({ type: 'ERROR', payload: installErr.message });
           setState('AI_IDLE');
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
        generator = null;
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
