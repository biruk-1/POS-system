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

// Mock data for report
const mockSalesData = [
  { id: 1, date: '2023-07-01', orders: 42, revenue: 1680.50, avgOrder: 40.01, topItem: 'Chicken Burger' },
  { id: 2, date: '2023-07-02', orders: 38, revenue: 1520.75, avgOrder: 40.02, topItem: 'Margarita' },
  { id: 3, date: '2023-07-03', orders: 45, revenue: 1890.25, avgOrder: 42.01, topItem: 'Steak Platter' },
  { id: 4, date: '2023-07-04', orders: 56, revenue: 2485.50, avgOrder: 44.38, topItem: 'Mojito' },
  { id: 5, date: '2023-07-05', orders: 32, revenue: 1280.75, avgOrder: 40.02, topItem: 'Fried Calamari' },
  { id: 6, date: '2023-07-06', orders: 41, revenue: 1845.25, avgOrder: 45.01, topItem: 'Seafood Pasta' },
  { id: 7, date: '2023-07-07', orders: 58, revenue: 2590.50, avgOrder: 44.66, topItem: 'Chocolate Cake' },
];

export default function Reports() {
  const theme = useTheme();
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [reportData, setReportData] = useState(mockSalesData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      console.log('Generating report with parameters:', {
        reportType,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      
      const response = await axios.post('http://localhost:5001/api/reports/generate', {
        reportType,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      setReportData(response.data);
      setSuccess('Report generated successfully!');
    } catch (err) {
      console.error('Failed to generate report:', err);
      
      // More descriptive error message based on error type
      if (err.response) {
        // The server responded with an error status code
        setError(`Server error: ${err.response.data?.error || err.response.statusText || 'Unknown error'}`);
      } else if (err.request) {
        // The request was made but no response was received
        setError('Failed to connect to the server. Please check your connection.');
      } else {
        // Something happened in setting up the request
        setError(`Failed to generate report: ${err.message}`);
      }
      
      // Fallback to mock data if API fails
      setReportData(mockSalesData);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for calculating report summary values
  const calculateTotalRevenue = () => {
    if (reportData.length === 0) return 0;
    return reportData.reduce((total, row) => total + (Number(row.revenue) || 0), 0);
  };

  const calculateTotalOrders = () => {
    if (reportData.length === 0) return 0;
    
    if (reportType === 'sales') {
      return reportData.reduce((total, row) => total + (Number(row.orders) || 0), 0);
    } else if (reportType === 'items' || reportType === 'drinks') {
      return reportData.reduce((total, row) => total + (Number(row.count) || 0), 0);
    } else if (reportType === 'staff') {
      return reportData.reduce((total, row) => total + (Number(row.orders) || 0), 0);
    }
    
    return 0;
  };

  const calculateAverageOrderValue = () => {
    const totalOrders = calculateTotalOrders();
    const totalRevenue = calculateTotalRevenue();
    
    if (totalOrders === 0) return 0;
    return totalRevenue / totalOrders;
  };

  const findTopSellingItem = () => {
    if (reportData.length === 0 || reportType !== 'sales') return 'N/A';
    
    // Find the most frequent topItem
    const topItems = reportData
      .filter(row => row.topItem)
      .map(row => row.topItem);
      
    if (topItems.length === 0) return 'N/A';
    
    const itemCounts = {};
    topItems.forEach(item => {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
    
    const topItem = Object.keys(itemCounts).reduce((a, b) => 
      itemCounts[a] > itemCounts[b] ? a : b
    );
    
    return topItem || 'N/A';
  };

  const getReportTitle = () => {
    switch(reportType) {
      case 'sales':
        return 'Sales Data';
      case 'items':
        return 'Food Items Report';
      case 'drinks':
        return 'Drinks Report';
      case 'staff':
        return 'Staff Performance';
      default:
        return 'Report Data';
    }
  };

  function createSalesChart() {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={reportData}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis 
            tickFormatter={(value) => `Br ${value}`} 
          />
          <RechartsTooltip 
            formatter={(value) => [`${formatCurrency(value)}`, 'Revenue']} 
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={theme.palette.primary.main}
            activeDot={{ r: 8 }}
          />
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
              {reportData.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No data found for the selected time period
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer component={Paper} elevation={0}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          {reportType === 'sales' && (
                            <>
                              <TableCell align="right">Orders</TableCell>
                              <TableCell align="right">Revenue</TableCell>
                              <TableCell align="right">Avg. Order Value</TableCell>
                              <TableCell>Top Selling Item</TableCell>
                            </>
                          )}
                          {reportType === 'items' && (
                            <>
                              <TableCell align="right">Count</TableCell>
                              <TableCell align="right">Revenue</TableCell>
                            </>
                          )}
                          {reportType === 'drinks' && (
                            <>
                              <TableCell align="right">Count</TableCell>
                              <TableCell align="right">Revenue</TableCell>
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
                        {reportData
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((row) => (
                            <TableRow key={row.id}>
                              {reportType === 'staff' ? (
                                <TableCell>{row.staff}</TableCell>
                              ) : (
                                <TableCell>{row.date}</TableCell>
                              )}
                              
                              {reportType === 'sales' && (
                                <>
                                  <TableCell align="right">{row.orders || 0}</TableCell>
                                  <TableCell align="right">${(row.revenue || 0).toFixed(2)}</TableCell>
                                  <TableCell align="right">${(row.avgOrder || 0).toFixed(2)}</TableCell>
                                  <TableCell>{row.topItem || 'N/A'}</TableCell>
                                </>
                              )}
                              
                              {reportType === 'items' && (
                                <>
                                  <TableCell align="right">{row.count || 0}</TableCell>
                                  <TableCell align="right">${(row.revenue || 0).toFixed(2)}</TableCell>
                                </>
                              )}
                              
                              {reportType === 'drinks' && (
                                <>
                                  <TableCell align="right">{row.count || 0}</TableCell>
                                  <TableCell align="right">${(row.revenue || 0).toFixed(2)}</TableCell>
                                </>
                              )}
                              
                              {reportType === 'staff' && (
                                <>
                                  <TableCell>{row.role || 'N/A'}</TableCell>
                                  <TableCell align="right">{row.orders || 0}</TableCell>
                                  <TableCell align="right">${(row.revenue || 0).toFixed(2)}</TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={reportData.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 