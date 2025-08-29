# 🚀 Live Backend Integration & Deployment Guide

## ✅ What's Been Configured

### 1. **Live Backend Integration**
- ✅ Frontend configured to use live backend API: `http://13.126.160.124:8000`
- ✅ Production environment variables set in `.env` and `.env.production`
- ✅ Build process updated to use live API
- ✅ PM2 ecosystem configuration updated
- ✅ Cross-platform build support added

### 2. **Deployment Scripts Created**
- ✅ `deploy-full.sh` - Comprehensive EC2 deployment script
- ✅ `deploy-to-ec2.bat` - Windows helper for EC2 deployment
- ✅ `test-production-build.bat` - Local testing script

### 3. **Production Build**
- ✅ Successfully built with live backend integration
- ✅ Static optimization completed
- ✅ Ready for deployment

## 🌐 How to Deploy and Access Your Webapp

### **Option 1: Quick Local Test (Before Deployment)**
```bash
# Run this on your Windows machine
.\test-production-build.bat
```
This will:
- Build the app with live backend
- Start it locally at http://localhost:3000
- Let you test the integration

### **Option 2: Deploy to EC2 (Recommended)**

#### A. Using Windows Deployment Script
```bash
# Run this on your Windows machine
.\deploy-to-ec2.bat
```
- Enter your EC2 IP address when prompted
- Enter your .pem key file path
- The script handles everything automatically

#### B. Manual Deployment
```bash
# 1. Upload deployment script to your EC2
scp -i your-key.pem deploy-full.sh ubuntu@your-ec2-ip:~/

# 2. Connect to EC2 and deploy
ssh -i your-ec2-ip ubuntu@your-ec2-ip
chmod +x ~/deploy-full.sh
./deploy-full.sh
```

## 🎯 After Deployment

### **Your Webapp Will Be Accessible At:**
- **Frontend**: `http://[YOUR-EC2-IP]` (e.g., http://13.126.160.124)
- **API**: `http://[YOUR-EC2-IP]/api/` (proxied through Nginx)

### **Anyone Can Access It By:**
1. Opening a web browser
2. Going to `http://[YOUR-EC2-IP]`
3. Using the search functionality immediately

## 🔧 Service Architecture

```
User Browser → EC2 Public IP → Nginx → Next.js Frontend → Live Backend API
                                ↓         (Port 3000)      (Port 8000)
                           Static Files
```

## 🚦 Managing Your Deployed Services

### **Check Status:**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Check all services
sudo systemctl status searchapi    # Backend
pm2 status                        # Frontend
sudo systemctl status nginx       # Web server
```

### **Restart Services:**
```bash
# Restart backend
sudo systemctl restart searchapi

# Restart frontend
pm2 restart search-frontend

# Restart web server
sudo systemctl restart nginx
```

### **View Logs:**
```bash
# Backend logs
sudo journalctl -u searchapi -f

# Frontend logs
pm2 logs search-frontend

# Web server logs
sudo tail -f /var/log/nginx/access.log
```

## 🔑 Key Benefits of This Setup

1. **✅ No Manual Startup Required**: Services auto-start on boot
2. **✅ Public Access**: Anyone with the IP can access the webapp
3. **✅ Live Backend Integration**: Uses your production API
4. **✅ Production Optimized**: Built for performance and reliability
5. **✅ Automatic Restarts**: Services restart if they crash
6. **✅ Reverse Proxy**: Nginx handles static files and API routing

## 🎉 Next Steps

1. **Test Locally First**: Run `test-production-build.bat` to verify integration
2. **Deploy to EC2**: Use `deploy-to-ec2.bat` for easy deployment
3. **Share the URL**: Give anyone the EC2 IP address to access your webapp
4. **Monitor**: Check logs occasionally to ensure everything runs smoothly

## 🛠️ Troubleshooting

### **If the live backend API is not accessible:**
1. Check if your EC2 instance with the backend is running
2. Verify security groups allow traffic on port 8000
3. Ensure the backend service is running: `sudo systemctl status searchapi`

### **If the frontend doesn't load:**
1. Check PM2 status: `pm2 status`
2. Check Nginx status: `sudo systemctl status nginx`
3. Verify port 80 is open in security groups

### **If you get CORS errors:**
The deployment script configures Nginx to handle CORS automatically.

---

**🎯 Result**: Your webapp will be live and accessible to anyone with the EC2 IP address, with no need to manually start frontend and backend each time!
