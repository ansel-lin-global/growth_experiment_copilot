import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 w-full">
        {/* Hero Section */}
        <div className="text-center mb-20 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight leading-[1.1]">
            Decisions Engineered <br />
            <span className="text-gradient-magma">By Causality.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
            A precision copilot for PM and Marketing teams. Turn growth experiments into
            mathematically proven strategies with AI-driven design and analysis.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          <Link
            href="/agent"
            className="group block p-8 surface-card rounded-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 blur-[60px] rounded-full group-hover:bg-fuchsia-500/20 transition-all" />

            <div className="relative z-10">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center mr-4 group-hover:border-fuchsia-500/50 transition-colors">
                  <svg className="w-6 h-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-slate-100 group-hover:text-white transition-colors">
                  Agent Chat
                </h2>
              </div>

              <p className="text-slate-400 text-sm leading-relaxed mb-6 group-hover:text-slate-300 transition-colors">
                Interact with our AI agent to brainstorm ideas, design experiments, and interpret results through natural language conversation.
              </p>

              <div className="flex items-center text-sm font-medium text-fuchsia-400 group-hover:text-fuchsia-300 transition-colors">
                <span>Start Chatting</span>
                <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/experiment-design"
            className="group block p-8 surface-card rounded-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[60px] rounded-full group-hover:bg-purple-500/20 transition-all" />

            <div className="relative z-10">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center mr-4 group-hover:border-purple-500/50 transition-colors">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-slate-100 group-hover:text-white transition-colors">
                  Experiment Design
                </h2>
              </div>

              <p className="text-slate-400 text-sm leading-relaxed mb-6 group-hover:text-slate-300 transition-colors">
                Generate statistically robust designs. Get sample size calculations, hypothesis formulation, and control group recommendations.
              </p>

              <div className="flex items-center text-sm font-medium text-purple-400 group-hover:text-purple-300 transition-colors">
                <span>Start Designing</span>
                <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/analysis"
            className="group block p-8 surface-card rounded-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[60px] rounded-full group-hover:bg-rose-500/20 transition-all" />

            <div className="relative z-10">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center mr-4 group-hover:border-rose-500/50 transition-colors">
                  <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-slate-100 group-hover:text-white transition-colors">
                  Results Analysis
                </h2>
              </div>

              <p className="text-slate-400 text-sm leading-relaxed mb-6 group-hover:text-slate-300 transition-colors">
                Upload results for causal analysis. Get confidence intervals, impact estimation, and AI-generated insights.
              </p>

              <div className="flex items-center text-sm font-medium text-rose-400 group-hover:text-rose-300 transition-colors">
                <span>Analyze Data</span>
                <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-24 text-center border-t border-white/5 pt-8">
          <p className="text-slate-600 font-mono text-xs tracking-wider uppercase">
            System Status: <span className="text-purple-500">Online</span> • v2.0 Causal Engine
          </p>
        </div>
      </div>
    </div>
  )
}
