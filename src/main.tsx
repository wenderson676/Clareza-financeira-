import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register service worker
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

// Error boundary for white screen debugging
window.onerror = function(msg, url, line, col, error) {
  document.body.innerHTML = `<div style="padding: 20px; color: red; word-wrap: break-word;">
    <h3>Fatal Error</h3>
    <p>${msg}</p>
    <p>${url}:${line}:${col}</p>
    <pre>${error?.stack || ''}</pre>
  </div>`;
};
window.onunhandledrejection = function(e) {
  document.body.innerHTML = `<div style="padding: 20px; color: red; word-wrap: break-word;">
    <h3>Unhandled Promise Rejection</h3>
    <p>${e.reason?.message || e.reason}</p>
    <pre>${e.reason?.stack || ''}</pre>
  </div>`;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
