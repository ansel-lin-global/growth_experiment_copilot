'use client'

import { useState } from 'react'
import { analyzeABTest, analyzeCausal, ABTestAnalysisRequest, ABTestAnalysisResponse } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

type AnalysisMode = 'ab' | 'did' | 'uplift'

export default function AnalysisPage() {
  const [mode, setMode] = useState<AnalysisMode>('ab')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null) // Changed type to any to accommodate different analysis results
  const [error, setError] = useState<string | null>(null)

  // A/B Test State
  const [metricType, setMetricType] = useState<string>('cvr')
  const [control, setControl] = useState({ name: 'control', users: 1000, clicks: 100, orders: 50, revenue: 5000 })
  const [treatment, setTreatment] = useState({ name: 'treatment', users: 1000, clicks: 120, orders: 65, revenue: 6000 })

  // DiD State
  const [didMetricType, setDidMetricType] = useState<string>('mean')
  const [didData, setDidData] = useState({
    treatment_pre: { users: 1000, outcome: 100 },
    treatment_post: { users: 1000, outcome: 150 },
    control_pre: { users: 1000, outcome: 90 },
    control_post: { users: 1000, outcome: 110 },
  })

  const handleABSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const request: ABTestAnalysisRequest = {
        overall_metric_type: metricType as any,
        variants: [control, treatment]
      }

      const response = await analyzeABTest(request)
      setResult(response)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze A/B test')
    } finally {
      setLoading(false)
    }
  }

  const handleDiDSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formPayload: any = [
        { group: 'treatment', period: 'pre', users: didData.treatment_pre.users, outcome: didData.treatment_pre.outcome },
        { group: 'treatment', period: 'post', users: didData.treatment_post.users, outcome: didData.treatment_post.outcome },
        { group: 'control', period: 'pre', users: didData.control_pre.users, outcome: didData.control_pre.outcome },
        { group: 'control', period: 'post', users: didData.control_post.users, outcome: didData.control_post.outcome },
      ]

      const request: any = {
        mode: 'did',
        did_data: {
          data: formPayload,
          metric_type: didMetricType
        }
      }

      const response = await analyzeCausal(request)
      setResult(response)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze DiD experiment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-900/20 via-[#0B0F19] to-[#0B0F19]">
      {/* Top Nav */}
      <div className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="h-6 w-px bg-white/10"></div>
            <h1 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span>
              Results Analysis Copilot
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Results Analysis
          </h1>
          <p className="text-slate-400">Analyze your experiment results with AI-powered insights</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMode('ab')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${mode === 'ab'
              ? 'bg-rose-600 text-white shadow-rose-glow'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5 hover:border-white/10'
              }`}
          >
            A/B Test Analysis
          </button>
          <button
            onClick={() => setMode('did')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${mode === 'did'
              ? 'bg-rose-600 text-white shadow-rose-glow'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5 hover:border-white/10'
              }`}
          >
            Causal Mode (DiD)
          </button>
          <button
            onClick={() => setMode('uplift')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${mode === 'uplift'
              ? 'bg-rose-600 text-white shadow-rose-glow'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5 hover:border-white/10'
              }`}
          >
            Causal Mode (Uplift)
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column: Input Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="surface-card rounded-xl border border-rose-500/20 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)]">
              <div className="px-6 py-4 border-b border-rose-500/10 bg-white/[0.02] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  {mode === 'ab' ? 'A/B Test Data' : mode === 'did' ? 'Difference-in-Differences Data' : 'Uplift Data'}
                </h2>
              </div>

              {mode === 'ab' && (
                <form onSubmit={handleABSubmit} className="p-6 space-y-6">
                  <div>
                    <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                      <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Primary Metric Type</span>
                      <select
                        value={metricType}
                        onChange={(e) => setMetricType(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                      >
                        <option value="cvr" className="bg-[#0B0F19]">CVR (Conversion Rate)</option>
                        <option value="ctr" className="bg-[#0B0F19]">CTR (Click-Through Rate)</option>
                        <option value="revenue_per_user" className="bg-[#0B0F19]">Revenue Per User</option>
                      </select>
                    </div>
                  </div>

                  {/* Control Variant */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase">Variant A (Control)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                        <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Name</span>
                        <input
                          type="text"
                          value={control.name}
                          onChange={(e) => setControl({ ...control, name: e.target.value })}
                          className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                        />
                      </div>
                      <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                        <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Users *</span>
                        <input
                          type="number"
                          value={control.users}
                          onChange={(e) => setControl({ ...control, users: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                        />
                      </div>
                      <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                        <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Clicks</span>
                        <input
                          type="number"
                          value={control.clicks}
                          onChange={(e) => setControl({ ...control, clicks: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                        />
                      </div>
                      <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                        <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Orders</span>
                        <input
                          type="number"
                          value={control.orders}
                          onChange={(e) => setControl({ ...control, orders: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                      <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Revenue</span>
                      <input
                        type="number"
                        value={control.revenue}
                        onChange={(e) => setControl({ ...control, revenue: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* Treatment Variant */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase">Variant B (Treatment)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                        <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Name</span>
                        <input
                          type="text"
                          value={treatment.name}
                          onChange={(e) => setTreatment({ ...treatment, name: e.target.value })}
                          className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                        />
                      </div>
                      <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                        <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Users *</span>
                        <input
                          type="number"
                          value={treatment.users}
                          onChange={(e) => setTreatment({ ...treatment, users: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                        />
                      </div>
                      <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                        <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Clicks</span>
                        <input
                          type="number"
                          value={treatment.clicks}
                          onChange={(e) => setTreatment({ ...treatment, clicks: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                        />
                      </div>
                      <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                        <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Orders</span>
                        <input
                          type="number"
                          value={treatment.orders}
                          onChange={(e) => setTreatment({ ...treatment, orders: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                      <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Revenue</span>
                      <input
                        type="number"
                        value={treatment.revenue}
                        onChange={(e) => setTreatment({ ...treatment, revenue: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full group py-4 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative shadow-rose-glow bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide">
                      {loading ? "PROCESSING..." : "RUN ANALYSIS"}
                      {!loading && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                    </span>
                  </button>
                  {error && <p className="text-center text-rose-400 text-sm">{error}</p>}
                </form>
              )}

              {mode === 'did' && (
                <form onSubmit={handleDiDSubmit} className="p-6 space-y-6">
                  <div>
                    <div className="bg-[#0B0F19] p-3 rounded-lg border border-rose-500/10 group hover:border-rose-500/30 transition-colors">
                      <span className="text-[10px] text-rose-400/80 uppercase block mb-1 font-semibold">Metric Type</span>
                      <select
                        value={didMetricType}
                        onChange={(e) => setDidMetricType(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm outline-none"
                      >
                        <option value="mean" className="bg-[#0B0F19]">Mean (Average Value)</option>
                        <option value="proportion" className="bg-[#0B0F19]">Proportion (Rate)</option>
                      </select>
                    </div>
                  </div>

                  {/* Pre-Period (Treatment & Control) */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase">Pre-Intervention Period</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Treatment Pre */}
                      <div className="space-y-2 col-span-2 md:col-span-1">
                        <div className="text-[10px] text-rose-400 font-bold uppercase mb-1">Treatment Group (Pre)</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#0B0F19] p-2 rounded border border-rose-500/10">
                            <span className="text-[8px] text-slate-500 uppercase block">Users</span>
                            <input
                              type="number"
                              value={didData.treatment_pre.users}
                              onChange={(e) => setDidData({ ...didData, treatment_pre: { ...didData.treatment_pre, users: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-transparent border-none p-0 text-white text-xs outline-none"
                            />
                          </div>
                          <div className="bg-[#0B0F19] p-2 rounded border border-rose-500/10">
                            <span className="text-[8px] text-slate-500 uppercase block">Outcome</span>
                            <input
                              type="number"
                              value={didData.treatment_pre.outcome}
                              onChange={(e) => setDidData({ ...didData, treatment_pre: { ...didData.treatment_pre, outcome: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-transparent border-none p-0 text-white text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Control Pre */}
                      <div className="space-y-2 col-span-2 md:col-span-1">
                        <div className="text-[10px] text-rose-400 font-bold uppercase mb-1">Control Group (Pre)</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#0B0F19] p-2 rounded border border-rose-500/10">
                            <span className="text-[8px] text-slate-500 uppercase block">Users</span>
                            <input
                              type="number"
                              value={didData.control_pre.users}
                              onChange={(e) => setDidData({ ...didData, control_pre: { ...didData.control_pre, users: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-transparent border-none p-0 text-white text-xs outline-none"
                            />
                          </div>
                          <div className="bg-[#0B0F19] p-2 rounded border border-rose-500/10">
                            <span className="text-[8px] text-slate-500 uppercase block">Outcome</span>
                            <input
                              type="number"
                              value={didData.control_pre.outcome}
                              onChange={(e) => setDidData({ ...didData, control_pre: { ...didData.control_pre, outcome: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-transparent border-none p-0 text-white text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post-Period (Treatment & Control) */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase">Post-Intervention Period</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Treatment Post */}
                      <div className="space-y-2 col-span-2 md:col-span-1">
                        <div className="text-[10px] text-rose-400 font-bold uppercase mb-1">Treatment Group (Post)</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#0B0F19] p-2 rounded border border-rose-500/10">
                            <span className="text-[8px] text-slate-500 uppercase block">Users</span>
                            <input
                              type="number"
                              value={didData.treatment_post.users}
                              onChange={(e) => setDidData({ ...didData, treatment_post: { ...didData.treatment_post, users: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-transparent border-none p-0 text-white text-xs outline-none"
                            />
                          </div>
                          <div className="bg-[#0B0F19] p-2 rounded border border-rose-500/10">
                            <span className="text-[8px] text-slate-500 uppercase block">Outcome</span>
                            <input
                              type="number"
                              value={didData.treatment_post.outcome}
                              onChange={(e) => setDidData({ ...didData, treatment_post: { ...didData.treatment_post, outcome: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-transparent border-none p-0 text-white text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Control Post */}
                      <div className="space-y-2 col-span-2 md:col-span-1">
                        <div className="text-[10px] text-rose-400 font-bold uppercase mb-1">Control Group (Post)</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#0B0F19] p-2 rounded border border-rose-500/10">
                            <span className="text-[8px] text-slate-500 uppercase block">Users</span>
                            <input
                              type="number"
                              value={didData.control_post.users}
                              onChange={(e) => setDidData({ ...didData, control_post: { ...didData.control_post, users: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-transparent border-none p-0 text-white text-xs outline-none"
                            />
                          </div>
                          <div className="bg-[#0B0F19] p-2 rounded border border-rose-500/10">
                            <span className="text-[8px] text-slate-500 uppercase block">Outcome</span>
                            <input
                              type="number"
                              value={didData.control_post.outcome}
                              onChange={(e) => setDidData({ ...didData, control_post: { ...didData.control_post, outcome: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-transparent border-none p-0 text-white text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full group py-4 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative shadow-rose-glow bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide">
                      {loading ? "PROCESSING..." : "RUN CAUSAL ANALYSIS (DiD)"}
                      {!loading && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                    </span>
                  </button>
                  {error && <p className="text-center text-rose-400 text-sm">{error}</p>}
                </form>
              )}

              {mode === 'uplift' && (
                <div className="p-12 text-center">
                  <p className="text-slate-500 mb-4">Uplift Modeling Module Coming Soon</p>
                  <button onClick={() => setMode('ab')} className="text-rose-400 hover:text-rose-300 text-sm underline">
                    Return to A/B Analysis
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Visualization / Results */}
          <div className="lg:col-span-7 space-y-6">
            {!result ? (
              <div className="h-full min-h-[600px] border border-rose-500/10 rounded-xl bg-white/[0.01] flex flex-col items-center justify-center text-slate-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 via-transparent to-transparent opacity-50"></div>
                <div className="w-24 h-24 rounded-full bg-rose-500/5 flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-rose-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">Enter your data and click analyze to see results</p>
              </div>
            ) : (
              <div className="animate-fade-in space-y-6">
                {/* Results Display - Keeping the same good results display as before, just ensuring it fits the new layout if needed */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-[#0B0F19] p-4 rounded-xl border-l-2 border-l-rose-500 border-r border-t border-b border-rose-500/10">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Primary Metric</span>
                    <span className="text-xl font-bold text-white font-mono uppercase">{result.structured_results.primary_metric}</span>
                  </div>
                  {result.structured_results.comparisons[0] && (
                    <div className="bg-[#0B0F19] p-4 rounded-xl border-l-2 border-l-amber-500 border-r border-t border-b border-rose-500/10">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Calculated Uplift</span>
                      <span className={`text-xl font-bold font-mono-num ${result.structured_results.comparisons[0].relative_uplift_percent > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.structured_results.comparisons[0].relative_uplift_percent > 0 ? '+' : ''}
                        {result.structured_results.comparisons[0].relative_uplift_percent.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {result.structured_results.comparisons[0] && (
                    <div className="bg-[#0B0F19] p-4 rounded-xl border-l-2 border-l-rose-500 border-r border-t border-b border-rose-500/10">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Stat Sig (P-Value)</span>
                      <span className="text-xl font-bold text-white font-mono-num">
                        {result.structured_results.comparisons[0].p_value.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="surface-card rounded-xl border border-rose-500/20 p-8 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                  <div className="flex items-center justify-between mb-8 border-b border-rose-500/10 pb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-3">
                      <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      AI Analysis Report
                    </h2>
                  </div>
                  <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-white prose-li:text-slate-300 prose-strong:text-white prose-sm">
                    <ReactMarkdown>{result.llm_report_markdown}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
