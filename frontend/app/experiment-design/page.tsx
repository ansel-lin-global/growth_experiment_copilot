'use client'

import { useState } from 'react'
import { designExperiment, ExperimentDesignRequest, ExperimentDesignResponse } from '@/lib/api'
import ReactMarkdown from 'react-markdown'

export default function ExperimentDesignPage() {
  const [description, setDescription] = useState('')
  const [baselineRate, setBaselineRate] = useState<string>('')
  const [mde, setMde] = useState<string>('')
  const [alpha, setAlpha] = useState<string>('0.05')
  const [power, setPower] = useState<string>('0.8')
  const [dailyTraffic, setDailyTraffic] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExperimentDesignResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const request: ExperimentDesignRequest = {
        description,
        baseline_rate: baselineRate ? parseFloat(baselineRate) : undefined,
        minimum_detectable_effect: mde ? parseFloat(mde) : undefined,
        alpha: alpha ? parseFloat(alpha) : 0.05,
        power: power ? parseFloat(power) : 0.8,
        expected_daily_traffic: dailyTraffic ? parseInt(dailyTraffic) : undefined,
      }

      const response = await designExperiment(request)
      setResult(response)
    } catch (err: any) {
      setError(err.message || 'Failed to design experiment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
      <h1 className="text-4xl font-bold text-white mb-2">
        <span className="text-glow">Experiment Design</span>
        <span className="text-neon-purple text-glow ml-3">Copilot</span>
      </h1>
      <p className="text-gray-400 mb-8">Describe your experiment and get AI-powered design recommendations</p>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left side: Input form */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 border border-neon-purple/30">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <span className="w-2 h-2 bg-neon-purple rounded-full mr-3 animate-pulse"></span>
              Describe Your Experiment
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Experiment Description <span className="text-neon-purple">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/50 transition-all duration-300"
                  placeholder="e.g., I want to test a new homepage banner and see if it increases add-to-cart rate"
                />
              </div>

              <div className="border-t border-neon-purple/20 pt-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center">
                  <span className="text-neon-cyan mr-2">⚙</span>
                  Optional Parameters
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="baseline" className="block text-sm font-medium text-gray-300 mb-1">
                      Baseline Rate (0-1)
                    </label>
                    <input
                      type="number"
                      id="baseline"
                      value={baselineRate}
                      onChange={(e) => setBaselineRate(e.target.value)}
                      min="0"
                      max="1"
                      step="0.01"
                      className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/50 transition-all duration-300"
                      placeholder="0.10"
                    />
                  </div>

                  <div>
                    <label htmlFor="mde" className="block text-sm font-medium text-gray-300 mb-1">
                      Min Detectable Effect
                    </label>
                    <input
                      type="number"
                      id="mde"
                      value={mde}
                      onChange={(e) => setMde(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/50 transition-all duration-300"
                      placeholder="0.20"
                    />
                  </div>

                  <div>
                    <label htmlFor="alpha" className="block text-sm font-medium text-gray-300 mb-1">
                      Alpha (significance)
                    </label>
                    <input
                      type="number"
                      id="alpha"
                      value={alpha}
                      onChange={(e) => setAlpha(e.target.value)}
                      min="0"
                      max="1"
                      step="0.01"
                      className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/50 transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label htmlFor="power" className="block text-sm font-medium text-gray-300 mb-1">
                      Power
                    </label>
                    <input
                      type="number"
                      id="power"
                      value={power}
                      onChange={(e) => setPower(e.target.value)}
                      min="0"
                      max="1"
                      step="0.01"
                      className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/50 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="traffic" className="block text-sm font-medium text-gray-300 mb-1">
                    Expected Daily Traffic
                  </label>
                  <input
                    type="number"
                    id="traffic"
                    value={dailyTraffic}
                    onChange={(e) => setDailyTraffic(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/50 transition-all duration-300"
                    placeholder="1000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !description}
                className="w-full bg-gradient-to-r from-neon-purple to-neon-purple-light text-white py-3 px-4 rounded-lg font-medium hover:shadow-neon-purple focus:outline-none focus:ring-2 focus:ring-neon-purple focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center">
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Designing...
                    </>
                  ) : (
                    'Design Experiment'
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan to-neon-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Results */}
        <div className="space-y-6">
          {result && (
            <>
              <div className="glass rounded-xl p-6 border border-neon-cyan/30">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <span className="w-2 h-2 bg-neon-cyan rounded-full mr-3 animate-pulse"></span>
                  Experiment Design Card
                </h2>
                
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">Goal</h3>
                    <p className="text-gray-200">{result.design_card.goal}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">Hypothesis</h3>
                    <p className="text-gray-200">{result.design_card.hypothesis}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">Primary Metrics</h3>
                    <ul className="list-none space-y-1">
                      {result.design_card.primary_metrics.map((metric, idx) => (
                        <li key={idx} className="text-gray-200 flex items-start">
                          <span className="text-neon-purple mr-2">▸</span>
                          {metric}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {result.design_card.secondary_metrics.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">Secondary Metrics</h3>
                      <ul className="list-none space-y-1">
                        {result.design_card.secondary_metrics.map((metric, idx) => (
                          <li key={idx} className="text-gray-300 flex items-start">
                            <span className="text-neon-purple mr-2">▸</span>
                            {metric}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neon-cyan/20">
                    <div>
                      <h3 className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">Design Type</h3>
                      <p className="text-white font-medium">{result.design_card.design_type}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">Variants</h3>
                      <p className="text-white font-medium">{result.design_card.variants}</p>
                    </div>
                  </div>

                  {result.design_card.sample_size_per_variant && (
                    <div className="pt-2 border-t border-neon-cyan/20">
                      <h3 className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">Sample Size per Variant</h3>
                      <p className="text-neon-purple text-2xl font-bold">
                        {result.design_card.sample_size_per_variant.toLocaleString()} <span className="text-sm text-gray-400">users</span>
                      </p>
                    </div>
                  )}

                  {result.design_card.estimated_duration_days && (
                    <div className="pt-2 border-t border-neon-cyan/20">
                      <h3 className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">Estimated Duration</h3>
                      <p className="text-neon-cyan text-2xl font-bold">
                        {result.design_card.estimated_duration_days} <span className="text-sm text-gray-400">days</span>
                      </p>
                    </div>
                  )}

                  {result.design_card.notes.length > 0 && (
                    <div className="pt-2 border-t border-neon-cyan/20">
                      <h3 className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">Important Notes</h3>
                      <ul className="list-none space-y-2">
                        {result.design_card.notes.map((note, idx) => (
                          <li key={idx} className="text-gray-300 flex items-start">
                            <span className="text-yellow-400 mr-2">⚠</span>
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass rounded-xl p-6 border border-neon-purple/30">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="w-2 h-2 bg-neon-purple rounded-full mr-3 animate-pulse"></span>
                  AI Explanation
                </h2>
                <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                      h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-3">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold text-neon-cyan mb-2">{children}</h3>,
                      ul: ({ children }) => <ul className="list-none space-y-2 mb-4">{children}</ul>,
                      li: ({ children }) => <li className="flex items-start"><span className="text-neon-purple mr-2">▸</span>{children}</li>,
                      code: ({ children }) => <code className="bg-dark-bg-secondary px-2 py-1 rounded text-neon-cyan text-sm">{children}</code>,
                      strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    }}
                  >
                    {result.llm_explanation}
                  </ReactMarkdown>
                </div>
              </div>
            </>
          )}

          {!result && !loading && (
            <div className="glass rounded-xl p-12 border border-neon-purple/20 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-400">Enter an experiment description and click "Design Experiment" to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

