import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Avatar,
  Divider,
  Card,
  CardContent,
  Chip,
  useTheme,
  alpha,
  IconButton,
  CircularProgress,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  PersonOutlined,
  EmailOutlined,
  PhoneOutlined,
  SaveOutlined,
  EditOutlined,
  AdminPanelSettingsOutlined,
  VerifiedOutlined,
  CameraAltOutlined,
  DeleteOutlined,
  VerifiedUserOutlined,
  CheckCircleOutlined,
  DirectionsCarOutlined,
  EventNoteOutlined,
  AssessmentOutlined,
  WarningAmberOutlined,
  ScheduleOutlined,
  LocationOnOutlined,
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import ModernTextField from '../../components/forms/ModernTextField';
import ModernButton from '../../components/forms/ModernButton';
import { useToast } from '../../components/feedback/ToastProvider';
import axiosInstance from '../../utils/axiosConfig';
import { getImageUrl } from '../../utils/imageHelper';
import LocationPicker from '../../components/map/LocationPicker';

const ModernProfile = () => {
  const { user, updateProfile, updateProfilePicture } = useAuth();
  const theme = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: user?.profile?.phone || '',
    address: typeof user?.profile?.address === 'string' ? user?.profile?.address : '',
    latitude: user?.profile?.latitude || null,
    longitude: user?.profile?.longitude || null
  });
  const [fieldErrors, setFieldErrors] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePicture, setProfilePicture] = useState(user?.profile?.profilePicture || null);
  const [statistics, setStatistics] = useState({
    totalBookings: 0,
    completedRentals: 0,
    activeRentals: 0,
    averageRating: 5.0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const { firstName, lastName, phone, address, latitude, longitude } = formData;

  // Update profilePicture when user context changes
  useEffect(() => {
    setProfilePicture(user?.profile?.profilePicture || null);
  }, [user?.profile?.profilePicture]);


  // Fetch user statistics
  useEffect(() => {
    const fetchUserStatistics = async () => {
      if (!user?.id) return;
      
      try {
        setStatsLoading(true);
        
        const [bookingsResponse, rentalsResponse] = await Promise.all([
          axiosInstance.get(`/api/bookings/user/${user.id}`),
          axiosInstance.get(`/api/rentals/user`)
        ]);
        
        if (bookingsResponse.status === 200 && rentalsResponse.status === 200) {
          const bookingsData = bookingsResponse.data;
          const rentalsData = rentalsResponse.data;
          
          // Extract actual data arrays
          const bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData.data || [];
          const rentals = Array.isArray(rentalsData) ? rentalsData : rentalsData.data || [];
          
          // Calculate statistics
          const totalBookings = bookings.length;
          const completedRentals = rentals.filter(r => r.rentalStatus === 'completed').length;
          const activeRentals = rentals.filter(r => r.rentalStatus === 'active').length;
          
          // Calculate average rating from completed rentals with reviews
          const reviewedRentals = rentals.filter(r => r.review && r.review.rating);
          const averageRating = reviewedRentals.length > 0 
            ? (reviewedRentals.reduce((sum, r) => sum + r.review.rating, 0) / reviewedRentals.length).toFixed(1)
            : 5.0;
          
          const finalStats = {
            totalBookings,
            completedRentals,
            activeRentals,
            averageRating
          };
          
          setStatistics(finalStats);
        } else {
          // Handle API errors
          if (bookingsResponse.status !== 200) {
            toast.error('Failed to load booking history');
          }
          if (rentalsResponse.status !== 200) {
            toast.error('Failed to load rental history');
          }
        }
      } catch (error) {
        console.error('Error fetching user statistics:', error);
        toast.error('Failed to load account statistics');
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchUserStatistics();
  }, [user?.id]); // Only depend on user ID to prevent infinite renders

  const validateField = (name, value) => {
    let error = '';
    
    switch(name) {
      case 'firstName':
        if (!value.trim()) {
          error = 'First name is required';
        } else if (value.trim().length < 2) {
          error = 'First name must be at least 2 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(value)) {
          error = 'First name can only contain letters';
        }
        break;
        
      case 'lastName':
        if (!value.trim()) {
          error = 'Last name is required';
        } else if (value.trim().length < 2) {
          error = 'Last name must be at least 2 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(value)) {
          error = 'Last name can only contain letters';
        }
        break;
        
      case 'phone':
        if (value && !/^(\+63|0)?[9]\d{9}$/.test(value.replace(/[\s\-]/g, ''))) {
          error = 'Please enter a valid Philippine mobile number';
        }
        break;
        
      default:
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: ''
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Validate field on blur
    const error = validateField(name, value);
    if (error) {
      setFieldErrors({
        ...fieldErrors,
        [name]: error
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const errors = {
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      phone: validateField('phone', formData.phone)
    };
    
    // Check if there are any errors
    const hasErrors = Object.values(errors).some(error => error !== '');
    
    if (hasErrors) {
      setFieldErrors(errors);
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setLoading(true);

    try {
      // Upload profile picture if one was selected
      if (formData.profilePictureFile) {
        const photoFormData = new FormData();
        photoFormData.append('profilePicture', formData.profilePictureFile);
        
        const photoResponse = await axiosInstance.post('/api/users/upload-profile-picture', photoFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (photoResponse.status === 200) {
          const data = photoResponse.data;
          // Update user context if updateProfilePicture exists
          if (updateProfilePicture) {
            updateProfilePicture(data.profilePicture);
          }
        }
      }
      
      // Update profile info
      const result = await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude
      });
      
      if (result.success) {
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        setFieldErrors({ firstName: '', lastName: '', phone: '' });
        // Clear the file from formData
        setFormData({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude
        });
      } else {
        toast.error(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
    
    setLoading(false);
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.profile?.firstName || '',
      lastName: user?.profile?.lastName || '',
      phone: user?.profile?.phone || '',
      address: typeof user?.profile?.address === 'string' ? user?.profile?.address : '',
      latitude: user?.profile?.latitude || null,
      longitude: user?.profile?.longitude || null
    });
    setProfilePicture(user?.profile?.profilePicture || null);
    setIsEditing(false);
    setFieldErrors({ firstName: '', lastName: '', phone: '' });
  };

  const getInitials = () => {
    const first = firstName || user?.name?.split(' ')[0] || '';
    const last = lastName || user?.name?.split(' ')[1] || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U';
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Create preview URL for local display
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Store file for later upload when Save Changes is clicked
    setFormData({
      ...formData,
      profilePictureFile: file
    });
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const response = await axiosInstance.delete('/api/users/remove-profile-picture');

      if (response.status === 200) {
        setProfilePicture(null);
        // Update user context if updateProfilePicture exists
        if (updateProfilePicture) {
          updateProfilePicture(null);
        }
        toast.success('Profile picture removed successfully!');
      } else {
        toast.error(response.data?.message || 'Failed to remove profile picture');
      }
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove profile picture');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Container 
      maxWidth={false} 
      sx={{ 
        py: { xs: 2, sm: 3, md: 4 }, 
        px: { xs: 2, sm: 3, md: 4 },
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <PersonOutlined sx={{ fontSize: { xs: 32, sm: 40 }, color: 'primary.main' }} />
          My Profile
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: 'text.secondary',
            lineHeight: 1.6,
          }}
        >
          Manage your account information and preferences
        </Typography>
      </Box>

      {/* Combined Profile Card */}
      <Paper
        sx={{
          mb: 4,
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: theme.shadows[8],
          },
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, 
              ${theme.palette.primary.main} 0%, 
              ${theme.palette.primary.dark} 100%)`,
            p: { xs: 2, sm: 3, md: 4 },
            color: 'white',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 20px,
                ${alpha(theme.palette.common.white, 0.05)} 20px,
                ${alpha(theme.palette.common.white, 0.05)} 21px
              )`,
            },
          }}
        >
          <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
            {/* Profile Picture Section */}
            <Grid item xs={4} sm={3} md={2}>
              <Box 
                sx={{ 
                  position: 'relative', 
                  display: 'flex',
                  justifyContent: { xs: 'flex-start', sm: 'flex-start' },
                  zIndex: 1,
                }}
              >
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    isEditing ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            color: 'white',
                            '&:hover': {
                              bgcolor: theme.palette.primary.dark,
                            },
                            width: 32,
                            height: 32,
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? (
                            <CircularProgress size={16} sx={{ color: 'white' }} />
                          ) : (
                            <CameraAltOutlined sx={{ fontSize: 16 }} />
                          )}
                        </IconButton>
                        {profilePicture && (
                          <IconButton
                            size="small"
                            sx={{
                              bgcolor: theme.palette.error.main,
                              color: 'white',
                              '&:hover': {
                                bgcolor: theme.palette.error.dark,
                              },
                              width: 32,
                              height: 32,
                            }}
                            onClick={handleRemovePhoto}
                            disabled={uploadingPhoto}
                          >
                            <DeleteOutlined sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Box>
                    ) : null
                  }
                >
                  <Avatar
                    src={
                      profilePicture?.startsWith('data:') 
                        ? profilePicture // Use data URL directly for preview
                        : getImageUrl(profilePicture || user?.profile?.profilePicture)
                    }
                    sx={{
                      width: { xs: 70, sm: 110, md: 120 },
                      height: { xs: 70, sm: 110, md: 120 },
                      bgcolor: profilePicture ? 'transparent' : theme.palette.primary.main,
                      border: { xs: `2px solid ${alpha(theme.palette.primary.light, 0.3)}`, md: `4px solid ${alpha(theme.palette.primary.light, 0.3)}` },
                      fontSize: { xs: '1.25rem', md: '2rem' },
                      fontWeight: 700,
                      color: 'white',
                      boxShadow: theme.shadows[8],
                    }}
                  >
                    {!profilePicture && getInitials()}
                  </Avatar>
                </Badge>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
              </Box>
            </Grid>

            {/* Profile Info Section */}
            <Grid item xs={8} sm={9} md={10} sx={{ zIndex: 1 }}>
              <Box sx={{ textAlign: { xs: 'left', sm: 'left' } }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    mb: 1,
                    color: 'white',
                    fontSize: { xs: '1.1rem', sm: '1.75rem', md: '2.125rem' },
                    lineHeight: { xs: 1.2, sm: 1.3 },
                  }}
                >
                  {firstName && lastName ? `${firstName} ${lastName}` : user?.name || 'User'}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                  <EmailOutlined sx={{ fontSize: { xs: 16, md: 18 } }} />
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      wordBreak: 'break-word',
                    }}
                  >
                    {user?.email}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  <Chip
                    icon={user?.role === 'admin' ? <AdminPanelSettingsOutlined /> : <PersonOutlined />}
                    label={user?.role === 'admin' ? 'Administrator' : 'Customer'}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 500,
                      '& .MuiChip-icon': {
                        color: 'white',
                      },
                    }}
                  />

                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Personal Information Form Section */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: 'background.paper' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: { xs: 2, md: 3 },
                flexDirection: 'row',
                gap: { xs: 1, sm: 0 },
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                  lineHeight: { xs: 1.3, sm: 1.4 },
                  whiteSpace: { xs: 'nowrap', sm: 'normal' },
                  overflow: { xs: 'hidden', sm: 'visible' },
                  textOverflow: { xs: 'ellipsis', sm: 'clip' },
                }}
              >
                Personal Information
              </Typography>

              {!isEditing && (
                <ModernButton
                  variant="outlined"
                  startIcon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    py: { xs: 0.5, sm: 1 },
                    px: { xs: 1.5, sm: 3 },
                    minWidth: { xs: 'auto', sm: '120px' },
                    whiteSpace: 'nowrap',
                    '& .MuiButton-startIcon': {
                      marginRight: { xs: '4px', sm: '8px' },
                      '& svg': {
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                      },
                    },
                  }}
                >
                  Edit Profile
                </ModernButton>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
                {/* Email (Read-only) */}
                <Grid item xs={12}>
                  <ModernTextField
                    label="Email Address"
                    value={user?.email || ''}
                    disabled
                    startIcon={<EmailOutlined />}
                    description="Your email address cannot be changed"
                  />
                </Grid>

                {/* First Name */}
                <Grid item xs={12} sm={6}>
                  <ModernTextField
                    label="First Name *"
                    name="firstName"
                    value={firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    error={!!fieldErrors.firstName}
                    helperText={fieldErrors.firstName}
                    startIcon={<PersonOutlined />}
                    placeholder="Enter your first name"
                  />
                </Grid>

                {/* Last Name */}
                <Grid item xs={12} sm={6}>
                  <ModernTextField
                    label="Last Name *"
                    name="lastName"
                    value={lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    error={!!fieldErrors.lastName}
                    helperText={fieldErrors.lastName}
                    startIcon={<PersonOutlined />}
                    placeholder="Enter your last name"
                  />
                </Grid>

                {/* Phone */}
                <Grid item xs={12}>
                  <ModernTextField
                    label="Phone Number"
                    name="phone"
                    value={phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!isEditing}
                    error={!!fieldErrors.phone}
                    helperText={fieldErrors.phone}
                    startIcon={<PhoneOutlined />}
                    placeholder="09123456789"
                  />
                </Grid>

                {/* Location Address Field - Only when NOT editing */}
                {!isEditing && (
                  <Grid item xs={12}>
                    <Tooltip 
                      title={address || 'No address set'} 
                      arrow 
                      placement="top"
                      enterDelay={300}
                      leaveDelay={200}
                      enterTouchDelay={0}
                      leaveTouchDelay={3000}
                    >
                      <Box>
                        <ModernTextField
                          label="Location Address"
                          name="address"
                          value={address}
                          onChange={handleChange}
                          disabled={true}
                          startIcon={<LocationOnOutlined />}
                          placeholder="Enter your address"
                          description={address && address.length > 50 ? "Tap to view full address" : undefined}
                          sx={{
                            '& .MuiInputBase-input': {
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              cursor: 'help',
                            }
                          }}
                        />
                      </Box>
                    </Tooltip>
                  </Grid>
                )}
              </Grid>

              {/* Location Picker - Outside Grid for full width */}
              {isEditing && (
                <Box sx={{ 
                  mt: { xs: 2, md: 3 },
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  overflowX: 'hidden',
                }}>
                  <Typography variant="subtitle2" sx={{ mb: { xs: 1.5, sm: 2 }, fontWeight: 600, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
                    Pick Location on Map
                  </Typography>
                  <Box sx={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overflow: 'visible', // Changed from 'hidden' to prevent label cutoff
                  }}>
                    <LocationPicker
                      latitude={latitude}
                      longitude={longitude}
                      address={address}
                      onLocationChange={(lat, lng, addr) => {
                        setFormData(prev => ({
                          ...prev,
                          latitude: lat,
                          longitude: lng,
                          address: addr
                        }));
                      }}
                      height="500px"
                    />
                  </Box>
                </Box>
              )}

              {/* Action Buttons - Outside Grid */}
              {isEditing && (
                <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, justifyContent: 'center', mt: { xs: 2, md: 3 }, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <ModernButton
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </ModernButton>
                  
                  <ModernButton
                    type="submit"
                    variant="contained"
                    loading={loading}
                    loadingText="Saving..."
                    startIcon={<SaveOutlined />}
                  >
                    Save Changes
                  </ModernButton>
                </Box>
              )}
            </Box>
        </Box>
      </Paper>



      {/* Account Information for Admin */}
      {user?.role === 'admin' ? (
        <Paper sx={{ 
          p: { xs: 2, sm: 3, md: 4 },
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: { xs: 2, md: 3 },
              color: 'text.primary',
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.5rem' },
            }}
          >
            Administrator Account
          </Typography>

          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {/* Account Details */}
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                p: { xs: 2, sm: 2.5, md: 3 }, 
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 2,
                border: 1,
                borderColor: alpha(theme.palette.primary.main, 0.1)
              }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                  Account Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Account Type
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      System Administrator
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Access Level
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Full System Access
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Account Created
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Last Login
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Today'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Admin Permissions */}
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                p: { xs: 2, sm: 2.5, md: 3 }, 
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 2,
                border: 1,
                borderColor: alpha(theme.palette.primary.main, 0.1)
              }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                  Administrative Permissions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography variant="body2">
                      Manage all bookings and rentals
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography variant="body2">
                      Manage fleet and maintenance
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography variant="body2">
                      Verify and manage payments
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography variant="body2">
                      Manage users and permissions
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography variant="body2">
                      Access analytics and reports
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography variant="body2">
                      Configure payment settings
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlined sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography variant="body2">
                      Send system notifications
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>


          </Grid>

          {/* Navigation Hint */}
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            borderRadius: 2,
            textAlign: 'center'
          }}>
            <Typography variant="body2" color="text.secondary">
              Use the sidebar menu or visit the{' '}
              <Box 
                component="span" 
                sx={{ 
                  color: 'primary.main', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </Box>
              {' '}for quick access to all administrative functions
            </Typography>
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ 
          p: { xs: 2, sm: 3, md: 4 },
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: { xs: 2, md: 3 },
              color: 'primary.main',
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.5rem' },
            }}
          >
            Account Statistics
          </Typography>

          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  textAlign: 'center',
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: 1,
                  borderColor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: 'success.main',
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
                  }}
                >
                  {statsLoading ? '...' : statistics.totalBookings}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Total Bookings
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  textAlign: 'center',
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: 1,
                  borderColor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: 'success.main',
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
                  }}
                >
                  {statsLoading ? '...' : statistics.completedRentals}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Completed Rentals
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  textAlign: 'center',
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: alpha(theme.palette.warning.main, 0.05),
                  border: 1,
                  borderColor: alpha(theme.palette.warning.main, 0.1),
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: 'warning.main',
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
                  }}
                >
                  {statsLoading ? '...' : statistics.activeRentals}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Active Rentals
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  textAlign: 'center',
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: alpha(theme.palette.info.main, 0.05),
                  border: 1,
                  borderColor: alpha(theme.palette.info.main, 0.1),
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: 'info.main',
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
                  }}
                >
                  {statsLoading ? '...' : `★ ${statistics.averageRating}`}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Rating
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default ModernProfile;