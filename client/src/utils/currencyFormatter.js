/**
 * Currency Formatter Utility
 * 
 * This utility provides functions to format currency values in Ethiopian Birr (ETB).
 */

/**
 * Format a number as Ethiopian Birr (ETB) currency
 * 
 * @param {number} amount - The amount to format
 * @param {boolean} showSymbol - Whether to include the currency symbol (default: true)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, showSymbol = true) => {
  // Handle invalid inputs
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? 'Br 0.00' : '0.00';
  }

  // Format with Ethiopian Birr symbol and thousand separators
  const formatter = new Intl.NumberFormat('en-ET', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedAmount = formatter.format(amount);
  
  return showSymbol ? `Br ${formattedAmount}` : formattedAmount;
};

/**
 * Parse a currency string into a number
 * 
 * @param {string} currencyString - The currency string to parse
 * @returns {number} - Parsed numeric value
 */
export const parseCurrency = (currencyString) => {
  if (!currencyString) return 0;
  
  // Remove currency symbol and commas
  const numericString = currencyString.replace(/[^\d.-]/g, '');
  return parseFloat(numericString) || 0;
};

export default {
  formatCurrency,
  parseCurrency
}; 