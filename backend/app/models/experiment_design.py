"""Pydantic models for experiment design requests and responses."""
from typing import List, Optional
from pydantic import BaseModel, Field


class ExperimentDesignRequest(BaseModel):
    """Request model for experiment design endpoint."""
    description: str = Field(..., description="Natural language description of the experiment")
    baseline_rate: Optional[float] = Field(None, ge=0, le=1, description="Baseline conversion rate (0-1)")
    minimum_detectable_effect: Optional[float] = Field(None, gt=0, description="Minimum detectable effect (relative or absolute)")
    alpha: float = Field(0.05, ge=0, le=1, description="Significance level")
    power: float = Field(0.8, ge=0, le=1, description="Statistical power")
    expected_daily_traffic: Optional[int] = Field(None, gt=0, description="Expected daily traffic/users")


class ExperimentDesignCard(BaseModel):
    """Structured experiment design card response."""
    goal: str = Field(..., description="Short plain English summary of the experiment goal")
    hypothesis: str = Field(..., description="H0 and H1 in natural language")
    primary_metrics: List[str] = Field(..., description="List of primary metrics")
    secondary_metrics: List[str] = Field(default_factory=list, description="List of secondary metrics")
    design_type: str = Field(..., description="Experiment type: A/B, A/B/n, or AA")
    variants: str = Field(..., description="Suggested number of variants and naming")
    population: Optional[str] = Field(None, description="Target population or segment")
    randomization_unit: Optional[str] = Field(None, description="Unit of randomization (e.g., user, session)")
    traffic_allocation: Optional[str] = Field(None, description="Traffic split across variants")
    sample_size_per_variant: Optional[int] = Field(None, description="Required sample size per variant")
    estimated_duration_days: Optional[int] = Field(None, description="Estimated experiment duration in days")
    guardrail_metrics: List[str] = Field(default_factory=list, description="List of guardrail metrics to monitor")
    notes: List[str] = Field(default_factory=list, description="Important design considerations")


class ExperimentDesignResponse(BaseModel):
    """Response model for experiment design endpoint."""
    design_card: ExperimentDesignCard
    llm_explanation: str = Field(..., description="Natural language explanation from LLM")


