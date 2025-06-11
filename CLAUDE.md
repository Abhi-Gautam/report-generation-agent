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

### Tool System
Located in `backend/src/tools/`, each tool provides specific capabilities:
- **WebSearch** - Brave Search API integration
- **OutlineGenerator** - Structured research outlines
- **ContentAnalyzer** - Content analysis and extraction
- **Writing** - Content generation
- **PDFGenerator** - LaTeX-to-PDF compilation
- **ChartGenerator** - Data visualization
- **TableGenerator** - Structured data presentation

## 🚀 Development Commands

### Setup & Installation
```bash
# Initial setup (handles dependency conflicts)
./setup.sh                                    # macOS/Linux
# or
setup.bat                                     # Windows

# Manual dependency installation (if needed)
cd backend && npm install --legacy-peer-deps
cd frontend && npm install --legacy-peer-deps
```

### Development Server
```bash
# Start all services with hot reload
docker-compose up -d

# Enable Docker Bake for better build performance (optional)
COMPOSE_BAKE=true docker-compose up --build -d

# Or run locally
cd backend && npm run dev                     # Backend on :4000
cd frontend && npm run dev                    # Frontend on :3000
docker-compose up postgres redis -d          # Just databases
```

### Database Management
```bash
cd backend
npm run db:generate                           # Generate Prisma client
npm run db:push                              # Push schema to database
npm run db:migrate                           # Create migration
npm run db:seed                              # Seed with sample data
```

### Code Quality
```bash
cd backend
npm run lint                                 # ESLint backend
npm run lint:fix                            # Auto-fix linting issues
npm test                                     # Run tests

cd frontend
npm run lint                                 # Next.js lint
npm run type-check                          # TypeScript check
npm run build                               # Production build test
```

### Production Build
```bash
docker-compose -f docker-compose.prod.yml up --build
```

## 🧩 Key Architectural Patterns

### Agent Communication
Agents communicate through:
1. **Tool Execution**: `executeTool(toolName, input)` from BaseAgent
2. **Memory Management**: Short-term/long-term memory via AgentMemoryManager
3. **WebSocket Updates**: Real-time progress via WebSocketService
4. **Session State**: Persistent state through ResearchSession model

### WebSocket Integration
Real-time updates flow: Agent → WebSocketService → Frontend
- Progress updates during generation
- Tool usage logging
- Error notifications
- Session status changes

### Memory Architecture
- **Short-term**: Task context, temporary data (100 items max)
- **Long-term**: Important insights, preferences (1000 items max)
- **Context**: Current research context and user preferences
- **Persistence**: Memory exports/imports for session recovery

### Database Schema
Key models in `backend/prisma/schema.prisma`:
- **User/Project**: Core entities
- **ResearchSession**: Generation workflows
- **ReportSection**: Structured content storage
- **ToolUsage**: Tool execution logs
- **AgentMemory**: Persistent agent memory

## 🛠️ Development Guidelines

### Adding New Agents
1. Extend `BaseAgent` class
2. Implement required methods: `execute()`, `getName()`, `getDescription()`
3. Register tools in constructor
4. Use `logAction()` for tracking
5. Call `updateProgress()` for WebSocket updates

### Adding New Tools
1. Implement `Tool` interface from `backend/src/shared/types.ts`
2. Define parameters and execute method
3. Return `ToolResult` with success/error handling
4. Add to agent's tool list
5. Include comprehensive error handling

### Frontend Integration
- **API Layer**: `frontend/src/lib/api.ts` for backend communication
- **Custom Hooks**: Use provided hooks in `frontend/src/lib/hooks/`
- **Real-time Updates**: WebSocket integration via `use-websocket.ts`
- **State Management**: React Query for server state

### Environment Variables
Required in `.env`:
- `GEMINI_API_KEY` - Google Gemini API
- `BRAVE_SEARCH_API_KEY` - Web search capability
- `JWT_SECRET` - Authentication (128 chars)
- `ENCRYPTION_KEY` - Data encryption (32 chars)
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection

## 🔧 Common Tasks

### Testing Agent Generation
```bash
# Start system
docker-compose up -d

# Test via API
curl -X POST http://localhost:4000/api/research/generate \
  -H "Content-Type: application/json" \
  -d '{"projectId": "your-project-id"}'

# Monitor logs
docker-compose logs -f backend
```

### Debugging Agent Issues
1. Check agent logs in `backend/src/services/logger.ts`
2. Monitor WebSocket messages in browser dev tools
3. Inspect database state via Prisma Studio: `cd backend && npx prisma studio`
4. Review tool execution in ToolUsage table

### Adding Report Types
1. Define in `backend/src/config/reportTypes.ts`
2. Update frontend components in `frontend/src/components/report/`
3. Modify agent prompts to handle new type
4. Test generation pipeline end-to-end

### LaTeX Compilation Issues
The CompilationAgent handles common LaTeX errors:
- Missing packages
- Duplicate document classes
- Encoding issues
- Citation formatting

Error correction flow: Generate → Compile → Fix Errors → Retry

## 📊 Performance Considerations

