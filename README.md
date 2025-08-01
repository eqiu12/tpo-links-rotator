# Travelpayouts Link Rotator

A web tool for rotating and shortening Aviasales.ru affiliate links using the Yourls API with smart marker distribution based on historical click performance.

## 🚀 Features

- **Smart Marker Distribution**: Analyzes historical click percentages and prioritizes underperforming markers
- **Persistent Storage**: API keys and marker configurations saved per user
- **Multiple Link Processing**: Add multiple links dynamically for batch processing
- **Real-time Statistics**: View recent links with click statistics and revenue tracking
- **Secure Authentication**: Session-based login system
- **Turso Database**: Serverless SQLite database for data persistence

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Turso (serverless SQLite)
- **External APIs**: Yourls API for URL shortening

## 📋 Prerequisites

1. **Yourls Installation**: A working Yourls instance with API access
2. **Turso Account**: Free account at [turso.tech](https://turso.tech)
3. **Node.js**: Version 18 or higher

## 🗄️ Database Setup (Turso)

### 1. Install Turso CLI
```bash
# macOS
brew install tursodatabase/tap/turso

# Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows
powershell -c "irm https://get.tur.so/install.ps1 | iex"
```

### 2. Login to Turso
```bash
turso auth login
```

### 3. Create Database
```bash
turso db create travelpayouts-rotator
```

### 4. Get Database URL and Token
```bash
# Get database URL
turso db show travelpayouts-rotator --url

# Get auth token
turso db tokens create travelpayouts-rotator
```

## 🔧 Environment Configuration

1. Copy the environment template:
```bash
cp env.example .env.local
```

2. Update `.env.local` with your credentials:
```env
# Yourls API Configuration
YOURLS_API_URL=https://your-domain.com/yourls-api.php
YOURLS_SIGNATURE_TOKEN=your-signature-token

# Turso Database Configuration
TURSO_DATABASE_URL=libsql://your-database-url
TURSO_AUTH_TOKEN=your-auth-token
```

## 🚀 Local Development

1. **Install Dependencies**
```bash
npm install
```

2. **Start Development Server**
```bash
npm run dev
```

3. **Access Application**
Open [http://localhost:3000](http://localhost:3000)

## 🌐 Deployment to Render.com

### 1. Prepare for Deployment

1. **Push to GitHub**
```bash
git add .
git commit -m "Add Turso database integration"
git push origin main
```

2. **Environment Variables on Render**
Set these environment variables in your Render dashboard:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `YOURLS_API_URL`
- `YOURLS_SIGNATURE_TOKEN`

### 2. Deploy on Render

1. **Connect Repository**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - **Name**: `travelpayouts-rotator`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

3. **Environment Variables**
   Add all variables from your `.env.local` file

4. **Deploy**
   Click "Create Web Service"

## 📊 Database Schema

### Admins Table
```sql
CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  codephrase TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT,
  api_key TEXT
);
```

### Marker Configs Table
```sql
CREATE TABLE marker_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  marker_id TEXT NOT NULL,
  percentage INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  UNIQUE(admin_id, marker_id)
);
```

## 🔐 Default Credentials

The application comes with two default admin accounts:

1. **Admin Account**
   - Username: `admin`
   - Codephrase: `travelpayouts2024`

2. **Manager Account**
   - Username: `manager`
   - Codephrase: `manager2024`

**⚠️ Important**: Change these credentials in production by updating the database directly.

## 🎯 Usage

1. **Login**: Use your admin credentials
2. **Configure API Key**: Enter your Yourls API key in the header
3. **Set Marker Weights**: Configure your marker IDs and percentages
4. **Save Configuration**: Click "Save Marker Configuration" to persist settings
5. **Add Links**: Paste Aviasales.ru search links
6. **Generate**: Click "Generate Rotated Links" to create shortened affiliate links

## 🔄 Smart Distribution Algorithm

The system analyzes the last 500 Aviasales links and:
1. Calculates current click percentages for each marker
2. Identifies underperforming markers (below target percentage)
3. Prioritizes underperforming markers in new link distribution
4. Balances click share towards target percentages

## 📈 Revenue Tracking

- Each click is estimated at 4₽ revenue
- Statistics show total revenue per marker
- Historical performance tracking

## 🛡️ Security Features

- Session-based authentication with HTTP-only cookies
- API key validation before saving
- Input validation and sanitization
- Secure database connections

## 🐛 Troubleshooting

### Database Connection Issues
- Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- Check Turso dashboard for database status
- Ensure database is in the same region as your deployment

### Yourls API Issues
- Verify API URL and signature token
- Check Yourls logs for authentication errors
- Ensure API is accessible from your deployment region

### Session Issues
- Clear browser cookies
- Check cookie settings in production
- Verify HTTPS configuration

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review Turso and Yourls documentation
3. Open an issue on GitHub 