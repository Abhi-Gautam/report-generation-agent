# Research Agent - AI-Powered Research Paper Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A comprehensive, production-ready research paper generation system powered by AI agents, featuring advanced tool calling, memory management, and real-time progress tracking. This system demonstrates modern agent architecture, MCP integration, and serves as an excellent starting point for agent-based applications.

## 🚀 Features

### Core Functionality
- **AI-Powered Research**: Advanced AI agents conduct comprehensive research using multiple sources
- **Intelligent Outline Generation**: Automated creation of structured research paper outlines
- **Web Scraping & Analysis**: Smart content extraction and analysis from web sources
- **Multi-Format Export**: PDF, DOCX, Markdown, and LaTeX output formats
- **Citation Management**: Support for APA, MLA, Chicago, and IEEE citation styles

### Advanced Agent System
- **Multi-Agent Architecture**: Specialized agents for research, analysis, and writing
- **Tool Calling**: Comprehensive tool system with web search, content analysis, and PDF generation
- **Memory Management**: Persistent memory with short-term and long-term storage
- **MCP Integration**: Model Context Protocol for enhanced context management
- **Real-time Updates**: WebSocket-based progress tracking and live updates

### Technical Excellence
- **Modern Tech Stack**: Next.js 14, Node.js, TypeScript, PostgreSQL, Redis, ChromaDB
- **Containerized Deployment**: Complete Docker setup with multi-service orchestration
- **Database Integration**: PostgreSQL with Prisma ORM for data persistence
- **Vector Search**: ChromaDB for semantic search and embeddings
- **Caching Layer**: Redis for session management and performance optimization

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   Node.js       │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend       │◄──►│   Database      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │     Redis       │    │    ChromaDB     │
         └──────────────│     Cache       │    │   Vector DB     │
                        │                 │    │                 │
                        └─────────────────┘    └─────────────────┘
```

### Agent System Architecture

```
Research Agent (Orchestrator)
├── Search Agent (Web Research)
├── Analysis Agent (Content Processing)
├── Writing Agent (Paper Generation)
└── Memory Manager (Context & State)

Tool System
├── Web Search Tool (Brave Search API)
├── Content Analyzer Tool (AI-powered analysis)
├── PDF Generator Tool (Document creation)
├── Citation Tool (Reference formatting)
└── Embedding Tool (Semantic search)
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Query** - Server state management
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js & Express** - Server runtime and framework
- **TypeScript** - Type-safe backend development
- **Prisma ORM** - Database toolkit and query builder
- **Socket.io** - WebSocket communication
- **Google Gemini** - LLM for AI agents
- **Winston** - Logging framework

### Database & Storage
- **PostgreSQL** - Primary database for structured data
- **Redis** - Caching and session management
- **ChromaDB** - Vector database for embeddings

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy (production)
- **PM2** - Process management (production)

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- API Keys: Google Gemini, Brave Search

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/research-agent.git
cd research-agent
```

### 2. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your API keys
nano .env
```

Required environment variables:
```env
# AI Service API Keys
GEMINI_API_KEY=your_gemini_api_key_here
BRAVE_SEARCH_API_KEY=your_brave_search_api_key_here

# Database Configuration
DATABASE_URL=postgresql://admin:securepassword@postgres:5432/research_db
REDIS_URL=redis://redis:6379

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

### 3. Start with Docker (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
open http://localhost:3000
```

### 4. Local Development Setup
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../shared && npm install

# Start backend
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm run dev

# Start database services
docker-compose up postgres redis chromadb -d
```

## 📖 Usage

### Basic Usage

1. **Start Research**: Click "Start Research" on the homepage
2. **Enter Topic**: Input your research topic (e.g., "The Impact of AI on Education")
3. **Configure Settings**: Choose detail level, citation style, and preferences
4. **Generate**: Watch AI agents work in real-time
5. **Download**: Get your completed research paper in PDF format

### Advanced Features

#### Custom Research Sessions
```javascript
// Using the research hook
const { generateResearch, progress, status } = useResearchGeneration()

