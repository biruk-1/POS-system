import { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import StatCard from '../components/StatCard';
import { formatCurrency } from '../utils/currencyFormatter';
import { 
  getOrderById, 
  updateOrderStatusOffline, 
  syncWithServer,
  isOnline 
} from '../services/offlineService';

const API_URL = 'http://localhost:5001/api';

function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    recentOrders: [],
  });
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncWithServer().catch(console.error);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No auth token found');
        }

        if (!isOffline) {
          const [ordersRes, productsRes] = await Promise.all([
            axios.get(`${API_URL}/orders`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`${API_URL}/products`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          const orders = ordersRes.data;
          const products = productsRes.data;

          const totalSales = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
          const recentOrders = orders.slice(0, 5);

          setStats({
            totalSales,
            totalOrders: orders.length,
            totalProducts: products.length,
            recentOrders,
          });
          setOrders(orders);
        } else {
          // Load from IndexedDB when offline
          const offlineOrders = await getOrderById('all');
          const totalSales = offlineOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
          const recentOrders = offlineOrders.slice(0, 5);

          setStats({
            totalSales,
            totalOrders: offlineOrders.length,
            totalProducts: 0, // We don't store products offline
            recentOrders,
          });
          setOrders(offlineOrders);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to fetch dashboard data');
      }
    };

    fetchStats();
  }, [isOffline]);

  const handleSubmitStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      const orderId = selectedOrder?.id;
      if (!orderId) {
        throw new Error('No order selected');
      }

      if (isOffline) {
        try {
          // Handle offline update
          const updatedOrder = await updateOrderStatusOffline(orderId, newStatus);
          if (!updatedOrder) {
            throw new Error('Failed to update order status offline');
          }
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === orderId ? updatedOrder : order
            )
          );
          setShowStatusModal(false);
          return;
        } catch (offlineError) {
          console.error('Offline update failed:', offlineError);
          setError('Failed to update order status offline. Please try again when online.');
          return;
        }
      }

      // Online update
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token found');
      }

      try {
        const response = await axios.patch(
          `${API_URL}/orders/${orderId}/status`,
          { status: newStatus },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data) {
          setOrders(prevOrders =>
            prevOrders.map(order =>
              order.id === orderId ? { ...order, status: newStatus } : order
            )
          );
          setShowStatusModal(false);
        }
      } catch (onlineError) {
        console.error('Online update failed:', onlineError);
        // Fallback to offline update if online update fails
        try {
          const updatedOrder = await updateOrderStatusOffline(orderId, newStatus);
          if (updatedOrder) {
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === orderId ? updatedOrder : order
              )
            );
            setShowStatusModal(false);
            setError('Server unavailable. Changes saved offline and will sync when online.');
          }
        } catch (fallbackError) {
          console.error('Fallback update failed:', fallbackError);
          setError('Failed to update order status. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setError(error.message || 'Failed to update order status');
    }
  };

  const handleUpdateOrderStatus = async (orderId) => {
    try {
      let order;
      if (isOffline) {
        try {
          order = await getOrderById(orderId);
          if (!order) {
            throw new Error('Order not found in offline storage');
          }
        } catch (offlineError) {
          console.error('Error fetching order offline:', offlineError);
          setError('Order not found in offline storage');
          return;
        }
      } else {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No auth token found');
        }

        try {
          const response = await axios.get(`${API_URL}/orders/${orderId}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          order = response.data;
        } catch (onlineError) {
          console.error('Error fetching order online:', onlineError);
          // Fallback to offline data if online fetch fails
          try {
            order = await getOrderById(orderId);
            if (!order) {
              throw new Error('Order not found in offline storage');
            }
            setError('Server unavailable. Using offline data.');
          } catch (fallbackError) {
            console.error('Error fetching order from fallback:', fallbackError);
            setError('Failed to fetch order details. Please try again later.');
            return;
          }
        }
      }

      if (order) {
        setSelectedOrder(order);
        setNewStatus(order.status || 'pending');
        setShowStatusModal(true);
      } else {
        throw new Error('Order not found');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError(error.message || 'Failed to fetch order details');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard {isOffline && '(Offline Mode)'}
      </Typography>
      {error && (
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
      )}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Total Sales"
            value={formatCurrency(stats.totalSales)}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Orders
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.recentOrders}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_amount" fill="#8884d8" name="Order Amount" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={showStatusModal} onClose={() => setShowStatusModal(false)}>
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="preparing">Preparing</MenuItem>
              <MenuItem value="ready">Ready</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStatusModal(false)}>Cancel</Button>
          <Button onClick={handleSubmitStatusUpdate} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard; 