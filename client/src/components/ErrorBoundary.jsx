import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  useTheme,
} from '@mui/material';
import {
  ErrorOutlined,
  RefreshOutlined,
  HomeOutlined,
} from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, onReload, onGoHome }) => {
  const theme = useTheme();

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper
        elevation={3}
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.error.light}15 0%, ${theme.palette.error.main}10 100%)`,
        }}
      >
        <Box sx={{ mb: 4 }}>
          <ErrorOutlined
            sx={{
              fontSize: 80,
              color: 'error.main',
              mb: 2,
            }}
          />
          <Typography variant="h4" gutterBottom color="error.main" fontWeight="bold">
            Oops! Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            We encountered an unexpected error. This has been logged and our team will look into it.
            In the meantime, you can try refreshing the page or returning to the homepage.
          </Typography>
        </Box>

        {process.env.NODE_ENV === 'development' && error && (
          <Paper
            sx={{
              p: 2,
              mb: 4,
              bgcolor: 'grey.100',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            <Typography variant="subtitle2" color="error.main" gutterBottom>
              Error Details (Development Mode):
            </Typography>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {error.toString()}
            </Typography>
          </Paper>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<RefreshOutlined />}
            onClick={onReload}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
            }}
          >
            Refresh Page
          </Button>
          <Button
            variant="outlined"
            startIcon={<HomeOutlined />}
            onClick={onGoHome}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
            }}
          >
            Go to Homepage
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ErrorBoundary;
