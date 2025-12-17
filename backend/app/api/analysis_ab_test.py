"""API endpoint for A/B test analysis."""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.models.analysis_inputs import ABTestAnalysisRequest
from app.models.analysis_outputs import (
    ABTestAnalysisResponse,
    VariantResult,
    ComparisonResult
)
from app.services.stats_calculator import calculate_proportion_difference, calculate_mean_difference
from app.services.agent_report_writer import ReportWriterAgent
from app.core.config import settings
import numpy as np

router = APIRouter()


@router.post("/analyze-ab-test", response_model=ABTestAnalysisResponse)
async def analyze_ab_test(request: ABTestAnalysisRequest):
    """
    Analyze an A/B or A/B/n test from aggregated variant data.
    
    Computes metrics (CTR, CVR, ARPU) and runs statistical tests.
    Generates a human-friendly report using LLM.
    """
    try:
        # Compute metrics for each variant
        variant_results = []
        for variant in request.variants:
            ctr = (variant.clicks / variant.users) if variant.clicks is not None and variant.users > 0 else None
            cvr = (variant.orders / variant.users) if variant.orders is not None and variant.users > 0 else None
            arpu = (variant.revenue / variant.users) if variant.revenue is not None and variant.users > 0 else None
            
            variant_results.append(VariantResult(
                name=variant.name,
                users=variant.users,
                clicks=variant.clicks,
                orders=variant.orders,
                revenue=variant.revenue,
                ctr=ctr,
                cvr=cvr,
                arpu=arpu
            ))
        
        # Find control variant (first one or one named "control")
        control_variant = None
        for v in variant_results:
            if v.name.lower() == "control":
                control_variant = v
                break
        if control_variant is None:
            control_variant = variant_results[0]
        
        # Determine primary metric based on overall_metric_type
        comparisons = []
        warnings = []
        
        # Check for low sample size
        min_users = min(v.users for v in variant_results)
        if min_users < settings.MIN_SAMPLE_SIZE_WARNING:
            warnings.append(f"Low sample size detected: minimum {min_users} users. Results may be unreliable.")
        
        # Compare each treatment to control
        for treatment in variant_results:
            if treatment.name == control_variant.name:
                continue
            
            if request.overall_metric_type == "ctr":
                if treatment.clicks is not None and control_variant.clicks is not None:
                    abs_diff, rel_uplift, (ci_lower, ci_upper), p_value = calculate_proportion_difference(
                        n1=control_variant.users,
                        x1=control_variant.clicks,
                        n2=treatment.users,
                        x2=treatment.clicks,
                        alpha=0.05
                    )
                    metric_name = "CTR"
                else:
                    continue
            
            elif request.overall_metric_type == "cvr":
                if treatment.orders is not None and control_variant.orders is not None:
                    abs_diff, rel_uplift, (ci_lower, ci_upper), p_value = calculate_proportion_difference(
                        n1=control_variant.users,
                        x1=control_variant.orders,
                        n2=treatment.users,
                        x2=treatment.orders,
                        alpha=0.05
                    )
                    metric_name = "CVR"
                else:
                    continue
            
            elif request.overall_metric_type == "revenue_per_user":
                if treatment.revenue is not None and control_variant.revenue is not None:
                    # For revenue, we need individual values, but we only have aggregates
                    # Use a simplified approach: assume normal distribution
                    # In practice, you'd want individual transaction data
                    # For MVP, we'll use a t-test approximation
                    control_mean = control_variant.arpu or 0
                    treatment_mean = treatment.arpu or 0
                    
                    # Simplified: use proportion test as approximation
                    # In production, you'd want actual transaction-level data
                    abs_diff = treatment_mean - control_mean
                    rel_uplift = (abs_diff / control_mean * 100) if control_mean > 0 else 0
                    
                    # Approximate p-value using z-test on means
                    # This is simplified - in production use proper t-test with individual data
                    se_control = control_mean * 0.1  # Simplified SE
                    se_treatment = treatment_mean * 0.1
                    se_diff = np.sqrt(se_control**2 / control_variant.users + se_treatment**2 / treatment.users)
                    z_stat = abs_diff / se_diff if se_diff > 0 else 0
                    from scipy import stats
                    p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))
                    ci_lower = abs_diff - 1.96 * se_diff
                    ci_upper = abs_diff + 1.96 * se_diff
                    metric_name = "Revenue per User"
                else:
                    continue
            else:
                # Custom metric - skip for MVP
                continue
            
            is_significant = p_value < 0.05
            
            comparisons.append(ComparisonResult(
                treatment_name=treatment.name,
                control_name=control_variant.name,
                metric_name=metric_name,
                absolute_difference=abs_diff,
                relative_uplift_percent=rel_uplift,
                p_value=p_value,
                ci_lower=ci_lower,
                ci_upper=ci_upper,
                is_significant=is_significant
            ))
        
        # Check for multiple comparisons
        if len(comparisons) > 1:
            warnings.append("Multiple comparisons detected. Consider adjusting for multiple testing (e.g., Bonferroni correction).")
        
        # Generate LLM report
        report_writer = ReportWriterAgent()
        llm_report = report_writer.write_ab_test_report(
            variant_results=[v.dict() for v in variant_results],
            comparisons=[c.dict() for c in comparisons],
            warnings=warnings
        )
        
        # Build structured results
        structured_results = {
            "variants": [v.dict() for v in variant_results],
            "comparisons": [c.dict() for c in comparisons],
            "primary_metric": request.overall_metric_type
        }
        
        return ABTestAnalysisResponse(
            structured_results=structured_results,
            llm_report_markdown=llm_report,
            warnings=warnings
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing A/B test: {str(e)}")


