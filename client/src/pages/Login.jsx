import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import { userOperations } from '../services/db';
import { getUserByPhone, saveUserForOffline, initializeOfflineFunctionality, getUserByUsername } from '../services/offlineService';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
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
    const initializeOffline = async () => {
      try {
        console.log('Initializing offline functionality in Login component...');
        await initializeOfflineFunctionality();
        console.log('Offline functionality initialized successfully in Login component');
      } catch (error) {
        console.error('Failed to initialize offline functionality in Login component:', error);
      }
    };

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
    
    // Initialize offline functionality
    initializeOffline();
    
    // Set up online/offline event listeners
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    // Initial status check
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Ensure offline functionality is initialized
      await initializeOfflineFunctionality();

      if (isOffline) {
        if (activeTab === 0) {
          // Admin/Staff offline login
          console.log('Attempting admin offline login with username:', username);
          const user = await getUserByUsername(username.trim());
          console.log('Found user in offline cache:', user);
          
          if (!user) {
            setError('User not found in offline cache');
            setLoading(false);
            return;
          }
          
          // Verify password
          if (user.password !== password) {
            setError('Invalid password');
            setLoading(false);
            return;
          }

          // Store user data and token
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', `offline_${Date.now()}`);
          dispatch(setCredentials({
            user: user,
            token: `offline_${Date.now()}`
          }));

          // Navigate based on role
          navigate(`/${user.role.toLowerCase()}/dashboard`);
        } else {
          // Cashier offline login
          console.log('Attempting cashier offline login with phone:', phoneNumber);
          const user = await getUserByPhone(phoneNumber.trim());
          console.log('Found user in offline cache:', user);
          
          if (!user) {
            setError('Cashier not found in offline cache');
            setLoading(false);
            return;
          }

          // Verify password
          if (user.password !== password) {
            setError('Invalid password');
            setLoading(false);
            return;
          }

          // Store user data and token
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', `offline_${Date.now()}`);
          dispatch(setCredentials({
            user: user,
            token: `offline_${Date.now()}`
          }));

          navigate('/cashier/dashboard');
        }
      } else {
        // Online login
        let response;
        if (activeTab === 0) {
          // Admin/Staff online login
          console.log('Attempting admin online login with username:', username);
          response = await axios.post('http://localhost:5001/api/auth/login', {
            username: username.trim(),
            password
          });
        } else {
          // Cashier online login
          console.log('Attempting cashier online login with phone:', phoneNumber);
          response = await axios.post('http://localhost:5001/api/auth/login', {
            phone_number: phoneNumber.trim(),
            password
          });
        }
        
        if (response.data.token) {
          const userData = {
            ...response.data.user,
            password, // Store password for offline login
            phone_number: activeTab === 1 ? phoneNumber.trim() : response.data.user.phone_number,
          };
          
          console.log('Saving user data for offline access:', userData);
          
          // Save to IndexedDB and localStorage in parallel
          try {
            await saveUserForOffline(userData);
            console.log('User data saved successfully for offline access');
            
            // Verify the data was saved
            if (activeTab === 1) {
              const savedUser = await getUserByPhone(phoneNumber.trim());
              console.log('Verified saved cashier data:', savedUser);
              if (!savedUser) {
                console.warn('Failed to verify saved cashier data');
              }
            }
            
            // Store token and user data
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Update Redux store
          dispatch(setCredentials({
            user: response.data.user,
            token: response.data.token
          }));
          
          // Navigate to appropriate dashboard
          if (activeTab === 0) {
            navigate(`/${response.data.user.role.toLowerCase()}/dashboard`);
          } else {
            navigate('/cashier/dashboard');
            }
          } catch (saveError) {
            console.error('Error saving user data for offline access:', saveError);
            // Continue with login even if saving fails
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            dispatch(setCredentials({
              user: response.data.user,
              token: response.data.token
            }));
            
            if (activeTab === 0) {
              navigate(`/${response.data.user.role.toLowerCase()}/dashboard`);
            } else {
              navigate('/cashier/dashboard');
            }
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(error.response?.data?.message || error.message || 'Login failed. Please try again.');
      }
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
          {/* System name only, no logo */}
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
            />
            {error && <Typography color="error" align="center" sx={{ mt: 1 }}>{error}</Typography>}
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
              {loading ? 'Logging in...' : 'Login'}
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
          >
            Continue as Waiter
          </Button>
          {showOfflineDialog && (
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
          )}
        </Paper>
      </Container>
      <Footer />
    </Box>
  );
};

export default Login; 