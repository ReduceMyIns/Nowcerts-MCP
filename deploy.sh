#!/bin/bash
#
# NowCerts MCP Server - Quick Deployment Script
# This script helps you deploy the MCP server alongside your existing n8n setup
#

set -e

echo "=========================================================="
echo "NowCerts MCP Server - Deployment Helper"
echo "=========================================================="
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Not running as root. Some commands may require sudo."
    echo ""
fi

# Function to detect reverse proxy type
detect_proxy() {
    echo "🔍 Detecting existing Docker reverse proxy..."
    echo ""

    if command -v docker &> /dev/null; then
        # Check for Traefik
        if docker ps --format '{{.Names}}' | grep -qi traefik; then
            echo "✅ Detected: Traefik"
            return 0
        fi

        # Check for nginx-proxy
        if docker ps --format '{{.Names}}' | grep -qi nginx-proxy; then
            echo "✅ Detected: nginx-proxy"
            return 1
        fi

        # Check for Caddy
        if docker ps --format '{{.Names}}' | grep -qi caddy; then
            echo "✅ Detected: Caddy"
            return 2
        fi

        echo "⚠️  No known reverse proxy detected"
        echo "   Running containers:"
        docker ps --format 'table {{.Names}}\t{{.Image}}' | head -5
        echo ""
        return 3
    else
        echo "❌ Docker not found or not accessible"
        return 4
    fi
}

# Main menu
echo "Choose deployment method:"
echo ""
echo "1. Docker integration (recommended if using Docker for n8n)"
echo "2. Standalone with systemd"
echo "3. Show configuration only (no deployment)"
echo "4. Exit"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "=========================================================="
        echo "Docker Deployment"
        echo "=========================================================="
        echo ""

        # Detect proxy type
        detect_proxy
        proxy_type=$?
        echo ""

        # Check for .env file
        if [ ! -f .env ]; then
            echo "⚠️  No .env file found"
            read -p "Create .env from .env.example? [y/N]: " create_env
            if [[ $create_env =~ ^[Yy]$ ]]; then
                cp .env.example .env
                echo "✅ Created .env file"
                echo "📝 Please edit .env and add your credentials:"
                echo "   nano .env"
                echo ""
                read -p "Press Enter when done editing..."
            else
                echo "❌ Cannot proceed without .env file"
                exit 1
            fi
        else
            echo "✅ Found .env file"
        fi

        # Check if proxy network exists
        if docker network ls | grep -q proxy; then
            echo "✅ Docker network 'proxy' exists"
        else
            echo "⚠️  Docker network 'proxy' not found"
            read -p "Create it? [y/N]: " create_network
            if [[ $create_network =~ ^[Yy]$ ]]; then
                docker network create proxy
                echo "✅ Created network 'proxy'"
            fi
        fi
        echo ""

        # Update docker-compose.yml based on proxy type
        if [ $proxy_type -eq 1 ]; then
            echo "📝 Configuring for nginx-proxy..."
            # This would edit docker-compose.yml, but for now just show instructions
            echo ""
            echo "⚠️  Please edit docker-compose.yml and:"
            echo "   1. Comment out Traefik labels (lines starting with 'traefik.')"
            echo "   2. Uncomment nginx-proxy labels (VIRTUAL_HOST, LETSENCRYPT_HOST)"
            echo ""
            read -p "Press Enter when done..."
        elif [ $proxy_type -eq 0 ]; then
            echo "✅ Using Traefik configuration (default)"
        fi

        # Build and start
        echo ""
        read -p "Build and start container? [y/N]: " start_docker
        if [[ $start_docker =~ ^[Yy]$ ]]; then
            echo ""
            echo "Building and starting container..."
            docker-compose up -d --build
            echo ""
            echo "✅ Container started!"
            echo ""
            echo "📊 View logs with: docker-compose logs -f"
            echo "🔍 Check status: docker-compose ps"
            echo ""

            # Wait a bit and test
            echo "Waiting 5 seconds for server to start..."
            sleep 5

            echo "Testing connection..."
            if curl -f http://localhost:3000/health &> /dev/null; then
                echo "✅ Server is responding!"
                curl http://localhost:3000/health
                echo ""
            else
                echo "⚠️  Server not responding yet. Check logs: docker-compose logs -f"
            fi
        fi
        ;;

    2)
        echo ""
        echo "=========================================================="
        echo "Standalone Systemd Deployment"
        echo "=========================================================="
        echo ""

        # Check for .env file
        if [ ! -f .env ]; then
            echo "⚠️  No .env file found"
            read -p "Create .env from .env.example? [y/N]: " create_env
            if [[ $create_env =~ ^[Yy]$ ]]; then
                cp .env.example .env
                echo "✅ Created .env file"
                echo "📝 Please edit .env and add your credentials:"
                echo "   nano .env"
                echo ""
                read -p "Press Enter when done editing..."
            else
                echo "❌ Cannot proceed without .env file"
                exit 1
            fi
        fi

        # Build
        echo "Building TypeScript..."
        npm run build
        echo "✅ Build complete"
        echo ""

        # Create systemd service
        echo "Creating systemd service..."
        WORK_DIR=$(pwd)
        sudo tee /etc/systemd/system/nowcerts-mcp.service > /dev/null << EOF
