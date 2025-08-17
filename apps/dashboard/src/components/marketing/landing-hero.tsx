'use client'

import React from 'react'

export function LandingHero() {
  return (
    <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-12 sm:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 text-center">
        {/* Trust Badge */}
        <div className="inline-flex items-center bg-emerald-600/20 border border-emerald-600/30 rounded-full px-3 sm:px-4 py-2 mb-4 sm:mb-6">
          <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
          <span className="text-emerald-300 text-xs sm:text-sm font-medium">Enterprise-Grade Agentic Coding Platform</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
          Revolutionary <span className="text-emerald-400">Autonomous Coding</span>
          <br />
          <span className="text-slate-300">Save 40% vs Claude Code</span>
        </h1>

        {/* Value Proposition */}
        <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 mb-6 sm:mb-8 max-w-4xl mx-auto leading-relaxed px-2">
          Deploy AI coding agents with <strong className="text-white">full codebase awareness</strong>, 
          multi-model support (OpenAI GPT-4o & Claude 3.5), and unlimited MCP server integration. 
          <strong className="text-emerald-400"> Slash costs by 30-40%</strong> while boosting productivity 50%.
        </p>

        {/* Key Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 max-w-5xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 transform transition-transform hover:scale-105">
            <div className="text-emerald-400 text-2xl sm:text-3xl font-bold mb-2">30-40%</div>
            <div className="text-slate-300 text-sm sm:text-base">Cost Savings vs Claude Code</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 transform transition-transform hover:scale-105">
            <div className="text-emerald-400 text-2xl sm:text-3xl font-bold mb-2">50%</div>
            <div className="text-slate-300 text-sm sm:text-base">Faster Development Velocity</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 sm:p-6 transform transition-transform hover:scale-105 sm:col-span-2 lg:col-span-1">
            <div className="text-emerald-400 text-2xl sm:text-3xl font-bold mb-2">24/7</div>
            <div className="text-slate-300 text-sm sm:text-base">Autonomous Agent Operation</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8 px-4">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto min-h-[48px]">
            Start Free 14-Day Trial
          </button>
          <button className="border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all duration-200 w-full sm:w-auto min-h-[48px]">
            Watch 3-Minute Demo
          </button>
        </div>

        {/* Social Proof */}
        <div className="text-slate-400 text-sm">
          <p className="mb-2">Trusted by 1,000+ development teams worldwide</p>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="bg-slate-700 px-4 py-2 rounded">YCombinator</div>
            <div className="bg-slate-700 px-4 py-2 rounded">TechStars</div>
            <div className="bg-slate-700 px-4 py-2 rounded">Fortune 500</div>
          </div>
        </div>
      </div>
    </section>
  )
}