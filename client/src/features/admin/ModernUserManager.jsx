import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Avatar,
  FormControlLabel,
  Switch,
  useTheme,
  useMediaQuery,
  alpha,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Divider,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  PersonOutlined,
  PeopleOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreVertOutlined,
  SearchOutlined,
  RefreshOutlined,
  PersonAddOutlined,
  CheckCircleOutlined,
  CancelOutlined,
  Close,
  AdminPanelSettingsOutlined,
  VisibilityOutlined,
  CloseOutlined,
  EmailOutlined,
  PhoneOutlined,
  LocationOnOutlined,
  LoginOutlined,
  BookOutlined,
  CarRentalOutlined,
  HistoryOutlined,
  ContactMailOutlined,
  AccountCircleOutlined,
  CheckCircle,
  Visibility,
  VisibilityOff,
  LockOutlined,
  CalendarTodayOutlined,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { getImageUrl } from '../../utils/imageHelper';
import { PageLoader } from '../../components/feedback/LoadingSpinner';
import { useToast } from '../../components/feedback/ToastProvider';
import axiosInstance from '../../utils/axiosConfig';

// Dialog Components
import AddUserDialog from './components/AddUserDialog';
import EditUserDialog from './components/EditUserDialog';
import ViewUserDialog from './components/ViewUserDialog';
import DeleteUserDialog from './components/DeleteUserDialog';

