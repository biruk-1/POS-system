import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import { userOperations } from '../services/db';
import { getUserByPhone, saveUserForOffline, initializeOfflineFunctionality, getUserByUsername } from '../services/offlineService';
import axios from '../services/axiosConfig';
import socketService from '../services/socketService';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  TextField,
  Button,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import Footer from '../components/Footer';

const Login = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine ? 'online' : 'offline');

  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const handleOnlineStatus = () => {
      const online = navigator.onLine;
      setNetworkStatus(online ? 'online' : 'offline');
      setIsOffline(!online);
      
      if (!online) {
        setShowOfflineDialog(true);
      } else {
        setShowOfflineDialog(false);
      }
    };
    
    // Initialize offline functionality once
    initializeOfflineFunctionality().catch(error => {
      console.error('Failed to initialize offline functionality:', error);
    });
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    handleOnlineStatus();
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
    setUsername('');
    setPassword('');
    setPhoneNumber('');
  };

  const handleSuccessfulLogin = async (user, token, isOfflineLogin = false) => {
    try {
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update Redux store
      dispatch(setCredentials({ user, token }));

      // Initialize socket connection if online
      if (!isOfflineLogin) {
        try {
          await socketService.connect(token);
        } catch (error) {
          console.error('Socket connection error:', error);
          // Continue with login even if socket fails
        }
      }

      // Navigate based on role
      const role = user.role.toLowerCase();
      const targetPath = role === 'cashier' ? '/cashier/dashboard' : `/${role}/dashboard`;
      console.log('Navigating to:', targetPath);
      navigate(targetPath);
    } catch (error) {
      console.error('Error in post-login process:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isOffline) {
        if (activeTab === 0) {
          console.log('Attempting admin offline login with username:', username);
          const user = await getUserByUsername(username.trim());
          if (!user) {
            throw new Error('User not found in offline cache');
          }
          
          if (user.password !== password) {
            throw new Error('Invalid password');
          }

          localStorage.setItem('user', JSON.stringify(user));
          const offlineToken = `offline_${Date.now()}`;
          localStorage.setItem('token', offlineToken);
          
          dispatch(setCredentials({
            user,
            token: offlineToken
          }));

          navigate(`/${user.role.toLowerCase()}/dashboard`);
        } else {
          console.log('Attempting cashier offline login with phone:', phoneNumber);
          const user = await getUserByPhone(phoneNumber.trim());
          if (!user) {
            throw new Error('Cashier not found in offline cache');
          }

          if (user.password !== password) {
            throw new Error('Invalid password');
          }

          localStorage.setItem('user', JSON.stringify(user));
          const offlineToken = `offline_${Date.now()}`;
          localStorage.setItem('token', offlineToken);
          
          dispatch(setCredentials({
            user,
            token: offlineToken
          }));

          navigate('/cashier/dashboard');
        }
      } else {
        let response;
        const loginData = activeTab === 0 
          ? { username: username.trim(), password }
          : { phone_number: phoneNumber.trim(), password };

        console.log('Sending login request with data:', {
          ...loginData,
          password: '(hidden)'
        });

        try {
          response = await axios.post('/api/auth/login', loginData);
          console.log('Login response:', response.data);

          if (!response.data?.token || !response.data?.user) {
            throw new Error('Invalid response from server: missing token or user data');
          }

          const userData = {
            ...response.data.user,
            password,
            phone_number: activeTab === 1 ? phoneNumber.trim() : response.data.user.phone_number,
          };

          // Save user data for offline access
          try {
            await saveUserForOffline(userData);
            console.log('User data saved for offline access');
          } catch (saveError) {
            console.error('Failed to save offline data:', saveError);
            // Continue with login even if offline save fails
          }

          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          dispatch(setCredentials({
            user: response.data.user,
            token: response.data.token
          }));

          const targetPath = activeTab === 0 
            ? `/${response.data.user.role.toLowerCase()}/dashboard`
            : '/cashier/dashboard';
          
          navigate(targetPath);
        } catch (apiError) {
          console.error('API request failed:', apiError);
          if (apiError.response?.status === 403) {
            localStorage.removeItem('token');
            throw new Error('Access denied. Please try again.');
          } else if (apiError.response?.status === 401) {
            throw new Error('Invalid credentials');
          } else if (!apiError.response) {
            throw new Error('No response from server. Please check your connection.');
          } else {
            throw new Error(apiError.response.data?.message || 'Server error occurred');
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsWaiter = () => {
    navigate('/waiter-menu');
  };

  const handleContinueOffline = () => {
    setShowOfflineDialog(false);
  };

  const handleGoOnline = () => {
    window.location.reload();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
        position: 'relative',
      }}
    >
      <Container
        component="main"
        maxWidth="xs"
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
        }}
      >
        <Paper
          elevation={4}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 4,
            boxShadow: '0 2px 16px 0 rgba(0,0,0,0.06)',
            border: '1px solid #f0f0f0',
            background: '#fff',
          }}
        >
          <Typography variant="h5" fontWeight={700} color="#222" letterSpacing={1} sx={{ mb: 2 }}>
            Restaurant POS System
          </Typography>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ mb: 3, width: '100%' }}
            centered
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab icon={<PersonIcon />} label="Staff Login" />
            <Tab icon={<PhoneIcon />} label="Cashier Login" />
          </Tabs>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            {activeTab === 0 && (
              <TextField
                label="Username"
                variant="outlined"
                fullWidth
                margin="normal"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            )}
            {activeTab === 1 && (
              <TextField
                label="Phone Number"
                variant="outlined"
                fullWidth
                margin="normal"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            )}
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              sx={{
                mt: 2,
                borderRadius: 2,
                fontWeight: 700,
                letterSpacing: 1,
              }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Login'
              )}
            </Button>
          </Box>
          <Button
            onClick={handleContinueAsWaiter}
            variant="outlined"
            color="primary"
            fullWidth
            startIcon={<RestaurantIcon />}
            sx={{
              mt: 3,
              borderRadius: 2,
              fontWeight: 600,
            }}
            disabled={loading}
          >
            Continue as Waiter
          </Button>
          <Dialog
            open={showOfflineDialog}
            onClose={handleContinueOffline}
            aria-labelledby="offline-dialog-title"
          >
            <DialogTitle id="offline-dialog-title">You are offline</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Would you like to continue in offline mode or try to reconnect?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleContinueOffline} color="primary">
                Continue Offline
              </Button>
              <Button onClick={handleGoOnline} color="primary">
                Try to Reconnect
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Container>
      <Footer />
    </Box>
  );
};

export default Login; 