export type AIState = 'AI_UNLOADED' | 'AI_LOADING' | 'AI_READY' | 'AI_PROCESSING' | 'AI_IDLE' | 'AI_UNLOADING' | 'AI_ERROR';

export type AIModelType = 'LFM2.5-350M' | 'Gemma-3-1B';

export interface AIModelStatus {
  name: AIModelType;
  isInstalled: boolean;
  isLoaded: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AIWorkerMessage {
  type: 'INIT' | 'UNLOAD' | 'QUERY' | 'CHECK_STATUS' | 'INSTALL';
  payload?: any;
}

export interface AIWorkerResponse {
  type: 'STATE_CHANGE' | 'RESPONSE' | 'ERROR' | 'STATUS_UPDATE' | 'INSTALL_PROGRESS';
  payload?: any;
}
