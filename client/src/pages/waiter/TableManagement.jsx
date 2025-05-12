import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Tab,
  Tabs,
  InputAdornment,
  Tooltip,
  Alert,
  Snackbar,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Restaurant as RestaurantIcon,
  Person as PersonIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  SwapHoriz as SwapIcon,
  Print as PrintIcon,
  Money as MoneyIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';

export default function TableManagement() {
  const navigate = useNavigate();
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  const token = localStorage.getItem('token');
  
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentTable, setCurrentTable] = useState(null);
  const [orderDialog, setOrderDialog] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Dialog form state
  const [dialogForm, setDialogForm] = useState({
    status: 'Open',
    occupants: 1,
    reservationName: '',
    reservationTime: '',
    reservationDate: '',
    reservationPhone: '',
    reservationNotes: ''
  });
  
  useEffect(() => {
    // Fetch actual tables from the API
    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5001/api/tables', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Convert API response to match our component format
        const formattedTables = response.data.map(table => ({
          id: table.id,
          table_number: table.table_number,
          status: table.status,
          occupants: table.occupants || 0,
          timeElapsed: 0, // This would need to be calculated from last_updated
          totalAmount: '0.00', // Would need a separate API call to get orders for this table
          waiter: table.waiter_name || 'Unassigned',
          reservation: table.reservation_name ? {
            name: table.reservation_name,
            time: table.reservation_time,
            date: table.reservation_date,
            phone: table.reservation_phone,
            notes: table.reservation_notes
          } : null
        }));
        
        setTables(formattedTables);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tables:', err);
        setLoading(false);
        // Show error in snackbar
        setSnackbar({
          open: true,
          message: 'Failed to load tables. Please try again.',
          severity: 'error'
        });
      }
    };
    
    // Fetch menu items for ordering
    const fetchMenuItems = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/items', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setMenuItems(response.data);
      } catch (err) {
        console.error('Failed to load menu items:', err);
      }
    };
    
    fetchTables();
    fetchMenuItems();
    
    // Socket.IO for real-time updates
    const socket = io('http://localhost:5001');
    
    socket.on('connect', () => {
      console.log('Waiter connected to socket server');
    });
    
    socket.on('item_created', (newItem) => {
      console.log('New menu item received:', newItem);
      setMenuItems(prevItems => [...prevItems, newItem]);
    });
    
    socket.on('item_updated', (updatedItem) => {
      console.log('Menu item updated:', updatedItem);
      setMenuItems(prevItems => 
        prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
      );
    });
    
    socket.on('item_deleted', (deletedItem) => {
      console.log('Menu item deleted:', deletedItem);
      setMenuItems(prevItems => prevItems.filter(item => item.id !== deletedItem.id));
    });
    
    socket.on('table_status_updated', (updatedTable) => {
      console.log('Table status updated:', updatedTable);
      setTables(prevTables => 
        prevTables.map(table => 
          table.id === updatedTable.id ? {
            ...table,
            status: updatedTable.status,
            occupants: updatedTable.occupants,
            waiter: updatedTable.waiter_name || 'Unassigned'
          } : table
        )
      );
    });
    
    return () => {
      socket.disconnect();
    };
  }, [token]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  const handleOpenDialog = (table = null) => {
    if (table) {
      setCurrentTable(table);
      setDialogForm({
        status: table.status,
        occupants: table.occupants || 1,
        reservationName: table.reservation?.name || '',
        reservationTime: table.reservation?.time || '',
        reservationDate: table.reservation?.date || '',
        reservationPhone: table.reservation?.phone || '',
        reservationNotes: table.reservation?.notes || ''
      });
    } else {
      setCurrentTable(null);
      setDialogForm({
        status: 'Open',
        occupants: 1,
        reservationName: '',
        reservationTime: '',
        reservationDate: '',
        reservationPhone: '',
        reservationNotes: ''
      });
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setDialogForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmitDialog = () => {
    // In a real app, this would submit the changes to an API
    if (currentTable) {
      // Update existing table
      setTables(prev => prev.map(table => {
        if (table.id === currentTable.id) {
          const updatedTable = {
            ...table,
            status: dialogForm.status,
            occupants: dialogForm.status === 'Open' ? 0 : parseInt(dialogForm.occupants)
          };
          
          // Update reservation data if relevant
          if (dialogForm.status === 'Reserved' && dialogForm.reservationName) {
            updatedTable.reservation = {
              name: dialogForm.reservationName,
              time: dialogForm.reservationTime,
              date: dialogForm.reservationDate,
              phone: dialogForm.reservationPhone,
              notes: dialogForm.reservationNotes
            };
          } else if (dialogForm.status !== 'Reserved') {
            updatedTable.reservation = null;
          }
          
          return updatedTable;
        }
        return table;
      }));
      
      setSnackbar({
        open: true,
        message: `Table ${currentTable.id} status updated successfully`,
        severity: 'success'
      });
    } else {
      // Add new table (would typically be handled by the backend)
      setSnackbar({
        open: true,
        message: 'Adding new tables is handled by the system administrator',
        severity: 'info'
      });
    }
    
    handleCloseDialog();
  };
  
  const handleTakeOrder = async (tableId) => {
    // Navigate to an order entry form for this table with the table number pre-filled
    try {
      // First, check if we have actual items in the menu
      const response = await axios.get('http://localhost:5001/api/items', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && response.data.length > 0) {
        // Store the table information in session storage to access in the order form
        sessionStorage.setItem('selectedTable', JSON.stringify({
          id: tableId,
          occupants: tables.find(t => t.id === tableId)?.occupants || 1
        }));
        
        // Navigate to a new order form (this would be a separate page in a real app)
        // For now, we'll show a dialog for order entry
        setCurrentTable(tables.find(t => t.id === tableId));
        setOrderDialog(true);
      } else {
        setSnackbar({
          open: true,
          message: 'No menu items available. Please contact the administrator.',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Failed to load menu items:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load menu. Please try again later.',
        severity: 'error'
      });
    }
  };
  
  const handleBackToDashboard = () => {
    navigate('/waiter/dashboard');
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };
  
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'success';
      case 'occupied':
        return 'primary';
      case 'bill_requested':
        return 'warning';
      case 'reserved':
        return 'info';
      case 'paid':
        return 'secondary';
      default:
        return 'default';
    }
  };
  
  // Format status for display (API uses lowercase with underscore, UI uses Title Case)
  const formatStatusForDisplay = (status) => {
    if (status.toLowerCase() === 'open') return 'Open';
    if (status.toLowerCase() === 'occupied') return 'Occupied';
    if (status.toLowerCase() === 'bill_requested') return 'Bill Requested';
    if (status.toLowerCase() === 'reserved') return 'Reserved';
    if (status.toLowerCase() === 'paid') return 'Paid';
    return status; // fallback to original if not matched
  };
  
  const filteredTables = tables.filter(table => {
    // Filter by tab value
    if (tabValue === 1 && table.status.toLowerCase() !== 'open') return false;
    if (tabValue === 2 && table.status.toLowerCase() !== 'occupied') return false;
    if (tabValue === 3 && table.status.toLowerCase() !== 'bill_requested') return false;
    if (tabValue === 4 && table.status.toLowerCase() !== 'reserved') return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        `table ${table.table_number}`.toLowerCase().includes(query) ||
        table.status.toLowerCase().includes(query) ||
        (table.reservation?.name?.toLowerCase().includes(query) || false)
      );
    }
    
    return true;
  });
  
  const handleAddItemToOrder = (item) => {
    const existingItem = selectedItems.find(i => i.id === item.id);
    if (existingItem) {
      setSelectedItems(prev => prev.map(i => 
        i.id === item.id 
          ? { ...i, quantity: i.quantity + 1 } 
          : i
      ));
    } else {
      setSelectedItems(prev => [...prev, { ...item, quantity: 1 }]);
    }
  };
  
  const handleRemoveItemFromOrder = (itemId) => {
    setSelectedItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (item.quantity > 1) {
        return prev.map(i => 
          i.id === itemId 
            ? { ...i, quantity: i.quantity - 1 } 
            : i
        );
      } else {
        return prev.filter(i => i.id !== itemId);
      }
    });
  };
  
  const handlePlaceOrder = async () => {
    if (selectedItems.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please add items to the order',
        severity: 'error'
      });
      return;
    }
    
    try {
      setOrderLoading(true);
      
      const orderData = {
        items: selectedItems.map(item => ({
          item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          item_type: item.item_type
        })),
        table_number: currentTable.id,
        total_amount: selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      };
      
      const response = await axios.post('http://localhost:5001/api/orders', orderData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setSnackbar({
        open: true,
        message: `Order placed successfully for Table ${currentTable.id}`,
        severity: 'success'
      });
      
      // Update table status
      setTables(prev => prev.map(table => 
        table.id === currentTable.id 
          ? { ...table, status: 'Occupied', totalAmount: orderData.total_amount.toFixed(2) } 
          : table
      ));
      
      // Reset order state
      setSelectedItems([]);
      setOrderDialog(false);
    } catch (err) {
      console.error('Failed to place order:', err);
      setSnackbar({
        open: true,
        message: 'Failed to place order. Please try again.',
        severity: 'error'
      });
    } finally {
      setOrderLoading(false);
    }
  };
  
  // Add function to handle bill request
  const handleRequestBill = async (tableId) => {
    try {
      // Get the table object for the correct table number
      const table = tables.find(t => t.id === tableId);
      if (!table) {
        throw new Error('Table not found');
      }
      
      const response = await axios.put(`http://localhost:5001/api/tables/${table.table_number}/status`, {
        status: 'bill_requested',
        occupants: table.occupants || 0
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update local state with proper UI display format
      setTables(prevTables => 
        prevTables.map(t => 
          t.id === tableId ? { ...t, status: 'Bill Requested' } : t
        )
      );
      
      setSnackbar({
        open: true,
        message: 'Bill requested successfully. The cashier has been notified.',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error requesting bill:', error);
      setSnackbar({
        open: true,
        message: 'Failed to request bill. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Add buttons to table actions based on current status
  const renderTableActions = (table) => {
    const status = table.status.toLowerCase();
    
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => handleOpenDialog(table)}
        >
          Edit
        </Button>
        
        {status === 'open' && (
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<PersonIcon />}
            onClick={() => {
              setCurrentTable(table);
              setDialogForm({
                ...dialogForm,
                status: 'Occupied',
                occupants: 1
              });
              setOpenDialog(true);
            }}
          >
            Seat
          </Button>
        )}
        
        {status === 'occupied' && (
          <>
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={<MoneyIcon />}
              onClick={() => handleRequestBill(table.id)}
            >
              Request Bill
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<RestaurantIcon />}
              onClick={() => handleTakeOrder(table.id)}
            >
              Order
            </Button>
          </>
        )}
        
        {status === 'bill_requested' && (
          <Chip
            color="warning"
            icon={<MoneyIcon />}
            label="Bill Requested"
            size="small"
          />
        )}
        
        {status === 'paid' && (
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => {
              // Reset the table to open
              setCurrentTable(table);
              setDialogForm({
                ...dialogForm,
                status: 'Open',
                occupants: 0
              });
              setOpenDialog(true);
            }}
          >
            Clear Table
          </Button>
        )}
      </Box>
    );
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            sx={{ mr: 1 }} 
            onClick={handleBackToDashboard}
            color="primary"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold" color={theme.palette.roles.waiter}>
            Table Management
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search tables..."
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            New Reservation
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              minWidth: 120
            }
          }}
        >
          <Tab label="All Tables" />
          <Tab 
            label="Open" 
            icon={<Chip 
              label={tables.filter(t => t.status === 'Open').length} 
              size="small" 
              color="success" 
              sx={{ ml: 1 }} 
            />} 
            iconPosition="end"
          />
          <Tab 
            label="Occupied" 
            icon={<Chip 
              label={tables.filter(t => t.status === 'Occupied').length} 
              size="small" 
              color="primary" 
              sx={{ ml: 1 }} 
            />} 
            iconPosition="end"
          />
          <Tab 
            label="Bill Requested" 
            icon={<Chip 
              label={tables.filter(t => t.status === 'Bill Requested').length} 
              size="small" 
              color="warning" 
              sx={{ ml: 1 }} 
            />} 
            iconPosition="end"
          />
          <Tab 
            label="Reserved" 
            icon={<Chip 
              label={tables.filter(t => t.status === 'Reserved').length} 
              size="small" 
              color="info" 
              sx={{ ml: 1 }} 
            />} 
            iconPosition="end"
          />
        </Tabs>
      </Paper>
      
      {loading ? (
        <Typography>Loading tables...</Typography>
      ) : filteredTables.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          No tables found matching your criteria
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredTables.map(table => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={table.id}>
              <Card 
                variant="outlined"
                sx={{ 
                  borderColor: getStatusColor(table.status),
                  borderWidth: '1px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-4px)'
                  } 
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" fontWeight="bold">
                      Table {table.id}
                    </Typography>
                    <Box>
                      <Chip 
                        label={formatStatusForDisplay(table.status)} 
                        sx={{ 
                          backgroundColor: getStatusColor(table.status) + '20',
                          color: getStatusColor(table.status),
                          fontWeight: 500
                        }} 
                        size="small"
                      />
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={1}>
                    {table.status !== 'Open' && (
                      <>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PersonIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                            <Typography variant="body2" color="text.secondary">Guests</Typography>
                          </Box>
                          <Typography variant="body1">{table.occupants}</Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <TimeIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                            <Typography variant="body2" color="text.secondary">Time</Typography>
                          </Box>
                          <Typography variant="body1">{table.timeElapsed} min</Typography>
                        </Grid>
                      </>
                    )}
                    
                    {table.status === 'Reserved' && table.reservation && (
                      <>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <EventIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                            <Typography variant="body2" color="text.secondary">Reservation</Typography>
                          </Box>
                          <Typography variant="body1">{table.reservation.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {table.reservation.date} at {table.reservation.time}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    
                    {(table.status === 'Occupied' || table.status === 'Bill Requested') && (
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <MoneyIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">Total</Typography>
                        </Box>
                        <Typography variant="body1" fontWeight="medium">${table.totalAmount}</Typography>
                      </Grid>
                    )}
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    {renderTableActions(table)}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Table Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentTable ? `Manage Table ${currentTable.id}` : 'Add New Reservation'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="status-label">Table Status</InputLabel>
                  <Select
                    labelId="status-label"
                    name="status"
                    value={dialogForm.status}
                    onChange={handleFormChange}
                    label="Table Status"
                  >
                    <MenuItem value="Open">Open</MenuItem>
                    <MenuItem value="Occupied">Occupied</MenuItem>
                    <MenuItem value="Bill Requested">Bill Requested</MenuItem>
                    <MenuItem value="Reserved">Reserved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {dialogForm.status !== 'Open' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Number of Guests"
                    name="occupants"
                    type="number"
                    InputProps={{ inputProps: { min: 1, max: 12 } }}
                    value={dialogForm.occupants}
                    onChange={handleFormChange}
                  />
                </Grid>
              )}
              
              {dialogForm.status === 'Reserved' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Reservation Details
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Customer Name"
                      name="reservationName"
                      value={dialogForm.reservationName}
                      onChange={handleFormChange}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="reservationPhone"
                      value={dialogForm.reservationPhone}
                      onChange={handleFormChange}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Date"
                      name="reservationDate"
                      type="date"
                      value={dialogForm.reservationDate}
                      onChange={handleFormChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Time"
                      name="reservationTime"
                      type="time"
                      value={dialogForm.reservationTime}
                      onChange={handleFormChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notes"
                      name="reservationNotes"
                      multiline
                      rows={2}
                      value={dialogForm.reservationNotes}
                      onChange={handleFormChange}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitDialog} 
            variant="contained"
            color="primary"
          >
            {currentTable ? 'Update Table' : 'Add Reservation'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Order Dialog */}
      <Dialog 
        open={orderDialog} 
        onClose={() => setOrderDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Order for Table {currentTable?.id}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Typography variant="h6" gutterBottom>
                Menu Items
              </Typography>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab label="All" />
                <Tab label="Food" />
                <Tab label="Drinks" />
              </Tabs>
              <Box sx={{ height: 400, overflow: 'auto' }}>
                <Grid container spacing={2}>
                  {menuItems
                    .filter(item => {
                      if (tabValue === 1) return item.item_type === 'food';
                      if (tabValue === 2) return item.item_type === 'drink';
                      return true;
                    })
                    .map(item => (
                      <Grid item xs={6} key={item.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle1">{item.name}</Typography>
                              <Chip 
                                size="small" 
                                label={item.item_type === 'food' ? 'Food' : 'Drink'} 
                                color={item.item_type === 'food' ? 'success' : 'primary'} 
                              />
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                              {item.description || 'No description available'}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, alignItems: 'center' }}>
                              <Typography variant="subtitle1">{formatCurrency(item.price)}</Typography>
                              <Button 
                                size="small" 
                                variant="contained" 
                                onClick={() => handleAddItemToOrder(item)}
                              >
                                Add
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  }
                </Grid>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Typography variant="h6" gutterBottom>
                Selected Items
              </Typography>
              <Paper sx={{ p: 2, height: 400, overflow: 'auto' }}>
                {selectedItems.length === 0 ? (
                  <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
                    No items selected
                  </Typography>
                ) : (
                  <Box>
                    {selectedItems.map(item => (
                      <Box key={item.id} sx={{ mb: 2, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2">{item.name}</Typography>
                          <Typography variant="subtitle2">{formatCurrency(item.price)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, alignItems: 'center' }}>
                          <Chip size="small" label={item.item_type} />
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton size="small" onClick={() => handleRemoveItemFromOrder(item.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                            <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                            <IconButton size="small" onClick={() => handleAddItemToOrder(item)}>
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1">Total:</Typography>
                      <Typography variant="subtitle1">
                        {formatCurrency(selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handlePlaceOrder}
            disabled={selectedItems.length === 0 || orderLoading}
          >
            {orderLoading ? 'Placing Order...' : 'Place Order'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 