import './index.css';
import { AppInitializer, store } from '@/config/config';
import { createRoot } from 'react-dom/client';
import { NotificationProvider } from './features/shared/shared';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import AppRouter from './router';

const queryClient = new QueryClient;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <AppInitializer>
            <AppRouter />
          </AppInitializer>
        </Provider>
      </QueryClientProvider>
    </NotificationProvider>
  </StrictMode>,
)
