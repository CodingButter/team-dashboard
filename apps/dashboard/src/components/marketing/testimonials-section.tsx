'use client'

import React from 'react'

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "VP Engineering",
      company: "TechFlow Inc",
      avatar: "👩‍💼",
      quote: "We cut our AI coding costs by 42% while doubling development velocity. The multi-agent coordination is game-changing for complex projects.",
      metrics: "42% cost reduction, 2x faster delivery"
    },
    {
      name: "Marcus Rodriguez",
      role: "CTO",
      company: "StartupCorp",
      avatar: "👨‍💻",
      quote: "The autonomous agents handle our entire CI/CD pipeline management. What used to take our team 8 hours now happens automatically overnight.",
      metrics: "8 hours saved daily, 100% automation"
    },
    {
      name: "Dr. Emily Watson",
      role: "Lead Data Scientist",
      company: "AI Research Labs",
      avatar: "👩‍🔬",
      quote: "Custom MCP integrations let us connect our proprietary ML models directly. The platform adapts to our workflow, not the other way around.",
      metrics: "Custom ML integration, 60% efficiency gain"
    },
    {
      name: "David Kim",
      role: "Senior DevOps Engineer",
      company: "Scale Systems",
      avatar: "👨‍⚕️",
      quote: "Enterprise security features give us confidence to use AI agents on sensitive projects. Docker isolation and audit logs are excellent.",
      metrics: "Zero security incidents, full compliance"
    },
    {
      name: "Lisa Thompson",
      role: "Engineering Manager",
      company: "FinTech Solutions",
      avatar: "👩‍💼",
      quote: "The cost transparency is refreshing. No hidden fees, no markup. We know exactly what we're paying for and it's significantly less than Claude Code.",
      metrics: "$180k annual savings vs Claude Code"
    },
    {
      name: "Alex Johnson",
      role: "Principal Architect",
      company: "CloudNative Co",
      avatar: "👨‍🎓",
      quote: "Multi-model support is brilliant. GPT-4o for quick tasks, Claude 3.5 for complex reasoning. Best tool for each job, automatically.",
      metrics: "35% performance improvement, optimal model selection"
    }
  ]

  const stats = [
    { metric: "1,000+", label: "Development Teams" },
    { metric: "98.7%", label: "Customer Satisfaction" },
    { metric: "40%", label: "Average Cost Savings" },
    { metric: "99.9%", label: "Platform Uptime" }
  ]

  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Trusted by 1,000+ Development Teams Worldwide
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Leading engineering teams choose our platform for its reliability, cost savings, and superior performance.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-emerald-600 mb-2">{stat.metric}</div>
              <div className="text-slate-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="text-3xl mr-3">{testimonial.avatar}</div>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-slate-600 text-sm">{testimonial.role}</div>
                  <div className="text-emerald-600 text-sm font-medium">{testimonial.company}</div>
                </div>
              </div>
              
              <blockquote className="text-slate-700 mb-4 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-emerald-700 font-semibold text-sm">{testimonial.metrics}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Case Study CTA */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">See How TechCorp Saved $250k Annually</h3>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Read the complete case study of how TechCorp's 15-developer team cut AI coding costs by 40% 
            while increasing deployment frequency from weekly to daily.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
              Download Case Study
            </button>
            <button className="border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white px-8 py-3 rounded-lg font-semibold transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>

        {/* Security Badges */}
        <div className="flex justify-center items-center space-x-8 mt-12 opacity-60">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-slate-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
            </svg>
            <span className="text-slate-600 font-medium">SOC 2 Compliant</span>
          </div>
          <div className="flex items-center">
            <svg className="w-6 h-6 text-slate-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"></path>
            </svg>
            <span className="text-slate-600 font-medium">ISO 27001</span>
          </div>
          <div className="flex items-center">
            <svg className="w-6 h-6 text-slate-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd"></path>
            </svg>
            <span className="text-slate-600 font-medium">GDPR Ready</span>
          </div>
        </div>
      </div>
    </section>
  )
}