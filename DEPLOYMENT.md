# 🚀 Deployment Guide - Render.com

This guide will walk you through deploying the Travelpayouts Link Rotator to Render.com with Turso database integration.

## 📋 Prerequisites

1. **GitHub Account**: Your code must be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Turso Account**: Sign up at [turso.tech](https://turso.tech)
4. **Yourls Instance**: Working Yourls installation with API access

## 🗄️ Step 1: Set Up Turso Database

### 1.1 Install Turso CLI
```bash
# macOS
brew install tursodatabase/tap/turso

# Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows
powershell -c "irm https://get.tur.so/install.ps1 | iex"
```

### 1.2 Login to Turso
```bash
turso auth login
```

### 1.3 Create Database
```bash
turso db create travelpayouts-rotator
```

### 1.4 Get Database Credentials
```bash
# Get database URL
turso db show travelpayouts-rotator --url

# Get auth token
turso db tokens create travelpayouts-rotator
```

**Save these values** - you'll need them for Render environment variables.

## 🌐 Step 2: Deploy to Render.com

### 2.1 Connect Repository

1. Go to [render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub account if not already connected
4. Select your repository: `travelpayouts-link-rotator`

### 2.2 Configure Web Service

Fill in the following details:

- **Name**: `travelpayouts-rotator`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free (or paid for better performance)

### 2.3 Set Environment Variables

Click "Environment" tab and add these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `TURSO_DATABASE_URL` | Your Turso database URL | `libsql://travelpayouts-rotator-username.turso.io` |
| `TURSO_AUTH_TOKEN` | Your Turso auth token | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `YOURLS_API_URL` | Your Yourls API endpoint | `https://your-domain.com/yourls-api.php` |
| `YOURLS_SIGNATURE_TOKEN` | Your Yourls signature token | `your-signature-token` |
| `NODE_ENV` | Environment | `production` |

### 2.4 Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy your application
3. Wait for the build to complete (usually 2-5 minutes)

## 🔧 Step 3: Verify Deployment

### 3.1 Check Build Logs

1. In your Render dashboard, click on your service
2. Go to "Logs" tab
3. Look for successful build messages:
   ```
   ✓ Database initialization completed
   ✓ Database initialized successfully
   ```

### 3.2 Test the Application

1. Click the generated URL (e.g., `https://travelpayouts-rotator.onrender.com`)
2. You should see the login page
3. Login with default credentials:
   - Username: `admin`
   - Codephrase: `travelpayouts2024`

### 3.3 Configure Your API Key

1. After login, enter your Yourls API key in the header
2. Click the "✓" button to test and save it
3. The API key will be stored in the database

## 🔐 Step 4: Security Configuration

### 4.1 Change Default Credentials

**Important**: Change the default admin credentials in production.

1. Access your Turso database:
```bash
turso db shell travelpayouts-rotator
```

2. Update admin credentials:
```sql
UPDATE admins 
SET codephrase = 'your-new-secure-codephrase' 
WHERE username = 'admin';
```

3. Exit the shell:
```sql
.exit
```

### 4.2 Configure Custom Domain (Optional)

1. In Render dashboard, go to "Settings" → "Custom Domains"
2. Add your domain
3. Configure DNS records as instructed by Render

## 📊 Step 5: Monitor and Maintain

### 5.1 Monitor Logs

- Check Render logs regularly for errors
- Monitor database performance in Turso dashboard
- Set up alerts for service downtime

### 5.2 Database Management

```bash
# View database info
turso db show travelpayouts-rotator

# Create backup
turso db backup create travelpayouts-rotator

# View backups
turso db backup list travelpayouts-rotator
```

### 5.3 Scaling (If Needed)

- **Free Plan**: 750 hours/month, sleeps after 15 minutes of inactivity
- **Paid Plans**: Always-on, better performance, custom domains
- **Database**: Turso scales automatically

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Failures
```
Error: Cannot find module '@libsql/client'
```
**Solution**: Ensure `@libsql/client` is in `package.json` dependencies (not devDependencies).

#### 2. Database Connection Errors
```
Error: Database initialization failed
```
**Solution**: 
- Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- Check Turso dashboard for database status
- Ensure database region matches Render region

#### 3. Yourls API Errors
```
Error: Failed to verify API key
```
**Solution**:
- Verify Yourls API URL and signature token
- Check Yourls logs for authentication errors
- Ensure Yourls is accessible from Render's servers

#### 4. Session Issues
```
Error: Invalid or expired session
```
**Solution**:
- Clear browser cookies
- Check cookie settings in production
- Verify HTTPS configuration

### Debug Mode

To enable debug logging:

1. Add environment variable: `NODE_ENV=development`
2. Check Render logs for detailed error messages
3. Use browser developer tools to inspect network requests

## 🔄 Updates and Maintenance

### Deploying Updates

1. Push changes to your GitHub repository
2. Render will automatically detect changes
3. New deployment will start automatically
4. Monitor build logs for any issues

### Database Migrations

If you need to update the database schema:

1. Update the schema in `lib/database.ts`
2. Deploy the changes
3. The new schema will be applied automatically on first API call

### Backup Strategy

```bash
# Create daily backups
turso db backup create travelpayouts-rotator --name daily-$(date +%Y%m%d)

# List all backups
turso db backup list travelpayouts-rotator

# Restore from backup (if needed)
turso db restore travelpayouts-rotator backup-name
```

## 📞 Support

If you encounter issues:

1. **Check Render Logs**: Look for error messages in the Render dashboard
2. **Check Turso Status**: Visit [status.tur.so](https://status.tur.so)
3. **Review Documentation**: Check Turso and Yourls documentation
4. **GitHub Issues**: Open an issue in the repository

## 🎉 Success!

Your Travelpayouts Link Rotator is now deployed and ready to use! 

- **URL**: Your Render service URL
- **Database**: Turso cloud database
- **API**: Yourls integration working
- **Security**: Session-based authentication

Remember to:
- ✅ Change default credentials
- ✅ Configure your Yourls API key
- ✅ Set up marker configurations
- ✅ Test link generation
- ✅ Monitor performance 