import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('[Main] Starting application...');

try {
  const rootElement = document.getElementById('root');
  console.log('[Main] Root element:', rootElement ? 'found' : 'NOT FOUND');

  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('[Main] Creating React root...');
  const root = createRoot(rootElement);

  console.log('[Main] Rendering app...');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  console.log('[Main] App rendered successfully');
} catch (error) {
  console.error('[Main] Fatal error during app initialization:', error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f0f0f0; font-family: system-ui;">
      <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 500px;">
        <h1 style="color: #dc2626; margin: 0 0 1rem 0;">Application Error</h1>
        <p style="margin: 0; color: #666;">The application failed to start. Please check the console for details.</p>
        <pre style="margin-top: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 4px; overflow: auto; font-size: 12px;">${error}</pre>
      </div>
    </div>
  `;
}
