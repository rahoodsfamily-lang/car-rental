import React, { useState } from 'react';
import { Box, Container, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import ModernNavbar from './ModernNavbar';
import ModernSidebar from './ModernSidebar';

const AppLayout = ({ children }) => {
  const theme = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const hideSidebar = ['/', '/login', '/register', '/verify-email', '/resend-verification'].includes(location.pathname) || 
                      location.pathname.startsWith('/reset-password');
  
  // For landing page, login, register, and verification pages, render children directly without any wrapper
  const isFullScreenPage = ['/', '/login', '/register', '/verify-email', '/resend-verification'].includes(location.pathname) || 
                           location.pathname.startsWith('/reset-password');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  if (isFullScreenPage) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {!hideSidebar && (
        <ModernSidebar 
          mobileOpen={mobileOpen}
          onMobileClose={handleDrawerToggle}
        />
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          minWidth: 0,
        }}
      >
        {!hideSidebar && (
          <ModernNavbar onMenuClick={handleDrawerToggle} />
        )}
        
        <Container
          maxWidth={false}
          sx={{
            flexGrow: 1,
            py: hideSidebar ? 0 : { xs: 2, sm: 3, md: 4 },
            px: hideSidebar ? 0 : { xs: 2, sm: 3 },
            maxWidth: hideSidebar ? '100%' : '1400px',
            width: '100%',
            overflowX: 'hidden',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default AppLayout;
