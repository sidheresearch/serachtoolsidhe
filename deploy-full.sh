#!/bin/bash

# Comprehensive Deployment Script for Search Tool
# This script deploys both frontend and backend with live API integration

echo "🚀 Starting full deployment of Search Tool with live backend integration..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (for Next.js)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.9+ and pip (if not already installed)
sudo apt install -y python3 python3-pip python3-venv

# Install Nginx (reverse proxy and static file serving)
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

echo "✅ System dependencies installed"

# Setup Backend (Python FastAPI) - if not already running
echo "🐍 Setting up Python backend..."
cd python-backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Create systemd service for FastAPI backend
sudo tee /etc/systemd/system/searchapi.service > /dev/null <<EOF2
[Unit]
Description=Search Tool FastAPI Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/serachtoolsidhe/python-backend
Environment=PATH=/home/ubuntu/serachtoolsidhe/python-backend/venv/bin
ExecStart=/home/ubuntu/serachtoolsidhe/python-backend/venv/bin/python run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF2

# Enable and start backend service
sudo systemctl daemon-reload
sudo systemctl enable searchapi
sudo systemctl restart searchapi

echo "✅ Backend service configured and started"

# Setup Frontend (Next.js)
echo "⚛️  Setting up Next.js frontend..."
cd ../my-next-app

# Install dependencies
npm install

# Build the application for production with live backend API
echo "🔨 Building frontend for production with live API..."
export NEXT_PUBLIC_API_URL=http://65.0.100.25:8000
npm run build

# Start frontend with PM2
pm2 delete search-frontend 2>/dev/null || true
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup

echo "✅ Frontend built and started with PM2"

# Configure Nginx as reverse proxy
sudo tee /etc/nginx/sites-available/searchtool > /dev/null <<EOF2
server {
    listen 80;
    server_name _;

    # Frontend - Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API - Direct proxy to FastAPI
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
    }
}
EOF2

# Enable the site
sudo ln -sf /etc/nginx/sites-available/searchtool /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✅ Nginx configured as reverse proxy"

# Create logs directory
mkdir -p /home/ubuntu/logs

# Display status
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
echo "==================="
sudo systemctl status searchapi --no-pager -l
echo ""
pm2 status
echo ""
sudo systemctl status nginx --no-pager -l
echo ""
echo "🌐 Your application is now accessible at:"
echo "   Frontend: http://$(curl -s ifconfig.me)"
echo "   Backend API: http://$(curl -s ifconfig.me)/api/"
echo ""
echo "🔍 To check logs:"
echo "   Backend logs: sudo journalctl -u searchapi -f"
echo "   Frontend logs: pm2 logs search-frontend"
echo "   Nginx logs: sudo tail -f /var/log/nginx/access.log"
