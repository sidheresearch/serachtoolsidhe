#!/bin/bash

echo "🚀 Starting deployment on Amazon Linux..."

# Update system
sudo yum update -y

# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Python 3 and development tools
sudo yum install -y python3 python3-pip python3-devel gcc
sudo yum groupinstall -y "Development Tools"

# Install nginx
sudo yum install -y nginx

# Install PM2 globally
sudo npm install -g pm2

echo "✅ Dependencies installed"

# Clone repository if it doesn't exist
if [ ! -d "serachtoolsidhe" ]; then
    git clone https://github.com/sidheresearch/serachtoolsidhe.git
fi

cd serachtoolsidhe

# Setup Python backend
echo "🐍 Setting up Python backend..."
cd python-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create systemd service for backend
sudo tee /etc/systemd/system/searchapi.service > /dev/null <<EOF2
[Unit]
Description=Search Tool FastAPI Backend
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/serachtoolsidhe/python-backend
Environment=PATH=/home/ec2-user/serachtoolsidhe/python-backend/venv/bin
ExecStart=/home/ec2-user/serachtoolsidhe/python-backend/venv/bin/python run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF2

# Start backend service
sudo systemctl daemon-reload
sudo systemctl enable searchapi
sudo systemctl start searchapi

echo "✅ Backend service started"

# Setup frontend
echo "⚛️ Setting up frontend..."
cd ../my-next-app

# Install dependencies
npm install

# Build for production
echo "🔨 Building frontend..."
export NEXT_PUBLIC_API_URL=http://65.0.100.25:8000
npm run build

# Create PM2 ecosystem config for Amazon Linux
cat > ecosystem.amazon.js << EOF3
module.exports = {
  apps: [{
    name: 'search-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/home/ec2-user/serachtoolsidhe/my-next-app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_API_URL: 'http://65.0.100.25:8000'
    },
    log_file: '/home/ec2-user/logs/frontend.log',
    error_file: '/home/ec2-user/logs/frontend-error.log',
    out_file: '/home/ec2-user/logs/frontend-out.log',
    instances: 1,
    exec_mode: 'fork',
    restart_delay: 5000,
    max_restarts: 10
  }]
};
EOF3

# Start frontend with PM2
pm2 delete search-frontend 2>/dev/null || true
pm2 start ecosystem.amazon.js

# Save PM2 configuration
pm2 save
pm2 startup

echo "✅ Frontend started"

# Configure Nginx
sudo tee /etc/nginx/conf.d/searchtool.conf > /dev/null <<EOF2
server {
    listen 80;
    server_name _;

    # Frontend
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

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF2

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create logs directory
mkdir -p /home/ec2-user/logs

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📊 Service Status:"
sudo systemctl status searchapi --no-pager -l
echo ""
pm2 status
echo ""
sudo systemctl status nginx --no-pager -l
echo ""
echo "🌐 Access your app at: http://$(curl -s ifconfig.me)"
