"""FastAPI main application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import experiment_design, analysis_ab_test, analysis_causal, chat_agent
from app.core.config import settings

app = FastAPI(
    title="Growth Experiment Copilot",
    description="AI-powered experiment design and A/B test analysis",
    version="0.1.0"
)

# CORS middleware for frontend
# Allow localhost for development and Vercel deployments for production
allowed_origins = [
    "http://localhost:3000",  # Local development
    "http://localhost:3001",  # Alternative local port
    settings.FRONTEND_URL,     # Production frontend (from env var)
]

# Also allow all Vercel preview deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all Vercel deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(experiment_design.router, prefix=settings.API_V1_PREFIX, tags=["experiment-design"])
app.include_router(analysis_ab_test.router, prefix=settings.API_V1_PREFIX, tags=["analysis"])
app.include_router(analysis_causal.router, prefix=settings.API_V1_PREFIX, tags=["causal"])
app.include_router(chat_agent.router, prefix=settings.API_V1_PREFIX, tags=["agent-chat"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Growth Experiment Copilot API",
        "version": "0.2.0",
        "endpoints": {
            "agent_chat": f"{settings.API_V1_PREFIX}/agent-chat",
            "experiment_design": f"{settings.API_V1_PREFIX}/experiment-design",
            "analyze_ab_test": f"{settings.API_V1_PREFIX}/analyze-ab-test",
            "analyze_causal": f"{settings.API_V1_PREFIX}/analyze-causal"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


