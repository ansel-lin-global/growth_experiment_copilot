'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ExperimentDesignRequest, ExperimentDesignResponse } from '@/lib/api'

interface ExperimentOutputProps {
    result: ExperimentDesignResponse
    inputs: ExperimentDesignRequest
}

export default function ExperimentOutput({ result, inputs }: ExperimentOutputProps) {
    const [activeTab, setActiveTab] = useState<'blueprint' | 'rationale' | 'next-steps'>('blueprint')
    const { design_card, llm_explanation } = result

    const isReady = design_card.sample_size_per_variant !== null && design_card.estimated_duration_days !== null

    const tabs = [
        { id: 'blueprint', label: 'Blueprint' },
        { id: 'rationale', label: 'Rationale' },
        { id: 'next-steps', label: 'Next steps' },
    ] as const

    const nextSteps = [
        { label: 'Baseline metric value', value: inputs.baseline_rate, key: 'baseline_rate' },
        { label: 'Minimum detectable effect (MDE)', value: inputs.minimum_detectable_effect, key: 'mde' },
        { label: 'Daily traffic volume', value: inputs.expected_daily_traffic, key: 'traffic' },
        { label: 'Unit of randomization', value: design_card.randomization_unit, key: 'randomization' },
        { label: 'Traffic allocation', value: design_card.traffic_allocation, key: 'allocation' },
        { label: 'Target segment', value: design_card.population, key: 'segment' },
        { label: 'Guardrail metrics', value: design_card.guardrail_metrics.length > 0 ? true : null, key: 'guardrails' },
    ]

    const outputs = [
        { label: 'Sample size per variant', value: design_card.sample_size_per_variant, reason: 'Missing baseline rate or MDE' },
        { label: 'Estimated duration', value: design_card.estimated_duration_days, reason: 'Missing daily traffic volume' },
    ]

    return (
        <div className="surface-card rounded-xl border border-purple-500/20 overflow-hidden shadow-[0_0_30px_rgba(124,58,237,0.1)] flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-purple-500/10 bg-white/[0.02] flex justify-between items-center">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></span>
                    Experiment Output
                </h2>
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isReady
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                        {isReady ? 'Ready' : 'Draft'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        AI-assisted draft
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 bg-[#0B0F19]/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === tab.id
                                ? 'text-purple-400'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#0B0F19]/30">
                {activeTab === 'blueprint' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Goal & Hypothesis */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-[#0B0F19] p-4 rounded-lg border border-purple-500/10">
                                <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">Objective</h3>
                                <p className="text-sm text-slate-200 leading-relaxed font-medium">{design_card.goal}</p>
                            </div>
                            <div className="bg-[#0B0F19] p-4 rounded-lg border border-purple-500/10">
                                <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">Hypothesis</h3>
                                <p className="text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-line">{design_card.hypothesis}</p>
                            </div>
                        </div>

                        {/* Core Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-[#0B0F19] p-4 rounded-lg border border-white/5 relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Design</span>
                                <span className="text-sm font-bold text-white tracking-wide">{design_card.design_type}</span>
                            </div>
                            <div className="bg-[#0B0F19] p-4 rounded-lg border border-white/5 relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Variants</span>
                                <span className="text-sm font-bold text-white tracking-wide">{design_card.variants}</span>
                            </div>
                            <div className="bg-[#0B0F19] p-4 rounded-lg border border-white/5 relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-fuchsia-500" />
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Sample Size/Var</span>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white font-mono">
                                        {design_card.sample_size_per_variant ? design_card.sample_size_per_variant.toLocaleString() : 'Not available'}
                                    </span>
                                    {!design_card.sample_size_per_variant && (
                                        <span className="text-[8px] text-amber-500/70 font-medium leading-tight">Missing baseline or MDE</span>
                                    )}
                                </div>
                            </div>
                            <div className="bg-[#0B0F19] p-4 rounded-lg border border-white/5 relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Duration</span>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white font-mono">
                                        {design_card.estimated_duration_days ? `${design_card.estimated_duration_days} Days` : 'Not available'}
                                    </span>
                                    {!design_card.estimated_duration_days && (
                                        <span className="text-[8px] text-amber-500/70 font-medium leading-tight">Missing traffic volume</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Extended Detail Cards */}
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="surface-card p-4 rounded-lg border border-white/5">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                                    </svg>
                                    Population
                                </h3>
                                <p className="text-xs text-slate-300 italic">
                                    {design_card.population || "All eligible users (default)"}
                                </p>
                            </div>
                            <div className="surface-card p-4 rounded-lg border border-white/5">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    Randomization
                                </h3>
                                <p className="text-xs text-slate-300 italic">
                                    {design_card.randomization_unit || "User level (default assumption)"}
                                </p>
                            </div>
                            <div className="surface-card p-4 rounded-lg border border-white/5">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                    </svg>
                                    Allocation
                                </h3>
                                <p className="text-xs text-slate-300 italic">
                                    {design_card.traffic_allocation || "Even split (50/50)"}
                                </p>
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key Metrics</h4>
                                <div className="flex flex-wrap gap-2">
                                    {design_card.primary_metrics.map((m, i) => (
                                        <span key={i} className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium">
                                            Primary: {m}
                                        </span>
                                    ))}
                                    {design_card.guardrail_metrics.map((m, i) => (
                                        <span key={i} className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-medium">
                                            Guardrail: {m}
                                        </span>
                                    ))}
                                    {design_card.secondary_metrics.map((m, i) => (
                                        <span key={i} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[11px] font-medium">
                                            Secondary: {m}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'rationale' && (
                    <div className="animate-fade-in">
                        <div className="prose prose-invert max-w-none 
              prose-h1:text-sm prose-h1:font-bold prose-h1:uppercase prose-h1:tracking-widest prose-h1:text-purple-400 prose-h1:mb-4
              prose-p:text-sm prose-p:text-slate-300 prose-p:leading-relaxed
              prose-li:text-sm prose-li:text-slate-300
              prose-strong:text-white prose-strong:font-bold">
                            <ReactMarkdown>{llm_explanation}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {activeTab === 'next-steps' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Input Requirements */}
                        <section>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Inputs Provided vs Missing
                            </h3>
                            <div className="grid gap-2">
                                {nextSteps.map((step) => (
                                    <div key={step.key} className="flex items-center justify-between bg-[#0B0F19] p-3 rounded border border-white/5">
                                        <span className="text-xs text-slate-300 font-medium">{step.label}</span>
                                        <div className="flex items-center gap-2">
                                            {step.value ? (
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    Provided
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    Missing
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Output Requirements */}
                        <section>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Outputs Computed
                            </h3>
                            <div className="grid gap-2">
                                {outputs.map((out, i) => (
                                    <div key={i} className="flex items-center justify-between bg-[#0B0F19] p-3 rounded border border-white/5">
                                        <span className="text-xs text-slate-300 font-medium">{out.label}</span>
                                        <div className="flex flex-col items-end">
                                            {out.value ? (
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                                    Computed
                                                </span>
                                            ) : (
                                                <div className="text-right">
                                                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Not computed</span>
                                                    <span className="text-[9px] text-slate-500 italic leading-none">{out.reason}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/5 bg-slate-900/50 flex justify-center">
                <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
                    Standardized Experiment Specification • v2.0
                </p>
            </div>
        </div>
    )
}
