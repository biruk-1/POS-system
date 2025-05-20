# Kitchen Order Ticket Styling Guide

## Current Implementation Location
File: `client/src/pages/cashier/OrderTicket.jsx`

## CSS Styles

### Page Setup
```css
@page {
    size: 58mm auto;
    margin: 0;
    padding: 0;
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

### Basic Ticket Layout
```css
.ticket {
    padding: 2px;
    page-break-after: always;
    width: 100%;
    max-width: 58mm;
    overflow-x: hidden;
    box-sizing: border-box;
    margin-bottom: 5mm;
}
```
Location: Lines 154-162

### Typography
```css
/* Headers */
.header h1 {
    font-size: 14px;
    margin: 1px 0;
    font-weight: bold;
}

.header div {
    font-size: 9px;
}

/* Items */
.item {
    font-size: 12px;
    margin-bottom: 1px;
}

.quantity {
    font-weight: bold;
    font-size: 14px;
}

/* Description */
.description {
    font-size: 8px;
    margin-left: 12px;
    margin-top: 1px;
}
```
Location: Lines 163-185

### Print-specific Styles
```css
@media print {
    .print-area, .print-area * {
        visibility: visible;
    }
    .print-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 58mm;
        padding: 0;
        margin: 0;
        box-shadow: none !important;
    }
    .no-print {
        display: none !important;
    }
    /* Kitchen tickets need to be compact but clear */
    .print-area .MuiPaper-root {
        box-shadow: none !important;
        padding: 0 !important;
        margin-bottom: 8mm !important;
        page-break-after: always !important;
    }
}
```
Location: Lines 31-86

## HTML Template Structure
The kitchen ticket template is structured as follows:

```html
<div class="ticket">
    <!-- Header -->
    <div class="header">
        <h1>KITCHEN ORDER</h1>
        <div>*** DRAFT - NOT A RECEIPT ***</div>
    </div>
    
    <!-- Order Info -->
    <div class="detail">
        <div>Order: #{orderId}</div>
        <div>Time: {timestamp}</div>
    </div>
    <div class="detail">
        <div>Waiter: {waiterName}</div>
        <div>Table: {table}</div>
    </div>
    
    <!-- Items -->
    <div class="items">
        <h2>FOOD ITEMS</h2>
        {items.map(item => (
            <div class="item">
                <span class="quantity">{item.quantity}x</span> {item.name}
                {item.description && (
                    <div class="description">{item.description}</div>
                )}
            </div>
        ))}
    </div>
    
    <!-- Footer -->
    <div class="footer">
        <div>KITCHEN COPY</div>
        <div>{timestamp}</div>
    </div>
</div>
```
Location: Lines 250-285

## Customization Points

1. Header Format (Lines 251-255):
```javascript
<div class="header">
    <h1>KITCHEN ORDER</h1>
    <div>*** DRAFT - NOT A RECEIPT ***</div>
</div>
```

2. Item Display Format (Lines 270-275):
```javascript
<div class="item">
    <span class="quantity">{item.quantity}x</span> {item.name}
    {item.description && (
        <div class="description">{item.description}</div>
    )}
</div>
```

## Implementation Notes

1. Kitchen tickets use larger font sizes than regular receipts for better visibility
2. Quantity numbers are emphasized with bold text and larger size
3. Each ticket starts on a new page (page-break-after: always)
4. Optional item descriptions are shown in smaller text below the item name
5. The template includes clear "KITCHEN COPY" marking
6. Time stamps are prominently displayed for order timing
7. The layout is optimized for quick reading in a busy kitchen environment 