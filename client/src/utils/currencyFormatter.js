/**
 * Format a number as Ethiopian Birr (ETB) currency
 * @param {number} amount - The amount to format
 * @param {boolean} showSymbol - Whether to show the currency symbol
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, showSymbol = true) => {
  // Handle undefined or null values
  if (amount === undefined || amount === null) {
    return showSymbol ? 'Br 0.00' : '0.00';
  }
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format with 2 decimal places
  const formatted = numAmount.toFixed(2);
  
  // Return with or without currency symbol
  return showSymbol ? `Br ${formatted}` : formatted;
}; 