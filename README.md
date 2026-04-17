# Remote Server Deployment & Update Instructions

This guide explains how to deploy the Schema Command Center to your own server and how to enable remote updates from NinjaTech AI.

---

## Part 1: Server Requirements

### System Requirements
- **OS**: Ubuntu 20.04+ or similar Linux distribution
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Memory**: Minimum 512MB RAM
- **Storage**: Minimum 1GB disk space

### Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install process manager (recommended)
sudo npm install -g pm2

# Install Git (for updates)
sudo apt install -y git
```

---

## Part 2: Initial Deployment

### Step 1: Transfer Files to Server

**Option A: Using SCP (from your local machine)**
```bash
# Create the app directory on server
ssh user@your-server.com "mkdir -p /var/www/schema-command-center"

# Copy all files
scp -r /path/to/schema-command-center/* user@your-server.com:/var/www/schema-command-center/
```

**Option B: Using Git (recommended for updates)**
```bash
# On your server
cd /var/www
git clone https://github.com/your-org/schema-command-center.git
cd schema-command-center
```

### Step 2: Install Dependencies
```bash
cd /var/www/schema-command-center
npm install --production
```

### Step 3: Configure Environment (Optional but Recommended)
```bash
# Create environment file
nano .env
```

Add the following:
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Session Secret (CHANGE THIS!)
SESSION_SECRET=your-very-long-random-secret-string-at-least-32-characters

# Optional: HTTPS
# SSL_KEY=/etc/letsencrypt/live/yourdomain.com/privkey.pem
# SSL_CERT=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

### Step 4: Set Up Process Manager (PM2)
```bash
# Start the application
pm2 start server.js --name "schema-command-center"

# Save PM2 configuration
pm2 save

# Set up auto-start on boot
pm2 startup
```

### Step 5: Set Up Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/schema-command-center
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or your server IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/schema-command-center /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 6: Set Up HTTPS (Let's Encrypt - Optional but Recommended)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

### Step 7: Configure Firewall
```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable
```

### Step 8: Create First Admin Account
1. Visit `https://your-domain.com/setup`
2. Create your admin account
3. After creation, you'll be redirected to the login page

---

## Part 3: Enabling Remote Updates from NinjaTech AI

For NinjaTech AI to connect to your server and push updates, you need to provide SSH access.

### Option A: SSH Key Access (Recommended)

#### Step 1: Create a Deployment User
```bash
# Create a dedicated user for deployments
sudo adduser ninja-deploy

# Add to sudoers (for service restarts)
sudo usermod -aG sudo ninja-deploy

# Switch to the new user
su - ninja-deploy
```

#### Step 2: Set Up SSH Key Authentication
```bash
# Create SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create authorized_keys file
nano ~/.ssh/authorized_keys
```

**Provide NinjaTech AI with the following information:**
- Server IP or domain
- SSH port (default: 22)
- Username: `ninja-deploy`
- Password or SSH public key to add

#### Step 3: Configure Sudo Without Password (for the deploy user)
```bash
sudo visudo
```

Add this line at the end:
```
ninja-deploy ALL=(ALL) NOPASSWD: /usr/bin/pm2, /usr/bin/systemctl restart nginx
```

### Option B: VPN/Tailscale (Most Secure)

If you use Tailscale or similar VPN:
1. Install Tailscale on your server
2. Share the Tailscale IP with NinjaTech AI
3. NinjaTech AI can connect directly through the VPN

### Option C: Temporary Access (For One-Time Updates)

For occasional updates, you can temporarily provide:
- Server IP
- SSH port
- Username and password
- NinjaTech AI will connect, apply updates, and you can then change the password

---

## Part 4: What NinjaTech AI Needs From You

To enable remote updates, please provide:

| Information | Example | Required? |
|-------------|---------|-----------|
| Server IP/Domain | `192.168.1.100` or `schema.yourcompany.com` | ✅ Yes |
| SSH Port | `22` (default) or custom port | ✅ Yes |
| SSH Username | `ninja-deploy` or `ubuntu` | ✅ Yes |
| Authentication Method | SSH Key or Password | ✅ Yes |
| SSH Public Key (if using keys) | `ssh-rsa AAAA...` | If using keys |
| SSH Password (if using password) | `your-secure-password` | If using password |
| App Directory | `/var/www/schema-command-center` | ✅ Yes |
| Web URL | `https://schema.yourcompany.com` | Optional |

---

## Part 5: Update Process

### When NinjaTech AI Connects

NinjaTech AI will:
1. SSH into your server
2. Navigate to the app directory
3. Pull the latest changes (if using Git) or upload new files
4. Install any new dependencies: `npm install --production`
5. Restart the service: `pm2 restart schema-command-center`
6. Verify the application is running

### Manual Update (If You Prefer)

If you prefer to update manually:
```bash
cd /var/www/schema-command-center

# If using Git
git pull origin main

# Install dependencies
npm install --production

# Restart the service
pm2 restart schema-command-center
```

---

## Part 6: Troubleshooting

### Check Application Logs
```bash
pm2 logs schema-command-center
```

### Check Application Status
```bash
pm2 status
```

### Restart Application
```bash
pm2 restart schema-command-center
```

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Database Location
The SQLite database is stored at:
```
/var/www/schema-command-center/data/users.db
```

### Backup Database
```bash
cp /var/www/schema-command-center/data/users.db /backup/users.db.$(date +%Y%m%d)
```

---

## Part 7: Security Checklist

- [ ] Changed default SESSION_SECRET in `.env`
- [ ] Created non-root deployment user
- [ ] Configured firewall (ufw)
- [ ] Set up HTTPS with Let's Encrypt
- [ ] SSH key authentication enabled (password auth disabled)
- [ ] Regular database backups configured
- [ ] PM2 auto-restart on crash enabled

---

## Part 8: Quick Reference Commands

```bash
# Start application
pm2 start server.js --name "schema-command-center"

# Stop application
pm2 stop schema-command-center

# Restart application
pm2 restart schema-command-center

# View logs
pm2 logs schema-command-center

# Check status
pm2 status

# Update from Git
cd /var/www/schema-command-center && git pull && npm install --production && pm2 restart schema-command-center
```

---

## Contact & Support

For questions about deployment or to provide server access details:
- Contact NinjaTech AI support
- Provide the information listed in Part 4

**Important**: Never share server credentials through unsecured channels. Use encrypted communication methods when sharing sensitive access information.