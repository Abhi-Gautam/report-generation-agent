// Shared types for the research agent application

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  title: string;
  topic: string;
  status: ProjectStatus;
  outline?: ResearchOutline;
  content?: string;
  metadata?: ProjectMetadata;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  RESEARCHING = 'RESEARCHING',
  WRITING = 'WRITING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED'
}

export interface ResearchSession {
  id: string;
  projectId: string;
  agentLogs: AgentLog[];
  memory?: ConversationMemory;
  status: SessionStatus;
  progress: number;
  currentStep: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentLog {
  id: string;
  timestamp: Date;
  agentType: AgentType;
  action: string;
  input: any;
  output: any;
  success: boolean;
  duration: number;
  error: string | undefined;
}

export enum AgentType {
  RESEARCH = 'RESEARCH',
  SEARCH = 'SEARCH',
  ANALYSIS = 'ANALYSIS',
  WRITING = 'WRITING',
  MEMORY = 'MEMORY'
}

export interface ToolUsage {
  id: string;
  sessionId: string;
  toolName: string;
  input: any;
  output: any;
  duration: number;
  success: boolean;
  createdAt: Date;
}

export interface ResearchOutline {
  title: string;
  abstract: string;
  sections: OutlineSection[];
  keywords: string[];
  estimatedLength: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

export interface OutlineSection {
  id: string;
  title: string;
  subsections: string[];
  estimatedWords: number;
  keyPoints: string[];
  sources?: string[];
}

export interface ProjectMetadata {
  totalSources: number;
  citationStyle: 'APA' | 'MLA' | 'CHICAGO' | 'IEEE';
  language: string;
  fieldOfStudy: string;
  targetAudience: string;
  wordCount?: number;
  lastGenerated?: Date;
}

export interface ConversationMemory {
  shortTerm: MemoryItem[];
  longTerm: MemoryItem[];
  context: ResearchContext;
  preferences: UserPreferences;
}

export interface MemoryItem {
  id: string;
  type: 'FACT' | 'QUESTION' | 'INSIGHT' | 'SOURCE' | 'PREFERENCE';
  content: string;
  importance: number;
  timestamp: Date;
  tags: string[];
}

export interface ResearchContext {
  topic: string;
  relatedTopics: string[];
  keyEntities: string[];
  timeframe: string | undefined;
  geographicScope: string | undefined;
  researchQuestions: string[];
}

export interface UserPreferences {
  citationStyle: string;
  writingStyle: 'ACADEMIC' | 'JOURNALISTIC' | 'TECHNICAL' | 'CASUAL';
  detailLevel: 'BRIEF' | 'MODERATE' | 'COMPREHENSIVE';
  sourceTypes: string[];
  language: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: Date;
  sessionId?: string;
}

export enum MessageType {
  PROGRESS_UPDATE = 'PROGRESS_UPDATE',
  AGENT_LOG = 'AGENT_LOG',
  TOOL_USAGE = 'TOOL_USAGE',
  ERROR = 'ERROR',
  COMPLETION = 'COMPLETION',
  STATUS_CHANGE = 'STATUS_CHANGE'
}

export interface ProgressUpdate {
  sessionId: string;
  progress: number;
  currentStep: string;
  message: string;
  eta?: number;
}

// API Request/Response types
export interface CreateProjectRequest {
  title: string;
  topic: string;
  preferences?: Partial<UserPreferences>;
}

export interface CreateProjectResponse {
  project: Project;
  message: string;
}

export interface GenerateResearchRequest {
  projectId: string;
  options?: {
    includeImages?: boolean;
    maxSources?: number;
    citationStyle?: string;
    outputFormat?: 'PDF' | 'DOCX' | 'MARKDOWN';
  };
}

export interface GenerateResearchResponse {
  sessionId: string;
  message: string;
  estimatedDuration: number;
}

// Tool interfaces
export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute(input: any): Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration: number;
    tokens?: number;
    cost?: number;
    contentItems?: number;
    fileSize?: number;
    pageCount?: number;
    wordCount?: number;
    sectionCount?: number;
    totalResults?: number;
  };
}

// Search and content types
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevanceScore: number;
  publishedDate?: Date;
  author?: string;
}

export interface ExtractedContent {
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedDate?: Date;
  citations: Citation[];
  keyPoints: string[];
  summary: string;
}

export interface Citation {
  id: string;
  type: 'WEBSITE' | 'JOURNAL' | 'BOOK' | 'NEWS' | 'REPORT';
  title: string;
  authors: string[];
  url?: string;
  publishedDate?: Date;
  publisher?: string;
  doi?: string;
  formatted: {
    apa: string;
    mla: string;
    chicago: string;
    ieee: string;
  };
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class ResearchAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ResearchAgentError';
  }
}