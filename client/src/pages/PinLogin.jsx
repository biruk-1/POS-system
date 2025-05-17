import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import axios from 'axios';
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  IconButton
} from '@mui/material';
import {
  Backspace as BackspaceIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

export default function PinLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const handleNumberClick = (number) => {
    if (pin.length < 6) {
      setPin(pin + number);
    }
  };
  
  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };
  
  const handleClear = () => {
    setPin('');
  };
  
  const handleSubmit = async () => {
    if (pin.length !== 6) {
      setError('PIN must be 6 digits');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        pin_code: pin
      });
      
      dispatch(setCredentials(response.data));
      
      // Navigate based on user role
      const userRole = response.data.user.role;
      switch(userRole) {
        case 'waiter':
          navigate('/waiter/dashboard');
          break;
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
        default:
          navigate('/');
      }
    } catch (err) {
      console.error('PIN login error:', err);
      setError(err.response?.data?.error || 'Invalid PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };
  
  // Create number pad
  const numberPad = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ['clear', 0, 'enter']
  ];
  
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
            title="Waiter Login"
            subheader="Enter your 6-digit PIN"
            sx={{ textAlign: 'center' }}
            action={
              <IconButton component={Link} to="/login">
                <ArrowBackIcon />
              </IconButton>
            }
          />
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  textAlign: 'center',
                  fontSize: '24px',
                  letterSpacing: '8px',
                  fontFamily: 'monospace'
                }}
              >
                {pin ? '*'.repeat(pin.length) : '_ _ _ _ _ _'}
              </Paper>
              
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                  {error}
                </Typography>
              )}
            </Box>
            
            <Grid container spacing={2}>
              {numberPad.map((row, rowIndex) => (
                row.map((number, colIndex) => (
                  <Grid item xs={4} key={`${rowIndex}-${colIndex}`}>
                    {number === 'clear' ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        onClick={handleClear}
                        sx={{ height: '56px' }}
                      >
                        Clear
                      </Button>
                    ) : number === 'enter' ? (
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={pin.length !== 6 || loading}
                        sx={{ height: '56px' }}
                      >
                        Enter
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => handleNumberClick(number)}
                        sx={{ height: '56px', fontSize: '20px' }}
                      >
                        {number}
                      </Button>
                    )}
                  </Grid>
                ))
              ))}
              
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="text"
                  color="primary"
                  onClick={handleBackspace}
                  startIcon={<BackspaceIcon />}
                  disabled={pin.length === 0}
                >
                  Backspace
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
} 