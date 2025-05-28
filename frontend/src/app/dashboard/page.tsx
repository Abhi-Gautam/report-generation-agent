'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Plus, Calendar, Download, Eye, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResearchForm } from '@/components/research-form'
import { PDFViewer } from '@/components/pdf-viewer'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/hooks/use-toast'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface Project {
  id: string
  title: string
  topic: string
  status: 'DRAFT' | 'RESEARCHING' | 'WRITING' | 'COMPLETED' | 'FAILED' | 'PAUSED'
  createdAt: string
  updatedAt: string
  files?: Array<{
    id: string
    fileName: string
    filePath: string
    fileType: string
  }>
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showResearchForm, setShowResearchForm] = useState(false)
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    fetchProjects()
  }, [isAuthenticated, router])

  const fetchProjects = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return
      
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(data.data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewPDF = (project: Project) => {
    setSelectedProject(project)
    setShowPDFViewer(true)
  }

  const handleDownloadPDF = async (projectId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/download`)
      
      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive"
      })
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Project deleted successfully"
        })
        fetchProjects()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive"
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'RESEARCHING':
      case 'WRITING':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-50 dark:bg-green-900/30'
      case 'RESEARCHING':
      case 'WRITING':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
      case 'FAILED':
        return 'text-red-600 bg-red-50 dark:bg-red-900/30'
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading your projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                My Research Projects
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Welcome back, {user?.name}! Manage your AI-generated research papers.
              </p>
            </div>
            <Button 
              onClick={() => setShowResearchForm(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Research Paper
            </Button>
          </div>

          {/* User Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Projects</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {projects.filter((p: Project) => p.status === 'COMPLETED').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {user?.hasSubscription ? (user?.subscriptionTier || 'PRO') : 'FREE'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Plan</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {user?.hasSubscription ? 'Premium' : 'Free'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No research projects yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Get started by creating your first AI-generated research paper
              </p>
              <Button 
                onClick={() => setShowResearchForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: Project, index: number) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold line-clamp-2">
                          {project.title}
                        </CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {project.topic}
                        </CardDescription>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        {project.status}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>

                    {project.status === 'COMPLETED' && project.files?.[0] && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPDF(project)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(project.id, `${project.title}.pdf`)}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Research Form Modal */}
        {showResearchForm && (
          <ResearchForm onClose={() => {
            setShowResearchForm(false)
            fetchProjects() // Refresh projects after form closes
          }} />
        )}

        {/* PDF Viewer Modal */}
        {showPDFViewer && selectedProject && (
          <PDFViewer
            pdfUrl={`/api/projects/${selectedProject.id}/download?view=true`}
            fileName={`${selectedProject.title}.pdf`}
            onClose={() => {
              setShowPDFViewer(false)
              setSelectedProject(null)
            }}
            onDownload={() => handleDownloadPDF(selectedProject.id, `${selectedProject.title}.pdf`)}
          />
        )}
      </div>
    </div>
  )
}
