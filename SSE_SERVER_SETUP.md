# NowCerts MCP SSE Server Setup Guide

This guide will help you set up and run the NowCerts MCP server with SSE (Server-Sent Events) transport for remote access from Claude Desktop.

## Current Status

✅ **COMPLETED:**
- SSE transport support added to index.ts
- TypeScript code compiled successfully
- Test server running on port 3000
- Health check endpoint working: http://localhost:3000/health

## What You Need

### 1. API Credentials

You need NowCerts API credentials to use the full server functionality:

- `NOWCERTS_USERNAME` - Your NowCerts username
- `NOWCERTS_PASSWORD` - Your NowCerts password

**Optional credentials for additional features:**
- `FENRIS_CLIENT_ID` and `FENRIS_CLIENT_SECRET` - For auto insurance prefill
- `SMARTY_AUTH_ID` and `SMARTY_AUTH_TOKEN` - For address validation
- `ASKKODIAK_GROUP_ID` and `ASKKODIAK_API_KEY` - For commercial insurance classification

### 2. Server Configuration

The server needs to be accessible from your Claude Desktop client at:
```
https://mcp.srv992249.hstgr.cloud/sse
```

## Setup Instructions

### Step 1: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env

# Edit with your credentials
nano .env
```

Or set environment variables directly:

```bash
export NOWCERTS_USERNAME="your-username"
export NOWCERTS_PASSWORD="your-password"
# Add other optional credentials as needed
```

### Step 2: Start the Server

#### Option A: Test Server (No Credentials Required)

To test the SSE connection without NowCerts credentials:

```bash
PORT=3000 node test-sse.js
```

This starts a test server with two simple tools:
- `test_connection` - Verify the server is working
- `echo` - Echo back a message

#### Option B: Full Production Server (Requires Credentials)

To start the full NowCerts MCP server with all 100+ tools:

```bash
# Method 1: Using environment variables
USE_SSE=true PORT=3000 \
  NOWCERTS_USERNAME="your-username" \
  NOWCERTS_PASSWORD="your-password" \
  node dist/index.js

# Method 2: Using a .env file (recommended)
# First, create .env file with your credentials
# Then use the provided script:
./start-server.sh
```

### Step 3: Verify Server is Running

Check the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "nowcerts-mcp-server",
  "timestamp": "2025-10-24T21:34:25.423Z",
  "uptime": 10.497962702,
  "sessions": 0
}
```

### Step 4: Make Server Accessible Remotely

Since you're accessing from Claude Desktop on Windows to `https://mcp.srv992249.hstgr.cloud/sse`, you need to:

#### Option A: Use SSH Port Forwarding (Quick Test)

From your Windows machine:
```bash
ssh -L 3000:localhost:3000 root@srv992249.hstgr.cloud
```

Then in Claude Desktop, use: `http://localhost:3000/sse`

#### Option B: Set Up Reverse Proxy with SSL (Production)

You'll need to configure a reverse proxy (nginx, caddy, or similar) to:
1. Listen on port 443 (HTTPS)
2. Handle SSL certificates for `mcp.srv992249.hstgr.cloud`
3. Proxy requests to `http://localhost:3000/sse`

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name mcp.srv992249.hstgr.cloud;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /sse {
        proxy_pass http://localhost:3000/sse;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE specific settings
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

### Step 5: Connect from Claude Desktop

In Claude Desktop for Windows, use the Custom Connector feature with:

```
https://mcp.srv992249.hstgr.cloud/sse
```

Or if using local port forwarding:

```
http://localhost:3000/sse
```

## Keeping the Server Running

### Option A: Using nohup (Simple)

```bash
nohup ./start-server.sh > server.log 2>&1 &
```

### Option B: Using screen (Recommended for Development)

```bash
screen -S mcp-server
./start-server.sh
# Press Ctrl+A then D to detach
# To reattach: screen -r mcp-server
```

### Option C: Using PM2 (Recommended for Production)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name nowcerts-mcp \
  --node-args="--env-file=.env" \
  -- USE_SSE=true PORT=3000

# View logs
pm2 logs nowcerts-mcp

# Make it start on boot
pm2 startup
pm2 save
```

## Troubleshooting

### Server won't start - "Environment variables must be set"

Make sure you've configured your `.env` file or exported the environment variables:
```bash
export NOWCERTS_USERNAME="your-username"
export NOWCERTS_PASSWORD="your-password"
```

### Connection refused from Claude Desktop

1. Check the server is running: `curl http://localhost:3000/health`
2. Verify the port is open: `netstat -tlnp | grep 3000`
3. Check firewall rules
4. Verify reverse proxy configuration (if using)

### SSL/HTTPS errors

- Ensure SSL certificates are valid and not expired
- Check that the reverse proxy is properly configured
- Verify DNS points to the correct server

### "Invalid or missing session ID" errors

This is normal for the initial GET request. The MCP protocol requires:
1. POST request to initialize session
2. Server returns session ID
3. GET request with session ID to establish SSE stream

Claude Desktop handles this automatically.

## Server Logs

View real-time logs:

```bash
# If running with PM2
pm2 logs nowcerts-mcp

# If running with nohup
tail -f server.log

# If running with screen
screen -r mcp-server
```

## Testing the Connection

### Test with curl

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test root endpoint
curl http://localhost:3000/

# Test SSE endpoint (expect 400 - this is normal without proper MCP handshake)
curl -I http://localhost:3000/sse
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/sse
```

## Next Steps

1. ✅ Set up your `.env` file with API credentials
2. ✅ Start the server with `./start-server.sh`
3. ✅ Verify it's running with `curl http://localhost:3000/health`
4. ⚠️ Configure reverse proxy with SSL (if accessing remotely)
5. ⚠️ Connect from Claude Desktop

## Files Created

- `src/index.ts` - Modified to support SSE transport via `USE_SSE=true` environment variable
- `test-sse.js` - Test server without credentials requirement
- `start-server.sh` - Startup script (to be created)
- `SSE_SERVER_SETUP.md` - This documentation file

## Support

If you encounter issues:
1. Check server logs
2. Verify all environment variables are set
3. Test with the test server first (`node test-sse.js`)
4. Ensure network connectivity
5. Check firewall and reverse proxy configuration
