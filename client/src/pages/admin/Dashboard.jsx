import { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  LinearProgress,
  Stack,
  useTheme,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Restaurant as RestaurantIcon,
  LocalBar as DrinkIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import axios from 'axios';

// Mock data for demonstration - would be replaced with real API calls
const generateMockData = () => {
  // Mock sales data (last 7 days)
  const salesData = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayName = dayNames[date.getDay()];
    
    salesData.push({
      day: dayName,
      sales: Math.floor(Math.random() * 1000) + 500,
      orders: Math.floor(Math.random() * 20) + 10,
    });
  }
  
  // Mock item sales (pie chart)
  const categoryData = [
    { name: 'Main Dishes', value: Math.floor(Math.random() * 200) + 100 },
    { name: 'Appetizers', value: Math.floor(Math.random() * 150) + 50 },
    { name: 'Desserts', value: Math.floor(Math.random() * 100) + 30 },
    { name: 'Drinks', value: Math.floor(Math.random() * 180) + 90 },
    { name: 'Specials', value: Math.floor(Math.random() * 80) + 20 },
  ];
  
  // Recent orders
  const statusOptions = ['Completed', 'In Progress', 'Pending'];
  const tableOptions = Array.from({ length: 10 }, (_, i) => i + 1);
  
  const recentOrders = Array.from({ length: 5 }, (_, i) => ({
    id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    table: tableOptions[Math.floor(Math.random() * tableOptions.length)],
    items: Math.floor(Math.random() * 10) + 1,
    amount: Math.floor(Math.random() * 200) + 20,
    status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
    time: `${Math.floor(Math.random() * 50) + 10} min ago`,
  }));
  
  // Active staff
  const roles = ['Waiter', 'Cashier', 'Kitchen', 'Bartender'];
  const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Robert Brown', 'Lisa Davis'];
  
  const activeStaff = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: names[Math.floor(Math.random() * names.length)],
    role: roles[Math.floor(Math.random() * roles.length)],
    status: Math.random() > 0.3 ? 'Active' : 'On Break',
    orders: Math.floor(Math.random() * 15),
  }));
  
  return {
    salesData,
    categoryData,
    recentOrders,
    activeStaff,
    totalSales: salesData.reduce((sum, day) => sum + day.sales, 0),
    totalOrders: salesData.reduce((sum, day) => sum + day.orders, 0),
    totalItems: categoryData.reduce((sum, category) => sum + category.value, 0),
    totalStaff: activeStaff.length,
  };
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  
  // Color scheme for charts
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
  ];

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await axios.get('/api/dashboard/stats');
        // setData(response.data);
        
        // Using mock data for demonstration
        setTimeout(() => {
          setData(generateMockData());
          setLoading(false);
          setRefreshing(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
  }, [refreshing]);

  const handleRefresh = () => {
    setRefreshing(true);
    setData(generateMockData());
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'warning';
      case 'Pending':
        return 'error';
      case 'Active':
        return 'success';
      case 'On Break':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          Dashboard Overview
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.primary.main}15 100%)`,
            border: `1px solid ${theme.palette.primary.light}30`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: `${theme.palette.primary.main}20`,
                borderRadius: '50%',
                width: 100,
                height: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MoneyIcon sx={{ fontSize: 40, color: theme.palette.primary.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="primary.main" variant="overline">
                Total Sales
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                ${data.totalSales.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                +15% from last week
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.secondary.light}15 0%, ${theme.palette.secondary.main}15 100%)`,
            border: `1px solid ${theme.palette.secondary.light}30`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: `${theme.palette.secondary.main}20`,
                borderRadius: '50%',
                width: 100,
                height: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <CartIcon sx={{ fontSize: 40, color: theme.palette.secondary.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="secondary.main" variant="overline">
                Total Orders
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {data.totalOrders}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                +8% from last week
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.success.light}15 0%, ${theme.palette.success.main}15 100%)`,
            border: `1px solid ${theme.palette.success.light}30`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: `${theme.palette.success.main}20`,
                borderRadius: '50%',
                width: 100,
                height: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <RestaurantIcon sx={{ fontSize: 40, color: theme.palette.success.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="success.main" variant="overline">
                Items Sold
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {data.totalItems}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                +12% from last week
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.info.light}15 0%, ${theme.palette.info.main}15 100%)`,
            border: `1px solid ${theme.palette.info.light}30`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: `${theme.palette.info.main}20`,
                borderRadius: '50%',
                width: 100,
                height: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <PersonIcon sx={{ fontSize: 40, color: theme.palette.info.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="info.main" variant="overline">
                Active Staff
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {data.activeStaff.filter(staff => staff.status === 'Active').length}/{data.totalStaff}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round((data.activeStaff.filter(staff => staff.status === 'Active').length / data.totalStaff) * 100)}% attendance rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts & Tables */}
      <Grid container spacing={3}>
        {/* Sales Chart */}
        <Grid item xs={12} lg={8}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardHeader
              title="Sales Overview"
              subheader="Last 7 days performance"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <Divider />
            <CardContent>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.salesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" orientation="left" stroke={theme.palette.primary.main} />
                    <YAxis yAxisId="right" orientation="right" stroke={theme.palette.secondary.main} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: 8, 
                        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(0,0,0,0.1)',
                        border: 'none'
                      }} 
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="sales"
                      name="Sales ($)"
                      stroke={theme.palette.primary.main}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      name="Orders"
                      stroke={theme.palette.secondary.main}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} md={6} lg={4}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardHeader
              title="Sales by Category"
              subheader="Distribution of items sold"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <Divider />
            <CardContent>
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} items`, name]}
                      contentStyle={{ 
                        borderRadius: 8, 
                        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(0,0,0,0.1)',
                        border: 'none'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Orders Table */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardHeader
              title="Recent Orders"
              subheader="Latest customer orders"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <Divider />
            <TableContainer sx={{ maxHeight: 350 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Table</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell component="th" scope="row">
                        <Typography variant="body2" fontWeight="medium">
                          {order.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.items} items
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={`Table ${order.table}`} 
                          color="primary" 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          ${order.amount}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={order.status}
                          color={getStatusColor(order.status)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                          <TimerIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {order.time}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider />
            <Box sx={{ p: 1.5 }} display="flex" justifyContent="center">
              <Button
                size="small"
                color="primary"
              >
                View All Orders
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Active Staff */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardHeader
              title="Active Staff"
              subheader="Currently working staff members"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <Divider />
            <TableContainer sx={{ maxHeight: 350 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Staff</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Orders</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.activeStaff.map((staff) => (
                    <TableRow key={staff.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              backgroundColor: 
                                staff.role === 'Waiter' ? theme.palette.roles?.waiter : 
                                staff.role === 'Cashier' ? theme.palette.roles?.cashier : 
                                staff.role === 'Kitchen' ? theme.palette.roles?.kitchen : 
                                theme.palette.roles?.bartender,
                              mr: 1.5
                            }}
                          >
                            {staff.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" fontWeight="medium">
                            {staff.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={staff.role}
                          sx={{
                            backgroundColor: 
                              staff.role === 'Waiter' ? theme.palette.roles?.waiter + '20' : 
                              staff.role === 'Cashier' ? theme.palette.roles?.cashier + '20' : 
                              staff.role === 'Kitchen' ? theme.palette.roles?.kitchen + '20' : 
                              theme.palette.roles?.bartender + '20',
                            color: 
                              staff.role === 'Waiter' ? theme.palette.roles?.waiter : 
                              staff.role === 'Cashier' ? theme.palette.roles?.cashier : 
                              staff.role === 'Kitchen' ? theme.palette.roles?.kitchen : 
                              theme.palette.roles?.bartender,
                            fontWeight: 'medium'
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={staff.status}
                          color={getStatusColor(staff.status)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Typography variant="body2" fontWeight="medium" sx={{ mr: 1 }}>
                            {staff.orders}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(staff.orders / 15) * 100}
                            sx={{
                              width: 50,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: theme.palette.grey[200],
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                              },
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider />
            <Box sx={{ p: 1.5 }} display="flex" justifyContent="center">
              <Button
                size="small"
                color="primary"
              >
                Manage Staff
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 