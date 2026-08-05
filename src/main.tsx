import './index.css';
import { AppInitializer, queryClient, store } from '@/config/config';
import { createRoot } from 'react-dom/client';
import { NotificationProvider } from './features/shared/shared';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import AppRouter from './router';

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
