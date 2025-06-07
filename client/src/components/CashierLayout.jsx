import React, { useState } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ShoppingCart as OrderIcon,
  Receipt as ReceiptIcon,
  ExitToApp as LogoutIcon,
  Notifications as NotificationsIcon,
  PointOfSale as CashierIcon
} from '@mui/icons-material';

const drawerWidth = 280;

function CashierLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state.auth.user);
  
  // Mock notifications for cashier
  const [notifications] = useState(5);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Cashier Dashboard';
    if (path.includes('/order')) return 'Order Entry';
    if (path.includes('/receipt')) return 'Receipt';
    if (path.includes('/sales')) return 'Sales Report';
    return 'Cashier Portal';
  };

  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/cashier/dashboard',
      description: 'View sales summary and pending orders'
    },
    { 
      text: 'New Order', 
      icon: <OrderIcon />, 
      path: '/cashier/order',
      description: 'Create and process new customer orders'
    },
    { 
      text: 'Sales', 
      icon: <ReceiptIcon />, 
      path: '/cashier/sales',
      description: 'View daily sales reports by waiter'
    }
  ];

  const currentPath = location.pathname;

  const drawer = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      background: 'linear-gradient(to bottom, rgba(25, 118, 210, 0.05), rgba(0, 0, 0, 0))'
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
            bgcolor: theme.palette.roles?.cashier || theme.palette.primary.main,
            mb: 1
          }}
        >
          <CashierIcon fontSize="large" />
        </Avatar>
        <Typography variant="h6" component="div" align="center" sx={{ fontWeight: 'bold' }}>
          Cashier Portal
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          {user?.username || 'Cashier'}
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ flexGrow: 1, px: 2 }}>
        {menuItems.map((item) => {
          const isActive = currentPath === item.path || 
                          (item.path.includes('/dashboard') && currentPath === '/cashier');
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <Card
                elevation={isActive ? 3 : 0}
                sx={{
                  width: '100%',
                  bgcolor: isActive ? theme.palette.roles?.cashier + '15' : 'transparent',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: isActive ? theme.palette.roles?.cashier + '15' : theme.palette.action.hover,
                  },
                  borderLeft: isActive ? `4px solid ${theme.palette.roles?.cashier}` : 'none',
                }}
              >
                <ListItemButton
                  component={Link}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon sx={{ 
                    color: isActive ? theme.palette.roles?.cashier : 'inherit',
                    minWidth: 40
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <Box>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ 
                        fontWeight: isActive ? 'bold' : 'regular',
                        color: isActive ? theme.palette.roles?.cashier : 'inherit'
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
          
          <Tooltip title="Pending Orders">
            <IconButton color="inherit" sx={{ mr: 1 }}>
              <Badge badgeContent={notifications} color="primary">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Button 
            variant="outlined" 
            color="primary" 
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

export default CashierLayout;