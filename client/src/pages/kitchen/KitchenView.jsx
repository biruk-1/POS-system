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
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../../config/api';

export default function KitchenView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshTime, setRefreshTime] = useState(Date.now());
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTime(Date.now());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_ENDPOINTS.KITCHEN_TERMINAL, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
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
          
          groupedOrders[item.order_id].items.push({
            id: item.item_id,
            name: item.item_name,
            quantity: item.quantity,
            status: item.item_status,
            description: item.item_description
          });
        });
        
        setOrders(Object.values(groupedOrders));
        setError('');
      } catch (err) {
        setError('Failed to load orders. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [token, refreshTime]);
  
  const handleStatusChange = async (itemId, newStatus) => {
    try {
      await axios.put(`${API_ENDPOINTS.ORDER_ITEMS}/${itemId}/status`, {
        status: newStatus
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update local state
      setOrders(orders.map(order => ({
        ...order,
        items: order.items.map(item => 
          item.id === itemId 
            ? { ...item, status: newStatus } 
            : item
        )
      })));
    } catch (err) {
      setError('Failed to update item status');
      console.error(err);
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
  
  if (loading && orders.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Loading orders...</Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  if (orders.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">No pending food orders!</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          New orders will appear here automatically.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Kitchen Orders
      </Typography>
      
      <Grid container spacing={3}>
        {orders.map(order => (
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
    </Box>
  );
} 