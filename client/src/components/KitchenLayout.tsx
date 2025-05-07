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
  ExitToApp as LogoutIcon
} from '@mui/icons-material';

export default function KitchenLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Kitchen interface is intentionally minimalistic - staff only need to see orders
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Kitchen Terminal
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