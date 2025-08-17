'use client'

import React from 'react'

export function FeaturesSection() {
  const features = [
    {
      icon: "🤖",
      title: "Autonomous Coding Agents",
      description: "Full codebase awareness with direct file operations, git integration, and multi-step task execution. No supervision required.",
      benefits: ["Complete project context", "Autonomous debugging", "Git workflow automation"]
    },
    {
      icon: "💰",
      title: "30-40% Cost Savings",
      description: "Direct API pricing eliminates Claude Code markup. OpenAI GPT-4o at $4-8/dev/day vs Claude Code's $6-12/dev/day.",
      benefits: ["Direct API access", "No vendor markup", "Transparent pricing"]
    },
    {
      icon: "🔧",
      title: "Unlimited MCP Integration",
      description: "Connect any tool or service through Model Context Protocol. Custom integrations, databases, APIs, and business logic.",
      benefits: ["Custom tool creation", "API integrations", "Business logic automation"]
    },
    {
      icon: "🚀",
      title: "Multi-Model Support",
      description: "Best model for each task: OpenAI GPT-4o for speed, Claude 3.5 Sonnet for reasoning. Switch models dynamically.",
      benefits: ["Task-optimized models", "Dynamic switching", "Performance optimization"]
    },
    {
      icon: "👥",
      title: "Multi-Agent Coordination",
      description: "Deploy multiple agents that collaborate on complex projects. Parallel execution with shared context and coordination.",
      benefits: ["Parallel development", "Shared context", "Team coordination"]
    },
    {
      icon: "🔒",
      title: "Enterprise Security",
      description: "Docker sandboxing, RBAC permissions, audit logging, and compliance-ready features. Your data stays secure.",
      benefits: ["Docker isolation", "Audit trails", "Compliance ready"]
    }
  ]

  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Why Leading Teams Choose Our Platform
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Revolutionary capabilities that go far beyond traditional AI coding assistants. 
            Built for enterprise teams that demand performance, security, and cost efficiency.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">{feature.description}</p>
              <ul className="space-y-2">
                {feature.benefits.map((benefit, benefitIndex) => (
                  <li key={benefitIndex} className="flex items-center text-slate-700">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ROI Calculator Teaser */}
        <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-xl p-8 mt-16 text-center">
          <h3 className="text-2xl font-bold mb-4">Calculate Your Savings</h3>
          <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
            See exactly how much your team will save switching from Claude Code. 
            Most teams save $150,000-$250,000 annually with 10 developers.
          </p>
          <button className="bg-white text-emerald-600 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition-colors">
            Start ROI Calculator
          </button>
        </div>
      </div>
    </section>
  )
}