'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'

interface ResearchGenerationInput {
  title: string
  topic: string
  preferences?: {
    detailLevel?: 'BRIEF' | 'MODERATE' | 'COMPREHENSIVE'
    citationStyle?: 'APA' | 'MLA' | 'CHICAGO' | 'IEEE'
    maxSources?: number
    includeImages?: boolean
  }
}

interface ResearchResult {
  projectId: string
  sessionId: string
  metadata: {
    wordCount: number
    sourceCount: number
    quality: number
  }
  pdfPath?: string
}

interface ProgressUpdate {
  progress: number
  currentStep: string
  message: string
  eta?: number
}

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error'

export function useResearchGeneration() {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const socketRef = useRef<Socket | null>(null)
  const currentSessionRef = useRef<string | null>(null)

  // Initialize WebSocket connection
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'
    socketRef.current = io(wsUrl, {
      transports: ['websocket', 'polling']
    })

    socketRef.current.on('connect', () => {
      console.log('Connected to research agent WebSocket')
    })

    socketRef.current.on('message', (message) => {
      handleWebSocketMessage(message)
    })

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from research agent WebSocket')
    })

    socketRef.current.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  const handleWebSocketMessage = (message: any) => {
    console.log('Received WebSocket message:', message.type, message.payload)
    
    switch (message.type) {
      case 'PROGRESS_UPDATE':
        const progressUpdate = message.payload as ProgressUpdate
        setProgress(progressUpdate.progress)
        setCurrentStep(progressUpdate.currentStep)
        break

      case 'COMPLETION':
        console.log('Completion received:', message.payload)
        setStatus('completed')
        setResult(message.payload)
        setProgress(100)
        setCurrentStep('Research completed successfully!')
        break

      case 'ERROR':
        console.log('Error received:', message.payload)
        setStatus('error')
        setError(message.payload.message)
        setCurrentStep('An error occurred during research generation')
        break

      case 'STATUS_CHANGE':
        // Handle status changes if needed
        break

      case 'AGENT_LOG':
        // Handle agent logs if needed for debugging
        console.log('Agent log:', message.payload)
        break

      case 'TOOL_USAGE':
        // Handle tool usage updates if needed
        console.log('Tool usage:', message.payload)
        break
    }
  }

  const createProjectMutation = useMutation({
    mutationFn: async (input: ResearchGenerationInput) => {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      return response.json()
    },
  })

  const generateResearchMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          options: {
            includeImages: true,
            outputFormat: 'PDF'
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start research generation')
      }

      return response.json()
    },
  })

  const generateResearch = async (input: ResearchGenerationInput) => {
    try {
      setStatus('generating')
      setProgress(0)
      setCurrentStep('Creating project...')
      setError(null)
      setResult(null)

      // Step 1: Create project
      const projectResult = await createProjectMutation.mutateAsync(input)
      const projectId = projectResult.data.id

      setCurrentStep('Starting research generation...')
      setProgress(10)

      // Step 2: Start research generation
      const generationResult = await generateResearchMutation.mutateAsync(projectId)
      const sessionId = generationResult.data.sessionId

      // Store current session for WebSocket handling
      currentSessionRef.current = sessionId

      // Join the session room for real-time updates
      if (socketRef.current) {
        socketRef.current.emit('join-session', sessionId)
      }

      setCurrentStep('Research agents are working...')
      setProgress(15)

    } catch (error) {
      setStatus('error')
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
      setCurrentStep('Failed to start research generation')
    }
  }

  const downloadPDF = async (projectId: string, filename: string = 'research-paper.pdf') => {
    try {
      const response = await fetch(`/api/projects/${projectId}/download`)
      
      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download PDF:', error)
      throw error
    }
  }

  const reset = () => {
    setProgress(0)
    setCurrentStep('')
    setStatus('idle')
    setResult(null)
    setError(null)
    currentSessionRef.current = null
  }

  return {
    generateResearch,
    downloadPDF,
    reset,
    progress,
    currentStep,
    status,
    result,
    error,
    isGenerating: status === 'generating',
    isCompleted: status === 'completed',
    hasError: status === 'error',
  }
}

// Hook for managing research projects
export function useResearchProjects() {
  const fetchProjects = async () => {
    const response = await fetch('/api/projects')
    if (!response.ok) {
      throw new Error('Failed to fetch projects')
    }
    return response.json()
  }

  const fetchProject = async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch project')
    }
    return response.json()
  }

  const deleteProject = async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error('Failed to delete project')
    }
    return response.json()
  }

  return {
    fetchProjects,
    fetchProject,
    deleteProject
  }
}
