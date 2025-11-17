import React, { useContext, useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  useTheme,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  NotificationsOutlined,
  AccountCircleOutlined,
  LogoutOutlined,
  PersonOutlined,
  NotificationsActiveOutlined,
  MenuOutlined,
  DoneAll,
  SettingsOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { getImageUrl } from '../../utils/imageHelper';
import { useNotifications } from '../../features/notifications/NotificationContext';
import { useToast } from '../feedback/ToastProvider';

const ModernNavbar = ({ onMenuClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, loading: notificationsLoading, markAllAsSeen } = useNotifications();
  const toast = useToast();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  // Use unreadCount from context which is properly fetched from API
  const recentNotifications = notifications?.slice(0, 5) || [];

  // Get user initials for avatar fallback - matching profile page logic
  const getUserInitials = () => {
    const firstName = user?.profile?.firstName || '';
    const lastName = user?.profile?.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (user?.name) {
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
      }
      return user.name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
    toast.success('You have been logged out successfully!');
    navigate('/');
  };

  const handleProfile = () => {
    navigate('/profile');
    handleProfileMenuClose();
  };

  const handleNotifications = () => {
    navigate('/notifications');
    handleNotificationMenuClose();
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
    setHasNewNotifications(false);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null);
  };

  const handleMarkAllAsRead = async (event) => {
    event.stopPropagation();
    try {
      const userId = user._id || user.id;
      if (!userId) {
        console.log('No user ID found');
        return;
      }
      if (unreadCount === 0) {
        console.log('No unread notifications');
        return;
      }
      console.log('Marking all as read for user:', userId);
      await markAllAsSeen(userId);
      console.log('Successfully marked all as read');
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Effect to detect new notifications
  useEffect(() => {
    if (unreadCount > 0) {
      setHasNewNotifications(true);
    }
  }, [unreadCount]);

  // Format notification time
  const formatNotificationTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now - notificationDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString();
  };

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        bgcolor: 'secondary.main',
        color: 'secondary.contrastText',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, minHeight: { xs: 56, sm: 64 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ 
              display: { xs: 'block', md: 'none' },
              color: 'secondary.contrastText',
            }}
          >
            <MenuOutlined />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'secondary.contrastText',
              fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Welcome back, {user?.profile?.firstName || user?.name || 'User'}
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {user?.profile?.firstName || user?.name || 'User'}
            </Box>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
          {/* Notifications */}
          <Tooltip title={`${unreadCount} unread notifications`}>
            <IconButton
              onClick={handleNotificationMenuOpen}
              sx={{
                color: 'secondary.contrastText',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                position: 'relative',
              }}
            >
              <Badge 
                badgeContent={unreadCount > 0 ? unreadCount : null} 
                color="error"
                max={99}
                invisible={!unreadCount || unreadCount === 0}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.7rem',
                    height: '16px',
                    minWidth: '16px',
                    padding: '0 3px',
                    top: 0,
                    right: 0,
                    transform: 'translate(50%, -50%)',
                    animation: hasNewNotifications ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { transform: 'translate(50%, -50%) scale(1)' },
                      '50%': { transform: 'translate(50%, -50%) scale(1.1)' },
                      '100%': { transform: 'translate(50%, -50%) scale(1)' },
                    },
                  },
                }}
              >
                {notificationsLoading ? (
                  <CircularProgress size={20} sx={{ color: 'inherit' }} />
                ) : hasNewNotifications ? (
                  <NotificationsActiveOutlined />
                ) : (
                  <NotificationsOutlined />
                )}
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notification Dropdown Menu */}
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={handleNotificationMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: { xs: 280, sm: 350 },
                maxWidth: { xs: 'calc(100vw - 32px)', sm: 400 },
                width: { xs: 'calc(100vw - 32px)', sm: 'auto' },
                borderRadius: { xs: 1.5, sm: 2 },
                boxShadow: theme.shadows[8],
                maxHeight: { xs: 'calc(100vh - 100px)', sm: 450 },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ 
              p: { xs: 1.5, sm: 2 }, 
              borderBottom: 1, 
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2
            }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Notifications
                </Typography>
                {unreadCount > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {unreadCount} unread
                  </Typography>
                )}
              </Box>
              {unreadCount > 0 && (
                <Typography
                  variant="body2"
                  onClick={handleMarkAllAsRead}
                  sx={{
                    color: 'primary.main',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Mark all as read
                </Typography>
              )}
            </Box>
            
            {recentNotifications.length > 0 ? (
              <>
                <List sx={{ 
                  py: 0,
                  maxHeight: { xs: 'calc(100vh - 250px)', sm: 300 },
                  overflowY: 'auto'
                }}>
                  {recentNotifications.map((notification) => (
                    <ListItem
                      key={notification._id}
                      sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: notification.seen ? 'transparent' : 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' },
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        handleNotifications();
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: notification.seen ? 400 : 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {notification.subject || 
                             (notification.message.length > 100 
                               ? notification.message.substring(0, 100) + '...' 
                               : notification.message)}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {formatNotificationTime(notification.createdAt)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-around', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'primary.main',
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    onClick={handleNotifications}
                  >
                    View all notifications
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: 'text.secondary',
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { 
                        textDecoration: 'underline', 
                        color: 'primary.main',
                        '& .MuiSvgIcon-root': {
                          color: 'primary.main',
                        }
                      },
                    }}
                    onClick={() => {
                      handleNotificationMenuClose();
                      navigate('/notification-settings');
                    }}
                  >
                    <SettingsOutlined sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                      Settings
                    </Typography>
                  </Box>
                </Box>
              </>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No notifications
                </Typography>
              </Box>
            )}
          </Menu>

          {/* Profile Menu */}
          <Tooltip title="Account">
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{
                color: 'secondary.contrastText',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              <Avatar
                src={getImageUrl(user?.profile?.profilePicture)}
                sx={{
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  bgcolor: user?.profile?.profilePicture ? 'transparent' : (theme) => theme.palette.primary.main + 'E6', // 0.9 opacity
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 700,
                  color: 'white',
                  boxShadow: theme.shadows[2],
                  border: (theme) => `2px solid ${theme.palette.primary.main}33`, // 0.2 opacity
                }}
              >
                {!user?.profile?.profilePicture && getUserInitials()}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 250,
                borderRadius: 2,
                boxShadow: theme.shadows[8],
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            {/* User Info Header */}
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                src={getImageUrl(user?.profile?.profilePicture)}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: user?.profile?.profilePicture ? 'transparent' : (theme) => theme.palette.primary.main + 'E6',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'white',
                  boxShadow: theme.shadows[2],
                  border: (theme) => `2px solid ${theme.palette.primary.main}33`,
                }}
              >
                {getUserInitials()}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {user?.profile?.firstName && user?.profile?.lastName
                    ? `${user.profile.firstName} ${user.profile.lastName}`
                    : user?.name || 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            </Box>
            <Divider />
            <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
              <PersonOutlined sx={{ mr: 2, color: 'text.secondary' }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
              <LogoutOutlined sx={{ mr: 2, color: 'text.secondary' }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ModernNavbar;
