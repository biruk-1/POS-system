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
        waiter_id: waiterId,
        status: 'pending' // Set initial status
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
      
      setSuccess(isOffline ? 
        'Order saved in offline mode. It will sync when back online.' : 
        'Order placed successfully!');
      
      // Clear the cart and reset fields
      setCart([]);
      
      // Navigate back to dashboard to show the updated order
      setTimeout(() => {
        navigate('/cashier/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error placing order:', error);
      setError('Failed to place order: ' + (error.response?.data?.error || error.message));
    }
  };
  
  // Update handlePrintOrder function
  const handlePrintOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Please add items to your order.');
      return;
    }
    
    if (!waiterId) {
      setError('Please select a waiter');
      return;
    }

    try {
      // First place the order
      const orderData = {
        items: cart.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          item_type: item.item_type
        })),
        total_amount: parseFloat(calculateTotal()),
        waiter_id: waiterId,
        status: 'pending' // Set initial status
      };
      
      console.log('Placing order with data for kitchen/bar printing:', orderData);
      
      let orderId;
      let placedOrder;
      
      // Use the same API endpoint as handlePlaceOrder
      if (navigator.onLine) {
        // Online mode - send to server
        const response = await axios.post('http://localhost:5001/api/orders', orderData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      
        console.log('Order created for kitchen/bar printing:', response.data);
        orderId = response.data.id;
        placedOrder = response.data;
      } else {
        // Offline mode - save locally
        const offlineOrder = offlineService.saveOrderOffline(orderData);
        orderId = offlineOrder.id;
        placedOrder = offlineOrder;
      }
      
      // Print kitchen and bar tickets
      printKitchenAndBarTickets(placedOrder);
      
      setSuccess('Order placed and sent to kitchen/bar');
      
      // Clear the cart after successful order
      setCart([]);
      
      // Navigate back to dashboard to show the updated order list
      setTimeout(() => {
        navigate('/cashier/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error placing order for kitchen/bar:', error);
      setError('Failed to create order for kitchen/bar: ' + (error.response?.data?.error || error.message));
    }
  };
  
  // Function to print kitchen and bar tickets separately
  const printKitchenAndBarTickets = (order) => {
    // Separate items by type
    const foodItems = order.items.filter(item => item.item_type === 'food');
    const drinkItems = order.items.filter(item => item.item_type === 'drink');
    
    // Only print kitchen ticket if there are food items
    if (foodItems.length > 0) {
      printTicket(order, foodItems, 'KITCHEN');
    }
    
    // Only print bar ticket if there are drink items
    if (drinkItems.length > 0) {
      printTicket(order, drinkItems, 'BAR');
    }
    
    // After printing kitchen/bar tickets, redirect to receipt page
    setTimeout(() => {
      navigate(`/cashier/receipt/${order.id}`);
    }, 500);
  };
  
  // Function to print a specific ticket
  const printTicket = (order, items, ticketType) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      alert(`Please allow pop-ups to print ${ticketType.toLowerCase()} ticket`);
      return;
    }
    
    // Add the content to the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>${ticketType} Ticket #${order.id}</title>
          <style>
            @page {
              size: 58mm 120mm;
              margin: 0;
            }
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 4mm 2mm;
              width: 58mm;
            }
            .ticket {
              text-align: center;
              padding: 2mm;
            }
            .header {
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 3mm;
              text-align: center;
            }
            .order-info {
              font-size: 10pt;
              margin-bottom: 3mm;
              text-align: center;
            }
            .divider {
              border-top: 1px dashed #999;
              margin: 3mm 0;
            }
            .item {
              text-align: left;
              font-size: 12pt;
              margin-bottom: 2mm;
              display: flex;
              justify-content: space-between;
            }
            .footer {
              font-size: 9pt;
              margin-top: 4mm;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              ${ticketType} TICKET
            </div>
            
            <div class="divider"></div>
            
            <div class="order-info">
              Order #: ${order.id}<br>
              Table: ${order.table_number || 'N/A'}<br>
              Waiter: ${order.waiter_name || 'N/A'}<br>
              Date: ${new Date().toLocaleDateString()}<br>
              Time: ${new Date().toLocaleTimeString()}
            </div>
            
            <div class="divider"></div>
            
            <div style="text-align: left;">
              <div style="font-weight: bold; margin-bottom: 2mm;">ITEMS:</div>
              
              ${items.map(item => `
                <div class="item">
                  <div style="font-weight: bold;">${item.quantity}x</div>
                  <div style="flex-grow: 1; padding-left: 3mm;">${item.name}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="divider"></div>
            
            <div class="footer">
              Printed: ${new Date().toLocaleString()}<br>
              PRIORITY: NORMAL
            </div>
          </div>
          <script>
            // Print and close window automatically
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };
  
  // Filter items based on active tab
  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter(item => item.item_type === activeTab);
  
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
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    onClick={handlePlaceOrder}
                    disabled={cart.length === 0}
                  >
                    Place Order
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="large"
                    fullWidth
                    startIcon={<PrintIcon />}
                    onClick={handlePrintOrder}
                    disabled={cart.length === 0}
                  >
                    Place & Print For Kitchen/Bar
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