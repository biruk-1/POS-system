import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Box,
  Alert,
  Avatar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
  IconButton,
  Badge
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../../config/api';
import { formatCurrency } from '../../utils/currencyFormatter';
import io from 'socket.io-client';

// Function to get the correct image URL
const getItemImageUrl = (image) => {
  if (image && image.startsWith('/uploads/')) {
    return `http://localhost:5001${image}`;
  }
  return image || 'https://via.placeholder.com/60x60?text=Food';
};

export default function KitchenView() {
  const [orders, setOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshTime, setRefreshTime] = useState(Date.now());
  const [tabValue, setTabValue] = useState(0);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTime(Date.now());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Function to move completed orders to history after delay
  const moveToHistory = (orderId) => {
    console.log(`[Kitchen] Scheduling order ${orderId} to move to history in 2 minutes`);
    
    // Mark the order with a temporary flag to indicate it's scheduled for history
    setOrders(prevOrders => {
      // Check if this order is already scheduled for history
      const orderToUpdate = prevOrders.find(order => order.orderId === orderId);
      if (orderToUpdate && orderToUpdate.scheduledForHistory) {
        console.log(`[Kitchen] Order ${orderId} already scheduled for history, skipping`);
        return prevOrders; // Don't schedule again
      }
      
      console.log(`[Kitchen] Marking order ${orderId} as scheduled for history`);
      return prevOrders.map(order => 
        order.orderId === orderId 
          ? { ...order, scheduledForHistory: true, readyTime: new Date().toISOString() } 
          : order
      );
    });
    
    console.log(`[Kitchen] Setting timeout for order ${orderId} to move to history in 2 minutes`);
    setTimeout(() => {
      console.log(`[Kitchen] 2-minute timeout completed for order ${orderId}, processing move to history`);
      setOrders(prevOrders => {
        const orderToMove = prevOrders.find(order => order.orderId === orderId);
        if (orderToMove) {
          // Add to history
          const historicalOrder = {
            ...orderToMove,
            completedAt: new Date().toLocaleTimeString()
          };
          
          console.log('[Kitchen] Moving order to history:', historicalOrder);
          setHistoryOrders(prev => {
            console.log('[Kitchen] Current history count:', prev.length, 'Adding new item');
            return [historicalOrder, ...prev];
          });
          
          // Remove from active orders
          console.log(`[Kitchen] Removing order ${orderId} from active orders`);
          return prevOrders.filter(order => order.orderId !== orderId);
        }
        console.log(`[Kitchen] Order ${orderId} not found in active orders, may have been removed already`);
        return prevOrders;
      });
    }, 2 * 60 * 1000); // 2 minutes
  };
  
  // Socket.IO connection for real-time updates
  useEffect(() => {
    console.log('Setting up Socket.IO connection for Kitchen View');
    const socket = io('http://localhost:5001');
    
    socket.on('connect', () => {
      console.log('Kitchen connected to socket server with ID:', socket.id);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to real-time updates. Please refresh.');
    });
    
    socket.on('new_food_order', (orderItem) => {
      console.log('New food order received in Kitchen View:', orderItem);
      
      setOrders(prevOrders => {
        // Check if we already have an order with this ID
        const existingOrderIndex = prevOrders.findIndex(order => 
          order.orderId === orderItem.order_id
        );
        
        if (existingOrderIndex !== -1) {
          // Add item to existing order
          const updatedOrders = [...prevOrders];
          updatedOrders[existingOrderIndex].items.push({
            id: orderItem.item_id,
            name: orderItem.item_name,
            quantity: orderItem.quantity,
            status: orderItem.status,
            description: orderItem.item_description,
            image: orderItem.item_image
          });
          return updatedOrders;
        } else {
          // Create a new order
          return [...prevOrders, {
            orderId: orderItem.order_id,
            tableNumber: orderItem.table_number,
            orderTime: new Date(orderItem.order_time).toLocaleTimeString(),
            items: [{
              id: orderItem.item_id,
              name: orderItem.item_name,
              quantity: orderItem.quantity,
              status: orderItem.status,
              description: orderItem.item_description,
              image: orderItem.item_image
            }]
          }];
        }
      });
    });
    
    socket.on('order_item_updated', (updatedItem) => {
      if (updatedItem.item_type === 'food') {
        console.log('Food order item updated:', updatedItem);
        
        setOrders(prevOrders => 
          prevOrders.map(order => {
            // Find the order that contains this item
            const orderContainsItem = order.items.some(item => item.id === updatedItem.id);
            
            if (orderContainsItem) {
              // Update the item in this order
              return {
                ...order,
                items: order.items.map(item => 
                  item.id === updatedItem.id 
                    ? { 
                        ...item, 
                        status: updatedItem.status,
                        name: updatedItem.name || item.name,
                        description: updatedItem.description || item.description,
                        image: updatedItem.image || item.image
                      } 
                    : item
                )
              };
            }
            
            return order;
          })
        );
      }
    });
    
    return () => {
      console.log('Disconnecting Kitchen socket');
      socket.disconnect();
    };
  }, []);
  
  useEffect(() => {
    console.log('Fetching initial kitchen orders');
    const fetchOrders = async () => {
      try {
        setLoading(true);
        console.log('Making API request to', API_ENDPOINTS.KITCHEN_TERMINAL, 'with token');
        const response = await axios.get(API_ENDPOINTS.KITCHEN_TERMINAL, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('Kitchen orders API response:', response.data);
        console.log('Kitchen orders count:', response.data.length);
        
        // Group orders by order_id
        const groupedOrders = {};
        response.data.forEach(item => {
          if (!groupedOrders[item.order_id]) {
            groupedOrders[item.order_id] = {
              orderId: item.order_id,
              tableNumber: item.table_number,
              orderTime: new Date(item.order_time).toLocaleTimeString(),
              items: []
            };
          }
          
          console.log(`Adding item ${item.item_id} (${item.item_name}) to order ${item.order_id}`);
          groupedOrders[item.order_id].items.push({
            id: item.item_id,
            name: item.item_name,
            quantity: item.quantity,
            status: item.item_status,
            description: item.item_description,
            image: item.item_image
          });
        });
        
        const processedOrders = Object.values(groupedOrders);
        console.log('Processed kitchen orders:', processedOrders);
        console.log('Order count after processing:', processedOrders.length);
        setOrders(processedOrders);
        setError('');
      } catch (err) {
        console.error('Error fetching kitchen orders:', err);
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [token, refreshTime]);
  
  const handleStatusChange = async (itemId, newStatus) => {
    try {
      console.log(`[Kitchen] Changing item ${itemId} status to ${newStatus}`);
      await axios.put(`${API_ENDPOINTS.ORDER_ITEMS}/${itemId}/status`, {
        status: newStatus
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update local state
      setOrders(prevOrders => prevOrders.map(order => {
        const updatedOrder = {
          ...order,
          items: order.items.map(item => 
            item.id === itemId 
              ? { ...item, status: newStatus } 
              : item
          )
        };
        
        // Check if all items in the order are now ready, and not already scheduled
        const allItemsReady = updatedOrder.items.every(item => item.status === 'ready');
        if (allItemsReady && !updatedOrder.scheduledForHistory) {
          console.log(`[Kitchen] All items in order ${updatedOrder.orderId} are ready, scheduling for history`);
          // Schedule to move this order to history after 2 minutes
          moveToHistory(updatedOrder.orderId);
        }
        
        return updatedOrder;
      }));
    } catch (err) {
      setError('Failed to update item status');
      console.error('[Kitchen] Error updating item status:', err);
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'in-progress':
        return 'warning';
      case 'ready':
        return 'success';
      default:
        return 'default';
    }
  };

  // Filter orders based on the selected tab
  const filteredOrders = orders.filter(order => {
    if (tabValue === 0) return true; // All orders
    if (tabValue === 1) return order.items.some(item => item.status === 'pending'); // Pending
    if (tabValue === 2) return order.items.some(item => item.status === 'in-progress'); // In Progress
    if (tabValue === 3) return order.items.every(item => item.status === 'ready'); // Ready
    return true;
  });
  
  // Count orders by status for badge counts
  const pendingCount = orders.filter(order => order.items.some(item => item.status === 'pending')).length;
  const inProgressCount = orders.filter(order => order.items.some(item => item.status === 'in-progress')).length;
  const readyCount = orders.filter(order => order.items.every(item => item.status === 'ready')).length;
  
  if (loading && orders.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Loading orders...</Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      {/* Header with tabs and history button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Kitchen Orders
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<RefreshIcon />}
            onClick={() => setRefreshTime(Date.now())}
          >
            Refresh
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            startIcon={<HistoryIcon />}
            onClick={() => setHistoryDialogOpen(true)}
            sx={{ ml: 2 }}
          >
            Order History
          </Button>
        </Box>
      </Box>
      
      {/* Filter tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="fullWidth" 
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <span>All Orders</span>
                <Badge 
                  badgeContent={orders.length} 
                  color="primary" 
                  sx={{ ml: 1 }}
                />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <span>New Orders</span>
                <Badge 
                  badgeContent={pendingCount} 
                  color="error" 
                  sx={{ ml: 1 }}
                />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <span>In Progress</span>
                <Badge 
                  badgeContent={inProgressCount} 
                  color="warning" 
                  sx={{ ml: 1 }}
                />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <span>Ready</span>
                <Badge 
                  badgeContent={readyCount} 
                  color="success" 
                  sx={{ ml: 1 }}
                />
              </Box>
            } 
          />
        </Tabs>
      </Paper>
      
      {/* Error message */}
      {error && (
        <Box sx={{ p: 2, mb: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
      
      {/* No orders message */}
      {filteredOrders.length === 0 && !loading && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5">No {tabValue > 0 ? ['', 'pending', 'in-progress', 'ready'][tabValue] : ''} orders!</Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            New orders will appear here automatically.
          </Typography>
        </Box>
      )}
      
      {/* Orders Grid */}
      <Grid container spacing={3}>
        {filteredOrders.map(order => (
          <Grid item xs={12} md={6} lg={4} key={order.orderId}>
            <Card 
              elevation={3}
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                backgroundColor: '#fffaf0' // Slight cream color for kitchen orders
              }}
            >
              <CardHeader
                title={`Table ${order.tableNumber || 'N/A'}`}
                subheader={`Order #${order.orderId} - ${order.orderTime}`}
                sx={{ 
                  backgroundColor: '#f5f5f5',
                  '& .MuiCardHeader-title': {
                    fontWeight: 'bold'
                  }
                }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <List>
                  {order.items.map(item => (
                    <Box key={item.id}>
                      <ListItem 
                        secondaryAction={
                          <Chip 
                            label={item.status.toUpperCase()} 
                            color={getStatusColor(item.status)}
                            size="small"
                          />
                        }
                      >
                        <Avatar 
                          src={getItemImageUrl(item.image)} 
                          alt={item.name}
                          variant="rounded"
                          sx={{ mr: 2, width: 50, height: 50 }}
                        />
                        <ListItemText
                          primary={`${item.quantity}x ${item.name}`}
                          secondary={item.description}
                          primaryTypographyProps={{ fontWeight: item.status === 'pending' ? 'bold' : 'normal' }}
                        />
                      </ListItem>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, mr: 1 }}>
                        {item.status === 'pending' && (
                          <Button
                            size="small"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => handleStatusChange(item.id, 'in-progress')}
                          >
                            Start Preparing
                          </Button>
                        )}
                        {item.status === 'in-progress' && (
                          <Button
                            size="small"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleStatusChange(item.id, 'ready')}
                          >
                            Mark Ready
                          </Button>
                        )}
                      </Box>
                      <Divider />
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* History Dialog */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={() => setHistoryDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Order History</Typography>
            <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {historyOrders.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">No completed orders in history yet.</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Orders marked as ready will appear here after 2 minutes.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {historyOrders.map(order => (
                <Grid item xs={12} key={order.orderId}>
                  <Card sx={{ mb: 2 }}>
                    <CardHeader
                      title={`Order #${order.orderId} - Table ${order.tableNumber}`}
                      subheader={`Ordered: ${order.orderTime} | Completed: ${order.completedAt}`}
                    />
                    <CardContent>
                      <List dense>
                        {order.items.map(item => (
                          <ListItem key={item.id}>
                            <Avatar 
                              src={getItemImageUrl(item.image)} 
                              variant="rounded"
                              sx={{ mr: 2, width: 40, height: 40 }}
                            />
                            <ListItemText 
                              primary={item.name} 
                              secondary={`Quantity: ${item.quantity}`} 
                            />
                            <Chip label="Completed" color="success" size="small" />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
} 