import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import EmailIcon from '@mui/icons-material/Email';

const VerifyEmail = () => {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');
  const verificationAttempted = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    // Prevent duplicate verification attempts
    if (verificationAttempted.current) {
      return;
    }
    verificationAttempted.current = true;

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const { data } = await axiosInstance.get(`/api/users/verify-email/${token}`);
      setStatus('success');
      setMessage(data.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        position: 'relative',
        py: 4,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 60%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            backdropFilter: 'blur(10px)',
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center'
          }}
        >
          {/* Decorative gradient border */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
            }}
          />
          {status === 'verifying' && (
            <>
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 2,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'white',
                  mb: 3,
                  boxShadow: theme.shadows[8],
                }}
              >
                <EmailIcon sx={{ fontSize: 32 }} />
              </Box>
              <CircularProgress size={60} sx={{ mb: 3, color: 'primary.main' }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Verifying Your Email...
              </Typography>
              <Typography color="text.secondary">
                Please wait while we verify your email address
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 2,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  color: 'white',
                  mb: 3,
                  boxShadow: theme.shadows[8],
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
                Email Verified!
              </Typography>
              <Alert severity="success" sx={{ mb: 3 }}>
                {message}
              </Alert>
              <Typography color="text.secondary" gutterBottom>
                Redirecting you to login page...
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                fullWidth
                sx={{
                  mt: 2,
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 2,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  color: 'white',
                  mb: 3,
                  boxShadow: theme.shadows[8],
                }}
              >
                <ErrorIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
                Verification Failed
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {message}
              </Alert>
              <Typography color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                The verification link may have expired or is invalid.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/resend-verification')}
                fullWidth
                sx={{
                  mb: 2,
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                Resend Verification Email
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                fullWidth
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                Back to Login
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default VerifyEmail;
