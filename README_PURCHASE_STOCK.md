# Stock Management System - Updated Structure

## Database Changes
The system now uses two separate tables:

### 1. `purchases` table
- Tracks all purchase transactions
- Records: product_id, user_id, quantity, cost_price, selling_price, created_at
- Each purchase creates a separate record
- Linked to specific user who made the purchase

### 2. `stock` table  
- Tracks current inventory levels only
- Records: product_id, quantity, created_at, updated_at
- One record per product (unique product_id)
- Simplified structure - only stores total quantity

## API Endpoints

### Purchases (`/api/purchases`)
- `POST /` - Add new purchase (automatically updates stock)
- `GET /` - Get all purchases (with optional filters)
- `GET /:id` - Get single purchase
- `PUT /:id` - Update purchase
- `DELETE /:id` - Delete purchase
- `GET /summary` - Get purchase summary

### Stock (`/api/stock`)
- `GET /` - Get current stock levels for all products
- `GET /:id` - Get stock for specific product
- `PUT /:id` - Update stock details
- `POST /adjust` - Manual stock adjustments (increase/decrease)
- `DELETE /:id` - Delete stock record

## Workflow

1. **Add Product**: Create product via `/api/products`
2. **Make Purchase**: Add purchase via `/api/purchases` 
   - This automatically creates or updates stock inventory
3. **Check Stock**: View current levels via `/api/stock`
4. **Make Sales**: Record sales via `/api/stock-out`
5. **Adjust Stock**: Manual adjustments via `/api/stock/adjust`

## Key Features

- **Automatic Stock Updates**: Purchases automatically update inventory
- **Separate Transaction History**: All purchases are tracked separately
- **Current Inventory Tracking**: Real-time stock levels
- **Manual Adjustments**: Handle damages, corrections, etc.
- **Comprehensive Reporting**: Purchase history and stock analysis

## Example Usage

```json
// Add a purchase
POST /api/purchases
{
    "product_id": 1,
    "quantity": 100,
    "cost_price": 800.00,
    "selling_price": 1200.00
}

// This automatically updates stock table:
// - If product exists in stock: quantity += 100
// - If product doesn't exist: creates new stock record with quantity = 100

// Check current stock
GET /api/stock
// Returns current inventory levels for all products

// Manual stock adjustment (for damages, etc.)
POST /api/stock/adjust
{
    "product_id": 1,
    "adjustment_quantity": 5,
    "adjustment_type": "decrease",
    "reason": "Damaged goods"
}
```

This structure provides better separation of concerns and more accurate inventory tracking.