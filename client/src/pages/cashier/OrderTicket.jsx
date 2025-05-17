import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Button,
  Card,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
  Tab,
  Tabs
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  Kitchen as KitchenIcon,
  LocalBar as BarIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';

// Add print styles
const printStyles = `
  @media print {
    @page {
      size: 58mm auto;
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
      width: 100%;
      max-width: 58mm;
      padding: 0;
      margin: 0;
      box-shadow: none !important;
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
    /* Reduce font sizes for printing */
    .print-area h4 {
      font-size: 12pt !important;
      margin: 3pt 0 !important;
    }
    .print-area h6 {
      font-size: 10pt !important;
      margin: 2pt 0 !important;
    }
    .print-area p, .print-area span {
      font-size: 8pt !important;
      margin: 1pt 0 !important;
    }
    /* Kitchen tickets need to be compact but clear */
    .print-area .MuiPaper-root {
      box-shadow: none !important;
      padding: 0 !important;
      margin-bottom: 8mm !important; /* Add space between tickets */
      page-break-after: always !important;
      width: 100% !important;
      max-width: 58mm !important;
    }
    .print-area .MuiDivider-root {
      margin: 2pt 0 !important;
    }
    /* Remove any extra spacing */
    .print-area * {
      line-height: 1.1 !important;
      max-width: 58mm !important;
      overflow-x: hidden !important;
    }
  }
`;

