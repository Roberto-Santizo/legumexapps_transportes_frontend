import './index.css';
import { createRoot } from 'react-dom/client';
import { NotificationProvider } from './features/shared/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import AppRouter from './router';

const queryClient = new QueryClient;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
      </QueryClientProvider>
    </NotificationProvider>
  </StrictMode>,
)
