## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (Required for local development)
- **Docker & Docker Compose** (Recommended for easy setup)
- **API Keys**: Google Gemini, Brave Search

### 🔧 **Automated Setup (Recommended)**

#### For macOS/Linux:
```bash
cd /Users/abhishekgautam/ai-agents/report-generation-agent

# Run the setup script
./setup.sh
```

#### For Windows:
```cmd
cd C:\path\to\report-generation-agent

# Run the setup script
setup.bat
```

### 🔑 **Generate Security Keys**

The setup script will prompt you to generate these keys:

```bash
# Generate JWT_SECRET (128 characters)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate ENCRYPTION_KEY (32 characters)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(16).toString('hex'))"
```

### 📝 **Manual Setup**

If you prefer manual setup or encounter issues:

#### 1. Clone and Setup Environment
```bash
git clone https://github.com/your-username/research-agent.git
cd research-agent
cp .env.example .env
```

#### 2. Edit .env File
```env
# Required API Keys
GEMINI_API_KEY=your_actual_gemini_api_key
BRAVE_SEARCH_API_KEY=your_actual_brave_search_api_key

# Generated Security Keys
JWT_SECRET=your_generated_jwt_secret_128_chars
ENCRYPTION_KEY=your_generated_32_char_key

# Database URLs (use defaults for Docker)
DATABASE_URL=postgresql://admin:securepassword@postgres:5432/research_db
REDIS_URL=redis://redis:6379
```

#### 3. Install Dependencies (Handle Conflicts)
```bash
# Install shared dependencies
cd shared && npm install --legacy-peer-deps && cd ..

# Install backend dependencies
cd backend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps --no-audit --no-fund
npx prisma generate
cd ..

# Install frontend dependencies  
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps --no-audit --no-fund
cd ..
```

#### 4. Start the Application

**Option A: Docker (Recommended)**
```bash
docker-compose up -d
```

**Option B: Local Development**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev

# Terminal 3 - Start databases
docker-compose up postgres redis chromadb -d
```

### 🌐 **Access the Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000  
- **Health Check**: http://localhost:4000/api/health

## 🔧 **Troubleshooting**

### Common Dependency Issues

#### ERESOLVE Conflicts
```bash
# Clear npm cache
npm cache clean --force

# Use legacy peer deps
npm install --legacy-peer-deps

# Or force resolution
npm install --force
```

#### ChromaDB/LangChain Conflicts
```bash
# Install without chromadb first
npm install --legacy-peer-deps --ignore-scripts

# Then install chromadb separately
npm install chromadb@latest --legacy-peer-deps
```

#### Google Generative AI Version Conflicts
```bash
# Use specific compatible version
npm install @google/generative-ai@^0.17.0 --legacy-peer-deps
```

### Docker Issues
```bash
# Reset Docker environment
docker-compose down -v
docker system prune -a
docker-compose up --build
```

### Node.js Version Issues
```bash
# Check Node.js version
node --version

# Should be 18.0.0 or higher
# Use nvm to manage versions:
nvm install 18
nvm use 18
```

## 🎯 **Getting API Keys**

### Google Gemini API Key  
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy and add to `.env`: `GEMINI_API_KEY=your_key_here`

### Brave Search API Key
1. Visit [Brave Search API](https://api.search.brave.com/app/dashboard) 
2. Sign up and create subscription
3. Copy and add to `.env`: `BRAVE_SEARCH_API_KEY=your_key_here`

## 🚀 **First Run**

After setup, test the system:

1. **Start the application** using Docker or local setup
2. **Open http://localhost:3000** in your browser
3. **Click "Start Research"** button
4. **Enter a research topic** (e.g., "The Impact of AI on Education")
5. **Watch the AI agents work** in real-time
6. **Download your generated PDF** research paper

The system will demonstrate:
- ✅ AI agent orchestration
- ✅ Tool calling and web search
- ✅ Real-time progress updates
- ✅ PDF generation
- ✅ Memory management
- ✅ Database persistence

## 📊 **System Status**

Check if everything is working:

```bash
# API Health Check
curl http://localhost:4000/api/health

# Database Status
docker-compose logs postgres

# All Services Status  
docker-compose ps
```

## 🔄 **Update Instructions**

To update dependencies:

```bash
# Backend updates
cd backend
npm update --legacy-peer-deps

# Frontend updates  
cd frontend
npm update --legacy-peer-deps

# Rebuild containers
docker-compose build --no-cache
```

This setup handles all the common dependency conflicts and provides both automated and manual installation options. The system is designed to be robust and work out of the box once the API keys are configured! 🎉