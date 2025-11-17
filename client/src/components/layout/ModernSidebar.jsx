import React, { useContext } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  DirectionsCarOutlined,
  BookOnlineOutlined,
  HistoryOutlined,
  DashboardOutlined,
  PeopleOutlined,
  AssessmentOutlined,
  AdminPanelSettingsOutlined,
  VerifiedUserOutlined,
  FavoriteOutlined,
  PaymentOutlined,
  CurrencyExchangeOutlined,
  SettingsOutlined,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

const DRAWER_WIDTH = 280;

const ModernSidebar = ({ mobileOpen, onMobileClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const customerMenuItems = [
    {
      text: 'Browse Cars',
      icon: <DirectionsCarOutlined />,
      path: '/cars',
    },
    {
      text: 'Saved Cars',
      icon: <FavoriteOutlined />,
      path: '/favorites',
    },
    {
      text: 'My Bookings',
      icon: <BookOnlineOutlined />,
      path: '/bookings',
    },
    {
      text: 'My Rentals',
      icon: <HistoryOutlined />,
      path: '/rentals',
    },
  ];

  const adminMenuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardOutlined />,
      path: '/admin/dashboard',
    },
    {
      text: 'Bookings & Rentals',
      icon: <BookOnlineOutlined />,
      path: '/admin/bookings',
    },
    {
      text: 'Fleet & Maintenance',
      icon: <DirectionsCarOutlined />,
      path: '/admin/fleet',
    },
    {
      text: 'Users Management',
      icon: <PeopleOutlined />,
      path: '/admin/users',
    },
    {
      text: 'Payment Management',
      icon: <PaymentOutlined />,
      path: '/admin/payments',
    },
    {
      text: 'Refund Management',
      icon: <CurrencyExchangeOutlined />,
      path: '/admin/refunds',
    },
    {
      text: 'Reports',
      icon: <AssessmentOutlined />,
      path: '/admin/reports',
    },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : customerMenuItems;

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const drawerContent = (
    <>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          component="img"
          src="/logo.png"
          alt="Car Rental"
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            objectFit: 'cover',
          }}
        />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Drive Rentals
          </Typography>
        </Box>
      </Box>



      {/* Navigation Menu */}
      <Box sx={{ flex: 1, py: 2 }}>
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => {
            // Special handling for multi-page sections
            let isActive;
            if (item.path === '/admin/users') {
              // Users & Verification pages
              isActive = location.pathname === '/admin/users' || location.pathname === '/admin/verifications';
            } else if (item.path === '/admin/bookings') {
              // Admin Bookings & Rentals pages
              isActive = location.pathname.startsWith('/admin/bookings') || location.pathname.startsWith('/admin/rentals');
            } else if (item.path === '/bookings') {
              // Customer booking pages (including booking details)
              isActive = location.pathname.startsWith('/bookings');
            } else if (item.path === '/rentals') {
              // Customer rental pages (including rental details)
              isActive = location.pathname.startsWith('/rentals');
            } else {
              // Exact match for other pages
              isActive = location.pathname === item.path;
            }
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    bgcolor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'white' : 'text.primary',
                    '&:hover': {
                      bgcolor: isActive ? 'primary.dark' : 'action.hover',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'white' : 'text.secondary',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.875rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 3,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
            textAlign: 'center',
          }}
        >
          © 2025 CarRental System
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
            textAlign: 'center',
            mt: 0.5,
          }}
        >
          Version 1.0.0
        </Typography>
      </Box>
    </>
  );

  return (
    <Box component="nav">
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default ModernSidebar;
