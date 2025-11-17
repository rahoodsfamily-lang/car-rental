import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Link as MuiLink,
  Divider,
  useTheme,
  alpha,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  EmailOutlined,
  LockOutlined,
  LoginOutlined,
  DirectionsCarOutlined,
  Visibility,
  VisibilityOff,
  CheckCircleOutlined,
  Close,
  SendOutlined,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ModernTextField from '../../components/forms/ModernTextField';
import ModernButton from '../../components/forms/ModernButton';
import { useToast } from '../../components/feedback/ToastProvider';
import axiosInstance from '../../utils/axiosConfig';
// force rebuild

const ModernLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const toast = useToast();

  // Load saved email if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        rememberMe: true,
      }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset loading state on unmount to prevent issues if user navigates away
      setLoading(false);
    };
  }, []);

  // Validation rules
  const validationRules = {
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      messages: {
        required: 'Email address is required',
        pattern: 'Please enter a valid email address',
      }
    },
    password: {
      required: true,
      minLength: 6,
      messages: {
        required: 'Password is required',
        minLength: 'Password must be at least 6 characters',
      }
    }
  };

  // Validate field
  const validateField = (field, value) => {
    const rules = validationRules[field];
    if (!rules) return '';
    
    if (rules.required && !value.trim()) {
      return rules.messages.required;
    }
    
    if (rules.minLength && value.length < rules.minLength) {
      return rules.messages.minLength;
    }
    
    if (rules.pattern && value && !rules.pattern.test(value)) {
      return rules.messages.pattern;
    }
    
    return '';
  };

  // Handle field change
  const handleChange = (field) => (e) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError('');
    }
    
    // Validate field if it has been touched
    if (fieldTouched[field] && field !== 'rememberMe') {
      const error = validateField(field, value);
      setFieldErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  // Handle field blur
  const handleBlur = (field) => () => {
    setFieldTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    const error = validateField(field, formData[field]);
    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    ['email', 'password'].forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    
    setFieldErrors(newErrors);
    setFieldTouched({ email: true, password: true });
    
    return isValid;
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setResetLoading(true);
    
    try {
      // Call actual backend API
      const response = await axiosInstance.post('/api/users/forgot-password', {
        email: resetEmail
      });
      
      const data = response.data;
      
      if (data.success) {
        setResetSuccess(true);
        toast.success(data.message || 'Password reset link sent to your email!');
        
        // Show Ethereal preview URL in development
        if (data.previewUrl) {
          console.log('📧 Ethereal Email Preview:', data.previewUrl);
          toast.info(`Test email sent! Preview: ${data.previewUrl}`, { duration: 10000 });
        }
        
        // Close dialog after 5 seconds
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetEmail('');
          setResetSuccess(false);
        }, 5000);
      } else {
        toast.error(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Check if fields are empty or have validation errors
      const emailEmpty = !formData.email?.trim();
      const passwordEmpty = !formData.password?.trim();
      
      if (emailEmpty && passwordEmpty) {
        toast.error('Please enter your email and password to sign in');
      } else if (emailEmpty) {
        toast.error('Please enter your email address');
      } else if (passwordEmpty) {
        toast.error('Please enter your password');
      } else {
        toast.error('Please correct the errors below');
      }
      return;
    }
    
    setLoading(true);
    setGeneralError('');
    
    try {
      // Add minimum loading time for smooth transition
      const startTime = Date.now();
      
      // Handle remember me
      if (formData.rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      const result = await login(formData.email, formData.password);
      
      // Ensure minimum loading time of 300ms for smooth transition
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 300 - elapsedTime);
      
      if (result.success) {
        toast.success('Welcome back! Redirecting...');
        const { user } = result;
        
        // Small delay for smooth transition
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        
        // Use navigate instead of window.location to preserve toast
        if (user && user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/cars');
        }
        setLoading(false);
      } else {
        // Wait for minimum time before showing error
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        
        // Only set loading to false on error
        setLoading(false);
        
        // Check if email verification is required
        if (result.requiresVerification) {
          setGeneralError(result.message || 'Please verify your email before logging in.');
          toast.warning(result.message || 'Please verify your email before logging in.');
          
          // Show option to resend verification email
          setTimeout(() => {
            if (window.confirm('Would you like to resend the verification email?')) {
              navigate('/resend-verification');
            }
          }, 1000);
        } else {
          setGeneralError(result.message || 'Invalid email or password. Please try again.');
          toast.error(result.message || 'Login failed');
          
          // Add shake animation to form
          const formElement = document.getElementById('login-form');
          if (formElement) {
            formElement.style.animation = 'shake 0.5s';
            setTimeout(() => {
              formElement.style.animation = '';
            }, 500);
          }
        }
      }
    } catch (error) {
      // Handle unexpected errors
      setLoading(false);
      setGeneralError('An unexpected error occurred. Please try again.');
      toast.error('An unexpected error occurred');
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
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3 },
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
        // Remove autofill background color
        '& input:-webkit-autofill': {
          WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
          WebkitTextFillColor: 'inherit !important',
          transition: 'background-color 5000s ease-in-out 0s',
        },
        '& input:-webkit-autofill:hover': {
          WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
          WebkitTextFillColor: 'inherit !important',
        },
        '& input:-webkit-autofill:focus': {
          WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
          WebkitTextFillColor: 'inherit !important',
        },
        '& input:-webkit-autofill:active': {
          WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
          WebkitTextFillColor: 'inherit !important',
        },
      }}
    >
      <Container maxWidth="sm" sx={{ px: { xs: 0, sm: 3 } }}>
        <Paper
          elevation={24}
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            borderRadius: { xs: 2, sm: 3, md: 4 },
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
          <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 3.5, md: 4 } }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Drive Rentals"
              sx={{
                width: { xs: 60, sm: 70 },
                height: { xs: 60, sm: 70 },
                mb: { xs: 1.5, sm: 2 },
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: theme.shadows[8],
              }}
            />
            
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 1,
                color: 'text.primary',
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
              }}
            >
              Welcome Back
            </Typography>
            
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.6,
                fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1rem' },
                px: { xs: 1, sm: 0 },
              }}
            >
              Sign in to your account to continue your journey
            </Typography>
          </Box>

          {/* Login Form */}
          <Box 
            component="form" 
            onSubmit={handleSubmit}
            noValidate
            id="login-form"
            sx={{
              '@keyframes shake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
                '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
              },
            }}
          >
            {/* Email Field */}
            <ModernTextField
              label="Email Address *"
              value={formData.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              error={!!fieldErrors.email}
              helperText={
                fieldErrors.email || 
                (fieldTouched.email && !fieldErrors.email && formData.email ? 
                  'Valid email address' : '')
              }
              startIcon={<EmailOutlined />}
              placeholder="john.doe@example.com"
              autoComplete="email"
              InputProps={{
                endAdornment: fieldTouched.email && !fieldErrors.email && formData.email && (
                  <InputAdornment position="end">
                    <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                  </InputAdornment>
                )
              }}
            />

            {/* Password Field */}
            <ModernTextField
              label="Password *"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password}
              startIcon={<LockOutlined />}
              placeholder="Enter your password"
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {/* Remember Me & Forgot Password Row */}
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                gap: { xs: 1, sm: 0 },
                mb: { xs: 2.5, sm: 3 },
                mt: -1,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.rememberMe}
                    onChange={handleChange('rememberMe')}
                    size="small"
                    color="primary"
                  />
                }
                label={
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                  >
                    Remember me
                  </Typography>
                }
              />
              <MuiLink
                component="button"
                type="button"
                variant="body2"
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetEmail(formData.email);
                }}
                sx={{
                  textDecoration: 'none',
                  color: 'primary.main',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Forgot password?
              </MuiLink>
            </Box>

            {/* Submit Button */}
            <ModernButton
              type="submit"
              fullWidth
              size="large"
              loading={loading}
              loadingText="Signing in..."
              startIcon={!loading && <LoginOutlined />}
              sx={{ 
                mb: { xs: 2.5, sm: 3 },
                height: { xs: 44, sm: 48 },
                fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
                fontWeight: 600,
                boxShadow: theme.shadows[4],
                '&:hover': {
                  boxShadow: theme.shadows[8],
                },
              }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </ModernButton>

            <Divider sx={{ my: { xs: 2.5, sm: 3 } }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                Don't have an account?
              </Typography>
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <MuiLink
                component={Link}
                to="/register"
                sx={{
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1rem' },
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Create a new account
              </MuiLink>
            </Box>
          </Box>


        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: { xs: 2, sm: 2.5, md: 3 } }}>
          <MuiLink
            component={Link}
            to="/"
            sx={{
              color: theme.palette.primary.main,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1rem' },
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': {
                textDecoration: 'underline',
                color: theme.palette.primary.dark,
              },
            }}
          >
            ← Back to Home
          </MuiLink>
        </Box>
      </Container>

      {/* Forgot Password Dialog */}
      <Dialog 
        open={showForgotPassword} 
        onClose={() => {
          setShowForgotPassword(false);
          setResetEmail('');
          setResetSuccess(false);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 3 },
            maxWidth: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 48px)' },
          }
        }}
      >
        <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography 
              variant="h6"
              sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
            >
              Reset Password
            </Typography>
            <IconButton 
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail('');
                setResetSuccess(false);
              }}
              size="small"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
          {resetSuccess ? (
            <Box sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
              <CheckCircleOutlined 
                sx={{ 
                  fontSize: { xs: 56, sm: 64 }, 
                  color: 'success.main',
                  mb: { xs: 1.5, sm: 2 },
                }}
              />
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
              >
                Check Your Email
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}
              >
                We've sent a password reset link to {resetEmail}
              </Typography>
            </Box>
          ) : (
            <>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: { xs: 2.5, sm: 3 },
                  fontSize: { xs: '0.85rem', sm: '0.875rem' },
                }}
              >
                Enter your email address and we'll send you a link to reset your password.
              </Typography>
              
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                variant="outlined"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined />
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}
        </DialogContent>
        
        {!resetSuccess && (
          <DialogActions 
            sx={{ 
              px: { xs: 2, sm: 3 }, 
              pb: { xs: 2, sm: 3 },
              pt: { xs: 2, sm: 2.5 },
              gap: { xs: 1, sm: 1.5 },
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <ModernButton
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail('');
              }}
              variant="outlined"
              disabled={resetLoading}
              sx={{ 
                width: { xs: '100%', sm: 'auto' },
                order: { xs: 2, sm: 1 },
              }}
            >
              Cancel
            </ModernButton>
            <ModernButton
              onClick={handleForgotPassword}
              loading={resetLoading}
              loadingText="Sending..."
              startIcon={!resetLoading && <SendOutlined />}
              disabled={!resetEmail.trim()}
              sx={{ 
                width: { xs: '100%', sm: 'auto' },
                order: { xs: 1, sm: 2 },
              }}
            >
              Send Reset Link
            </ModernButton>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
};

export default ModernLogin;