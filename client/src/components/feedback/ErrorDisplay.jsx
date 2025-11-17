import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Paper,
  useTheme,
} from '@mui/material';
import {
  ErrorOutlineOutlined,
  RefreshOutlined,
  HomeOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Full page error display
export const PageError = ({ 
  title = 'Something went wrong',
  message = 'We encountered an error while loading this page.',
  onRetry,
  showHomeButton = true,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        px: 3,
      }}
    >
      <Paper
        sx={{
          p: 4,
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <ErrorOutlineOutlined
          sx={{
            fontSize: 64,
            color: 'error.main',
            mb: 2,
          }}
        />
        
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
        
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            mb: 4,
            lineHeight: 1.6,
          }}
        >
          {message}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {onRetry && (
            <Button
              variant="contained"
              startIcon={<RefreshOutlined />}
              onClick={onRetry}
              sx={{ minWidth: 120 }}
            >
              Try Again
            </Button>
          )}
          
          {showHomeButton && (
            <Button
              variant="outlined"
              startIcon={<HomeOutlined />}
              onClick={() => navigate('/')}
              sx={{ minWidth: 120 }}
            >
              Go Home
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

// Inline error alert
export const InlineError = ({ 
  message = 'An error occurred',
  severity = 'error',
  onClose,
  action,
}) => (
  <Alert
    severity={severity}
    onClose={onClose}
    action={action}
    sx={{
      borderRadius: 2,
      mb: 2,
    }}
  >
    {message}
  </Alert>
);

// Form error display
export const FormError = ({ errors = [], title = 'Please fix the following errors:' }) => {
  if (!errors.length) return null;

  return (
    <Alert
      severity="error"
      sx={{
        borderRadius: 2,
        mb: 2,
      }}
    >
      <AlertTitle>{title}</AlertTitle>
      <Box component="ul" sx={{ m: 0, pl: 2 }}>
        {errors.map((error, index) => (
          <Typography
            key={index}
            component="li"
            variant="body2"
            sx={{ mb: 0.5 }}
          >
            {error}
          </Typography>
        ))}
      </Box>
    </Alert>
  );
};

// Network error component
export const NetworkError = ({ onRetry }) => (
  <InlineError
    message="Unable to connect to the server. Please check your internet connection and try again."
    action={
      onRetry && (
        <Button
          color="inherit"
          size="small"
          onClick={onRetry}
          startIcon={<RefreshOutlined />}
        >
          Retry
        </Button>
      )
    }
  />
);

const ErrorDisplay = PageError;
export default ErrorDisplay;
