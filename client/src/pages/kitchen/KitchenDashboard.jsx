import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const KitchenDashboard = () => {
  const navigate = useNavigate();

  // Redirect to the real-time view when this component loads
  useEffect(() => {
    console.log('KitchenDashboard loaded - redirecting to real-time view');
    // Use this effect to redirect to KitchenView
    navigate('/kitchen');
  }, [navigate]);

  return null; // Return null since this component immediately redirects
};

export default KitchenDashboard; 