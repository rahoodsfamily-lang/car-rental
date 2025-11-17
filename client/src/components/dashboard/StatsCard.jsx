import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUpOutlined,
  TrendingDownOutlined,
  TrendingFlatOutlined,
} from '@mui/icons-material';

const StatsCard = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  trend,
  trendValue,
  loading = false,
  onClick,
}) => {
  const theme = useTheme();
  
  // Handle default color by using grey palette
  const getColorValue = () => {
    if (color === 'default' || color === 'grey') {
      return theme.palette.grey[500];
    }
    return theme.palette[color]?.main || theme.palette.primary.main;
  };

  const colorValue = getColorValue();

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <TrendingUpOutlined sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'down':
        return <TrendingDownOutlined sx={{ fontSize: 16, color: 'error.main' }} />;
      default:
        return <TrendingFlatOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(colorValue, 0.05)} 0%, ${alpha(colorValue, 0.02)} 100%)`,
        border: 1,
        borderColor: alpha(colorValue, 0.1),
        transition: 'all 0.3s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
          borderColor: alpha(colorValue, 0.2),
        },
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: { xs: 1, sm: 1.5, md: 2 },
            gap: { xs: 1, sm: 1.5 },
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                mb: { xs: 0.5, sm: 1 },
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: { xs: '0.6875rem', sm: '0.75rem', md: '0.875rem' },
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
            
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: colorValue,
                lineHeight: 1,
                mb: { xs: 0.25, sm: 0.5 },
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem', lg: '2.25rem' },
                wordBreak: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {loading ? '...' : value}
            </Typography>

            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.4,
                  fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: { xs: 36, sm: 42, md: 48 },
                height: { xs: 36, sm: 42, md: 48 },
                borderRadius: 2,
                bgcolor: alpha(colorValue, 0.1),
                color: colorValue,
              }}
            >
              {React.cloneElement(icon, { sx: { fontSize: { xs: 18, sm: 20, md: 24 } } })}
            </Box>
          )}
        </Box>

        {(trend || trendValue) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            {getTrendIcon()}
            <Typography
              variant="body2"
              sx={{
                color: getTrendColor(),
                fontWeight: 500,
              }}
            >
              {trendValue}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              from last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
