import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState({
    product_id: '',
    quantity: 1,
  });

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setSelectedProducts([]);
    setCurrentProduct({
      product_id: '',
      quantity: 1,
    });
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedProducts([]);
    setCurrentProduct({
      product_id: '',
      quantity: 1,
    });
  };

  const handleAddProduct = () => {
    if (currentProduct.product_id && currentProduct.quantity > 0) {
      const product = products.find((p) => p.id === currentProduct.product_id);
      if (product) {
        setSelectedProducts([
          ...selectedProducts,
          {
            ...currentProduct,
            price: product.price,
            name: product.name,
          },
        ]);
        setCurrentProduct({
          product_id: '',
          quantity: 1,
        });
      }
    }
  };

  const handleRemoveProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const total_amount = selectedProducts.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      await axios.post(
        'http://localhost:5000/api/orders',
        {
          items: selectedProducts.map(({ product_id, quantity, price }) => ({
            product_id,
            quantity,
            price,
          })),
          total_amount,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      handleClose();
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Orders</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          New Order
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleString()}
                </TableCell>
                <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                <TableCell>{order.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>New Order</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField
                  select
                  fullWidth
                  label="Product"
                  value={currentProduct.product_id}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      product_id: e.target.value,
                    })
                  }
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ${product.price}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantity"
                  value={currentProduct.quantity}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Grid>
              <Grid item xs={2}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAddProduct}
                  sx={{ height: '100%' }}
                >
                  Add
                </Button>
              </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedProducts.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>${item.price.toFixed(2)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        ${(item.price * item.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveProduct(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Typography variant="h6">
                Total: $
                {selectedProducts
                  .reduce((sum, item) => sum + item.price * item.quantity, 0)
                  .toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={selectedProducts.length === 0}
          >
            Create Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Orders; 