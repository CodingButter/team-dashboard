'use client'

import React, { useState, useCallback } from 'react'
import type { PromptTemplate, PromptCategory } from '@team-dashboard/types'

interface TemplateLibraryProps {
  templates: PromptTemplate[]
  onSelectTemplate: (template: PromptTemplate) => void
  onCreateTemplate: (template: Partial<PromptTemplate>) => void
  onUpdateTemplate: (id: string, template: Partial<PromptTemplate>) => void
  onDeleteTemplate: (id: string) => void
  onImportTemplates: (templates: PromptTemplate[]) => void
  onExportTemplates: (templateIds: string[]) => void
}

interface TemplateFilters {
  category: PromptCategory | 'all'
  search: string
  tags: string[]
  rating: number
}

const CATEGORIES: { value: PromptCategory | 'all', label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'system', label: 'System' },
  { value: 'coding', label: 'Coding' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'devops', label: 'DevOps' },
  { value: 'testing', label: 'Testing' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'security', label: 'Security' },
  { value: 'custom', label: 'Custom' }
]

export function TemplateLibrary({
  templates,
  onSelectTemplate,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onImportTemplates,
  onExportTemplates
}: TemplateLibraryProps) {
  const [filters, setFilters] = useState<TemplateFilters>({
    category: 'all',
    search: '',
    tags: [],
    rating: 0
  })
  
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Filter templates based on current filters
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = filters.category === 'all' || template.category === filters.category
    const matchesSearch = !filters.search || 
      template.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      template.description.toLowerCase().includes(filters.search.toLowerCase())
    const matchesTags = filters.tags.length === 0 || 
      filters.tags.some(tag => template.tags.includes(tag))
    const matchesRating = template.rating >= filters.rating
    
    return matchesCategory && matchesSearch && matchesTags && matchesRating
  })

  // Get all unique tags from templates
  const allTags = [...new Set(templates.flatMap(t => t.tags))].sort()

  const handleSelectTemplate = useCallback((templateId: string) => {
    setSelectedTemplates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(templateId)) {
        newSet.delete(templateId)
      } else {
        newSet.add(templateId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedTemplates.size === filteredTemplates.length) {
      setSelectedTemplates(new Set())
    } else {
      setSelectedTemplates(new Set(filteredTemplates.map(t => t.id)))
    }
  }, [selectedTemplates.size, filteredTemplates])

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string)
          const templates = Array.isArray(imported) ? imported : [imported]
          onImportTemplates(templates)
        } catch (error) {
          console.error('Error importing templates:', error)
          alert('Error importing templates. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }
  }, [onImportTemplates])

  const handleExport = useCallback(() => {
    if (selectedTemplates.size === 0) {
      alert('Please select templates to export')
      return
    }
    
    const templatesToExport = templates.filter(t => selectedTemplates.has(t.id))
    onExportTemplates(Array.from(selectedTemplates))
    
    // Also trigger download
    const dataStr = JSON.stringify(templatesToExport, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `prompt-templates-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [selectedTemplates, templates, onExportTemplates])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-400'}`}
      >
        ★
      </span>
    ))
  }

  const TemplateCard = ({ template }: { template: PromptTemplate }) => (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedTemplates.has(template.id)}
            onChange={() => handleSelectTemplate(template.id)}
            className="rounded border-border"
          />
          <h4 className="font-medium text-foreground">{template.name}</h4>
        </div>
        <div className="flex space-x-1">
          {renderStars(Math.round(template.rating))}
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {template.description}
      </p>
      
      <div className="flex flex-wrap gap-1 mb-3">
        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
          {template.category}
        </span>
        {template.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
            +{template.tags.length - 3}
          </span>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span>{template.usageCount} uses</span>
        <span>{template.variables.length} variables</span>
        <span>{template.isPublic ? 'Public' : 'Private'}</span>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => onSelectTemplate(template)}
          className="flex-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Use Template
        </button>
        <button
          onClick={() => setEditingTemplate(template)}
          className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDeleteTemplate(template.id)}
          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )

  const TemplateListItem = ({ template }: { template: PromptTemplate }) => (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center space-x-4">
      <input
        type="checkbox"
        checked={selectedTemplates.has(template.id)}
        onChange={() => handleSelectTemplate(template.id)}
        className="rounded border-border"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <h4 className="font-medium text-foreground truncate">{template.name}</h4>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            {template.category}
          </span>
          <div className="flex space-x-1">
            {renderStars(Math.round(template.rating))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>
        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
          <span>{template.usageCount} uses</span>
          <span>{template.variables.length} variables</span>
          <span>{template.isPublic ? 'Public' : 'Private'}</span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 max-w-xs">
        {template.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
            {tag}
          </span>
        ))}
      </div>
      
      <div className="flex space-x-2 flex-shrink-0">
        <button
          onClick={() => onSelectTemplate(template)}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Use
        </button>
        <button
          onClick={() => setEditingTemplate(template)}
          className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDeleteTemplate(template.id)}
          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Template Library</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            Create Template
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as any }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search templates..."
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Min Rating</label>
            <select
              value={filters.rating}
              onChange={(e) => setFilters(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value={0}>Any Rating</option>
              <option value={1}>1+ Stars</option>
              <option value={2}>2+ Stars</option>
              <option value={3}>3+ Stars</option>
              <option value={4}>4+ Stars</option>
              <option value={5}>5 Stars</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tags</label>
            <select
              multiple
              value={filters.tags}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                tags: Array.from(e.target.selectedOptions, option => option.value)
              }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              size={1}
            >
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
        
        {filters.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.tags.map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {tag}
                <button
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    tags: prev.tags.filter(t => t !== tag)
                  }))}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {selectedTemplates.size === filteredTemplates.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-sm text-muted-foreground">
            {selectedTemplates.size} of {filteredTemplates.length} selected
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="import-templates"
          />
          <label
            htmlFor="import-templates"
            className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors cursor-pointer"
          >
            Import
          </label>
          <button
            onClick={handleExport}
            disabled={selectedTemplates.size === 0}
            className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white rounded transition-colors"
          >
            Export Selected
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredTemplates.length} of {templates.length} templates
      </div>

      {/* Template Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTemplates.map(template => (
            <TemplateListItem key={template.id} template={template} />
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates found matching your criteria.</p>
          <button
            onClick={() => setFilters({ category: 'all', search: '', tags: [], rating: 0 })}
            className="mt-2 text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}