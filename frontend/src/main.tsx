import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './routes/router';
import { createSupabaseClient } from './lib/supabaseClient';
import { ThemeProvider } from './components/ThemeProvider';
import './styles.css';

const queryClient = new QueryClient();
const supabase = createSupabaseClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase} initialSession={null}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionContextProvider>
  </React.StrictMode>
);
