import React from 'react';
import { Button, CircularProgress, Box } from '@mui/material';

const ModernButton = ({
  children,
  loading = false,
  loadingText = 'Loading...',
  variant = 'contained',
  size = 'medium',
  fullWidth = false,
  startIcon,
  endIcon,
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={loading || props.disabled}
      startIcon={loading ? null : startIcon}
      endIcon={loading ? null : endIcon}
      sx={{
        borderRadius: 2,
        py: size === 'large' ? 1.5 : size === 'small' ? 0.75 : 1,
        px: size === 'large' ? 4 : size === 'small' ? 2 : 3,
        fontWeight: 600,
        textTransform: 'none',
        position: 'relative',
        '&.Mui-disabled': {
          opacity: 0.7,
          // Keep text and icon color white for contained buttons when disabled
          ...(variant === 'contained' && {
            color: 'rgba(255, 255, 255, 0.9) !important',
            '& .MuiButton-startIcon': {
              color: 'rgba(255, 255, 255, 0.9) !important',
            },
            '& .MuiButton-endIcon': {
              color: 'rgba(255, 255, 255, 0.9) !important',
            },
          }),
        },
        ...props.sx,
      }}
      {...props}
    >
      {loading && (
        <CircularProgress
          size={20}
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: '-10px',
            marginTop: '-10px',
            color: variant === 'contained' ? 'white' : 'primary.main',
          }}
        />
      )}
      
      <Box
        sx={{
          opacity: loading ? 0 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {loading ? loadingText : children}
      </Box>
    </Button>
  );
};

export default ModernButton;
