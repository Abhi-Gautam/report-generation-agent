'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Settings, Zap, Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { PDFViewer } from '@/components/pdf-viewer'
import { useResearchGeneration } from '@/lib/hooks/use-research'
import { useToast } from '@/lib/hooks/use-toast'

interface ResearchFormProps {
  onClose: () => void
}

export function ResearchForm({ onClose }: ResearchFormProps) {
  const [topic, setTopic] = useState('')
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const [preferences, setPreferences] = useState({
    detailLevel: 'MODERATE' as 'BRIEF' | 'MODERATE' | 'COMPREHENSIVE',
    citationStyle: 'APA' as 'APA' | 'MLA' | 'CHICAGO' | 'IEEE',
    maxSources: 15,
    includeImages: true
  })
  
  const { toast } = useToast()
  const { 
    generateResearch, 
    progress, 
    status, 
    currentStep, 
    isGenerating,
    result 
  } = useResearchGeneration()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a research topic",
        variant: "destructive"
      })
      return
    }
    try {
      await generateResearch({
        title: `Research Paper: ${topic}`,
        topic: topic.trim(),
        preferences
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start research generation",
        variant: "destructive"
      })
    }
  }

  const handleDownload = () => {
    if (result?.projectId) {
      const link = document.createElement('a')
      link.href = `/api/projects/${result.projectId}/download`
      link.download = `${topic.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleViewPDF = () => {
    setShowPDFViewer(true)
  }

  const getPDFUrl = () => {
    if (result?.projectId) {
      return `/api/projects/${result.projectId}/download?view=true`
    }
    return ''
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="glass-effect">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Generate Research Paper</CardTitle>
                <CardDescription>
                  Enter your research topic and let our AI agents create a comprehensive paper
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isGenerating || status === 'idle' ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Topic Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Research Topic</label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., The Impact of Artificial Intelligence on Modern Education Systems"
                      className="w-full min-h-[80px] p-3 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      required
                    />
                  </div>
                  {/* Preferences */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Detail Level</label>
                      <select
                        value={preferences.detailLevel}
                        onChange={(e) => setPreferences(prev => ({ 
                          ...prev, 
                          detailLevel: e.target.value as any 
                        }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="BRIEF">Brief (2-3 pages)</option>
                        <option value="MODERATE">Moderate (5-8 pages)</option>
                        <option value="COMPREHENSIVE">Comprehensive (10+ pages)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Citation Style</label>
                      <select
                        value={preferences.citationStyle}
                        onChange={(e) => setPreferences(prev => ({ 
                          ...prev, 
                          citationStyle: e.target.value as any 
                        }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="APA">APA</option>
                        <option value="MLA">MLA</option>
                        <option value="CHICAGO">Chicago</option>
                        <option value="IEEE">IEEE</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Max Sources</label>
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={preferences.maxSources}
                        onChange={(e) => setPreferences(prev => ({ 
                          ...prev, 
                          maxSources: parseInt(e.target.value) 
                        }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Include Images</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={preferences.includeImages}
                          onChange={(e) => setPreferences(prev => ({ 
                            ...prev, 
                            includeImages: e.target.checked 
                          }))}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Include relevant images and charts</span>
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" size="lg">
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Research Paper
                  </Button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                      <FileText className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-semibold">Generating Your Research Paper</h3>
                    <p className="text-gray-600 dark:text-gray-400">{currentStep}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                  {status === 'completed' && result && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                          <Download className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-green-600">Research Paper Complete!</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Your {result.metadata.wordCount} word research paper is ready
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="font-semibold text-lg">{result.metadata.sourceCount}</div>
                          <div className="text-gray-600">Sources</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="font-semibold text-lg">{Math.round(result.metadata.quality * 100)}%</div>
                          <div className="text-gray-600">Quality Score</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleViewPDF} variant="outline" className="flex-1">
                          <Eye className="mr-2 h-4 w-4" />
                          View PDF
                        </Button>
                        <Button onClick={handleDownload} className="flex-1">
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </div>
                    </motion.div>
                  )}
                  {status === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-red-600"
                    >
                      <p>An error occurred while generating your research paper.</p>
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.reload()} 
                        className="mt-4"
                      >
                        Try Again
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* PDF Viewer Modal */}
      {showPDFViewer && result?.projectId && (
        <PDFViewer
          pdfUrl={getPDFUrl()}
          fileName={`${topic.replace(/\s+/g, '_')}.pdf`}
          onClose={() => setShowPDFViewer(false)}
          onDownload={handleDownload}
        />
      )}
    </AnimatePresence>
  )
}
