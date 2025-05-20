# Receipt and Ticket Customization Guide

This guide explains how to customize the appearance and content of receipts and tickets in the POS system.

## File Locations

1. Customer Receipt: `client/src/pages/cashier/Receipt.jsx`
2. Kitchen Ticket: `client/src/pages/cashier/OrderTicket.jsx`
3. Bar Ticket: `client/src/pages/cashier/OrderTicket.jsx`

## Common Customization Tasks

### 1. Changing Paper Size

The default paper size is 58mm (standard thermal receipt width). To change this:

```css
@page {
    size: 58mm auto;  /* Change 58mm to your desired width */
    margin: 0;
}

html, body {
    width: 58mm;  /* Change to match @page size */
    margin: 0;
    padding: 0;
}
```

### 2. Modifying Font Sizes

Each document type has its own typography settings:

```css
/* Customer Receipt */
.header h1 { font-size: 14px; }  /* Restaurant name */
.detail { font-size: 9px; }      /* Order details */
.item-name { font-size: 9px; }   /* Item names */
.total { font-size: 11px; }      /* Total amounts */

/* Kitchen Ticket */
.header h1 { font-size: 14px; }  /* KITCHEN ORDER text */
.item { font-size: 12px; }       /* Item names */
.quantity { font-size: 14px; }   /* Quantity numbers */
.description { font-size: 8px; }  /* Item descriptions */

/* Bar Ticket */
.header h1 { font-size: 14px; }  /* BAR ORDER text */
.item { font-size: 11px; }       /* Item names */
.quantity { font-size: 13px; }   /* Quantity numbers */
.description { font-size: 8px; }  /* Item descriptions */
```

### 3. Customizing Header Content

Each document type has a header section that can be customized:

```javascript
// Customer Receipt Header
<div className="header">
    <h1>{restaurantName}</h1>
    <p>{address}</p>
    <p>{phone}</p>
    <p>{taxId}</p>
</div>

// Kitchen/Bar Ticket Header
<div className="header">
    <h1>{ticketType} ORDER</h1>
    <div>{draftNotice}</div>
</div>
```

### 4. Adding Custom Fields

To add new fields to receipts or tickets:

1. Add the field to the data structure:
```javascript
const receiptData = {
    // ... existing fields ...
    customField1: "Value 1",
    customField2: "Value 2"
};
```

2. Add the display element:
```javascript
<div className="custom-field">
    <span className="label">{customFieldLabel}:</span>
    <span className="value">{customFieldValue}</span>
</div>
```

3. Style the new elements:
```css
.custom-field {
    font-size: 9px;
    margin: 1mm 0;
}
.custom-field .label {
    font-weight: bold;
}
```

### 5. Modifying Layout Spacing

Adjust margins and padding for different sections:

```css
/* Section spacing */
.header { margin-bottom: 3mm; }
.detail { margin-bottom: 2mm; }
.items { margin: 3mm 0; }
.totals { margin-top: 3mm; }
.footer { margin-top: 4mm; }

/* Item spacing */
.item {
    margin-bottom: 1mm;
    padding: 0.5mm 0;
}
```

### 6. Adding Divider Lines

Customize the appearance of divider lines:

```css
.divider {
    border-top: 1px dashed #000;  /* Change style: solid, dotted, etc. */
    margin: 2mm 0;                /* Adjust spacing */
}

/* Alternative styles */
.divider-solid {
    border-top: 1px solid #000;
}

.divider-double {
    border-top: 3px double #000;
}
```

### 7. Customizing Print Settings

Modify print-specific styles:

```css
@media print {
    /* Hide specific elements when printing */
    .no-print {
        display: none !important;
    }
    
    /* Force page breaks */
    .page-break {
        page-break-after: always;
    }
    
    /* Remove shadows and decorations */
    .print-area {
        box-shadow: none !important;
        border: none !important;
    }
}
```

## Best Practices

1. **Font Sizes**
   - Keep body text between 8-10px for receipts
   - Use 11-14px for headers and important information
   - Ensure kitchen/bar tickets use larger fonts (11-14px)

2. **Spacing**
   - Use millimeters (mm) for consistent printing
   - Keep margins between 1-3mm for content sections
   - Allow 4-5mm for major section breaks

3. **Content Organization**
   - Group related information together
   - Use divider lines to separate sections
   - Keep most important information at the top

4. **Print Optimization**
   - Test prints on actual thermal paper
   - Ensure content fits within paper width
   - Use page breaks appropriately

5. **Responsive Design**
   - Test with different content lengths
   - Handle long item names gracefully
   - Account for optional fields

## Testing Changes

After making customizations:

1. Test print preview in browser
2. Print test copies on actual receipt printer
3. Verify alignment and spacing
4. Check readability of all text
5. Ensure page breaks work correctly
6. Test with maximum content length
7. Verify thermal printer compatibility 