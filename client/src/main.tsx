import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { PushProvider } from './context/PushContext';
import { InstallProvider } from './context/InstallContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <InstallProvider>
        <AuthProvider>
          <PushProvider>
            <App />
          </PushProvider>
        </AuthProvider>
      </InstallProvider>
    </LanguageProvider>
  </StrictMode>
);
