import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
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
  Chip,
  Container,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as CartIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../services/socket';
import { 
  getMenuItemsOffline, 
  getTablesOffline,
  saveOrderOffline,
  saveReceiptOffline,
  isOnline,
  saveMenuItemsOffline,
  saveTablesOffline,
  saveUsersData
} from '../../services/offlineService';
import { userOperations } from '../../services/db';
import { API_ENDPOINTS } from '../../config/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_ENDPOINTS.ITEMS.split('/api')[0],
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default function OrderEntry() {
  const user = useSelector((state) => state.auth.user);
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [waiterId, setWaiterId] = useState('');
  const [waiters, setWaiters] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [offlineMode, setOfflineMode] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnlineStatus = () => {
      const online = isOnline();
      setOfflineMode(!online);
    };

    checkOnlineStatus();
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

    return () => {
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        let itemsData, tablesData, waitersData;

        if (offlineMode) {
          // Load data from IndexedDB in parallel
          [itemsData, tablesData, waitersData] = await Promise.all([
            getMenuItemsOffline().catch(error => {
              console.error('Error loading offline menu items:', error);
              return [];
            }),
            getTablesOffline().catch(error => {
              console.error('Error loading offline tables:', error);
              return [];
            }),
            userOperations.getAllUsers().catch(error => {
              console.error('Error loading offline users:', error);
              return [];
            })
          ]);
          
          // Filter waiters from users
          waitersData = Array.isArray(waitersData) 
            ? waitersData.filter(user => user.role === 'waiter')
            : [];
        } else {
          try {
            // Load data from API in parallel
          const [itemsRes, tablesRes, waitersRes] = await Promise.all([
            api.get('/api/items'),
            api.get('/api/tables'),
            api.get('/api/waiters')
          ]);

            itemsData = itemsRes.data;
            tablesData = tablesRes.data;
            waitersData = waitersRes.data;

          // Cache data for offline use
            await Promise.all([
              saveMenuItemsOffline(itemsData).catch(error => 
                console.error('Error caching menu items:', error)
              ),
              saveTablesOffline(tablesData).catch(error => 
                console.error('Error caching tables:', error)
              ),
              saveUsersData(waitersData).catch(error => 
                console.error('Error caching waiters:', error)
              )
            ]);
          } catch (apiError) {
            console.error('API Error:', apiError);
            // If API fails, try to load from offline storage
            [itemsData, tablesData, waitersData] = await Promise.all([
              getMenuItemsOffline(),
              getTablesOffline(),
              userOperations.getAllUsers().then(users => 
                users.filter(user => user.role === 'waiter')
              )
            ]);

            if (!itemsData.length && !tablesData.length && !waitersData.length) {
              throw new Error('Failed to load data from both API and offline storage');
          }
          }
        }

        // Update state with loaded data
        setItems(Array.isArray(itemsData) ? itemsData : []);
        setWaiters(Array.isArray(waitersData) ? waitersData : []);

        // Log loaded data for debugging
        console.log('Loaded Data:', {
          items: itemsData.length,
          waiters: waitersData.length
        });
      } catch (error) {
        console.error('Error in loadData:', error);
        setError(error.message || 'Failed to load required data');
        
        // Set empty arrays as fallback
        setItems([]);
        setWaiters([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [offlineMode]);
  
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
      setCart([...cart, { ...item, quantity: 1, item_type: item.item_type || 'other' }]);
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
      setError('Cart is empty');
      return;
    }

    if (!waiterId) {
      setError('Please select a waiter');
      return;
    }

    const orderData = {
      id: Date.now().toString(),
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        type: item.item_type
      })),
      total: calculateTotal(),
      waiter_id: waiterId,
      status: 'pending',
      created_at: new Date().toISOString(),
      isOffline: !navigator.onLine
    };

    try {
      if (offlineMode) {
        // Save order to IndexedDB
        const orderId = await saveOrderOffline({
          ...orderData,
          status: 'pending',
          created_at: new Date().toISOString()
        });

        // Save receipt to IndexedDB
        await saveReceiptOffline({
          order_id: orderId,
          items: orderData.items,
          total: orderData.total,
          created_at: new Date().toISOString()
        });

        // Show success message
        setSuccess('Order saved offline. It will be synced when you are back online.');
      } else {
        // Send order to server
        const response = await api.post('/api/orders', orderData);
        
        // Emit order event
        socket.emit('newOrder', response.data);
        
        // Show success message
        setSuccess('Order placed successfully!');
      }
      
      // Clear the cart and reset fields
      setCart([]);
      
      // Navigate back to dashboard to show the updated order
      setTimeout(() => {
        navigate('/cashier/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error placing order:', error);
      if (error.response?.status === 403) {
        // Token expired or invalid
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Failed to place order: ' + (error.response?.data?.error || error.message));
      }
    }
  };
  
  const handlePrintReceipt = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (!waiterId) {
      setError('Please select a waiter');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Separate items by type
      const foodItems = cart.filter(item => item.item_type === 'food');
      const drinkItems = cart.filter(item => item.item_type === 'drink');

      // Create a printable version of the tickets
      const printWindow = window.open('', '_blank', 'width=300,height=600');
      if (!printWindow) {
        alert('Please allow pop-ups to print tickets');
        return;
      }

      // Add the content to the new window
      printWindow.document.write(`
        <html>
          <head>
            <title>Order Tickets</title>
            <style>
              @page {
                size: 58mm auto;
                margin: 0;
              }
              html, body {
                width: 58mm;
                margin: 0;
                padding: 0;
                overflow-x: hidden;
                background-color: white;
              }
              body {
                font-family: 'Courier New', monospace;
                margin: 0;
                padding: 0;
                width: 58mm;
              }
              .ticket {
                padding: 2px;
                page-break-after: always;
                width: 100%;
                max-width: 58mm;
                overflow-x: hidden;
                box-sizing: border-box;
                margin-bottom: 5mm;
              }
              .header {
                text-align: center;
                margin-bottom: 2px;
              }
              .header h1 {
                font-size: 14px;
                margin: 1px 0;
                font-weight: bold;
              }
              .header div {
                font-size: 9px;
              }
              .detail {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1px;
                font-size: 9px;
              }
              .divider {
                border-top: 1px dashed #999;
                margin: 3px 0;
              }
              .item {
                margin-bottom: 2px;
                font-size: 10px;
                font-weight: normal;
                max-width: 58mm;
                overflow: hidden;
              }
              .quantity {
                font-weight: bold;
                font-size: 12px;
              }
              .footer {
                text-align: center;
                font-size: 8px;
                margin-top: 4px;
                font-weight: bold;
              }
              * {
                line-height: 1.1;
                max-width: 58mm;
                box-sizing: border-box;
              }
              h2 {
                font-size: 12px;
                margin: 3px 0;
                text-decoration: underline;
                font-weight: bold;
              }
            </style>
          </head>
          <body onload="window.print();">
      `);

      // Add food ticket if it exists
      if (foodItems.length > 0) {
        printWindow.document.write(`
          <div class="ticket">
            <div class="header">
              <h1>KITCHEN ORDER</h1>
              <div>*** DRAFT - NOT A RECEIPT ***</div>
            </div>
            <div class="divider"></div>
            <div class="detail">
              <div>Order: #${Date.now()}</div>
              <div>Time: ${new Date().toLocaleTimeString()}</div>
            </div>
            <div class="detail">
              <div>Waiter: ${waiters.find(w => w.id === waiterId)?.username || 'Unknown'}</div>
            </div>
            <div class="divider"></div>
            <h2>FOOD ITEMS</h2>
            ${foodItems.map(item => `
              <div class="item">
                <span class="quantity">${item.quantity}x</span> ${item.name}
                ${item.description ? `<div style="font-size: 8px; margin-left: 12px; margin-top: 1px;">${item.description}</div>` : ''}
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="footer">
              <div>KITCHEN COPY</div>
              <div>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        `);
      }

      // Add drink ticket if it exists
      if (drinkItems.length > 0) {
        printWindow.document.write(`
          <div class="ticket">
            <div class="header">
              <h1>BAR ORDER</h1>
              <div>*** DRAFT - NOT A RECEIPT ***</div>
            </div>
            <div class="divider"></div>
            <div class="detail">
              <div>Order: #${Date.now()}</div>
              <div>Time: ${new Date().toLocaleTimeString()}</div>
            </div>
            <div class="detail">
              <div>Waiter: ${waiters.find(w => w.id === waiterId)?.username || 'Unknown'}</div>
            </div>
            <div class="divider"></div>
            <h2>DRINK ITEMS</h2>
            ${drinkItems.map(item => `
              <div class="item">
                <span class="quantity">${item.quantity}x</span> ${item.name}
                ${item.description ? `<div style="font-size: 8px; margin-left: 12px; margin-top: 1px;">${item.description}</div>` : ''}
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="footer">
              <div>BAR COPY</div>
              <div>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        `);
      }

      printWindow.document.write('</body></html>');
      printWindow.document.close();

      // Save order data for offline/online sync
    const orderData = {
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
          item_type: item.item_type
      })),
      total: calculateTotal(),
      waiter_id: waiterId,
      status: 'pending',
        created_at: new Date().toISOString()
    };

      if (offlineMode) {
        // Save order to IndexedDB
        const orderId = await saveOrderOffline(orderData);
        setSuccess('Order saved offline. It will be synced when you are back online.');
      } else {
        // Send order to server
        const response = await api.post('/api/orders', orderData);
        socket.emit('newOrder', response.data);
        setSuccess('Order placed successfully!');
      }
      
      // Clear cart and reset fields
      setCart([]);
      setWaiterId('');
      
    } catch (error) {
      console.error('Error printing receipt:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Token expired or invalid
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Failed to print receipt: ' + (error.response?.data?.error || error.message));
      }
    }
  };
  
  // Filter items based on active tab
  const filteredItems = activeTab === 'all' 
    ? (Array.isArray(items) ? items : [])
    : (Array.isArray(items) ? items.filter(item => item.item_type === activeTab) : []);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        New Order
        {offlineMode && (
          <Chip
            label="Offline Mode"
            color="warning"
            size="small"
            sx={{ ml: 2, verticalAlign: 'middle' }}
          />
        )}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
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
            ) : !Array.isArray(filteredItems) || filteredItems.length === 0 ? (
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
                            label={(item.item_type || 'other').toUpperCase()} 
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
                  {Array.isArray(waiters) && waiters.map((waiter) => (
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
                          secondary={`${(item.item_type || 'other').toUpperCase()}`}
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
                    startIcon={<ReceiptIcon />}
                    onClick={handlePrintReceipt}
                    disabled={cart.length === 0}
                  >
                    Print Receipt
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
    </Container>
  );
} 