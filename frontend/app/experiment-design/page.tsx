'use client'

import { useState } from 'react'
import { designExperiment, ExperimentDesignRequest, ExperimentDesignResponse } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

export default function ExperimentDesignPage() {
  const [description, setDescription] = useState('')
  const [baselineRate, setBaselineRate] = useState('')
  const [mde, setMde] = useState('')
  const [alpha, setAlpha] = useState('0.05')
  const [power, setPower] = useState('0.8')
  const [dailyTraffic, setDailyTraffic] = useState('')

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
    <div className="min-h-screen bg-[#0B0F19] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-[#0B0F19] to-[#0B0F19]">
      {/* Top Nav / Breadcrumbs */}
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
              <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></span>
              Experiment Design Copilot
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-[10px] font-mono text-purple-300 uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.15)]">
              Design Module Active
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 grid lg:grid-cols-12 gap-6">

        {/* Left Column: Configuration Deck */}
        <div className="lg:col-span-5 space-y-6">
          <div className="surface-card rounded-xl border border-purple-500/20 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <div className="px-6 py-4 border-b border-purple-500/10 bg-white/[0.02] flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Experiment Parameters
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Module 1: Hypothesis */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-purple-400 uppercase tracking-widest block">
                  1. Hypothesis Definition <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={5}
                    className="w-full bg-[#0B0F19] border border-purple-500/30 rounded-lg p-4 text-sm text-slate-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none placeholder-slate-600 placeholder:!text-gray-500 placeholder:!opacity-40 shadow-inner"
                    placeholder="Describe your intended experiment. Example: changing the checkout button color to red will increase conversion rate..."
                  />
                  <div className="absolute inset-0 rounded-lg bg-purple-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                </div>
              </div>

              {/* Module 2: Constraints */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block flex items-center justify-between">
                  <span>2. Statistical Constants</span>
                  <span className="text-[10px] text-slate-600 font-normal normal-case">Defaults applied automatically</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0B0F19] p-3 rounded-lg border border-purple-500/10 group hover:border-purple-500/30 transition-colors">
                    <span className="text-[10px] text-purple-400/80 uppercase block mb-1 font-semibold">Baseline Rate</span>
                    <input
                      type="number"
                      value={baselineRate}
                      onChange={(e) => setBaselineRate(e.target.value)}
                      placeholder="0.10"
                      step="0.01"
                      className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm"
                    />
                  </div>
                  <div className="bg-[#0B0F19] p-3 rounded-lg border border-purple-500/10 group hover:border-purple-500/30 transition-colors">
                    <span className="text-[10px] text-purple-400/80 uppercase block mb-1 font-semibold">MDE</span>
                    <input
                      type="number"
                      value={mde}
                      onChange={(e) => setMde(e.target.value)}
                      placeholder="0.05"
                      step="0.01"
                      className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm"
                    />
                  </div>
                  <div className="bg-[#0B0F19] p-3 rounded-lg border border-purple-500/10 group hover:border-purple-500/30 transition-colors">
                    <span className="text-[10px] text-purple-400/80 uppercase block mb-1 font-semibold">Alpha</span>
                    <input
                      type="number"
                      value={alpha}
                      onChange={(e) => setAlpha(e.target.value)}
                      step="0.01"
                      className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm"
                    />
                  </div>
                  <div className="bg-[#0B0F19] p-3 rounded-lg border border-purple-500/10 group hover:border-purple-500/30 transition-colors">
                    <span className="text-[10px] text-purple-400/80 uppercase block mb-1 font-semibold">Power</span>
                    <input
                      type="number"
                      value={power}
                      onChange={(e) => setPower(e.target.value)}
                      step="0.01"
                      className="w-full bg-transparent border-none p-0 text-white font-mono focus:ring-0 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Module 3: Traffic */}
              <div className="bg-[#0B0F19] p-4 rounded-lg border border-purple-500/10 flex items-center justify-between hover:border-purple-500/30 transition-colors">
                <div>
                  <span className="text-xs text-slate-300 font-medium block">Daily Traffic Volume</span>
                </div>
                <input
                  type="number"
                  value={dailyTraffic}
                  onChange={(e) => setDailyTraffic(e.target.value)}
                  placeholder="1000"
                  className="bg-slate-800/50 border border-slate-700 rounded text-right w-32 text-white font-mono focus:ring-purple-500 focus:border-purple-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !description}
                className="w-full group btn-primary py-4 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative shadow-purple-glow"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide">
                  {loading ? "PROCESSING..." : "GENERATE EXPERIMENT DESIGN"}
                  {!loading && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                </span>
              </button>
              {error && <p className="text-rose-400 text-sm text-center bg-rose-950/30 border border-rose-500/30 p-3 rounded-lg">{error}</p>}
            </form>
          </div>
        </div>

        {/* Right Column: Simulation Results Dashboard */}
        <div className="lg:col-span-7 space-y-6">
          {!result ? (
            <div className="h-full min-h-[500px] border-2 border-dashed border-purple-500/10 rounded-xl flex flex-col items-center justify-center text-slate-600 bg-purple-900/5">
              <div className="w-24 h-24 rounded-full bg-purple-500/5 flex items-center justify-center mb-6 animate-pulse">
                <svg className="w-10 h-10 text-purple-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="uppercase tracking-widest text-xs font-bold text-purple-500/50">Awaiting Simulation Parameters</p>
            </div>
          ) : (
            <div className="animate-fade-in space-y-6">
              {/* Design Card */}
              <div className="surface-card rounded-xl border border-purple-500/20 p-8 shadow-[0_0_30px_rgba(124,58,237,0.1)]">
                <div className="flex items-center justify-between mb-8 border-b border-purple-500/10 pb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.8)]"></span>
                    Design Blueprint
                  </h2>
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-300 rounded-full text-[10px] font-mono border border-purple-500/20 uppercase tracking-wide">
                    Generated by Causal AI
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Experimental Goal</h3>
                    <p className="text-slate-300 leading-relaxed text-sm bg-[#0B0F19] p-4 rounded-lg border border-purple-500/10">
                      {result.design_card.goal}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Primary Hypothesis</h3>
                    <p className="text-slate-300 leading-relaxed text-sm bg-[#0B0F19] p-4 rounded-lg border border-purple-500/10">
                      {result.design_card.hypothesis}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-[#0B0F19] p-4 rounded-lg border-l-2 border-l-purple-500">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Design Type</span>
                    <span className="text-sm font-bold text-white">{result.design_card.design_type}</span>
                  </div>
                  <div className="bg-[#0B0F19] p-4 rounded-lg border-l-2 border-l-purple-500">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Sample Size/Variant</span>
                    <span className="text-sm font-bold text-white font-mono-num">
                      {result.design_card.sample_size_per_variant?.toLocaleString() ?? 'N/A'}
                    </span>
                  </div>
                  <div className="bg-[#0B0F19] p-4 rounded-lg border-l-2 border-l-purple-500">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Total Duration</span>
                    <span className="text-sm font-bold text-white font-mono-num">
                      {result.design_card.estimated_duration_days ?? 'N/A'} Days
                    </span>
                  </div>
                  <div className="bg-[#0B0F19] p-4 rounded-lg border-l-2 border-l-rose-500">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Variants</span>
                    <span className="text-sm font-bold text-white font-mono-num">
                      {result.design_card.variants}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Key Metrics</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.design_card.primary_metrics.map((m, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs font-medium">
                        {m}
                      </span>
                    ))}
                    {result.design_card.secondary_metrics.map((m, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="surface-card rounded-xl border border-white/10 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Design Rationale
                  </h2>
                </div>
                <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-white prose-li:text-slate-300 prose-sm">
                  <ReactMarkdown>{result.llm_explanation}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
