import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Email as EmailIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

// Mock data for demonstration
const generateMockReceipt = (orderId) => {
  return {
    id: `ORD-${orderId}`,
    date: new Date().toLocaleString(),
    table: Math.floor(Math.random() * 20) + 1,
    waiter: 'John Doe',
    status: 'Completed',
    items: [
      { id: 1, name: 'Chicken Burger', quantity: 2, price: 12.99, item_type: 'food', subtotal: 25.98 },
      { id: 2, name: 'French Fries', quantity: 1, price: 4.99, item_type: 'food', subtotal: 4.99 },
      { id: 3, name: 'Cola', quantity: 2, price: 2.99, item_type: 'drink', subtotal: 5.98 },
      { id: 4, name: 'Ice Cream', quantity: 1, price: 5.99, item_type: 'food', subtotal: 5.99 }
    ],
    subtotal: 42.94,
    tax: 3.65,
    serviceCharge: 4.29,
    total: 50.88,
    paymentMethod: 'Credit Card',
    paymentStatus: 'Paid'
  };
};

export default function Receipt() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const token = useSelector((state) => state.auth.token);
  
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        setLoading(true);
        // In a real app, this would be an API call
        // const response = await axios.get(`http://localhost:5000/api/orders/${orderId}`, {
        //   headers: {
        //     Authorization: `Bearer ${token}`
        //   }
        // });
        // setReceipt(response.data);
        
        // Using mock data for demonstration
        setTimeout(() => {
          setReceipt(generateMockReceipt(orderId));
          setLoading(false);
        }, 800);
      } catch (err) {
        console.error('Failed to fetch receipt data:', err);
        setError('Failed to load receipt data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchReceiptData();
  }, [orderId, token]);
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleEmailReceipt = () => {
    // In a real app, this would send the receipt via email
    alert('Email receipt functionality would be implemented here');
  };
  
  const handleBack = () => {
    navigate('/cashier/dashboard');
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back
        </Button>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={handleEmailReceipt}
            sx={{ mr: 1 }}
          >
            Email
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print Receipt
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper className="print-area" sx={{ p: 4, mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <ReceiptIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" gutterBottom align="center">
                My Restaurant
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary">
                123 Restaurant St, Foodville, FC 12345
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary">
                Tel: (123) 456-7890 | Email: info@myrestaurant.com
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Order ID:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {receipt.id}
                </Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">
                  Date:
                </Typography>
                <Typography variant="body1">
                  {receipt.date}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Table:
                </Typography>
                <Typography variant="body1">
                  Table {receipt.table}
                </Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">
                  Waiter:
                </Typography>
                <Typography variant="body1">
                  {receipt.waiter}
                </Typography>
              </Grid>
            </Grid>
            
            <Typography variant="h6" gutterBottom>
              Order Details
            </Typography>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="center">Type</TableCell>
                    <TableCell align="center">Qty</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipt.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.name}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={item.item_type === 'food' ? 'Food' : 'Drink'}
                          color={item.item_type === 'food' ? 'secondary' : 'primary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="right">${item.price.toFixed(2)}</TableCell>
                      <TableCell align="right">${item.subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Grid container justifyContent="flex-end">
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">Subtotal:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">${receipt.subtotal.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Tax (8.5%):</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">${receipt.tax.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Service Charge (10%):</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">${receipt.serviceCharge.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" fontWeight="bold">Total:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle1" fontWeight="bold">${receipt.total.toFixed(2)}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Chip
                label={receipt.paymentStatus}
                color={receipt.paymentStatus === 'Paid' ? 'success' : 'error'}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Payment Method: {receipt.paymentMethod}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Thank you for dining with us!
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Receipt Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                sx={{ mb: 1 }}
              >
                Print Receipt
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EmailIcon />}
                onClick={handleEmailReceipt}
                sx={{ mb: 1 }}
              >
                Email Receipt
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ShareIcon />}
                sx={{ mb: 1 }}
              >
                Share Receipt
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                No customer information available for this order.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Add Customer Info
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}