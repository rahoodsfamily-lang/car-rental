import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LockOutlined,
  CheckCircleOutlined,
  ErrorOutlined,
  Visibility,
  VisibilityOff,
  LockResetOutlined,
} from '@mui/icons-material';
import ModernTextField from '../../components/forms/ModernTextField';
import ModernButton from '../../components/forms/ModernButton';
import { useToast } from '../../components/feedback/ToastProvider';
import axiosInstance from '../../utils/axiosConfig';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenEmail, setTokenEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await axiosInstance.get(`/api/users/reset-password/${token}`);
      const data = response.data;
      
      if (data.success) {
        setTokenValid(true);
        setTokenEmail(data.email);
      } else {
        setTokenValid(false);
        showToast(data.message || 'Invalid or expired reset link', 'error');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValid(false);
      showToast('Failed to validate reset link', 'error');
    } finally {
      setValidating(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post(`/api/users/reset-password/${token}`, {
        password: formData.password
      });
      const data = response.data;

      if (data.success) {
        setSuccess(true);
        showToast('Password reset successfully!', 'success');
        
        // Show confirmation email URL if available (development)
        if (data.confirmationEmailUrl) {
          console.log('📧 Confirmation Email Preview:', data.confirmationEmailUrl);
          showToast(`Confirmation email sent! Preview: ${data.confirmationEmailUrl}`, 'info', 10000);
        }
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        showToast(data.message || 'Failed to reset password', 'error');
        
        // If token is invalid/expired, redirect to login
        if (data.message?.includes('Invalid') || data.message?.includes('expired')) {
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Password reset error:', error);
      showToast('Failed to reset password. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Loading state while validating token
  if (validating) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.05)} 0%, ${alpha(theme.palette.error.light, 0.05)} 100%)`,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 4,
              textAlign: 'center',
            }}
          >
            <ErrorOutlined 
              sx={{ 
                fontSize: 64, 
                color: 'error.main',
                mb: 2,
              }}
            />
            <Typography variant="h5" gutterBottom>
              Invalid or Expired Link
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This password reset link is invalid or has expired. 
              Please request a new password reset.
            </Typography>
            <ModernButton
              onClick={() => navigate('/login')}
              variant="contained"
            >
              Back to Login
            </ModernButton>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Success state
  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 4,
              textAlign: 'center',
            }}
          >
            <CheckCircleOutlined 
              sx={{ 
                fontSize: 64, 
                color: 'success.main',
                mb: 2,
              }}
            />
            <Typography variant="h5" gutterBottom>
              Password Reset Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your password has been reset. Redirecting to login...
            </Typography>
            <CircularProgress size={24} />
          </Paper>
        </Container>
      </Box>
    );
  }

  // Reset password form
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
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

          {/* Header */}
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
              <LockResetOutlined sx={{ fontSize: 32 }} />
            </Box>
            
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 1,
                color: 'text.primary',
              }}
            >
              Reset Password
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Enter your new password for {tokenEmail}
            </Typography>
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            {/* New Password Field */}
            <ModernTextField
              fullWidth
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              error={!!errors.password}
              helperText={errors.password}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm Password Field */}
            <ModernTextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      size="small"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Password Requirements */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="caption">
                Password must be at least 6 characters and contain uppercase, lowercase, and numbers.
              </Typography>
            </Alert>

            {/* Submit Button */}
            <ModernButton
              type="submit"
              fullWidth
              size="large"
              loading={loading}
              loadingText="Resetting Password..."
              disabled={loading}
              sx={{ 
                mb: 2,
                height: 48,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Reset Password
            </ModernButton>

            {/* Cancel Button */}
            <ModernButton
              fullWidth
              variant="outlined"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              Cancel
            </ModernButton>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPassword;