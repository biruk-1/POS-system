import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  InputAdornment,
  Chip,
  Tabs,
  Tab,
  Divider,
  Alert,
  Snackbar,
  Avatar,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Restaurant as FoodIcon,
  LocalBar as DrinkIcon,
  FilterList as FilterIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

// Mock food and drink images for demonstration
const FOOD_IMAGES = [
  'https://source.unsplash.com/random/300x200/?steak',
  'https://source.unsplash.com/random/300x200/?pasta',
  'https://source.unsplash.com/random/300x200/?salad',
  'https://source.unsplash.com/random/300x200/?burger',
  'https://source.unsplash.com/random/300x200/?pizza',
  'https://source.unsplash.com/random/300x200/?sushi',
];

const DRINK_IMAGES = [
  'https://source.unsplash.com/random/300x200/?cocktail',
  'https://source.unsplash.com/random/300x200/?wine',
  'https://source.unsplash.com/random/300x200/?coffee',
  'https://source.unsplash.com/random/300x200/?beer',
  'https://source.unsplash.com/random/300x200/?juice',
];

// Generate mock data for demonstration
const generateMockItems = () => {
  const foodItems = [
    { id: 1, name: 'Grilled Ribeye Steak', description: 'Prime beef steak grilled to perfection', price: 29.99, item_type: 'food', category: 'Main Course' },
    { id: 2, name: 'Spaghetti Carbonara', description: 'Classic Italian pasta with bacon and egg', price: 14.99, item_type: 'food', category: 'Pasta' },
    { id: 3, name: 'Caesar Salad', description: 'Romaine lettuce with Caesar dressing and croutons', price: 9.99, item_type: 'food', category: 'Salad' },
    { id: 4, name: 'Margherita Pizza', description: 'Traditional pizza with tomato, mozzarella, and basil', price: 12.99, item_type: 'food', category: 'Pizza' },
    { id: 5, name: 'Beef Burger', description: 'Angus beef patty with lettuce, tomato, and special sauce', price: 13.99, item_type: 'food', category: 'Burgers' },
    { id: 6, name: 'Salmon Fillet', description: 'Grilled salmon with lemon butter sauce', price: 22.99, item_type: 'food', category: 'Seafood' },
    { id: 7, name: 'Mushroom Risotto', description: 'Creamy Italian rice with assorted mushrooms', price: 16.99, item_type: 'food', category: 'Risotto' },
    { id: 8, name: 'Tiramisu', description: 'Classic Italian coffee-flavored dessert', price: 8.99, item_type: 'food', category: 'Dessert' },
  ];

  const drinkItems = [
    { id: 9, name: 'Mojito', description: 'Refreshing cocktail with rum, mint, and lime', price: 7.99, item_type: 'drink', category: 'Cocktail' },
    { id: 10, name: 'Red Wine (Glass)', description: 'House selection of premium red wine', price: 8.99, item_type: 'drink', category: 'Wine' },
    { id: 11, name: 'Espresso', description: 'Strong Italian coffee', price: 3.99, item_type: 'drink', category: 'Coffee' },
    { id: 12, name: 'Draft Beer', description: 'Local craft beer on tap', price: 5.99, item_type: 'drink', category: 'Beer' },
    { id: 13, name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice', price: 4.99, item_type: 'drink', category: 'Juice' },
    { id: 14, name: 'Bottled Water', description: 'Premium mineral water', price: 2.99, item_type: 'drink', category: 'Water' },
  ];

  // Add random images to items
  foodItems.forEach((item, index) => {
    item.image = FOOD_IMAGES[index % FOOD_IMAGES.length];
  });

  drinkItems.forEach((item, index) => {
    item.image = DRINK_IMAGES[index % DRINK_IMAGES.length];
  });

  return [...foodItems, ...drinkItems];
};

export default function MenuItems() {
  const theme = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    item_type: 'food',
    category: '',
    image: '',
  });

  // Food and drink categories
  const foodCategories = ['Main Course', 'Pasta', 'Pizza', 'Burgers', 'Salad', 'Soup', 'Appetizer', 'Dessert', 'Seafood'];
  const drinkCategories = ['Cocktail', 'Wine', 'Beer', 'Coffee', 'Tea', 'Juice', 'Soft Drink', 'Water'];

  useEffect(() => {
    // Simulate API call
    const fetchItems = async () => {
      try {
        // In a real app, we would call the API
        // const response = await axios.get('http://localhost:5000/api/items', {
        //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        // });
        // setItems(response.data);

        // Using mock data for demonstration
        setTimeout(() => {
          setItems(generateMockItems());
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Failed to load menu items. Please try again.');
        console.error(err);
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price,
        item_type: item.item_type,
        category: item.category,
        image: item.image || '',
      });
    } else {
      setSelectedItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        item_type: 'food',
        category: '',
        image: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      item_type: 'food',
      category: '',
      image: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For price input, ensure it's a valid number
    if (name === 'price') {
      const regex = /^\d*\.?\d{0,2}$/;
      if (value === '' || regex.test(value)) {
        setFormData({
          ...formData,
          [name]: value,
        });
      }
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = () => {
    const { name, price, item_type, category } = formData;
    
    if (!name) {
      setError('Item name is required');
      return false;
    }
    
    if (!price) {
      setError('Price is required');
      return false;
    }
    
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setError('Price must be a positive number');
      return false;
    }
    
    if (!item_type) {
      setError('Item type is required');
      return false;
    }
    
    if (!category) {
      setError('Category is required');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (selectedItem) {
        // In a real app, we would call the API to update
        // const response = await axios.put(`http://localhost:5000/api/items/${selectedItem.id}`, formData, {
        //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        // });
        
        // Update the item in our state
        const updatedItems = items.map(item => 
          item.id === selectedItem.id ? { ...item, ...formData } : item
        );
        setItems(updatedItems);
        setSuccess('Item updated successfully!');
      } else {
        // In a real app, we would call the API to create
        // const response = await axios.post('http://localhost:5000/api/items', formData, {
        //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        // });
        
        // Add the new item to our state with a mock ID
        const newItem = {
          ...formData,
          id: Math.max(...items.map(item => item.id)) + 1,
          image: formData.item_type === 'food'
            ? FOOD_IMAGES[Math.floor(Math.random() * FOOD_IMAGES.length)]
            : DRINK_IMAGES[Math.floor(Math.random() * DRINK_IMAGES.length)],
        };
        setItems([...items, newItem]);
        setSuccess('Item created successfully!');
      }
      
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save item');
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      // In a real app, we would call the API to delete
      // await axios.delete(`http://localhost:5000/api/items/${itemId}`, {
      //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      // });
      
      // Remove the item from our state
      setItems(items.filter(item => item.id !== itemId));
      setSuccess('Item deleted successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete item');
      console.error(err);
    }
  };

  // Filter items based on current tab and search query
  const filteredItems = items.filter(item => {
    const matchesTab = currentTab === 'all' || item.item_type === currentTab;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with title and add button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary">
          Menu Items Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Item
        </Button>
      </Box>

      {/* Filter and search controls */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
            },
            bgcolor: theme.palette.background.paper,
            borderRadius: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <Tab value="all" label="All Items" />
          <Tab value="food" label="Food" icon={<FoodIcon />} iconPosition="start" />
          <Tab value="drink" label="Drinks" icon={<DrinkIcon />} iconPosition="start" />
        </Tabs>

        <TextField
          placeholder="Search items..."
          variant="outlined"
          fullWidth
          size="small"
          value={searchQuery}
          onChange={handleSearchChange}
          sx={{ maxWidth: { md: 300 }, ml: { md: 'auto' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Display items in a grid */}
      {filteredItems.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No items found. Try adjusting your filters or add a new item.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card elevation={0} sx={{ 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                }
              }}>
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={item.image || (item.item_type === 'food' ? FOOD_IMAGES[0] : DRINK_IMAGES[0])}
                    alt={item.name}
                    sx={{
                      width: '100%',
                      height: 180,
                      objectFit: 'cover',
                    }}
                  />
                  <Chip
                    label={item.item_type === 'food' ? 'Food' : 'Drink'}
                    color={item.item_type === 'food' ? 'success' : 'secondary'}
                    size="small"
                    icon={item.item_type === 'food' ? <FoodIcon /> : <DrinkIcon />}
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      fontWeight: 'bold',
                    }}
                  />
                </Box>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" component="div" fontWeight="bold" noWrap>
                      {item.name}
                    </Typography>
                    <Chip 
                      label={`$${item.price.toFixed(2)}`}
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                  <Chip
                    label={item.category}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 1.5 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: 60, overflow: 'hidden' }}>
                    {item.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(item)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Item Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedItem ? 'Edit Menu Item' : 'Add New Menu Item'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Item Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Item Type</InputLabel>
                  <Select
                    name="item_type"
                    value={formData.item_type}
                    label="Item Type"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="food">Food</MenuItem>
                    <MenuItem value="drink">Drink</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Price"
                  name="price"
                  type="text"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    label="Category"
                    onChange={handleInputChange}
                  >
                    {formData.item_type === 'food' ? (
                      foodCategories.map((category) => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))
                    ) : (
                      drinkCategories.map((category) => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Image URL (optional)"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                  helperText="Leave empty to use default image"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ImageIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            
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
            {selectedItem ? 'Update Item' : 'Add Item'}
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