const express = require('express');
const router = express.Router();

// Proxy routes for handling external API calls
router.get('/test', (req, res) => {
  res.json({ message: 'Proxy route is working' });
});

// Example route for external API
router.post('/external-api', (req, res) => {
  // Here you would typically make a request to an external API
  // For now just return a mock response
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      message: 'External API call simulated'
    }
  });
});

// Mock responses for extensions.aitopia.ai endpoints
router.all('/ai/prompts', (req, res) => {
  res.json({ prompts: [] });
});

router.all('/ai/model_settings', (req, res) => {
  res.json({ settings: {} });
});

router.all('/languages/lang/get/lang/:lang', (req, res) => {
  res.json({ lang: req.params.lang, messages: {} });
});

router.all('/extensions/app/get_key', (req, res) => {
  res.json({ success: true });
});

// Add more proxy routes as needed

module.exports = router;
