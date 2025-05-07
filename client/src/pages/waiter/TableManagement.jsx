import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
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

// Mock data for demonstration
const generateMockTables = () => {
  const tableStatuses = ['Open', 'Occupied', 'Bill Requested', 'Reserved'];
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    status: tableStatuses[Math.floor(Math.random() * tableStatuses.length)],
    occupants: Math.floor(Math.random() * 6) + 1,
    timeElapsed: Math.floor(Math.random() * 120) + 5,
    totalAmount: Math.random() > 0.3 ? (Math.floor(Math.random() * 150) + 20).toFixed(2) : '0.00',
    waiter: 'John Doe',
    reservation: Math.random() > 0.8 ? {
      name: 'Customer ' + (i + 1),
      time: '19:00',
      date: '2023-07-28',
      phone: '555-123-4567',
      notes: 'Window seat preferred'
    } : null
  }));
};

export default function TableManagement() {
  const navigate = useNavigate();
  const theme = useTheme();
  const user = useSelector(state => state.auth.user);
  
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentTable, setCurrentTable] = useState(null);
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
    // In a real app, this would fetch data from an API
    setTimeout(() => {
      setTables(generateMockTables());
      setLoading(false);
    }, 800);
  }, []);
  
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
  
  const handleTakeOrder = (tableId) => {
    // In a real app, this would navigate to an order form for this table
    navigate('/waiter/dashboard');
    setSnackbar({
      open: true,
      message: `Taking order for Table ${tableId}`,
      severity: 'success'
    });
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
    switch (status) {
      case 'Open':
        return theme.palette.success.main;
      case 'Occupied':
        return theme.palette.primary.main;
      case 'Bill Requested':
        return theme.palette.warning.main;
      case 'Reserved':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };
  
  const filteredTables = tables.filter(table => {
    // Filter by tab value
    if (tabValue === 1 && table.status !== 'Open') return false;
    if (tabValue === 2 && table.status !== 'Occupied') return false;
    if (tabValue === 3 && table.status !== 'Bill Requested') return false;
    if (tabValue === 4 && table.status !== 'Reserved') return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        `table ${table.id}`.toLowerCase().includes(query) ||
        table.status.toLowerCase().includes(query) ||
        (table.reservation?.name?.toLowerCase().includes(query) || false)
      );
    }
    
    return true;
  });
  
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
                        label={table.status} 
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
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenDialog(table)}
                      startIcon={<EditIcon />}
                    >
                      Status
                    </Button>
                    
                    <Button
                      size="small"
                      variant="contained"
                      color={
                        table.status === 'Open' ? 'success' : 
                        table.status === 'Bill Requested' ? 'warning' : 
                        'primary'
                      }
                      onClick={() => handleTakeOrder(table.id)}
                      startIcon={
                        table.status === 'Open' ? <PersonIcon /> : 
                        table.status === 'Occupied' ? <RestaurantIcon /> : 
                        table.status === 'Bill Requested' ? <MoneyIcon /> : 
                        <SwapIcon />
                      }
                    >
                      {table.status === 'Open' ? 'Seat Guests' : 
                       table.status === 'Occupied' ? 'Take Order' :
                       table.status === 'Bill Requested' ? 'Process Bill' :
                       table.status === 'Reserved' ? 'Check In' :
                       'Update'}
                    </Button>
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