# Deployment Guide for Stock Management Backend

## Aiven MySQL Setup

1. **Create an Aiven MySQL Service**
   - Sign up or login to [Aiven Console](https://console.aiven.io/)
   - Click "Create Service" and select "MySQL"
   - Choose your cloud provider, region, and plan
   - Set service name (e.g., "stock-management-db")
   - Click "Create Service"

2. **Get Connection Details**
   - Wait for service to be in "Running" state
   - Click on your service name
   - Go to "Overview" tab to find:
     - Host: `<service-name>-<project>.aivencloud.com`
     - Port: Usually displayed next to host
     - User: Default is "avnadmin"
     - Password: Shown in overview or can be reset
     - Database Name: Default "defaultdb" (create your own)

3. **Download CA Certificate**
   - Go to "Overview" tab
   - Find "SSL Certificate" section
   - Download "CA Certificate"
   - Save it in a secure location

## Application Configuration

1. **Create Production Environment File**
   - Copy `.env.production` to `.env`
   - Update values with your Aiven credentials:
     ```
     AIVEN_DB_HOST=your-service-name-project.aivencloud.com
     AIVEN_DB_PORT=12345
     AIVEN_DB_USER=avnadmin
     AIVEN_DB_PASSWORD=your-password
     AIVEN_DB_NAME=stock_management
     AIVEN_CA_CERT=/path/to/ca.pem
     ```

2. **Create Database Schema**
   - Connect to Aiven MySQL using MySQL client:
     ```
     mysql -h <host> -P <port> -u avnadmin -p --ssl-ca=/path/to/ca.pem
     ```
   - Create database and tables:
     ```sql
     CREATE DATABASE stock_management;
     USE stock_management;
     -- Run your table creation scripts here
     ```

## Deployment Steps

1. **Prepare Application for Production**
   ```bash
   npm install --production
   ```

2. **Set Node Environment**
   ```bash
   export NODE_ENV=production
   ```

3. **Start Application**
   ```bash
   npm start
   ```

4. **For Production Hosting**
   - Consider using process manager like PM2:
     ```bash
     npm install -g pm2
     pm2 start server.js --name "stock-backend"
     ```

## Troubleshooting

1. **Connection Issues**
   - Verify Aiven service is running
   - Check if IP allowlist includes your server IP
   - Verify CA certificate is correctly referenced

2. **SSL/TLS Issues**
   - Ensure CA certificate path is absolute
   - Check CA certificate expiration date
   - Try with rejectUnauthorized:false for testing only
