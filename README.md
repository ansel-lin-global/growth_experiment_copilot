# Growth Experiment Copilot

AI-powered experiment design and A/B test analysis for product managers and marketers.

## ✨ What's New: Agent Chat

The **Agent Chat** (`/agent`) is now the main entry point! Simply describe your needs in natural language, and the AI agent will:

1. **設計實驗 (Experiment Design)** - Describe your experiment idea, get sample size calculations and design recommendations
2. **分析 A/B 測試 (A/B Test Analysis)** - Provide your test results, get statistical analysis and launch recommendations  
3. **因果分析 (Causal/DiD Analysis)** - Analyze non-randomized experiments with Difference-in-Differences

### Example Queries

```
"我想設計一個首頁推薦位的 A/B 測試"
"幫我分析這個 AB test：control 有 1000 用戶 50 轉換，treatment 有 1000 用戶 65 轉換"
"雙十一 EDM 的 treatment group 好像沒什麼 uplift，想做 DiD 分析"
```

## Project Structure

```
growth-experiment-copilot/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # API endpoints (including agent-chat)
│   │   ├── core/     # Configuration
│   │   ├── models/   # Pydantic models
│   │   ├── services/ # Business logic (including agent_orchestrator)
│   │   └── tests/    # Unit tests
│   └── requirements.txt
└── frontend/         # Next.js frontend
    ├── app/          # Next.js app router pages
    │   ├── agent/    # Agent Chat page (main entry)
    │   ├── analysis/ # Results Analysis page
    │   └── experiment-design/ # Experiment Design page
    ├── components/   # React components
    └── lib/          # Utilities and API client
```

## Quick Start

1. Start the backend:
```bash
cd backend
source venv/bin/activate  # If using virtual environment
export OPENAI_API_KEY=your_api_key_here
uvicorn app.main:app --reload --port 8000
```

2. Start the frontend:
```bash
cd frontend
npm run dev
```

3. Open http://localhost:3000/agent to start chatting with the Growth Experiment Agent!

## Setup

### Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set environment variables:
```bash
export OPENAI_API_KEY=your_api_key_here
```

5. Run the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set environment variable (optional, defaults to localhost:8000):
```bash
export NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Features

### Experiment Design Copilot
- Natural language experiment description
- Automatic sample size calculation
- Hypothesis formulation
- Design recommendations

### Results Analysis Copilot
- A/B test analysis with statistical tests
- Difference-in-Differences (DiD) causal analysis
- Uplift modeling (basic MVP)
- AI-generated insights and recommendations

## API Endpoints

- `POST /api/agent-chat` - **[NEW]** Chat with the Growth Experiment Agent
- `POST /api/experiment-design` - Design an experiment
- `POST /api/analyze-ab-test` - Analyze A/B test results
- `POST /api/analyze-causal` - Perform causal analysis (DiD or uplift)

### Agent Chat API

```bash
curl -X POST http://localhost:8000/api/agent-chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "我想設計一個首頁推薦位的 A/B 測試"}
    ]
  }'
```

Response:
```json
{
  "reply": "...(Agent response in Traditional Chinese)...",
  "detected_intent": "experiment_design|ab_test_analysis|causal_analysis|clarification_needed|general_conversation",
  "extra": { "tool_used": "...", ... }
}
```

## Testing

Run backend tests:
```bash
cd backend
pytest
```

## Tech Stack

**Backend:**
- FastAPI
- LangChain (OpenAI)
- scipy, statsmodels (statistics)
- pandas, numpy (data processing)

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Markdown

## License

MIT


