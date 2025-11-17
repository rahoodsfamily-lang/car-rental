import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Slide,
  useTheme,
} from '@mui/material';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const SlideTransition = (props) => {
  return <Slide {...props} direction="up" />;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const theme = useTheme();

  const showToast = useCallback((message, options = {}) => {
    const {
      severity = 'info',
      title,
      duration = 6000,
      action,
      persistent = false,
    } = options;

    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      severity,
      title,
      duration,
      action,
      persistent,
      open: true,
    };

    setToasts(prev => [...prev, toast]);

    if (!persistent && duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }

    return id;
  }, []);

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const hideAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return showToast(message, { ...options, severity: 'success' });
  }, [showToast]);

  const error = useCallback((message, options = {}) => {
    return showToast(message, { ...options, severity: 'error', duration: 8000 });
  }, [showToast]);

  const warning = useCallback((message, options = {}) => {
    return showToast(message, { ...options, severity: 'warning' });
  }, [showToast]);

  const info = useCallback((message, options = {}) => {
    return showToast(message, { ...options, severity: 'info' });
  }, [showToast]);

  const value = {
    showToast,
    hideToast,
    hideAllToasts,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Render Toasts - Fully Responsive */}
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={toast.open}
          onClose={() => hideToast(toast.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ 
            vertical: 'bottom', 
            horizontal: 'right'
          }}
          sx={{
            bottom: { xs: 16, sm: 24 + (index * 80) },
            left: { xs: '50%', sm: 'auto' },
            right: { xs: 'auto', sm: 24 },
            transform: { xs: 'translateX(-50%)', sm: 'none' },
            width: { xs: 'calc(100% - 32px)', sm: 'auto' },
            maxWidth: { xs: 'calc(100% - 32px)', sm: 500 },
            '& .MuiSnackbarContent-root': {
              padding: 0,
              width: '100%',
            },
          }}
        >
          <Alert
            onClose={() => hideToast(toast.id)}
            severity={toast.severity}
            variant="filled"
            action={toast.action}
            sx={{
              width: '100%',
              minWidth: { xs: 'auto', sm: 300 },
              maxWidth: { xs: '100%', sm: 500 },
              borderRadius: { xs: 1.5, sm: 2 },
              boxShadow: theme.shadows[12],
              display: 'flex',
              alignItems: 'center',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              '& .MuiAlert-message': {
                padding: { xs: '4px 0', sm: '6px 0' },
                display: 'flex',
                alignItems: 'center',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                width: '100%',
              },
              '& .MuiAlert-icon': {
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                padding: { xs: '6px 0', sm: '7px 0' },
              },
              '& .MuiAlert-action': {
                padding: { xs: '2px 0', sm: '4px 0' },
                paddingLeft: { xs: '4px', sm: '8px' },
                marginRight: 0,
                marginLeft: 'auto',
                alignItems: 'center',
              },
              '& .MuiIconButton-root': {
                padding: { xs: '4px', sm: '8px' },
                color: 'inherit',
              },
            }}
          >
            {toast.title && (
              <AlertTitle sx={{ 
                mb: 0.5, 
                display: 'flex', 
                alignItems: 'center',
                fontSize: { xs: '0.9375rem', sm: '1.0625rem' },
                fontWeight: 600,
              }}>
                {toast.title}
              </AlertTitle>
            )}
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
};
