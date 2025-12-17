"""API endpoint for Agent Chat."""
from fastapi import APIRouter, HTTPException
from app.models.chat_agent import AgentChatRequest, AgentChatResponse
from app.services.agent_orchestrator import GrowthExperimentAgent

router = APIRouter()

# Lazy initialization of the agent to avoid import-time errors
_agent = None


def get_agent():
    """Get or create the agent instance."""
    global _agent
    if _agent is None:
        _agent = GrowthExperimentAgent()
    return _agent


@router.post("/agent-chat", response_model=AgentChatResponse)
async def agent_chat(request: AgentChatRequest):
    """
    Chat with the Growth Experiment Agent.
    
    The agent can:
    1. Design experiments from natural language descriptions
    2. Analyze A/B test results and provide recommendations
    3. Perform causal/DiD analysis for non-randomized experiments
    
    The agent will automatically detect user intent and ask clarifying
    questions if more information is needed.
    """
    try:
        agent = get_agent()
        result = await agent.process_message(request.messages)
        
        return AgentChatResponse(
            reply=result["reply"],
            detected_intent=result["detected_intent"],
            extra=result.get("extra")
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing chat message: {str(e)}"
        )

