import React, { useState, useRef } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  Typography,
  useTheme,
  IconButton,
  Tooltip,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  PaymentOutlined,
  SettingsOutlined,
  VerifiedOutlined,
  RefreshOutlined,
} from '@mui/icons-material';
import PaymentVerification from './PaymentVerification';
import PaymentSettings from './PaymentSettings';
import { useToast } from '../../components/feedback/ToastProvider';

const ModernPaymentManagement = () => {
  const theme = useTheme();
  const toast = useToast();
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const verificationRef = useRef();
  const settingsRef = useRef();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      if (tabValue === 0 && verificationRef.current?.refresh) {
        await verificationRef.current.refresh();
      } else if (tabValue === 1 && settingsRef.current?.refresh) {
        await settingsRef.current.refresh();
      }
      toast?.success('Data refreshed successfully');
    } catch (error) {
      toast?.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 3, md: 4 }, mb: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ 
        mb: { xs: 2, sm: 2.5, md: 3 }, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
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
            <PaymentOutlined sx={{ fontSize: 40, color: 'primary.main' }} />
            Payment Management
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              mb: { xs: 2, sm: 2.5, md: 3 },
              lineHeight: 1.6,
            }}
          >
            Manage payment verifications and configure payment methods
          </Typography>
        </Box>
        <Tooltip title={refreshing ? "Refreshing..." : "Refresh Data"}>
          <span>
            <IconButton
              onClick={handleRefresh}
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
      </Box>

      {/* Main Tabs */}
      <Paper sx={{ mb: { xs: 2, sm: 2.5, md: 3 }, borderRadius: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.8125rem', sm: '0.9375rem', md: '1.1rem' },
              minHeight: { xs: 48, sm: 56 },
              py: { xs: 1, sm: 1.5 },
            },
            '& .MuiSvgIcon-root': {
              fontSize: { xs: 18, sm: 20, md: 24 },
            },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab 
            label="Payment Verification"
            icon={<VerifiedOutlined />}
            iconPosition="start"
          />
          <Tab 
            label="Payment Settings"
            icon={<SettingsOutlined />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {tabValue === 0 ? (
          <PaymentVerification ref={verificationRef} />
        ) : (
          <PaymentSettings ref={settingsRef} />
        )}
      </Box>
    </Container>
  );
};

export default ModernPaymentManagement;
