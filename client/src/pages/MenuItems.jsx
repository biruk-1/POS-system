const fetchItems = async () => {
  try {
    const response = await menuItemsAPI.getAll();
    console.log('Fetched items:', response);
    
    // Ensure response is an array
    const items = Array.isArray(response) ? response : response.data || [];
    setItems(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    setError('Failed to load menu items');
  }
}; 