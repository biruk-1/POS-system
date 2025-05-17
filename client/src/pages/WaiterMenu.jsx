import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Box,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  Badge,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Chip,
  CardActions
} from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import axios from 'axios';

// Intercept and mock extension requests to prevent CORS errors
const interceptExtensionRequests = () => {
  const originalFetch = window.fetch;
  window.fetch = async function(url, options) {
    // Check if this is an aitopia extension request
    if (url && typeof url === 'string' && 
        (url.includes('extensions.aitopia.ai') || 
         url.includes('/languages/') || 
         url.includes('/ai/'))) {
      console.log('Intercepted fetch to:', url);
      // Return a mock successful response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      });
    }
    // Otherwise, pass through to the original fetch
    return originalFetch.apply(this, arguments);
  };
};

const WaiterMenu = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState('');
  const [tables, setTables] = useState([]);
  const [cartOpen, setCartOpen] = useState(true);
  
  // PIN dialog state for final confirmation
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Apply the fetch interceptor when component mounts
  useEffect(() => {
    interceptExtensionRequests();
  }, []);

  // Categories for the tabs
  const categories = ['All', 'Main Dishes', 'Appetizers', 'Desserts', 'Drinks'];
  
  // Handle PIN confirmation
  const handlePinConfirm = async () => {
    if (pin.length !== 6) {
      setPinError('PIN must be 6 digits');
      return;
    }
    
    try {
      setPinLoading(true);
      setPinError('');
      
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        pin_code: pin
      });
      
      const authToken = response.data.token;
      
      // Use the token to submit the order
      const orderData = {
        table_number: parseInt(tableNumber),
        items: cart.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          item_type: item.item_type || 'food' // Ensure we have item type for kitchen/bartender routing
        })),
        total_amount: totalPrice + (totalPrice * 0.1) // Include total with tax
      };

      // Submit the order with authentication
      const orderResponse = await axios.post('http://localhost:5001/api/orders', orderData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const order_id = orderResponse.data.id;
      
      // Update table status to 'occupied'
      await axios.put(`http://localhost:5001/api/tables/${tableNumber}/status`, 
        {
          status: 'occupied',
          occupants: cart.reduce((sum, item) => sum + item.quantity, 0)
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Reset cart and close dialog
      setCart([]);
      setPinDialogOpen(false);
      setPin('');
      
      // Determine which departments are notified based on order contents
      const hasFoodItems = cart.some(item => item.item_type === 'food' || !item.item_type);
      const hasDrinkItems = cart.some(item => item.item_type === 'drink');
      
      let successMessage = 'Order #' + order_id + ' successfully placed!';
      
      if (hasFoodItems) {
        successMessage += '\nKitchen has been notified.';
      }
      
      if (hasDrinkItems) {
        successMessage += '\nBar has been notified.';
      }
      
      // Show success message
      alert(successMessage);
      
    } catch (err) {
      console.error('PIN confirmation error:', err);
      if (err.response) {
        // Server responded with an error
        if (err.response.status === 500) {
          setPinError('Server error. Please try again or contact support.');
        } else if (err.response.status === 401) {
          setPinError('Invalid PIN. Please try again.');
        } else {
          setPinError(err.response.data?.error || 'Error placing order');
        }
      } else if (err.request) {
        // Request was made but no response
        setPinError('Network error. Is the server running?');
      } else {
        // Something else happened
        setPinError('Error placing order. Please try again.');
      }
      setPin('');
    } finally {
      setPinLoading(false);
    }
  };
  
  // Handle PIN input
  const handlePinInput = (digit) => {
    if (digit === 'clear') {
      setPin('');
    } else if (digit === 'enter') {
      handlePinConfirm();
    } else if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };
  
  // Create number pad
  const numberPad = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ['clear', 0, 'enter']
  ];
  
  // Fetch menu items
  const fetchMenuItems = async () => {
    try {
      // No authentication needed for browsing menu
      const response = await axios.get('http://localhost:5001/api/items')
        .catch(networkErr => {
          throw new Error(`Network error: ${networkErr.message}. Is the server running?`);
        });
      
      setItems(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching menu items:', err);
      setError(err.message || 'Failed to fetch menu items');
      setLoading(false);
    }
  };

  // Fetch available tables
  const fetchTables = async () => {
    try {
      // No authentication needed for browsing tables
      const response = await axios.get('http://localhost:5001/api/tables')
        .catch(networkErr => {
          console.error(`Network error: ${networkErr.message}. Is the server running?`);
          return null;
        });
          
      if (!response) return;
      
      // Filter only open tables
      const openTables = response.data.filter(table => table.status === 'open');
      setTables(openTables);
    } catch (err) {
      console.error('Error fetching tables:', err);
    }
  };
  
  // Load data when component mounts
  useEffect(() => {
    fetchMenuItems();
    fetchTables();
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Filter items based on selected category
  const filteredItems = tabValue === 0 
    ? items 
    : items.filter(item => item.category === categories[tabValue]);

  // Get the correct image URL for items
  const getItemImageUrl = (item) => {
    if (item.image && item.image.startsWith('/uploads/')) {
      return `http://localhost:5001${item.image}`;
    }
    return item.image || 'https://via.placeholder.com/300x140?text=Food+Item';
  };

  // Get category icon based on tab value
  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Main Dishes':
        return <LocalDiningIcon />;
      case 'Appetizers':
        return <RestaurantIcon />;
      case 'Desserts':
        return <RestaurantIcon />;
      case 'Drinks':
        return <RestaurantIcon />;
      default:
        return <RestaurantIcon />;
    }
  };

  // Add item to cart
  const addToCart = (item) => {
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex !== -1) {
      // Item already in cart, update quantity
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      // Add new item to cart
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === itemId);
    
    if (existingItemIndex !== -1) {
      const updatedCart = [...cart];
      if (updatedCart[existingItemIndex].quantity > 1) {
        // Decrease quantity
        updatedCart[existingItemIndex].quantity -= 1;
      } else {
        // Remove item completely
        updatedCart.splice(existingItemIndex, 1);
      }
      setCart(updatedCart);
    }
  };

  // Calculate total items in cart
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

  // Calculate total price
  const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Handle checkout
  const handleCheckout = () => {
    if (!tableNumber) {
      alert('Please select a table number');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    // Open PIN dialog for authentication
    setPinDialogOpen(true);
  };

  if (loading) return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2
      }}
    >
      <CircularProgress color="primary" size={60} />
      <Typography variant="h6">Loading menu items...</Typography>
    </Box>
  );
  
  if (error) return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        p: 3 
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>Error</Typography>
        <Typography color="error.main" paragraph>{error}</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchMenuItems();
          }}
          size="large"
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Paper>
    </Box>
  );

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column', 
        minHeight: '100vh',
        bgcolor: '#f5f5f5' 
      }}
    >
      {/* PIN Confirmation Dialog */}
      <Dialog 
        open={pinDialogOpen} 
        fullWidth 
        maxWidth="xs"
      >
        <DialogTitle sx={{ 
          textAlign: 'center', 
          bgcolor: theme.palette.primary.main, 
          color: 'white',
          py: 2
        }}>
          Confirm Order
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
            <Typography gutterBottom>Enter your 6-digit PIN to authenticate</Typography>
            
            <Paper
              elevation={3}
              sx={{
                p: 2,
                mb: 3,
                width: '100%',
                textAlign: 'center',
                fontSize: '24px',
                letterSpacing: '8px',
                fontFamily: 'monospace'
              }}
            >
              {pin ? '*'.repeat(pin.length) : '_ _ _ _ _ _'}
            </Paper>
            
            {pinError && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {pinError}
              </Typography>
            )}
            
            <Grid container spacing={2} sx={{ maxWidth: 300 }}>
              {numberPad.map((row, rowIndex) => (
                <Grid item container spacing={2} key={rowIndex} justifyContent="center">
                  {row.map((digit) => (
                    <Grid item xs={4} key={digit}>
                      <Button
                        variant={typeof digit === 'number' ? 'outlined' : 'contained'}
                        color={digit === 'enter' ? 'primary' : digit === 'clear' ? 'error' : 'primary'}
                        fullWidth
                        onClick={() => handlePinInput(digit)}
                        disabled={pinLoading}
                        sx={{ 
                          height: 60,
                          fontSize: typeof digit === 'number' ? '1.5rem' : '0.875rem' 
                        }}
                      >
                        {digit === 'enter' ? 'Enter' : digit === 'clear' ? 'Clear' : digit}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', p: 3 }}>
          <Button 
            onClick={() => setPinDialogOpen(false)} 
            variant="outlined"
            disabled={pinLoading}
          >
            Cancel
          </Button>
          {pinLoading && <CircularProgress size={24} />}
        </DialogActions>
      </Dialog>
      
      {/* App Bar */}
      <AppBar position="fixed" elevation={4} sx={{ 
        bgcolor: theme.palette.primary.main,
        zIndex: theme.zIndex.drawer + 1  // Ensure AppBar is always on top
      }}>
        <Toolbar>
          <TableRestaurantIcon sx={{ mr: 2 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Restaurant Menu
          </Typography>
          <Badge 
            badgeContent={totalItems} 
            color="secondary" 
            sx={{ mr: 2 }}
          >
            <ShoppingCartIcon />
          </Badge>
          <Box 
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.15)', 
              px: 2, 
              py: 1, 
              borderRadius: 1,
              display: {xs: 'none', sm: 'block'}
            }}
          >
            <Typography variant="h6">${totalPrice.toFixed(2)}</Typography>
          </Box>
        </Toolbar>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            bgcolor: theme.palette.primary.dark,
            '& .MuiTab-root': {
              color: 'rgba(255,255,255,0.7)',
              '&.Mui-selected': {
                color: 'white',
                fontWeight: 'bold'
              }
            }
          }}
        >
          {categories.map((category, index) => (
            <Tab 
              key={index} 
              label={category} 
              icon={index > 0 ? getCategoryIcon(category) : undefined}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </AppBar>
      
      {/* Main content with proper spacing */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          pt: { xs: '130px', sm: '140px' },
          pb: { xs: isMobile && cartOpen ? '200px' : '70px', md: 2 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' }
        }}
      >
        {/* Menu Items Grid */}
        <Box sx={{ 
          flexGrow: 1,
          p: 2,
          width: { md: 'calc(100% - 380px)' },
          mr: { md: '380px' } // Reserve space for the fixed cart on desktop
        }}>
          <Grid container spacing={3}>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: '0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 8
                      },
                      maxWidth: '400px',
                      mx: 'auto'
                    }}
                    elevation={3}
                  >
                    <CardMedia
                      component="img"
                      height="160"
                      image={getItemImageUrl(item)}
                      alt={item.name}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography gutterBottom variant="h6" component="h2" sx={{ fontWeight: 'bold', maxWidth: '70%' }}>
                          {item.name}
                        </Typography>
                        <Chip 
                          label={`$${item.price.toFixed(2)}`} 
                          color="primary" 
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          display: '-webkit-box',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          mb: 1
                        }}
                      >
                        {item.description || 'Delicious menu item'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Category: <b>{item.category || 'Main Dish'}</b>
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        variant="contained" 
                        fullWidth
                        onClick={() => addToCart(item)}
                        startIcon={<AddIcon />}
                        size="large"
                        sx={{ borderRadius: '0 0 4px 4px' }}
                      >
                        Add to Order
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    No items available in this category.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
        
        {/* Order Summary */}
        <Box 
          sx={{ 
            bgcolor: 'white',
            boxShadow: { xs: '0 -2px 8px rgba(0,0,0,0.1)', md: '-2px 0 8px rgba(0,0,0,0.1)' },
            width: { xs: '100%', md: '380px' },
            maxHeight: { xs: cartOpen ? '80vh' : 'auto', md: 'calc(100vh - 130px)' },
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            bottom: { xs: 0, md: 'auto' },
            right: 0,
            top: { xs: 'auto', md: '130px' },
            overflow: 'auto',
            zIndex: 10,
            borderTop: { xs: '1px solid rgba(0,0,0,0.1)', md: 'none' },
            height: { 
              xs: cartOpen ? 'auto' : '70px', 
              md: 'calc(100vh - 130px)' 
            },
            transition: 'all 0.3s ease',
            p: 0
          }}
        >
          {/* Mobile view collapses to show only a summary bar */}
          {isMobile ? (
            <Box>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 2,
                  borderBottom: cartOpen ? '1px solid rgba(0,0,0,0.1)' : 'none'
                }}
                onClick={() => setCartOpen(!cartOpen)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Badge 
                    badgeContent={totalItems} 
                    color="secondary" 
                    sx={{ mr: 2 }}
                  >
                    <ShoppingCartIcon color="primary" />
                  </Badge>
                  <Typography variant="body1" fontWeight="bold">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                  ${(totalPrice + (totalPrice * 0.1)).toFixed(2)}
                </Typography>
              </Box>
              
              {/* Expandable cart content */}
              {cartOpen && (
                <>
                  {/* Table Selection */}
                  <Box sx={{ mb: 2, px: 2, pt: 2 }}>
                    <TextField
                      select
                      fullWidth
                      variant="outlined"
                      label="Select Table"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      margin="normal"
                      color="primary"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: theme.palette.primary.main,
                          },
                        },
                      }}
                    >
                      {tables.length > 0 ? (
                        tables.map((table) => (
                          <MenuItem key={table.id} value={table.table_number}>
                            Table {table.table_number}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>No tables available</MenuItem>
                      )}
                    </TextField>
                  </Box>
                  <Divider />
                  
                  {/* Cart Items */}
                  <Box sx={{ maxHeight: '300px', overflow: 'auto', mb: 2 }}>
                    {cart.length > 0 ? (
                      <List>
                        {cart.map(item => (
                          <React.Fragment key={item.id}>
                            <ListItem sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', width: '100%' }}>
                                <Box sx={{ mr: 2, width: 50, height: 50, overflow: 'hidden', borderRadius: 1 }}>
                                  <img 
                                    src={getItemImageUrl(item)} 
                                    alt={item.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  />
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                  <ListItemText 
                                    primary={<Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{item.name}</Typography>} 
                                    secondary={`$${item.price.toFixed(2)} x ${item.quantity}`} 
                                  />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => removeFromCart(item.id)}
                                    color="error"
                                    sx={{ border: '1px solid', borderColor: 'error.main', p: 0.5 }}
                                  >
                                    <RemoveIcon fontSize="small" />
                                  </IconButton>
                                  <Typography sx={{ mx: 1, fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                                    {item.quantity}
                                  </Typography>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => addToCart(item)}
                                    color="primary"
                                    sx={{ border: '1px solid', borderColor: 'primary.main', p: 0.5 }}
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Box>
                            </ListItem>
                            <Divider />
                          </React.Fragment>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="text.secondary">Your order is empty</Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {/* Order Summary for mobile */}
                  <Box sx={{ p: 2 }}>
                    <Divider />
                    {cart.length > 0 && (
                      <Box sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Subtotal</Typography>
                          <Typography variant="body2">${totalPrice.toFixed(2)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Tax</Typography>
                          <Typography variant="body2">${(totalPrice * 0.1).toFixed(2)}</Typography>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Total:</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                            ${(totalPrice + (totalPrice * 0.1)).toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    <Button 
                      variant="contained" 
                      fullWidth 
                      size="large"
                      disabled={cart.length === 0 || !tableNumber}
                      onClick={handleCheckout}
                      sx={{ 
                        py: 1, 
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        boxShadow: 2
                      }}
                    >
                      Place Order
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          ) : (
            // Desktop view shows full cart
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                Your Order
              </Typography>
              
              {/* Table Selection */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  select
                  fullWidth
                  variant="outlined"
                  label="Select Table"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  margin="normal"
                  color="primary"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                  }}
                >
                  {tables.length > 0 ? (
                    tables.map((table) => (
                      <MenuItem key={table.id} value={table.table_number}>
                        Table {table.table_number}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No tables available</MenuItem>
                  )}
                </TextField>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {/* Cart Items */}
              <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
                {cart.length > 0 ? (
                  <List>
                    {cart.map(item => (
                      <React.Fragment key={item.id}>
                        <ListItem sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', width: '100%' }}>
                            <Box sx={{ mr: 2, width: 60, height: 60, overflow: 'hidden', borderRadius: 1 }}>
                              <img 
                                src={getItemImageUrl(item)} 
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                              <ListItemText 
                                primary={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{item.name}</Typography>} 
                                secondary={`$${item.price.toFixed(2)} x ${item.quantity}`} 
                              />
                              <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                ${(item.price * item.quantity).toFixed(2)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                              <IconButton 
                                size="small" 
                                onClick={() => removeFromCart(item.id)}
                                color="error"
                                sx={{ border: '1px solid', borderColor: 'error.main' }}
                              >
                                <RemoveIcon />
                              </IconButton>
                              <Typography sx={{ mx: 1, fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>
                                {item.quantity}
                              </Typography>
                              <IconButton 
                                size="small" 
                                onClick={() => addToCart(item)}
                                color="primary"
                                sx={{ border: '1px solid', borderColor: 'primary.main' }}
                              >
                                <AddIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    p: 4
                  }}>
                    <ShoppingCartIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography align="center" color="text.secondary" variant="h6">
                      Your order is empty
                    </Typography>
                    <Typography align="center" color="text.secondary">
                      Add items from the menu to get started
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* Order Summary */}
              <Box>
                <Divider />
                {cart.length > 0 && (
                  <Box sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1">Subtotal</Typography>
                      <Typography variant="body1">${totalPrice.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1">Tax</Typography>
                      <Typography variant="body1">${(totalPrice * 0.1).toFixed(2)}</Typography>
                    </Box>
                  </Box>
                )}
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total:</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                    ${(totalPrice + (totalPrice * 0.1)).toFixed(2)}
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth 
                  size="large"
                  disabled={cart.length === 0 || !tableNumber}
                  onClick={handleCheckout}
                  sx={{ 
                    py: 1.5, 
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    boxShadow: 4
                  }}
                >
                  Place Order
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default WaiterMenu;

