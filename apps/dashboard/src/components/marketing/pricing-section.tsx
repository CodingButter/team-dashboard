'use client'

import React from 'react'

export function PricingSection() {
  const plans = [
    {
      name: "Startup",
      price: "$49",
      originalPrice: "$79",
      period: "per developer/month",
      description: "Perfect for growing development teams",
      features: [
        "Up to 5 autonomous agents",
        "OpenAI GPT-4o integration",
        "Basic MCP server support",
        "Standard support",
        "14-day free trial"
      ],
      cta: "Start Free Trial",
      popular: false,
      savings: "38% savings vs Claude Code"
    },
    {
      name: "Professional",
      price: "$89",
      originalPrice: "$149",
      period: "per developer/month",
      description: "Most popular for mid-size teams",
      features: [
        "Unlimited autonomous agents",
        "OpenAI GPT-4o + Claude 3.5 Sonnet",
        "Full MCP server marketplace",
        "Multi-agent coordination",
        "Priority support",
        "Advanced analytics",
        "Custom integrations"
      ],
      cta: "Start Free Trial",
      popular: true,
      savings: "40% savings vs Claude Code"
    },
    {
      name: "Enterprise",
      price: "$199",
      originalPrice: "$299",
      period: "per developer/month",
      description: "For large teams with custom needs",
      features: [
        "Everything in Professional",
        "Self-hosted deployment",
        "Custom model integration",
        "Advanced security features",
        "Dedicated support engineer",
        "SLA guarantees",
        "Custom training"
      ],
      cta: "Contact Sales",
      popular: false,
      savings: "33% savings vs Claude Code"
    }
  ]

  return (
    <section className="bg-slate-50 py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Transparent Pricing That Saves You Money
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            No hidden fees, no markup on AI costs. Pay only for what you use with 
            <strong className="text-emerald-600"> guaranteed 30-40% savings</strong> compared to Claude Code.
          </p>
        </div>

        {/* Pricing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white border border-slate-200 rounded-lg p-1 flex">
            <button className="px-6 py-2 rounded-md bg-emerald-600 text-white font-medium">
              Monthly
            </button>
            <button className="px-6 py-2 rounded-md text-slate-600 font-medium">
              Annual (Save 20%)
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`bg-white rounded-xl border-2 p-8 relative ${
              plan.popular ? 'border-emerald-500 shadow-lg' : 'border-slate-200'
            }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-slate-600 mb-4">{plan.description}</p>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-lg text-slate-500 line-through ml-2">{plan.originalPrice}</span>
                  <div className="text-slate-600">{plan.period}</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6">
                  <span className="text-emerald-700 font-semibold text-sm">{plan.savings}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                plan.popular 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Trust Signals */}
        <div className="text-center mt-16">
          <div className="flex justify-center items-center space-x-8 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              <span className="text-slate-600">14-day money-back guarantee</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"></path>
              </svg>
              <span className="text-slate-600">No setup fees</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
              </svg>
              <span className="text-slate-600">Cancel anytime</span>
            </div>
          </div>
          
          <p className="text-slate-500 text-sm">
            Questions about pricing? <a href="#" className="text-emerald-600 hover:underline">Contact our sales team</a> for a custom quote.
          </p>
        </div>
      </div>
    </section>
  )
}