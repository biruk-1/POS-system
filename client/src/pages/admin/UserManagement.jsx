import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Typography,
  Paper,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../../config/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    phone_number: '',
    pin_code: '',
    role: ''
  });

  const token = localStorage.getItem('token');

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.USERS, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load users. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        username: user.username,
        password: '', // Don't populate password for security
        phone_number: user.phone_number || '',
        pin_code: '',
        role: user.role
      });
    } else {
      setSelectedUser(null);
      setFormData({
        username: '',
        password: '',
        phone_number: '',
        pin_code: '',
        role: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormData({
      username: '',
      password: '',
      phone_number: '',
      pin_code: '',
      role: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    const { username, password, phone_number, pin_code, role } = formData;
    
    if (!username || !role) {
      setError('Username and role are required');
      return false;
    }
    
    if (role === 'waiter' && !pin_code) {
      setError('PIN code is required for waiters');
      return false;
    }
    
    if (role === 'cashier' && !phone_number) {
      setError('Phone number is required for cashiers');
      return false;
    }
    
    if (['admin', 'cashier', 'kitchen', 'bartender'].includes(role) && !password && !selectedUser) {
      setError('Password is required for this role');
      return false;
    }
    
    // PIN code must be 6 digits
    if (pin_code && !/^\d{6}$/.test(pin_code)) {
      setError('PIN code must be 6 digits');
      return false;
    }
    
    // Phone number validation (simple check)
    if (phone_number && !/^\d{10,15}$/.test(phone_number)) {
      setError('Please enter a valid phone number');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (selectedUser) {
        // Update user functionality would go here
        // Not implemented in backend yet
        setError('User update functionality not implemented yet');
      } else {
        // Create new user
        const response = await axios.post(API_ENDPOINTS.USERS, formData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setSuccess('User created successfully!');
        fetchUsers();
        handleCloseDialog();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    // This would need a backend endpoint to implement
    alert('Delete user functionality would be implemented here');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'cashier':
        return 'primary';
      case 'waiter':
        return 'success';
      case 'kitchen':
        return 'warning';
      case 'bartender':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New User
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading users...</Typography>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Phone Number</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role.toUpperCase()} 
                      color={getRoleBadgeColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.phone_number || 'N/A'}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      onClick={() => handleOpenDialog(user)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDeleteUser(user.id)}
                      color="error"
                      size="small"
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              margin="normal"
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleInputChange}
                required
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="cashier">Cashier</MenuItem>
                <MenuItem value="waiter">Waiter</MenuItem>
                <MenuItem value="kitchen">Kitchen Staff</MenuItem>
                <MenuItem value="bartender">Bartender</MenuItem>
              </Select>
            </FormControl>
            
            {!selectedUser && (
              <TextField
                fullWidth
                margin="normal"
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required={['admin', 'cashier', 'kitchen', 'bartender'].includes(formData.role)}
                disabled={formData.role === 'waiter'}
                helperText={formData.role === 'waiter' ? 'Waiters use PIN code instead of password' : ''}
              />
            )}
            
            {formData.role === 'waiter' && (
              <TextField
                fullWidth
                margin="normal"
                label="PIN Code (6 digits)"
                name="pin_code"
                value={formData.pin_code}
                onChange={handleInputChange}
                required
                inputProps={{ maxLength: 6 }}
              />
            )}
            
            {formData.role === 'cashier' && (
              <TextField
                fullWidth
                margin="normal"
                label="Phone Number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                required
              />
            )}
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
          >
            {selectedUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success message */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccess('')}
          severity="success"
          sx={{ width: '100%' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
} 