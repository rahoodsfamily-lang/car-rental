import { createTheme } from '@mui/material/styles';

// Define color palette
const colors = {
  primary: {
    main: '#2563eb', // Modern blue
    light: '#3b82f6',
    dark: '#1d4ed8',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#f59e0b', // Warm amber
    light: '#fbbf24',
    dark: '#d97706',
    contrastText: '#ffffff',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  info: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
  },
  grey: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// Create the theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    grey: colors.grey,
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: colors.grey[900],
      secondary: colors.grey[600],
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: {
    // Button customization
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
          },
          '&.Mui-disabled': {
            color: 'rgba(255, 255, 255, 0.9)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
          },
          '&.Mui-disabled': {
            color: 'rgba(255, 255, 255, 0.9)',
          },
        },
      },
    },
    // Card customization
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    // TextField customization
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary.main,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary.main,
              borderWidth: 2,
            },
          },
        },
      },
    },
    // Paper customization
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    // Chip customization
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    // AppBar customization
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
        },
      },
    },
    // Drawer customization
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        },
      },
    },
  },
});

export default theme;
