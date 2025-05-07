import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { Outlet } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Toolbar,
  Typography,
  Button,
  Paper
} from '@mui/material';
import {
  ExitToApp as LogoutIcon,
  LocalBar as BarIcon
} from '@mui/icons-material';

export default function BartenderLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Bartender interface is also minimalistic - only needs to see drink orders
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      <AppBar position="static" color="primary" sx={{ bgcolor: '#7b1fa2' }}>
        <Toolbar>
          <BarIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Bartender Terminal
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        <Paper sx={{ 
          p: 2, 
          height: 'calc(100vh - 84px)', // Adjust for AppBar and padding
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Outlet />
        </Paper>
      </Box>
    </Box>
  );
} 