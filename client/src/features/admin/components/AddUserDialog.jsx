import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  InputAdornment,
  LinearProgress,
  Typography,
  Box,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Close,
  EmailOutlined,
  PhoneOutlined,
  LockOutlined,
  CheckCircle,
  PersonAddOutlined,
  AdminPanelSettingsOutlined,
  PersonOutlined,
  CheckCircleOutlined,
  CancelOutlined,
} from '@mui/icons-material';

const AddUserDialog = ({ 
  open, 
  onClose, 
  onSubmit, 
  loading = false 
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'customer',
    deactivated: false,
  });
  
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

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
        pattern: 'Please enter a valid Philippine mobile number (e.g., 09123456789)'
      }
    },
    password: {
      required: true,
      minLength: 8,
      messages: {
        required: 'Password is required',
        minLength: 'Password must be at least 8 characters',
        weak: 'Password is too weak. Add uppercase, numbers, and special characters'
      }
    },
    confirmPassword: {
      required: true,
      match: 'password',
      messages: {
        required: 'Please confirm the password',
        match: 'Passwords do not match'
      }
    }
  };

  // Format Philippines phone number
  const formatPhilippinePhone = (value) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.startsWith('63')) {
      const formatted = digits.slice(0, 2) + ' ' + digits.slice(2, 5) + ' ' + digits.slice(5, 8) + ' ' + digits.slice(8, 12);
      return '+' + formatted.trim();
    }
    
    if (digits.startsWith('09')) {
      const formatted = digits.slice(0, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7, 11);
      return formatted.trim();
    }
    
    if (digits.startsWith('9')) {
      const formatted = '09' + digits.slice(0, 2) + ' ' + digits.slice(2, 5) + ' ' + digits.slice(5, 9);
      return formatted.trim();
    }
    
    return value;
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
  const validateField = (field, value, compareValue = null) => {
    const rules = validationRules[field];
    if (!rules) return '';
    
    // Check required
    if (rules.required && !value?.trim()) {
      return rules.messages.required;
    }
    
    // Check min length
    if (rules.minLength && value?.trim().length < rules.minLength) {
      return rules.messages.minLength;
    }
    
    // Check pattern
    if (rules.pattern && value) {
      const testValue = field === 'phone' ? value.replace(/\D/g, '') : value;
      if (!rules.pattern.test(testValue)) {
        return rules.messages.pattern;
      }
    }
    
    // Check password match
    if (field === 'confirmPassword' && value !== (compareValue || formData.password)) {
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
  const handleFieldChange = (field) => (e) => {
    let value = e.target.value;
    
    // Format phone number for Philippines
    if (field === 'phone' && value) {
      if (value.length > (formData.phone || '').length) {
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
      const confirmError = validateField('confirmPassword', formData.confirmPassword, value);
      setFieldErrors(prev => ({
        ...prev,
        confirmPassword: confirmError
      }));
    }
  };

  // Handle field blur
  const handleFieldBlur = (field) => () => {
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

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        role: 'customer',
        deactivated: false,
      });
      setFieldErrors({});
      setFieldTouched({});
      setShowPassword(false);
      setShowConfirmPassword(false);
      setPasswordStrength(0);
    }
  }, [open]);

  // Validate entire form
  const validateAddUserForm = () => {
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

  // Handle form submission
  const handleSubmit = () => {
    if (!validateAddUserForm()) {
      return;
    }
    onSubmit(formData);
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
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md" 
      fullWidth
      fullScreen={theme.breakpoints.down('sm')}
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2, md: 2 },
          maxHeight: { xs: '100vh', sm: '85vh', md: '90vh' },
          height: { xs: '100vh', sm: 'auto', md: 'auto' },
          m: { xs: 0, sm: 2, md: 2 },
          width: { xs: '100%', sm: '80%', md: '100%' },
          maxWidth: { xs: '100%', sm: '80%', md: '900px' },
          minWidth: { xs: '100%', sm: '70%', md: '600px' },
          overflow: 'hidden',
        }
      }}
      sx={{
        '& input:-webkit-autofill': {
          width: 'inherit !important',
          maxWidth: '100% !important',
        },
      }}
    >
      <DialogTitle sx={{ 
        fontSize: { xs: '1.125rem', sm: '1.25rem' },
        py: { xs: 1.5, sm: 2 },
        px: { xs: 2, sm: 3 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>Add New User</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ 
        overflow: 'hidden',
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 3 }
      }}>
        <Box component="form" sx={{ pt: { xs: 1, sm: 2 }, pb: 1, overflow: 'hidden', width: '100%' }} autoComplete="on">
          {/* Row 1: First Name and Last Name */}
          <Grid container spacing={2} sx={{ mb: 2, width: '100%', display: 'flex', flexWrap: 'wrap' }}>
            <Grid item xs={12} sm={6} sx={{ minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)' }, maxWidth: { xs: '100%', sm: 'calc(50% - 8px)' }, flexGrow: 0, flexShrink: 0 }}>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="First Name *"
                  autoComplete="given-name"
                  value={formData.firstName || ''}
                  onChange={handleFieldChange('firstName')}
                  onBlur={handleFieldBlur('firstName')}
                  error={!!fieldErrors.firstName}
                  helperText={fieldErrors.firstName || 'Required'}
                  sx={{
                    mt: 1,
                    '& .MuiInputBase-root': {
                      width: '100%',
                      overflow: 'hidden',
                    },
                    '& .MuiInputBase-input': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                    '& .MuiInputLabel-root': {
                      overflow: 'visible',
                    },
                    '& .MuiInputBase-input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 1000px white inset',
                      WebkitTextFillColor: 'inherit',
                    }
                  }}
                  InputProps={{
                    endAdornment: fieldTouched.firstName && !fieldErrors.firstName && formData.firstName && (
                      <InputAdornment position="end">
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)' }, maxWidth: { xs: '100%', sm: 'calc(50% - 8px)' }, flexGrow: 0, flexShrink: 0 }}>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Last Name *"
                  autoComplete="family-name"
                  value={formData.lastName || ''}
                  onChange={handleFieldChange('lastName')}
                  onBlur={handleFieldBlur('lastName')}
                  error={!!fieldErrors.lastName}
                  helperText={fieldErrors.lastName || 'Required'}
                  sx={{
                    mt: 1,
                    width: '100%',
                    '& .MuiInputBase-root': {
                      width: '100%',
                      overflow: 'hidden',
                    },
                    '& .MuiInputBase-input': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                    '& .MuiInputLabel-root': {
                      overflow: 'visible',
                    },
                    '& .MuiInputBase-input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 1000px white inset',
                      WebkitTextFillColor: 'inherit',
                    }
                  }}
                  InputProps={{
                    endAdornment: fieldTouched.lastName && !fieldErrors.lastName && formData.lastName && (
                      <InputAdornment position="end">
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            </Grid>
          </Grid>
          
          {/* Row 2: Email and Phone Number */}
          <Grid container spacing={2} sx={{ mb: 2, width: '100%', display: 'flex', flexWrap: 'wrap' }}>
            <Grid item xs={12} sm={6} sx={{ minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)' }, maxWidth: { xs: '100%', sm: 'calc(50% - 8px)' }, flexGrow: 0, flexShrink: 0 }}>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Email Address *"
                  type="email"
                  autoComplete="email"
                  value={formData.email || ''}
                  onChange={handleFieldChange('email')}
                  onBlur={handleFieldBlur('email')}
                  error={!!fieldErrors.email}
                  helperText={fieldErrors.email || 'Enter a valid email address'}
                  sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                      width: '100%',
                      overflow: 'hidden',
                    },
                    '& .MuiInputBase-input': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                    '& .MuiInputLabel-root': {
                      overflow: 'visible',
                    },
                    '& .MuiInputBase-input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 1000px white inset',
                      WebkitTextFillColor: 'inherit',
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlined />
                      </InputAdornment>
                    ),
                    endAdornment: fieldTouched.email && !fieldErrors.email && formData.email && (
                      <InputAdornment position="end">
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)' }, maxWidth: { xs: '100%', sm: 'calc(50% - 8px)' }, flexGrow: 0, flexShrink: 0 }}>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Phone Number (09XXX)"
                  autoComplete="tel"
                  value={formData.phone || ''}
                  onChange={handleFieldChange('phone')}
                  onBlur={handleFieldBlur('phone')}
                  error={!!fieldErrors.phone}
                  helperText={fieldErrors.phone || 'Philippine mobile format: 09XXXXXXXXX'}
                  placeholder="09XX XXX XXXX"
                  sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                      width: '100%',
                      overflow: 'hidden',
                    },
                    '& .MuiInputBase-input': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                    '& .MuiInputLabel-root': {
                      overflow: 'visible',
                    },
                    '& .MuiInputBase-input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 1000px white inset',
                      WebkitTextFillColor: 'inherit',
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneOutlined />
                      </InputAdornment>
                    ),
                    endAdornment: fieldTouched.phone && !fieldErrors.phone && formData.phone && (
                      <InputAdornment position="end">
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            </Grid>
          </Grid>
          
          {/* Row 3: Password and Confirm Password */}
          <Grid container spacing={2} sx={{ mb: 2, width: '100%', display: 'flex', flexWrap: 'wrap' }}>
            <Grid item xs={12} sm={6} sx={{ minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)' }, maxWidth: { xs: '100%', sm: 'calc(50% - 8px)' }, flexGrow: 0, flexShrink: 0 }}>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Password *"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password || ''}
                  onChange={handleFieldChange('password')}
                  onBlur={handleFieldBlur('password')}
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password || 'Minimum 8 characters'}
                  sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                      width: '100%',
                      overflow: 'hidden',
                    },
                    '& .MuiInputBase-input': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                    '& .MuiInputLabel-root': {
                      overflow: 'visible',
                    },
                    '& .MuiInputBase-input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 1000px white inset',
                      WebkitTextFillColor: 'inherit',
                    }
                  }}
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
                    )
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)' }, maxWidth: { xs: '100%', sm: 'calc(50% - 8px)' }, flexGrow: 0, flexShrink: 0 }}>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Confirm Password *"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword || ''}
                  onChange={handleFieldChange('confirmPassword')}
                  onBlur={handleFieldBlur('confirmPassword')}
                  error={!!fieldErrors.confirmPassword}
                  helperText={fieldErrors.confirmPassword || 'Re-enter your password'}
                  sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                      width: '100%',
                      overflow: 'hidden',
                    },
                    '& .MuiInputBase-input': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                    '& .MuiInputLabel-root': {
                      overflow: 'visible',
                    },
                    '& .MuiInputBase-input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 1000px white inset',
                      WebkitTextFillColor: 'inherit',
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {fieldTouched.confirmPassword && !fieldErrors.confirmPassword && formData.confirmPassword && (
                          <CheckCircle sx={{ color: 'success.main', fontSize: 20, mr: 1 }} />
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
              </Box>
            </Grid>
          </Grid>
          
          {/* Password Strength Meter - Matches Password Field Width */}
          {formData.password && (
            <Box sx={{ 
              mb: 2, 
              mt: -1,
              width: { xs: '100%', sm: 'calc(50% - 8px)' },
              maxWidth: { xs: '100%', sm: 'calc(50% - 8px)' }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      bgcolor: 
                        passwordStrength >= 80 ? 'success.main' :
                        passwordStrength >= 60 ? 'warning.main' :
                        passwordStrength >= 40 ? 'info.main' : 'error.main'
                    }
                  }}
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    minWidth: 50,
                    color: 
                      passwordStrength >= 80 ? 'success.main' :
                      passwordStrength >= 60 ? 'warning.main' :
                      passwordStrength >= 40 ? 'info.main' : 'error.main',
                    fontWeight: 600
                  }}
                >
                  {getPasswordStrengthLabel()}
                </Typography>
              </Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  display: 'block',
                  mt: 0.5,
                  fontSize: '0.7rem'
                }}
              >
                Include uppercase, lowercase, numbers, and special characters
              </Typography>
            </Box>
          )}
          
          {/* Row 4: Role and Active Status */}
          <Grid container spacing={2} sx={{ width: '100%', display: 'flex', flexWrap: 'wrap' }}>
            <Grid item xs={12} sm={6} sx={{ minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)' }, maxWidth: { xs: '100%', sm: 'calc(50% - 8px)' }, flexGrow: 0, flexShrink: 0 }}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role || 'customer'}
                  label="Role"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  startAdornment={
                    <InputAdornment position="start">
                      {formData.role === 'admin' ? <AdminPanelSettingsOutlined /> : <PersonOutlined />}
                    </InputAdornment>
                  }
                >
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)' }, maxWidth: { xs: '100%', sm: 'calc(50% - 8px)' }, flexGrow: 0, flexShrink: 0 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.deactivated !== true}
                    onChange={(e) => setFormData({ ...formData, deactivated: !e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {formData.deactivated !== true ? (
                      <>
                        <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                        <Typography>Active</Typography>
                      </>
                    ) : (
                      <>
                        <CancelOutlined sx={{ color: 'error.main', fontSize: 20 }} />
                        <Typography>Inactive</Typography>
                      </>
                    )}
                  </Box>
                }
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={loading || Object.keys(fieldErrors).some(key => fieldErrors[key])}
          startIcon={loading ? <CircularProgress size={20} /> : <PersonAddOutlined />}
        >
          {loading ? 'Creating...' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUserDialog;
