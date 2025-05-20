# Customer Receipt Styling Guide

## Current Implementation Location
File: `client/src/pages/cashier/Receipt.jsx`

## CSS Styles

### Page Setup
```css
@page {
    size: 58mm 180mm;
    margin: 0;
}

html, body {
    width: 58mm;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    background-color: white;
}
```
Location: Lines 31-42

### Basic Receipt Layout
```css
.receipt {
    padding: 3mm;
    width: 100%;
    max-width: 54mm;
    overflow-x: hidden;
    box-sizing: border-box;
}
```
Location: Lines 43-49

### Typography
```css
/* Headers */
.header h1 {
    font-size: 14px;
    margin: 2mm 0;
    font-weight: bold;
    letter-spacing: 0.5px;
}

.header p {
    font-size: 9px;
    margin: 1mm 0;
    color: #333;
}

/* Regular text */
.detail {
    font-size: 9px;
    line-height: 1.3;
}

/* Items */
.item-name {
    font-size: 9px;
    max-width: 30mm;
}

/* Totals */
.total {
    font-weight: bold;
    font-size: 11px;
}
```
Location: Lines 50-75

### Layout Components
```css
/* Item layout */
.item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2mm;
}

.item-details {
    display: flex;
    justify-content: space-between;
    width: 100%;
}

/* Columns */
.item-name { flex: 2; }
.item-qty { flex: 0.5; text-align: center; }
.item-price { flex: 0.8; text-align: right; }

/* Dividers */
.divider {
    border-top: 1px dashed #999;
    margin: 3mm 0;
}
```
Location: Lines 76-95

### Print-specific Styles
```css
@media print {
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
        width: 58mm;
    }
    .no-print {
        display: none !important;
    }
}
```
Location: Lines 96-110

## HTML Template Structure
The receipt template is structured as follows:

```html
<div class="receipt">
    <!-- Header -->
    <div class="header">
        <h1>MY RESTAURANT</h1>
        <p>Address and Contact Info</p>
    </div>
    
    <!-- Order Details -->
    <div class="detail">
        <div>Receipt #: {orderId}</div>
        <div>Date: {date}</div>
    </div>
    
    <!-- Items -->
    <div class="items">
        {items.map(item => (
            <div class="item">
                <div class="item-name">{item.name}</div>
                <div class="item-qty">{item.quantity}</div>
                <div class="item-price">{formatCurrency(item.price)}</div>
            </div>
        ))}
    </div>
    
    <!-- Totals -->
    <div class="totals">
        <div class="subtotal">Subtotal: {subtotal}</div>
        <div class="tax">Tax: {tax}</div>
        <div class="total">Total: {total}</div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
        <div>Thank you message</div>
        <div>Additional info</div>
    </div>
</div>
```
Location: Lines 216-300

## Customization Points

1. Restaurant Information (Lines 220-225):
```javascript
<div class="header">
    <h1>MY RESTAURANT</h1>
    <p>123 Restaurant St, Foodville, FC 12345</p>
    <p>Tel: (123) 456-7890</p>
</div>
```

2. Tax and Service Charge Rates (Lines 65-70):
```javascript
const tax = subtotal * 0.085; // 8.5% tax
const serviceCharge = subtotal * 0.1; // 10% service charge
```

3. Footer Message (Lines 290-295):
```javascript
<div class="footer">
    <div>Thank you for dining with us!</div>
    <div>{new Date().toLocaleDateString()}</div>
</div>
```

## Implementation Notes

1. The receipt uses a monospace font (Courier New) for consistent alignment
2. All measurements are in millimeters (mm) for thermal printer compatibility
3. The receipt width is set to 58mm (standard thermal receipt width)
4. Font sizes are optimized for readability on thermal paper
5. Dashed lines (dividers) are used for visual separation
6. The template includes both customer and merchant copies 