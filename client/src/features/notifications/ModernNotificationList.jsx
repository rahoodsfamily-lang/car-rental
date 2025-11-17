import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Chip,
  Button,
  Divider,
  Menu,
  MenuItem,
  useTheme,
  alpha,
} from '@mui/material';
import {
  NotificationsOutlined,
  BookOnlineOutlined,
  DirectionsCarOutlined,
  WarningOutlined,
  InfoOutlined,
  CheckCircleOutlined,
  ErrorOutlined,
  MoreVertOutlined,
  MarkEmailReadOutlined,
  DeleteOutlined,
  FilterListOutlined,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNotifications } from './NotificationContext';
import { useAuth } from '../auth/AuthContext';
import { PageLoader } from '../../components/feedback/LoadingSpinner';
import { NoNotifications } from '../../components/feedback/EmptyState';
import { useToast } from '../../components/feedback/ToastProvider';

const ModernNotificationList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, markAsSeen, deleteNotification, loading, fetchNotifications, markAllAsSeen } = useNotifications();
  const [filter, setFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());
  const theme = useTheme();
  const toast = useToast();

  // No need to fetch here - NotificationContext already auto-fetches and polls every 5 seconds
  // This prevents duplicate fetches and flickering

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking':
      case 'booking_confirmation':
        return <BookOnlineOutlined />;
      case 'rental':
        return <DirectionsCarOutlined />;
      case 'warning':
        return <WarningOutlined />;
      case 'success':
        return <CheckCircleOutlined />;
      case 'error':
        return <ErrorOutlined />;
      default:
        return <InfoOutlined />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'booking':
      case 'booking_confirmation':
        return 'primary';
      case 'rental':
        return 'secondary';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const filteredNotifications = notifications?.filter(notification => {
    // Role-based filtering
    if (user?.role === 'admin') {
      // Admins should only see admin-targeted notifications
      if (!notification.isAdminCopy) {
        return false;
      }
    } else {
      // Customers should only see customer-targeted notifications
      if (notification.isAdminCopy) return false;
    }
    
    // Apply read/unread filter
    if (filter === 'unread') return !notification.seen;
    if (filter === 'read') return notification.seen;
    return true;
  }) || [];

  // Helper function to get role-filtered notifications (without read/unread filter)
  const getRoleFilteredNotifications = () => {
    return notifications?.filter(notification => {
      // Role-based filtering
      if (user?.role === 'admin') {
        if (!notification.isAdminCopy) return false;
      } else {
        if (notification.isAdminCopy) return false;
      }
      
      return true;
    }) || [];
  };

  const roleFilteredNotifications = getRoleFilteredNotifications();
  const unreadCount = roleFilteredNotifications.filter(n => !n.seen).length;
  const readCount = roleFilteredNotifications.filter(n => n.seen).length;
  const totalCount = roleFilteredNotifications.length;

  const handleMenuOpen = (event, notification) => {
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notification);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNotification(null);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsSeen(notificationId);
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
    handleMenuClose();
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
    handleMenuClose();
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userId = user._id || user.id;
      if (!userId) return;
      await markAllAsSeen(userId);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const toggleExpanded = (notificationId) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  if (loading) {
    return <PageLoader message="Loading notifications..." />;
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 0, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3 }, px: { xs: 2, sm: 0 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <NotificationsOutlined sx={{ fontSize: { xs: 28, sm: 36 }, color: 'primary.main' }} />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
              }}
            >
              Notifications
            </Typography>
          </Box>
          {unreadCount > 0 && (
            <Chip
              label={unreadCount}
              color="error"
              size="small"
              sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
            />
          )}
        </Box>
        
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            display: { xs: 'none', sm: 'block' },
            mb: 2,
          }}
        >
          Stay updated with your bookings, rentals, and important alerts
        </Typography>

        {/* Filter Tabs - Mobile Optimized */}
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 0.5, sm: 1 },
            mb: { xs: 1.5, sm: 2 },
            borderRadius: { xs: 0, sm: 1 },
            bgcolor: { xs: 'transparent', sm: 'background.paper' },
            p: { xs: 0, sm: 0.5 },
          }}
        >
          <Button
            variant={filter === 'all' ? 'contained' : 'text'}
            size="small"
            onClick={() => setFilter('all')}
            sx={{
              flex: 1,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              py: { xs: 1.25, sm: 0.75 },
              px: { xs: 1, sm: 1.5 },
              fontWeight: filter === 'all' ? 700 : 500,
              minWidth: 0,
            }}
          >
            All ({totalCount})
          </Button>
          <Button
            variant={filter === 'unread' ? 'contained' : 'text'}
            size="small"
            onClick={() => setFilter('unread')}
            color="error"
            sx={{
              flex: 1,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              py: { xs: 1.25, sm: 0.75 },
              px: { xs: 1, sm: 1.5 },
              fontWeight: filter === 'unread' ? 700 : 500,
              minWidth: 0,
            }}
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === 'read' ? 'contained' : 'text'}
            size="small"
            onClick={() => setFilter('read')}
            color="success"
            sx={{
              flex: 1,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              py: { xs: 1.25, sm: 0.75 },
              px: { xs: 1, sm: 1.5 },
              fontWeight: filter === 'read' ? 700 : 500,
              minWidth: 0,
            }}
          >
            Read ({readCount})
          </Button>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 1 }, 
          mb: { xs: 1.5, sm: 0 },
          width: { xs: '100%', sm: 'auto' }
        }}>
          {unreadCount > 0 && (
            <Button
              variant="outlined"
              startIcon={<MarkEmailReadOutlined sx={{ fontSize: { xs: 18, sm: 18 } }} />}
              onClick={handleMarkAllAsRead}
              size="small"
              sx={{ 
                fontSize: { xs: '0.8125rem', sm: '0.8125rem' }, 
                py: { xs: 1.25, sm: 0.75 },
                px: { xs: 2, sm: 1.5 },
                width: { xs: '100%', sm: 'auto' },
                minWidth: { sm: 140 }
              }}
            >
              Mark All Read
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<SettingsIcon sx={{ fontSize: { xs: 18, sm: 18 } }} />}
            onClick={() => navigate('/notification-settings')}
            size="small"
            sx={{ 
              fontSize: { xs: '0.8125rem', sm: '0.8125rem' }, 
              py: { xs: 1.25, sm: 0.75 },
              px: { xs: 2, sm: 1.5 },
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: 100 }
            }}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <EmptyNotificationState />
      ) : (
        <Paper sx={{ mb: { xs: 2, sm: 3 }, p: { xs: 1.5, sm: 2 }, borderRadius: { xs: 0, sm: 2 }, mx: { xs: 0, sm: 0 } }}>
          <List sx={{ p: 0 }}>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification._id}>
                <ListItem
                  onClick={() => toggleExpanded(notification._id)}
                  sx={{
                    py: 2,
                    px: 3,
                    bgcolor: notification.seen 
                      ? 'transparent' 
                      : alpha(theme.palette.primary.main, 0.05),
                    borderLeft: notification.seen 
                      ? 'none' 
                      : `4px solid ${theme.palette.primary.main}`,
                    cursor: 'pointer',
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 56 }, alignSelf: 'flex-start', mt: 0.5 }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette[getNotificationColor(notification.type)].main, 0.1),
                        color: `${getNotificationColor(notification.type)}.main`,
                        width: { xs: 36, sm: 40 },
                        height: { xs: 36, sm: 40 },
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: notification.seen ? 400 : 600,
                          color: 'text.primary',
                          mb: 0.5,
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          // Mobile/Tablet: Truncate unless expanded. Desktop: Always show full formatted text
                          display: { xs: '-webkit-box', md: 'block' },
                          WebkitLineClamp: expandedNotifications.has(notification._id) 
                            ? 'unset' 
                            : { xs: 2, md: 'unset' },
                          WebkitBoxOrient: { xs: 'vertical', md: 'unset' },
                          overflow: expandedNotifications.has(notification._id) 
                            ? 'visible' 
                            : { xs: 'hidden', md: 'visible' },
                          textOverflow: expandedNotifications.has(notification._id) 
                            ? 'clip' 
                            : { xs: 'ellipsis', md: 'clip' },
                          whiteSpace: { xs: expandedNotifications.has(notification._id) ? 'pre-wrap' : 'normal', md: 'pre-wrap' },
                          // Prevent long text (emails, URLs) from overflowing
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {notification.message}
                      </Typography>
                    }
                    secondary={
                      <Box component="div">
                        <Typography
                          variant="body2"
                          component="span"
                          sx={{
                            color: 'text.secondary',
                            display: 'block',
                            mb: 1,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        >
                          {new Date(notification.createdAt).toLocaleString()}
                        </Typography>
                        
                        <Box sx={{ mb: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 0 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 2, sm: 0 } }}>
                          <Chip
                            label={notification.type}
                            size="small"
                            color={getNotificationColor(notification.type)}
                            variant="outlined"
                            sx={{ textTransform: 'capitalize', fontSize: { xs: '0.7rem', sm: '0.75rem' }, height: { xs: 20, sm: 24 } }}
                          />
                          
                          {!notification.seen && (
                            <Chip
                              label="New"
                              size="small"
                              color="error"
                              sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, height: { xs: 20, sm: 24 } }}
                            />
                          )}
                        </Box>
                      </Box>
                    }
                    disableTypography
                  />

                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMenuOpen(e, notification)}
                      size="small"
                      sx={{ mr: { xs: 0, sm: 1 } }}
                    >
                      <MoreVertOutlined />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {index < filteredNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 180, borderRadius: 2 }
        }}
      >
        {selectedNotification && !selectedNotification.seen && (
          <MenuItem onClick={() => handleMarkAsRead(selectedNotification._id)}>
            <MarkEmailReadOutlined sx={{ mr: 2 }} />
            Mark as Read
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={() => handleDelete(selectedNotification?._id)}
          sx={{ color: 'error.main' }}
        >
          <DeleteOutlined sx={{ mr: 2 }} />
          Delete
        </MenuItem>
      </Menu>
    </Container>
  );
};

// Empty state component for no notifications
const EmptyNotificationState = () => (
  <Paper
    sx={{
      p: 6,
      textAlign: 'center',
      bgcolor: alpha('#f5f5f5', 0.5),
    }}
  >
    <NotificationsOutlined
      sx={{
        fontSize: 64,
        color: 'text.secondary',
        mb: 2,
      }}
    />
    <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
      No notifications
    </Typography>
    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
      You're all caught up! New notifications will appear here.
    </Typography>
  </Paper>
);

export default React.memo(ModernNotificationList);
