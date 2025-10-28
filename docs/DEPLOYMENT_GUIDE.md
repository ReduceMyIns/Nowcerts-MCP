# NowCerts MCP Server - Production Deployment Guide

This guide provides multiple deployment options for running the NowCerts MCP server with HTTPS support, without interfering with your existing n8n setup.

## Current Situation

- Your server has n8n running in Docker on ports 80 and 443
- Docker reverse proxy (likely Traefik or nginx-proxy) handles SSL for n8n
- Need to run NowCerts MCP server at `https://mcp.srv992249.hstgr.cloud/sse`
- Claude Desktop requires HTTPS connections

## Deployment Options

### Option 1: Integrate with Existing Docker Reverse Proxy (RECOMMENDED)

This is the cleanest solution that leverages your existing Docker setup and SSL certificates.

#### Prerequisites
1. Your existing Docker reverse proxy must be configured to use a shared network
2. DNS for `mcp.srv992249.hstgr.cloud` must point to your server

#### Steps

**1. Create the proxy network (if it doesn't exist):**
```bash
docker network create proxy
```

**2. Create `.env` file with your credentials:**
```bash
cd ~/Nowcerts-MCP
cp .env.example .env
nano .env  # Add your NOWCERTS_USERNAME and NOWCERTS_PASSWORD
```

**3. Identify your reverse proxy type:**

If using **Traefik**, your docker-compose.yml is already configured with Traefik labels.

If using **nginx-proxy**, edit docker-compose.yml and:
- Comment out the Traefik labels (lines with `traefik.`)
- Uncomment the nginx-proxy labels (VIRTUAL_HOST, LETSENCRYPT_HOST, etc.)

**4. Build and start the container:**
```bash
docker-compose up -d --build
```

**5. Check logs:**
```bash
docker-compose logs -f
```

**6. Test the connection:**
```bash
# From local machine
curl https://mcp.srv992249.hstgr.cloud/health
```

**7. Connect from Claude Desktop:**
Use the Custom Connector with: `https://mcp.srv992249.hstgr.cloud/sse`

---

### Option 2: Standalone with systemd and Caddy on Port 8443

If you prefer not to use Docker or can't integrate with the existing proxy, run as a standalone service with Caddy on a custom HTTPS port.

#### Prerequisites
- Caddy must be installed (already done)
- Port 8443 must be open in firewall

#### Steps

**1. Create `.env` file:**
```bash
cd ~/Nowcerts-MCP
cp .env.example .env
nano .env  # Add your credentials
```

**2. Build the application:**
```bash
npm run build
```

**3. Create Caddy configuration:**
```bash
sudo tee /etc/caddy/Caddyfile > /dev/null << 'EOF'
{
    email admin@srv992249.hstgr.cloud
}

# HTTP on port 8080 - redirect to HTTPS
:8080 {
    redir https://mcp.srv992249.hstgr.cloud:8443{uri} permanent
}

# HTTPS on port 8443
:8443 {
    tls internal  # Self-signed cert (or use manual cert)

    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto https
        flush_interval -1
    }
}
EOF
```

**Note:** Using `tls internal` creates a self-signed certificate. Claude Desktop may require you to accept the certificate.

For a proper Let's Encrypt certificate on port 8443, you would need DNS-01 challenge (requires DNS provider API access).

**4. Create systemd service:**
```bash
sudo tee /etc/systemd/system/nowcerts-mcp.service > /dev/null << 'EOF'
[Unit]
Description=NowCerts MCP Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/Nowcerts-MCP
Environment="USE_SSE=true"
Environment="PORT=3000"
EnvironmentFile=/root/Nowcerts-MCP/.env
ExecStart=/usr/bin/node /root/Nowcerts-MCP/dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nowcerts-mcp.log
StandardError=append:/var/log/nowcerts-mcp-error.log

[Install]
WantedBy=multi-user.target
EOF
```

**5. Start services:**
```bash
# Reload Caddy
sudo systemctl reload caddy

# Enable and start MCP service
sudo systemctl daemon-reload
sudo systemctl enable nowcerts-mcp
sudo systemctl start nowcerts-mcp
```

**6. Check status:**
```bash
sudo systemctl status nowcerts-mcp
sudo systemctl status caddy
```

**7. Test:**
```bash
curl -k https://localhost:8443/health
```

**8. Connect from Claude Desktop:**
Use: `https://mcp.srv992249.hstgr.cloud:8443/sse`

---

### Option 3: SSH Tunnel (For Testing)

If you're having SSL issues, you can use SSH tunneling from your Windows machine.

**From Windows PowerShell:**
```powershell
ssh -L 3000:localhost:3000 root@72.60.119.133
```

**In Claude Desktop:**
Connect to: `http://localhost:3000/sse`

---

## Troubleshooting

### Check if Docker network exists
```bash
docker network ls | grep proxy
```

### View Docker logs
```bash
docker-compose logs -f nowcerts-mcp
```

### Check systemd service logs
```bash
sudo journalctl -u nowcerts-mcp -f
```

### Test MCP server directly
```bash
curl http://localhost:3000/health
```

### Check ports
```bash
sudo netstat -tlnp | grep -E ':3000|:8443|:8080'
```

### Verify DNS
```bash
nslookup mcp.srv992249.hstgr.cloud
```

## Updating the Server

### Docker deployment:
```bash
cd ~/Nowcerts-MCP
git pull
docker-compose down
docker-compose up -d --build
```

### Systemd deployment:
```bash
cd ~/Nowcerts-MCP
git pull
npm run build
sudo systemctl restart nowcerts-mcp
```

## Security Notes

1. Keep your `.env` file secure (it contains sensitive credentials)
2. Use strong passwords for NowCerts API access
3. Consider using Docker secrets instead of .env in production
4. Regularly update dependencies: `npm audit fix`
5. Monitor logs for suspicious activity

## Support

If you encounter issues:
1. Check server logs
2. Verify environment variables are set
3. Test with `curl http://localhost:3000/health`
4. Ensure network connectivity and firewall rules
5. Verify DNS points to correct server
