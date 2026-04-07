# Neon Database Configuration Guide

## Problem
Neon terminates idle connections after ~5 minutes. This causes `57P01` errors when the pool tries to reuse dead connections.

## Solution Applied
1. **Reduced idle timeout** to 4 minutes (240s) in pool configuration
2. **Reduced max connections** to 10 (Neon free tier has connection limits)
3. **Added connection validation** before reuse
4. **Improved error handling** for connection failures

## Database URL Format
```
postgresql://neondb_owner:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Environment Variables (.env)
```
DATABASE_URL=postgresql://neondb_owner:your_password@ep-shiny-bar-amvajn57.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=development
PORT=4000
```

## Connection Pooling Settings
- **idleTimeoutMillis**: 240000 (4 minutes - less than Neon's 5 minute timeout)
- **connectionTimeoutMillis**: 10000 (10 seconds)
- **statementTimeoutMillis**: 30000 (30 seconds per query)
- **max connections**: 10 (Neon free tier limit)
- **min connections**: 1

## If You Still Get Connection Errors

1. **Check Neon Dashboard**
   - Verify your database is running
   - Check if you've exceeded connection limits

2. **Verify CONNECTION STRING**
   ```bash
   psql "your_database_url"
   ```

3. **Reduce Connection Pool Further**
   - Edit `src/services/db.js`
   - Change `max: 10` to `max: 5`
   - Change `idleTimeoutMillis: 240000` to `idleTimeoutMillis: 180000` (3 minutes)

4. **Enable Debug Logging**
   ```bash
   DEBUG=pg:* npm run dev
   ```

## Neon-Specific Tips
- Use a Connection Pooler (Neon PgBouncer) for serverless functions
- Keep connections short-lived
- Avoid long-running transactions
- Monitor your connection count in Neon Dashboard
