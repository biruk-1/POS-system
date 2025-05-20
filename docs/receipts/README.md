# POS System Receipt Documentation

This directory contains documentation for the POS system's receipt styling and implementation.

## Directory Structure

```
docs/receipts/
├── README.md                    # This file
├── styles/                      # Receipt styling documentation
│   ├── customer-receipt.md      # Customer receipt styles
│   ├── kitchen-ticket.md        # Kitchen ticket styles
│   └── bar-ticket.md           # Bar ticket styles
├── templates/                   # Receipt templates
│   ├── customer-receipt.html    # Customer receipt template
│   ├── kitchen-ticket.html      # Kitchen ticket template
│   └── bar-ticket.html         # Bar ticket template
└── implementation/             # Implementation guides
    ├── print-service.md        # Print service documentation
    └── customization.md        # Customization guide
```

## Current Implementation Locations

### Customer Receipt Styles
- Location: `client/src/pages/cashier/Receipt.jsx`
- Lines: 29-86 (Print styles)
- Lines: 216-300 (Receipt template)

### Kitchen & Bar Ticket Styles
- Location: `client/src/pages/cashier/OrderTicket.jsx`
- Lines: 31-86 (Print styles)
- Lines: 154-216 (Ticket template)

### Receipt Print Service
- Location: `server/src/index.js`
- Lines: 2098-2121 (Print receipt endpoint)

## Quick Start

1. Review the style documentation in the `styles/` directory
2. Check the templates in the `templates/` directory
3. Follow the implementation guides in `implementation/` for customization

## Related Components

- Receipt Component: `client/src/pages/cashier/Receipt.jsx`
- Order Ticket Component: `client/src/pages/cashier/OrderTicket.jsx`
- Settings Component: `client/src/pages/admin/Settings.jsx` 