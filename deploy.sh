#!/bin/bash

# EC2 Deployment Script for Full-Stack Search Tool
# Run this script on your EC2 instance

echo "🚀 Starting deployment of Search Tool..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (for Next.js)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.9+ and pip (if not already installed)
sudo apt install -y python3 python3-pip python3-venv

# Install Nginx (to serve both frontend and backend)
sudo apt install -y nginx

# Install PM2 (to manage Node.js processes)
sudo npm install -g pm2

echo "✅ System dependencies installed"

# Clone your repository (replace with your actual repo URL)
cd /home/ubuntu
git clone https://github.com/sidheresearch/serachtoolsidhe.git
cd serachtoolsidhe

echo "✅ Repository cloned"

# Setup Backend (Python FastAPI)
echo "🐍 Setting up Python backend..."
cd python-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create systemd service for FastAPI
sudo tee /etc/systemd/system/searchapi.service > /dev/null <<EOF
[Unit]
Description=Search Tool FastAPI
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/serachtoolsidhe/python-backend
Environment=PATH=/home/ubuntu/serachtoolsidhe/python-backend/venv/bin
ExecStart=/home/ubuntu/serachtoolsidhe/python-backend/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the backend service
sudo systemctl daemon-reload
sudo systemctl enable searchapi
sudo systemctl start searchapi

echo "✅ Backend service started"

# Setup Frontend (Next.js)
echo "⚛️ Setting up Next.js frontend..."
cd ../my-next-app

# Install dependencies and build
npm install
npm run build

# Create PM2 ecosystem file
tee ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [{
    name: 'search-frontend',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_API_URL: 'http://localhost:8000'
    }
  }]
};
EOF

# Start frontend with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Frontend started with PM2"

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/searchtool > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    # Frontend (Next.js)
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

    # Backend API (FastAPI)
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/searchtool /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Nginx configured and restarted"

# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "🎉 Deployment completed!"
echo "Your application should be accessible at: http://your-ec2-public-ip"
echo ""
echo "Service management commands:"
echo "- Backend: sudo systemctl status searchapi"
echo "- Frontend: pm2 status"
echo "- Nginx: sudo systemctl status nginx"
