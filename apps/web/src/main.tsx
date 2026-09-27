import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './features/auth/auth-context';
import { JourneyProvider } from './features/journey/journey-context';
import { ThemeProvider } from './features/theme/theme-context';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <JourneyProvider>
            <App />
          </JourneyProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
