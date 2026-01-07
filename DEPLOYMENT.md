# Deployment Guide

## Backend Deployment (AWS EC2)

### Prerequisites
- AWS EC2 instance (Ubuntu 20.04+ recommended)
- MongoDB Atlas account (or local MongoDB)
- Domain name (optional, for production)

### Step 1: Set up EC2 Instance

1. Launch EC2 instance (t2.micro or higher)
2. Configure security group:
   - Inbound: Port 22 (SSH), Port 3000 (HTTP), Port 80/443 (if using Nginx)
3. Connect via SSH:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

### Step 2: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install -y nginx
```

### Step 3: Deploy Application

```bash
# Clone repository
git clone <your-repo-url>
cd splitwise-app

# Install dependencies
npm install

# Create .env file
nano .env
# Add your environment variables

# Start with PM2
pm2 start server.js --name splitwise-backend
pm2 save
pm2 startup
```

### Step 4: Configure Nginx (Optional)

```bash
sudo nano /etc/nginx/sites-available/splitwise
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/splitwise /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Set up SSL (Optional, using Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## MongoDB Atlas Setup

### Step 1: Create Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (M0)
3. Choose region closest to your EC2 instance

### Step 2: Configure Access
1. **Network Access**: Add EC2 IP address to whitelist (or 0.0.0.0/0 for testing)
2. **Database Access**: Create database user with read/write permissions

### Step 3: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy connection string
4. Update `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/splitwise
   ```

## Frontend Deployment

### Step 1: Install Expo CLI
```bash
npm install -g expo-cli
```

### Step 2: Configure App
1. Update `mobile/src/config/api.js` with production API URL
2. Update `mobile/app.json` with your package name and details

### Step 3: Build Android APK/AAB

```bash
cd mobile
expo build:android
# or for app bundle (recommended for Play Store)
eas build --platform android
```

### Step 4: Upload to Google Play Store
1. Create app in Google Play Console
2. Set up subscription products (₹10/month, ₹15/month)
3. Upload AAB file
4. Configure subscription verification

## Google Play Subscription Setup

### Step 1: Create Subscription Products
1. In Google Play Console, go to Monetization > Products > Subscriptions
2. Create two products:
   - Monthly ₹10
   - Monthly ₹15
3. Note the product IDs

### Step 2: Set up Service Account
1. Go to Google Cloud Console
2. Create service account
3. Download JSON key file
4. Grant "Viewer" role to service account in Play Console
5. Update backend `.env`:
   ```
   GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=/path/to/service-account.json
   ```

### Step 3: Update Subscription Service
Update `backend/services/subscriptionService.js` to use real Google Play API:
- Use `googleapis` package
- Authenticate with service account
- Verify purchase tokens

## OTP Service Integration

### Option 1: Twilio
```bash
npm install twilio
```

Update `backend/services/otpService.js`:
```javascript
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const sendOTP = async (phone, email, otp) => {
  if (phone) {
    await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
  }
  // Handle email via SendGrid or similar
};
```

### Option 2: AWS SNS
```bash
npm install aws-sdk
```

## Monitoring and Maintenance

### PM2 Commands
```bash
pm2 list              # List processes
pm2 logs              # View logs
pm2 restart all       # Restart all
pm2 monit            # Monitor
```

### Logs
```bash
# Application logs
pm2 logs splitwise-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Strategy
1. **MongoDB Atlas**: Automatic backups (enable in Atlas)
2. **Application**: Use git for version control
3. **Environment**: Backup `.env` file securely

## Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS (SSL certificate)
- [ ] Restrict MongoDB network access
- [ ] Use environment variables (never commit .env)
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

## Cost Optimization

- Use EC2 t2.micro for small scale (free tier eligible)
- MongoDB Atlas M0 (free tier) for development
- Upgrade as needed based on usage
- Monitor AWS billing dashboard
- Use CloudWatch for monitoring (free tier available)

## Troubleshooting

### Backend not starting
- Check PM2 logs: `pm2 logs splitwise-backend`
- Verify environment variables
- Check MongoDB connection
- Verify port 3000 is open

### Frontend API errors
- Verify API_BASE_URL in config
- Check CORS settings in backend
- Verify JWT token is being sent

### Subscription not working
- Verify Google Play service account setup
- Check purchase token format
- Verify product IDs match

