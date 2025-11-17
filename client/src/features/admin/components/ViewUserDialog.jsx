import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Grid,
  Avatar,
  Divider,
  IconButton,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CloseOutlined,
  ContactMailOutlined,
  EmailOutlined,
  PhoneOutlined,
  LocationOnOutlined,
  LoginOutlined,
  BookOutlined,
  CarRentalOutlined,
  HistoryOutlined,
  AccountCircleOutlined,
  CheckCircleOutlined,
  CancelOutlined,
  CalendarTodayOutlined,
} from '@mui/icons-material';
import { getImageUrl } from '../../../utils/imageHelper';

const ViewUserDialog = ({ open, onClose, user }) => {
  const theme = useTheme();

  if (!user) return null;

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'error';
      case 'customer': return 'primary';
      default: return 'default';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl"
      fullScreen={theme.breakpoints.down('sm')}
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2, md: 2 },
          boxShadow: theme.shadows[8],
          width: { xs: '100%', sm: '80%', md: 'auto' },
          height: { xs: '100%', sm: 'auto' },
          maxWidth: { xs: '100%', sm: '80%', md: '750px' },
          minWidth: { xs: '100%', sm: '70%', md: '600px' },
          m: { xs: 0, sm: 2, md: 4 }
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: alpha(theme.palette.primary.main, 0.02),
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            User Details
          </Typography>
          <IconButton 
            onClick={onClose} 
            sx={{ 
              color: theme.palette.grey[600],
              '&:hover': { 
                bgcolor: alpha(theme.palette.grey[500], 0.1) 
              }
            }}
          >
            <CloseOutlined />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent
        dividers
        sx={{
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.3)',
            }
          }
        }}
      >
        <Grid container spacing={2} sx={{ mt: 1, width: '100%' }}>
          {/* User Avatar and Basic Info */}
          <Grid item xs={12} sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
              <Avatar
                src={getImageUrl(user.profile?.profilePicture)}
                sx={{ 
                  width: 80, 
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                }}
              >
                {!user.profile?.profilePicture && (
                  (() => {
                    const firstName = user.profile?.firstName || '';
                    const lastName = user.profile?.lastName || '';
                    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
                    return initials || user.email?.charAt(0)?.toUpperCase() || 'U';
                  })()
                )}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={600}>
                  {user.profile?.firstName} {user.profile?.lastName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    label={user.role === 'admin' ? 'Admin' : 'Customer'}
                    size="small"
                    color={getRoleColor(user.role)}
                    sx={{ fontWeight: 500 }}
                  />
                  <Chip
                    label={user.deactivated ? 'Inactive' : 'Active'}
                    size="small"
                    color={user.deactivated ? 'error' : 'success'}
                    icon={user.deactivated ? <CancelOutlined /> : <CheckCircleOutlined />}
                    sx={{ fontWeight: 500 }}
                  />
                </Box>
              </Box>
            </Box>
            <Divider sx={{ mt: 2 }} />
          </Grid>

          {/* Contact Information */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ContactMailOutlined sx={{ color: theme.palette.primary.main }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  Contact Information
                </Typography>
              </Box>
              <Box sx={{ pl: 2 }}>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <EmailOutlined sx={{ fontSize: 18, color: 'text.secondary', mt: 0.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        maxWidth: '100%'
                      }}
                      title={user.email}
                    >
                      {user.email}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <PhoneOutlined sx={{ fontSize: 18, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Phone</Typography>
                    <Typography variant="body1">{user.profile?.phone || 'Not provided'}</Typography>
                  </Box>
                </Box>
                {user.profile?.address && (
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <LocationOnOutlined sx={{ fontSize: 18, color: 'text.secondary', mt: 0.5 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">Location</Typography>
                      <Typography variant="body1" sx={{ wordWrap: 'break-word' }}>
                        {user.profile.address}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Account Information */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccountCircleOutlined sx={{ color: theme.palette.primary.main }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  Account Information
                </Typography>
              </Box>
              <Box sx={{ pl: 2 }}>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <CalendarTodayOutlined sx={{ fontSize: 18, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Member Since</Typography>
                    <Typography variant="body1">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <LoginOutlined sx={{ fontSize: 18, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Last Login</Typography>
                    <Typography variant="body1">
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Never'
                      }
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Activity Summary */}
          {user.role !== 'admin' && (
            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <HistoryOutlined sx={{ color: theme.palette.primary.main }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  Activity Information
                </Typography>
              </Box>
              <Box sx={{ pl: 2 }}>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <BookOutlined sx={{ fontSize: 18, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total Bookings</Typography>
                    <Typography variant="body1">{user.bookingCount || 0}</Typography>
                  </Box>
                </Box>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <CarRentalOutlined sx={{ fontSize: 18, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total Rentals</Typography>
                    <Typography variant="body1">{user.rentalCount || 0}</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default ViewUserDialog;