[Unit]
Description=NowCerts MCP Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$WORK_DIR
Environment="USE_SSE=true"
Environment="PORT=3000"
EnvironmentFile=$WORK_DIR/.env
ExecStart=/usr/bin/node $WORK_DIR/dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nowcerts-mcp.log
StandardError=append:/var/log/nowcerts-mcp-error.log

[Install]
WantedBy=multi-user.target
EOF

        echo "✅ Systemd service created"
        echo ""

        # Enable and start
        read -p "Enable and start service? [y/N]: " start_service
        if [[ $start_service =~ ^[Yy]$ ]]; then
            sudo systemctl daemon-reload
            sudo systemctl enable nowcerts-mcp
            sudo systemctl start nowcerts-mcp
            echo ""
            echo "✅ Service started!"
            echo ""
            sudo systemctl status nowcerts-mcp --no-pager
            echo ""
            echo "📊 View logs: sudo journalctl -u nowcerts-mcp -f"
            echo ""

            # Test
            echo "Testing connection..."
            sleep 3
            if curl -f http://localhost:3000/health &> /dev/null; then
                echo "✅ Server is responding!"
                curl http://localhost:3000/health
                echo ""
            else
                echo "⚠️  Server not responding. Check logs: sudo journalctl -u nowcerts-mcp -f"
            fi
        fi
        ;;

    3)
        echo ""
        echo "=========================================================="
        echo "Configuration Information"
        echo "=========================================================="
        echo ""

        detect_proxy
        echo ""

        echo "Deployment options:"
        echo "1. Docker: docker-compose up -d --build"
        echo "2. Systemd: See DEPLOYMENT_GUIDE.md"
        echo ""
        echo "Files:"
        echo "- docker-compose.yml: Docker deployment config"
        echo "- Dockerfile: Container image definition"
        echo "- DEPLOYMENT_GUIDE.md: Full deployment documentation"
        echo "- SSE_SERVER_SETUP.md: SSE setup guide"
        echo ""
        ;;

    4)
        echo "Exiting..."
        exit 0
        ;;

    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=========================================================="
echo "Next Steps"
echo "=========================================================="
echo ""
echo "1. Ensure DNS points to this server:"
echo "   mcp.srv992249.hstgr.cloud -> $(hostname -I | awk '{print $1}')"
echo ""
echo "2. Test HTTPS endpoint (once DNS is ready):"
echo "   curl https://mcp.srv992249.hstgr.cloud/health"
echo ""
echo "3. Connect from Claude Desktop:"
echo "   Custom Connector URL: https://mcp.srv992249.hstgr.cloud/sse"
echo ""
echo "See DEPLOYMENT_GUIDE.md for detailed instructions"
echo "=========================================================="
