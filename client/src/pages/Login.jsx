import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import axios from 'axios';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Input,
  FormHelperText,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  VpnKey as PinIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../config/api';

export default function Login() {
  const [activeTab, setActiveTab] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const requestData = {
        password: password
      };
      
      // Add the appropriate login identifier based on active tab
      if (activeTab === 0) {
        requestData.username = username;
      } else {
        requestData.phone_number = phoneNumber;
      }
      
      const response = await axios.post(API_ENDPOINTS.LOGIN, requestData);
      
      // Store token and user info in Redux store
      dispatch(setCredentials(response.data));
      
      // Navigate based on user role
      const userRole = response.data.user.role;
      switch(userRole) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'cashier':
          navigate('/cashier/dashboard');
          break;
        case 'kitchen':
          navigate('/kitchen');
          break;
        case 'bartender':
          navigate('/bartender');
          break;
        case 'waiter':
          navigate('/waiter/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };
  
  const validateForm = () => {
    if (activeTab === 0) {
      if (!username || !password) {
        setError('Please enter both username and password');
        return false;
      }
    } else if (activeTab === 1) {
      if (!phoneNumber || !password) {
        setError('Please enter both phone number and password');
        return false;
      }
      
      // Validate phone number format
      if (!/^\d{10,15}$/.test(phoneNumber)) {
        setError('Please enter a valid phone number');
        return false;
      }
    }
    
    return true;
  };

  const handleContinueAsWaiter = () => {
    navigate('/waiter-menu');
  };
  
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Card sx={{ width: '100%' }}>
          <CardHeader
            title="Restaurant POS System"
            subheader="Login to your account"
            sx={{ textAlign: 'center' }}
          />
          <CardContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                centered
              >
                <Tab label="Staff" icon={<PersonIcon />} />
                <Tab label="Cashier" icon={<PhoneIcon />} />
              </Tabs>
            </Box>
            
            <Box sx={{ p: 1 }}>
              {activeTab === 0 && (
                <Box component="form" onSubmit={handleSubmit}>
                  <FormControl fullWidth margin="normal">
                    <TextField
                      label="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      fullWidth
                    />
                  </FormControl>
                  <FormControl fullWidth margin="normal">
                    <TextField
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      fullWidth
                    />
                  </FormControl>
                  
                  {error && (
                    <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                      {error}
                    </Typography>
                  )}
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    disabled={loading}
                    sx={{ mt: 3, mb: 2 }}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                </Box>
              )}
              
              {activeTab === 1 && (
                <Box component="form" onSubmit={handleSubmit}>
                  <FormControl fullWidth margin="normal">
                    <TextField
                      label="Phone Number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      fullWidth
                    />
                  </FormControl>
                  <FormControl fullWidth margin="normal">
                    <TextField
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      fullWidth
                    />
                  </FormControl>
                  
                  {error && (
                    <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                      {error}
                    </Typography>
                  )}
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    disabled={loading}
                    sx={{ mt: 3, mb: 2 }}
                  >
                    {loading ? 'Logging in...' : 'Login as Cashier'}
                  </Button>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }}>OR</Divider>
              
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                component={Link}
                to="/pin-login"
                sx={{ mt: 1, mb: 2 }}
                startIcon={<PinIcon />}
              >
                Login with Waiter PIN
              </Button>

              <Button
                fullWidth
                variant="contained"
                color="success"
                onClick={handleContinueAsWaiter}
                sx={{ mt: 1 }}
                startIcon={<RestaurantIcon />}
              >
                Continue as Waiter
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
} 