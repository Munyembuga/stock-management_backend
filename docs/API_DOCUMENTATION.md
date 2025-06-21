# Stock Management API Documentation

## Overview
Complete API documentation for Stock Management System with user authentication and comprehensive stock control.

## Base URL
```
Production: https://stock-management-backend.onrender.com/api
Local: http://localhost:5000/api
```

## Authentication
All endpoints except registration and login require Bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
    "name": "John Doe",
    "phone": "0781234567",
    "email": "john@example.com",
    "password": "password123"
}
```

**Response:**
```json
{
    "token": "jwt-token-here",
    "user": {
        "id": 1,
        "name": "John Doe",
        "phone": "0781234567",
        "email": "john@example.com"
    }
}
```

#### POST /auth/login
Login with existing credentials.

**Request Body:**
```json
{
    "phone": "0781234567",
    "password": "password123"
}
```

#### GET /auth/me
Get current user details (requires authentication).

---

### 2. Products

#### GET /products
Get all products.

#### POST /products
Create a new product.

**Request Body:**
```json
{
    "name": "Ibirayi",
    "description": "Irish potatoes"
}
```

---

### 3. Purchases (User-Specific)

#### POST /purchases
Add purchase and automatically update stock.

**Request Body:**
```json
{
    "product_id": 1,
    "quantity": 100,
    "cost_price": 800.00,
    "selling_price": 1200.00
}
```

**Response:**
```json
{
    "message": "Purchase added and stock updated successfully",
    "purchase": {
        "id": 1,
        "product_id": 1,
        "user_id": 1,
        "quantity": 100,
        "cost_price": 800.00,
        "selling_price": 1200.00
    }
}
```

#### GET /purchases
Get all purchases for authenticated user.

**Query Parameters:**
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD  
- `product_id` (optional): Filter by product

#### GET /purchases/:id
Get single purchase by ID.

#### PUT /purchases/:id
Update purchase (user can only update their own purchases).

#### DELETE /purchases/:id
Delete purchase (user can only delete their own purchases).

#### GET /purchases/summary
Get purchase analytics for authenticated user.

**Query Parameters:**
- `start_date`, `end_date`, `product_id` (optional)

**Response:**
```json
{
    "summary": {
        "total_purchases": 10,
        "total_quantity": 1000,
        "total_cost": 800000,
        "potential_revenue": 1200000,
        "avg_cost_price": 800,
        "avg_selling_price": 1200
    }
}
```

---

### 4. Stock Management

#### GET /stock
Get current stock levels for all products.

**Response:**
```json
{
    "stock": [
        {
            "id": 1,
            "product_id": 1,
            "product_name": "Ibirayi",
            "quantity": 95,
            "total_purchased": 100,
            "total_sold": 5
        }
    ]
}
```

#### GET /stock/:id
Get single stock record.

#### POST /stock/adjust
Manual stock adjustment (for corrections, damages, etc.).

**Request Body:**
```json
{
    "product_id": 1,
    "adjustment_quantity": 10,
    "adjustment_type": "increase",
    "reason": "Found additional inventory"
}
```

**adjustment_type:** `increase` or `decrease`

#### PUT /stock/:id
Update stock record directly.

#### DELETE /stock/:id
Delete stock record.

---

### 5. Stock Out / Sales (User-Specific)

#### POST /stock-out
Record a sale with stock validation.

**Request Body:**
```json
{
    "product_id": 1,
    "quantity": 5,
    "selling_price": 1200.00
}
```

**Features:**
- Validates sufficient stock before allowing sale
- Prevents overselling
- User-specific records

**Error Response (Insufficient Stock):**
```json
{
    "message": "Insufficient stock available",
    "available_stock": 3,
    "requested_quantity": 5,
    "shortage": 2
}
```

#### GET /stock-out
Get all sales for authenticated user.

**Query Parameters:**
- `start_date`, `end_date`, `product_id` (optional)

#### GET /stock-out/:id
Get single sale record.

#### PUT /stock-out/:id
Update sale record (validates stock availability).

#### DELETE /stock-out/:id
Delete sale record.

#### GET /stock-out/summary/:product_id
Get stock summary for specific product.

**Response:**
```json
{
    "summary": {
        "product_id": 1,
        "product_name": "Ibirayi",
        "total_stock_in": 100,
        "total_stock_out": 5,
        "available_stock": 95,
        "stock_status": "Available"
    }
}
```

---

### 6. Expenses (User-Specific)

#### POST /expenses
Add expense record.

**General Expense:**
```json
{
    "expense_type": "general",
    "category": "Transportation",
    "description": "Fuel for delivery truck",
    "amount": 50000,
    "expense_date": "2024-06-15"
}
```

**Product-Specific Expense:**
```json
{
    "expense_type": "specific",
    "product_id": 1,
    "category": "Storage",
    "description": "Cold storage for potatoes",
    "amount": 25000,
    "expense_date": "2024-06-15"
}
```

#### GET /expenses
Get all expenses for authenticated user.

**Query Parameters:**
- `expense_type`: `general` or `specific`
- `category`: Filter by category
- `start_date`, `end_date`: Date range

#### GET /expenses/:id
Get single expense.

#### PUT /expenses/:id
Update expense.

#### DELETE /expenses/:id
Delete expense.

#### GET /expenses/summary
Get expense analytics.

**Response:**
```json
{
    "summary": {
        "totals": [
            {
                "expense_type": "general",
                "count": 5,
                "total_amount": 250000
            },
            {
                "expense_type": "specific",
                "count": 3,
                "total_amount": 75000
            }
        ],
        "by_category": [
            {
                "category": "Transportation",
                "expense_type": "general",
                "count": 3,
                "total_amount": 150000
            }
        ]
    }
}
```

---

## Authentication Flow

1. **Register** or **Login** to get JWT token
2. **Include token** in Authorization header for all subsequent requests
3. **All data is user-specific** - users can only access their own records

## Error Handling

### Common Error Responses:

**401 Unauthorized:**
```json
{
    "message": "Access denied. No token provided."
}
```

**400 Bad Request:**
```json
{
    "message": "Validation error message"
}
```

**404 Not Found:**
```json
{
    "message": "Resource not found"
}
```

**500 Server Error:**
```json
{
    "message": "Server error",
    "error": "Detailed error message"
}
```

## Key Features

### ✅ **User Authentication & Authorization**
- JWT-based authentication
- User-specific data isolation
- Secure password hashing

### ✅ **Stock Management**
- Automatic stock updates on purchases
- Manual stock adjustments
- Real-time stock validation
- Prevents overselling

### ✅ **Purchase Tracking**
- User-specific purchase records
- Cost and selling price tracking
- Purchase analytics

### ✅ **Sales Management**
- Stock validation before sales
- User-specific sales records
- Sales analytics

### ✅ **Expense Management**
- General and product-specific expenses
- Category-based organization
- Expense analytics

### ✅ **Data Integrity**
- Foreign key constraints
- Input validation
- Transaction safety