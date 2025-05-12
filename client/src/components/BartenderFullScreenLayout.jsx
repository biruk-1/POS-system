import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { Outlet } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Toolbar,
  Typography,
  Button,
  Paper,
  Avatar,
  useTheme
} from '@mui/material';
import {
  ExitToApp as LogoutIcon,
  LocalBar as BarIcon
} from '@mui/icons-material';

export default function BartenderFullScreenLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      <AppBar position="static" sx={{ bgcolor: theme.palette.roles?.bartender || theme.palette.secondary.main }}>
        <Toolbar>
          <BarIcon sx={{ mr: 2, fontSize: 28 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Bartender Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              sx={{ 
                bgcolor: theme.palette.secondary.dark,
                width: 36,
                height: 36,
                mr: 1
              }}
            >
              {user?.username?.charAt(0) || 'B'}
            </Avatar>
            <Typography variant="body1" sx={{ mr: 2, fontWeight: 'medium' }}>
              {user?.username || 'Bartender'}
            </Typography>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              variant="outlined"
              sx={{ 
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.8)',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          bgcolor: '#f5f5f5'
        }}
      >
        <Box sx={{ 
          p: 2, 
          height: 'calc(100vh - 64px)',  // Adjust for AppBar height
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
} 