# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🏗️ Architecture Overview

This is a **full-stack AI research paper generation system** with a multi-agent architecture. The system generates professional LaTeX reports from user inputs using specialized AI agents and real-time tool calling.

### Core Components
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS (port 3000)
- **Backend**: Node.js + Express + TypeScript (port 4000)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for sessions and performance
- **AI Integration**: Google Gemini for agent intelligence
- **Deployment**: Docker Compose with development hot-reload

### Agent Architecture
The system uses specialized AI agents that coordinate through a tool calling system:
- **ResearchAgent** (`backend/src/agents/researchAgent.ts`) - Main orchestrator
- **CompilationAgent** (`backend/src/agents/compilationAgent.ts`) - LaTeX compilation & error fixing
- **LatexFormatterAgent** (`backend/src/agents/latexFormatterAgent.ts`) - LaTeX formatting
- **BaseAgent** (`backend/src/agents/base.ts`) - Common agent functionality with memory management

### Additional Notes
- I am always running on docker compose

[Rest of the file remains the same as before...]