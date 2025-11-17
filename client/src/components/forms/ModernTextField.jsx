import React, { useState, useEffect, useRef } from 'react';
import { TextField, InputAdornment, Box, Typography, useTheme, alpha } from '@mui/material';

const ModernTextField = ({
  label,
  error,
  helperText,
  startIcon,
  endIcon,
  description,
  required = false,
  ...props
}) => {
  const theme = useTheme();
  const [isAutofilled, setIsAutofilled] = useState(false);
  const inputRef = useRef(null);
  
  // Detect autofill
  useEffect(() => {
    const checkAutofill = () => {
      const input = inputRef.current?.querySelector('input');
      if (input) {
        try {
          // Check if input matches autofill pseudo-class
          const isAutofilledNow = input.matches(':-webkit-autofill');
          setIsAutofilled(isAutofilledNow);
        } catch (e) {
          // Fallback: check if value exists but user hasn't typed
          setIsAutofilled(input.value && input.value.length > 0);
        }
      }
    };

    // Check on mount and after a delay (for browser autofill)
    checkAutofill();
    const timer = setTimeout(checkAutofill, 100);
    
    // Also check on animation start (webkit autofill triggers this)
    const input = inputRef.current?.querySelector('input');
    const handleAnimationStart = (e) => {
      if (e.animationName === 'onAutoFillStart') {
        setIsAutofilled(true);
      } else if (e.animationName === 'onAutoFillCancel') {
        setIsAutofilled(false);
      }
    };
    
    input?.addEventListener('animationstart', handleAnimationStart);
    
    return () => {
      clearTimeout(timer);
      input?.removeEventListener('animationstart', handleAnimationStart);
    };
  }, [props.value]);
  
  // Build InputProps carefully to avoid undefined overrides
  const buildInputProps = () => {
    const result = {};
    
    // Copy props.InputProps but exclude startAdornment and endAdornment
    if (props.InputProps) {
      Object.keys(props.InputProps).forEach(key => {
        if (key !== 'startAdornment' && key !== 'endAdornment') {
          result[key] = props.InputProps[key];
        }
      });
    }
    
    // Add startAdornment - prioritize our startIcon
    if (startIcon) {
      result.startAdornment = (
        <InputAdornment position="start">{startIcon}</InputAdornment>
      );
    } else if (props.InputProps?.startAdornment) {
      result.startAdornment = props.InputProps.startAdornment;
    }
    
    // Add endAdornment - prioritize parent's endAdornment, then our endIcon
    if (props.InputProps?.endAdornment) {
      result.endAdornment = props.InputProps.endAdornment;
    } else if (endIcon) {
      result.endAdornment = (
        <InputAdornment position="end">{endIcon}</InputAdornment>
      );
    }
    
    return result;
  };
  
  const mergedInputProps = buildInputProps();
  
  return (
    <Box sx={{ mb: 2 }}>
      {description && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 1,
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>
      )}
      
      <TextField
        {...props}  // Spread props first (but exclude the ones we handle)
        ref={inputRef}
        fullWidth
        label={label}
        error={error}
        helperText={helperText}
        required={required}
        InputProps={mergedInputProps}  // Our merged InputProps overrides any from props
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: isAutofilled ? '#E8F0FE' : 'background.paper',
            position: 'relative',
            transition: 'background-color 0.2s ease',
            
            // When autofilled, apply background directly to root
            '&:has(input:-webkit-autofill)': {
              backgroundColor: '#E8F0FE !important',
            },
            
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
                borderWidth: 1,
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
                borderColor: 'primary.main',
              },
            },
            '&.Mui-error': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'error.main',
                borderWidth: 1,
              },
            },
            
            // Position input and adornments above the background
            '& input': {
              position: 'relative',
              backgroundColor: 'transparent',
            },
            
            // Enhanced autofill styles
            '& input:-webkit-autofill': {
              WebkitBoxShadow: '0 0 0 100px transparent inset !important',
              WebkitTextFillColor: `${theme.palette.text.primary} !important`,
              caretColor: theme.palette.text.primary,
              borderRadius: 'inherit',
              backgroundColor: 'transparent !important',
              transition: 'background-color 5000s ease-in-out 0s',
            },
            '& input:-webkit-autofill:hover': {
              WebkitBoxShadow: '0 0 0 100px transparent inset !important',
              WebkitTextFillColor: `${theme.palette.text.primary} !important`,
              backgroundColor: 'transparent !important',
            },
            '& input:-webkit-autofill:focus': {
              WebkitBoxShadow: '0 0 0 100px transparent inset !important',
              WebkitTextFillColor: `${theme.palette.text.primary} !important`,
              backgroundColor: 'transparent !important',
            },
            '& input:-webkit-autofill:active': {
              WebkitBoxShadow: '0 0 0 100px transparent inset !important',
              WebkitTextFillColor: `${theme.palette.text.primary} !important`,
              backgroundColor: 'transparent !important',
            },
            
            // CSS animations to detect autofill
            '@keyframes onAutoFillStart': {
              from: { opacity: 1 },
              to: { opacity: 1 },
            },
            '@keyframes onAutoFillCancel': {
              from: { opacity: 1 },
              to: { opacity: 1 },
            },
            '& input:-webkit-autofill': {
              animationName: 'onAutoFillStart',
              animationDuration: '0s',
              animationFillMode: 'both',
            },
            '& input:not(:-webkit-autofill)': {
              animationName: 'onAutoFillCancel',
              animationDuration: '0s',
              animationFillMode: 'both',
            },
          },
          
          '& .MuiInputLabel-root': {
            color: 'text.secondary',
            '&.Mui-focused': {
              color: 'primary.main',
            },
          },
          
          // Style input adornments
          '& .MuiInputAdornment-root': {
            backgroundColor: 'transparent',
            '& svg': {
              color: theme.palette.action.active,
              fontSize: '1.25rem',
            },
            '&.MuiInputAdornment-positionStart': {
              marginRight: 0,
            },
          },
          
          // Ensure the notched outline is properly styled and visible
          '& .MuiOutlinedInput-notchedOutline': {
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.23)',
            borderStyle: 'solid',
            transition: theme.transitions.create(['border-color', 'border-width'], {
              duration: theme.transitions.duration.shorter,
            }),
          },
          
          // Additional fallback for browsers that support :autofill
          '& .MuiOutlinedInput-root:has(input:autofill)': {
            backgroundColor: '#E8F0FE !important',
          },
        }}
      />
    </Box>
  );
};

export default ModernTextField;