await generateResearch({
  title: "Custom Research Paper",
  topic: "Your research topic here",
  preferences: {
    detailLevel: 'COMPREHENSIVE',
    citationStyle: 'APA',
    maxSources: 25,
    includeImages: true
  }
})
```

#### Real-time Progress Tracking
The system provides live updates through WebSocket connections:
- Research phase progress
- Agent activity logs
- Tool usage statistics
- Error handling and recovery

## 🔧 Development

### Project Structure
```
research-agent/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # Reusable UI components
│   │   ├── lib/            # Utilities and hooks
│   │   └── types/          # TypeScript definitions
│   └── Dockerfile
├── backend/                 # Node.js backend application
│   ├── src/
│   │   ├── agents/         # AI agent implementations
│   │   ├── tools/          # Tool implementations
│   │   ├── services/       # Business logic services
│   │   ├── routes/         # API route handlers
│   │   └── utils/          # Utility functions
│   ├── prisma/             # Database schema and migrations
│   └── Dockerfile
├── shared/                  # Shared types and utilities
├── docker-compose.yml       # Multi-service Docker setup
└── README.md               # This file
```

### Adding New Tools

1. **Create Tool Implementation**:
```typescript
// backend/src/tools/customTool.ts
import { Tool, ToolResult, ToolParameter } from '@research-agent/shared'

export class CustomTool implements Tool {
  public name = 'CustomTool'
  public description = 'Description of what this tool does'
  public parameters: ToolParameter[] = [
    {
      name: 'input',
      type: 'string',
      description: 'Input parameter description',
      required: true
    }
  ]

  public async execute(input: any): Promise<ToolResult> {
    try {
      // Tool implementation logic
      const result = await this.processInput(input)
      
      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime
        }
      }
    }
  }
}
```

2. **Register Tool with Agent**:
```typescript
// Add to agent's tool configuration
const config: AgentConfig = {
  name: 'Research Agent',
  type: AgentType.RESEARCH,
  tools: [
    new WebSearchTool(),
    new CustomTool(), // Your new tool
    // ... other tools
  ]
}
```

### Extending Agent Capabilities

1. **Create Custom Agent**:
```typescript
export class CustomAgent extends BaseAgent {
  public async execute(input: any): Promise<any> {
    // Agent logic implementation
    const toolResult = await this.executeTool('ToolName', input)
    return this.processResult(toolResult)
  }
}
```

2. **Add Memory Management**:
```typescript
// Store important information
this.memory.setLongTerm('key', value, importance)

// Retrieve when needed
const rememberedValue = this.memory.getLongTerm('key')
```

## 🧪 Testing

### Unit Tests
```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

### Integration Tests
```bash
# Run full test suite
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Load Testing
```bash
# Test API endpoints
cd backend
npm run test:load
```

## 📊 Monitoring & Analytics

### Health Checks
- **API Health**: `GET /api/health`
- **Database Health**: Automatic connection monitoring
- **Redis Health**: Connection status tracking
- **Agent Performance**: Tool execution metrics

### Logging
- **Structured Logging**: JSON format with Winston
- **Log Levels**: Error, Warn, Info, Debug
- **Request Tracking**: Full request/response logging
- **Agent Activity**: Detailed agent execution logs

### Metrics
- **Research Sessions**: Success/failure rates
- **Tool Performance**: Execution times and success rates
- **User Activity**: Project creation and completion metrics

## 🚀 Deployment

### Production Docker Setup
```bash
# Production build
docker-compose -f docker-compose.prod.yml up -d

# With Nginx reverse proxy
docker-compose --profile production up -d
```

### Environment Variables (Production)
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/research_db
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=your_secure_jwt_secret
ENCRYPTION_KEY=your_32_character_encryption_key
```