export default function OrderTicket() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [foodTicketData, setFoodTicketData] = useState(null);
  const [drinkTicketData, setDrinkTicketData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Get ticket data from localStorage (passed from OrderEntry)
  useEffect(() => {
    try {
      setLoading(true);
      const rawOrderData = localStorage.getItem('order_data');
      
      if (!rawOrderData) {
        throw new Error('No order data found');
      }
      
      const orderData = JSON.parse(rawOrderData);
      const { foodItems, drinkItems, orderId, timestamp, waiterId, waiterName } = orderData;
      
      // Create food ticket if food items exist
      if (foodItems && foodItems.length > 0) {
        setFoodTicketData({
          type: 'kitchen',
          items: foodItems,
          orderId,
          timestamp,
          waiterId,
          waiterName,
          isDraft: true
        });
      }
      
      // Create drink ticket if drink items exist
      if (drinkItems && drinkItems.length > 0) {
        setDrinkTicketData({
          type: 'barman',
          items: drinkItems,
          orderId,
          timestamp,
          waiterId,
          waiterName,
          isDraft: true
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load ticket data:', err);
      setError('Failed to load ticket data: ' + err.message);
      setLoading(false);
    }
  }, []);
  
  const handlePrint = () => {
    // Create a printable version of the tickets
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      alert('Please allow pop-ups to print tickets');
      return;
    }
    
    // Add the content to the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>Order Tickets</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            html, body {
              width: 58mm;
              margin: 0;
              padding: 0;
              overflow-x: hidden;
              background-color: white;
            }
            body {
              font-family: 'Courier New', monospace; /* Use monospaced font for thermal printers */
              margin: 0;
              padding: 0;
              width: 58mm; /* Standard thermal receipt width */
            }
            .ticket {
              padding: 2px;
              page-break-after: always;
              width: 100%;
              max-width: 58mm;
              overflow-x: hidden;
              box-sizing: border-box;
              margin-bottom: 5mm;
            }
            .header {
              text-align: center;
              margin-bottom: 2px;
            }
            .header h1 {
              font-size: 14px;
              margin: 1px 0;
              font-weight: bold;
            }
            .header div {
              font-size: 9px;
            }
            .detail {
              display: flex;
              justify-content: space-between;
              margin-bottom: 1px;
              font-size: 9px;
            }
            .divider {
              border-top: 1px dashed #999;
              margin: 3px 0;
            }
            .item {
              margin-bottom: 2px;
              font-size: 10px;
              font-weight: normal;
              max-width: 58mm;
              overflow: hidden;
            }
            .quantity {
              font-weight: bold;
              font-size: 12px;
            }
            .footer {
              text-align: center;
              font-size: 8px;
              margin-top: 4px;
              font-weight: bold;
            }
            * {
              line-height: 1.1;
              max-width: 58mm;
              box-sizing: border-box;
            }
            h2 {
              font-size: 12px;
              margin: 3px 0;
              text-decoration: underline;
              font-weight: bold;
            }
          </style>
        </head>
        <body onload="window.print();">
    `);
    
    // Add food ticket if it exists
    if (foodTicketData) {
      printWindow.document.write(`
        <div class="ticket">
          <div class="header">
            <h1>KITCHEN ORDER</h1>
            <div>*** DRAFT - NOT A RECEIPT ***</div>
          </div>
          <div class="divider"></div>
          <div class="detail">
            <div>Order: #${foodTicketData.orderId}</div>
            <div>Time: ${new Date(foodTicketData.timestamp).toLocaleTimeString()}</div>
          </div>
          <div class="detail">
            <div>Waiter: ${foodTicketData.waiterName}</div>
            <div>Table: ${foodTicketData.table || 'N/A'}</div>
          </div>
          <div class="divider"></div>
          <h2>FOOD ITEMS</h2>
          ${foodTicketData.items.map(item => `
            <div class="item">
              <span class="quantity">${item.quantity}x</span> ${item.name}
              ${item.description ? `<div style="font-size: 8px; margin-left: 12px; margin-top: 1px;">${item.description}</div>` : ''}
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="footer">
            <div>KITCHEN COPY</div>
            <div>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      `);
    }
    
    // Add drink ticket if it exists
    if (drinkTicketData) {
      printWindow.document.write(`
        <div class="ticket">
          <div class="header">
            <h1>BAR ORDER</h1>
            <div>*** DRAFT - NOT A RECEIPT ***</div>
          </div>
          <div class="divider"></div>
          <div class="detail">
            <div>Order: #${drinkTicketData.orderId}</div>
            <div>Time: ${new Date(drinkTicketData.timestamp).toLocaleTimeString()}</div>
          </div>
          <div class="detail">
            <div>Waiter: ${drinkTicketData.waiterName}</div>
            <div>Table: ${drinkTicketData.table || 'N/A'}</div>
          </div>
          <div class="divider"></div>
          <h2>DRINK ITEMS</h2>
          ${drinkTicketData.items.map(item => `
            <div class="item">
              <span class="quantity">${item.quantity}x</span> ${item.name}
              ${item.description ? `<div style="font-size: 8px; margin-left: 12px; margin-top: 1px;">${item.description}</div>` : ''}
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="footer">
            <div>BAR COPY</div>
            <div>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      `);
    }
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    // Auto-print will be triggered by onload in the body tag
  };
  
  const handleBack = () => {
    navigate('/cashier/order');
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error || (!foodTicketData && !drinkTicketData)) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || 'No ticket data available'}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Order Entry
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
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print Tickets
          </Button>
        </Box>
      </Box>
      
      {/* Tab navigation - only visible on screen */}
      {foodTicketData && drinkTicketData && (
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ mb: 2 }}
          className="no-print"
        >
          <Tab label="Kitchen Ticket" />
          <Tab label="Bar Ticket" />
          <Tab label="Preview All" />
        </Tabs>
      )}
      
      <Grid container spacing={3}>
        {/* Kitchen Ticket */}
        {foodTicketData && (activeTab === 0 || activeTab === 2 || !drinkTicketData) && (
          <Grid item xs={12} md={activeTab === 2 ? 6 : 6} sx={{ mx: 'auto' }}>
            <Paper className="print-area" sx={{ p: 4, mb: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <KitchenIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" gutterBottom align="center">
                  KITCHEN ORDER
                </Typography>
                <Chip 
                  label="DRAFT" 
                  color="warning" 
                  variant="outlined" 
                  sx={{ mb: 1 }}
                  className="no-print"
                />
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Order ID:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {foodTicketData.orderId}
                  </Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" color="text.secondary">
                    Time:
                  </Typography>
                  <Typography variant="body1">
                    {new Date(foodTicketData.timestamp).toLocaleTimeString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Waiter:
                  </Typography>
                  <Typography variant="body1">
                    {foodTicketData.waiterName}
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom>
                Food Items
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 3 }}>
                <List>
                  {foodTicketData.items.map((item, index) => (
                    <ListItem key={index} divider={index < foodTicketData.items.length - 1}>
                      <ListItemText
                        primary={
                          <Typography variant="h6">
                            {item.quantity}x {item.name}
                          </Typography>
                        }
                        secondary={item.description || ''}
                      />
                    </ListItem>
                  ))}
                </List>
              </Card>
              
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  KITCHEN COPY - NOT A RECEIPT
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {new Date().toLocaleString()}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}
        
        {/* Bar Ticket - with next-page class for printing */}
        {drinkTicketData && (activeTab === 1 || activeTab === 2 || !foodTicketData) && (
          <Grid item xs={12} md={activeTab === 2 ? 6 : 6} sx={{ mx: 'auto' }} className={foodTicketData ? "next-page" : ""}>
            <Paper className="print-area" sx={{ p: 4, mb: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <BarIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" gutterBottom align="center">
                  BAR ORDER
                </Typography>
                <Chip 
                  label="DRAFT" 
                  color="warning" 
                  variant="outlined" 
                  sx={{ mb: 1 }}
                  className="no-print"
                />
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Order ID:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {drinkTicketData.orderId}
                  </Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" color="text.secondary">
                    Time:
                  </Typography>
                  <Typography variant="body1">
                    {new Date(drinkTicketData.timestamp).toLocaleTimeString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Waiter:
                  </Typography>
                  <Typography variant="body1">
                    {drinkTicketData.waiterName}
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom>
                Drink Items
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 3 }}>
                <List>
                  {drinkTicketData.items.map((item, index) => (
                    <ListItem key={index} divider={index < drinkTicketData.items.length - 1}>
                      <ListItemText
                        primary={
                          <Typography variant="h6">
                            {item.quantity}x {item.name}
                          </Typography>
                        }
                        secondary={item.description || ''}
                      />
                    </ListItem>
                  ))}
                </List>
              </Card>
              
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  BAR COPY - NOT A RECEIPT
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {new Date().toLocaleString()}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
} 