- **Development Mode**: Reduced research depth and source limits
- **Caching**: Redis caches search results and generated content
- **Memory Management**: Agents use memory cleanup to prevent memory leaks
- **Database**: Proper indexing on projectId and session relationships
- **WebSocket**: Efficient progress updates to prevent message flooding
- **Docker Builds**: Use `COMPOSE_BAKE=true` for improved build performance with Docker Bake

## 🎨 Theme & Design System

### Semantic Design Tokens
This project uses a semantic design token system with CSS custom properties for automatic light/dark theme support. **Always use semantic tokens instead of hardcoded colors.**

#### ✅ ALWAYS USE - Semantic Design Tokens
```tsx
// Backgrounds
bg-background    // Main app background
bg-card         // Card/modal backgrounds  
bg-popover      // Popover/dropdown backgrounds
bg-muted        // Subtle background areas
bg-accent       // Accent backgrounds
bg-secondary    // Secondary backgrounds
bg-primary      // Primary backgrounds

// Text Colors
text-foreground         // Primary text color
text-muted-foreground   // Secondary/muted text
text-card-foreground    // Text on card backgrounds
text-primary-foreground // Text on primary backgrounds
text-accent-foreground  // Text on accent backgrounds
text-destructive        // Error/destructive text

// Borders & Inputs
border-border    // Standard borders
border-input     // Form input borders
bg-input        // Input backgrounds (if needed)
focus:ring-ring // Focus ring color
```

#### ❌ NEVER USE - Hardcoded Colors
```tsx
// DON'T: These break dark mode
bg-white, bg-gray-50, bg-gray-100
text-gray-900, text-gray-700, text-gray-600
border-gray-300, border-gray-200
bg-red-50, text-red-800, bg-blue-100
```

#### Quick Reference Mapping
| ❌ Hardcoded | ✅ Semantic Token |
|-------------|------------------|
| `bg-white` | `bg-card` |
| `text-gray-900` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `border-gray-300` | `border-border` |
| `bg-red-50` | `bg-destructive/10` |
| `text-red-800` | `text-destructive` |

#### Theme Implementation Example
```tsx
// ✅ Good - Themed Modal
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-card rounded-lg p-6 border border-border">
    <h2 className="text-xl font-semibold text-foreground">Title</h2>
    <p className="text-muted-foreground">Description</p>
    
    <input 
      className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      placeholder="Enter text..."
    />
    
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
      <p className="text-destructive">Error message</p>
    </div>
  </div>
</div>
```

#### Theme Testing Checklist
Before committing UI changes, verify:
- [ ] No hardcoded `bg-white`, `bg-gray-*` backgrounds
- [ ] No hardcoded `text-gray-*` text colors
- [ ] No hardcoded `border-gray-*` borders
- [ ] Forms use `bg-background`, `border-input`, `text-foreground`
- [ ] Modals use `bg-card` with `border-border`
- [ ] Error states use `bg-destructive/10` and `text-destructive`
- [ ] Component works in both light and dark themes

**Related Files:**
- `frontend/src/app/globals.css` - CSS custom properties definition
- `frontend/tailwind.config.js` - Tailwind theme configuration
- `frontend/src/components/header.tsx` - Theme toggle implementation

## 🔒 Security Notes

- All user data is scoped to authenticated users
- File uploads are validated for type and size
- API keys are never exposed to frontend
- Database uses prepared statements via Prisma
- WebSocket connections are session-validated

## 🚨 Critical Issues & Known Problems

### LaTeX Compilation Errors
**Status:** High Priority - In Progress

**Problem:** Persistent compilation failures due to structural issues:
```
! LaTeX Error: Can be used only in preamble.
l.47 \documentclass{article}
```

**Root Causes:**
1. **Duplicate `\documentclass` declarations** - Multiple document class definitions in generated LaTeX
2. **Citation system errors** - Undefined references causing compilation failures
3. **File cleanup issues** - Temporary files not properly managed after compilation

**Solution Plan:**
1. Fix LaTeX generation to prevent duplicate `\documentclass`
2. Temporarily remove citation system (`\cite{}` commands)
3. Implement proper file cleanup after compilation
4. Future: Create proper sources list → citation engine → bib file generation

### Citation System Complexity
**Status:** Deferred - Requires Architecture

**Current Issue:** Citations cause undefined reference errors:
```
Citation `vaswani2017attention' on page 2 undefined
Citation `geeksforgeeks_llm_hardware' on page 2 undefined
```

**Proper Citation Pipeline (Future):**
```
1. Sources Collection → 2. Citation Generation → 3. BibTeX File → 4. LaTeX Compilation
   [Research Phase]     [Format Citations]     [Create .bib]    [Compile with refs]
```

**Temporary Fix:** Remove all `\cite{}` commands and bibliography sections from LaTeX generation

### File Management Issues
**Status:** High Priority - Pending

**Problems:**
- LaTeX temp files not cleaned up after compilation
- Missing `.aux`, `.toc` files causing compilation warnings
- Output directory structure inconsistent

**Fix Required:**
- Proper file lifecycle management in LaTeX compiler
- Consistent temp file cleanup
- Better error handling for missing auxiliary files

### CompilationAgent Error Handling
**Status:** In Progress

**Issue:** Agent fixes aren't catching structural problems like duplicate `\documentclass`

**Enhancement Needed:**
- Better parsing of preamble errors
- More robust duplicate declaration detection
- Improved LaTeX structure validation before compilation