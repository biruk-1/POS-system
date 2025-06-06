import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Badge,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Restaurant as RestaurantIcon,
  ExitToApp as LogoutIcon,
  Notifications as NotificationsIcon,
  SoupKitchen as KitchenIcon
} from '@mui/icons-material';

const drawerWidth = 280;

export default function KitchenLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state.auth.user);
  
  // Mock pending orders for kitchen
  const [pendingOrders] = useState(6);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Kitchen Dashboard';
    return 'Kitchen Portal';
  };

  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/kitchen/dashboard',
      description: 'View and process food orders'
    }
  ];

  const currentPath = location.pathname;

  const drawer = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      background: 'linear-gradient(to bottom, rgba(255, 143, 0, 0.05), rgba(0, 0, 0, 0))'
    }}>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column', 
        background: theme.palette.background.paper,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        mb: 2
      }}>
        <Avatar 
          sx={{ 
            width: 64, 
            height: 64, 
            bgcolor: theme.palette.roles?.kitchen || theme.palette.warning.main,
            mb: 1
          }}
        >
          <KitchenIcon fontSize="large" />
        </Avatar>
        <Typography variant="h6" component="div" align="center" sx={{ fontWeight: 'bold' }}>
          Kitchen Portal
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          {user?.username || 'Kitchen Staff'}
        </Typography>
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Card sx={{ 
          bgcolor: theme.palette.warning.light + '30',
          p: 2, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          mb: 2
        }}>
          <Typography variant="body1" align="center" color="text.secondary" gutterBottom>
            Pending Food Orders
          </Typography>
          <Typography variant="h2" align="center" color="warning.main" sx={{ fontWeight: 'bold' }}>
            {pendingOrders}
          </Typography>
          <Chip 
            size="small" 
            color="warning"
            label="Requires Attention" 
            sx={{ mt: 1 }}
          />
        </Card>
      </Box>
      
      <List sx={{ flexGrow: 1, px: 2 }}>
        {menuItems.map((item) => {
          const isActive = currentPath === item.path || 
                          (item.path.includes('/dashboard') && currentPath === '/kitchen');
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <Card
                elevation={isActive ? 3 : 0}
                sx={{
                  width: '100%',
                  bgcolor: isActive ? theme.palette.roles?.kitchen + '15' : 'transparent',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: isActive ? theme.palette.roles?.kitchen + '15' : theme.palette.action.hover,
                  },
                  borderLeft: isActive ? `4px solid ${theme.palette.roles?.kitchen}` : 'none',
                }}
              >
                <ListItemButton
                  component={Link}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon sx={{ 
                    color: isActive ? theme.palette.roles?.kitchen : 'inherit',
                    minWidth: 40
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <Box>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ 
                        fontWeight: isActive ? 'bold' : 'regular',
                        color: isActive ? theme.palette.roles?.kitchen : 'inherit'
                      }}
                    />
                    {!isSmallScreen && (
                      <Typography variant="caption" color="text.secondary">
                        {item.description}
                      </Typography>
                    )}
                  </Box>
                </ListItemButton>
              </Card>
            </ListItem>
          );
        })}
      </List>
      
      <Divider />
      
      <List sx={{ px: 2, pb: 2 }}>
        <ListItem disablePadding sx={{ mb: 1 }}>
          <Card elevation={0} sx={{ width: '100%' }}>
            <ListItemButton onClick={handleLogout} sx={{ py: 1.5 }}>
              <ListItemIcon sx={{ color: theme.palette.error.main, minWidth: 40 }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </Card>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          boxShadow: 'none',
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getCurrentPageTitle()}
          </Typography>
          
          <Tooltip title="Incoming Food Orders">
            <IconButton color="inherit" sx={{ mr: 1 }}>
              <Badge badgeContent={pendingOrders} color="warning">
                <RestaurantIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Button 
            variant="outlined" 
            color="warning" 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{ 
              display: { xs: 'none', md: 'flex' } 
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth 
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.08)'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          bgcolor: theme.palette.background.default,
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Card elevation={0} sx={{ 
          borderRadius: 2, 
          overflow: 'auto', 
          boxShadow: 'rgba(0, 0, 0, 0.04) 0px 5px 22px, rgba(0, 0, 0, 0.03) 0px 0px 0px 0.5px',
          mb: 2,
          backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.6) 100%)',
          backdropFilter: 'blur(20px)'
        }}>
          <CardContent>
            <Outlet />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
} 