### Scaling
- **Horizontal Scaling**: Multiple backend instances behind load balancer
- **Database Scaling**: Read replicas and connection pooling
- **Caching**: Redis cluster for high availability
- **CDN**: Static asset distribution

## 🔄 API Reference

### Projects API

#### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "title": "Research Paper Title",
  "topic": "Your research topic",
  "preferences": {
    "detailLevel": "MODERATE",
    "citationStyle": "APA",
    "maxSources": 15
  }
}
```

#### Generate Research
```http
POST /api/projects/{id}/generate
Content-Type: application/json

{
  "options": {
    "includeImages": true,
    "outputFormat": "PDF"
  }
}
```

#### Get Project Status
```http
GET /api/projects/{id}/status
```

#### Download PDF
```http
GET /api/projects/{id}/download
```

### WebSocket Events

#### Join Session
```javascript
socket.emit('join-session', sessionId)
```

#### Progress Updates
```javascript
socket.on('message', (message) => {
  if (message.type === 'PROGRESS_UPDATE') {
    console.log('Progress:', message.payload.progress)
  }
})
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message standards

## 🐛 Troubleshooting

### Common Issues

#### Docker Issues
```bash
# Reset Docker environment
docker-compose down -v
docker system prune -a
docker-compose up --build
```

#### Database Connection Issues
```bash
# Check database status
docker-compose logs postgres

# Reset database
docker-compose down postgres
docker volume rm research-agent_postgres_data
docker-compose up postgres -d
```

#### API Key Issues
- Ensure all API keys are properly set in `.env`
- Check API key permissions and quotas
- Verify API endpoints are accessible

### Performance Optimization

#### Database Optimization
- Enable connection pooling
- Add database indexes for frequently queried fields
- Implement read replicas for scaling

#### Caching Strategy
- Redis for session storage
- Application-level caching for API responses
- CDN for static assets

#### Memory Management
- Configure Node.js heap size for large research operations
- Implement memory cleanup for long-running sessions
- Monitor memory usage in production

## 📈 Roadmap

### Upcoming Features
- [ ] **Multi-language Support**: Research papers in multiple languages
- [ ] **Advanced Analytics**: Research quality metrics and insights
- [ ] **Collaboration Tools**: Team research and shared workspaces
- [ ] **API Integrations**: PubMed, arXiv, Google Scholar integrations
- [ ] **Voice Interface**: Voice-controlled research generation
- [ ] **Mobile App**: iOS and Android applications

### Long-term Goals
- [ ] **Academic Partnerships**: Integration with university systems
- [ ] **Enterprise Features**: Advanced security and compliance
- [ ] **AI Model Training**: Custom research-focused language models
- [ ] **Blockchain Integration**: Decentralized research verification

## 📞 Support

### Community Support
- **GitHub Issues**: [Report bugs and request features](https://github.com/your-username/research-agent/issues)
- **Discussions**: [Community discussions and Q&A](https://github.com/your-username/research-agent/discussions)
- **Discord**: [Join our Discord server](https://discord.gg/research-agent)

### Professional Support
- **Enterprise Support**: Available for commercial deployments
- **Custom Development**: Tailored solutions for specific needs
- **Training & Consulting**: Implementation guidance and best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** - For Claude AI assistance in development
- **Google** - For Gemini API and advanced language models
- **Brave** - For Search API and web data access
- **Open Source Community** - For the amazing tools and libraries
- **Contributors** - Everyone who has contributed to this project

## 📝 Citation

If you use this project in your research or development, please cite:

```bibtex
@software{research_agent_2024,
  title={Research Agent: AI-Powered Research Paper Generator},
  author={Your Name},
  year={2024},
  url={https://github.com/your-username/research-agent},
  version={1.0.0}
}
```

---

**Built with ❤️ by the Research Agent Team**

For more information, visit our [website](https://research-agent.com) or check out the [documentation](https://docs.research-agent.com).
