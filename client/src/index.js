import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BookingProvider } from './features/booking/BookingContext';
import { AuthProvider } from './features/auth/AuthContext';
import ThemeProvider from './theme/ThemeProvider';
import { ToastProvider } from './components/feedback/ToastProvider';
import './index.css';
import packageJson from '../package.json';

  
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <BookingProvider>
              <App />
            </BookingProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
