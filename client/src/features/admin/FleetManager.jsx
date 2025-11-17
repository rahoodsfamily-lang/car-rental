import React, { useState, useEffect, useMemo, useImperativeHandle } from 'react';
import {
  Box, Container, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, IconButton,
  Chip, TextField, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Card, CardContent, Tabs, Tab, Menu, ListItemIcon,
  ListItemText, InputAdornment, Avatar, Alert, Divider,
  Tooltip, useTheme, useMediaQuery, alpha, CircularProgress, Switch, FormControlLabel, Stack
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  DirectionsCarOutlined,
  BuildOutlined,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  CheckCircle as AvailableIcon,
  Warning as RentedIcon,
  Build as MaintenanceIcon,
  LocalGasStation as FuelIcon,
  Settings as TransmissionIcon,
  People as SeatsIcon,
  Business as LocationIcon,

  ColorLens as ColorIcon,
  CloudUpload as UploadIcon,
  CloudUploadOutlined,
  Close as CloseIcon,
  Close,
  MyLocation as MyLocationIcon,
  MyLocationOutlined,
  DeleteOutlined,
  CalendarTodayOutlined
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastProvider';
import { useSocket } from '../../contexts/SocketContext';
import axiosInstance from '../../utils/axiosConfig';
import LocationPicker from '../../components/map/LocationPicker';

const FleetManager = React.forwardRef((props, ref) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { user } = useAuth();
  const toast = useToast();
  const { socket } = useSocket();

  // State management
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [vehicleTab, setVehicleTab] = useState(0); // 0=All, 1=Available, 2=Rented, 3=Maintenance
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);

  // Dialog states
  const [editDialog, setEditDialog] = useState({ open: false, item: null, type: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, car: null });

  // Form states
  const [formData, setFormData] = useState({});
  const [selectedImages, setSelectedImages] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Fetch data
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchCars();
    }
  }, [user]);

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleCarStatusUpdate = (data) => {
      setCars(prevCars => 
        prevCars.map(car => 
          car._id === data.carId 
            ? { ...car, availability: data.availability }
            : car
        )
      );
    };

    socket.on('carStatusUpdated', handleCarStatusUpdate);
    return () => {
      socket.off('carStatusUpdated', handleCarStatusUpdate);
    };
  }, [socket]);

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refresh: handleRefresh,
    addVehicle: handleAdd
  }));

  const fetchCars = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const response = await axiosInstance.get('/api/admin/cars?limit=100');
      setCars(response.data.cars || []);
    } catch (error) {
      console.error('Error fetching cars:', error);
      if (!isRefresh) {
        toast.error('Failed to load vehicles. Please try again.');
      }
      throw error;
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchCars(true);
      toast.success('Fleet data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdd = () => {
    setEditDialog({ open: true, item: null, type: 'car' });
    const initialData = { 
      features: [],
      fuelType: 'Gas',
      transmission: 'Automatic',
      bodyType: 'Sedan',
      availability: 'available'
    };
    if (user?.profile?.address) {
      initialData.location = user.profile.address;
    }
    if (user?.profile?.latitude && user?.profile?.longitude) {
      initialData.geolocation = {
        latitude: user.profile.latitude,
        longitude: user.profile.longitude
      };
    }
    setFormData(initialData);
    setSelectedImages([]);
    setFormErrors({});
  };

  const handleSave = async () => {
    if (saving) return;
    
    // Validate required fields
    const errors = {};
    if (!formData.make?.trim()) errors.make = 'Make is required';
    if (!formData.model?.trim()) errors.model = 'Model is required';
    if (!formData.year) errors.year = 'Year is required';
    if (!formData.pricePerDay) errors.pricePerDay = 'Price per day is required';
    if (!formData.seats) errors.seats = 'Number of seats is required';
    if (!formData.luggageCapacity) errors.luggageCapacity = 'Luggage capacity is required';
    if (!formData.exteriorColor?.trim()) errors.exteriorColor = 'Exterior color is required';
    if (!formData.interiorColor?.trim()) errors.interiorColor = 'Interior color is required';
    if (!formData.location?.trim()) errors.location = 'Location is required';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      const formDataToSend = new FormData();
      
      // Add car data
      Object.keys(formData).forEach(key => {
        if (key === 'features') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (key === 'geolocation') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (key !== 'imageUrls') {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Add new images
      selectedImages.forEach((image, index) => {
        formDataToSend.append('images', image);
      });
      
      let response;
      if (editDialog.item) {
        // Update existing car
        response = await axiosInstance.put(`/api/admin/cars/${editDialog.item._id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Vehicle updated successfully');
      } else {
        // Create new car
        response = await axiosInstance.post('/api/admin/cars', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Vehicle created successfully');
      }
      
      // Refresh the cars list
      await fetchCars();
      
      // Close dialog
      setEditDialog({ open: false, item: null, type: null });
      setFormData({});
      setSelectedImages([]);
      setFormErrors({});
      
    } catch (error) {
      console.error('Error saving car:', error);
      toast.error(error.response?.data?.message || 'Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  };

  // Filter and paginate data
  const filteredCars = useMemo(() => {
    return cars.filter(car => {
      const matchesSearch = `${car.make} ${car.model} ${car.year} ${car.licensePlate || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      switch (vehicleTab) {
        case 1: matchesStatus = car.availability === 'available'; break;
        case 2: matchesStatus = car.availability === 'rented'; break;
        case 3: matchesStatus = car.availability === 'maintenance'; break;
        default: matchesStatus = true;
      }

      return matchesSearch && matchesStatus;
    });
  }, [cars, searchTerm, vehicleTab]);

  const paginatedCars = useMemo(() => {
    return filteredCars.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredCars, page, rowsPerPage]);

  // Statistics
  const stats = useMemo(() => {
    const availableCars = cars.filter(c => c.availability === 'available').length;
    const rentedCars = cars.filter(c => c.availability === 'rented').length;
    const maintenanceCars = cars.filter(c => c.availability === 'maintenance').length;
    
    return {
      totalCars: cars.length,
      availableCars,
      rentedCars,
      maintenanceCars,
      vehicleUtilization: cars.length > 0 ? Math.round((rentedCars / cars.length) * 100) : 0,
      lowAvailability: availableCars < 5,
      avgPricePerDay: cars.length > 0 ? 
        Math.round(cars.reduce((sum, c) => sum + (c.pricePerDay || 0), 0) / cars.length) : 0,
    };
  }, [cars]);

  // Handlers
  const handleMenuClick = (event, car) => {
    setAnchorEl(event.currentTarget);
    setSelectedCar(car);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCar(null);
  };

  const handleViewDetails = () => {
    if (selectedCar) {
      window.location.href = `/cars/${selectedCar._id}`;
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    setEditDialog({ open: true, item: selectedCar, type: 'car' });
    setFormData({ 
      ...selectedCar, 
      features: selectedCar.features || [],
      imageUrls: selectedCar.imageUrls || []
    });
    setSelectedImages([]);
    setFormErrors({});
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialog({ open: true, car: selectedCar });
    handleMenuClose();
  };



  const validateForm = () => {
    const errors = {};
    
    if (!formData.make?.trim()) errors.make = 'Make is required';
    if (!formData.model?.trim()) errors.model = 'Model is required';
    
    if (!formData.year) {
      errors.year = 'Year is required';
    } else if (formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
      errors.year = `Year must be between 1900 and ${new Date().getFullYear() + 1}`;
    }
    
    if (!formData.pricePerDay) {
      errors.pricePerDay = 'Price per day is required';
    } else if (formData.pricePerDay <= 0) {
      errors.pricePerDay = 'Price must be greater than 0';
    }
    
    const locationValue = formData.location || formData.geolocation?.address;
    if (!locationValue?.trim()) errors.location = 'Location is required';
    
    if (!formData.fuelType?.trim()) errors.fuelType = 'Fuel type is required';
    if (!formData.transmission?.trim()) errors.transmission = 'Transmission type is required';
    if (!formData.bodyType?.trim()) errors.bodyType = 'Body type is required';
    
    if (!formData.seats) {
      errors.seats = 'Number of seats is required';
    } else if (formData.seats < 1 || formData.seats > 20) {
      errors.seats = 'Seats must be between 1 and 20';
    }
    
    if (formData.luggageCapacity === undefined || formData.luggageCapacity === null || formData.luggageCapacity === '') {
      errors.luggageCapacity = 'Luggage capacity is required';
    } else if (formData.luggageCapacity < 0 || formData.luggageCapacity > 20) {
      errors.luggageCapacity = 'Luggage capacity must be between 0 and 20';
    }
    
    if (!formData.exteriorColor?.trim()) errors.exteriorColor = 'Exterior color is required';
    if (!formData.interiorColor?.trim()) errors.interiorColor = 'Interior color is required';
    
    if (!editDialog.car) {
      const totalImages = (formData.imageUrls?.length || 0) + selectedImages.length;
      if (totalImages === 0) errors.images = 'At least one image is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };



  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/api/admin/cars/${deleteDialog.car._id}`);
      toast.success('Vehicle deleted successfully');
      setDeleteDialog({ open: false, car: null });
      fetchCars();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    }
  };

  const getAvailabilityStatus = (car) => {
    // Check if car is in maintenance first
    if (car.maintenanceStatus === 'in_progress' || car.availability === 'maintenance') {
      return { 
        text: 'In Maintenance', 
        color: 'error', 
        icon: <BuildOutlined fontSize="small" /> 
      };
    } else if (car.maintenanceStatus === 'scheduled') {
      return { 
        text: 'Maintenance Scheduled', 
        color: 'warning', 
        icon: <BuildOutlined fontSize="small" /> 
      };
    } else if (car.availability === 'available') {
      return { 
        text: 'Available Now', 
        color: 'success', 
        icon: <DirectionsCarOutlined fontSize="small" /> 
      };
    } else if (car.availability === 'rented') {
      return { 
        text: 'Currently Rented', 
        color: 'warning', 
        icon: <DirectionsCarOutlined fontSize="small" /> 
      };
    } else if (car.availableFrom) {
      return { 
        text: `Available ${new Date(car.availableFrom).toLocaleDateString()}`, 
        color: 'warning',
        icon: <CalendarTodayOutlined fontSize="small" />
      };
    }
    return { 
      text: 'Unavailable', 
      color: 'error', 
      icon: <DirectionsCarOutlined fontSize="small" /> 
    };
  };

  // Keep legacy functions for backward compatibility
  const getAvailabilityColor = (availability) => {
    switch (availability) {
      case 'available': return 'success';
      case 'rented': return 'warning';
      case 'maintenance': return 'error';
      default: return 'default';
    }
  };

  const getAvailabilityIcon = (availability) => {
    switch (availability) {
      case 'available': return <AvailableIcon />;
      case 'rented': return <RentedIcon />;
      case 'maintenance': return <MaintenanceIcon />;
      default: return <CarIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" color="error" textAlign="center">
          Access Denied - Admin Only
        </Typography>
      </Container>
    );
  }

  return (
    <Box>
      {/* Add Vehicle Button - positioned at top right */}
      

      

      {/* Search and Filters */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search vehicles... (Make, Model, Year, License Plate)"
              value={searchInput}
              onChange={(e) => {
                const newValue = e.target.value;
                setSearchInput(newValue);
                if (newValue === '') setSearchTerm('');
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                endAdornment: searchInput && (
                  <IconButton size="small" onClick={() => { setSearchInput(''); setSearchTerm(''); }}>
                    <ClearIcon />
                  </IconButton>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Status Tabs */}
      <Paper sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={vehicleTab}
          onChange={(e, v) => setVehicleTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': { 
              textTransform: 'none', 
              fontWeight: 500,
              minHeight: 56,
            },
          }}
        >
          <Tab label={`All (${stats.totalCars})`} />
          <Tab label={`Available (${stats.availableCars})`} />
          <Tab label={`Rented (${stats.rentedCars})`} />
          <Tab label={`In Maintenance (${stats.maintenanceCars})`} />
        </Tabs>
      </Paper>

      {/* Vehicles Table/Cards */}
      {paginatedCars.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'background.default' }}>
            <CarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2 }}>
              {!cars.length ? 'No vehicles in fleet' : 
               searchTerm ? 'No search results' : 
               `No ${['', 'available', 'rented', 'under maintenance'][vehicleTab]} vehicles`}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {!cars.length ? 'Add vehicles to your fleet to start managing them.' :
               searchTerm ? 'Try adjusting your search criteria.' :
               'There are no vehicles with this status.'}
            </Typography>
            {searchTerm && cars.length > 0 && (
              <Button
                variant="contained"
                onClick={() => { setSearchInput(''); setSearchTerm(''); setVehicleTab(0); }}
                startIcon={<RefreshIcon />}
              >
                Clear All Filters
              </Button>
            )}
          </Paper>
      ) : isMobile || isTablet ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {paginatedCars.map((car) => (
              <Card key={car._id} sx={{ p: 0, '&:hover': { boxShadow: theme.shadows[4] } }}
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
                          {car.make} {car.model}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {car.year} • {car.trim || 'Standard'}
                          {car.licensePlate && ` • ${car.licensePlate}`}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton 
                      onClick={(e) => handleMenuClick(e, car)} 
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  {/* Status Chip */}
                  <Box sx={{ mb: 2.5 }}>
                    {(() => {
                      const status = getAvailabilityStatus(car);
                      return (
                        <Chip
                          label={status.text}
                          color={status.color}
                          size="small"
                          icon={status.icon}
                        />
                      );
                    })()}
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  {/* Main Information Grid */}
                  <Grid container spacing={2.5}>
                    {/* Price */}
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Price per Day
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ mt: 0.5 }}>
                        ₱{car.pricePerDay?.toLocaleString()}
                      </Typography>
                    </Grid>

                    {/* Year */}
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Year
                      </Typography>
                      <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                        {car.year}
                      </Typography>
                    </Grid>

                    {/* Location */}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Location
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" fontWeight={500}>
                          {car.location}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Specifications */}
                    {(car.fuelType || car.transmission || car.seats) && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                          Specifications
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {car.fuelType && (
                            <Chip
                              icon={<FuelIcon sx={{ fontSize: 14 }} />}
                              label={car.fuelType}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {car.transmission && (
                            <Chip
                              icon={<TransmissionIcon sx={{ fontSize: 14 }} />}
                              label={car.transmission}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {car.seats && (
                            <Chip
                              icon={<SeatsIcon sx={{ fontSize: 14 }} />}
                              label={`${car.seats} seats`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Grid>
                    )}
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
                  <TableCell>Year</TableCell>
                  <TableCell>Price/Day</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCars.map((car) => (
                  <TableRow key={car._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          <CarIcon sx={{ color: 'primary.main' }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {car.make} {car.model}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {car.trim || 'Standard'} {car.licensePlate ? `• ${car.licensePlate}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{car.year}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary.main">
                        ₱{car.pricePerDay?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = getAvailabilityStatus(car);
                        return (
                          <Chip
                            label={status.text}
                            color={status.color}
                            size="small"
                            icon={status.icon}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Tooltip 
                          title={car.location || ''} 
                          arrow 
                          placement="top"
                          enterTouchDelay={0}
                          leaveTouchDelay={3000}
                          disableHoverListener={false}
                          disableTouchListener={false}
                        >
                          <Typography 
                            variant="body2" 
                            noWrap 
                            sx={{ 
                              maxWidth: 200, 
                              cursor: 'help',
                              '&:active': {
                                color: 'primary.main'
                              }
                            }}
                          >
                            {car.location}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={(e) => handleMenuClick(e, car)} size="small">
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
        count={filteredCars.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Vehicles per page:"
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
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleViewDetails}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

       {/* Edit Dialog */}
           <Dialog 
             open={editDialog.open} 
             onClose={() => setEditDialog({ open: false, item: null, type: null })} 
             maxWidth="md" 
             fullWidth
             fullScreen={window.innerWidth < 600}
             scroll="paper"
             PaperProps={{
               sx: {
                 maxHeight: { xs: '100vh', sm: '85vh', md: '90vh' },
                 height: { xs: '100vh', sm: 'auto', md: 'auto' },
                 m: { xs: 0, sm: 3, md: 2 },
                 width: { xs: '100%', sm: '90%', md: '100%' },
                 maxWidth: { xs: '100%', sm: '700px', md: '900px' },
                 position: 'relative',
                 transform: 'translateZ(0)',
                 backfaceVisibility: 'hidden',
               }
             }}
           >
             <DialogTitle sx={{ 
               fontSize: { xs: '1.125rem', sm: '1.25rem' },
               py: { xs: 1.5, sm: 2 },
               px: { xs: 2, sm: 3 }
             }}>
               {editDialog.item ? 'Edit' : 'Add'} {editDialog.type === 'car' ? 'Vehicle' : 'User'}
             </DialogTitle>
             <Divider />
             <DialogContent 
               sx={{ 
                 mt: 2,
                 px: { xs: 2, sm: 3 },
                 overflowY: 'auto',
                 overflowX: 'hidden',
                 '&::-webkit-scrollbar': {
                   width: '8px',
                 },
                 '&::-webkit-scrollbar-track': {
                   backgroundColor: 'rgba(0,0,0,0.05)',
                 },
                 '&::-webkit-scrollbar-thumb': {
                   backgroundColor: 'rgba(0,0,0,0.2)',
                   borderRadius: '4px',
                 }
               }}
             >
               <Grid container spacing={2} sx={{ 
                 pt: 2,
                 pb: 1,
                 willChange: 'transform',
                 contain: 'layout style paint'
                }}>
                  {/* Car form fields */}
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         variant="outlined"
                         label="Make"
                         required
                         value={formData.make || ''}
                         onChange={(e) => {
                           setFormData({...formData, make: e.target.value});
                           if (formErrors.make) {
                             setFormErrors({...formErrors, make: null});
                           }
                         }}
                         error={Boolean(formErrors.make)}
                         helperText={formErrors.make}
                         sx={{ mt: 1 }}
                       />
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         variant="outlined"
                         label="Model"
                         required
                         value={formData.model || ''}
                         onChange={(e) => {
                           setFormData({...formData, model: e.target.value});
                           if (formErrors.model) {
                             setFormErrors({...formErrors, model: null});
                           }
                         }}
                         error={Boolean(formErrors.model)}
                         helperText={formErrors.model}
                         sx={{ mt: 1 }}
                       />
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         variant="outlined"
                         label="Year"
                         type="number"
                         required
                         value={formData.year || ''}
                         onChange={(e) => {
                           setFormData({...formData, year: parseInt(e.target.value)});
                           if (formErrors.year) {
                             setFormErrors({...formErrors, year: null});
                           }
                         }}
                         error={Boolean(formErrors.year)}
                         helperText={formErrors.year}
                         sx={{ mt: 1 }}
                       />
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         variant="outlined"
                         label="Price Per Day"
                         type="number"
                         required
                         value={formData.pricePerDay || ''}
                         onChange={(e) => {
                           setFormData({...formData, pricePerDay: parseFloat(e.target.value)});
                           if (formErrors.pricePerDay) {
                             setFormErrors({...formErrors, pricePerDay: null});
                           }
                         }}
                         error={Boolean(formErrors.pricePerDay)}
                         helperText={formErrors.pricePerDay}
                       />
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <FormControl fullWidth>
                         <InputLabel>Availability</InputLabel>
                         <Select
                           value={formData.availability || 'available'}
                           label="Availability"
                           variant="outlined"
                           onChange={(e) => setFormData({...formData, availability: e.target.value})}
                         >
                           <MenuItem value="available">Available</MenuItem>
                           <MenuItem value="rented">Rented</MenuItem>
                           <MenuItem value="maintenance">Maintenance</MenuItem>
                         </Select>
                       </FormControl>
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         variant="outlined"
                         label="Trim"
                         value={formData.trim || ''}
                         onChange={(e) => setFormData({...formData, trim: e.target.value})}
                       />
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <FormControl fullWidth required error={Boolean(formErrors.fuelType)}>
                         <InputLabel>Fuel Type *</InputLabel>
                         <Select
                           value={formData.fuelType || 'Gas'}
                           label="Fuel Type *"
                           variant="outlined"
                           onChange={(e) => {
                             setFormData({...formData, fuelType: e.target.value});
                             if (formErrors.fuelType) {
                               setFormErrors({...formErrors, fuelType: null});
                             }
                           }}
                         >
                           <MenuItem value="Gas">Gas</MenuItem>
                           <MenuItem value="Electric">Electric</MenuItem>
                           <MenuItem value="Hybrid">Hybrid</MenuItem>
                         </Select>
                         {formErrors.fuelType && (
                           <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                             {formErrors.fuelType}
                           </Typography>
                         )}
                       </FormControl>
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <FormControl fullWidth required error={Boolean(formErrors.transmission)}>
                         <InputLabel>Transmission *</InputLabel>
                         <Select
                           value={formData.transmission || 'Automatic'}
                           label="Transmission *"
                           variant="outlined"
                           onChange={(e) => {
                             setFormData({...formData, transmission: e.target.value});
                             if (formErrors.transmission) {
                               setFormErrors({...formErrors, transmission: null});
                             }
                           }}
                         >
                           <MenuItem value="Automatic">Automatic</MenuItem>
                           <MenuItem value="Manual">Manual</MenuItem>
                         </Select>
                         {formErrors.transmission && (
                           <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                             {formErrors.transmission}
                           </Typography>
                         )}
                       </FormControl>
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         variant="outlined"
                         label="Seats"
                         type="number"
                         required
                         value={formData.seats || ''}
                         onChange={(e) => {
                           setFormData({...formData, seats: parseInt(e.target.value)});
                           if (formErrors.seats) {
                             setFormErrors({...formErrors, seats: null});
                           }
                         }}
                         error={Boolean(formErrors.seats)}
                         helperText={formErrors.seats}
                       />
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         variant="outlined"
                         label="Luggage Capacity"
                         type="number"
                         required
                         value={formData.luggageCapacity || ''}
                         onChange={(e) => {
                           setFormData({...formData, luggageCapacity: parseInt(e.target.value)});
                           if (formErrors.luggageCapacity) {
                             setFormErrors({...formErrors, luggageCapacity: null});
                           }
                         }}
                         error={Boolean(formErrors.luggageCapacity)}
                         helperText={formErrors.luggageCapacity}
                       />
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         select
                         fullWidth
                         variant="outlined"
                         label="Body Type"
                         required
                         value={formData.bodyType || 'Sedan'}
                         onChange={(e) => {
                           setFormData({...formData, bodyType: e.target.value});
                           if (formErrors.bodyType) {
                             setFormErrors({...formErrors, bodyType: null});
                           }
                         }}
                         error={Boolean(formErrors.bodyType)}
                         helperText={formErrors.bodyType}
                       >
                         <MenuItem value="Sedan">Sedan</MenuItem>
                         <MenuItem value="SUV">SUV</MenuItem>
                         <MenuItem value="Hatchback">Hatchback</MenuItem>
                         <MenuItem value="Coupe">Coupe</MenuItem>
                         <MenuItem value="Convertible">Convertible</MenuItem>
                         <MenuItem value="Minivan">Minivan</MenuItem>
                         <MenuItem value="Pickup">Pickup</MenuItem>
                         <MenuItem value="Wagon">Wagon</MenuItem>
                         <MenuItem value="Crossover">Crossover</MenuItem>
                       </TextField>
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         variant="outlined"
                         label="Exterior Color"
                         required
                         value={formData.exteriorColor || ''}
                         onChange={(e) => {
                           setFormData({...formData, exteriorColor: e.target.value});
                           if (formErrors.exteriorColor) {
                             setFormErrors({...formErrors, exteriorColor: null});
                           }
                         }}
                         error={Boolean(formErrors.exteriorColor)}
                         helperText={formErrors.exteriorColor}
                       />
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         variant="outlined"
                         label="Interior Color"
                         required
                         value={formData.interiorColor || ''}
                         onChange={(e) => {
                           setFormData({...formData, interiorColor: e.target.value});
                           if (formErrors.interiorColor) {
                             setFormErrors({...formErrors, interiorColor: null});
                           }
                         }}
                         error={Boolean(formErrors.interiorColor)}
                         helperText={formErrors.interiorColor}
                       />
                     </Grid>
                     <Grid item xs={12} sx={{ flexBasis: '100% !important', width: '100% !important', display: 'block !important' }}>
                       <Box sx={{ width: '100%', clear: 'both', display: 'block' }}>
                         <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                           Features
                         </Typography>
                         <Box sx={{ width: (formData.features && formData.features.length > 0) ? '150px' : '60px', transition: 'width 0.2s' }}>
                           <FormControl fullWidth>
                         <Select
                           multiple
                           variant="outlined"
                           value={formData.features || []}
                           onChange={(e) => setFormData({...formData, features: e.target.value})}
                           sx={{
                             minHeight: 40,
                             '& .MuiSelect-select': {
                               minHeight: '40px !important',
                               maxHeight: 120,
                               overflow: 'auto',
                               display: 'flex',
                               alignItems: 'center',
                               justifyContent: 'center',
                               paddingTop: 0.5,
                               paddingBottom: 0.5,
                             },
                           }}
                           MenuProps={{
                             disableAutoFocusItem: true,
                             PaperProps: {
                               style: {
                                 maxHeight: 300,
                                 width: 350,
                               },
                             },
                             anchorOrigin: {
                               vertical: 'bottom',
                               horizontal: 'left',
                             },
                             transformOrigin: {
                               vertical: 'top',
                               horizontal: 'left',
                             },
                           }}
                           renderValue={(selected) => (
                             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               {selected.length > 0 ? `${selected.length} selected` : 'Select features'}
                             </Box>
                           )}
                         >
                           <MenuItem value="GPS">GPS Navigation</MenuItem>
                           <MenuItem value="AC">Air Conditioning</MenuItem>
                           <MenuItem value="Bluetooth">Bluetooth</MenuItem>
                           <MenuItem value="USB">USB Ports</MenuItem>
                           <MenuItem value="WiFi">WiFi Hotspot</MenuItem>
                           <MenuItem value="Backup Camera">Backup Camera</MenuItem>
                           <MenuItem value="Sunroof">Sunroof</MenuItem>
                           <MenuItem value="Leather Seats">Leather Seats</MenuItem>
                           <MenuItem value="Heated Seats">Heated Seats</MenuItem>
                           <MenuItem value="Cruise Control">Cruise Control</MenuItem>
                           <MenuItem value="Keyless Entry">Keyless Entry</MenuItem>
                           <MenuItem value="Push Start">Push Start</MenuItem>
                           <MenuItem value="Apple CarPlay">Apple CarPlay</MenuItem>
                           <MenuItem value="Android Auto">Android Auto</MenuItem>
                           <MenuItem value="Premium Sound">Premium Sound</MenuItem>
                           <MenuItem value="Parking Sensors">Parking Sensors</MenuItem>
                         </Select>
                       </FormControl>
                         </Box>
                       </Box>
                     </Grid>
                     <Grid item xs={12} sx={{ flexBasis: '100%', width: '100%', maxWidth: '100% !important' }}>
                       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                         <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                           Car Location *
                         </Typography>
                         {user?.profile?.address && user?.profile?.latitude && user?.profile?.longitude && (
                           <Button
                             size="small"
                             variant="outlined"
                             startIcon={<MyLocationOutlined />}
                             onClick={() => {
                               setFormData({
                                 ...formData,
                                 location: user.profile.address,
                                 geolocation: {
                                   latitude: user.profile.latitude,
                                   longitude: user.profile.longitude,
                                   address: user.profile.address
                                 }
                               });
                               if (formErrors.location) {
                                 setFormErrors({...formErrors, location: null});
                               }
                               toast.success('Location set to your profile location');
                             }}
                             sx={{ textTransform: 'none' }}
                           >
                             Use My Location
                           </Button>
                         )}
                       </Box>
                       {user?.profile?.address && (
                         <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                           Your profile location: {user.profile.address}
                         </Typography>
                       )}
                       <Box sx={{ width: '100%', maxWidth: '100%', '& > *': { width: '100%', maxWidth: '100%' } }}>
                         <LocationPicker
                           latitude={formData.geolocation?.latitude}
                           longitude={formData.geolocation?.longitude}
                           address={formData.geolocation?.address || formData.location}
                           onLocationChange={(lat, lng, address) => {
                             // LocationPicker passes lat, lng, address as separate parameters
                             setFormData({
                               ...formData,
                               location: address || '',
                               geolocation: {
                                 latitude: lat,
                                 longitude: lng,
                                 address: address || ''
                               }
                             });
                             if (formErrors.location) {
                               setFormErrors({...formErrors, location: null});
                             }
                           }}
                           height="350px"
                         />
                         {formErrors.location && (
                           <Alert severity="error" sx={{ mt: 1 }}>
                             {formErrors.location}
                           </Alert>
                         )}
                       </Box>
                     </Grid>
                     <Grid item xs={12} sx={{ flexBasis: '100%', width: '100%' }}>
                       <Box sx={{ mb: 2, width: '100%' }}>
                         <Typography variant="subtitle2" sx={{ mb: 1 }}>
                           Vehicle Images (Max 4)
                         </Typography>
                         <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                           {editDialog.item ? 
                             'Current images are shown below. You can remove existing images or add new ones.' :
                             'Upload up to 4 high-quality images of the vehicle. The first image will be the primary display image.'
                           }
                         </Typography>
                         
                         {formErrors.images && (
                           <Alert severity="error" sx={{ mb: 2 }}>
                             {formErrors.images}
                           </Alert>
                         )}
                         
                         {/* Show existing images if editing */}
                         {editDialog.item && formData.imageUrls && formData.imageUrls.length > 0 && (
                           <Box sx={{ mb: 3 }}>
                             <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                               Current Images
                             </Typography>
                             <Box sx={{ 
                           display: 'grid', 
                           gridTemplateColumns: '1fr 1fr',
                           gap: 2, 
                           width: '100%',
                         }}>
                               {formData.imageUrls.map((imageUrl, index) => {
                                 // Convert backslashes to forward slashes and ensure leading slash
                                 const normalizedPath = imageUrl.replace(/\\/g, '/');
                                 const pathWithSlash = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
                                 
                                 const fullImageUrl = imageUrl.startsWith('http') 
                                   ? imageUrl 
                                   : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${pathWithSlash}`;
                                 
                                 console.log('Image URL:', imageUrl, '→ Full URL:', fullImageUrl);
                                 
                                 return (
                                     <Paper
                                       key={index}
                                       elevation={1}
                                       sx={{
                                         p: 1,
                                         border: '1px solid',
                                         borderColor: 'divider',
                                         bgcolor: 'background.paper',
                                         height: 218, // Fixed height matching upload slots
                                         width: '100%',
                                         boxSizing: 'border-box',
                                       }}
                                     >
                                       <Box
                                         sx={{
                                           width: '100%',
                                           height: 200,
                                           display: 'flex',
                                           alignItems: 'center',
                                           justifyContent: 'center',
                                           bgcolor: 'grey.50',
                                           borderRadius: 1,
                                           overflow: 'hidden',
                                           position: 'relative',
                                         }}
                                       >
                                         <img
                                           src={fullImageUrl}
                                           alt={`Current car image ${index + 1}`}
                                           style={{
                                             width: '100%',
                                             height: '100%',
                                             objectFit: 'contain',
                                           }}
                                           onError={(e) => {
                                             e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                                           }}
                                         />
                                         <IconButton
                                           size="small"
                                           sx={{
                                             position: 'absolute',
                                             top: 4,
                                             right: 4,
                                             bgcolor: 'rgba(255,0,0,0.8)',
                                             color: 'white',
                                             '&:hover': {
                                               bgcolor: 'rgba(255,0,0,0.9)',
                                             },
                                           }}
                                           onClick={() => {
                                             const updatedUrls = formData.imageUrls.filter((_, i) => i !== index);
                                             setFormData({ ...formData, imageUrls: updatedUrls });
                                           }}
                                         >
                                           <DeleteOutlined fontSize="small" />
                                         </IconButton>
                                         {index === 0 && (
                                           <Chip
                                             label="Primary"
                                             size="small"
                                             color="primary"
                                             sx={{
                                               position: 'absolute',
                                               bottom: 4,
                                               left: 4,
                                             }}
                                           />
                                         )}
                                       </Box>
                                     </Paper>
                                 );
                               })}
                             </Box>
                           </Box>
                         )}
                         
                         {/* New Image Upload Slots */}
                         <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                           {editDialog.item ? 'Add New Images' : 'Upload Images'}
                         </Typography>
                         <Box sx={{ 
                           display: 'grid', 
                           gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                           gap: { xs: 1.5, sm: 2 }, 
                           width: '100%',
                         }}>
                           {[0, 1, 2, 3].map((slotIndex) => {
                             const hasImage = Boolean(selectedImages[slotIndex]);
                             const imageUrl = hasImage ? URL.createObjectURL(selectedImages[slotIndex]) : null;
                             // Calculate total images (existing + new)
                             const totalImages = (formData.imageUrls?.length || 0) + selectedImages.length;
                             const isDisabled = totalImages >= 4 && !hasImage;
                             
     
                             return (
                                 <Paper
                                   key={slotIndex}
                                   elevation={hasImage ? 1 : 0}
                                   sx={{
                                     p: 1,
                                     border: hasImage ? '1px solid' : '2px dashed',
                                     borderColor: hasImage ? 'divider' : 'grey.300',
                                     bgcolor: hasImage ? 'background.paper' : 'transparent',
                                     height: 218, // Fixed height
                                     width: '100%',
                                     boxSizing: 'border-box',
                                   }}
                                 >
                                   <Box
                                     sx={{
                                       width: '100%',
                                       minWidth: 0,
                                       flexShrink: 0,
                                       height: 200,
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       bgcolor: 'grey.50',
                                       borderRadius: 1,
                                       overflow: 'hidden',
                                       position: 'relative',
                                       cursor: 'pointer',
                                       transition: 'all 0.3s',
                                       '&:hover': {
                                         bgcolor: hasImage ? 'grey.100' : 'action.hover',
                                       },
                                     }}
                                   >
                                     {hasImage ? (
                                       <>
                                         <img
                                           src={imageUrl}
                                           alt={`Car image ${slotIndex + 1}`}
                                           style={{
                                             width: '100%',
                                             height: '100%',
                                             objectFit: 'contain',
                                           }}
                                           onLoad={() => URL.revokeObjectURL(imageUrl)}
                                         />
                                         <IconButton
                                           size="small"
                                           sx={{
                                             position: 'absolute',
                                             top: 4,
                                             right: 4,
                                             bgcolor: 'rgba(0,0,0,0.7)',
                                             color: 'white',
                                             '&:hover': {
                                               bgcolor: 'rgba(0,0,0,0.9)',
                                             },
                                           }}
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             const newImages = selectedImages.filter((_, i) => i !== slotIndex);
                                             setSelectedImages(newImages);
                                           }}
                                         >
                                           <Close fontSize="small" />
                                         </IconButton>
                                         {slotIndex === 0 && (
                                           <Chip
                                             label="Primary"
                                             size="small"
                                             color="primary"
                                             sx={{
                                               position: 'absolute',
                                               bottom: 4,
                                               left: 4,
                                             }}
                                           />
                                         )}
                                       </>
                                     ) : (
                                       <div
                                         style={{
                                           display: 'flex',
                                           flexDirection: 'column',
                                           alignItems: 'center',
                                           justifyContent: 'center',
                                           width: '100%',
                                           height: '100%',
                                           cursor: isDisabled ? 'not-allowed' : 'pointer',
                                           opacity: isDisabled ? 0.5 : 1,
                                         }}
                                         onClick={!isDisabled ? () => {
                                           const input = document.createElement('input');
                                           input.type = 'file';
                                           input.accept = 'image/*';
                                           input.multiple = true;
                                           input.onchange = (e) => {
                                             const files = Array.from(e.target.files);
                                             const currentTotal = (formData.imageUrls?.length || 0) + selectedImages.length;
                                             const remainingSlots = 4 - currentTotal;
                                             const filesToAdd = files.slice(0, remainingSlots);
                                             if (filesToAdd.length > 0) {
                                               setSelectedImages([...selectedImages, ...filesToAdd]);
                                               if (formErrors.images) {
                                                 setFormErrors({...formErrors, images: null});
                                               }
                                             }
                                           };
                                           input.click();
                                         } : undefined}
                                       >
                                         <CloudUploadOutlined sx={{ fontSize: 32, color: 'text.secondary' }} />
                                         <Typography variant="caption" color="text.secondary">
                                           {isDisabled ? 'Max 4 images' : 'Click to upload'}
                                         </Typography>
                                         {slotIndex === 0 && selectedImages.length === 0 && !formData.imageUrls?.length && (
                                           <Typography variant="caption" color="primary" sx={{ mt: 0.5 }}>
                                             Primary Image
                                           </Typography>
                                         )}
                                       </div>
                                   )}
                                   </Box>
                                 </Paper>
                             );
                           })}
                         </Box>
                         
                         {selectedImages.length === 4 && (
                           <Alert severity="info" sx={{ mt: 2 }}>
                             Maximum of 4 images reached. Remove an image to upload a different one.
                           </Alert>
                         )}
                         
                         {selectedImages.length > 0 && (
                           <Button 
                             variant="outlined" 
                             color="error" 
                             size="small"
                             onClick={() => setSelectedImages([])}
                             sx={{ mt: 2 }}
                           >
                             Clear All Images
                           </Button>
                         )}
                         
                         {selectedImages.length > 0 && selectedImages.length < 4 && (
                           <Alert severity="warning" sx={{ mt: 2 }}>
                             {4 - selectedImages.length} more image{4 - selectedImages.length !== 1 ? 's' : ''} can be added.
                           </Alert>
                         )}
     
                       </Box>
                     </Grid>
               </Grid>
             </DialogContent>
             <DialogActions>
               <Button 
                 onClick={() => setEditDialog({ open: false, item: null, type: null })}
                 disabled={saving}
               >
                 Cancel
               </Button>
               <Button 
                 onClick={handleSave} 
                 variant="contained"
                 disabled={saving}
                 startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
               >
                 {saving ? 'Saving...' : (editDialog.item ? 'Update' : 'Create')}
               </Button>
             </DialogActions>
           </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, car: null })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {deleteDialog.car?.make} {deleteDialog.car?.model}? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, car: null })}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default FleetManager;