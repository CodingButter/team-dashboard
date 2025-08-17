'use client';

import { useState, useCallback, useRef } from 'react';

// Placeholder types - will be replaced with Ryan's type definitions
type AgentConfiguration = {
  id?: string;
  name: string;
  role: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  // ... other fields to be defined by Ryan
};

type ValidationError = {
  row: number;
  column: string;
  value: string;
  error: string;
  severity: 'error' | 'warning';
  suggestion?: string;
};

type ColumnMapping = {
  csvColumn: string;
  targetField: string;
  confidence: number;
  isRequired: boolean;
  dataPreview: string[];
};

type ProcessingStage = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number;
  timeElapsed?: number;
  eta?: number;
};

type ImportResult = {
  successful: number;
  failed: number;
  warnings: number;
  errors: ValidationError[];
  importedIds: string[];
};

type CSVImportState = {
  file: File | null;
  stage: 'upload' | 'parsing' | 'mapping' | 'validation' | 'importing' | 'complete' | 'error';
  progress: number;
  columns: ColumnMapping[];
  errors: ValidationError[];
  result: ImportResult | null;
  processingStages: ProcessingStage[];
};

export function useCSVImport() {
  const [state, setState] = useState<CSVImportState>({
    file: null,
    stage: 'upload',
    progress: 0,
    columns: [],
    errors: [],
    result: null,
    processingStages: [
      { id: 'parse', label: 'Parsing CSV file', status: 'pending' },
      { id: 'detect', label: 'Detecting columns', status: 'pending' },
      { id: 'validate', label: 'Validating data', status: 'pending' },
      { id: 'import', label: 'Importing agents', status: 'pending' }
    ]
  });

  const workerRef = useRef<Worker | null>(null);

  // File selection handler
  const selectFile = useCallback((file: File) => {
    setState(prev => ({
      ...prev,
      file,
      stage: 'parsing',
      progress: 0
    }));
    
    // Start CSV parsing
    parseCSVFile(file);
  }, []);

  // CSV parsing with web worker for large files
  const parseCSVFile = useCallback(async (file: File) => {
    try {
      // Update stage to parsing
      setState(prev => ({
        ...prev,
        processingStages: prev.processingStages.map(stage =>
          stage.id === 'parse' 
            ? { ...stage, status: 'active', progress: 0 }
            : stage
        )
      }));

      // Simulate parsing progress (replace with actual CSV parsing)
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Simulate progress updates
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setState(prev => ({
          ...prev,
          progress: i / 4, // 25% for parsing
          processingStages: prev.processingStages.map(stage =>
            stage.id === 'parse' 
              ? { ...stage, progress: i }
              : stage
          )
        }));
      }

      // Complete parsing, start column detection
      setState(prev => ({
        ...prev,
        stage: 'mapping',
        processingStages: prev.processingStages.map(stage =>
          stage.id === 'parse' 
            ? { ...stage, status: 'completed', progress: 100 }
            : stage.id === 'detect'
            ? { ...stage, status: 'active', progress: 0 }
            : stage
        )
      }));

      // Perform intelligent column mapping
      const mappings = await performColumnMapping(headers, lines.slice(1, 6));
      
      setState(prev => ({
        ...prev,
        columns: mappings,
        progress: 50,
        processingStages: prev.processingStages.map(stage =>
          stage.id === 'detect' 
            ? { ...stage, status: 'completed', progress: 100 }
            : stage.id === 'validate'
            ? { ...stage, status: 'active', progress: 0 }
            : stage
        )
      }));

      // Perform validation
      const validationErrors = await validateData(lines.slice(1), mappings);
      
      setState(prev => ({
        ...prev,
        stage: 'validation',
        errors: validationErrors,
        progress: 75,
        processingStages: prev.processingStages.map(stage =>
          stage.id === 'validate' 
            ? { ...stage, status: 'completed', progress: 100 }
            : stage
        )
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        stage: 'error',
        processingStages: prev.processingStages.map(stage =>
          stage.status === 'active' 
            ? { ...stage, status: 'error' }
            : stage
        )
      }));
    }
  }, []);

  // Intelligent column mapping with fuzzy matching
  const performColumnMapping = useCallback(async (headers: string[], sampleRows: string[]): Promise<ColumnMapping[]> => {
    // This is where Ryan's types will be integrated
    const targetFields = [
      { key: 'name', label: 'Agent Name', required: true, type: 'string' as const },
      { key: 'role', label: 'Role/Specialization', required: true, type: 'string' as const },
      { key: 'systemPrompt', label: 'System Prompt', required: false, type: 'string' as const },
      { key: 'model', label: 'AI Model', required: false, type: 'string' as const },
      { key: 'temperature', label: 'Temperature', required: false, type: 'number' as const }
    ];

    // Fuzzy matching algorithm (from memento - 92% accuracy)
    const mappings: ColumnMapping[] = headers.map(header => {
      const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '');
      let bestMatch = { field: '', confidence: 0 };

      // Pattern matching for each target field
      for (const field of targetFields) {
        const patterns = getFieldPatterns(field.key);
        for (const pattern of patterns) {
          const confidence = calculateSimilarity(normalizedHeader, pattern);
          if (confidence > bestMatch.confidence) {
            bestMatch = { field: field.key, confidence };
          }
        }
      }

      // Get sample data for preview
      const dataPreview = sampleRows.map(row => {
        const values = row.split(',');
        const index = headers.indexOf(header);
        return values[index]?.trim().replace(/"/g, '') || '';
      });

      const targetField = targetFields.find(f => f.key === bestMatch.field);

      return {
        csvColumn: header,
        targetField: bestMatch.confidence >= 60 ? bestMatch.field : '',
        confidence: Math.round(bestMatch.confidence),
        isRequired: targetField?.required || false,
        dataPreview
      };
    });

    return mappings;
  }, []);

  // Field pattern definitions for fuzzy matching
  const getFieldPatterns = useCallback((fieldKey: string): string[] => {
    const patterns: Record<string, string[]> = {
      name: ['name', 'agentname', 'fullname', 'displayname', 'title'],
      role: ['role', 'specialization', 'type', 'category', 'expertise', 'specialty'],
      systemPrompt: ['systemprompt', 'prompt', 'instructions', 'behavior', 'persona'],
      model: ['model', 'aimodel', 'llm', 'engine', 'gpt'],
      temperature: ['temperature', 'temp', 'randomness', 'creativity']
    };
    return patterns[fieldKey] || [];
  }, []);

  // String similarity calculation (Levenshtein distance)
  const calculateSimilarity = useCallback((str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 100;
    
    const distance = levenshteinDistance(longer, shorter);
    return Math.round(((longer.length - distance) / longer.length) * 100);
  }, []);

  const levenshteinDistance = useCallback((str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }, []);

  // Data validation
  const validateData = useCallback(async (rows: string[], mappings: ColumnMapping[]): Promise<ValidationError[]> => {
    const errors: ValidationError[] = [];
    const requiredFields = mappings.filter(m => m.isRequired && m.targetField);

    rows.forEach((row, index) => {
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
      
      // Check required fields
      requiredFields.forEach(mapping => {
        const columnIndex = mappings.findIndex(m => m.csvColumn === mapping.csvColumn);
        const value = values[columnIndex];
        
        if (!value || value.trim() === '') {
          errors.push({
            row: index + 2, // +2 for header and 0-based index
            column: mapping.csvColumn,
            value: value || '',
            error: 'Required field is empty',
            severity: 'error',
            suggestion: 'Provide a value for this required field'
          });
        }
      });

      // Type validation (placeholder - will use Ryan's types)
      mappings.forEach(mapping => {
        if (mapping.targetField === 'temperature') {
          const columnIndex = mappings.findIndex(m => m.csvColumn === mapping.csvColumn);
          const value = values[columnIndex];
          
          if (value && isNaN(Number(value))) {
            errors.push({
              row: index + 2,
              column: mapping.csvColumn,
              value,
              error: 'Temperature must be a number',
              severity: 'error',
              suggestion: '0.7'
            });
          }
        }
      });
    });

    return errors;
  }, []);

  // Update column mapping
  const updateColumnMapping = useCallback((mappings: ColumnMapping[]) => {
    setState(prev => ({
      ...prev,
      columns: mappings
    }));
  }, []);

  // Start import process
  const startImport = useCallback(async () => {
    if (!state.file || state.columns.length === 0) return;

    setState(prev => ({
      ...prev,
      stage: 'importing',
      processingStages: prev.processingStages.map(stage =>
        stage.id === 'import' 
          ? { ...stage, status: 'active', progress: 0 }
          : stage
      )
    }));

    try {
      // This will integrate with Ryan's agent creation API
      const text = await state.file.text();
      const lines = text.split('\n').slice(1); // Skip header
      
      const importedIds: string[] = [];
      let successful = 0;
      let failed = 0;

      // Simulate import progress
      for (let i = 0; i < lines.length; i++) {
        const progress = Math.round((i / lines.length) * 100);
        
        setState(prev => ({
          ...prev,
          progress: 75 + (progress / 4), // 75% + 25% for import
          processingStages: prev.processingStages.map(stage =>
            stage.id === 'import' 
              ? { ...stage, progress }
              : stage
          )
        }));

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Mock import result
        const row = lines[i];
        if (row.trim()) {
          successful++;
          importedIds.push(`agent-${i + 1}`);
        }
      }

      const result: ImportResult = {
        successful,
        failed,
        warnings: state.errors.filter(e => e.severity === 'warning').length,
        errors: state.errors.filter(e => e.severity === 'error'),
        importedIds
      };

      setState(prev => ({
        ...prev,
        stage: 'complete',
        progress: 100,
        result,
        processingStages: prev.processingStages.map(stage =>
          stage.id === 'import' 
            ? { ...stage, status: 'completed', progress: 100 }
            : stage
        )
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        stage: 'error',
        processingStages: prev.processingStages.map(stage =>
          stage.id === 'import' 
            ? { ...stage, status: 'error' }
            : stage
        )
      }));
    }
  }, [state.file, state.columns, state.errors]);

  // Reset import state
  const resetImport = useCallback(() => {
    setState({
      file: null,
      stage: 'upload',
      progress: 0,
      columns: [],
      errors: [],
      result: null,
      processingStages: [
        { id: 'parse', label: 'Parsing CSV file', status: 'pending' },
        { id: 'detect', label: 'Detecting columns', status: 'pending' },
        { id: 'validate', label: 'Validating data', status: 'pending' },
        { id: 'import', label: 'Importing agents', status: 'pending' }
      ]
    });
  }, []);

  return {
    state,
    selectFile,
    updateColumnMapping,
    startImport,
    resetImport
  };
}