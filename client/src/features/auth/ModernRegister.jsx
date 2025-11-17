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
  LinearProgress,
  Chip,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PersonOutlined,
  EmailOutlined,
  LockOutlined,
  PersonAddOutlined,
  DirectionsCarOutlined,
  PhoneOutlined,
  Visibility,
  VisibilityOff,
  CheckCircleOutlined,
  ErrorOutlined,
  InfoOutlined,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ModernTextField from '../../components/forms/ModernTextField';
import ModernButton from '../../components/forms/ModernButton';
import { useToast } from '../../components/feedback/ToastProvider';

const ModernRegister = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const toast = useToast();

  // Validation rules
  const validationRules = {
    firstName: {
      required: true,
      minLength: 2,
      pattern: /^[a-zA-Z\s'-]+$/,
      messages: {
        required: 'First name is required',
        minLength: 'First name must be at least 2 characters',
        pattern: 'First name can only contain letters, spaces, hyphens, and apostrophes'
      }
    },
    lastName: {
      required: true,
      minLength: 2,
      pattern: /^[a-zA-Z\s'-]+$/,
      messages: {
        required: 'Last name is required',
        minLength: 'Last name must be at least 2 characters',
        pattern: 'Last name can only contain letters, spaces, hyphens, and apostrophes'
      }
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      messages: {
        required: 'Email address is required',
        pattern: 'Please enter a valid email address (e.g., user@example.com)'
      }
    },
    phone: {
      pattern: /^(\+63|0)?[9]\d{9}$/,
      messages: {
        pattern: 'Please enter a valid Philippine mobile number (e.g., 09123456789 or +639123456789)'
      }
    },
    password: {
      required: true,
      minLength: 8,
      messages: {
        required: 'Password is required',
        minLength: 'Password must be at least 8 characters',
        weak: 'Password is too weak. Add uppercase, numbers, and special characters',
        medium: 'Good password! Consider adding more variety for better security',
        strong: 'Strong password! Your account will be well protected'
      }
    },
    confirmPassword: {
      required: true,
      match: 'password',
      messages: {
        required: 'Please confirm your password',
        match: 'Passwords do not match'
      }
    }
  };

  // Format Philippines phone number
  const formatPhilippinePhone = (value) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // If starts with 63, add + prefix
    if (digits.startsWith('63')) {
      const formatted = digits.slice(0, 2) + ' ' + digits.slice(2, 5) + ' ' + digits.slice(5, 8) + ' ' + digits.slice(8, 12);
      return '+' + formatted.trim();
    }
    
    // If starts with 09, format as 09XX XXX XXXX
    if (digits.startsWith('09')) {
      const formatted = digits.slice(0, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7, 11);
      return formatted.trim();
    }
    
    // If starts with 9 (without 0), format as 9XX XXX XXXX
    if (digits.startsWith('9')) {
      const formatted = digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6, 10);
      return formatted.trim();
    }
    
    return digits;
  };

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;
    
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    Object.values(checks).forEach(passed => {
      if (passed) strength += 20;
    });
    
    return strength;
  };

  // Real-time field validation
  const validateField = (field, value) => {
    const rules = validationRules[field];
    if (!rules) return '';
    
    // Check required
    if (rules.required && !value.trim()) {
      return rules.messages.required;
    }
    
    // Check min length
    if (rules.minLength && value.trim().length < rules.minLength) {
      return rules.messages.minLength;
    }
    
    // Check pattern
    if (rules.pattern && value) {
      // For phone field, remove formatting before validation
      const testValue = field === 'phone' ? value.replace(/\D/g, '') : value;
      if (!rules.pattern.test(testValue)) {
        return rules.messages.pattern;
      }
    }
    
    // Check password match
    if (field === 'confirmPassword' && value !== formData.password) {
      return rules.messages.match;
    }
    
    // Check password strength
    if (field === 'password' && value) {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
      if (strength < 40) {
        return rules.messages.weak;
      }
    }
    
    return '';
  };

  // Handle field change with validation
  const handleChange = (field) => (e) => {
    let value = e.target.value;
    
    // Format phone number for Philippines
    if (field === 'phone' && value) {
      // Only format if user is typing (not deleting)
      if (value.length > formData.phone.length) {
        value = formatPhilippinePhone(value);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Calculate password strength immediately for password field
    if (field === 'password') {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
    
    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError('');
    }
    
    // Validate field if it has been touched
    if (fieldTouched[field]) {
      const error = validateField(field, value);
      setFieldErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
    
    // If changing password, revalidate confirm password
    if (field === 'password' && fieldTouched.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      setFieldErrors(prev => ({
        ...prev,
        confirmPassword: confirmError
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

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    Object.keys(validationRules).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error && validationRules[field].required) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    
    setFieldErrors(newErrors);
    setFieldTouched(Object.keys(validationRules).reduce((acc, field) => ({
      ...acc,
      [field]: true
    }), {}));
    
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Check if any required fields are empty
      const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
      const emptyFields = requiredFields.filter(field => !formData[field]?.trim());
      
      if (emptyFields.length === requiredFields.length) {
        toast.error('Please fill in all required fields to create your account');
      } else if (emptyFields.length > 0) {
        toast.error('Please complete all required fields');
      } else {
        toast.error('Please correct the errors below');
      }
      return;
    }
    
    setLoading(true);
    setGeneralError('');
    
    const result = await register(
      formData.email, 
      formData.password, 
      formData.firstName, 
      formData.lastName, 
      formData.phone
    );
    
    if (result.success) {
      toast.success(result.message || 'Verification email sent! Please check your inbox to verify your account.');
      // Redirect to login after showing message
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setGeneralError(result.message || 'Registration failed. Please try again.');
      toast.error(result.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  // Get password strength color and label
  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 80) return 'success';
    if (passwordStrength >= 60) return 'warning';
    if (passwordStrength >= 40) return 'info';
    return 'error';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength >= 80) return 'Strong';
    if (passwordStrength >= 60) return 'Good';
    if (passwordStrength >= 40) return 'Fair';
    if (passwordStrength > 0) return 'Weak';
    return '';
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
              Join Drive Rentals
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
              Create your account and start your journey today
            </Typography>
          </Box>

          {/* Registration Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* Name Fields Row */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 0, sm: 2 }, mb: { xs: 0, sm: 2 } }}>
              <Box sx={{ flex: 1 }}>
                <ModernTextField
                  label="First Name *"
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                  onBlur={handleBlur('firstName')}
                  error={!!fieldErrors.firstName}
                  helperText={fieldErrors.firstName}
                  startIcon={<PersonOutlined />}
                  placeholder="John"
                  InputProps={{
                    endAdornment: fieldTouched.firstName && !fieldErrors.firstName && formData.firstName && (
                      <InputAdornment position="end">
                        <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <ModernTextField
                  label="Last Name *"
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                  onBlur={handleBlur('lastName')}
                  error={!!fieldErrors.lastName}
                  helperText={fieldErrors.lastName}
                  startIcon={<PersonOutlined />}
                  placeholder="Doe"
                  InputProps={{
                    endAdornment: fieldTouched.lastName && !fieldErrors.lastName && formData.lastName && (
                      <InputAdornment position="end">
                        <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            </Box>

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
                  '✓ Valid email address' : '')
              }
              startIcon={<EmailOutlined />}
              placeholder="john.doe@example.com"
              InputProps={{
                endAdornment: fieldTouched.email && !fieldErrors.email && formData.email && (
                  <InputAdornment position="end">
                    <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                  </InputAdornment>
                )
              }}
            />

            {/* Phone Field */}
            <ModernTextField
              label="Phone Number (09XXX)"
              value={formData.phone}
              onChange={handleChange('phone')}
              onBlur={handleBlur('phone')}
              error={!!fieldErrors.phone}
              helperText={fieldErrors.phone || 'Philippine mobile format: 09XXXXXXXXX'}
              startIcon={<PhoneOutlined />}
              placeholder="09XX XXX XXXX"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Enter your Philippine mobile number (e.g., 09XX-XXX-XXXX)">
                      <IconButton size="small" edge="end">
                        <InfoOutlined sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                )
              }}
            />

            {/* Password Field */}
            <Box sx={{ mb: 2 }}>
              <ModernTextField
                label="Password *"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                onBlur={handleBlur('password')}
                error={!!fieldErrors.password && fieldTouched.password}
                helperText={fieldErrors.password}
                startIcon={<LockOutlined />}
                placeholder="Create a strong password"
                InputProps={{
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
                  )
                }}
              />
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <Box sx={{ mt: { xs: 0.5, sm: 1 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    >
                      Password Strength:
                    </Typography>
                    <Chip
                      label={getPasswordStrengthLabel()}
                      size="small"
                      color={getPasswordStrengthColor()}
                      sx={{ 
                        height: { xs: 18, sm: 20 },
                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength}
                    color={getPasswordStrengthColor()}
                    sx={{ height: { xs: 5, sm: 6 }, borderRadius: 3 }}
                  />
                  {passwordStrength < 60 && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        mt: 0.5, 
                        display: 'block',
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      }}
                    >
                      💡 Tip: Use a mix of uppercase, lowercase, numbers, and symbols
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            {/* Confirm Password Field */}
            <ModernTextField
              label="Confirm Password *"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
              error={!!fieldErrors.confirmPassword && fieldTouched.confirmPassword}
              helperText={
                fieldErrors.confirmPassword || 
                (fieldTouched.confirmPassword && !fieldErrors.confirmPassword && formData.confirmPassword ? 
                  '✓ Passwords match' : '')
              }
              startIcon={<LockOutlined />}
              placeholder="Re-enter your password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {fieldTouched.confirmPassword && !fieldErrors.confirmPassword && formData.confirmPassword && (
                      <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20, mr: 1 }} />
                    )}
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      size="small"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <ModernButton
              type="submit"
              fullWidth
              size="large"
              loading={loading}
              loadingText="Creating account..."
              startIcon={<PersonAddOutlined />}
              sx={{ 
                mb: { xs: 2.5, sm: 3 },
                height: { xs: 44, sm: 48 },
                fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
              }}
              variant="contained"
              color="primary"
            >
              Create Account
            </ModernButton>

            <Divider sx={{ my: { xs: 2.5, sm: 3 } }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                Already have an account?
              </Typography>
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <MuiLink
                component={Link}
                to="/login"
                sx={{
                  textDecoration: 'none',
                  fontWeight: 500,
                  color: 'primary.main',
                  fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1rem' },
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Sign in to your account
              </MuiLink>
            </Box>
          </Box>

          {/* Terms and Privacy */}
          <Box
            sx={{
              mt: { xs: 3, sm: 3.5, md: 4 },
              p: { xs: 1.5, sm: 2 },
              bgcolor: alpha(theme.palette.grey[500], 0.1),
              borderRadius: { xs: 1.5, sm: 2 },
              textAlign: 'center',
            }}
          >
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.875rem' } }}
            >
              By creating an account, you agree to our{' '}
              <MuiLink href="#" sx={{ color: 'primary.main' }}>
                Terms of Service
              </MuiLink>{' '}
              and{' '}
              <MuiLink href="#" sx={{ color: 'primary.main' }}>
                Privacy Policy
              </MuiLink>
            </Typography>
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
    </Box>
  );
};

export default ModernRegister;
