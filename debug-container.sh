#!/bin/bash
# Debug script for container connectivity issues

echo "=== Container Status ==="
docker compose ps

echo ""
echo "=== Container Logs (last 30 lines) ==="
docker compose logs --tail=30 nowcerts-mcp

echo ""
echo "=== Check if container is still running ==="
docker ps | grep nowcerts-mcp

echo ""
echo "=== Network inspection ==="
docker inspect nowcerts-mcp | grep -A 20 "NetworkSettings"

echo ""
echo "=== Port bindings ==="
docker port nowcerts-mcp

echo ""
echo "=== Test from inside container ==="
docker exec nowcerts-mcp wget -O- http://localhost:3000/health 2>&1

echo ""
echo "=== Check container IP ==="
docker inspect nowcerts-mcp | grep IPAddress

echo ""
echo "=== All listening ports ==="
sudo netstat -tlnp | grep :3000
