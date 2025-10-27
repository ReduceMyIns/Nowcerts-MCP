#!/bin/bash
# Check Traefik routing configuration

echo "=== 1. Check container networks ==="
docker inspect nowcerts-mcp | grep -A 10 "Networks"

echo ""
echo "=== 2. Check if container is on proxy network ==="
docker network inspect proxy | grep -A 3 nowcerts-mcp

echo ""
echo "=== 3. Check Traefik labels on container ==="
docker inspect nowcerts-mcp | grep -A 20 "Labels"

echo ""
echo "=== 4. Check Traefik configuration ==="
docker logs root-traefik-1 --tail=100 | grep -i "error\|configuration\|provider"

echo ""
echo "=== 5. List all Traefik routers ==="
curl -s http://localhost:8080/api/http/routers 2>/dev/null | grep -i "nowcerts\|mcp" || echo "Traefik API not accessible or no MCP router found"

echo ""
echo "=== 6. Check what entrypoints Traefik has ==="
docker inspect root-traefik-1 | grep -i entrypoint

echo ""
echo "=== 7. Compare n8n labels with nowcerts-mcp ==="
echo "n8n labels:"
docker inspect root-n8n-1 | grep "traefik" | head -10
echo ""
echo "nowcerts-mcp labels:"
docker inspect nowcerts-mcp | grep "traefik" | head -10
