'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Table, BarChart3, Quote, RefreshCw, Plus } from 'lucide-react';

interface ContentSuggestion {
  type: 'similar_section' | 'relevant_table' | 'related_chart' | 'citation_opportunity';
  content: {
    id: string;
    content: string;
    metadata: any;
    similarity: number;
  };
  relevance: number;
  reason: string;
}

interface SimilarContentSuggestionsProps {
  reportId: string;
  sectionId: string;
  currentContent: string;
  onInsertSuggestion: (content: string) => void;
}

const suggestionIcons = {
  similar_section: FileText,
  relevant_table: Table,
  related_chart: BarChart3,
  citation_opportunity: Quote
};

const suggestionColors = {
  similar_section: 'text-blue-600 dark:text-blue-400',
  relevant_table: 'text-green-600 dark:text-green-400',
  related_chart: 'text-purple-600 dark:text-purple-400',
  citation_opportunity: 'text-orange-600 dark:text-orange-400'
};

export function SimilarContentSuggestions({
  reportId,
  sectionId,
  currentContent,
  onInsertSuggestion
}: SimilarContentSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    if (!currentContent.trim() || currentContent.length < 50) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/sections/${reportId}/suggestions/${sectionId}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      fetchSuggestions();
    }, 1000); // Debounce API calls

    return () => clearTimeout(debounceTimeout);
  }, [currentContent, reportId, sectionId]);

  const handleInsertSuggestion = (suggestion: ContentSuggestion) => {
    let insertText = '';
    
    switch (suggestion.type) {
      case 'similar_section':
        insertText = `% Suggested content from similar section\n${suggestion.content.content}`;
        break;
      case 'relevant_table':
        insertText = suggestion.content.content;
        break;
      case 'related_chart':
        insertText = suggestion.content.content;
        break;
      case 'citation_opportunity':
        insertText = `% Relevant citation: ${suggestion.content.metadata.title || 'Reference'}\n`;
        break;
    }
    
    onInsertSuggestion(insertText);
  };

  const formatSuggestionContent = (suggestion: ContentSuggestion) => {
    const content = suggestion.content.content;
    if (content.length > 150) {
      return content.substring(0, 150) + '...';
    }
    return content;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground">Content Suggestions</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchSuggestions}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          AI-powered suggestions based on your content
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Finding suggestions...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-2">Error: {error}</p>
            <Button size="sm" variant="outline" onClick={fetchSuggestions}>
              Try Again
            </Button>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No suggestions yet</p>
            <p className="text-xs text-muted-foreground/70">
              Keep writing to get AI-powered suggestions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const IconComponent = suggestionIcons[suggestion.type];
              const iconColor = suggestionColors[suggestion.type];
              
              return (
                <Card key={index} className="p-3 hover:shadow-md transition-shadow border-border">
                  <div className="flex items-start gap-3">
                    <IconComponent className={`w-4 h-4 mt-0.5 ${iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground capitalize">
                          {suggestion.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(suggestion.relevance * 100)}% match
                        </span>
                      </div>
                      
                      <p className="text-sm text-foreground mb-2">
                        {suggestion.reason}
                      </p>
                      
                      <div className="bg-muted p-2 rounded text-xs text-muted-foreground mb-2 max-h-20 overflow-y-auto">
                        {formatSuggestionContent(suggestion)}
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleInsertSuggestion(suggestion)}
                        className="w-full"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Insert
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
