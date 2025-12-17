"""Pydantic models for analysis response outputs."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class VariantResult(BaseModel):
    """Results for a single variant."""
    name: str
    users: int
    clicks: Optional[int] = None
    orders: Optional[int] = None
    revenue: Optional[float] = None
    ctr: Optional[float] = None
    cvr: Optional[float] = None
    arpu: Optional[float] = None


class ComparisonResult(BaseModel):
    """Comparison between treatment and control."""
    treatment_name: str
    control_name: str
    metric_name: str
    absolute_difference: float
    relative_uplift_percent: float
    p_value: float
    ci_lower: float
    ci_upper: float
    is_significant: bool = Field(..., description="Whether result is statistically significant at 95% confidence")


class ABTestAnalysisResponse(BaseModel):
    """Response model for A/B test analysis."""
    structured_results: Dict[str, Any] = Field(..., description="Structured numeric results")
    llm_report_markdown: str = Field(..., description="Human-friendly markdown report from LLM")
    warnings: List[str] = Field(default_factory=list, description="Warnings about sample size, power, etc.")


class DiDResult(BaseModel):
    """Results for Difference-in-Differences analysis."""
    treatment_pre: float
    treatment_post: float
    control_pre: float
    control_post: float
    pre_difference: float
    post_difference: float
    did_estimate: float
    ci_lower: float
    ci_upper: float
    p_value: Optional[float] = None


class CausalDiDResponse(BaseModel):
    """Response model for DiD causal analysis."""
    numeric_results: DiDResult
    llm_report_markdown: str


class UpliftBucket(BaseModel):
    """Summary statistics for an uplift bucket."""
    bucket_name: str
    average_predicted_uplift: float
    fraction_of_users: float
    estimated_incremental_conversions: Optional[float] = None


class CausalUpliftResponse(BaseModel):
    """Response model for uplift causal analysis."""
    numeric_results: Dict[str, Any] = Field(..., description="Uplift modeling results")
    llm_report_markdown: str


