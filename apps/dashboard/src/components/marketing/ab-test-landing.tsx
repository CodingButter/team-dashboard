'use client'

import React, { useEffect } from 'react'
import { LandingHero } from './landing-hero'
import { EnterpriseHeroVariant, StartupHeroVariant, useABTestVariant, useABTestAnalytics } from './ab-test-variants'

export function ABTestLanding() {
  const variant = useABTestVariant()
  const { trackPageView, trackConversion, trackUserInteraction } = useABTestAnalytics()

  useEffect(() => {
    // Track page view when component mounts
    trackPageView(variant)
  }, [variant, trackPageView])

  const handleCTAClick = (ctaType: 'primary' | 'secondary') => {
    trackConversion(`cta_${ctaType}_click`, variant, 1)
    trackUserInteraction('click', variant, `${ctaType}_cta_button`)
    
    // In production, this would trigger actual conversion actions:
    if (ctaType === 'primary') {
      // Navigate to trial signup
      console.log('Navigating to trial signup...')
    } else {
      // Show demo video
      console.log('Opening demo video...')
    }
  }

  const renderHeroVariant = () => {
    switch (variant) {
      case 'enterprise':
        return <EnterpriseHeroVariant />
      case 'startup':
        return <StartupHeroVariant />
      default:
        return <LandingHero />
    }
  }

  return (
    <div className="ab-test-landing" data-variant={variant}>
      {/* Add variant-specific tracking attributes */}
      <div 
        onMouseEnter={() => trackUserInteraction('hover', variant, 'hero_section')}
        onScroll={() => trackUserInteraction('scroll', variant, 'hero_section')}
      >
        {renderHeroVariant()}
      </div>
      
      {/* A/B Test Debug Panel (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <ABTestDebugPanel variant={variant} />
      )}
    </div>
  )
}

// Debug panel for development
function ABTestDebugPanel({ variant }: { variant: string }) {
  const { getAnalyticsReport } = useABTestAnalytics()
  const [showPanel, setShowPanel] = React.useState(false)
  const [report, setReport] = React.useState<any[]>([])

  const refreshReport = () => {
    setReport(getAnalyticsReport())
  }

  useEffect(() => {
    refreshReport()
    const interval = setInterval(refreshReport, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 left-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium"
      >
        A/B Test Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 max-w-md">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-900">A/B Test Debug</h3>
        <button
          onClick={() => setShowPanel(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div><strong>Current Variant:</strong> {variant}</div>
        <div className="border-t pt-2">
          <strong>Performance Report:</strong>
          {report.map((r, i) => (
            <div key={i} className="ml-2 mt-1">
              <div className="font-medium text-gray-700">{r.variant}:</div>
              <div className="ml-2 text-xs text-gray-600">
                Views: {r.pageViews} | Conversions: {r.conversions} | 
                Rate: {r.conversionRate.toFixed(2)}% | Interactions: {r.interactions}
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={refreshReport}
          className="w-full mt-3 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
        >
          Refresh Report
        </button>
        
        <button
          onClick={() => {
            localStorage.removeItem('ab-test-conversions')
            localStorage.removeItem('ab-test-pageviews')
            localStorage.removeItem('ab-test-interactions')
            localStorage.removeItem('ab-test-variant')
            window.location.reload()
          }}
          className="w-full mt-1 bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
        >
          Reset A/B Test Data
        </button>
      </div>
    </div>
  )
}