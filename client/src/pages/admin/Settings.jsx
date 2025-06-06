import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Alert,
  Snackbar,
  useTheme
} from '@mui/material';
import {
  Save as SaveIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  VpnKey as ApiKeyIcon,
  Print as PrinterIcon,
  Receipt as ReceiptIcon,
  Notifications as NotificationsIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { settingsAPI } from '../../services/apiService';

export default function Settings() {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [settings, setSettings] = useState({
    restaurantName: 'My Restaurant',
    taxRate: 8.5,
    serviceCharge: 10,
    currency: 'ETB',
    language: 'en',
    theme: 'light',
    autoLogout: 30,
    printerName: 'Receipt Printer',
    receiptFooter: 'Thank you for dining with us!',
    enableNotifications: true,
    emailNotifications: true,
    soundAlerts: true,
    apiKey: 'sk-1234-5678-9abc-defg',
    logoUrl: '/logo.png',
  });

  // Fetch settings from API on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await settingsAPI.get();
        
        // Merge API settings with default settings
        if (response.data) {
          setSettings(prevSettings => ({
            ...prevSettings,
            ...response.data
          }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('Failed to load settings. Using defaults.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSettingChange = (event) => {
    const { name, value, checked } = event.target;
    setSettings({
      ...settings,
      [name]: event.target.type === 'checkbox' ? checked : value,
    });
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await settingsAPI.update(settings);
      
      setSnackbarMessage('Settings saved successfully!');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSnackbarMessage('Failed to save settings. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleResetSettings = () => {
    // Implementation would reset to default values
    setSnackbarMessage('Settings reset to defaults');
    setSnackbarOpen(true);
  };

  const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`settings-tabpanel-${index}`}
        aria-labelledby={`settings-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3, color: theme.palette.roles.admin }}>
        System Settings
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              '& .MuiTab-root': { 
                minWidth: 'auto',
                px: 3,
              },
              '& .Mui-selected': {
                color: theme.palette.roles.admin,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.roles.admin,
              }
            }}
          >
            <Tab label="General" icon={<SettingsIcon />} iconPosition="start" />
            <Tab label="Receipt" icon={<ReceiptIcon />} iconPosition="start" />
            <Tab label="Notifications" icon={<NotificationsIcon />} iconPosition="start" />
            <Tab label="Integrations" icon={<ApiKeyIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* General Settings */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Restaurant Name"
                name="restaurantName"
                value={settings.restaurantName}
                onChange={handleSettingChange}
                variant="outlined"
                margin="normal"
              />

              <TextField
                fullWidth
                label="Tax Rate"
                name="taxRate"
                type="number"
                value={settings.taxRate}
                onChange={handleSettingChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                variant="outlined"
                margin="normal"
              />

              <TextField
                fullWidth
                label="Service Charge"
                name="serviceCharge"
                type="number"
                value={settings.serviceCharge}
                onChange={handleSettingChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                variant="outlined"
                margin="normal"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Currency</InputLabel>
                <Select
                  name="currency"
                  value={settings.currency}
                  onChange={handleSettingChange}
                  label="Currency"
                >
                  <MenuItem value="ETB">Ethiopian Birr (Br)</MenuItem>
                  <MenuItem value="USD">US Dollar ($)</MenuItem>
                  <MenuItem value="EUR">Euro (€)</MenuItem>
                  <MenuItem value="GBP">British Pound (£)</MenuItem>
                  <MenuItem value="JPY">Japanese Yen (¥)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Language</InputLabel>
                <Select
                  name="language"
                  value={settings.language}
                  onChange={handleSettingChange}
                  label="Language"
                  startAdornment={
                    <InputAdornment position="start">
                      <LanguageIcon />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  <MenuItem value="de">German</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Theme</InputLabel>
                <Select
                  name="theme"
                  value={settings.theme}
                  onChange={handleSettingChange}
                  label="Theme"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System Default</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Auto Logout (minutes)"
                name="autoLogout"
                type="number"
                value={settings.autoLogout}
                onChange={handleSettingChange}
                variant="outlined"
                margin="normal"
              />

              <TextField
                fullWidth
                label="Logo URL"
                name="logoUrl"
                value={settings.logoUrl}
                onChange={handleSettingChange}
                variant="outlined"
                margin="normal"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Receipt Settings */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Printer Name"
                name="printerName"
                value={settings.printerName}
                onChange={handleSettingChange}
                variant="outlined"
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PrinterIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Receipt Footer"
                name="receiptFooter"
                value={settings.receiptFooter}
                onChange={handleSettingChange}
                variant="outlined"
                margin="normal"
                multiline
                rows={4}
              />

              <Button
                variant="outlined"
                color="primary"
                startIcon={<PrinterIcon />}
                sx={{ mt: 2 }}
              >
                Test Receipt Printer
              </Button>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2, mb: 2, mt: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Receipt Preview
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre',
                    bgcolor: 'background.paper',
                    p: 2,
                    borderRadius: 1,
                    border: '1px dashed',
                    fontSize: '0.75rem',
                    minWidth: 280,
                  }}
                >
                  {`${settings.restaurantName}
${new Date().toLocaleDateString()}
--------------------------------

Burger         1     Br 8.99   Br 8.99
Fries          1     Br 3.99   Br 3.99
Soda           1     Br 2.49   Br 2.49
--------------------------------
Subtotal:              Br 15.47
Tax (${settings.taxRate}%):       Br 1.31
Service (${settings.serviceCharge}%): Br 1.55
--------------------------------
TOTAL:                 Br 18.33

${settings.receiptFooter}
Thank you for your visit!
`}
                </Box>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notification Settings */}
        <TabPanel value={currentTab} index={2}>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableNotifications}
                  onChange={handleSettingChange}
                  name="enableNotifications"
                  color="primary"
                />
              }
              label="Enable System Notifications"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.emailNotifications}
                  onChange={handleSettingChange}
                  name="emailNotifications"
                  color="primary"
                  disabled={!settings.enableNotifications}
                />
              }
              label="Send Email Notifications"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.soundAlerts}
                  onChange={handleSettingChange}
                  name="soundAlerts"
                  color="primary"
                  disabled={!settings.enableNotifications}
                />
              }
              label="Play Sound Alerts"
            />
          </FormGroup>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Notification Events
          </Typography>
          
          <FormGroup>
            <FormControlLabel
              control={<Switch defaultChecked color="primary" disabled={!settings.enableNotifications} />}
              label="New Order"
            />
            <FormControlLabel
              control={<Switch defaultChecked color="primary" disabled={!settings.enableNotifications} />}
              label="Order Status Change"
            />
            <FormControlLabel
              control={<Switch defaultChecked color="primary" disabled={!settings.enableNotifications} />}
              label="Inventory Low"
            />
            <FormControlLabel
              control={<Switch defaultChecked color="primary" disabled={!settings.enableNotifications} />}
              label="Daily Reports"
            />
          </FormGroup>
        </TabPanel>

        {/* Integration Settings */}
        <TabPanel value={currentTab} index={3}>
          <Typography variant="subtitle1" gutterBottom>
            API Keys
          </Typography>
          
          <TextField
            fullWidth
            label="API Key"
            name="apiKey"
            value={settings.apiKey}
            onChange={handleSettingChange}
            variant="outlined"
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <ApiKeyIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton>
                    <RefreshIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <Alert severity="info" sx={{ mt: 2 }}>
            This API key provides access to your system data. Keep it confidential and never share it publicly.
          </Alert>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Third-Party Integrations
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2">Payment Processor</Typography>
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Enabled"
                />
                <Button size="small" variant="outlined" sx={{ mt: 1 }}>Configure</Button>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2">Delivery Service</Typography>
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Enabled"
                />
                <Button size="small" variant="outlined" sx={{ mt: 1 }}>Configure</Button>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2">Accounting Software</Typography>
                <FormControlLabel
                  control={<Switch color="primary" />}
                  label="Enabled"
                />
                <Button size="small" variant="outlined" sx={{ mt: 1 }}>Configure</Button>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2">Loyalty Program</Typography>
                <FormControlLabel
                  control={<Switch color="primary" />}
                  label="Enabled"
                />
                <Button size="small" variant="outlined" sx={{ mt: 1 }}>Configure</Button>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <Divider />
        
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<RefreshIcon />}
            onClick={handleResetSettings}
          >
            Reset to Defaults
          </Button>
          
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
          >
            Save Settings
          </Button>
        </Box>
      </Card>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </Box>
  );
} 