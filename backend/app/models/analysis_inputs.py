"""Pydantic models for analysis request inputs."""
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class VariantData(BaseModel):
    """Data for a single variant in A/B test."""
    name: str = Field(..., description="Variant name (e.g., 'control', 'treatment_a')")
    users: int = Field(..., gt=0, description="Number of users/impressions")
    clicks: Optional[int] = Field(None, ge=0, description="Number of clicks")
    orders: Optional[int] = Field(None, ge=0, description="Number of orders")
    revenue: Optional[float] = Field(None, ge=0, description="Total revenue")


class ABTestAnalysisRequest(BaseModel):
    """Request model for A/B test analysis endpoint."""
    variants: List[VariantData] = Field(..., min_length=2, description="List of variant data")
    overall_metric_type: Literal["ctr", "cvr", "revenue_per_user", "custom"] = Field(
        ..., description="Primary metric type"
    )


class DiDDataPoint(BaseModel):
    """Single data point for Difference-in-Differences analysis."""
    group: Literal["treatment", "control"] = Field(..., description="Treatment or control group")
    period: Literal["pre", "post"] = Field(..., description="Pre or post period")
    users: int = Field(..., gt=0, description="Number of users")
    outcome: float = Field(..., ge=0, description="Outcome value (conversion count, revenue, etc.)")


class CausalDiDRequest(BaseModel):
    """Request model for DiD causal analysis."""
    data: List[DiDDataPoint] = Field(..., description="List of data points")
    metric_type: Literal["proportion", "mean"] = Field(..., description="Type of metric")


class UpliftDataPoint(BaseModel):
    """Single data point for uplift modeling."""
    treatment: int = Field(..., ge=0, le=1, description="Treatment indicator (0 or 1)")
    outcome: int = Field(..., ge=0, le=1, description="Binary outcome (0 or 1)")
    features: Optional[Dict[str, Any]] = Field(None, description="Optional user features")


class CausalUpliftRequest(BaseModel):
    """Request model for uplift causal analysis."""
    data: List[UpliftDataPoint] = Field(..., description="List of data points with treatment and outcome")


class CausalAnalysisRequest(BaseModel):
    """Request model for causal analysis endpoint."""
    mode: Literal["did", "uplift"] = Field(..., description="Analysis mode")
    did_data: Optional[CausalDiDRequest] = Field(None, description="DiD data (required if mode='did')")
    uplift_data: Optional[CausalUpliftRequest] = Field(None, description="Uplift data (required if mode='uplift')")


