'use client'

import React, { useState } from 'react'
import { McpServerTemplate, MCP_SERVER_TEMPLATES, MCP_CATEGORIES } from '@team-dashboard/types'

interface McpMarketplaceProps {
  onInstall: (template: McpServerTemplate) => void
}

export function McpMarketplace({ onInstall }: McpMarketplaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTemplates = MCP_SERVER_TEMPLATES.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesSearch
  })

  const getPopularityColor = (popularity: number) => {
    if (popularity >= 90) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
    if (popularity >= 70) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
    return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">MCP Server Marketplace</h2>
          <p className="text-sm text-muted-foreground">
            Browse and install popular MCP servers to extend your agents' capabilities
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm w-full sm:w-64"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            selectedCategory === 'All'
              ? 'bg-blue-600 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All
        </button>
        {MCP_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Server Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-card border border-border rounded-lg p-6 space-y-4 hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
                <div className="flex items-center space-x-1">
                  {template.verified && (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Verified
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs rounded-full ${getPopularityColor(template.popularity)}`}>
                    {template.popularity}%
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>v{template.version}</span>
                <span>{template.transport.toUpperCase()}</span>
                <span>{template.category}</span>
              </div>
            </div>

            {/* Capabilities */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Capabilities</div>
              <div className="flex flex-wrap gap-1">
                {template.capabilities.map((capability) => (
                  <span 
                    key={capability}
                    className="px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                  >
                    {capability}
                  </span>
                ))}
              </div>
            </div>

            {/* Tools Preview */}
            {template.tools.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">
                  Tools ({template.tools.length})
                </div>
                <div className="text-xs text-muted-foreground">
                  {template.tools.slice(0, 3).join(', ')}
                  {template.tools.length > 3 && ` +${template.tools.length - 3} more`}
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 4).map((tag) => (
                <span 
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {template.tags.length > 4 && (
                <span className="px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">
                  +{template.tags.length - 4}
                </span>
              )}
            </div>

            {/* Required Environment */}
            {template.requiredEnvironment.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">Required Configuration</div>
                <div className="text-xs text-muted-foreground">
                  {template.requiredEnvironment.map(env => env.key).join(', ')}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>by {template.author}</span>
                {template.homepage && (
                  <a 
                    href={template.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Homepage
                  </a>
                )}
              </div>
              
              <button
                onClick={() => onInstall(template)}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Install
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            No MCP servers found matching your criteria.
          </div>
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('All')
            }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}