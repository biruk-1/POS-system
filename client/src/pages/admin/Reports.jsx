import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  useTheme,
  Alert
} from '@mui/material';
import { 
  Download as DownloadIcon,
  Print as PrintIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Fastfood as FastfoodIcon,
  LocalBar as LocalBarIcon 
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import axios from 'axios';
import { formatCurrency } from '../../utils/currencyFormatter';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { io } from 'socket.io-client';
// Import socket from utils if available
// import { socket } from '../../utils/socket';

export default function Reports() {
  const theme = useTheme();
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5001');
    setSocket(newSocket);

    // Clean up the socket connection when the component unmounts
    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for admin_sales_updated event
    socket.on('admin_sales_updated', (data) => {
      console.log('Received sales update:', data);
      generateReport(); // Refresh report data when sales are updated
    });

    return () => {
      socket.off('admin_sales_updated');
    };
  }, [socket, reportType, dateRange, startDate, endDate]);

  // Automatically generate report when reportType or date range changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dateRange !== 'custom') {
        generateReport();
      }
    }, 500); // Add a small delay to prevent too many API calls during date changes
    
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, dateRange]); // Only re-run when report type or date range selection changes

  // Load initial report on component mount
  useEffect(() => {
    generateReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleReportTypeChange = (event) => {
    setReportType(event.target.value);
  };

  const handleDateRangeChange = (event) => {
    const value = event.target.value;
    setDateRange(value);
    
    const now = new Date();
    let start = new Date();
    
    switch(value) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        start = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        start = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        // custom range - don't change dates
        return;
    }
    
    setStartDate(start);
    setEndDate(new Date());
  };

  const getReportIcon = () => {
    switch(reportType) {
      case 'sales':
        return <AttachMoneyIcon sx={{ color: theme.palette.roles.admin }}/>;
      case 'items':
        return <FastfoodIcon sx={{ color: theme.palette.roles.admin }}/>;
      case 'drinks':
        return <LocalBarIcon sx={{ color: theme.palette.roles.admin }}/>;
      default:
        return <BarChartIcon sx={{ color: theme.palette.roles.admin }}/>;
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const params = {
        reportType,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        detailLevel: 'daily'
      };
      
      console.log('Generating report with parameters:', params);
      
      const response = await axios.post('http://localhost:5001/api/reports/generate', params, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      if (response.data && response.data.data) {
        setReportData(response.data.data);
      setSuccess('Report generated successfully!');
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      
      // Handle specific error cases
      if (error.response) {
        // Server responded with an error
        const errorMessage = error.response.data.error || 'Failed to generate report';
        const errorDetails = error.response.data.details;
        
        if (errorDetails) {
          // Handle validation errors
          const validationErrors = Object.entries(errorDetails)
            .filter(([_, value]) => value !== null)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          
          setError(`Validation error: ${validationErrors}`);
        } else {
          setError(errorMessage);
        }
      } else if (error.request) {
        // Request was made but no response received
        setError('No response from server. Please check your connection.');
      } else {
        // Something else happened
        setError(error.message || 'An unexpected error occurred');
      }
      
      // Set placeholder data based on report type
        const today = new Date().toISOString().split('T')[0];
        let placeholderData = [];
        
      switch (reportType) {
        case 'sales':
          placeholderData = [{
            id: 1,
            date: today,
            orders: 0,
            revenue: 0,
            avgOrder: 0,
            topItem: 'N/A'
          }];
          break;
        case 'items':
          placeholderData = [{
            id: 1,
            name: 'No items found',
            quantity: 0,
            total_sales: 0,
            order_count: 0
          }];
          break;
        case 'drinks':
          placeholderData = [{
            id: 1,
            name: 'No drinks found',
            quantity: 0,
            total_sales: 0,
            order_count: 0
          }];
          break;
        default:
          placeholderData = [];
      }
      
      setReportData(placeholderData);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for calculating report summary values
  const calculateTotalRevenue = () => {
    // First check if we have a metadata object with totalRevenue
    if (reportData && reportData.metadata && reportData.metadata.totalRevenue !== undefined) {
      return reportData.metadata.totalRevenue;
    }
    
    // If not, calculate from data array (handling both new and old formats)
    const dataArray = Array.isArray(reportData) ? reportData : (reportData.data || []);
    return dataArray.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0);
  };

  const calculateTotalOrders = () => {
    // First check if we have a metadata object with totalOrders
    if (reportData && reportData.metadata && reportData.metadata.totalOrders !== undefined) {
      return reportData.metadata.totalOrders;
    }
    
    // If not, calculate from data array (handling both new and old formats)
    const dataArray = Array.isArray(reportData) ? reportData : (reportData.data || []);
    return dataArray.reduce((sum, item) => {
      // First check for the right property based on report type
      if (reportType === 'sales' || reportType === 'staff') {
        return sum + (parseInt(item.orders) || 0);
      } else if (reportType === 'items' || reportType === 'drinks') {
        return sum + (parseInt(item.count) || 0);
    }
      return sum;
    }, 0);
  };

  const calculateAverageOrderValue = () => {
    // If we have metadata, prefer that
    if (reportData && reportData.metadata && reportData.metadata.totalRevenue !== undefined && 
        reportData.metadata.totalOrders !== undefined && reportData.metadata.totalOrders > 0) {
      return reportData.metadata.totalRevenue / reportData.metadata.totalOrders;
    }
    
    // If not, calculate manually
    const totalRevenue = calculateTotalRevenue();
    const totalOrders = calculateTotalOrders();
    return totalOrders > 0 ? totalRevenue / totalOrders : 0;
  };

  const findTopSellingItem = () => {
    const dataArray = Array.isArray(reportData) ? reportData : (reportData.data || []);
    
    if (dataArray.length === 0) return 'No data';
      
    // First, try to get top item from the first record's topItem property
    if (dataArray[0].topItem) return dataArray[0].topItem;
    
    // If that's not available, calculate it (this is fallback logic)
    if (reportType === 'sales') {
      // For sales reports, find the most common topItem across all dates
    const itemCounts = {};
      dataArray.forEach(day => {
        if (day.topItem && day.topItem !== 'N/A') {
          itemCounts[day.topItem] = (itemCounts[day.topItem] || 0) + 1;
        }
      });
      
      if (Object.keys(itemCounts).length === 0) return 'N/A';
      
      return Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0])[0];
    } else if (reportType === 'items' || reportType === 'drinks') {
      // For item reports, either use the pre-calculated topItem or find the highest revenue item
      const topRevenueItem = dataArray.sort((a, b) => b.revenue - a.revenue)[0];
      return topRevenueItem.name || topRevenueItem.topItem || 'N/A';
    }
    
    return 'N/A';
  };

  const getReportTitle = () => {
    let title = '';
    let timeRangeText = '';
    
    switch (dateRange) {
      case 'today':
        timeRangeText = 'Today';
        break;
      case 'week':
        timeRangeText = 'Last 7 Days';
        break;
      case 'month':
        timeRangeText = 'Last 30 Days';
        break;
      case 'year':
        timeRangeText = 'Last 12 Months';
        break;
      case 'custom':
        timeRangeText = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
        break;
      default:
        timeRangeText = 'All Time';
    }
    
    switch (reportType) {
      case 'sales':
        title = `Sales Report - ${timeRangeText}`;
        break;
      case 'items':
        title = `Food Items Report - ${timeRangeText}`;
        break;
      case 'drinks':
        title = `Beverages Report - ${timeRangeText}`;
        break;
      case 'staff':
        title = `Staff Performance Report - ${timeRangeText}`;
        break;
      default:
        title = `Business Report - ${timeRangeText}`;
    }
    
    return title;
  };

  function createSalesChart() {
    const dataArray = Array.isArray(reportData) ? reportData : (reportData.data || []);
    if (dataArray.length === 0) return null;
    
    // Create a copy of the data for the chart
    const chartData = [...dataArray].reverse().map(item => ({
      name: item.date,
      revenue: parseFloat(item.revenue || 0).toFixed(2),
      orders: parseInt(item.orders || item.count || 0)
    }));
    
    // Limit to prevent chart overcrowding
    const limitedChartData = chartData.slice(0, 10);
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={limitedChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <Line type="monotone" dataKey="revenue" stroke={theme.palette.primary.main} name="Revenue" />
          <Line type="monotone" dataKey="orders" stroke={theme.palette.secondary.main} name="Orders" />
          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
          <XAxis dataKey="name" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3, color: theme.palette.roles.admin }}>
        Reports
      </Typography>
      
      {/* Error and Success Alerts */}
      {error && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Box>
      )}
      
      {success && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Box>
      )}
      
      <Grid container spacing={3}>
        {/* Report Controls */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Report Type</InputLabel>
                    <Select
                      value={reportType}
                      onChange={handleReportTypeChange}
                      label="Report Type"
                    >
                      <MenuItem value="sales">Sales Report</MenuItem>
                      <MenuItem value="items">Food Items Report</MenuItem>
                      <MenuItem value="drinks">Drinks Report</MenuItem>
                      <MenuItem value="staff">Staff Performance</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Date Range</InputLabel>
                    <Select
                      value={dateRange}
                      onChange={handleDateRangeChange}
                      label="Date Range"
                    >
                      <MenuItem value="today">Today</MenuItem>
                      <MenuItem value="week">Last 7 Days</MenuItem>
                      <MenuItem value="month">Last 30 Days</MenuItem>
                      <MenuItem value="year">Last Year</MenuItem>
                      <MenuItem value="custom">Custom Range</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {dateRange === 'custom' && (
                  <>
                    <Grid item xs={12} md={2}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          label="Start Date"
                          value={startDate}
                          onChange={(newValue) => setStartDate(newValue)}
                          renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                      </LocalizationProvider>
                    </Grid>
                    
                    <Grid item xs={12} md={2}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          label="End Date"
                          value={endDate}
                          onChange={(newValue) => setEndDate(newValue)}
                          renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                      </LocalizationProvider>
                    </Grid>
                  </>
                )}
                
                <Grid item xs={12} md={dateRange === 'custom' ? 2 : 6}>
                  <Box display="flex" justifyContent="flex-end">
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={getReportIcon()}
                      sx={{ mr: 1 }}
                      onClick={generateReport}
                      disabled={loading}
                    >
                      {loading ? 'Generating...' : 'Generate Report'}
                    </Button>
                    <Tooltip title="Export as CSV">
                      <IconButton color="primary">
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Print Report">
                      <IconButton color="primary">
                        <PrintIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Report Summary */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.roles.admin + '10' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AttachMoneyIcon sx={{ fontSize: 48, color: theme.palette.roles.admin, mb: 1 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {formatCurrency(calculateTotalRevenue())}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <BarChartIcon sx={{ fontSize: 48, color: theme.palette.info.main, mb: 1 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {calculateTotalOrders()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 48, color: theme.palette.success.main, mb: 1 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                ${calculateAverageOrderValue().toFixed(2)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Average Order Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <FastfoodIcon sx={{ fontSize: 48, color: theme.palette.warning.main, mb: 1 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {findTopSellingItem()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Top Selling Item
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Report Data Table */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title={getReportTitle()}
              subheader={`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`} 
            />
            <Divider />
            <CardContent>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table sx={{ minWidth: 650 }} aria-label="report data table">
                  <TableHead sx={{ backgroundColor: theme.palette.background.neutral }}>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          {reportType === 'sales' && (
                            <>
                              <TableCell align="right">Orders</TableCell>
                              <TableCell align="right">Revenue</TableCell>
                          <TableCell align="right">Avg. Order</TableCell>
                          <TableCell>Top Item</TableCell>
                            </>
                          )}
                      {(reportType === 'items' || reportType === 'drinks') && (
                            <>
                          <TableCell align="right">Quantity</TableCell>
                              <TableCell align="right">Revenue</TableCell>
                          <TableCell>Top Item</TableCell>
                            </>
                          )}
                          {reportType === 'staff' && (
                            <>
                              <TableCell>Staff</TableCell>
                              <TableCell>Role</TableCell>
                              <TableCell align="right">Orders</TableCell>
                              <TableCell align="right">Revenue</TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                    {(Array.isArray(reportData) ? reportData : (reportData.data || []))
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((row) => (
                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell component="th" scope="row">
                            {row.date}
                          </TableCell>
                              
                              {reportType === 'sales' && (
                                <>
                              <TableCell align="right">{row.orders}</TableCell>
                              <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                              <TableCell align="right">{formatCurrency(row.avgOrder)}</TableCell>
                                  <TableCell>{row.topItem || 'N/A'}</TableCell>
                                </>
                              )}
                              
                          {(reportType === 'items' || reportType === 'drinks') && (
                                <>
                              <TableCell align="right">{row.count}</TableCell>
                              <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                              <TableCell>{row.topItem || 'N/A'}</TableCell>
                                </>
                              )}
                              
                              {reportType === 'staff' && (
                                <>
                              <TableCell>{row.staff}</TableCell>
                              <TableCell>{row.role}</TableCell>
                              <TableCell align="right">{row.orders}</TableCell>
                              <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                    
                    {(Array.isArray(reportData) ? reportData : (reportData.data || [])).length === 0 && (
                      <TableRow style={{ height: 53 }}>
                        <TableCell colSpan={reportType === 'sales' ? 5 : (reportType === 'staff' ? 4 : 3)} align="center">
                          No data available for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                      </TableBody>
                    </Table>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                  count={(Array.isArray(reportData) ? reportData : (reportData.data || [])).length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 