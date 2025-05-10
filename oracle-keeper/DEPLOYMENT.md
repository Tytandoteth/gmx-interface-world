# Oracle Keeper Service Deployment Guide

This guide provides step-by-step instructions for deploying the RedStone Oracle Keeper service to a production environment.

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Prerequisites

- Docker and Docker Compose installed
- SSH access to a server (Ubuntu 20.04+ recommended)
- Domain name for HTTPS setup (optional but recommended)

#### Deployment Steps

1. **Prepare the server**

   ```bash
   # Update packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   sudo apt install -y docker.io docker-compose
   
   # Add your user to the docker group
   sudo usermod -aG docker $USER
   
   # Apply changes (log out and back in, or run this)
   newgrp docker
   ```

2. **Transfer files to the server**

   ```bash
   # Create a directory for the Oracle Keeper
   mkdir -p ~/oracle-keeper
   
   # Copy files (from your local machine)
   scp -r /path/to/oracle-keeper/* user@your-server:~/oracle-keeper/
   ```

3. **Configure environment**

   ```bash
   cd ~/oracle-keeper
   
   # Review and update production environment settings
   nano .env.production
   
   # Set up production environment
   cp .env.production .env
   ```

4. **Deploy with Docker**

   ```bash
   # Run the deployment script
   ./deploy.sh
   ```

5. **Set up HTTPS with Nginx (recommended)**

   ```bash
   # Install Nginx
   sudo apt install -y nginx certbot python3-certbot-nginx
   
   # Configure Nginx
   sudo nano /etc/nginx/sites-available/oracle-keeper
   ```

   Add the following configuration:

   ```nginx
   server {
       listen 80;
       server_name oracle.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3002;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Enable the site and set up SSL:

   ```bash
   sudo ln -s /etc/nginx/sites-available/oracle-keeper /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   
   # Set up SSL certificate
   sudo certbot --nginx -d oracle.yourdomain.com
   ```

6. **Update GMX interface environment to use production URL**

   Update your GMX interface `.env.production` file:

   ```
   VITE_APP_ORACLE_KEEPER_URL=https://oracle.yourdomain.com
   ```

### Option 2: Managed Hosting

#### AWS Elastic Beanstalk

1. **Install EB CLI**

   ```bash
   pip install awsebcli
   ```

2. **Initialize EB application**

   ```bash
   cd /path/to/oracle-keeper
   eb init
   # Follow prompts to select region and create new application
   ```

3. **Create an environment and deploy**

   ```bash
   eb create oracle-keeper-production
   ```

4. **Configure environment variables**

   Use the AWS Console to set up environment variables matching those in `.env.production`.

#### Digital Ocean App Platform

1. Create a new app from the Digital Ocean dashboard
2. Connect your repository or upload files
3. Configure environment variables
4. Deploy the application

## Maintenance and Monitoring

### Monitoring

1. **Check service status**

   ```bash
   # View service health
   curl https://oracle.yourdomain.com/health
   
   # View metrics
   curl https://oracle.yourdomain.com/metrics
   ```

2. **Log monitoring**

   ```bash
   # View logs (Docker deployment)
   docker-compose logs -f oracle-keeper
   ```

3. **Set up alerts (recommended)**

   Configure alerts in your monitoring system based on:
   - `/health` endpoint status
   - Price feed freshness (>5 minutes stale)
   - Error rates

### Updating the Service

1. **Pull latest changes**

   ```bash
   cd ~/oracle-keeper
   git pull origin main
   ```

2. **Redeploy**

   ```bash
   ./deploy.sh
   ```

### Backup and Recovery

1. **Backup environment configuration**

   ```bash
   cp .env .env.backup
   ```

2. **Recovery procedure**

   If the service fails:
   
   ```bash
   # Check logs
   docker-compose logs -f oracle-keeper
   
   # Restart the service
   docker-compose restart oracle-keeper
   
   # If needed, full redeploy
   docker-compose down
   ./deploy.sh
   ```

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **API Rate Limiting**: Consider implementing rate limiting for public endpoints
3. **Firewall**: Restrict access to management endpoints
4. **Regular Updates**: Keep dependencies updated
5. **Monitoring**: Set up monitoring for unusual price deviations that could indicate oracle manipulation attempts

## Troubleshooting

### Common Issues

1. **Connection issues with RedStone**
   - Check RPC_URL in environment variables
   - Verify contract addresses are correct
   - Check if the QuikNode endpoint is accessible
   
2. **Price feed errors**
   - The service will automatically fall back to mock data if real data is unavailable
   - Check the `/health` endpoint for service status
   
3. **Container not starting**
   - Check Docker logs: `docker-compose logs oracle-keeper`
   - Verify environment variables are set correctly

### Support Channels

For further assistance, contact:
- GitHub Issues: [repository-url]/issues
- Discord: [your-support-channel]