const ModernUserManager = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  
  // Mobile responsiveness
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // State management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newUsersToday: 0,
    newUsersWeek: 0,
    newUsersMonth: 0,
    recentlyActive: 0,
  });

  // Dialog states
  const [editDialog, setEditDialog] = useState({ open: false });
  const [deleteDialog, setDeleteDialog] = useState({ open: false });
  const [viewDialog, setViewDialog] = useState({ open: false });
  const [addDialog, setAddDialog] = useState({ open: false });
  const [addUserLoading, setAddUserLoading] = useState(false);

  // Helper functions for chip colors
  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'error';
      case 'customer': return 'primary';
      default: return 'default';
    }
  };

  // Fetch users
  const fetchUsers = async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const usersRes = await axiosInstance.get('/api/admin/users');
      setUsers(usersRes.data.users || []);
      
      // Calculate user statistics
      const userData = usersRes.data.users || [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const userStats = {
        totalUsers: userData.length,
        activeUsers: userData.filter(u => u.deactivated !== true).length,
        inactiveUsers: userData.filter(u => u.deactivated === true).length,
        newUsersToday: userData.filter(u => new Date(u.createdAt) >= today).length,
        newUsersWeek: userData.filter(u => new Date(u.createdAt) >= weekAgo).length,
        newUsersMonth: userData.filter(u => new Date(u.createdAt) >= monthAgo).length,
        userGrowthRate: 0,
        adminCount: userData.filter(u => u.role === 'admin').length,
        customerCount: userData.filter(u => u.role === 'customer').length,
        recentlyActive: userData.filter(u => {
          const lastLogin = u.lastLogin ? new Date(u.lastLogin) : null;
          return lastLogin && (now - lastLogin) < 30 * 24 * 60 * 60 * 1000;
        }).length,
      };
      
      // Calculate growth rate
      const lastMonth = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
      const lastMonthUsers = userData.filter(u => new Date(u.createdAt) < monthAgo && new Date(u.createdAt) >= lastMonth).length;
      if (lastMonthUsers > 0) {
        userStats.userGrowthRate = Math.round(((userStats.newUsersMonth - lastMonthUsers) / lastMonthUsers) * 100);
      } else {
        userStats.userGrowthRate = userStats.newUsersMonth > 0 ? 100 : 0;
      }
      
      setStats(userStats);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const fetchData = async (showToast = false) => {
    try {
      await fetchUsers(showToast);
      
      if (showToast) {
        toast.success('Data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (showToast) {
        toast.error('Failed to refresh data');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Debounced search for users - updates 500ms after user stops typing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  const handleMenuOpen = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setEditDialog({ open: true });
    handleMenuClose();
  };

  const handleView = () => {
    setViewDialog({ open: true });
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialog({ open: true });
    handleMenuClose();
  };

  const handleEditSubmit = async (formData) => {
    if (!selectedItem || !selectedItem._id) {
      toast.error('No user selected');
      return;
    }
    try {
      await axiosInstance.put(`/api/admin/users/${selectedItem._id}`, {
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        },
        email: formData.email,
        role: formData.role,
        deactivated: formData.deactivated,
      });
      
      toast.success('User updated successfully');
      setEditDialog({ open: false });
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem || !selectedItem._id) {
      toast.error('No user selected');
      setDeleteDialog({ open: false });
      return;
    }
    try {
      await axiosInstance.delete(`/api/admin/users/${selectedItem._id}`);
      toast.success('User deleted successfully');
      setDeleteDialog({ open: false });
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  // Validation rules for Add User Dialog
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
        weak: 'Password is too weak. Add uppercase, numbers, and special characters',
        medium: 'Good password! Consider adding more variety for better security',
        strong: 'Strong password! The account will be well protected'
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

  const handleAddSubmit = async (formData) => {
    setAddUserLoading(true);
    
    try {
      await axiosInstance.post('/api/admin/users', {
        email: formData.email,
        password: formData.password,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        },
        role: formData.role,
        deactivated: formData.deactivated,
      });
      
      toast.success('User created successfully');
      setAddDialog({ open: false });
      fetchData();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      `${user.profile?.firstName} ${user.profile?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'active') {
      const now = new Date();
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
      matchesStatus = lastLogin && (now - lastLogin) < 30 * 24 * 60 * 60 * 1000;
    } else if (statusFilter === 'inactive') {
      const now = new Date();
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
      matchesStatus = !lastLogin || (now - lastLogin) >= 30 * 24 * 60 * 60 * 1000;
    }
    
    return matchesSearch && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 },
        mb: { xs: 2, sm: 3, md: 4 } 
      }}>
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: { xs: 1.5, sm: 2 },
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 1.5, md: 2 },
            }}
          >
            <PeopleOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
            User Management
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              mb: { xs: 2, sm: 2.5, md: 3 },
              lineHeight: 1.6,
            }}
          >
            Manage user accounts, roles, and permissions
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <Tooltip title={refreshing ? "Refreshing..." : "Refresh Data"}>
            <span>
              <IconButton
                onClick={async () => {
                  if (refreshing) return;
                  setRefreshing(true);
                  try {
                    await Promise.all([
                      fetchUsers(true),
                      new Promise(resolve => setTimeout(resolve, 500))
                    ]);
                    toast.success('Data refreshed successfully');
                  } catch (error) {
                    console.error('Error refreshing data:', error);
                    toast.error('Failed to refresh data');
                  } finally {
                    setRefreshing(false);
                  }
                }}
                disabled={refreshing}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                {refreshing ? (
                  <CircularProgress size={20} sx={{ color: 'primary.main' }} />
                ) : (
                  <RefreshOutlined sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
          
          <Button
            startIcon={<PersonAddOutlined />}
            onClick={() => {
              setAddDialog({ open: true });
            }}
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ maxWidth: '300px', flex: '1 1 auto' }}>
            <TextField
              fullWidth
              placeholder="Search users by name or email"
              sx={{
                width: '100%',
                '& .MuiInputBase-input': {
                  width: '100%',
                  minWidth: 0,
                },
                '& .MuiInputBase-input::placeholder': {
                  opacity: 0.7,
                  whiteSpace: 'nowrap',
                },
                '& .MuiOutlinedInput-root': {
                  width: '100%',
                },
                '& .MuiInputBase-root': {
                  width: '100%',
                },
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px white inset',
                  WebkitTextFillColor: 'inherit',
                  caretColor: 'inherit',
                },
              }}
              value={searchInput}
              onChange={(e) => {
                const newValue = e.target.value;
                setSearchInput(newValue);
                // Clear active search immediately when input becomes empty
                if (newValue === '') {
                  setSearchTerm('');
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <IconButton size="small" onClick={() => { setSearchInput(''); setSearchTerm(''); }}>
                    <Close />
                  </IconButton>
                ),
              }}
            />
          </Box>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Users Display - Responsive */}
      {isMobile || isTablet ? (
        // Mobile/Tablet Card Layout
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {paginatedUsers.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <PeopleOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
                {(() => {
                  if (!users || users.length === 0) {
                    return 'Users will appear here once they register for an account.';
                  } else if (searchTerm || statusFilter !== 'all') {
                    return 'Try adjusting your search criteria to find more results.';
                  } else {
                    return 'Try adjusting your search criteria or filters to find more results.';
                  }
                })()}
              </Typography>
              {(searchTerm || statusFilter !== 'all') && users && users.length > 0 && (
                <Button
                  variant="contained"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  startIcon={<RefreshOutlined />}
                >
                  Clear All Filters
                </Button>
              )}
            </Paper>
          ) : (
            paginatedUsers.map((user) => (
              <Card key={user._id} sx={{ p: 0, '&:hover': { boxShadow: theme.shadows[4] } }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={2}>
                    {/* User Info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={getImageUrl(user.profile?.profilePicture)}
                        sx={{ 
                          bgcolor: user.profile?.profilePicture ? 'transparent' : alpha(theme.palette.primary.main, 0.9),
                          width: 48,
                          height: 48,
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: 'white',
                          boxShadow: theme.shadows[2],
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}
                      >
                        {!user.profile?.profilePicture && (user.profile?.firstName && user.profile?.lastName
                          ? `${user.profile.firstName.charAt(0)}${user.profile.lastName.charAt(0)}`.toUpperCase()
                          : user.email[0].toUpperCase())}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {user.profile?.firstName && user.profile?.lastName
                            ? `${user.profile.firstName} ${user.profile.lastName}`
                            : user.name || 'Unknown User'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                          {user.email}
                        </Typography>
                      </Box>
                      <IconButton onClick={(e) => handleMenuOpen(e, user)} size="small">
                        <MoreVertOutlined />
                      </IconButton>
                    </Box>
                    
                    <Divider />
                    
                    {/* Role and Status */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Role
                        </Typography>
                        <Chip
                          label={user.role === 'admin' ? 'Admin' : 'Customer'}
                          size="small"
                          icon={user.role === 'admin' ? <AdminPanelSettingsOutlined /> : <PersonOutlined />}
                          color={getRoleColor(user.role)}
                          sx={{ fontWeight: 500 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Status
                        </Typography>
                        <Chip
                          label={user.deactivated ? 'Inactive' : 'Active'}
                          size="small"
                          color={user.deactivated ? 'error' : 'success'}
                          sx={{ fontWeight: 500 }}
                        />
                      </Grid>
                    </Grid>
                    
                    {/* Dates */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Joined
                        </Typography>
                        <Typography variant="body2">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Last Active
                        </Typography>
                        <Typography variant="body2">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      ) : (
        // Desktop Table Layout
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Last Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Paper
                        sx={{
                          p: 4,
                          textAlign: 'center',
                          backgroundColor: 'transparent',
                          boxShadow: 'none',
                        }}
                      >
                        <PeopleOutlined
                          sx={{
                            fontSize: 64,
                            color: 'text.secondary',
                            mb: 2,
                          }}
                        />
                        <Typography variant="h5" sx={{ mb: 2, color: 'text.primary' }}>
                          {(() => {
                            if (!users || users.length === 0) {
                              return 'Users will appear here once they register for an account.';
                            } else if (searchTerm || statusFilter !== 'all') {
                              return 'Try adjusting your search criteria to find more results.';
                            } else {
                              return 'Try adjusting your search criteria or filters to find more results.';
                            }
                          })()}
                        </Typography>
                        {(searchTerm || statusFilter !== 'all') && users && users.length > 0 && (
                          <Button
                            variant="contained"
                            onClick={() => {
                              setSearchInput('');
                              setSearchTerm('');
                              setStatusFilter('all');
                            }}
                            startIcon={<RefreshOutlined />}
                          >
                            Clear All Filters
                          </Button>
                        )}
                      </Paper>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          src={getImageUrl(user.profile?.profilePicture)}
                          sx={{ 
                            bgcolor: user.profile?.profilePicture ? 'transparent' : alpha(theme.palette.primary.main, 0.9),
                            width: 40,
                            height: 40,
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: 'white',
                            boxShadow: theme.shadows[2],
                            border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          }}
                        >
                          {!user.profile?.profilePicture && (user.profile?.firstName && user.profile?.lastName
                            ? `${user.profile.firstName.charAt(0)}${user.profile.lastName.charAt(0)}`.toUpperCase()
                            : user.email[0].toUpperCase())}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {user.profile?.firstName && user.profile?.lastName
                              ? `${user.profile.firstName} ${user.profile.lastName}`
                              : user.name || 'Unknown User'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role === 'admin' ? 'Admin' : 'Customer'}
                        size="small"
                        icon={user.role === 'admin' ? <AdminPanelSettingsOutlined /> : <PersonOutlined />}
                        color={getRoleColor(user.role)}
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.deactivated ? 'Inactive' : 'Active'}
                        size="small"
                        color={user.deactivated ? 'error' : 'success'}
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={(e) => handleMenuOpen(e, user)}>
                        <MoreVertOutlined />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      
      <TablePagination
        component="div"
        count={filteredUsers.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Users per page:"
        showFirstButton
        showLastButton
        sx={{
          '& .MuiTablePagination-toolbar': {
            flexWrap: 'wrap',
            minHeight: { xs: 52, sm: 64 },
            px: { xs: 1, sm: 2 },
            justifyContent: 'flex-end',
          },
          '& .MuiTablePagination-spacer': {
            flex: '1 1 100%',
          },
          '& .MuiTablePagination-selectLabel': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            display: { xs: 'none', sm: 'block' },
          },
          '& .MuiTablePagination-displayedRows': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
          '& .MuiTablePagination-select': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
          '& .MuiIconButton-root': {
            padding: { xs: '4px', sm: '8px' },
          },
        }}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditOutlined sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={handleView}>
          <VisibilityOutlined sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteOutlined sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Dialog Components */}
      <AddUserDialog
        open={addDialog.open}
        onClose={() => setAddDialog({ open: false })}
        onSubmit={handleAddSubmit}
        loading={addUserLoading}
      />
      
      <EditUserDialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false })}
        onSubmit={handleEditSubmit}
        user={selectedItem}
        loading={false}
      />
      
      <ViewUserDialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false })}
        user={selectedItem}
      />
      
      <DeleteUserDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={handleDeleteConfirm}
        user={selectedItem}
        loading={false}
      />
    </Container>
  );
};

export default ModernUserManager;