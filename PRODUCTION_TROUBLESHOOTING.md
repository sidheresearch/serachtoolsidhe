# Production Deployment Checklist & Troubleshooting Guide

## Issue: Empty suggestions array in production

### Root Cause
The API returns empty `[]` for suggestions in production because:
1. **Database connection failure** - The `.env` file with `DATABASE_URL` is not loaded in production
2. **Silent error handling** - Errors were caught and returned empty sample data instead of raising exceptions

### Fixes Applied

#### 1. Improved Error Handling (services.py)
- ✅ Changed all data loading functions to **raise exceptions** instead of returning sample data
- ✅ Added detailed traceback logging for debugging
- ✅ Functions affected:
  - `get_unique_product_names()`
  - `get_product_names()`
  - `get_entities()`
  - `get_hs_codes()`

#### 2. Enhanced API Logging (app.py)
- ✅ Added detailed logging in `/api/search/suggestions` endpoint
- ✅ Improved error messages with stack traces
- ✅ Added `/health` endpoint to check database connectivity

#### 3. Database Connectivity Test Script
- ✅ Created `test_production_db.py` to verify database connection

## Deployment Steps for Production

### Step 1: Verify .env File Exists on EC2
```bash
ssh -i your-key.pem ubuntu@13.201.124.135

cd /path/to/python-backend
ls -la .env  # Should show the file

# Check contents (be careful with credentials)
cat .env
```

**Expected content:**
```
DATABASE_URL=postgresql://klj_analytics_rw:uI5_HkBCB1Gcq2LYcQtX@crystal-analytics-db.c30ye0yuuri7.ap-south-1.rds.amazonaws.com:5432/postgres
```

### Step 2: Test Database Connection
```bash
cd /path/to/python-backend
source venv/bin/activate  # or activate your virtual environment
python test_production_db.py
```

**Expected output:**
```
✓ DATABASE_URL found
✓ Engine created successfully
✓ Connection successful!
✓ Query successful! Retrieved 10 rows
✓ Total unique product names in database: XXXX
✅ ALL TESTS PASSED - Database is accessible
```

### Step 3: Check Application Logs
```bash
# If using PM2
pm2 logs python-backend

# If using systemd
sudo journalctl -u your-app-service -f

# If running directly
# Check the terminal output where uvicorn is running
```

### Step 4: Test Health Endpoint
```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "api": "running",
  "database_url_configured": true,
  "database_connection": "connected",
  "environment": "production"
}
```

**If database_connection is "failed":**
```json
{
  "status": "healthy",
  "api": "running",
  "database_url_configured": false,
  "database_connection": "failed",
  "database_error": "DATABASE_URL not found in environment variables"
}
```

### Step 5: Restart the Application
```bash
# If using PM2
pm2 restart python-backend

# If using systemd
sudo systemctl restart your-app-service

# If running directly
# Stop the current process (Ctrl+C) and run:
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Step 6: Test the API
```bash
# Test from production server
curl "http://localhost:8000/api/search/suggestions?query=methanol&search_type=unique_product_name&limit=10"

# Test from external
curl "http://13.201.124.135:8000/api/search/suggestions?query=methanol&search_type=unique_product_name&limit=10"
```

## Common Issues & Solutions

### Issue 1: `.env` file not found
**Symptom:** `DATABASE_URL not found in environment variables`

**Solution:**
```bash
# Create .env file in production
cd /path/to/python-backend
nano .env

# Add this line:
DATABASE_URL=postgresql://klj_analytics_rw:uI5_HkBCB1Gcq2LYcQtX@crystal-analytics-db.c30ye0yuuri7.ap-south-1.rds.amazonaws.com:5432/postgres

# Save and restart the app
```

### Issue 2: Database connection timeout
**Symptom:** `connection timeout` or `could not connect to server`

**Solution:**
1. Check EC2 security group allows outbound traffic to RDS
2. Check RDS security group allows inbound from EC2
3. Verify RDS endpoint is correct
```bash
# Test network connectivity
telnet crystal-analytics-db.c30ye0yuuri7.ap-south-1.rds.amazonaws.com 5432
# or
nc -zv crystal-analytics-db.c30ye0yuuri7.ap-south-1.rds.amazonaws.com 5432
```

### Issue 3: Permission denied (RDS credentials)
**Symptom:** `password authentication failed`

**Solution:**
1. Verify credentials in .env file
2. Check if database user has correct permissions
3. Try connecting with psql:
```bash
psql -h crystal-analytics-db.c30ye0yuuri7.ap-south-1.rds.amazonaws.com -U klj_analytics_rw -d postgres
```

### Issue 4: Table not found
**Symptom:** `relation "klj_analytics.product_icegate_imports" does not exist`

**Solution:**
1. Verify the schema and table exist:
```bash
psql -h crystal-analytics-db.c30ye0yuuri7.ap-south-1.rds.amazonaws.com -U klj_analytics_rw -d postgres -c "SELECT COUNT(*) FROM klj_analytics.product_icegate_imports;"
```

## Testing Checklist

After deployment, verify:
- [ ] `/health` endpoint returns `"database_connection": "connected"`
- [ ] `/api/search/suggestions?query=methanol&search_type=unique_product_name` returns suggestions
- [ ] `/api/search/suggestions?query=klj&search_type=entity` returns entities
- [ ] `/api/search/suggestions?query=123&search_type=hs_code` returns HS codes
- [ ] Logs show successful data loading: `"Loaded X unique product names into cache"`

## API Endpoints for Testing

### 1. Health Check
```bash
curl http://13.201.124.135:8000/health
```

### 2. Unique Product Name Suggestions
```bash
curl "http://13.201.124.135:8000/api/search/suggestions?query=methanol&search_type=unique_product_name&limit=10"
```

### 3. Product Name Suggestions
```bash
curl "http://13.201.124.135:8000/api/search/suggestions?query=chemical&search_type=product_name&limit=10"
```

### 4. Entity Suggestions
```bash
curl "http://13.201.124.135:8000/api/search/suggestions?query=klj&search_type=entity&limit=10"
```

### 5. HS Code Suggestions
```bash
curl "http://13.201.124.135:8000/api/search/suggestions?query=2905&search_type=hs_code&limit=10"
```

## Monitoring

### View Real-time Logs
```bash
# PM2
pm2 logs python-backend --lines 100

# Systemd
sudo journalctl -u your-app-service -f -n 100
```

### Check for Errors
```bash
# Search for database errors
pm2 logs python-backend | grep -i "database\|error\|exception"
```

## Quick Debug Commands

```bash
# 1. Check if app is running
curl http://localhost:8000/

# 2. Check database connectivity
curl http://localhost:8000/health

# 3. Test suggestion endpoint
curl "http://localhost:8000/api/search/suggestions?query=test&search_type=unique_product_name&limit=5"

# 4. View recent logs
pm2 logs python-backend --lines 50

# 5. Restart app
pm2 restart python-backend
```

## Next Steps

1. **Deploy the updated code** to production server
2. **Ensure .env file exists** with correct DATABASE_URL
3. **Run test_production_db.py** to verify database connectivity
4. **Check /health endpoint** to confirm database connection
5. **Test the API** with actual queries
6. **Monitor logs** for any errors

## Support

If issues persist after following this guide:
1. Check application logs for detailed error messages
2. Run `test_production_db.py` and share the output
3. Check `/health` endpoint response
4. Verify network connectivity between EC2 and RDS
