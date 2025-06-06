'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useProgressTracking } from '@/lib/hooks/use-websocket';
import { authApi } from '@/lib/api';

interface GenerationStatus {
  projectStatus: string;
  sessionStatus: string;
  progress: number;
  currentStep: string;
  updatedAt: string;
  sessionId: string;
}

export default function GeneratingReportPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialStatus, setInitialStatus] = useState<GenerationStatus | null>(null);
  const [sectionsCount, setSectionsCount] = useState<number>(0);

  // Use WebSocket for real-time progress tracking
  const { progress, error: wsError, isComplete, isConnected } = useProgressTracking(sessionId || undefined);

  // Get initial session ID and status
  const fetchInitialStatus = async () => {
    try {
      // Try authApi first (for production), fallback to direct backend URL for development
      let response;
      try {
        response = await authApi.get(`/projects/${projectId}/status`);
      } catch (error) {
        // Fallback to direct backend URL for development
        const token = localStorage.getItem('auth_token');
        const backendResponse = await fetch(`http://localhost:4000/api/projects/${projectId}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!backendResponse.ok) {
          throw new Error('Failed to fetch status from backend');
        }
        
        response = { data: await backendResponse.json() };
      }
      
      setInitialStatus(response.data.data);
      setSessionId(response.data.data.sessionId);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch initial status:', err);
      setIsLoading(false);
    }
  };

  // Check sections count periodically
  const checkSectionsCount = async () => {
    try {
      let sectionsResponse;
      try {
        sectionsResponse = await authApi.get(`/sections/${projectId}`);
      } catch (error) {
        // Fallback to direct backend URL
        const token = localStorage.getItem('auth_token');
        const backendResponse = await fetch(`http://localhost:4000/api/sections/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (backendResponse.ok) {
          sectionsResponse = { data: await backendResponse.json() };
        }
      }
      
      if (sectionsResponse?.data?.data) {
        setSectionsCount(sectionsResponse.data.data.length);
      }
    } catch (err) {
      console.error('Failed to check sections count:', err);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    fetchInitialStatus();
    
    // Start checking sections count every 3 seconds
    const sectionsInterval = setInterval(checkSectionsCount, 3000);
    
    return () => clearInterval(sectionsInterval);
  }, [projectId]);

  // Check if sections are available before redirecting
  const checkSectionsAndRedirect = async () => {
    try {
      let sectionsResponse;
      try {
        sectionsResponse = await authApi.get(`/sections/${projectId}`);
      } catch (error) {
        // Fallback to direct backend URL
        const token = localStorage.getItem('auth_token');
        const backendResponse = await fetch(`http://localhost:4000/api/sections/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (backendResponse.ok) {
          sectionsResponse = { data: await backendResponse.json() };
        }
      }
      
      // Only redirect if we have sections available
      if (sectionsResponse?.data?.data?.length > 0) {
        console.log(`Found ${sectionsResponse.data.data.length} sections, redirecting to edit page`);
        setTimeout(() => {
          router.push(`/reports/${projectId}/edit`);
        }, 2000);
      } else {
        // If no sections yet, check again in 2 seconds
        setTimeout(checkSectionsAndRedirect, 2000);
      }
    } catch (err) {
      console.error('Failed to check sections:', err);
      // Fallback: redirect anyway after delay
      setTimeout(() => {
        router.push(`/reports/${projectId}/edit`);
      }, 3000);
    }
  };

  // Handle completion and redirect
  useEffect(() => {
    if (isComplete || (initialStatus?.projectStatus === 'COMPLETED' && initialStatus?.sessionStatus === 'COMPLETED')) {
      console.log('Generation completed, checking sections before redirect...');
      checkSectionsAndRedirect();
    }
  }, [isComplete, initialStatus, router, projectId]);

  // Determine current error from WebSocket or initial fetch
  const error = wsError || (initialStatus?.projectStatus === 'FAILED' ? 'Generation failed' : null);
  
  const getStatusIcon = () => {
    if (error) return <AlertCircle className="w-6 h-6 text-red-500" />;
    if (isComplete || initialStatus?.projectStatus === 'COMPLETED') return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (initialStatus?.projectStatus === 'FAILED') return <AlertCircle className="w-6 h-6 text-red-500" />;
    return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
  };

  const getStatusMessage = () => {
    if (error) return 'Failed to generate report';
    if (isComplete) return 'Report generated successfully! Redirecting...';
    if (initialStatus?.projectStatus === 'COMPLETED') return 'Report generated successfully! Redirecting...';
    if (initialStatus?.projectStatus === 'FAILED') return 'Report generation failed';
    return progress?.currentStep || progress?.message || initialStatus?.currentStep || 'Starting AI research...';
  };

  const getCurrentProgress = () => {
    return progress?.progress ?? initialStatus?.progress ?? 0;
  };

  if (isLoading && !initialStatus) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-lg text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Generating Your Report</h1>
          <p className="text-gray-600">
            Our AI is researching and writing your report. This typically takes 2-3 minutes.
          </p>
          
          {/* WebSocket Connection Status */}
          <div className="flex items-center justify-center mt-3 text-sm">
            {isConnected ? (
              <div className="flex items-center text-green-600">
                <Wifi className="w-4 h-4 mr-1" />
                <span>Real-time updates connected</span>
              </div>
            ) : (
              <div className="flex items-center text-orange-600">
                <WifiOff className="w-4 h-4 mr-1" />
                <span>Connecting for real-time updates...</span>
              </div>
            )}
          </div>

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <div>Project: {projectId}</div>
              <div>Session: {sessionId}</div>
              <div>Status: {initialStatus?.projectStatus} / {initialStatus?.sessionStatus}</div>
              <div>WS Progress: {progress?.progress}%</div>
              <div>Sections: {sectionsCount}</div>
            </div>
          )}
          
          {/* Sections Count Display */}
          <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span>📄</span>
              <span>{sectionsCount} sections created</span>
            </div>
            {sessionId && (
              <div className="flex items-center space-x-2">
                <span>🔗</span>
                <span>Session: {sessionId.slice(-8)}</span>
              </div>
            )}
          </div>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            {/* Status Icon and Message */}
            <div className="flex items-center justify-center space-x-3">
              {getStatusIcon()}
              <span className="text-lg font-medium text-gray-900">
                {getStatusMessage()}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{getCurrentProgress()}%</span>
              </div>
              <Progress value={getCurrentProgress()} className="h-3" />
            </div>

            {/* Generation Steps */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Generation Process</h3>
              <div className="space-y-2">
                {[
                  { step: 'Analyzing topic and generating outline', threshold: 0 },
                  { step: 'Researching relevant sources', threshold: 20 },
                  { step: 'Analyzing and extracting content', threshold: 40 },
                  { step: 'Writing report sections', threshold: 65 },
                  { step: 'Compiling final document', threshold: 85 },
                  { step: 'Generation complete', threshold: 100 }
                ].map((item, index) => {
                  const currentProgress = getCurrentProgress();
                  const isActive = currentProgress >= item.threshold;
                  const isCurrent = currentProgress >= item.threshold && 
                                   (index === 5 || currentProgress < ([20, 40, 65, 85, 100][index] || 100));
                  
                  return (
                    <div key={index} className={`flex items-center space-x-3 p-2 rounded ${
                      isCurrent ? 'bg-blue-50' : ''
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm ${
                        isActive ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {item.step}
                      </span>
                      {isActive && index < 5 && (
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                      {isCurrent && index < 5 && (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time Estimate */}
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 pt-4 border-t">
              <Clock className="w-4 h-4" />
              <span>
                {(isComplete || initialStatus?.projectStatus === 'COMPLETED')
                  ? 'Generation completed' 
                  : progress?.eta 
                    ? `Estimated time remaining: ${Math.ceil(progress.eta / 1000 / 60)} minutes`
                    : 'Estimated time remaining: 2-3 minutes'
                }
              </span>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700 font-medium">Generation Failed</span>
                </div>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button 
                  onClick={() => router.push('/reports')}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Return to Reports
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}