import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, IconButton,
  Chip, TextField, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Card, CardContent, Tabs, Tab, Menu, ListItemIcon,
  ListItemText, Divider, Tooltip, InputAdornment, Avatar,
  useTheme, useMediaQuery, CircularProgress, Stack, alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Build as BuildIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
  DirectionsCar as CarIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Assignment as AssignmentIcon,
  LocalShipping as LocalShippingIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  PriorityHigh as PriorityIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { format, parseISO, isAfter, isBefore, differenceInDays } from 'date-fns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useMaintenanceContext } from '../../contexts/MaintenanceContext';
import { useAuth } from '../auth/AuthContext';
import axiosInstance from '../../utils/axiosConfig';
import { toast } from 'react-toastify';

const ModernMaintenanceManager = forwardRef(({ openScheduleDialog, onCloseScheduleDialog, hideHeader = false }, ref) => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { 
    maintenanceRecords, 
    loading, 
    stats,
    fetchMaintenanceRecords,
    fetchMaintenanceStats,
    createMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord 
  } = useMaintenanceContext();
  const [cars, setCars] = useState([]);

  // State management
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [formData, setFormData] = useState({
    car: '',
    type: 'routine',
    description: '',
    status: 'scheduled',
    priority: 'medium',
    scheduledDate: null,
    estimatedCost: '',
    actualCost: '',
    assignedTo: '',
    mileage: ''
  });

  // Fetch cars data
  const fetchCars = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axiosInstance.get('/api/cars');
      // Ensure we have an array of cars
      const carsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.cars || response.data.data || []);
      setCars(carsData);
    } catch (error) {
      console.error('Error fetching cars:', error);
      toast.error('Failed to fetch vehicles');
      setCars([]); // Set empty array on error
    }
  };

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await Promise.all([
        fetchMaintenanceRecords(),
        fetchMaintenanceStats(),
        fetchCars()
      ]);
    },
    scheduleMaintenance: () => {
      if (typeof handleOpenDialog === 'function') {
        handleOpenDialog();
      } else {
        setOpenDialog(true);
      }
    }
  }));

  // Fetch data on mount
  useEffect(() => {
    fetchMaintenanceRecords();
    fetchMaintenanceStats();
    fetchCars();
  }, []);

  // Handle external dialog control
  useEffect(() => {
    if (openScheduleDialog) {
      handleOpenDialog();
      if (onCloseScheduleDialog) {
        onCloseScheduleDialog();
      }
    }
  }, [openScheduleDialog]);

  // Debounced search - updates 500ms after user stops typing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  // Filter records based on tab
  const getFilteredRecords = useMemo(() => {
    // Ensure maintenanceRecords is an array
    const records = Array.isArray(maintenanceRecords) ? maintenanceRecords : [];
    let filtered = [...records];

    // Tab filtering
    switch (tabValue) {
      case 0: // All
        break;
      case 1: // Scheduled
        filtered = filtered.filter(r => r.status === 'scheduled');
        break;
      case 2: // In Progress
        filtered = filtered.filter(r => r.status === 'in_progress');
        break;
      case 3: // Completed
        filtered = filtered.filter(r => r.status === 'completed');
        break;
      case 4: // Urgent
        filtered = filtered.filter(r => r.priority === 'urgent' || r.priority === 'high');
        break;
      default:
        break;
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(r => r.priority === priorityFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.description?.toLowerCase().includes(search) ||
        r.car?.make?.toLowerCase().includes(search) ||
        r.car?.model?.toLowerCase().includes(search) ||
        r.type?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [maintenanceRecords, tabValue, statusFilter, priorityFilter, searchTerm]);

  // Handlers
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
  };

  const handleOpenDialog = (record = null) => {
    if (record) {
      setFormData({
        car: record.car?._id || record.car || '',
        type: record.type || 'routine',
        description: record.description || '',
        status: record.status || 'scheduled',
        priority: record.priority || 'medium',
        scheduledDate: record.scheduledDate ? dayjs(record.scheduledDate) : null,
        estimatedCost: record.estimatedCost || '',
        actualCost: record.actualCost || '',
        assignedTo: record.assignedTo?._id || record.assignedTo || '',
        mileage: record.mileage || ''
      });
      setSelectedRecord(record);
    } else {
      setFormData({
        car: '',
        type: 'routine',
        description: '',
        status: 'scheduled',
        priority: 'medium',
        scheduledDate: null,
        estimatedCost: '',
        actualCost: '',
        assignedTo: '',
        mileage: ''
      });
      setSelectedRecord(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRecord(null);
  };

  const handleSubmit = async () => {
    if (submitLoading) return; // Prevent multiple clicks
    
    try {
      setSubmitLoading(true);
      
      // Prepare data with proper conversions
      const submitData = {
        ...formData,
        scheduledDate: formData.scheduledDate
  ? formData.scheduledDate.toDate().toISOString().split("T")[0]
  : "",

        estimatedCost: parseFloat(formData.estimatedCost) || 0,
        actualCost: parseFloat(formData.actualCost) || 0,
        mileage: parseInt(formData.mileage) || 0
      };
      
      if (selectedRecord) {
        await updateMaintenanceRecord(selectedRecord._id, submitData);
      } else {
        await createMaintenanceRecord(submitData);
      }
      handleCloseDialog();
      await fetchMaintenanceRecords();
      await fetchMaintenanceStats();
    } catch (error) {
      console.error('Error saving maintenance record:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMaintenanceRecord(selectedRecord._id);
      setOpenDeleteDialog(false);
      setSelectedRecord(null);
      fetchMaintenanceRecords();
      fetchMaintenanceStats();
    } catch (error) {
      console.error('Error deleting maintenance record:', error);
    }
  };

  const handleMenuClick = (event, record) => {
    setAnchorEl(event.currentTarget);
    setSelectedRecord(record);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRefresh = () => {
    fetchMaintenanceRecords();
    fetchMaintenanceStats();
    toast.success('Data refreshed successfully');
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'info';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error'; // Red for cancelled (negative action)
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'routine': return <SettingsIcon />;
      case 'repair': return <BuildIcon />;
      case 'inspection': return <AssignmentIcon />;
      case 'oil_change': return <LocalShippingIcon />;
      default: return <BuildIcon />;
    }
  };

  const isOverdue = (record) => {
    if (record.status === 'completed' || record.status === 'cancelled') return false;
    return isAfter(new Date(), parseISO(record.scheduledDate));
  };

  return (
    <Box sx={{ p: hideHeader ? 0 : 3 }}>
      {/* Header - only show if not hidden */}
      {!hideHeader && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              Maintenance Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage vehicle maintenance schedules and records
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ bgcolor: 'primary.main' }}
            >
              Schedule Maintenance
            </Button>
          </Box>
        </Box>
      )}

      {/* Statistics Cards - only show if not hidden */}
      {!hideHeader && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.light', mr: 2 }}>
                    <ScheduleIcon color="info" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{stats?.scheduled || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Scheduled
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.light', mr: 2 }}>
                    <BuildIcon color="warning" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{stats?.inProgress || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'error.light', mr: 2 }}>
                    <PriorityIcon color="error" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{stats?.urgentCount || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Urgent/High Priority
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.light', mr: 2 }}>
                    <MoneyIcon color="success" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      ₱{stats?.totalCost?.toFixed(2) || '0.00'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Cost (Month)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters and Search */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search maintenance records..."
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
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <IconButton 
                    size="small" 
                    onClick={() => { 
                      setSearchInput(''); 
                      setSearchTerm(''); 
                    }}
                  >
                    <ClearIcon />
                  </IconButton>
                ),
              }}
              sx={{
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px white inset',
                  WebkitTextFillColor: 'inherit',
                  caretColor: 'inherit',
                },
                '& input:-webkit-autofill:hover': {
                  WebkitBoxShadow: '0 0 0 1000px white inset',
                  WebkitTextFillColor: 'inherit',
                },
                '& input:-webkit-autofill:focus': {
                  WebkitBoxShadow: '0 0 0 1000px white inset',
                  WebkitTextFillColor: 'inherit',
                },
                '& input:-webkit-autofill:active': {
                  WebkitBoxShadow: '0 0 0 1000px white inset',
                  WebkitTextFillColor: 'inherit',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Priority Filter</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                label="Priority Filter"
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: { xs: 1.5, sm: 2 }, borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': { 
              textTransform: 'none', 
              fontWeight: 500, 
              fontSize: { xs: '0.875rem', sm: '1rem' },
              minHeight: { xs: 48, sm: 56 },
              py: { xs: 1, sm: 1.5 },
            },
          }}
        >
          <Tab label={`All (${maintenanceRecords?.length || 0})`} />
          <Tab label={`Scheduled (${stats?.scheduled || 0})`} />
          <Tab label={`In Progress (${stats?.inProgress || 0})`} />
          <Tab label={`Completed (${stats?.completed || 0})`} />
          <Tab label={`Urgent (${stats?.urgentCount || 0})`} />
        </Tabs>
      </Paper>

      {/* Table/Cards */}
      {getFilteredRecords.length === 0 ? (
        <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: 'background.default',
              borderRadius: 0
            }}
          >
            <BuildIcon
              sx={{
                fontSize: 64,
                color: 'text.secondary',
                mb: 2,
              }}
            />
            <Typography variant="h5" sx={{ mb: 2, color: 'text.primary' }}>
              {(() => {
                // Check if there's any data for the current tab
                const hasDataForTab = maintenanceRecords?.some(record => {
                  switch (tabValue) {
                    case 0: return true; // All
                    case 1: return record.status === 'scheduled';
                    case 2: return record.status === 'in_progress';
                    case 3: return record.status === 'completed';
                    case 4: return record.priority === 'urgent' || record.priority === 'high';
                    default: return true;
                  }
                });
                
                if (!maintenanceRecords || maintenanceRecords.length === 0) {
                  return 'No maintenance records';
                } else if (searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') {
                  return 'No search results';
                } else if (!hasDataForTab) {
                  const tabNames = ['', 'scheduled', 'in progress', 'completed', 'urgent'];
                  return `No ${tabNames[tabValue]} maintenance records`;
                } else {
                  return 'No search results';
                }
              })()}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
              {(() => {
                const hasDataForTab = maintenanceRecords?.some(record => {
                  switch (tabValue) {
                    case 0: return true;
                    case 1: return record.status === 'scheduled';
                    case 2: return record.status === 'in_progress';
                    case 3: return record.status === 'completed';
                    case 4: return record.priority === 'urgent' || record.priority === 'high';
                    default: return true;
                  }
                });
                
                if (!maintenanceRecords || maintenanceRecords.length === 0) {
                  return 'Schedule maintenance for your vehicles to keep them in optimal condition.';
                } else if (searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') {
                  return 'Try adjusting your search criteria to find more results.';
                } else if (!hasDataForTab) {
                  return 'There are no maintenance records with this status.';
                } else {
                  return 'Try adjusting your search criteria or filters to find more results.';
                }
              })()}
            </Typography>
            {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && maintenanceRecords && maintenanceRecords.length > 0 && (
              <Button
                variant="contained"
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setTabValue(0);
                }}
                startIcon={<RefreshIcon />}
              >
                Clear All Filters
              </Button>
            )}
          </Paper>
      ) : isMobile || isTablet ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {getFilteredRecords
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((record) => (
              <Card key={record._id} sx={{ 
                p: 0, 
                '&:hover': { boxShadow: theme.shadows[4] },
                bgcolor: isOverdue(record) ? alpha(theme.palette.error.main, 0.1) : 'inherit',
                border: isOverdue(record) ? `2px solid ${theme.palette.error.main}` : 'none'
              }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  {/* Header with Car Info and Status */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                      <Avatar 
                        sx={{ 
                          width: 44, 
                          height: 44, 
                          bgcolor: alpha(theme.palette.primary.main, 0.1)
                        }}
                      >
                        <CarIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                          {record.car?.make} {record.car?.model}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {record.car?.year} • {record.car?.licensePlate}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton 
                      onClick={(e) => handleMenuClick(e, record)} 
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  {/* Status and Priority Chips */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
                    <Chip
                      label={record.status?.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(record.status)}
                      size="small"
                    />
                    <Chip
                      label={record.priority?.toUpperCase()}
                      color={getPriorityColor(record.priority)}
                      size="small"
                      icon={record.priority === 'urgent' ? <PriorityIcon sx={{ fontSize: 14 }} /> : null}
                    />
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  {/* Main Information Grid */}
                  <Grid container spacing={2.5}>
                    {/* Maintenance Type */}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Maintenance Type
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {getTypeIcon(record.type)}
                        <Typography variant="body1" fontWeight={600}>
                          {record.type?.replace('_', ' ').toUpperCase()}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Description */}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Description
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {record.description}
                      </Typography>
                    </Grid>

                    {/* Scheduled Date */}
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Scheduled Date
                      </Typography>
                      <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                        {format(parseISO(record.scheduledDate), 'MMM dd, yyyy')}
                      </Typography>
                      {isOverdue(record) && (
                        <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                          Overdue by {differenceInDays(new Date(), parseISO(record.scheduledDate))} days
                        </Typography>
                      )}
                    </Grid>

                    {/* Cost Information */}
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Cost
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" fontWeight={500}>
                          Est: ₱{record.estimatedCost?.toFixed(2) || '0.00'}
                        </Typography>
                        {record.actualCost > 0 && (
                          <Typography 
                            variant="body2" 
                            color={record.actualCost > record.estimatedCost ? 'error.main' : 'success.main'}
                            fontWeight={500}
                          >
                            Act: ₱{record.actualCost.toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
        </Box>
        ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Scheduled Date</TableCell>
                  <TableCell>Cost</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredRecords
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((record) => (
                  <TableRow 
                    key={record._id}
                    sx={{ 
                      '&:hover': { bgcolor: 'action.hover' },
                      bgcolor: isOverdue(record) ? 'error.light' : 'inherit'
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {record.car?.make} {record.car?.model}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {record.car?.year} - {record.car?.licensePlate}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getTypeIcon(record.type)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {record.type?.replace('_', ' ').toUpperCase()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={record.description}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {record.description}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.status?.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(record.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.priority?.toUpperCase()}
                        color={getPriorityColor(record.priority)}
                        size="small"
                        icon={record.priority === 'urgent' ? <PriorityIcon /> : null}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {format(parseISO(record.scheduledDate), 'MMM dd, yyyy')}
                        </Typography>
                        {isOverdue(record) && (
                          <Typography variant="caption" color="error">
                            Overdue by {differenceInDays(new Date(), parseISO(record.scheduledDate))} days
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          Est: ₱{record.estimatedCost?.toFixed(2) || '0.00'}
                        </Typography>
                        {record.actualCost > 0 && (
                          <Typography variant="caption" color={record.actualCost > record.estimatedCost ? 'error' : 'success'}>
                            Act: ₱{record.actualCost.toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, record)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      
      <TablePagination
        component="div"
        count={getFilteredRecords.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Records per page:"
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
        <MenuItem onClick={() => {
          handleOpenDialog(selectedRecord);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        
        {/* Only show Start Maintenance for scheduled records */}
        {selectedRecord?.status === 'scheduled' && (
          <MenuItem onClick={() => {
            updateMaintenanceRecord(selectedRecord._id, { status: 'in_progress' });
            handleMenuClose();
          }}>
            <ListItemIcon>
              <BuildIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Start Maintenance</ListItemText>
          </MenuItem>
        )}
        
        {/* Only show Mark Complete for in-progress records */}
        {selectedRecord?.status === 'in_progress' && (
          <MenuItem onClick={() => {
            updateMaintenanceRecord(selectedRecord._id, { status: 'completed', completedDate: new Date() });
            handleMenuClose();
          }}>
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mark Complete</ListItemText>
          </MenuItem>
        )}
        
        {/* Show Cancel option for scheduled or in-progress records */}
        {(selectedRecord?.status === 'scheduled' || selectedRecord?.status === 'in_progress') && (
          <MenuItem onClick={() => {
            updateMaintenanceRecord(selectedRecord._id, { status: 'cancelled' });
            handleMenuClose();
          }}>
            <ListItemIcon>
              <CancelIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Cancel Maintenance</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => {
          setOpenDeleteDialog(true);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 2, md: 2 },
            maxHeight: { xs: '100vh', sm: '85vh', md: '90vh' },
            height: { xs: '100vh', sm: 'auto', md: 'auto' },
            m: { xs: 0, sm: 2, md: 2 },
            width: { xs: '100%', sm: '90%', md: '100%' },
            maxWidth: { xs: '100%', sm: '700px', md: 'md' },
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle>
          {selectedRecord ? 'Edit Maintenance Record' : 'Schedule New Maintenance'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={5} sx={{
              minWidth: 0,
              width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(41.667% - 9.33px)' },
              maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(41.667% - 9.33px)' },
              flexGrow: 0,
              flexShrink: 0,
            }}>
              <Box sx={{ width: '100%' }}>
                <FormControl fullWidth required sx={{
                  '& .MuiInputBase-root': {
                    width: '100%',
                    overflow: 'hidden',
                  },
                  '& .MuiSelect-select': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                  '& .MuiInputLabel-root': {
                    overflow: 'visible',
                  },
                }}>
                  <InputLabel shrink>Vehicle</InputLabel>
                  <Select
                    displayEmpty
                    value={formData.car}
                    onChange={(e) => setFormData({ ...formData, car: e.target.value })}
                    label="Vehicle"
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                          zIndex: 1350
                        }
                      }
                    }}
                  >
                    <MenuItem value="" disabled>
                      Select vehicle
                    </MenuItem>
                    {Array.isArray(cars) && cars.map((car) => (
                      <MenuItem key={car._id} value={car._id}>
                        {car.year} {car.make} {car.model} - {car.licensePlate}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{
              minWidth: 0,
              width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' },
              maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' },
              flexGrow: 0,
              flexShrink: 0,
            }}>
              <Box sx={{ width: '100%' }}>
                <FormControl fullWidth required sx={{
                  '& .MuiInputBase-root': {
                    width: '100%',
                    overflow: 'hidden',
                  },
                  '& .MuiSelect-select': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                  '& .MuiInputLabel-root': {
                    overflow: 'visible',
                  },
                }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  label="Type"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        zIndex: 1350
                      }
                    }
                  }}
                >
                  <MenuItem value="routine">Routine</MenuItem>
                  <MenuItem value="repair">Repair</MenuItem>
                  <MenuItem value="inspection">Inspection</MenuItem>
                  <MenuItem value="oil_change">Oil Change</MenuItem>
                  <MenuItem value="tire_change">Tire Change</MenuItem>
                  <MenuItem value="brake_service">Brake Service</MenuItem>
                  <MenuItem value="engine_repair">Engine Repair</MenuItem>
                  <MenuItem value="transmission">Transmission</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
                </FormControl>
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{
              minWidth: 0,
              width: { xs: '100%', md: 'calc(33.333% - 10.67px)' },
              maxWidth: { xs: '100%', md: 'calc(33.333% - 10.67px)' },
              flexGrow: 0,
              flexShrink: 0,
            }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                sx={{
                  '& .MuiInputBase-root': {
                    width: '100%',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{
              minWidth: 0,
              width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' },
              maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' },
              flexGrow: 0,
              flexShrink: 0,
            }}>
              <Box sx={{ width: '100%' }}>
                <FormControl fullWidth sx={{
                  '& .MuiInputBase-root': {
                    width: '100%',
                    overflow: 'hidden',
                  },
                  '& .MuiSelect-select': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                  '& .MuiInputLabel-root': {
                    overflow: 'visible',
                  },
                }}>
                  <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        zIndex: 1350
                      }
                    }
                  }}
                >
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
                </FormControl>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{
              minWidth: 0,
              width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' },
              maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' },
              flexGrow: 0,
              flexShrink: 0,
            }}>
              <Box sx={{ width: '100%' }}>
                <FormControl fullWidth sx={{
                  '& .MuiInputBase-root': {
                    width: '100%',
                    overflow: 'hidden',
                  },
                  '& .MuiSelect-select': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                  '& .MuiInputLabel-root': {
                    overflow: 'visible',
                  },
                }}>
                  <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  label="Priority"
                  MenuProps={{
                    anchorOrigin: {
                      vertical: 'bottom',
                      horizontal: 'left',
                    },
                    transformOrigin: {
                      vertical: 'top',
                      horizontal: 'left',
                    },
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        zIndex: 1350
                      }
                    }
                  }}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
                </FormControl>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4} sx={{
              minWidth: 0,
              width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.333% - 10.67px)' },
              maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.333% - 10.67px)' },
              flexGrow: 0,
              flexShrink: 0,
            }}>
              <Box sx={{ width: '100%' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Scheduled Date"
                    value={formData.scheduledDate}
                    onChange={(newValue) => setFormData({ ...formData, scheduledDate: newValue })}
                    minDate={dayjs().startOf("day")}

                    sx={{
                      '& .MuiPickersDay-today': {
                        border: 'none !important',
                        backgroundColor: 'transparent !important',
                        color: 'rgba(0, 0, 0, 0.87) !important',
                        fontWeight: '400 !important',
                      },
                      '& .MuiPickersDay-today:not(.Mui-selected)': {
                        border: 'none !important',
                        backgroundColor: 'transparent !important',
                        color: 'rgba(0, 0, 0, 0.87) !important',
                        fontWeight: '400 !important',
                      },
                      '& .MuiPickersDay-today:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                      },
                      '& .MuiPickersDay-today:focus': {
                        backgroundColor: 'rgba(0, 0, 0, 0.12) !important',
                      },
                      '& .MuiPickersDay-today.Mui-selected': {
                        backgroundColor: '#1976d2 !important',
                        color: '#fff !important',
                        fontWeight: '500 !important',
                      },
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        sx: {
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
                        }
                      },
                      day: {
                        sx: {
                          '&.MuiPickersDay-today': {
                            border: 'none !important',
                            backgroundColor: 'transparent !important',
                            fontWeight: '400 !important',
                          },
                        }
                      }
                    }}
                    format="MM/DD/YYYY"
                  />
                </LocalizationProvider>
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{
              minWidth: 0,
              width: { xs: '100%', md: 'calc(33.333% - 10.67px)' },
              maxWidth: { xs: '100%', md: 'calc(33.333% - 10.67px)' },
              flexGrow: 0,
              flexShrink: 0,
            }}>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Estimated Cost"
                  type="number"
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                  sx={{
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
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{
              minWidth: 0,
              width: { xs: '100%', md: 'calc(33.333% - 10.67px)' },
              maxWidth: { xs: '100%', md: 'calc(33.333% - 10.67px)' },
              flexGrow: 0,
              flexShrink: 0,
            }}>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Actual Cost"
                  type="number"
                  value={formData.actualCost}
                  onChange={(e) => setFormData({ ...formData, actualCost: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                  sx={{
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
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{
              minWidth: 0,
              width: { xs: '100%', md: 'calc(33.333% - 10.67px)' },
              maxWidth: { xs: '100%', md: 'calc(33.333% - 10.67px)' },
              flexGrow: 0,
              flexShrink: 0,
            }}>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Mileage"
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  sx={{
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
                  }}
                />
              </Box>
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDialog}
            disabled={submitLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={submitLoading}
            startIcon={submitLoading ? <CircularProgress size={20} /> : null}
          >
            {submitLoading ? 'Saving...' : (selectedRecord ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this maintenance record? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default ModernMaintenanceManager;
