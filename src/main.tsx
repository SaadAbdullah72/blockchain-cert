import { Buffer } from 'buffer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Polyfill Buffer globally for Solana Web3.js
(window as any).Buffer = (window as any).Buffer || Buffer;
(window as any).global = window;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
