import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { ControlProvider } from './state.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ControlProvider>
      <App />
    </ControlProvider>
  </StrictMode>,
);
