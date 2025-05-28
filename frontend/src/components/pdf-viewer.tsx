'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ExternalLink, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PDFViewerProps {
  pdfUrl: string
  fileName: string
  onClose: () => void
  onDownload: () => void
}

export function PDFViewer({ pdfUrl, fileName, onClose, onDownload }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true)

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  const openInNewTab = () => {
    window.open(pdfUrl, '_blank')
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-6xl h-[90vh] flex flex-col"
        >
          <Card className="glass-effect h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  PDF Preview
                </CardTitle>
                <CardDescription>
                  {fileName}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={openInNewTab}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="relative h-full">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-gray-600 dark:text-gray-400">Loading PDF...</p>
                    </div>
                  </div>
                )}
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0 rounded-b-lg"
                  title={fileName}
                  onLoad={handleIframeLoad}
                  onError={() => setIsLoading(false)}
                >
                  <div className="p-8 text-center">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Your browser doesn't support PDF viewing. 
                    </p>
                    <Button onClick={onDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </iframe>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
