'use client';

import React from 'react';
import { CSVFileDropZone } from './csv-file-drop';
import { CSVColumnMapper } from './csv-column-mapper';
import { CSVValidationPreview } from './csv-validation-preview';
import { CSVProgressIndicator } from './csv-progress-indicator';
import { useCSVImport } from '../../hooks/use-csv-import';

export function CSVImportWizard() {
  const {
    state,
    selectFile,
    updateColumnMapping,
    startImport,
    resetImport
  } = useCSVImport();

  // Target fields for agent configuration (will be replaced with Ryan's types)
  const targetFields = [
    { key: 'name', label: 'Agent Name', required: true, type: 'string' as const },
    { key: 'role', label: 'Role/Specialization', required: true, type: 'string' as const },
    { key: 'systemPrompt', label: 'System Prompt', required: false, type: 'string' as const },
    { key: 'model', label: 'AI Model', required: false, type: 'string' as const },
    { key: 'temperature', label: 'Temperature', required: false, type: 'number' as const }
  ];

  const getValidationSummary = () => {
    const totalRows = state.file ? 100 : 0; // Mock - will be actual row count
    const errorRows = state.errors.filter(e => e.severity === 'error').length;
    const warningRows = state.errors.filter(e => e.severity === 'warning').length;
    
    return {
      totalRows,
      validRows: totalRows - errorRows,
      errorRows,
      warningRows,
      duplicateRows: 0, // Will be calculated during validation
      missingRequiredFields: errorRows
    };
  };

  const canProceedToImport = () => {
    return state.columns.length > 0 && 
           state.columns.some(c => c.targetField) &&
           state.errors.filter(e => e.severity === 'error').length === 0;
  };

  const renderStageContent = () => {
    switch (state.stage) {
      case 'upload':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Import Agents from CSV
              </h2>
              <p className="text-gray-600 mb-8">
                Upload a CSV file to bulk import agent configurations
              </p>
            </div>
            
            <CSVFileDropZone onFileSelect={selectFile} maxFileSize={25} />
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Expected CSV Format</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• <strong>Required columns:</strong> Agent Name, Role/Specialization</p>
                <p>• <strong>Optional columns:</strong> System Prompt, AI Model, Temperature</p>
                <p>• <strong>File size limit:</strong> 25MB (supports large team datasets)</p>
                <p>• <strong>Performance:</strong> Optimized for 10,000+ rows with streaming processing</p>
              </div>
            </div>
          </div>
        );

      case 'parsing':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Processing Your CSV File
              </h2>
              <p className="text-gray-600">
                Parsing file and detecting columns with intelligent matching...
              </p>
            </div>
            
            <CSVProgressIndicator
              stages={state.processingStages}
              currentStage="parse"
              overallProgress={state.progress}
              totalRows={1000} // Mock data
              processedRows={Math.round(state.progress * 10)}
              processingSpeed={850} // Mock processing speed
            />
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Review Column Mapping
              </h2>
              <p className="text-gray-600">
                Verify the automatic column detection and adjust as needed
              </p>
            </div>

            <CSVColumnMapper
              columns={state.columns}
              onMappingChange={updateColumnMapping}
              targetFields={targetFields}
            />

            <div className="flex justify-between">
              <button
                onClick={resetImport}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Start Over
              </button>
              
              <button
                onClick={() => startImport()}
                disabled={!canProceedToImport()}
                className={`px-6 py-2 rounded-lg font-medium ${
                  canProceedToImport()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue to Validation
              </button>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Data Validation Results
              </h2>
              <p className="text-gray-600">
                Review data quality and fix any issues before import
              </p>
            </div>

            <CSVValidationPreview
              errors={state.errors}
              summary={getValidationSummary()}
              onFixError={(error, fixedValue) => {
                // Handle error fixing
                console.log('Fix error:', error, 'with:', fixedValue);
              }}
              onSkipRow={(rowNumber) => {
                // Handle row skipping
                console.log('Skip row:', rowNumber);
              }}
            />

            <div className="flex justify-between">
              <button
                onClick={() => window.location.reload()} // Go back to mapping
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Back to Mapping
              </button>
              
              <button
                onClick={startImport}
                disabled={!canProceedToImport()}
                className={`px-6 py-2 rounded-lg font-medium ${
                  canProceedToImport()
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Start Import ({getValidationSummary().validRows} agents)
              </button>
            </div>
          </div>
        );

      case 'importing':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Importing Agents
              </h2>
              <p className="text-gray-600">
                Creating agent configurations and setting up the team...
              </p>
            </div>
            
            <CSVProgressIndicator
              stages={state.processingStages}
              currentStage="import"
              overallProgress={state.progress}
              totalRows={getValidationSummary().validRows}
              processedRows={Math.round(state.progress * getValidationSummary().validRows / 100)}
              processingSpeed={45} // Mock import speed
            />
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 text-green-600 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Import Complete!
              </h2>
              <p className="text-gray-600">
                Successfully imported {state.result?.successful} agents to your team
              </p>
            </div>

            {state.result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {state.result.successful}
                    </div>
                    <div className="text-sm text-green-700">Imported</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {state.result.warnings}
                    </div>
                    <div className="text-sm text-yellow-700">Warnings</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {state.result.failed}
                    </div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.location.href = '/agents'}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Imported Agents
              </button>
              
              <button
                onClick={resetImport}
                className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Import More
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 text-red-600 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Import Failed
              </h2>
              <p className="text-gray-600">
                There was an error processing your CSV file
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-700">
                <p>Common issues:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Invalid CSV format or encoding</li>
                  <li>File too large or corrupted</li>
                  <li>Missing required columns</li>
                  <li>Network connection issues</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={resetImport}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {renderStageContent()}
    </div>
  );
}