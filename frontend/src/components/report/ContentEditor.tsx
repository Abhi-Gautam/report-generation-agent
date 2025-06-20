'use client';

import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { loader } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Save, Eye, Code, Type, Table, BarChart3 } from 'lucide-react';
import { SimilarContentSuggestions } from './SimilarContentSuggestions';
import { useTheme } from 'next-themes';
import { setupMonacoLanguages } from '@/lib/monaco-languages';

interface Section {
  id: string;
  title: string;
  type: string;
  content: string;
  metadata?: any;
}

interface ContentEditorProps {
  section: Section | undefined;
  onContentChange: (content: string) => void;
  isUpdating: boolean;
}

export function ContentEditor({ section, onContentChange, isUpdating }: ContentEditorProps) {
  const [editorContent, setEditorContent] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const editorRef = useRef<any>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (section) {
      setEditorContent(section.content);
    }
  }, [section]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
    }
  };

  const handleSave = () => {
    onContentChange(editorContent);
  };

  const insertTemplate = (template: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      if (selection) {
        const range = {
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn
        };
        editor.executeEdits('', [{ range, text: template }]);
      }
    }
  };

  const templates = {
    table: `\\begin{table}[h]
\\centering
\\caption{Your table caption}
\\begin{tabular}{|c|c|c|}
\\hline
Header 1 & Header 2 & Header 3 \\\\
\\hline
Row 1 Col 1 & Row 1 Col 2 & Row 1 Col 3 \\\\
Row 2 Col 1 & Row 2 Col 2 & Row 2 Col 3 \\\\
\\hline
\\end{tabular}
\\label{tab:your-label}
\\end{table}`,
    figure: `\\begin{figure}[h]
\\centering
\\includegraphics[width=0.8\\textwidth]{your-image.png}
\\caption{Your figure caption}
\\label{fig:your-label}
\\end{figure}`,
    equation: `\\begin{equation}
E = mc^2
\\label{eq:your-label}
\\end{equation}`
  };

  if (!section) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select a section to start editing</p>
      </div>
    );
  }


  return (
    <div className="h-full flex min-w-0">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col min-h-0 min-w-[300px]">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background border-border">
          <div>
            <h3 className="font-semibold text-lg">{section.title}</h3>
            <p className="text-sm text-muted-foreground capitalize">{section.type.toLowerCase()} Section</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Templates */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => insertTemplate(templates.table)}
            >
              <Table className="w-4 h-4 mr-1" />
              Table
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => insertTemplate(templates.figure)}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Figure
            </Button>
            
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
            >
              <Save className="w-4 h-4 mr-1" />
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
            
            <Button
              size="sm"
              variant={showSuggestions ? "default" : "outline"}
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={showSuggestions ? "bg-primary text-primary-foreground" : ""}
            >
              <Eye className="w-4 h-4 mr-1" />
              Suggestions
            </Button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language="latex"
            value={editorContent}
            onChange={handleEditorChange}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              
              // Setup Monaco language support for LaTeX and BibTeX
              setupMonacoLanguages(monaco);
              
              // Add keyboard shortcuts for common LaTeX commands
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
                const selection = editor.getSelection();
                if (selection) {
                  const selectedText = editor.getModel()?.getValueInRange(selection) || 'text';
                  editor.executeEdits('', [{ range: selection, text: `\\\\textbf{${selectedText}}` }]);
                }
              });
              
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
                const selection = editor.getSelection();
                if (selection) {
                  const selectedText = editor.getModel()?.getValueInRange(selection) || 'text';
                  editor.executeEdits('', [{ range: selection, text: `\\\\textit{${selectedText}}` }]);
                }
              });
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              // Enhanced LaTeX editing features
              tabSize: 2,
              insertSpaces: true,
              detectIndentation: false,
              trimAutoWhitespace: true,
              formatOnPaste: true,
              formatOnType: true,
              autoIndent: 'full',
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true
              },
              // Better LaTeX-specific settings
              acceptSuggestionOnCommitCharacter: true,
              acceptSuggestionOnEnter: 'on',
              snippetSuggestions: 'top',
              suggest: {
                showKeywords: true,
                showSnippets: true,
                showFunctions: true
              },
              // Find and replace
              find: {
                addExtraSpaceOnTop: false,
                autoFindInSelection: 'multiline'
              }
            }}
            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
          />
        </div>
      </div>

      {/* Suggestions Sidebar */}
      {showSuggestions && (
        <div className="w-80 border-l bg-muted/50 border-border flex-shrink-0">
          <SimilarContentSuggestions
            reportId={section.id.split('_')[0]} // Extract reportId
            sectionId={section.id}
            currentContent={editorContent}
            onInsertSuggestion={(content) => {
              setEditorContent(prev => prev + '\n\n' + content);
            }}
          />
        </div>
      )}
    </div>
  );
}
