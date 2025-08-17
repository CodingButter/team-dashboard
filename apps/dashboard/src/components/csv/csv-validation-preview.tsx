'use client';

import React, { useState } from 'react';

interface ValidationError {
  row: number;
  column: string;
  value: string;
  error: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  duplicateRows: number;
  missingRequiredFields: number;
}

interface CSVValidationPreviewProps {
  errors: ValidationError[];
  summary: ValidationSummary;
  onFixError?: (error: ValidationError, fixedValue: string) => void;
  onSkipRow?: (rowNumber: number) => void;
}

export function CSVValidationPreview({
  errors,
  summary,
  onFixError,
  onSkipRow
}: CSVValidationPreviewProps) {
  const [selectedTab, setSelectedTab] = useState<'summary' | 'errors' | 'warnings'>('summary');
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const errorsByType = errors.filter(e => e.severity === 'error');
  const warningsByType = errors.filter(e => e.severity === 'warning');

  const toggleErrorExpansion = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const getProgressPercentage = () => {
    return Math.round((summary.validRows / summary.totalRows) * 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Data Validation Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{summary.totalRows}</div>
            <div className="text-sm text-gray-500">Total Rows</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.validRows}</div>
            <div className="text-sm text-gray-500">Valid Rows</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary.errorRows}</div>
            <div className="text-sm text-gray-500">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.warningRows}</div>
            <div className="text-sm text-gray-500">Warnings</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Data Quality</span>
            <span className="text-sm text-gray-500">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getProgressColor()}`} 
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Quality Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.duplicateRows > 0 && (
            <div className="flex items-center text-sm text-yellow-600">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {summary.duplicateRows} duplicate rows detected
            </div>
          )}
          
          {summary.missingRequiredFields > 0 && (
            <div className="flex items-center text-sm text-red-600">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {summary.missingRequiredFields} rows missing required fields
            </div>
          )}
        </div>
      </div>

      {/* Tabs for Error Details */}
      <div className="bg-white border rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setSelectedTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setSelectedTab('errors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'errors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Errors ({errorsByType.length})
            </button>
            <button
              onClick={() => setSelectedTab('warnings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'warnings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Warnings ({warningsByType.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'summary' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Your CSV file has been validated. {getProgressPercentage()}% of rows are ready for import.
              </p>
              
              {errorsByType.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800">Action Required</h4>
                  <p className="text-sm text-red-700 mt-1">
                    {errorsByType.length} rows have errors that must be fixed before import.
                  </p>
                </div>
              )}
              
              {warningsByType.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800">Review Recommended</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {warningsByType.length} rows have warnings that should be reviewed.
                  </p>
                </div>
              )}
            </div>
          )}

          {(selectedTab === 'errors' || selectedTab === 'warnings') && (
            <div className="space-y-3">
              {(selectedTab === 'errors' ? errorsByType : warningsByType).map((error, index) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <div className="p-4 cursor-pointer" onClick={() => toggleErrorExpansion(index)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          error.severity === 'error' 
                            ? 'text-red-800 bg-red-100' 
                            : 'text-yellow-800 bg-yellow-100'
                        }`}>
                          Row {error.row}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {error.column}: {error.error}
                        </span>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transform transition-transform ${
                          expandedErrors.has(index) ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {expandedErrors.has(index) && (
                    <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                      <div className="pt-3 space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Current Value:</span>
                          <div className="mt-1 px-3 py-2 bg-white border rounded text-sm font-mono">
                            {error.value || <span className="text-gray-400">empty</span>}
                          </div>
                        </div>
                        
                        {error.suggestion && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Suggested Fix:</span>
                            <div className="mt-1 px-3 py-2 bg-green-50 border border-green-200 rounded text-sm">
                              {error.suggestion}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          {onFixError && error.suggestion && (
                            <button
                              onClick={() => onFixError(error, error.suggestion!)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Apply Fix
                            </button>
                          )}
                          
                          {onSkipRow && (
                            <button
                              onClick={() => onSkipRow(error.row)}
                              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                            >
                              Skip Row
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {(selectedTab === 'errors' ? errorsByType : warningsByType).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No {selectedTab} found. Your data looks good!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}