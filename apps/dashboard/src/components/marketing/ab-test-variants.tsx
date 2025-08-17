'use client'

import React from 'react'

// Enterprise-focused variant (B)
export function EnterpriseHeroVariant() {
  return (
    <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20">
      <div className="container mx-auto px-6 text-center">
        {/* Trust Badge - Enterprise focused */}
        <div className="inline-flex items-center bg-blue-600/20 border border-blue-600/30 rounded-full px-4 py-2 mb-6">
          <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
          <span className="text-blue-300 text-sm font-medium">Trusted by Fortune 500 Engineering Teams</span>
        </div>

        {/* Main Headline - Enterprise focused */}
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Enterprise-Grade <span className="text-blue-400">Autonomous Coding</span>
          <br />
          <span className="text-slate-300">Cut AI Costs 40%, Scale Securely</span>
        </h1>

        {/* Value Proposition - Enterprise focused */}
        <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-4xl mx-auto leading-relaxed">
          Deploy <strong className="text-white">SOC 2 compliant</strong> AI coding agents with 
          enterprise security, audit trails, and RBAC. <strong className="text-blue-400">Save $250k+ annually</strong> 
          while maintaining compliance and governance standards.
        </p>

        {/* Key Benefits - Enterprise focused */}
        <div className="grid md:grid-cols-3 gap-8 mb-10 max-w-5xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-blue-400 text-3xl font-bold mb-2">$250k+</div>
            <div className="text-slate-300">Annual Savings (10 Developers)</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-blue-400 text-3xl font-bold mb-2">SOC 2</div>
            <div className="text-slate-300">Compliant & Audit Ready</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-blue-400 text-3xl font-bold mb-2">99.9%</div>
            <div className="text-slate-300">Enterprise SLA Uptime</div>
          </div>
        </div>

        {/* CTA Buttons - Enterprise focused */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg">
            Schedule Enterprise Demo
          </button>
          <button className="border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
            Download Security Whitepaper
          </button>
        </div>

        {/* Social Proof - Enterprise focused */}
        <div className="text-slate-400 text-sm">
          <p className="mb-2">Trusted by 100+ Fortune 500 engineering teams</p>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="bg-slate-700 px-4 py-2 rounded">Microsoft</div>
            <div className="bg-slate-700 px-4 py-2 rounded">Goldman Sachs</div>
            <div className="bg-slate-700 px-4 py-2 rounded">JPMorgan</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Startup-focused variant (C)
export function StartupHeroVariant() {
  return (
    <section className="bg-gradient-to-b from-purple-900 to-pink-800 text-white py-20">
      <div className="container mx-auto px-6 text-center">
        {/* Trust Badge - Startup focused */}
        <div className="inline-flex items-center bg-pink-600/20 border border-pink-600/30 rounded-full px-4 py-2 mb-6">
          <div className="w-2 h-2 bg-pink-400 rounded-full mr-2"></div>
          <span className="text-pink-300 text-sm font-medium">Loved by 500+ Fast-Growing Startups</span>
        </div>

        {/* Main Headline - Startup focused */}
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Code 10x Faster with <span className="text-pink-400">AI Agents</span>
          <br />
          <span className="text-slate-300">Ship Features, Not Bugs</span>
        </h1>

        {/* Value Proposition - Startup focused */}
        <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-4xl mx-auto leading-relaxed">
          Deploy AI coding agents that work <strong className="text-white">24/7 on your codebase</strong>. 
          Build features 10x faster, cut development costs by 40%, and <strong className="text-pink-400">get to market in weeks, not months</strong>.
        </p>

        {/* Key Benefits - Startup focused */}
        <div className="grid md:grid-cols-3 gap-8 mb-10 max-w-5xl mx-auto">
          <div className="bg-purple-800/50 border border-purple-700 rounded-lg p-6">
            <div className="text-pink-400 text-3xl font-bold mb-2">10x</div>
            <div className="text-slate-300">Faster Development</div>
          </div>
          <div className="bg-purple-800/50 border border-purple-700 rounded-lg p-6">
            <div className="text-pink-400 text-3xl font-bold mb-2">$49</div>
            <div className="text-slate-300">Per Developer/Month</div>
          </div>
          <div className="bg-purple-800/50 border border-purple-700 rounded-lg p-6">
            <div className="text-pink-400 text-3xl font-bold mb-2">0</div>
            <div className="text-slate-300">Setup Time Required</div>
          </div>
        </div>

        {/* CTA Buttons - Startup focused */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg">
            Start Building in 5 Minutes
          </button>
          <button className="border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
            See Demo App
          </button>
        </div>

        {/* Social Proof - Startup focused */}
        <div className="text-slate-400 text-sm">
          <p className="mb-2">Join 500+ startups scaling with AI</p>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="bg-purple-700 px-4 py-2 rounded">Y Combinator</div>
            <div className="bg-purple-700 px-4 py-2 rounded">TechStars</div>
            <div className="bg-purple-700 px-4 py-2 rounded">500 Startups</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// A/B Test Configuration Hook
export function useABTestVariant() {
  const [variant, setVariant] = React.useState<string>('control')

  React.useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const getVariant = () => {
        const variants = ['control', 'enterprise', 'startup']
        const storedVariant = localStorage.getItem('ab-test-variant')
        
        if (storedVariant && variants.includes(storedVariant)) {
          return storedVariant
        }
        
        const randomVariant = variants[Math.floor(Math.random() * variants.length)]
        localStorage.setItem('ab-test-variant', randomVariant)
        return randomVariant
      }
      
      setVariant(getVariant())
    }
  }, [])

  return variant
}

// A/B Test Analytics Hook
export function useABTestAnalytics() {
  const trackConversion = (event: string, variant: string, value?: number) => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    const conversionData = {
      event,
      variant,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      value: value || 1
    }
    
    // Track conversion events for A/B testing
    console.log(`A/B Test Conversion:`, conversionData)
    
    // Store in localStorage for development testing
    const conversions = JSON.parse(localStorage.getItem('ab-test-conversions') || '[]')
    conversions.push(conversionData)
    localStorage.setItem('ab-test-conversions', JSON.stringify(conversions))
    
    // In production, send to analytics service:
    // analytics.track('conversion', conversionData)
  }

  const trackPageView = (variant: string) => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    const pageViewData = {
      variant,
      timestamp: Date.now(),
      url: window.location.href,
      referrer: document.referrer,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      sessionId: getSessionId()
    }
    
    console.log(`A/B Test Page View:`, pageViewData)
    
    // Store in localStorage for development testing
    const pageViews = JSON.parse(localStorage.getItem('ab-test-pageviews') || '[]')
    pageViews.push(pageViewData)
    localStorage.setItem('ab-test-pageviews', JSON.stringify(pageViews))
    
    // In production:
    // analytics.track('pageview', pageViewData)
  }

  const trackUserInteraction = (interaction: string, variant: string, element?: string) => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    const interactionData = {
      interaction,
      variant,
      element,
      timestamp: Date.now(),
      sessionId: getSessionId()
    }
    
    console.log(`A/B Test Interaction:`, interactionData)
    
    // Store in localStorage for development testing
    const interactions = JSON.parse(localStorage.getItem('ab-test-interactions') || '[]')
    interactions.push(interactionData)
    localStorage.setItem('ab-test-interactions', JSON.stringify(interactions))
    
    // In production:
    // analytics.track('interaction', interactionData)
  }

  const getConversionRate = (variant: string) => {
    // Only run on client side
    if (typeof window === 'undefined') return 0
    
    const conversions = JSON.parse(localStorage.getItem('ab-test-conversions') || '[]')
    const pageViews = JSON.parse(localStorage.getItem('ab-test-pageviews') || '[]')
    
    const variantConversions = conversions.filter((c: any) => c.variant === variant).length
    const variantPageViews = pageViews.filter((p: any) => p.variant === variant).length
    
    return variantPageViews > 0 ? (variantConversions / variantPageViews) * 100 : 0
  }

  const getAnalyticsReport = () => {
    // Only run on client side
    if (typeof window === 'undefined') return []
    
    const conversions = JSON.parse(localStorage.getItem('ab-test-conversions') || '[]')
    const pageViews = JSON.parse(localStorage.getItem('ab-test-pageviews') || '[]')
    const interactions = JSON.parse(localStorage.getItem('ab-test-interactions') || '[]')
    
    const variants = ['control', 'enterprise', 'startup']
    const report = variants.map(variant => ({
      variant,
      pageViews: pageViews.filter((p: any) => p.variant === variant).length,
      conversions: conversions.filter((c: any) => c.variant === variant).length,
      conversionRate: getConversionRate(variant),
      interactions: interactions.filter((i: any) => i.variant === variant).length
    }))
    
    return report
  }

  return { 
    trackConversion, 
    trackPageView, 
    trackUserInteraction, 
    getConversionRate, 
    getAnalyticsReport 
  }
}

// Helper function to generate session ID
function getSessionId(): string {
  // Only run on client side
  if (typeof window === 'undefined') return 'server_session'
  
  let sessionId = sessionStorage.getItem('ab-test-session-id')
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    sessionStorage.setItem('ab-test-session-id', sessionId)
  }
  return sessionId
}