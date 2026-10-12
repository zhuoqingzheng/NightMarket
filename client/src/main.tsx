import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { App } from './App';
import { queryClient } from './helpers/queryClient';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        style={{ fontFamily: 'inherit', '--border-radius': '14px' } as CSSProperties}
      />
    </QueryClientProvider>
  </StrictMode>,
);
