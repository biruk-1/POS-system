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
import { formatCurrency } from '../../utils/currencyFormatter';

// Add print styles for receipt
const printStyles = `
  @media print {
    @page {
      size: 58mm 180mm; /* Set fixed height to ensure consistency */
      margin: 0;
      padding: 0;
    }
    body * {
      visibility: hidden;
    }
    .print-area, .print-area * {
      visibility: visible;
    }
    .print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 58mm;
      height: auto; /* Auto height based on content */
      min-height: 120mm; /* Minimum height */
      padding: 5mm 2mm; /* Add some padding */
      margin: 0;
      box-shadow: none !important;
      font-family: 'Courier New', monospace !important; /* Consistent monospace font */
    }
    .no-print {
      display: none !important;
    }
    html, body {
      width: 58mm;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      background-color: #fff;
    }
    /* Adjust font sizes for printing with better spacing */
    .print-area h4 {
      font-size: 12pt !important;
      margin: 4pt 0 !important;
      text-align: center !important;
      font-weight: bold !important;
    }
    .print-area h6 {
      font-size: 10pt !important;
      margin: 3pt 0 !important;
      font-weight: bold !important;
    }
    .print-area p, .print-area span {
      font-size: 9pt !important;
      margin: 2pt 0 !important;
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }
    .print-area td, .print-area th {
      font-size: 9pt !important;
      margin: 2pt 0 !important;
      padding: 2pt !important;
      white-space: normal !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    /* Simplify table for small receipt */
    .print-area table {
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      border: none !important;
      margin: 3mm 0 !important;
    }
    .print-area table td, .print-area table th {
      padding: 2pt !important;
      border: none !important;
    }
    .print-area .MuiPaper-root {
      box-shadow: none !important;
      padding: 2mm !important;
      width: 100% !important;
      max-width: 54mm !important;
    }
    .print-area .MuiDivider-root {
      margin: 3pt 0 !important;
      background-color: #888 !important;
    }
    /* Spacing and layout */
    .print-area * {
      line-height: 1.2 !important;
      max-width: 54mm !important;
      overflow-x: hidden !important;
    }
    .print-area .MuiGrid-container {
      display: block !important;
      width: 100% !important;
    }
    .print-area .MuiGrid-item {
      display: block !important;
      width: 100% !important;
      padding: 0 !important;
    }
  }
`;

