import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BartenderDashboard = () => {
  const navigate = useNavigate();

  // Redirect to the real-time view when this component loads
  useEffect(() => {
    console.log('BartenderDashboard loaded - redirecting to real-time view');
    // Use this effect to redirect to BartenderView
    navigate('/bartender');
  }, [navigate]);

  return null; // Return null since this component immediately redirects
};

export default BartenderDashboard; 