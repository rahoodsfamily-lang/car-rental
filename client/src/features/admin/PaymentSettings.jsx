import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  CircularProgress,
  Card,
  CardMedia,
  IconButton
} from '@mui/material';
import { CloudUpload, Delete, Save } from '@mui/icons-material';
import axios from '../../utils/axiosConfig';
import { useToast } from '../../components/feedback/ToastProvider';

const PaymentSettings = forwardRef((props, ref) => {
  const [settings, setSettings] = useState({
    gcashQRCode: null,
    gcashName: '',
    gcashNumber: '',
    paymayaQRCode: null,
    paymayaName: '',
    paymayaNumber: '',
    enabledMethods: {
      gcash: true,
      paymaya: false,
      cash: true
    }
  });
  
  const [gcashPreview, setGcashPreview] = useState(null);
  const [paymayaPreview, setPaymayaPreview] = useState(null);
  const [gcashFile, setGcashFile] = useState(null);
  const [paymayaFile, setPaymayaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [numberErrors, setNumberErrors] = useState({
    gcash: '',
    paymaya: ''
  });
  const [nameErrors, setNameErrors] = useState({
    gcash: '',
    paymaya: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  const toast = useToast();
  // Validate Philippine mobile number (11 digits, starts with 09)
  const validatePhoneNumber = (number) => {
    if (!number) return '';
    const phoneRegex = /^(\+63|0)?[9]\d{9}$/;
    if (!phoneRegex.test(number)) {
      return 'Please enter a valid 11-digit Philippine mobile number (e.g., 09123456789)';
    }
    return '';
  };

  // Validate account name (letters, spaces, hyphens, apostrophes, periods)
  const validateAccountName = (name) => {
    if (!name) return '';
    if (name.length < 2) {
      return 'Account name must be at least 2 characters';
    }
    const nameRegex = /^[a-zA-Z\s.'-]+$/;
    if (!nameRegex.test(name)) {
      return 'Account name can only contain letters, spaces, periods, hyphens, and apostrophes';
    }
    return '';
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: () => fetchSettings(false) // Don't show loading spinner on refresh
  }));

  const fetchSettings = async (showLoading = true) => {
    try {
      if (showLoading) {
        setFetching(true);
      }
      const { data } = await axios.get('/api/payments/settings');
      
      // Merge with defaults to ensure all fields exist
      const mergedSettings = {
        gcashQRCode: data.gcashQRCode || null,
        gcashName: data.gcashName || '',
        gcashNumber: data.gcashNumber || '',
        paymayaQRCode: data.paymayaQRCode || null,
        paymayaName: data.paymayaName || '',
        paymayaNumber: data.paymayaNumber || '',
        enabledMethods: {
          gcash: data.enabledMethods?.gcash ?? false, // Disabled until configured
          paymaya: data.enabledMethods?.paymaya ?? false, // Disabled until configured
          cash: data.enabledMethods?.cash ?? true // Always available
        }
      };
      
      setSettings(mergedSettings);
      
      // Set existing QR code previews
      if (data.gcashQRCode) {
        setGcashPreview(getImageUrl(data.gcashQRCode));
      }
      if (data.paymayaQRCode) {
        setPaymayaPreview(getImageUrl(data.paymayaQRCode));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      if (showLoading) {
        setFetching(false);
      }
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${path.replace(/\\/g, '/')}`;
  };

  const handleGcashUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGcashFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGcashPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaymayaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymayaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymayaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Ensure at least one payment method is enabled
      const hasEnabledMethod = settings.enabledMethods.gcash || settings.enabledMethods.paymaya || settings.enabledMethods.cash;
      if (!hasEnabledMethod) {
        toast.error('At least one payment method must be enabled for customers to complete bookings.');
        setLoading(false);
        return;
      }

      // Validate GCash settings if enabled
      if (settings.enabledMethods.gcash) {
        if (!settings.gcashName || !settings.gcashNumber) {
          toast.error('Please fill in GCash account name and number before enabling.');
          setLoading(false);
          return;
        }
        const gcashNameError = validateAccountName(settings.gcashName);
        if (gcashNameError) {
          toast.error('GCash Account Name: ' + gcashNameError);
          setLoading(false);
          return;
        }
        const gcashError = validatePhoneNumber(settings.gcashNumber);
        if (gcashError) {
          toast.error('GCash Number: ' + gcashError);
          setLoading(false);
          return;
        }
        if (!settings.gcashQRCode && !gcashFile) {
          toast.error('Please upload GCash QR code before enabling.');
          setLoading(false);
          return;
        }
      }

      // Validate PayMaya settings if enabled
      if (settings.enabledMethods.paymaya) {
        if (!settings.paymayaName || !settings.paymayaNumber) {
          toast.error('Please fill in PayMaya account name and number before enabling.');
          setLoading(false);
          return;
        }
        const paymayaNameError = validateAccountName(settings.paymayaName);
        if (paymayaNameError) {
          toast.error('PayMaya Account Name: ' + paymayaNameError);
          setLoading(false);
          return;
        }
        const paymayaError = validatePhoneNumber(settings.paymayaNumber);
        if (paymayaError) {
          toast.error('PayMaya Number: ' + paymayaError);
          setLoading(false);
          return;
        }
        if (!settings.paymayaQRCode && !paymayaFile) {
          toast.error('Please upload PayMaya QR code before enabling.');
          setLoading(false);
          return;
        }
      }

      const formData = new FormData();
      
      // Add text fields
      formData.append('gcashName', settings.gcashName);
      formData.append('gcashNumber', settings.gcashNumber);
      formData.append('paymayaName', settings.paymayaName);
      formData.append('paymayaNumber', settings.paymayaNumber);
      formData.append('enabledMethods', JSON.stringify(settings.enabledMethods));
      
      // Add files if uploaded
      if (gcashFile) {
        formData.append('gcashQRCode', gcashFile);
      }
      if (paymayaFile) {
        formData.append('paymayaQRCode', paymayaFile);
      }

      const token = localStorage.getItem('token');
      await axios.put('/api/payments/settings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      toast.success('Payment settings saved successfully!');
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {fetching ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      ) : (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        gap: 3,
        flexWrap: 'wrap'
      }}>
        {/* GCash Settings */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' }, minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                GCash Settings
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enabledMethods.gcash}
                    onChange={(e) => {
                      // Validate before enabling
                      if (e.target.checked) {
                        if (!settings.gcashName || !settings.gcashNumber) {
                          toast.error('Please fill in GCash account name and number before enabling.');
                          return;
                        }
                        // Check if QR code exists (either saved in DB, newly uploaded, or preview available)
                        const hasQRCode = settings.gcashQRCode || gcashFile || gcashPreview;
                        if (!hasQRCode) {
                          toast.error('Please upload GCash QR code before enabling.');
                          return;
                        }
                      } else {
                        // Prevent disabling if it's the only enabled method
                        const otherMethodsEnabled = settings.enabledMethods.paymaya || settings.enabledMethods.cash;
                        if (!otherMethodsEnabled) {
                          toast.error('Cannot disable GCash. At least one payment method must be enabled.');
                          return;
                        }
                      }
                      setSettings({
                        ...settings,
                        enabledMethods: { ...settings.enabledMethods, gcash: e.target.checked }
                      });
                    }}
                  />
                }
                label="Enabled"
              />
            </Box>

            <TextField
              fullWidth
              label="Account Name"
              value={settings.gcashName || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSettings({ ...settings, gcashName: value });
                const error = validateAccountName(value);
                setNameErrors({ ...nameErrors, gcash: error });
              }}
              error={!!nameErrors.gcash}
              helperText={nameErrors.gcash || 'Full name as registered with GCash'}
              placeholder="Juan Dela Cruz"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="GCash Number"
              value={settings.gcashNumber || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSettings({ ...settings, gcashNumber: value });
                const error = validatePhoneNumber(value);
                setNumberErrors({ ...numberErrors, gcash: error });
              }}
              error={!!numberErrors.gcash}
              helperText={numberErrors.gcash || 'Philippine mobile format: 09XXXXXXXXX (11 digits)'}
              placeholder="09123456789"
              inputProps={{ maxLength: 11 }}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" sx={{ mb: 1 }}>
              QR Code Image
            </Typography>
            
            {gcashPreview && (
              <Card sx={{ mb: 2, maxWidth: 300 }}>
                <CardMedia
                  component="img"
                  image={gcashPreview}
                  alt="GCash QR Code"
                  sx={{ height: 300, objectFit: 'contain' }}
                />
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'white' }}
                  onClick={() => {
                    setGcashPreview(null);
                    setGcashFile(null);
                  }}
                >
                  <Delete />
                </IconButton>
              </Card>
            )}

            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              fullWidth
            >
              Upload GCash QR Code
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleGcashUpload}
              />
            </Button>
          </Paper>
        </Box>

        {/* PayMaya Settings */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' }, minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                PayMaya Settings
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enabledMethods.paymaya}
                    onChange={(e) => {
                      // Validate before enabling
                      if (e.target.checked) {
                        if (!settings.paymayaName || !settings.paymayaNumber) {
                          toast.error('Please fill in PayMaya account name and number before enabling.');
                          return;
                        }
                        // Check if QR code exists (either saved in DB, newly uploaded, or preview available)
                        const hasQRCode = settings.paymayaQRCode || paymayaFile || paymayaPreview;
                        if (!hasQRCode) {
                          toast.error('Please upload PayMaya QR code before enabling.');
                          return;
                        }
                      } else {
                        // Prevent disabling if it's the only enabled method
                        const otherMethodsEnabled = settings.enabledMethods.gcash || settings.enabledMethods.cash;
                        if (!otherMethodsEnabled) {
                          toast.error('Cannot disable PayMaya. At least one payment method must be enabled.');
                          return;
                        }
                      }
                      // Clear error message when validation passes
                      setMessage({ type: '', text: '' });
                      setSettings({
                        ...settings,
                        enabledMethods: { ...settings.enabledMethods, paymaya: e.target.checked }
                      });
                    }}
                  />
                }
                label="Enabled"
              />
            </Box>

            <TextField
              fullWidth
              label="Account Name"
              value={settings.paymayaName || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSettings({ ...settings, paymayaName: value });
                const error = validateAccountName(value);
                setNameErrors({ ...nameErrors, paymaya: error });
              }}
              error={!!nameErrors.paymaya}
              helperText={nameErrors.paymaya || 'Full name as registered with PayMaya'}
              placeholder="Juan Dela Cruz"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="PayMaya Number"
              value={settings.paymayaNumber || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSettings({ ...settings, paymayaNumber: value });
                const error = validatePhoneNumber(value);
                setNumberErrors({ ...numberErrors, paymaya: error });
              }}
              error={!!numberErrors.paymaya}
              helperText={numberErrors.paymaya || 'Philippine mobile format: 09XXXXXXXXX (11 digits)'}
              placeholder="09123456789"
              inputProps={{ maxLength: 11 }}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" sx={{ mb: 1 }}>
              QR Code Image
            </Typography>
            
            {paymayaPreview && (
              <Card sx={{ mb: 2, maxWidth: 300 }}>
                <CardMedia
                  component="img"
                  image={paymayaPreview}
                  alt="PayMaya QR Code"
                  sx={{ height: 300, objectFit: 'contain' }}
                />
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'white' }}
                  onClick={() => {
                    setPaymayaPreview(null);
                    setPaymayaFile(null);
                  }}
                >
                  <Delete />
                </IconButton>
              </Card>
            )}

            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              fullWidth
            >
              Upload PayMaya QR Code
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handlePaymayaUpload}
              />
            </Button>
          </Paper>
        </Box>

        {/* Cash on Delivery */}
        <Box sx={{ flex: '1 1 100%', minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enabledMethods.cash}
                    onChange={(e) => {
                      // Prevent disabling if it's the only enabled method
                      if (!e.target.checked) {
                        const otherMethodsEnabled = settings.enabledMethods.gcash || settings.enabledMethods.paymaya;
                        if (!otherMethodsEnabled) {
                          setMessage({ type: 'error', text: 'Cannot disable Cash on Delivery. At least one payment method must be enabled.' });
                          return;
                        }
                      }
                      // Clear error message when validation passes
                      setMessage({ type: '', text: '' });
                      setSettings({
                        ...settings,
                        enabledMethods: { ...settings.enabledMethods, cash: e.target.checked }
                      });
                    }}
                  />
                }
                label="Enable Cash on Delivery"
              />
          </Paper>
        </Box>

        {/* Save Button */}
        <Box sx={{ flex: '1 1 100%', minWidth: 0, display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            onClick={handleSave}
            disabled={loading}
            sx={{ minWidth: 200, maxWidth: 400, px: 4 }}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>
      )}
    </Box>
  );
});

export default PaymentSettings;
