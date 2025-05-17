import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import * as offlineService from '../../services/offlineService';
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
import { useNavigate } from 'react-router-dom';

export default function OrderEntry() {
  const user = useSelector((state) => state.auth.user);
  const token = localStorage.getItem('token');
  
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [waiterId, setWaiterId] = useState('');
  const [waiters, setWaiters] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  
  // Add offline state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('');
  
  const navigate = useNavigate();
  
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
          console.log('Fetching waiters list...');
          const response = await axios.get('http://localhost:5001/api/waiters', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          console.log('Fetched waiters:', response.data);
          setWaiters(response.data);
          
          // Set default waiter if available
          if (response.data.length > 0) {
            setWaiterId(response.data[0].id);
          }
        } catch (err) {
          console.error('Failed to load waiters', err);
          setError('Failed to load waiters. Please refresh and try again.');
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
  
  // Setup online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setSyncStatus('Connected');
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setSyncStatus('Working offline. Orders will sync when reconnected.');
    };
    
    const cleanup = offlineService.initOfflineListeners(handleOnline, handleOffline);
    
    return cleanup;
  }, []);
  
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
  
  // Update the handlePlaceOrder function
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Please add items to your order.');
      return;
    }
    
    if (!waiterId) {
      setError('Please select a waiter');
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
        total_amount: parseFloat(calculateTotal()),
        waiter_id: waiterId
      };
      
      console.log('Placing order with data:', orderData);
      
      let orderId;
      
      if (navigator.onLine) {
        // Online mode - send to server
      const response = await axios.post('http://localhost:5001/api/orders', orderData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
        console.log('Order created:', response.data);
        orderId = response.data.id;
      } else {
        // Offline mode - save locally
        const offlineOrder = offlineService.saveOrderOffline(orderData);
        orderId = offlineOrder.id;
      }
      
      // Generate and print receipts
      await handlePrintReceipts(orderId);
      
      setSuccess(isOffline ? 
        'Order saved in offline mode. It will sync when back online.' : 
        'Order placed successfully!');
      
      // Clear the cart and reset fields
      setCart([]);
      
      // Keep the same waiter selected for convenience
      // setWaiterId('');
      
    } catch (err) {
      console.error('Failed to place order:', err);
      setError('Failed to place order: ' + (err.response?.data?.error || err.message));
    }
  };
  
  // Update the handlePrintReceipts function to use the cart data for new orders
  const handlePrintReceipts = async (orderId) => {
    try {
      // For a newly created order, we'll use the cart data directly
      // since the order items might not be immediately available from the API
      
      // Separate items into food and drinks
      const foodItems = cart.filter(item => item.item_type === 'food');
      const drinkItems = cart.filter(item => item.item_type === 'drink');
      
      // Print kitchen receipt if there are food items
      if (foodItems.length > 0) {
        const kitchenReceipt = {
          type: 'kitchen',
          items: foodItems,
          orderId: orderId,
          timestamp: new Date().toISOString(),
          waiterId: waiterId,
          waiterName: waiters.find(w => w.id === parseInt(waiterId))?.username || 'Unknown'
        };
        
        // Print kitchen receipt - in real system this would go to the kitchen printer
        console.log('Printing kitchen receipt:', kitchenReceipt);
        
        // Format kitchen receipt for display
        let kitchenContent = `KITCHEN ORDER: #${orderId}\n`;
        kitchenContent += `--------------------------------\n`;
        kitchenContent += `Time: ${new Date().toLocaleTimeString()}\n`;
        kitchenContent += `Waiter: ${kitchenReceipt.waiterName}\n`;
        kitchenContent += `--------------------------------\n\n`;
        
        foodItems.forEach(item => {
          kitchenContent += `${item.quantity}x ${item.name}\n`;
        });
        
        kitchenContent += `\n--------------------------------\n`;
        
        // Show kitchen receipt in alert
        alert(kitchenContent);
        
        await printReceipt(kitchenReceipt);
      }
      
      // Print barman receipt if there are drink items
      if (drinkItems.length > 0) {
        const barmanReceipt = {
          type: 'barman',
          items: drinkItems,
          orderId: orderId,
          timestamp: new Date().toISOString(),
          waiterId: waiterId,
          waiterName: waiters.find(w => w.id === parseInt(waiterId))?.username || 'Unknown'
        };
        
        // Print bar receipt - in real system this would go to the bar printer
        console.log('Printing bar receipt:', barmanReceipt);
        
        // Format bar receipt for display
        let barContent = `BAR ORDER: #${orderId}\n`;
        barContent += `--------------------------------\n`;
        barContent += `Time: ${new Date().toLocaleTimeString()}\n`;
        barContent += `Waiter: ${barmanReceipt.waiterName}\n`;
        barContent += `--------------------------------\n\n`;
        
        drinkItems.forEach(item => {
          barContent += `${item.quantity}x ${item.name}\n`;
        });
        
        barContent += `\n--------------------------------\n`;
        
        // Show bar receipt in alert
        alert(barContent);
        
        await printReceipt(barmanReceipt);
      }
      
    } catch (error) {
      console.error('Error printing receipts:', error);
      setError('Failed to print receipts');
    }
  };
  
  // Modify printReceipt to support offline mode
  const printReceipt = async (receiptData) => {
    try {
      if (navigator.onLine) {
        const response = await axios.post('http://localhost:5001/api/print-receipt', receiptData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          console.log(`${receiptData.type} receipt printed successfully`);
        } else {
          throw new Error('Failed to print receipt');
        }
      } else {
        // Store receipt offline
        offlineService.saveReceiptOffline(receiptData);
        console.log(`${receiptData.type} receipt saved offline`);
      }
    } catch (error) {
      console.error(`Error printing ${receiptData.type} receipt:`, error);
      throw error;
    }
  };
  
  // Filter items based on active tab
  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter(item => item.item_type === activeTab);
  
  // Add handlePrintOrder function
  const handlePrintOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Please add items to print an order.');
      return;
    }
    
    if (!waiterId) {
      setError('Please select a waiter');
      return;
    }

    try {
      // Separate items into food and drinks
      const foodItems = cart.filter(item => item.item_type === 'food');
      const drinkItems = cart.filter(item => item.item_type === 'drink');

      if (foodItems.length === 0 && drinkItems.length === 0) {
        setError('Cart must contain at least one food or drink item');
        return;
      }

      const orderId = `draft-${Date.now()}`; // Create a temporary ID for draft orders
      const waiterName = waiters.find(w => w.id === parseInt(waiterId))?.username || 'Unknown';
      
      // Store the complete order data in localStorage
      const orderData = {
        foodItems,
        drinkItems,
        orderId,
        timestamp: new Date().toISOString(),
        waiterId,
        waiterName,
        isDraft: true
      };
      
      // Save the order data for the OrderTicket component to use
      localStorage.setItem('order_data', JSON.stringify(orderData));
      
      // Only make API calls when online - and only do it once in the background
      // This makes the navigation to OrderTicket much faster
      if (navigator.onLine) {
        // Save data to server in background without blocking
        setTimeout(() => {
          const saveTicketsToServer = async () => {
            try {
              // Save kitchen ticket if there are food items
              if (foodItems.length > 0) {
                await axios.post('http://localhost:5001/api/print-receipt', {
                  type: 'kitchen',
                  items: foodItems,
                  orderId,
                  timestamp: new Date().toISOString(),
                  waiterId,
                  waiterName,
                  isDraft: true
                }, {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });
              }
              
              // Save bar ticket if there are drink items
              if (drinkItems.length > 0) {
                await axios.post('http://localhost:5001/api/print-receipt', {
                  type: 'barman',
                  items: drinkItems,
                  orderId,
                  timestamp: new Date().toISOString(),
                  waiterId,
                  waiterName,
                  isDraft: true
                }, {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });
              }
              console.log('Successfully saved tickets to server in background');
            } catch (err) {
              console.error('Background saving of tickets failed:', err);
              // Store in offline service for later sync
              if (foodItems.length > 0) {
                offlineService.saveReceiptOffline({
                  type: 'kitchen',
                  items: foodItems,
                  orderId,
                  timestamp: new Date().toISOString(),
                  waiterId,
                  waiterName,
                  isDraft: true
                });
              }
              
              if (drinkItems.length > 0) {
                offlineService.saveReceiptOffline({
                  type: 'barman',
                  items: drinkItems,
                  orderId,
                  timestamp: new Date().toISOString(),
                  waiterId,
                  waiterName,
                  isDraft: true
                });
              }
            }
          };
          
          saveTicketsToServer();
        }, 100);
      } else {
        // Store receipts offline
        if (foodItems.length > 0) {
          offlineService.saveReceiptOffline({
            type: 'kitchen',
            items: foodItems,
            orderId,
            timestamp: new Date().toISOString(),
            waiterId,
            waiterName,
            isDraft: true
          });
        }
        
        if (drinkItems.length > 0) {
          offlineService.saveReceiptOffline({
            type: 'barman',
            items: drinkItems,
            orderId,
            timestamp: new Date().toISOString(),
            waiterId,
            waiterName,
            isDraft: true
          });
        }
      }
      
      // Navigate to the ticket page immediately without waiting for API calls
      navigate('/cashier/order-ticket');
      
    } catch (error) {
      console.error('Error preparing order ticket:', error);
      setError('Failed to prepare order ticket: ' + (error.response?.data?.error || error.message));
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        New Order
        {isOffline && (
          <Chip
            label="Offline Mode"
            color="warning"
            size="small"
            sx={{ ml: 2, verticalAlign: 'middle' }}
          />
        )}
      </Typography>
      
      {syncStatus && (
        <Typography variant="body2" color={isOffline ? "warning.main" : "success.main"} sx={{ mb: 2 }}>
          {syncStatus}
        </Typography>
      )}
      
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
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Waiter</InputLabel>
                      <Select
                        value={waiterId}
                  onChange={(e) => setWaiterId(e.target.value)}
                        label="Select Waiter"
                        required
                      >
                  {waiters.map((waiter) => (
                          <MenuItem key={waiter.id} value={waiter.id}>
                            {waiter.username}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
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
                    size="large"
                    startIcon={<PrintIcon />}
                    onClick={handlePrintOrder}
                    disabled={cart.length === 0}
                    sx={{ flexGrow: 1, mr: 1 }}
                  >
                    Print Order
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    sx={{ flexGrow: 1, ml: 1 }}
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