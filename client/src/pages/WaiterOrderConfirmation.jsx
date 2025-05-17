import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import axios from 'axios';

const WaiterOrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderData, tableNumber, cart, token } = location.state || {};
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Use token from location or localStorage
  const authToken = token || localStorage.getItem('waiter_token');

  // Handle confirm order
  const handleConfirmOrder = async () => {
    if (!orderData) {
      setError('No order data found');
      return;
    }
    
    if (!authToken) {
      setError('Authentication required. Please login again.');
      setTimeout(() => navigate('/waiter-menu'), 2000);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Submit the order with authentication
      const response = await axios.post('http://localhost:5001/api/orders', 
        {
          tableNumber: orderData.tableNumber,
          items: orderData.items,
          status: 'pending'
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess(true);
      
      // Also update table status to 'occupied'
      await axios.put(`http://localhost:5001/api/tables/${tableNumber}/status`, 
        {
          status: 'occupied',
          occupants: orderData.items.reduce((sum, item) => sum + item.quantity, 0)
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setTimeout(() => {
        // Redirect back to menu after success
        navigate('/waiter-menu');
      }, 3000);
    } catch (err) {
      console.error('Error submitting order:', err);
      
      // If unauthorized, redirect to login
      if (err.response && err.response.status === 401) {
        setError('Authentication expired. Please login again.');
        localStorage.removeItem('waiter_token');
        setTimeout(() => navigate('/waiter-menu'), 2000);
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to submit order');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleBack = () => {
    // Go back to menu
    navigate('/waiter-menu');
  };

  // Calculate total items in cart
  const totalItems = cart ? cart.reduce((total, item) => total + item.quantity, 0) : 0;

  // Calculate total price
  const totalPrice = cart ? cart.reduce((total, item) => total + (item.price * item.quantity), 0) : 0;

  if (!orderData || !cart) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          No order data found. Please return to the menu and try again.
        </Alert>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button variant="contained" onClick={() => navigate('/waiter-menu')}>
            Return to Menu
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      {success ? (
        <Card sx={{ textAlign: 'center', p: 3 }}>
          <CardContent>
            <CheckCircleOutlineIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>Order Submitted!</Typography>
            <Typography variant="body1" paragraph>
              Your order has been successfully placed for Table {tableNumber}.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Redirecting back to menu...
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>Order Confirmation</Typography>
            <Typography variant="body1" gutterBottom>
              Table: <strong>{tableNumber}</strong>
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <List>
              {cart.map(item => (
                <ListItem key={item.id} sx={{ py: 1, px: 0 }}>
                  <ListItemText 
                    primary={item.name} 
                    secondary={`$${item.price.toFixed(2)} x ${item.quantity}`} 
                  />
                  <Typography variant="body1">
                    ${(item.price * item.quantity).toFixed(2)}
                  </Typography>
                </ListItem>
              ))}
              
              <Divider sx={{ my: 2 }} />
              
              <ListItem sx={{ py: 1, px: 0 }}>
                <ListItemText primary={<Typography variant="h6">Total</Typography>} />
                <Typography variant="h6">
                  ${totalPrice.toFixed(2)}
                </Typography>
              </ListItem>
            </List>
          </Paper>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={submitting}
            >
              Back to Menu
            </Button>
            <Button
              variant="contained"
              color="primary" 
              onClick={handleConfirmOrder}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {submitting ? 'Submitting...' : 'Confirm Order'}
            </Button>
          </Box>
        </>
      )}
    </Container>
  );
};

export default WaiterOrderConfirmation; 