# Trade Analytics Search Tool

A comprehensive full-stack search application for trade analytics with live backend API integration.

## 🌟 Features

- **Real-time Search**: Search for products, importers, exporters, and suppliers
- **Advanced Analytics**: Top importers/suppliers analysis with charts
- **Live Backend Integration**: Connected to production API at `http://65.0.100.25:8000`
- **Responsive Design**: Works on desktop and mobile devices
- **Fast Performance**: Built with Next.js and optimized for production

## 🚀 Quick Start

### Development Mode
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build with Live Backend
```bash
npm install
npm run build
npm start
```

The production build automatically connects to the live backend API.

## 🌐 Live Deployment

### For Users (Access the Live App)
The application is deployed and accessible at: **[Your EC2 IP Address]**

### For Developers (Deploy to EC2)

#### Option 1: Automated Deployment (Windows)
1. Run `deploy-to-ec2.bat`
2. Enter your EC2 IP address and key file path
3. The script will handle the entire deployment

#### Option 2: Manual Deployment (Linux/macOS)
```bash
# Upload deployment script to EC2
scp -i your-key.pem deploy-full.sh ubuntu@your-ec2-ip:~/

# Connect to EC2 and run deployment
ssh -i your-key.pem ubuntu@your-ec2-ip
chmod +x ~/deploy-full.sh
./deploy-full.sh
```

## 🔧 Configuration

### Environment Variables
- `NEXT_PUBLIC_API_URL`: Backend API URL (set to live API in production)
- `NODE_ENV`: Environment mode

### API Integration
The frontend automatically connects to the live backend API:
- **Development**: `http://localhost:8000` (if running locally)
- **Production**: `http://65.0.100.25:8000` (live backend)

## 📚 API Endpoints

The application integrates with these backend endpoints:
- `GET /api/search/suggestions` - Get search suggestions
- `POST /api/search/products` - Search products
- `POST /api/search/entities` - Search entities (importers/exporters)
- `POST /api/search/top-importers/products` - Get top importers
- `POST /api/search/top-suppliers/products` - Get top suppliers

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Material-UI, Chart.js
- **Backend**: FastAPI (Python)
- **Deployment**: EC2, Nginx, PM2

## 📊 Architecture

```
User Browser → Nginx → Next.js Frontend → Live Backend API
                ↓
            Static Files     FastAPI (Python)
```

## 🚦 Service Management

### Check Service Status
```bash
# Backend status
sudo systemctl status searchapi

# Frontend status
pm2 status

# Nginx status
sudo systemctl status nginx
```

### Restart Services
```bash
# Restart backend
sudo systemctl restart searchapi

# Restart frontend
pm2 restart search-frontend

# Restart nginx
sudo systemctl restart nginx
```

## 📝 Logs

```bash
# Backend logs
sudo journalctl -u searchapi -f

# Frontend logs
pm2 logs search-frontend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is private and proprietary.
