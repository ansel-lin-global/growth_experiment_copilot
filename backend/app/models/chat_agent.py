"""Pydantic models for Chat Agent API."""
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Single message in conversation."""
    role: Literal["user", "assistant", "system"] = Field(
        ..., description="Role of the message sender"
    )
    content: str = Field(..., description="Message content")


class AgentChatRequest(BaseModel):
    """Request model for agent chat endpoint."""
    messages: List[ChatMessage] = Field(
        ..., min_length=1, description="Conversation history"
    )
    conversation_id: Optional[str] = Field(
        None, description="Optional conversation ID for future session management"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Optional metadata like user role or locale"
    )


class AgentChatResponse(BaseModel):
    """Response model for agent chat endpoint."""
    reply: str = Field(
        ..., description="Natural language response to show to the user"
    )
    detected_intent: Literal[
        "experiment_design",
        "ab_test_analysis", 
        "causal_analysis",
        "clarification_needed",
        "general_conversation"
    ] = Field(
        ..., description="Detected user intent"
    )
    extra: Optional[Dict[str, Any]] = Field(
        None, description="Optional debug info like tool used and internal reasoning"
    )

