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

The system is built with a modular, multi-agent architecture and a modern web stack, supporting real-time updates and scalable deployment.

## 🛠️ Tech Stack

### Frontend
- Next.js 14 (React framework)
- TypeScript
- Tailwind CSS
- Framer Motion
- React Query
- Socket.io Client

### Backend
- Node.js & Express
- TypeScript
- Prisma ORM
- Socket.io
- Google Gemini
- Winston

### Database & Storage
- PostgreSQL
- Redis
- ChromaDB

### Infrastructure
- Docker & Docker Compose
- Nginx
- PM2

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- API Keys: Google Gemini, Brave Search

1. **Clone the Repository**
2. **Set up your environment variables** (see `.env.example`)
3. **Start with Docker**: `docker-compose up -d`
4. **Access the application** at `http://localhost:3000`

## 📖 Usage

- Start research, enter your topic, configure settings, and generate your paper.
- Download your completed research paper in PDF format.
- Real-time progress and agent activity are shown in the UI.

## 🔧 Development

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript, Prisma
- Shared: Types and utilities for both frontend and backend
- Use Docker Compose for local development and orchestration

## 🧪 Testing

- Run backend and frontend tests with `npm run test` in each respective directory.
- Integration and load testing supported via Docker Compose and scripts.

## 📊 Monitoring & Analytics

- Health checks, structured logging, and metrics are built-in for production monitoring.

## 🚀 Deployment

- Use Docker Compose for production deployment.
- Environment variables and scaling options are available for advanced setups.

## 🤝 Contributing

We welcome contributions! Please see our Contributing Guide for details.

## 🐛 Troubleshooting

- Common issues include Docker environment resets, database connection problems, and API key configuration.
- See the documentation for more troubleshooting tips.

## 📈 Roadmap

- Multi-language support, advanced analytics, collaboration tools, API integrations, and more are planned for future releases.

## 📞 Support

- Community support via GitHub Issues and Discussions.
- Professional support and custom development available for enterprise users.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Anthropic, Google, Brave, and the open source community for their contributions and APIs.

---

**Built with ❤️ by the Research Agent Team**