export default function Receipt() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const token = useSelector((state) => state.auth.token);
  
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        setLoading(true);
        // Fetch the order details
        const orderResponse = await axios.get(`http://localhost:5001/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!orderResponse.data) {
          throw new Error('Order not found');
        }
        
        // Format receipt data
        const orderData = orderResponse.data;
        const items = orderData.items || [];
        
        // Calculate subtotal
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.085; // 8.5% tax
        const serviceCharge = subtotal * 0.1; // 10% service charge
        const total = subtotal + tax + serviceCharge;
        
        // Format the receipt data
        const receiptData = {
          id: orderData.id,
          date: new Date(orderData.created_at).toLocaleString(),
          table: orderData.table_number || 'N/A',
          waiter: orderData.waiter_name || 'N/A',
          status: orderData.status || 'pending',
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            item_type: item.item_type || 'food',
            subtotal: item.price * item.quantity
          })),
          subtotal,
          tax,
          serviceCharge,
          total,
          paymentMethod: 'Cash', // Default or you could fetch from payment data
          paymentStatus: orderData.status === 'paid' ? 'Paid' : 'Pending'
        };
        
        setReceipt(receiptData);
          setLoading(false);
      } catch (err) {
        console.error('Failed to fetch receipt data:', err);
        setError('Failed to load receipt data: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };
    
    fetchReceiptData();
  }, [orderId, token]);
  
  const handlePrint = () => {
    // Create a printable version of the receipt
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      alert('Please allow pop-ups to print receipt');
      return;
    }
    
    // Add the content to the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${receipt.id}</title>
          <style>
            @page {
              size: 58mm 180mm;
              margin: 0;
            }
            html, body {
              width: 58mm;
              height: auto;
              min-height: 120mm;
              margin: 0;
              padding: 0;
              overflow-x: hidden;
              background-color: white;
            }
            body {
              font-family: 'Courier New', monospace; /* Use monospaced font for thermal printers */
              margin: 0;
              padding: 4mm 2mm;
              width: 58mm; /* Standard thermal receipt width */
            }
            .receipt {
              padding: 3mm;
              width: 100%;
              max-width: 54mm;
              overflow-x: hidden;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              margin-bottom: 4mm;
            }
            .header h1 {
              font-size: 14px;
              margin: 2mm 0;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .header p {
              font-size: 9px;
              margin: 1mm 0;
              color: #333;
            }
            .detail {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2mm;
              font-size: 9px;
              line-height: 1.3;
            }
            .divider {
              border-top: 1px dashed #999;
              margin: 3mm 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2mm;
              font-size: 9px;
              line-height: 1.2;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              width: 100%;
            }
            .item-name {
              flex: 2;
              white-space: normal;
              word-break: break-word;
              font-size: 9px;
              max-width: 30mm;
              overflow: hidden;
              padding-right: 2mm;
            }
            .item-qty {
              flex: 0.5;
              text-align: center;
              font-size: 9px;
            }
            .item-price {
              flex: 0.8;
              text-align: right;
              font-size: 9px;
            }
            .subtotal {
              display: flex;
              justify-content: space-between;
              margin-top: 2mm;
              font-size: 9px;
              line-height: 1.5;
            }
            .total {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 11px;
              margin-top: 2mm;
              line-height: 1.5;
            }
            .footer {
              text-align: center;
              font-size: 9px;
              margin-top: 5mm;
              line-height: 1.4;
            }
            .payment-status {
              text-align: center;
              margin: 3mm 0;
              font-weight: bold;
              font-size: 10px;
              border: 1px solid #999;
              padding: 1mm;
              border-radius: 2mm;
            }
            * {
              line-height: 1.2;
              max-width: 54mm;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body onload="window.print();">
          <div class="receipt">
            <div class="header">
              <h1>MY RESTAURANT</h1>
              <p>123 Restaurant St, Foodville, FC 12345</p>
              <p>Tel: (123) 456-7890</p>
            </div>
            
            <div class="divider"></div>
            
            <div class="detail">
              <div>Receipt #:</div>
              <div>${receipt.id}</div>
            </div>
            <div class="detail">
              <div>Date: ${receipt.date.split(',')[0]}</div>
              <div>Time: ${receipt.date.split(',')[1].trim()}</div>
            </div>
            <div class="detail">
              <div>Table: ${receipt.table}</div>
              <div>Waiter: ${receipt.waiter}</div>
            </div>
            
            <div class="divider"></div>
            
            <div style="margin-bottom: 4mm;">
              <div class="item" style="font-weight: bold; margin-bottom: 3mm;">
                <div class="item-details">
                  <div class="item-name"><strong>Item</strong></div>
                  <div class="item-qty"><strong>Qty</strong></div>
                  <div class="item-price"><strong>Price</strong></div>
                </div>
              </div>
              
              ${receipt.items.map(item => `
                <div class="item">
                  <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div class="item-qty">${item.quantity}</div>
                    <div class="item-price">$${item.price.toFixed(2)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="divider"></div>
            
            <div class="subtotal">
              <div>Subtotal:</div>
              <div>$${receipt.subtotal.toFixed(2)}</div>
            </div>
            <div class="subtotal">
              <div>Tax (8.5%):</div>
              <div>$${receipt.tax.toFixed(2)}</div>
            </div>
            <div class="subtotal">
              <div>Service (10%):</div>
              <div>$${receipt.serviceCharge.toFixed(2)}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="total">
              <div>TOTAL:</div>
              <div>$${receipt.total.toFixed(2)}</div>
            </div>
            
            <div class="payment-status">
              ${receipt.paymentStatus}
            </div>
            <div style="text-align: center; font-size: 9px; margin: 2mm 0;">
              Payment Method: ${receipt.paymentMethod}
            </div>
            
            <div class="divider"></div>
            
            <div class="footer">
              <div>Thank you for dining with us!</div>
              <div>${new Date().toLocaleDateString()}</div>
              <div style="margin-top: 3mm; font-weight: bold;">**** CUSTOMER COPY ****</div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Auto-print immediately when loaded
    // The onload event in the HTML will trigger printing
  };
  
  const handleEmailReceipt = () => {
    // In a real app, this would send the receipt via email
    alert('Email receipt functionality would be implemented here');
  };
  
  const handleBack = () => {
    navigate('/cashier/dashboard');
  };
  
  const handlePlaceOrder = async () => {
    try {
      // Update the existing order's status
      const response = await axios.put(`http://localhost:5001/api/orders/${receipt.id}/status`, {
        status: 'pending',
        total_amount: receipt.total,
        payment_amount: receipt.total // Include payment amount for consistency
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Order status updated:', response.data);

      // Show success message and redirect to dashboard
      navigate('/cashier/dashboard', { 
        state: { 
          message: 'Order placed successfully',
          orderId: receipt.id,
          status: 'pending'
        }
      });

      // Show success snackbar
      setSnackbar({
        open: true,
        message: `Order #${receipt.id} placed successfully`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Failed to place order:', err);
      const errorMessage = err.response?.data?.error || err.message;
      setError('Failed to place order: ' + errorMessage);
      
      // Show error snackbar
      setSnackbar({
        open: true,
        message: `Failed to place order: ${errorMessage}`,
        severity: 'error'
      });
    }
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
      {/* Add print styles */}
      <style>{printStyles}</style>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }} className="no-print">
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
            startIcon={<ReceiptIcon />}
            onClick={handlePlaceOrder}
            disabled={loading || !receipt}
          >
            Place Order
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
                      <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.subtotal)}</TableCell>
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
                      <Typography variant="body2">{formatCurrency(receipt.subtotal)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Tax (8.5%):</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(receipt.tax)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Service Charge (10%):</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(receipt.serviceCharge)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle1" fontWeight="bold">Total:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle1" fontWeight="bold">{formatCurrency(receipt.total)}</Typography>
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