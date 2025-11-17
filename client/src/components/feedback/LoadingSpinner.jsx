import React from 'react';
import { Box, CircularProgress, Typography, Skeleton, Card, CardContent, CardActions } from '@mui/material';

// Full page loading spinner
export const PageLoader = ({ message = 'Loading...' }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 2,
    }}
  >
    <CircularProgress size={48} thickness={4} />
    <Typography variant="body1" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

// Inline loading spinner
export const InlineLoader = ({ size = 24, message }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      py: 2,
    }}
  >
    <CircularProgress size={size} />
    {message && (
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    )}
  </Box>
);

// Card skeleton loader - matches column layout
export const CardSkeleton = () => (
  <Card sx={{ width: '100%', overflow: 'hidden' }}>
    <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
      {/* Image skeleton */}
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2, width: '100%' }} />
      
      {/* Title and status */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Skeleton variant="text" height={32} width="60%" />
        <Skeleton variant="rounded" height={32} width={100} />
      </Box>
      
      {/* Details grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
        <Skeleton variant="text" height={20} />
        <Skeleton variant="text" height={20} />
        <Skeleton variant="text" height={20} />
        <Skeleton variant="text" height={20} />
      </Box>
    </CardContent>
    
    {/* Buttons skeleton */}
    <CardActions sx={{ p: { xs: 2, sm: 2.5, md: 3 }, pt: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
        <Skeleton variant="text" height={20} width="40%" />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Skeleton variant="rectangular" height={36} width={120} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={36} width={100} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
    </CardActions>
  </Card>
);

// Table skeleton loader
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <Box>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box
        key={rowIndex}
        sx={{
          display: 'flex',
          gap: 2,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            variant="text"
            height={20}
            sx={{ flex: 1 }}
          />
        ))}
      </Box>
    ))}
  </Box>
);

const LoadingSpinner = PageLoader;
export default LoadingSpinner;
