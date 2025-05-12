import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as CartIcon,
  Delete as DeleteIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';

export default function OrderEntry() {
  const user = useSelector((state) => state.auth.user);
  const token = localStorage.getItem('token');
  
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [waiterId, setWaiterId] = useState('');
  const [waiters, setWaiters] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  
  // Fetch items on component mount
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5001/api/items', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setItems(response.data);
      } catch (err) {
        setError('Failed to load menu items');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch waiters (for cashier to select waiter)
    const fetchWaiters = async () => {
      if (user?.role === 'cashier') {
        try {
          const response = await axios.get('http://localhost:5001/api/users', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          // Filter only waiters
          const waitersList = response.data.filter(user => user.role === 'waiter');
          setWaiters(waitersList);
        } catch (err) {
          console.error('Failed to load waiters', err);
        }
      }
    };
    
    fetchItems();
    fetchWaiters();
    
    // Socket.IO for real-time menu updates
    const socket = io('http://localhost:5001');
    
    socket.on('connect', () => {
      console.log('Cashier connected to socket server');
    });
    
    socket.on('item_created', (newItem) => {
      console.log('New menu item received:', newItem);
      setItems(prevItems => [...prevItems, newItem]);
    });
    
    socket.on('item_updated', (updatedItem) => {
      console.log('Menu item updated:', updatedItem);
      setItems(prevItems => 
        prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
      );
    });
    
    socket.on('item_deleted', (deletedItem) => {
      console.log('Menu item deleted:', deletedItem);
      setItems(prevItems => prevItems.filter(item => item.id !== deletedItem.id));
    });
    
    return () => {
      socket.disconnect();
    };
  }, [token, user]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleAddToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 } 
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };
  
  const handleRemoveFromCart = (itemId) => {
    const existingItem = cart.find(item => item.id === itemId);
    
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item => 
        item.id === itemId 
          ? { ...item, quantity: item.quantity - 1 } 
          : item
      ));
    } else {
      setCart(cart.filter(item => item.id !== itemId));
    }
  };
  
  const handleDeleteFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };
  
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };
  
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Please add items to your order.');
      return;
    }
    
    if (!tableNumber) {
      setError('Please enter a table number');
      return;
    }
    
    if (user?.role === 'cashier' && !waiterId) {
      setError('Please select a waiter or enter waiter ID');
      return;
    }
    
    try {
      const orderData = {
        items: cart.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          item_type: item.item_type
        })),
        table_number: tableNumber,
        total_amount: parseFloat(calculateTotal()),
        waiter_id: user.role === 'waiter' ? null : waiterId
      };
      
      const response = await axios.post('http://localhost:5001/api/orders', orderData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setSuccess('Order placed successfully!');
      setCart([]);
      setTableNumber('');
      
      // Automatically print receipt in a real-world scenario
      // For now we just show a message
      console.log('Order placed:', response.data);
      
    } catch (err) {
      setError('Failed to place order: ' + (err.response?.data?.error || err.message));
      console.error(err);
    }
  };
  
  const handlePrintReceipt = () => {
    // Implement printing functionality here
    alert('Receipt would be printed here in a real-world implementation');
  };
  
  // Filter items based on active tab
  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter(item => item.item_type === activeTab);
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        New Order
      </Typography>
      
      <Grid container spacing={3}>
        {/* Left side - Menu Items */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab value="all" label="All Items" />
              <Tab value="food" label="Food" />
              <Tab value="drink" label="Drinks" />
            </Tabs>
            
            {loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography>Loading items...</Typography>
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            ) : filteredItems.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography>No items found in this category</Typography>
              </Box>
            ) : (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {filteredItems.map(item => (
                  <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <Card 
                      elevation={2}
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': {
                          boxShadow: 6
                        },
                        backgroundColor: item.item_type === 'food' ? '#fffaf0' : '#f0f8ff'
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" component="div">
                            {item.name}
                          </Typography>
                          <Chip 
                            label={item.item_type.toUpperCase()} 
                            size="small"
                            color={item.item_type === 'food' ? 'secondary' : 'primary'}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {item.description || 'No description available'}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(item.price)}
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddToCart(item)}
                          >
                            Add
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
        
        {/* Right side - Order Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, position: 'sticky', top: '20px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                <CartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Cart
              </Typography>
              {cart.length > 0 && (
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  onClick={() => setCart([])}
                >
                  Clear All
                </Button>
              )}
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Table Number"
                    variant="outlined"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    required
                  />
                </Grid>
                
                {user?.role === 'cashier' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="waiter-select-label">Select Waiter</InputLabel>
                      <Select
                        labelId="waiter-select-label"
                        value={waiterId}
                        label="Select Waiter"
                        onChange={(e) => setWaiterId(e.target.value)}
                        required
                      >
                        {waiters.map(waiter => (
                          <MenuItem key={waiter.id} value={waiter.id}>
                            {waiter.username}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {cart.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Your cart is empty
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add items from the menu to create an order
                </Typography>
              </Box>
            ) : (
              <>
                <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
                  {cart.map(item => (
                    <Box key={item.id}>
                      <ListItem
                        secondaryAction={
                          <IconButton 
                            edge="end" 
                            aria-label="delete"
                            onClick={() => handleDeleteFromCart(item.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={`${item.name} - ${formatCurrency(item.price)}`}
                          secondary={`${item.item_type.toUpperCase()}`}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                          <IconButton 
                            size="small"
                            onClick={() => handleRemoveFromCart(item.id)}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ mx: 1 }}>
                            {item.quantity}
                          </Typography>
                          <IconButton 
                            size="small"
                            onClick={() => handleAddToCart(item)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItem>
                      <Divider />
                    </Box>
                  ))}
                </List>
                
                <Box sx={{ mt: 2, mb: 2, textAlign: 'right' }}>
                  <Typography variant="h5">
                    Total: {formatCurrency(calculateTotal())}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<PrintIcon />}
                    onClick={handlePrintReceipt}
                    disabled={cart.length === 0}
                  >
                    Print
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    sx={{ ml: 2 }}
                    onClick={handlePlaceOrder}
                    disabled={cart.length === 0}
                  >
                    Place Order
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccess('')} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {success}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError('')} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
} 