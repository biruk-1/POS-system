# Bar Order Ticket Styling Guide

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
    font-size: 11px;
    margin-bottom: 1px;
}

.quantity {
    font-weight: bold;
    font-size: 13px;
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
    /* Bar tickets need to be compact and clear */
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
The bar ticket template is structured as follows:

```html
<div class="ticket">
    <!-- Header -->
    <div class="header">
        <h1>BAR ORDER</h1>
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
        <h2>DRINK ITEMS</h2>
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
        <div>BAR COPY</div>
        <div>{timestamp}</div>
    </div>
</div>
```
Location: Lines 286-321

## Customization Points

1. Header Format (Lines 287-291):
```javascript
<div class="header">
    <h1>BAR ORDER</h1>
    <div>*** DRAFT - NOT A RECEIPT ***</div>
</div>
```

2. Item Display Format (Lines 306-311):
```javascript
<div class="item">
    <span class="quantity">{item.quantity}x</span> {item.name}
    {item.description && (
        <div class="description">{item.description}</div>
    )}
</div>
```

## Implementation Notes

1. Bar tickets use slightly smaller font sizes than kitchen tickets
2. Quantity numbers are emphasized but less prominent than kitchen tickets
3. Each ticket starts on a new page (page-break-after: always)
4. Optional item descriptions are shown in smaller text below the item name
5. The template includes clear "BAR COPY" marking
6. Time stamps are prominently displayed for order timing
7. The layout is optimized for quick reading in a busy bar environment
8. Font sizes are slightly smaller than kitchen tickets as bar orders typically have fewer details

## Differences from Kitchen Tickets

1. Font Sizes:
   - Bar ticket items: 11px (vs 12px for kitchen)
   - Bar ticket quantities: 13px (vs 14px for kitchen)

2. Header Text:
   - "BAR ORDER" instead of "KITCHEN ORDER"
   - "BAR COPY" instead of "KITCHEN COPY"

3. Section Title:
   - "DRINK ITEMS" instead of "FOOD ITEMS"

4. Layout Emphasis:
   - More compact layout as drink orders typically have fewer modifiers
   - Less prominent quantity markers as drink orders usually have simpler quantities 