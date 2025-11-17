import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';

const ResendVerification = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data } = await axiosInstance.post('/api/users/resend-verification', { email });
      setMessage({ type: 'success', text: data.message });
      setEmail('');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to send verification email'
      });
    } finally {
      setLoading(false);
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
          
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                p: 2,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'white',
                mb: 2,
                boxShadow: theme.shadows[8],
              }}
            >
              <EmailIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Resend Verification Email
            </Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Enter your email address and we'll send you a new verification link
            </Typography>
          </Box>

          {message.text && (
            <Alert severity={message.type} sx={{ mb: 3 }}>
              {message.text}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              sx={{ mb: 3 }}
              required
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                mb: 2,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem'
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Verification Email'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/login')}
              disabled={loading}
              sx={{
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem'
              }}
            >
              Back to Login
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResendVerification;
