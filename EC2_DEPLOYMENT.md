# EC2 Deployment Guide

## Prerequisites
- EC2 instance with Ubuntu 20.04+ or Amazon Linux 2
- Security group allowing inbound traffic on ports 22, 80, and 443
- SSH access to the instance

## Deployment Steps

### 1. Connect to your EC2 instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 2. Run the deployment script
```bash
# Download and run the deployment script
wget https://raw.githubusercontent.com/your-repo/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

### 3. Alternative Manual Deployment

If you prefer manual deployment:

#### A. Setup the repository
```bash
cd /home/ubuntu
git clone https://github.com/sidheresearch/serachtoolsidhe.git
cd serachtoolsidhe
```

#### B. Deploy Backend (FastAPI)
```bash
cd python-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Test the backend
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

#### C. Deploy Frontend (Next.js)
```bash
cd ../my-next-app
npm install
npm run build

# Test the frontend
npm start
```

#### D. Setup Nginx (Production)
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/searchtool
# Copy the nginx configuration from deploy.sh
sudo ln -s /etc/nginx/sites-available/searchtool /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### 4. Access Your Application
- Frontend: http://your-ec2-public-ip
- Backend API: http://your-ec2-public-ip/api

### 5. Monitoring and Management
```bash
# Check backend service
sudo systemctl status searchapi

# Check frontend process
pm2 status

# View logs
pm2 logs search-frontend
sudo journalctl -u searchapi -f

# Restart services
sudo systemctl restart searchapi
pm2 restart search-frontend
```

### 6. Update Deployment
```bash
cd /home/ubuntu/serachtoolsidhe
git pull origin main

# Update backend
sudo systemctl restart searchapi

# Update frontend
cd my-next-app
npm run build
pm2 restart search-frontend
```

## Security Considerations
- Configure SSL/TLS with Let's Encrypt
- Setup proper firewall rules
- Use environment variables for sensitive data
- Regular security updates

## Troubleshooting
- Check logs in `/var/log/nginx/` for web server issues
- Use `pm2 logs` for frontend issues
- Use `sudo journalctl -u searchapi` for backend issues
