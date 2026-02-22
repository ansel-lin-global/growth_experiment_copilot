"""API endpoint for A/B test analysis."""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.models.analysis_inputs import ABTestAnalysisRequest
from app.models.analysis_outputs import (
    ABTestAnalysisResponse,
    VariantResult,
    ComparisonResult
)
from app.services.stats_calculator import (
    calculate_proportion_difference,
    calculate_mean_difference,
    check_sample_ratio_mismatch
)
from app.services.agent_report_writer import ReportWriterAgent
from app.core.config import settings
import numpy as np

router = APIRouter()


@router.post("/analyze-ab-test", response_model=ABTestAnalysisResponse)
async def analyze_ab_test(request: ABTestAnalysisRequest):
    """
    Analyze an A/B or A/B/n test from aggregated variant data.
    
    Computes metrics (CTR, CVR, RPU, AOV) and runs statistical tests.
    Generates a human-friendly report using LLM.
    
    Sign Convention: diff = p_treatment - p_control
    Positive values indicate treatment performed better than control.
    """
    try:
        warnings = []
        
        # Input validation: Check for negative revenue
        for variant in request.variants:
            if variant.revenue is not None and variant.revenue < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Variant '{variant.name}' has negative revenue ({variant.revenue}). Revenue must be >= 0."
                )
        
        # Compute metrics for each variant
        variant_results = []
        for variant in request.variants:
            ctr = (variant.clicks / variant.users) if variant.clicks is not None and variant.users > 0 else None
            cvr = (variant.orders / variant.users) if variant.orders is not None and variant.users > 0 else None
            arpu = (variant.revenue / variant.users) if variant.revenue is not None and variant.users > 0 else None
            
            # AOV: Average Order Value = revenue / orders
            aov = None
            if variant.revenue is not None and variant.orders is not None and variant.orders > 0:
                aov = variant.revenue / variant.orders
            
            variant_results.append(VariantResult(
                name=variant.name,
                users=variant.users,
                clicks=variant.clicks,
                orders=variant.orders,
                revenue=variant.revenue,
                ctr=ctr,
                cvr=cvr,
                arpu=arpu,
                aov=aov
            ))
        
        # SRM Check: Compare observed user counts to expected allocation
        observed_counts = [v.users for v in variant_results]
        has_srm, srm_p_value, srm_message = check_sample_ratio_mismatch(
            observed_counts=observed_counts,
            expected_ratios=request.expected_allocation,
            alpha=0.01
        )
        if has_srm:
            warnings.insert(0, srm_message)  # Put SRM warning first
        
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
        
        # Check for low sample size
        min_users = min(v.users for v in variant_results)
        if min_users < settings.MIN_SAMPLE_SIZE_WARNING:
            warnings.append(f"Low sample size detected: minimum {min_users} users. Results may be unreliable.")
        
        # Compare each treatment to control
        for treatment in variant_results:
            if treatment.name == control_variant.name:
                continue
            
            stat_warnings = []
            
            if request.overall_metric_type == "ctr":
                if treatment.clicks is not None and control_variant.clicks is not None:
                    abs_diff, rel_uplift, (ci_lower, ci_upper), p_value, stat_warnings = calculate_proportion_difference(
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
                    abs_diff, rel_uplift, (ci_lower, ci_upper), p_value, stat_warnings = calculate_proportion_difference(
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
                    # RPU = Revenue Per User = revenue / users
                    # This is a simple ratio, computed directly
                    control_rpu = control_variant.arpu or 0
                    treatment_rpu = treatment.arpu or 0
                    
                    abs_diff = treatment_rpu - control_rpu
                    rel_uplift = (abs_diff / control_rpu * 100) if control_rpu > 0 else 0
                    
                    # For aggregate data without individual values, we use a simplified
                    # variance estimate. In production with individual data, use proper t-test.
                    # This provides approximate p-value/CI for decision guidance.
                    se_control = control_rpu * 0.1  # Approximate SE based on coefficient of variation
                    se_treatment = treatment_rpu * 0.1
                    se_diff = np.sqrt(se_control**2 / control_variant.users + se_treatment**2 / treatment.users)
                    z_stat = abs_diff / se_diff if se_diff > 0 else 0
                    from scipy import stats as scipy_stats
                    p_value = 2 * (1 - scipy_stats.norm.cdf(abs(z_stat)))
                    ci_lower = abs_diff - 1.96 * se_diff
                    ci_upper = abs_diff + 1.96 * se_diff
                    metric_name = "Revenue per User"
                    
                    stat_warnings.append(
                        "RPU statistical test uses approximate variance estimation from aggregate data. "
                        "For precise inference, use individual-level transaction data."
                    )
                else:
                    continue
            else:
                # Custom metric - skip for MVP
                continue
            
            # Add statistical warnings from proportion difference calculation
            warnings.extend(stat_warnings)
            
            is_significant = bool(p_value < 0.05)
            
            comparisons.append(ComparisonResult(
                treatment_name=treatment.name,
                control_name=control_variant.name,
                metric_name=metric_name,
                absolute_difference=float(abs_diff),
                relative_uplift_percent=float(rel_uplift),
                p_value=float(p_value),
                ci_lower=float(ci_lower),
                ci_upper=float(ci_upper),
                is_significant=is_significant
            ))
        
        # Check for multiple comparisons
        if len(comparisons) > 1:
            warnings.append("Multiple comparisons detected. Consider adjusting for multiple testing (e.g., Bonferroni correction).")
        
        # Generate trade-off notes if we have multiple metrics
        trade_off_notes = generate_trade_off_notes(variant_results, control_variant)
        
        # Generate LLM report
        report_writer = ReportWriterAgent()
        llm_report = report_writer.write_ab_test_report(
            variant_results=[v.model_dump() for v in variant_results],
            comparisons=[c.model_dump() for c in comparisons],
            warnings=warnings,
            trade_off_notes=trade_off_notes,
            primary_metric=request.overall_metric_type
        )
        
        # Build structured results (cast numpy types to native Python for Pydantic v2 serialization)
        structured_results = {
            "variants": [v.model_dump() for v in variant_results],
            "comparisons": [c.model_dump() for c in comparisons],
            "primary_metric": request.overall_metric_type,
            "has_srm": bool(has_srm),
            "srm_p_value": float(srm_p_value) if has_srm else None
        }
        
        return ABTestAnalysisResponse(
            structured_results=structured_results,
            llm_report_markdown=llm_report,
            warnings=warnings
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing A/B test: {str(e)}")


def generate_trade_off_notes(variant_results: List[VariantResult], control_variant: VariantResult) -> str:
    """
    Generate trade-off notes comparing metrics across variants.
    
    Example output: "CVR up +30%, AOV down -5%, RPU up +23%"
    """
    notes = []
    
    for treatment in variant_results:
        if treatment.name == control_variant.name:
            continue
        
        treatment_notes = []
        
        # CVR comparison
        if treatment.cvr is not None and control_variant.cvr is not None and control_variant.cvr > 0:
            cvr_change = (treatment.cvr - control_variant.cvr) / control_variant.cvr * 100
            direction = "up" if cvr_change > 0 else "down"
            treatment_notes.append(f"CVR {direction} {cvr_change:+.1f}%")
        
        # AOV comparison
        if treatment.aov is not None and control_variant.aov is not None and control_variant.aov > 0:
            aov_change = (treatment.aov - control_variant.aov) / control_variant.aov * 100
            direction = "up" if aov_change > 0 else "down"
            treatment_notes.append(f"AOV {direction} {aov_change:+.1f}%")
        
        # RPU comparison
        if treatment.arpu is not None and control_variant.arpu is not None and control_variant.arpu > 0:
            rpu_change = (treatment.arpu - control_variant.arpu) / control_variant.arpu * 100
            direction = "up" if rpu_change > 0 else "down"
            treatment_notes.append(f"RPU {direction} {rpu_change:+.1f}%")
        
        if treatment_notes:
            notes.append(f"**{treatment.name}**: " + ", ".join(treatment_notes))
    
    return "\n".join(notes) if notes else ""
