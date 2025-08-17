'use client';

import React from 'react';

interface ProcessingStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number;
  timeElapsed?: number;
  eta?: number;
}

interface CSVProgressIndicatorProps {
  stages: ProcessingStage[];
  currentStage: string;
  overallProgress: number;
  totalRows?: number;
  processedRows?: number;
  processingSpeed?: number; // rows per second
}

export function CSVProgressIndicator({
  stages,
  currentStage,
  overallProgress,
  totalRows,
  processedRows,
  processingSpeed
}: CSVProgressIndicatorProps) {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (rowsPerSecond: number): string => {
    if (rowsPerSecond >= 1000) {
      return `${(rowsPerSecond / 1000).toFixed(1)}k rows/s`;
    }
    return `${Math.round(rowsPerSecond)} rows/s`;
  };

  const getStageIcon = (status: ProcessingStage['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'active':
        return (
          <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
        );
    }
  };

  const activeStage = stages.find(s => s.id === currentStage);

  return (
    <div className="bg-white border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Processing CSV File
        </h3>
        {totalRows && processedRows !== undefined && (
          <div className="text-sm text-gray-500">
            {processedRows.toLocaleString()} of {totalRows.toLocaleString()} rows
          </div>
        )}
      </div>

      {/* Overall Progress */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-500">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Processing Stages */}
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {getStageIcon(stage.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${
                  stage.status === 'active' ? 'text-blue-600' :
                  stage.status === 'completed' ? 'text-green-600' :
                  stage.status === 'error' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {stage.label}
                </p>
                
                {stage.status === 'active' && stage.progress !== undefined && (
                  <span className="text-xs text-gray-500">
                    {Math.round(stage.progress)}%
                  </span>
                )}
              </div>
              
              {stage.status === 'active' && stage.progress !== undefined && (
                <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-600 h-1 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${stage.progress}%` }}
                  />
                </div>
              )}
            </div>
            
            {stage.status === 'active' && stage.timeElapsed !== undefined && (
              <div className="text-xs text-gray-500">
                {formatTime(stage.timeElapsed)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      {activeStage && (processingSpeed || activeStage.eta) && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {processingSpeed && (
              <div>
                <span className="text-gray-500">Processing Speed</span>
                <div className="font-medium text-gray-900">
                  {formatSpeed(processingSpeed)}
                </div>
              </div>
            )}
            
            {activeStage.eta && (
              <div>
                <span className="text-gray-500">Time Remaining</span>
                <div className="font-medium text-gray-900">
                  {formatTime(activeStage.eta)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Activity */}
      {activeStage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                Currently {activeStage.label.toLowerCase()}...
              </p>
              {totalRows && processedRows !== undefined && processingSpeed && (
                <p className="text-xs text-blue-600 mt-1">
                  Processing large datasets efficiently with streaming algorithms
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}