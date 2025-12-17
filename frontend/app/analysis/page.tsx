'use client'

import { useState } from 'react'
import {
  analyzeABTest,
  analyzeCausal,
  ABTestAnalysisRequest,
  CausalAnalysisRequest,
  VariantData,
  DiDDataPoint,
} from '@/lib/api'
import ReactMarkdown from 'react-markdown'

type AnalysisMode = 'ab' | 'did' | 'uplift'

export default function AnalysisPage() {
  const [mode, setMode] = useState<AnalysisMode>('ab')
  const [loading, setLoading] = useState(false)
  const [abResult, setAbResult] = useState<any>(null)
  const [causalResult, setCausalResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // A/B Test state
  const [variants, setVariants] = useState<VariantData[]>([
    { name: 'control', users: 1000, clicks: 100, orders: 50, revenue: 5000 },
    { name: 'treatment', users: 1000, clicks: 120, orders: 60, revenue: 6000 },
  ])
  const [metricType, setMetricType] = useState<'ctr' | 'cvr' | 'revenue_per_user'>('cvr')

  // DiD state
  const [didData, setDidData] = useState<DiDDataPoint[]>([
    { group: 'treatment', period: 'pre', users: 1000, outcome: 100 },
    { group: 'treatment', period: 'post', users: 1000, outcome: 150 },
    { group: 'control', period: 'pre', users: 1000, outcome: 100 },
    { group: 'control', period: 'post', users: 1000, outcome: 105 },
  ])
  const [didMetricType, setDidMetricType] = useState<'proportion' | 'mean'>('proportion')

  const handleABTestSubmit = async () => {
    setLoading(true)
    setError(null)
    setAbResult(null)
    setCausalResult(null)

    try {
      const request: ABTestAnalysisRequest = {
        variants,
        overall_metric_type: metricType,
      }
      const response = await analyzeABTest(request)
      setAbResult(response)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze A/B test')
    } finally {
      setLoading(false)
    }
  }

  const handleCausalSubmit = async () => {
    setLoading(true)
    setError(null)
    setAbResult(null)
    setCausalResult(null)

    try {
      let request: CausalAnalysisRequest

      if (mode === 'did') {
        request = {
          mode: 'did',
          did_data: {
            data: didData,
            metric_type: didMetricType,
          },
        }
      } else {
        // Uplift mode - simplified for MVP
        request = {
          mode: 'uplift',
          uplift_data: {
            data: [], // Would need proper data structure
          },
        }
      }

      const response = await analyzeCausal(request)
      setCausalResult(response)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze causal experiment')
    } finally {
      setLoading(false)
    }
  }

  const addVariant = () => {
    setVariants([...variants, { name: `variant_${variants.length + 1}`, users: 1000 }])
  }

  const updateVariant = (index: number, field: keyof VariantData, value: any) => {
    const updated = [...variants]
    updated[index] = { ...updated[index], [field]: value }
    setVariants(updated)
  }

  const addDidDataPoint = () => {
    setDidData([
      ...didData,
      { group: 'treatment', period: 'pre', users: 1000, outcome: 0 },
    ])
  }

  const updateDidDataPoint = (index: number, field: keyof DiDDataPoint, value: any) => {
    const updated = [...didData]
    updated[index] = { ...updated[index], [field]: value }
    setDidData(updated)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
      <h1 className="text-4xl font-bold text-white mb-2">
        <span className="text-glow">Results Analysis</span>
        <span className="text-neon-cyan text-glow-cyan ml-3">Copilot</span>
      </h1>
      <p className="text-gray-400 mb-8">Analyze your experiment results with AI-powered insights</p>

      {/* Mode selector */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setMode('ab')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              mode === 'ab'
                ? 'bg-gradient-to-r from-neon-purple to-neon-purple-light text-white shadow-neon-purple'
                : 'glass text-gray-300 border border-neon-purple/30 hover:border-neon-purple/60 hover:text-white'
            }`}
          >
            A/B Test Analysis
          </button>
          <button
            onClick={() => setMode('did')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              mode === 'did'
                ? 'bg-gradient-to-r from-neon-cyan to-neon-purple text-white shadow-neon-cyan'
                : 'glass text-gray-300 border border-neon-cyan/30 hover:border-neon-cyan/60 hover:text-white'
            }`}
          >
            Causal Mode (DiD)
          </button>
          <button
            onClick={() => setMode('uplift')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              mode === 'uplift'
                ? 'bg-gradient-to-r from-neon-purple to-neon-purple-light text-white shadow-neon-purple'
                : 'glass text-gray-300 border border-neon-purple/30 hover:border-neon-purple/60 hover:text-white'
            }`}
          >
            Causal Mode (Uplift)
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left side: Input form */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 border border-neon-purple/30">
            {mode === 'ab' && (
              <>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <span className="w-2 h-2 bg-neon-purple rounded-full mr-3 animate-pulse"></span>
                  A/B Test Data
                </h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Primary Metric Type
                  </label>
                  <select
                    value={metricType}
                    onChange={(e) => setMetricType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-white focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/50 transition-all duration-300"
                  >
                    <option value="ctr" className="bg-dark-bg-secondary">CTR (Click-Through Rate)</option>
                    <option value="cvr" className="bg-dark-bg-secondary">CVR (Conversion Rate)</option>
                    <option value="revenue_per_user" className="bg-dark-bg-secondary">Revenue per User</option>
                  </select>
                </div>

                <div className="space-y-4">
                  {variants.map((variant, idx) => (
                    <div key={idx} className="border border-neon-purple/20 rounded-lg p-4 bg-dark-bg-secondary/30">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-sm text-white focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all duration-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Users <span className="text-neon-purple">*</span></label>
                          <input
                            type="number"
                            value={variant.users}
                            onChange={(e) => updateVariant(idx, 'users', parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-sm text-white focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all duration-300"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Clicks</label>
                          <input
                            type="number"
                            value={variant.clicks || ''}
                            onChange={(e) => updateVariant(idx, 'clicks', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-sm text-white focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all duration-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Orders</label>
                          <input
                            type="number"
                            value={variant.orders || ''}
                            onChange={(e) => updateVariant(idx, 'orders', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-sm text-white focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all duration-300"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-300 mb-1">Revenue</label>
                          <input
                            type="number"
                            value={variant.revenue || ''}
                            onChange={(e) => updateVariant(idx, 'revenue', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-purple/30 rounded-lg text-sm text-white focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all duration-300"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addVariant}
                  className="mt-4 text-sm text-neon-purple hover:text-neon-purple-light transition-colors duration-300 flex items-center"
                >
                  <span className="mr-1">+</span> Add Variant
                </button>

                <button
                  onClick={handleABTestSubmit}
                  disabled={loading}
                  className="mt-6 w-full bg-gradient-to-r from-neon-purple to-neon-purple-light text-white py-3 px-4 rounded-lg font-medium hover:shadow-neon-purple focus:outline-none focus:ring-2 focus:ring-neon-purple focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      'Analyze A/B Test'
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan to-neon-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </>
            )}

            {mode === 'did' && (
              <>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <span className="w-2 h-2 bg-neon-cyan rounded-full mr-3 animate-pulse"></span>
                  Difference-in-Differences Data
                </h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Metric Type
                  </label>
                  <select
                    value={didMetricType}
                    onChange={(e) => setDidMetricType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-cyan/30 rounded-lg text-white focus:outline-none focus:border-neon-cyan focus:ring-2 focus:ring-neon-cyan/50 transition-all duration-300"
                  >
                    <option value="proportion" className="bg-dark-bg-secondary">Proportion</option>
                    <option value="mean" className="bg-dark-bg-secondary">Mean</option>
                  </select>
                </div>

                <div className="space-y-4">
                  {didData.map((point, idx) => (
                    <div key={idx} className="border border-neon-cyan/20 rounded-lg p-4 bg-dark-bg-secondary/30">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Group</label>
                          <select
                            value={point.group}
                            onChange={(e) => updateDidDataPoint(idx, 'group', e.target.value)}
                            className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-cyan/30 rounded-lg text-sm text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all duration-300"
                          >
                            <option value="treatment" className="bg-dark-bg-secondary">Treatment</option>
                            <option value="control" className="bg-dark-bg-secondary">Control</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Period</label>
                          <select
                            value={point.period}
                            onChange={(e) => updateDidDataPoint(idx, 'period', e.target.value)}
                            className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-cyan/30 rounded-lg text-sm text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all duration-300"
                          >
                            <option value="pre" className="bg-dark-bg-secondary">Pre</option>
                            <option value="post" className="bg-dark-bg-secondary">Post</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Users</label>
                          <input
                            type="number"
                            value={point.users}
                            onChange={(e) => updateDidDataPoint(idx, 'users', parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-cyan/30 rounded-lg text-sm text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all duration-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Outcome</label>
                          <input
                            type="number"
                            value={point.outcome}
                            onChange={(e) => updateDidDataPoint(idx, 'outcome', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 bg-dark-bg-secondary/50 border border-neon-cyan/30 rounded-lg text-sm text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all duration-300"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addDidDataPoint}
                  className="mt-4 text-sm text-neon-cyan hover:text-neon-purple transition-colors duration-300 flex items-center"
                >
                  <span className="mr-1">+</span> Add Data Point
                </button>

                <button
                  onClick={handleCausalSubmit}
                  disabled={loading}
                  className="mt-6 w-full bg-gradient-to-r from-neon-cyan to-neon-purple text-white py-3 px-4 rounded-lg font-medium hover:shadow-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      'Analyze DiD'
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </>
            )}

            {mode === 'uplift' && (
              <div className="text-center py-12 glass rounded-lg border border-neon-purple/20">
                <div className="text-neon-purple mb-4">
                  <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-gray-300 mb-2">Uplift modeling interface coming soon.</p>
                <p className="text-sm text-gray-500">For now, use the API directly with JSON data.</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Results */}
        <div className="space-y-6">
          {abResult && (
            <>
              <div className="glass rounded-xl p-6 border border-neon-purple/30">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <span className="w-2 h-2 bg-neon-purple rounded-full mr-3 animate-pulse"></span>
                  Results
                </h2>
                
                {abResult.warnings.length > 0 && (
                  <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                    <h3 className="text-sm font-medium text-yellow-300 mb-2 flex items-center">
                      <span className="mr-2">⚠</span>
                      Warnings
                    </h3>
                    <ul className="list-none space-y-1 text-sm text-yellow-200">
                      {abResult.warnings.map((w: string, idx: number) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-yellow-400 mr-2">▸</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-medium text-neon-purple uppercase tracking-wider mb-3">Variant Results</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-neon-purple/30">
                            <th className="px-3 py-2 text-left text-xs font-medium text-neon-purple uppercase tracking-wider">Variant</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-neon-purple uppercase tracking-wider">Users</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-neon-purple uppercase tracking-wider">CTR</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-neon-purple uppercase tracking-wider">CVR</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-neon-purple uppercase tracking-wider">ARPU</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neon-purple/10">
                          {abResult.structured_results.variants.map((v: any, idx: number) => (
                            <tr key={idx} className="hover:bg-neon-purple/5 transition-colors duration-200">
                              <td className="px-3 py-3 text-sm text-white font-medium">{v.name}</td>
                              <td className="px-3 py-3 text-sm text-gray-300">{v.users.toLocaleString()}</td>
                              <td className="px-3 py-3 text-sm text-neon-cyan">
                                {v.ctr ? `${(v.ctr * 100).toFixed(2)}%` : '-'}
                              </td>
                              <td className="px-3 py-3 text-sm text-neon-cyan">
                                {v.cvr ? `${(v.cvr * 100).toFixed(2)}%` : '-'}
                              </td>
                              <td className="px-3 py-3 text-sm text-neon-purple font-semibold">
                                {v.arpu ? `$${v.arpu.toFixed(2)}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {abResult.structured_results.comparisons.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-neon-purple uppercase tracking-wider mb-3">Comparisons</h3>
                      <div className="space-y-2">
                        {abResult.structured_results.comparisons.map((c: any, idx: number) => (
                          <div key={idx} className="p-4 glass rounded-lg border border-neon-purple/20">
                            <div className="text-sm text-white mb-2">
                              <span className="font-semibold text-neon-cyan">{c.treatment_name}</span>
                              <span className="text-gray-400 mx-2">vs</span>
                              <span className="font-semibold text-neon-purple">{c.control_name}</span>
                            </div>
                            <div className="text-xs text-gray-300 mt-2 flex flex-wrap gap-3">
                              <span className="px-2 py-1 bg-neon-purple/20 rounded text-neon-purple">
                                Uplift: {c.relative_uplift_percent.toFixed(1)}%
                              </span>
                              <span className="px-2 py-1 bg-neon-cyan/20 rounded text-neon-cyan">
                                p-value: {c.p_value.toFixed(4)}
                              </span>
                              {c.is_significant ? (
                                <span className="px-2 py-1 bg-neon-purple/20 rounded text-neon-purple font-semibold">
                                  ✓ Significant
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-700/50 rounded text-gray-400">
                                  Not significant
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass rounded-xl p-6 border border-neon-purple/30">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="w-2 h-2 bg-neon-purple rounded-full mr-3 animate-pulse"></span>
                  AI Interpretation
                </h2>
                <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                      h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-3">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold text-neon-purple mb-2">{children}</h3>,
                      ul: ({ children }) => <ul className="list-none space-y-2 mb-4">{children}</ul>,
                      li: ({ children }) => <li className="flex items-start"><span className="text-neon-purple mr-2">▸</span>{children}</li>,
                      code: ({ children }) => <code className="bg-dark-bg-secondary px-2 py-1 rounded text-neon-cyan text-sm">{children}</code>,
                      strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    }}
                  >
                    {abResult.llm_report_markdown}
                  </ReactMarkdown>
                </div>
              </div>
            </>
          )}

          {causalResult && (
            <>
              <div className="glass rounded-xl p-6 border border-neon-cyan/30">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <span className="w-2 h-2 bg-neon-cyan rounded-full mr-3 animate-pulse"></span>
                  Causal Analysis Results
                </h2>
                <div className="space-y-4">
                  {causalResult.numeric_results && (
                    <div>
                      <h3 className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">Numeric Results</h3>
                      <pre className="bg-dark-bg-secondary/50 p-4 rounded-lg text-xs overflow-x-auto text-gray-300 border border-neon-cyan/20">
                        {JSON.stringify(causalResult.numeric_results, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass rounded-xl p-6 border border-neon-purple/30">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="w-2 h-2 bg-neon-purple rounded-full mr-3 animate-pulse"></span>
                  AI Interpretation
                </h2>
                <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                      h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-3">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold text-neon-purple mb-2">{children}</h3>,
                      ul: ({ children }) => <ul className="list-none space-y-2 mb-4">{children}</ul>,
                      li: ({ children }) => <li className="flex items-start"><span className="text-neon-purple mr-2">▸</span>{children}</li>,
                      code: ({ children }) => <code className="bg-dark-bg-secondary px-2 py-1 rounded text-neon-cyan text-sm">{children}</code>,
                      strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    }}
                  >
                    {causalResult.llm_report_markdown}
                  </ReactMarkdown>
                </div>
              </div>
            </>
          )}

          {!abResult && !causalResult && !loading && (
            <div className="glass rounded-xl p-12 border border-neon-purple/20 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-400">Enter your data and click analyze to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

