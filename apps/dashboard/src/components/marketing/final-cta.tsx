'use client'

import React, { useState, useEffect } from 'react'

export function FinalCTA() {
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 45, seconds: 30 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <section className="bg-gradient-to-r from-emerald-600 to-blue-600 py-20">
      <div className="container mx-auto px-6 text-center text-white">
        {/* Limited Time Offer */}
        <div className="bg-white/20 border border-white/30 rounded-lg p-4 inline-block mb-6">
          <div className="text-emerald-200 text-sm font-medium mb-2">LIMITED TIME OFFER</div>
          <div className="flex justify-center space-x-4 text-2xl font-bold">
            <div className="bg-white/20 rounded-lg p-2 min-w-16">
              {String(timeLeft.hours).padStart(2, '0')}
              <div className="text-xs text-emerald-200">Hours</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 min-w-16">
              {String(timeLeft.minutes).padStart(2, '0')}
              <div className="text-xs text-emerald-200">Minutes</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 min-w-16">
              {String(timeLeft.seconds).padStart(2, '0')}
              <div className="text-xs text-emerald-200">Seconds</div>
            </div>
          </div>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ready to Slash Your AI Coding Costs by 40%?
        </h2>
        
        <p className="text-xl text-emerald-100 mb-8 max-w-3xl mx-auto">
          Join 1,000+ development teams saving $150k-$250k annually. 
          Start your free trial today and experience autonomous coding that actually works.
        </p>

        {/* Value Stack */}
        <div className="bg-white/10 border border-white/20 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold mb-4">Your Free Trial Includes:</h3>
          <div className="grid md:grid-cols-2 gap-4 text-left">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-300 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Full platform access (14 days)
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-300 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Unlimited autonomous agents
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-300 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              GPT-4o & Claude 3.5 models
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-300 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              White-glove onboarding
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-300 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Custom MCP integrations
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-300 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              ROI analysis & reporting
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button className="bg-white text-emerald-600 px-12 py-4 rounded-lg font-bold text-xl hover:bg-emerald-50 transition-colors shadow-lg">
            Start Free 14-Day Trial
          </button>
          <button className="border-2 border-white text-white px-12 py-4 rounded-lg font-bold text-xl hover:bg-white/10 transition-colors">
            Schedule Demo Call
          </button>
        </div>

        {/* Risk Reversal */}
        <div className="text-emerald-100 mb-8">
          <p className="text-lg mb-2">
            <strong>Zero Risk:</strong> Full refund if you don't save at least 25% vs your current solution
          </p>
          <p className="text-sm opacity-80">
            No credit card required • Cancel anytime • Setup in under 10 minutes
          </p>
        </div>

        {/* Social Proof */}
        <div className="flex justify-center items-center space-x-8 opacity-80">
          <div className="text-center">
            <div className="text-2xl font-bold">1,000+</div>
            <div className="text-xs">Teams Trust Us</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">$50M+</div>
            <div className="text-xs">Developer Costs Saved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">99.9%</div>
            <div className="text-xs">Platform Uptime</div>
          </div>
        </div>

        {/* Urgency */}
        <div className="mt-8 text-center">
          <p className="text-emerald-200 text-sm">
            🔥 <strong>Hot Deal:</strong> First 100 signups this month get 3 months of Professional plan free
          </p>
        </div>
      </div>
    </section>
  )
}