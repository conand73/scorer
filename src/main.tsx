import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// SW registration logging for PWA debugging
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // The vite-plugin-pwa injects its own registration via registerSW.js
    // This catches any registration errors for debugging
    navigator.serviceWorker.getRegistration('/scorer/').then((reg) => {
      if (reg) {
        console.log('[SW] Registered scope:', reg.scope);
      } else {
        console.log('[SW] No registration found for /scorer/');
      }
    }).catch((err) => {
      console.error('[SW] Registration check failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
