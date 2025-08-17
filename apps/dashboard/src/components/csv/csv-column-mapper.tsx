'use client';

import React, { useState, useCallback } from 'react';

interface ColumnMapping {
  csvColumn: string;
  targetField: string;
  confidence: number;
  isRequired: boolean;
  dataPreview: string[];
}

interface CSVColumnMapperProps {
  columns: ColumnMapping[];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  targetFields: Array<{
    key: string;
    label: string;
    required: boolean;
    type: 'string' | 'number' | 'email' | 'date';
  }>;
}

export function CSVColumnMapper({
  columns,
  onMappingChange,
  targetFields
}: CSVColumnMapperProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRowExpansion = useCallback((index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  }, [expandedRows]);

  const updateMapping = useCallback((index: number, targetField: string) => {
    const updatedColumns = [...columns];
    const targetFieldInfo = targetFields.find(f => f.key === targetField);
    
    updatedColumns[index] = {
      ...updatedColumns[index],
      targetField,
      isRequired: targetFieldInfo?.required || false
    };
    
    onMappingChange(updatedColumns);
  }, [columns, onMappingChange, targetFields]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Column Mapping
        </h3>
        <div className="text-sm text-gray-500">
          {columns.filter(c => c.confidence >= 75).length} of {columns.length} auto-mapped
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 text-sm font-medium text-gray-700">
          <div className="col-span-3">CSV Column</div>
          <div className="col-span-4">Target Field</div>
          <div className="col-span-2">Confidence</div>
          <div className="col-span-2">Required</div>
          <div className="col-span-1">Preview</div>
        </div>

        {columns.map((column, index) => (
          <div key={index} className="border-t border-gray-200">
            <div className="grid grid-cols-12 gap-4 p-3 items-center">
              <div className="col-span-3">
                <span className="font-medium text-gray-900">
                  {column.csvColumn}
                </span>
              </div>

              <div className="col-span-4">
                <select
                  value={column.targetField}
                  onChange={(e) => updateMapping(index, e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Skip Column --</option>
                  {targetFields.map(field => (
                    <option key={field.key} value={field.key}>
                      {field.label} {field.required ? '*' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(column.confidence)}`}>
                  {getConfidenceLabel(column.confidence)} ({column.confidence}%)
                </span>
              </div>

              <div className="col-span-2">
                {column.isRequired && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-100">
                    Required
                  </span>
                )}
              </div>

              <div className="col-span-1">
                <button
                  onClick={() => toggleRowExpansion(index)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {expandedRows.has(index) ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {expandedRows.has(index) && (
              <div className="px-6 pb-4 bg-gray-50">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Sample data:</span>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    {column.dataPreview.slice(0, 6).map((value, i) => (
                      <div key={i} className="px-2 py-1 bg-white border rounded text-xs">
                        {value || <span className="text-gray-400">empty</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">
              Smart Column Detection Active
            </h4>
            <p className="mt-1 text-sm text-blue-700">
              Columns were automatically mapped using fuzzy matching. Review and adjust mappings as needed.
              High confidence mappings (80%+) are usually accurate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}