import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  Stack,
  Divider,
  Paper,
  alpha,
} from '@mui/material';
import {
  DirectionsCarFilled,
  CarRentalOutlined,
  ElectricCarOutlined,
  LocalTaxiOutlined,
  LoginOutlined,
  PersonAddOutlined,
  ArrowForwardOutlined,
  CheckCircleOutlined,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

const ModernLandingPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const benefits = [
    'Wide selection of premium vehicles',
    'Competitive daily and weekly rates',
    'Free cancellation up to 24 hours',
    'Comprehensive insurance coverage',
    '24/7 roadside assistance',
    'Easy online booking process',
  ];

  // If user is already logged in, redirect to appropriate page
  React.useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin' || user?.role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/cars');
      }
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        flexDirection: { xs: 'column', md: 'row' },
        overflow: { xs: 'auto', md: 'hidden' },
      }}
    >
      {/* Left Half - Car Icon and Description */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          position: 'relative',
          p: { xs: 3, sm: 4, md: 5, lg: 6 },
          minHeight: { xs: 'auto', md: '100vh' },
          py: { xs: 4, sm: 5, md: 6 },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 60%)`,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: { xs: 2, sm: 2.5, md: 3 },
            maxWidth: { xs: '100%', sm: 500, md: 600 },
            width: '100%',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Large Car Icon */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: { xs: 1, sm: 1.5, md: 2 },
            }}
          >
            <Box
              sx={{
                position: 'relative',
              }}
            >
              <DirectionsCarFilled
                sx={{
                  fontSize: { xs: 80, sm: 120, md: 180, lg: 220 },
                  color: theme.palette.primary.main,
                  filter: `drop-shadow(0 20px 40px ${alpha(theme.palette.primary.main, 0.3)})`,
                }}
              />
              {/* Additional decorative cars */}
              <ElectricCarOutlined
                sx={{
                  position: 'absolute',
                  top: { xs: -10, sm: -15, md: -20 },
                  right: { xs: -20, sm: -30, md: -40 },
                  fontSize: { xs: 30, sm: 40, md: 50, lg: 60 },
                  color: theme.palette.secondary.main,
                  opacity: 0.6,
                  display: { xs: 'none', sm: 'block' },
                }}
              />
              <LocalTaxiOutlined
                sx={{
                  position: 'absolute',
                  bottom: { xs: -5, sm: -8, md: -10 },
                  left: { xs: -15, sm: -20, md: -30 },
                  fontSize: { xs: 25, sm: 35, md: 40, lg: 50 },
                  color: theme.palette.info.main,
                  opacity: 0.5,
                  display: { xs: 'none', sm: 'block' },
                }}
              />
            </Box>
          </Box>

          {/* Title and Description */}
          <Box sx={{ textAlign: 'center', px: { xs: 1, sm: 2 } }}>
            <Typography
              variant="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem', lg: '3.5rem' },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: { xs: 1.5, sm: 2 },
                lineHeight: 1.2,
              }}
            >
              Drive Your Dreams
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: theme.palette.text.secondary,
                mb: { xs: 3, sm: 3.5, md: 4 },
                fontWeight: 400,
                fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem', lg: '1.5rem' },
              }}
            >
              Premium car rental made simple
            </Typography>
          </Box>

          {/* Benefits List - Inline */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 1, sm: 1.25 },
              width: '100%',
              mb: { xs: 2, sm: 2.5, md: 2 },
              px: { xs: 1, sm: 2 },
            }}
          >
            {benefits.map((benefit, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 1, sm: 1.5 },
                }}
              >
                <CheckCircleOutlined
                  sx={{
                    color: theme.palette.primary.main,
                    fontSize: { xs: 18, sm: 20 },
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.text.primary,
                    fontSize: { xs: '0.85rem', sm: '0.95rem' },
                  }}
                >
                  {benefit}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right Half - Login/Signup */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.palette.background.paper,
          p: { xs: 3, sm: 4, md: 5, lg: 6 },
          minHeight: { xs: 'auto', md: '100vh' },
          py: { xs: 4, sm: 5, md: 6 },
        }}
      >
        <Box
          sx={{
            maxWidth: { xs: '100%', sm: 400, md: 450 },
            width: '100%',
          }}
        >
          {/* Logo/Icon */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: { xs: 3, sm: 3.5, md: 4 },
            }}
          >
            <CarRentalOutlined
              sx={{
                fontSize: { xs: 50, sm: 60, md: 70, lg: 80 },
                color: theme.palette.primary.main,
                mb: { xs: 1, sm: 1.5, md: 2 },
              }}
            />
          </Box>

          {/* Welcome Text */}
          <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 3.5, md: 4 } }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: 1,
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem', lg: '2.5rem' },
                color: theme.palette.primary.main,
              }}
            >
              Welcome!
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1rem' },
              }}
            >
              Start your journey with us today
            </Typography>
          </Box>

          <Stack spacing={{ xs: 2, sm: 2.5 }}>
            {/* Login Button */}
            <Button
              component={Link}
              to="/login"
              variant="contained"
              size="large"
              fullWidth
              startIcon={<LoginOutlined />}
              sx={{
                py: { xs: 1.5, sm: 1.6, md: 1.8 },
                borderRadius: 2,
                fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
                fontWeight: 600,
                textTransform: 'none',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.25)}`,
                '&:hover': {
                  boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Sign In to Your Account
            </Button>

            <Divider sx={{ my: { xs: 0.5, sm: 1 } }}>
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                }}
              >
                OR
              </Typography>
            </Divider>

            {/* Sign Up Button */}
            <Button
              component={Link}
              to="/register"
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<PersonAddOutlined />}
              sx={{
                py: { xs: 1.5, sm: 1.6, md: 1.8 },
                borderRadius: 2,
                fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
                fontWeight: 600,
                textTransform: 'none',
                borderWidth: 2,
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                '&:hover': {
                  borderWidth: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Create New Account
            </Button>
          </Stack>

          {/* Additional Info */}
          <Box
            sx={{
              mt: { xs: 2, sm: 2.5, md: 3 },
              pt: { xs: 1.5, sm: 2 },
              borderTop: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                display: 'block',
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              By continuing, you agree to our{' '}
              <Link
                to="#"
                style={{
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Terms
              </Link>{' '}
              and{' '}
              <Link
                to="#"
                style={{
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Privacy
              </Link>
            </Typography>
          </Box>

          {/* Help Section */}
          <Box sx={{ mt: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
              }}
            >
              Need help?{' '}
              <Link
                to="#"
                style={{
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Contact Support
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ModernLandingPage;
