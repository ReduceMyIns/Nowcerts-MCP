#!/bin/bash
# Deep dive Traefik connectivity check

echo "=== 1. Test from Traefik container to MCP container ==="
MCP_IP=$(docker inspect nowcerts-mcp | grep '"IPAddress"' | head -1 | awk -F'"' '{print $4}')
echo "MCP Container IP: $MCP_IP"
echo "Testing connection from Traefik to MCP..."
docker exec root-traefik-1 wget -qO- http://$MCP_IP:3000/health 2>&1

echo ""
echo "=== 2. Check Traefik dynamic configuration ==="
docker exec root-traefik-1 cat /etc/traefik/traefik.yml 2>/dev/null || echo "Config not at /etc/traefik/traefik.yml"

echo ""
echo "=== 3. Check Docker provider configuration ==="
docker inspect root-traefik-1 | grep -A 5 "Cmd\|Args"

echo ""
echo "=== 4. Check Traefik API for routers ==="
curl -s http://localhost:8080/api/http/routers 2>/dev/null | python3 -m json.tool | grep -A 10 "nowcerts-mcp" || echo "Traefik API not accessible or no router found"

echo ""
echo "=== 5. Check if both containers are on same network ==="
echo "Traefik networks:"
docker inspect root-traefik-1 | grep -A 3 '"Networks"'
echo ""
echo "MCP networks:"
docker inspect nowcerts-mcp | grep -A 3 '"Networks"'

echo ""
echo "=== 6. Detailed Traefik logs with timestamp ==="
docker logs root-traefik-1 --tail=50 --timestamps
