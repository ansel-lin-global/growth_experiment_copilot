# Growth Experiment Copilot

> **Decisions Engineered by Causality.**

An AI-powered copilot for Product Managers and Marketing teams to design, analyze, and interpret growth experiments with statistical rigor. Turn experiment ideas into structured blueprints and raw results into actionable insights — all through natural language.

---

## Features

### 🤖 Agent Chat

Conversational AI agent that understands your intent and routes to the right tool automatically.

- Describe an experiment idea → generates a full design blueprint
- Paste A/B test numbers → returns statistical analysis with launch recommendation
- Ask about a causal question → runs Difference-in-Differences analysis
- Supports bilingual conversation (English / Traditional Chinese)

### 🧪 Experiment Design

Structured experiment planning with automatic sample size calculation.

- **Hypothesis formulation** — H0/H1 with one-sided or two-sided detection
- **Sample size & duration** — powered by baseline rate, MDE, alpha, and power inputs
- **Design blueprint** — goal, metrics, variants, randomization unit, traffic allocation
- **AI rationale** — decision rule, feasibility assessment, and risk analysis

### 📊 Results Analysis

Statistical analysis engine for A/B tests and causal inference.

**A/B Test Analysis**
- Proportion tests (CTR, CVR) and revenue metrics (RPU)
- Confidence intervals, p-values, and relative uplift
- Sample Ratio Mismatch (SRM) detection
- Multi-metric trade-off notes (CVR vs AOV vs RPU)

**Difference-in-Differences (DiD)**
- Supports both proportion (rate) and mean (numeric) metrics
- Proper unit handling: pp for proportions, raw units for means
- Statistical guardrails: no fabricated CI/p-value when variance is unavailable
- Parallel trends status and assumption checks

**AI Report Generation**
- 5-section professional report: Summary → Interpretation → Recommendation → Risks → Next Checks
- Guardrails against hallucinated statistics
- Copy-to-clipboard for easy sharing

---

## Architecture

```
growth-experiment-copilot/
├── backend/                    # FastAPI (Python 3.10+)
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat_agent.py           # POST /api/agent-chat
│   │   │   ├── experiment_design.py    # POST /api/experiment-design
│   │   │   ├── analysis_ab_test.py     # POST /api/analyze-ab-test
│   │   │   └── analysis_causal.py      # POST /api/analyze-causal
│   │   ├── services/
│   │   │   ├── agent_orchestrator.py   # Intent detection + tool routing
│   │   │   ├── agent_experiment_design.py  # Design blueprint generation
│   │   │   ├── agent_report_writer.py  # LLM report writer (A/B + DiD)
│   │   │   ├── stats_calculator.py     # Statistical tests (z-test, SRM)
│   │   │   └── causal_analyzer.py      # DiD estimator + uplift modeling
│   │   ├── models/                     # Pydantic request/response schemas
│   │   └── core/config.py             # Settings + env vars
│   └── requirements.txt
│
└── frontend/                   # Next.js 14 (App Router, TypeScript)
    ├── app/
    │   ├── page.tsx                    # Landing page
    │   ├── agent/page.tsx              # Agent Chat interface
    │   ├── experiment-design/page.tsx  # Experiment Design form
    │   └── analysis/page.tsx           # A/B Test + DiD analysis
    ├── components/                     # Shared UI components
    └── lib/api.ts                      # Backend API client
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API key

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env → set OPENAI_API_KEY=sk-...

uvicorn app.main:app --reload --port 8000
```

API available at `http://localhost:8000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | *(required)* | OpenAI API key |
| `LLM_MODEL` | `gpt-4o-mini` | Model for LLM calls |
| `LLM_TEMPERATURE` | `0.3` | LLM temperature |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL (frontend) |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/agent-chat` | Chat with the AI agent (auto-routes to tools) |
| `POST` | `/api/experiment-design` | Generate experiment blueprint + sample size |
| `POST` | `/api/analyze-ab-test` | Analyze A/B test with statistical tests |
| `POST` | `/api/analyze-causal` | Run DiD or uplift causal analysis |
| `GET` | `/health` | Health check |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI · Pydantic v2 · LangChain · OpenAI |
| **Statistics** | SciPy · statsmodels · NumPy · pandas · scikit-learn |
| **Frontend** | Next.js 14 · TypeScript · Tailwind CSS · React Markdown |
| **Deployment** | Render (backend) · Vercel (frontend) |

---

## Testing

```bash
cd backend
pytest
```

---

## License

MIT
