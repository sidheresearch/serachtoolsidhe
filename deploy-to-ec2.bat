@echo off
echo 🚀 Deploying Search Tool to EC2 with live backend integration...
echo.

set /p EC2_IP="Enter your EC2 instance IP address (e.g., 13.126.160.124): "
set /p KEY_PATH="Enter path to your EC2 key file (.pem): "

echo.
echo 📤 Uploading deployment script to EC2...
scp -i "%KEY_PATH%" deploy-full.sh ubuntu@%EC2_IP%:~/

echo.
echo 🔧 Running deployment on EC2...
ssh -i "%KEY_PATH%" ubuntu@%EC2_IP% "chmod +x ~/deploy-full.sh && ~/deploy-full.sh"

echo.
echo 🎉 Deployment completed!
echo.
echo Your webapp is now accessible at: http://%EC2_IP%
echo Backend API is available at: http://%EC2_IP%/api/
echo.
echo 📝 To check the status of your services:
echo    ssh -i "%KEY_PATH%" ubuntu@%EC2_IP%
echo    sudo systemctl status searchapi
echo    pm2 status
echo    sudo systemctl status nginx
echo.
pause
