#!/bin/bash

# ============================================================================
# Hostinger Server Cleanup Script
# This will remove old wrapper versions and keep only the production version
# ============================================================================

echo "========================================="
echo "NowCerts MCP Server Cleanup"
echo "========================================="
echo ""

# Check we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Must be run from /opt/nowcerts-mcp directory"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# Stop the service first
echo "🛑 Stopping MCP service..."
docker compose down
echo ""

# Backup the .env file (critical)
echo "💾 Backing up .env file..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "   Saved to .env.backup.$(date +%Y%m%d_%H%M%S)"
echo ""

# List files that will be removed
echo "🗑️  Files to be removed:"
echo "   - http-wrapper-with-sse.cjs (old SSE version)"
echo "   - http-wrapper-complete.cjs (old complete version)"
echo "   - http-wrapper-vapi.cjs (old VAPI version)"
echo "   - http-wrapper.cjs.backup (if exists)"
echo "   - http-wrapper.cjs.v2 (if exists)"
echo ""

# Ask for confirmation
read -p "Continue with cleanup? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    docker compose up -d
    exit 0
fi

echo ""
echo "🧹 Cleaning up old versions..."

# Remove old wrapper files
rm -f http-wrapper-with-sse.cjs
rm -f http-wrapper-complete.cjs
rm -f http-wrapper-vapi.cjs
rm -f http-wrapper.cjs.backup
rm -f http-wrapper.cjs.v2

echo "   ✅ Old wrapper files removed"
echo ""

# Replace current wrapper with production version
if [ -f "http-wrapper-production.cjs" ]; then
    echo "📦 Installing production version..."
    cp http-wrapper.cjs http-wrapper.cjs.old 2>/dev/null || true
    cp http-wrapper-production.cjs http-wrapper.cjs
    echo "   ✅ Production wrapper installed"
    echo ""
fi

# Clean up node_modules duplicates (optional - saves space)
echo "🗄️  Checking node_modules size..."
if [ -d "node_modules" ]; then
    du -sh node_modules
    echo ""
    read -p "Run npm prune to remove unused packages? (yes/no): " prune_confirm
    if [ "$prune_confirm" = "yes" ]; then
        npm prune --production
        echo "   ✅ Unused packages removed"
        du -sh node_modules
        echo ""
    fi
fi

# Remove old Docker images (if any)
echo "🐳 Checking for unused Docker images..."
docker image prune -f
echo ""

# Restart the service
echo "🚀 Restarting MCP service..."
docker compose up -d
echo ""

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 3
echo ""

# Test the service
echo "🧪 Testing service..."
response=$(curl -s https://mcp.srv992249.hstgr.cloud/health)
if [ $? -eq 0 ]; then
    echo "   ✅ Service is running"
    echo "   Response: $response"
else
    echo "   ⚠️  Could not reach service (might need DNS propagation)"
fi
echo ""

# Show final disk usage
echo "📊 Current directory size:"
du -sh .
echo ""

# List remaining files
echo "📁 Remaining wrapper files:"
ls -lh http-wrapper*.cjs 2>/dev/null || echo "   (none)"
echo ""

echo "========================================="
echo "✅ Cleanup Complete!"
echo "========================================="
echo ""
echo "Kept files:"
echo "  • http-wrapper.cjs (production version)"
echo "  • .env (environment variables)"
echo "  • dist/ (compiled MCP server)"
echo "  • node_modules/ (dependencies)"
echo "  • docker-compose.yml (container config)"
echo ""
echo "Backup files created:"
ls -lh .env.backup.* 2>/dev/null | tail -1
ls -lh http-wrapper.cjs.old 2>/dev/null | tail -1
echo ""
