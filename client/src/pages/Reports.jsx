import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

function Reports() {
  const [dailyReport, setDailyReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetchDailyReport();
    fetchSalesData();
    fetchTopProducts();
  }, [selectedDate]);

  const fetchDailyReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/reports/daily?date=${selectedDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDailyReport(response.data);
    } catch (error) {
      console.error('Error fetching daily report:', error);
    }
  };

  const fetchSalesData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/reports/sales',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSalesData(response.data);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  const fetchTopProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/reports/top-products',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTopProducts(response.data);
    } catch (error) {
      console.error('Error fetching top products:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Daily Report
            </Typography>
            <TextField
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            {dailyReport && (
              <Box>
                <Typography>
                  Total Sales: ${dailyReport.total_sales.toFixed(2)}
                </Typography>
                <Typography>
                  Total Orders: {dailyReport.total_orders}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Products
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Quantity Sold</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell align="right">
                        {product.quantity_sold}
                      </TableCell>
                      <TableCell align="right">
                        ${product.revenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sales Trend
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={salesData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#8884d8"
                    name="Sales ($)"
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#82ca9d"
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Reports; 