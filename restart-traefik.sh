#!/bin/bash
# Restart Traefik and verify MCP routing

echo "=== Restarting Traefik ==="
docker restart root-traefik-1

echo ""
echo "Waiting 10 seconds for Traefik to start and discover containers..."
sleep 10

echo ""
echo "=== Traefik startup logs ==="
docker logs root-traefik-1 --tail=30

echo ""
echo "=== Testing HTTPS endpoint ==="
curl -v https://mcp.srv992249.hstgr.cloud/health

echo ""
echo ""
echo "=== If still failing, check n8n entrypoint configuration ==="
docker inspect root-n8n-1 | grep -E "traefik.http.routers.n8n.entrypoints|traefik.http.routers.n8n.rule"
