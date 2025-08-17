'use client'

import React, { useRef } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import type { PromptVersion } from './prompt-version-history'

interface PromptEditorPanelProps {
  content: string
  onChange: (value: string | undefined) => void
  showDiffViewer: boolean
  diffVersion: PromptVersion | null
  onCloseDiff: () => void
  onFormat: () => void
}

export function PromptEditorPanel({
  content,
  onChange,
  showDiffViewer,
  diffVersion,
  onCloseDiff,
  onFormat
}: PromptEditorPanelProps) {
  const editorRef = useRef<any>(null)

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run()
    }
    onFormat()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h4 className="text-md font-medium text-foreground">
          Prompt Content
          {showDiffViewer && diffVersion && ' - Diff View'}
        </h4>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>{content?.length || 0} characters</span>
          <button
            onClick={handleFormat}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Format
          </button>
          {showDiffViewer && (
            <button
              onClick={onCloseDiff}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              Close Diff
            </button>
          )}
        </div>
      </div>
      
      <div className="border border-border rounded-md overflow-hidden">
        {showDiffViewer && diffVersion ? (
          <DiffEditor
            height="600px"
            language="markdown"
            theme="vs-dark"
            original={diffVersion.content}
            modified={content || ''}
            options={{
              fontSize: 14,
              readOnly: false,
              automaticLayout: true,
              renderSideBySide: true
            }}
          />
        ) : (
          <Editor
            height="600px"
            language="markdown"
            theme="vs-dark"
            value={content || ''}
            onChange={onChange}
            onMount={(editor) => {
              editorRef.current = editor
            }}
            options={{
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              folding: true,
              findMatchesTolerance: 'medium',
              renderLineHighlight: 'line',
              selectOnLineNumbers: true,
              roundedSelection: false,
              readOnly: false,
              cursorStyle: 'line',
              multiCursorModifier: 'ctrlCmd',
              formatOnPaste: true,
              formatOnType: true,
              suggest: {
                showKeywords: true,
                showSnippets: true
              }
            }}
          />
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        <p>Shortcuts: Ctrl+S (save), Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+F (find), Alt+Click (multi-cursor)</p>
        <p>Variables: Use {{variable_name}} syntax for variable substitution</p>
      </div>
    </>
  )
}