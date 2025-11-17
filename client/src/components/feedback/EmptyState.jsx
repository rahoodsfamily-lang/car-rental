import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  SearchOffOutlined,
  DirectionsCarOutlined,
  BookOnlineOutlined,
  HistoryOutlined,
  AddOutlined,
} from '@mui/icons-material';

const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
  size = 'medium',
}) => {
  const theme = useTheme();

  const getDefaultIcon = () => {
    switch (variant) {
      case 'search':
        return <SearchOffOutlined />;
      case 'cars':
        return <DirectionsCarOutlined />;
      case 'bookings':
        return <BookOnlineOutlined />;
      case 'history':
        return <HistoryOutlined />;
      default:
        return <SearchOffOutlined />;
    }
  };

  const iconSize = size === 'large' ? 80 : size === 'small' ? 48 : 64;
  const titleVariant = size === 'large' ? 'h4' : size === 'small' ? 'h6' : 'h5';
  const descriptionVariant = size === 'large' ? 'body1' : 'body2';

  return (
    <Paper
      sx={{
        p: { xs: 4, md: 6 },
        textAlign: 'center',
        bgcolor: alpha(theme.palette.grey[50], 0.5),
        border: 1,
        borderColor: 'divider',
        borderStyle: 'dashed',
        borderRadius: 3,
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          p: 3,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.grey[400], 0.1),
          color: 'text.secondary',
          mb: 3,
        }}
      >
        {React.cloneElement(icon || getDefaultIcon(), {
          sx: { fontSize: iconSize }
        })}
      </Box>

      <Typography
        variant={titleVariant}
        sx={{
          fontWeight: 600,
          mb: 2,
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>

      <Typography
        variant={descriptionVariant}
        sx={{
          color: 'text.secondary',
          mb: actionLabel ? 4 : 0,
          maxWidth: 400,
          mx: 'auto',
          lineHeight: 1.6,
        }}
      >
        {description}
      </Typography>

      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          startIcon={<AddOutlined />}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.5,
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
};

// Predefined empty states for common scenarios
export const NoSearchResults = ({ onClearFilters }) => (
  <EmptyState
    variant="search"
    title="No results found"
    description="We couldn't find any items matching your search criteria. Try adjusting your filters or search terms."
    actionLabel="Clear Filters"
    onAction={onClearFilters}
  />
);

export const NoCarsAvailable = ({ onAddCar }) => (
  <EmptyState
    variant="cars"
    title="No cars available"
    description="There are currently no cars in the system. Add some vehicles to get started."
    actionLabel="Add Car"
    onAction={onAddCar}
    size="large"
  />
);

export const NoBookings = ({ onBrowseCars }) => (
  <EmptyState
    variant="bookings"
    title="No bookings yet"
    description="You haven't made any bookings yet. Browse our available cars to make your first reservation."
    actionLabel="Browse Cars"
    onAction={onBrowseCars}
  />
);

export const NoRentalHistory = () => (
  <EmptyState
    variant="history"
    title="No rental history"
    description="You don't have any completed rentals yet. Your rental history will appear here once you complete your first rental."
  />
);

// Empty Rentals Component
export const EmptyRentals = ({ onBrowseCars }) => (
  <EmptyState
    variant="data"
    title="No Active Rentals"
    description="You don't have any active car rentals at the moment."
    actionLabel="Browse Available Cars"
    onAction={onBrowseCars}
  />
);

export default EmptyState;
