#!/bin/bash
# Deployment steps for Traefik setup

echo "=========================================="
echo "Step 1: Check Traefik configuration"
echo "=========================================="

# Check what cert resolver Traefik is using
echo "Checking Traefik labels on n8n container..."
docker inspect root-n8n-1 | grep -i "traefik\|certresolver" | head -20

echo ""
echo "=========================================="
echo "Step 2: Check if old MCP container exists"
echo "=========================================="
if docker ps -a | grep -q nowcerts-mcp-http; then
    echo "Found old container: nowcerts-mcp-http"
    echo "Stopping and removing it..."
    docker stop nowcerts-mcp-http 2>/dev/null || true
    docker rm nowcerts-mcp-http 2>/dev/null || true
    echo "✓ Old container removed"
else
    echo "No old container found"
fi

echo ""
echo "=========================================="
echo "Step 3: Deploy new container"
echo "=========================================="
cd ~/Nowcerts-MCP
docker compose up -d --build

echo ""
echo "=========================================="
echo "Step 4: Check container status"
echo "=========================================="
docker compose ps

echo ""
echo "=========================================="
echo "Step 5: View logs"
echo "=========================================="
docker compose logs --tail=50 nowcerts-mcp

echo ""
echo "=========================================="
echo "Step 6: Test local connection"
echo "=========================================="
sleep 3
curl http://localhost:3000/health 2>/dev/null && echo "" || echo "Container not responding yet"

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Wait for DNS to propagate (if not done yet):"
echo "   nslookup mcp.srv992249.hstgr.cloud"
echo ""
echo "2. Test HTTPS endpoint:"
echo "   curl https://mcp.srv992249.hstgr.cloud/health"
echo ""
echo "3. If SSL error, check Traefik dashboard/logs:"
echo "   docker logs root-traefik-1 | grep mcp"
echo ""
echo "4. Connect from Claude Desktop:"
echo "   URL: https://mcp.srv992249.hstgr.cloud/sse"
