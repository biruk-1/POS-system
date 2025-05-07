import { useState } from 'react';
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
  useTheme
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3, color: theme.palette.roles.admin }}>
        Reports
      </Typography>
      
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
                    >
                      Generate Report
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
                $12,345.67
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
                312
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
                $39.57
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
                Steak Platter
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
              title="Sales Data" 
              subheader={`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`} 
            />
            <Divider />
            <CardContent>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Orders</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Avg. Order Value</TableCell>
                      <TableCell>Top Selling Item</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockSalesData
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.date}</TableCell>
                          <TableCell align="right">{row.orders}</TableCell>
                          <TableCell align="right">${row.revenue.toFixed(2)}</TableCell>
                          <TableCell align="right">${row.avgOrder.toFixed(2)}</TableCell>
                          <TableCell>{row.topItem}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={mockSalesData.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 