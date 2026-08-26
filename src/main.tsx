import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initEnvGuard } from './utils/envGuard';
import { AppUIProvider } from './contexts/AppUIContext';
import { AuthProvider } from './contexts/AuthContext';
import { ShiftDataProvider } from './contexts/ShiftDataContext';

// Global System Insulation
initEnvGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppUIProvider>
        <ShiftDataProvider>
          <App />
        </ShiftDataProvider>
      </AppUIProvider>
    </AuthProvider>
  </StrictMode>,
);

