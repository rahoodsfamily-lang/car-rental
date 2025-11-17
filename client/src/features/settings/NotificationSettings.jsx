import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  TextField,
  Chip,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  NotificationsOff as NotificationsOffIcon,
  Refresh as RefreshIcon,
  NightsStay as NightsStayIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import axiosInstance from '../../utils/axiosConfig';
import { useToast } from '../../components/feedback/ToastProvider';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const NotificationSettings = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [draftSettings, setDraftSettings] = useState(null);
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchNotificationTypes();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await axiosInstance.get('/api/notification-settings');
      
      if (data && data.data) {
        setSettings(data.data);
        // Deep clone using structuredClone or fallback to JSON method with safety check
        try {
          setDraftSettings(structuredClone ? structuredClone(data.data) : JSON.parse(JSON.stringify(data.data)));
        } catch (cloneError) {
          // If cloning fails, just use the original data
          setDraftSettings(data.data);
        }
        setHasChanges(false);
      }
    } catch (error) {
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationTypes = async () => {
    try {
      const { data } = await axiosInstance.get('/api/notification-settings/types');
      setNotificationTypes(data.data);
    } catch (error) {
      console.error('Error fetching notification types:', error);
    }
  };

  const handleGlobalToggle = (field, value) => {
    setDraftSettings({
      ...draftSettings,
      [field]: value
    });
    setHasChanges(true);
  };

  const handleTypeToggle = (notificationType, deliveryMethod, value) => {
    setDraftSettings({
      ...draftSettings,
      preferences: {
        ...draftSettings.preferences,
        [notificationType]: {
          ...draftSettings.preferences[notificationType],
          [deliveryMethod]: value
        }
      }
    });
    setHasChanges(true);
  };

  const handleQuietHoursToggle = (value) => {
    setDraftSettings({
      ...draftSettings,
      quietHours: {
        ...draftSettings.quietHours,
        enabled: value
      }
    });
    setHasChanges(true);
  };

  const handleQuietHoursTimeChange = (field, value) => {
    // Convert dayjs object to HH:mm string format
    const timeString = value ? value.format('HH:mm') : '';
    setDraftSettings({
      ...draftSettings,
      quietHours: {
        ...draftSettings.quietHours,
        [field]: timeString
      }
    });
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const { data } = await axiosInstance.put(
        '/api/notification-settings',
        draftSettings
      );
      setSettings(data.data);
      setDraftSettings(JSON.parse(JSON.stringify(data.data)));
      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setDraftSettings(JSON.parse(JSON.stringify(settings)));
    setHasChanges(false);
    toast.info('Changes discarded');
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all notification settings to default?')) {
      return;
    }

    try {
      setSaving(true);
      const { data } = await axiosInstance.post(
        '/api/notification-settings/reset',
        {}
      );
      setSettings(data.data);
      setDraftSettings(JSON.parse(JSON.stringify(data.data)));
      setHasChanges(false);
      toast.success('Settings reset to defaults');
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!settings) {
    return (
      <Alert severity="error">Failed to load notification settings</Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 0, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3 }, px: { xs: 2, sm: 0 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, mb: { xs: 1.5, sm: 2 } }}>
          <IconButton onClick={() => navigate(-1)} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            <NotificationsIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: 'primary.main' }} />
            <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
              Notification Settings
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          Control how and when you receive notifications
        </Typography>
      </Box>

      {/* Global Settings */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, borderRadius: { xs: 0, sm: 1 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          Global Settings
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <FormControlLabel
          control={
            <Switch
              checked={draftSettings?.enableInApp}
              onChange={(e) => handleGlobalToggle('enableInApp', e.target.checked)}
              disabled={saving}
            />
          }
          label={
            <Box>
              <Typography variant="body1">
                <NotificationsIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                In-App Notifications
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Show notifications in the application
              </Typography>
            </Box>
          }
        />
      </Paper>

      {/* Per-Type Settings */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, borderRadius: { xs: 0, sm: 1 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          Notification Types
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          Customize delivery methods for each notification type
        </Typography>
        <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />

        {notificationTypes.map((category, idx) => (
          <Accordion key={idx} defaultExpanded={idx === 0} sx={{ '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 1.5, sm: 2 } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                {category.category}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: { xs: 1.5, sm: 2 } }}>
              {category.types.map((type) => (
                <Box key={type.key} sx={{ mb: { xs: 2.5, sm: 3 } }}>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    {type.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>
                    {type.description}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 }, mt: 1 }}>
                    {type.hasInApp && (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={draftSettings?.preferences?.[type.key]?.inApp ?? true}
                            onChange={(e) => handleTypeToggle(type.key, 'inApp', e.target.checked)}
                            disabled={saving || !draftSettings?.enableInApp}
                            size="small"
                          />
                        }
                        label={<Chip label="In-App" size="small" icon={<NotificationsIcon />} />}
                      />
                    )}

                    {!type.hasInApp && !type.hasEmail && (
                      <Typography variant="caption" color="text.secondary">
                        No delivery methods available
                      </Typography>
                    )}
                  </Box>
                  <Divider sx={{ mt: { xs: 1.5, sm: 2 } }} />
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>

      {/* Save/Discard Buttons - Sticky at bottom when changes exist */}
      {hasChanges && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            zIndex: 1000,
            flexDirection: { xs: 'column', sm: 'row' }
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            You have unsaved changes
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant="outlined"
              onClick={handleDiscardChanges}
              disabled={saving}
              fullWidth={{ xs: true, sm: false }}
            >
              Discard
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveChanges}
              disabled={saving}
              fullWidth={{ xs: true, sm: false }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Reset Button */}
      <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' }, px: { xs: 2, sm: 0 }, pb: { xs: 2, sm: 0 }, mb: hasChanges ? 10 : 0 }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={handleReset}
          disabled={saving}
          fullWidth={{ xs: true, sm: false }}
          sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}
        >
          Reset to Defaults
        </Button>
      </Box>
    </Box>
  );
};

export default NotificationSettings;
