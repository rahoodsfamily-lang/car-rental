import React from 'react';
import { Chip, useTheme, alpha } from '@mui/material';
import {
  CheckCircleOutlined,
  CancelOutlined,
  DirectionsCarOutlined,
  BuildOutlined,
  PersonOutlined,
  AdminPanelSettingsOutlined,
  BlockOutlined,
  VerifiedOutlined,
  PendingOutlined,
  ErrorOutlined,
} from '@mui/icons-material';

const StatusChip = ({ status, type = 'default', size = 'small', ...props }) => {
  const theme = useTheme();
  
  const getChipProps = () => {
    // Normalize status to lowercase for consistent comparison
    const normalizedStatus = status?.toString().toLowerCase();
    
    switch (type) {
      case 'availability':
        switch (normalizedStatus) {
          case 'available':
            return {
              label: 'Available',
              icon: <CheckCircleOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                '& .MuiChip-icon': { color: theme.palette.success.main },
              },
            };
          case 'rented':
            return {
              label: 'Rented',
              icon: <DirectionsCarOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                color: theme.palette.warning.main,
                '& .MuiChip-icon': { color: theme.palette.warning.main },
              },
            };
          case 'maintenance':
            return {
              label: 'Maintenance',
              icon: <BuildOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                '& .MuiChip-icon': { color: theme.palette.error.main },
              },
            };
          default:
            return {
              label: status,
              sx: {
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                color: theme.palette.grey[700],
              },
            };
        }
      
      case 'role':
        switch (normalizedStatus) {
          case 'admin':
            return {
              label: 'Admin',
              icon: <AdminPanelSettingsOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                '& .MuiChip-icon': { color: theme.palette.error.main },
              },
            };
          case 'customer':
            return {
              label: 'Customer',
              icon: <PersonOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                '& .MuiChip-icon': { color: theme.palette.primary.main },
              },
            };
          default:
            return {
              label: status,
              icon: <PersonOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                color: theme.palette.grey[700],
                '& .MuiChip-icon': { color: theme.palette.grey[700] },
              },
            };
        }
      
      case 'userStatus':
        switch (normalizedStatus) {
          case 'active':
            return {
              label: 'Active',
              icon: <CheckCircleOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                '& .MuiChip-icon': { color: theme.palette.success.main },
              },
            };
          case 'inactive':
            return {
              label: 'Inactive',
              icon: <BlockOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                color: theme.palette.grey[700],
                '& .MuiChip-icon': { color: theme.palette.grey[700] },
              },
            };
          case 'suspended':
            return {
              label: 'Suspended',
              icon: <CancelOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                '& .MuiChip-icon': { color: theme.palette.error.main },
              },
            };
          default:
            return {
              label: status,
              sx: {
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                color: theme.palette.grey[700],
              },
            };
        }
      
      case 'verification':
        switch (normalizedStatus) {
          case 'pending':
            return {
              label: 'Pending',
              icon: <PendingOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                color: theme.palette.warning.main,
                '& .MuiChip-icon': { color: theme.palette.warning.main },
              },
            };
          case 'approved':
          case 'verified':
            return {
              label: normalizedStatus === 'approved' ? 'Approved' : 'Verified',
              icon: <VerifiedOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                '& .MuiChip-icon': { color: theme.palette.success.main },
              },
            };
          case 'rejected':
            return {
              label: 'Rejected',
              icon: <CancelOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                '& .MuiChip-icon': { color: theme.palette.error.main },
              },
            };
          case 'unverified':
            return {
              label: 'Unverified',
              icon: <ErrorOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                color: theme.palette.grey[700],
                '& .MuiChip-icon': { color: theme.palette.grey[700] },
              },
            };
          default:
            return {
              label: status,
              sx: {
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                color: theme.palette.grey[700],
              },
            };
        }
      
      case 'booking':
        switch (normalizedStatus) {
          case 'pending':
            return {
              label: 'Pending',
              icon: <PendingOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                color: theme.palette.warning.main,
                '& .MuiChip-icon': { color: theme.palette.warning.main },
              },
            };
          case 'confirmed':
            return {
              label: 'Confirmed',
              icon: <CheckCircleOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                '& .MuiChip-icon': { color: theme.palette.success.main },
              },
            };
          case 'cancelled':
            return {
              label: 'Cancelled',
              icon: <CancelOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                '& .MuiChip-icon': { color: theme.palette.error.main },
              },
            };
          case 'completed':
            return {
              label: 'Completed',
              icon: <CheckCircleOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: theme.palette.info.main,
                '& .MuiChip-icon': { color: theme.palette.info.main },
              },
            };
          default:
            return {
              label: status,
              sx: {
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                color: theme.palette.grey[700],
              },
            };
        }
      
      case 'payment':
        switch (normalizedStatus) {
          case 'paid':
            return {
              label: 'Paid',
              icon: <CheckCircleOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                '& .MuiChip-icon': { color: theme.palette.success.main },
              },
            };
          case 'pending':
            return {
              label: 'Pending',
              icon: <PendingOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                color: theme.palette.warning.main,
                '& .MuiChip-icon': { color: theme.palette.warning.main },
              },
            };
          case 'failed':
            return {
              label: 'Failed',
              icon: <ErrorOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                '& .MuiChip-icon': { color: theme.palette.error.main },
              },
            };
          case 'refunded':
            return {
              label: 'Refunded',
              icon: <CheckCircleOutlined />,
              sx: {
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: theme.palette.info.main,
                '& .MuiChip-icon': { color: theme.palette.info.main },
              },
            };
          default:
            return {
              label: status,
              sx: {
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                color: theme.palette.grey[700],
              },
            };
        }
      
      default:
        return {
          label: status,
          sx: {
            bgcolor: alpha(theme.palette.grey[500], 0.1),
            color: theme.palette.grey[700],
          },
        };
    }
  };

  const chipProps = getChipProps();
  
  return (
    <Chip
      label={chipProps.label}
      icon={chipProps.icon}
      size={size}
      sx={{
        fontWeight: 500,
        ...chipProps.sx,
        ...props.sx,
      }}
      {...props}
    />
  );
};

export default StatusChip;
