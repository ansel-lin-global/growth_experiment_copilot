import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          <span className="text-glow">Growth Experiment</span>
          <br />
          <span className="text-glow-rainbow">Copilot</span>
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
          <span className="bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan bg-clip-text text-transparent font-semibold">AI copilot for trustworthy product experiments.</span>
          <br />
          <span className="text-gray-400 text-lg">Design statistically sound experiments, analyze A/B and campaign results, and turn data into confident launch decisions.</span>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <Link
          href="/experiment-design"
          className="group block p-8 glass rounded-xl glass-hover relative overflow-hidden transition-all duration-500 hover:shadow-neon-rainbow"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-neon-pink/20 to-neon-magenta/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-neon-purple via-neon-pink to-neon-magenta rounded-lg flex items-center justify-center mr-4 shadow-neon-rainbow animate-pulse-slow">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h2 
                className="text-2xl font-semibold transition-all duration-300"
                style={{
                  background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #d946ef, #8b5cf6)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: '#8b5cf6',
                }}
              >
                Experiment Design Copilot
              </h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Describe your experiment idea in plain English. Get a complete experiment design
              with sample size calculations, hypothesis formulation, and design recommendations.
            </p>
            <div 
              className="mt-6 flex items-center text-sm font-medium transition-all duration-300"
              style={{
                background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: '#8b5cf6',
              }}
            >
              <span className="mr-2">Get Started</span>
              <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#ec4899' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </Link>

        <Link
          href="/analysis"
          className="group block p-8 glass rounded-xl glass-hover relative overflow-hidden transition-all duration-500 hover:shadow-neon-rainbow"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 via-neon-blue/20 to-neon-magenta/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-neon-cyan via-neon-blue to-neon-magenta rounded-lg flex items-center justify-center mr-4 shadow-neon-rainbow animate-pulse-slow">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 
                className="text-2xl font-semibold transition-all duration-300"
                style={{
                  background: 'linear-gradient(90deg, #06b6d4, #3b82f6, #d946ef, #06b6d4)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: '#06b6d4',
                }}
              >
                Results Analysis Copilot
              </h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Upload your A/B test results or causal experiment data. Get statistical analysis,
              confidence intervals, and AI-generated insights with actionable recommendations.
            </p>
            <div 
              className="mt-6 flex items-center text-sm font-medium transition-all duration-300"
              style={{
                background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: '#06b6d4',
              }}
            >
              <span className="mr-2">Get Started</span>
              <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#3b82f6' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-16 text-center">
        <p className="text-gray-400 text-sm">
          <span className="bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan bg-clip-text text-transparent font-semibold">Powered by AI</span>
          <span className="mx-2 text-gray-600">•</span>
          <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-magenta bg-clip-text text-transparent font-semibold">Built for Product Teams</span>
        </p>
      </div>
    </div>
  )
}
