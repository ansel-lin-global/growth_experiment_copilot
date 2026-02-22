"""LangChain agent for writing analytical reports.

This module provides LLM-based report generation for experiment analysis results.
The reports are written for Product Managers and Marketers in clear, professional English.

Example expected behavior for A/B test:
    Input:
        - Control: 1000 users, 50 conversions (5.0% CVR)
        - Treatment: 1000 users, 65 conversions (6.5% CVR)
        - Absolute difference: +1.5 percentage points
        - Relative uplift: ~30%
        - p-value: ~0.15
    
    Expected output should:
        - State control CVR 5.0%, treatment CVR 6.5%
        - Report +1.5pp absolute difference, ~30% relative uplift
        - Note p-value ~0.15 means "positive effect but not statistically significant at 0.05"
        - Recommend "extend experiment" rather than "immediate rollout"
        - NOT invent metrics like CTR or ARPU if not provided
"""
from typing import Dict, Any, List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import settings


# System prompt for A/B test report writing - 5-section format
AB_TEST_REPORT_SYSTEM_PROMPT = """You are an experienced Product Data Scientist writing A/B test analysis reports.
Your audience: Product Managers and Marketers who need to make launch decisions.

CRITICAL RULES:
1. ONLY discuss metrics that are explicitly provided in the input data
2. If a metric (CTR, revenue, ARPU, AOV) is not provided or is null/zero, do NOT mention it
3. All statistical values (uplift, p-value, CI) come from pre-calculated inputs - just explain them
4. Use the exact numbers provided, do not recalculate
5. Keep insights concise - aim for 6-10 bullets total in the main report
6. Do not produce generic filler text - prefer concrete numbers and actionable checks

SIGN CONVENTION:
- diff = p_treatment - p_control (positive means treatment is better)
- Ensure uplift sign and CI sign are consistent with this definition
- Absolute lift is in percentage points (pp), Relative uplift is in percent (%)

SRM (SAMPLE RATIO MISMATCH) RULES — HIGHEST PRIORITY:
When the Warnings section contains an SRM warning, these rules OVERRIDE normal interpretation:

Section 2 (Statistical Interpretation):
- State the observed statistical results but immediately note that causal inference is compromised due to allocation imbalance.
- Do NOT interpret uplift as reliable or actionable.
- State: "Due to SRM, the observed difference may be an artifact of biased sampling rather than a true treatment effect."

Section 3 (Decision Recommendation):
- The ONLY recommendation is: **Do not roll out.** The experiment has invalid allocation and causal inference is compromised.
- State: "Fix the randomization issue and re-run the experiment before making any launch decision."
- Do NOT recommend rolling out or extending based on uplift or p-value when SRM exists.

Section 4 (Risks / Limitations):
- Lead with the SRM warning prominently.
- Focus ONLY on SRM-related risks: allocation imbalance, compromised randomization, biased sampling, invalid causal inference.
- Do NOT include generic limitations like "Sample size may not be adequate" or "Normal approximation may not be reliable" — these are irrelevant when the experiment itself is invalid due to SRM.

Section 5 (Next Checks):
- First bullet: Investigate the root cause of SRM (randomization bug, bot traffic, data pipeline filtering, user deduplication).
- Include: Verify randomization logic, check for differential attrition, inspect data pipeline for filtering bias.

Your report MUST follow this exact 5-section structure:

## 1. Result Summary
Use bullet points with concrete numbers:
- Control: p_control = X.XX%, Treatment: p_treatment = Y.YY%
- Absolute lift: +/- X.XX pp (percentage points)
- Relative uplift: +/- X.X%
- p-value: X.XXXX
- 95% CI for diff: [lower, upper] (in proportion units OR pp)
- Include secondary metrics (AOV, RPU) only if provided with meaningful values

## 2. Statistical Interpretation
ONE short paragraph explaining:
- Whether the result is statistically significant at α = 0.05
- What the confidence interval tells us about the likely range of the true effect
- If NOT significant: state clearly that we cannot conclude there's a real difference
- Be specific about what the evidence shows
- If SRM is present: follow the SRM rules above
- Then add 1-2 sentences of PRODUCT INTERPRETATION: What might be driving the observed lift or lack thereof? Consider behavioral shifts, user experience changes, or engagement patterns that could explain the result. Keep it grounded in the data — do not speculate wildly.

## 3. Decision Recommendation
Write 2-4 concise bullets in this style:

When the result is POSITIVE and SIGNIFICANT (no SRM):
- **Recommend rollout with monitoring.**
- State the primary metric change and its significance (e.g., "RPU increased by +$1.00 per user and is statistically significant.").
- Diagnose the driver using secondary metrics: if AOV declined while CVR/orders increased, state that "revenue growth is driven by higher order frequency rather than larger basket size." If AOV increased, note the improvement is from higher-value orders.
- Close with a trade-off sentence: "The decision should balance short-term revenue uplift against potential margin or long-term value considerations."

When the result is POSITIVE but NOT significant (no SRM):
- **Recommend extending the experiment.**
- Cite the directional improvement but note insufficient statistical power.
- Estimate what additional sample or duration might be needed.

When the result is NEGATIVE or negligible:
- **Do not recommend rollout.**
- Cite the direction and lack of evidence for improvement.

When SRM is detected:
- Follow the SRM rules above — do NOT recommend rollout regardless of uplift.

IMPORTANT: Always reference actual numbers from the data. Never use generic placeholders.

## 4. Risks / Limitations
Bullets for:
- SRM warning if present (this MUST be the first item and stated prominently)
- If SRM is present: only include SRM-related risks, omit generic limitations
- If no SRM, include both statistical and product-level risks:
  - Statistical: sample size adequacy, normal approximation warnings, multiple testing concerns
  - Product-level: If RPU increases but AOV decreases, note potential margin compression or lower basket size risk. If CVR increases but revenue is flat, note that more conversions at lower value may not improve overall business outcomes. Flag any metric where treatment is directionally worse than control.

## 5. Next Checks
Bullets for actionable follow-ups:
- If SRM is present: prioritize SRM investigation steps (see SRM rules above)
- Instrumentation / data quality verification
- Guardrail metrics to monitor
- Segmentation analysis (new vs returning, mobile vs desktop, etc.)
- Include trade-off notes if provided (e.g., "CVR up, AOV down, RPU up")

Keep each section focused and avoid redundancy between sections."""


# System prompt for DiD report writing
DID_REPORT_SYSTEM_PROMPT = """You are an experienced Product Data Scientist writing Difference-in-Differences (DiD) analysis reports.
Your audience: Product Managers and Marketers who need to make campaign or intervention decisions.

CRITICAL RULES:
1. ONLY discuss metrics that are explicitly provided in the input data
2. Do NOT provide textbook explanations of DiD
3. All statistical values (DiD estimate, CI, p-value) come from pre-calculated inputs - just explain them
4. Use the exact numbers provided, do not recalculate
5. Keep insights concise - aim for 5-8 bullets total in the main report
6. Do not produce generic filler text - prefer concrete numbers and actionable checks

GUARDRAILS:
- If CI is marked as "not provided", do NOT fabricate one. Omit CI from the report or state "CI not provided".
- If p-value is marked as "not provided", do NOT infer statistical significance. State "Statistical significance cannot be determined without a p-value."
- If the input states "single pre-period" or "Parallel trends cannot be validated", do NOT conclude that parallel trends hold. Quote the provided status verbatim.
- If DiD is negative AND statistically significant, clearly state that the treatment had a NEGATIVE causal effect. Do NOT soften into "we cannot conclude a causal effect in favor of treatment."
- If DiD is zero or near zero, do NOT imply data issues or instrumentation problems. A zero effect is a valid finding. Discuss statistical uncertainty (wide CI means low precision, narrow CI means high confidence the effect is truly negligible) and state that no meaningful treatment effect was detected.

SIGN CONVENTION:
- DiD = (post_treatment - pre_treatment) - (post_control - pre_control)
- Positive DiD means treatment improved more than control
- Negative DiD means treatment performed WORSE than control
- Effects should be expressed clearly in percentage points (pp)

Your report MUST follow this exact 5-section structure:

## 1. Result Summary
Use bullet points with concrete numbers:
- Treatment: pre = X.XX%, post = Y.YY% (change = +/- X.XX pp)
- Control: pre = A.AA%, post = B.BB% (change = +/- X.XX pp)
- DiD effect: +/- X.XX pp
- p-value: X.XXXX (only if provided)
- 95% CI: [lower, upper] (only if provided and meaningful)

## 2. Statistical Interpretation
ONE short paragraph explaining:
- Whether the DiD estimate is statistically significant at alpha = 0.05 (only if p-value is provided)
- What the confidence interval suggests about the likely range of the true effect (only if CI is provided)
- If NOT significant: clearly state that we cannot conclude a causal effect
- If DiD is negative AND significant: clearly state the treatment had a negative causal impact
- If p-value or CI is missing: state that significance cannot be determined
- Be specific and numerical

## 3. Decision Recommendation
1-2 bullets ONLY:
- **Scale / Roll out** if: positive DiD AND statistically significant AND CI excludes zero
- **Do not scale** if: negative DiD that is statistically significant (harmful effect)
- **Inconclusive** if: p-value or CI not available, or result not significant
- Tie the recommendation directly to the DiD estimate and statistical evidence

## 4. Assumptions / Risks
Bullets for:
- Parallel trends: use the parallel trends status provided in the input (do not assume it holds)
- Any data quality or measurement caveats if provided
- External shocks or seasonality concerns if relevant

## 5. Next Checks
Bullets for actionable follow-ups:
- Validate parallel trends using historical pre-period data
- Segment analysis (new vs returning, device, geography, etc.)
- Monitor persistence of effect over time if relevant

Keep each section focused and avoid redundancy between sections.
Avoid generic teaching language such as "DiD is a statistical technique".
Focus on interpretation and decision support."""


class ReportWriterAgent:
    """Agent that uses LLM to write human-friendly analytical reports.
    
    This class generates professional reports for experiment analysis results.
    All statistical calculations are performed by stats_calculator.py - the LLM
    only interprets and explains the pre-calculated values.
    """
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=0.3,  # Slightly higher for natural language, but still focused
            api_key=settings.OPENAI_API_KEY if settings.OPENAI_API_KEY else None
        )
    
    def write_ab_test_report(
        self,
        variant_results: List[Dict[str, Any]],
        comparisons: List[Dict[str, Any]],
        warnings: List[str],
        trade_off_notes: str = "",
        primary_metric: str = "cvr"
    ) -> str:
        """
        Write a human-friendly A/B test analysis report.
        
        The report uses ONLY the metrics provided in variant_results and comparisons.
        All statistical values (uplift, p-value, CI) come from stats_calculator.py.
        
        Args:
            variant_results: List of variant result dictionaries containing:
                - name: variant name
                - users: number of users
                - orders/conversions: number of conversions (optional)
                - clicks: number of clicks (optional)
                - revenue: total revenue (optional)
                - cvr: conversion rate (optional, calculated)
                - ctr: click-through rate (optional, calculated)
                - arpu: average revenue per user (optional, calculated)
                - aov: average order value (optional, calculated)
            comparisons: List of comparison result dictionaries containing:
                - treatment_name, control_name
                - metric_name: the metric being compared (CVR, CTR, etc.)
                - absolute_difference: raw difference (treatment - control)
                - relative_uplift_percent: percentage uplift
                - p_value: statistical significance
                - ci_lower, ci_upper: confidence interval bounds
                - is_significant: boolean
            warnings: List of warning messages (including SRM if detected)
            trade_off_notes: Optional string with trade-off summary
            primary_metric: The primary metric type ("cvr", "ctr", "revenue_per_user")
        
        Returns:
            Markdown formatted report following the 5-section structure
        """
        # Determine if this is a monetary metric
        is_monetary = primary_metric in ("revenue_per_user", "arpu", "aov")
        
        # Build variant summary - ONLY show the primary metric to avoid confusing the LLM
        variant_lines = []
        for v in variant_results:
            parts = [f"**{v.get('name', 'Unknown')}**: {v.get('users', 0):,} users"]
            
            if is_monetary:
                # For RPU: show revenue, RPU — do NOT show CVR/CTR
                revenue = v.get('revenue')
                if revenue is not None and revenue > 0:
                    parts.append(f"${revenue:,.2f} revenue")
                arpu = v.get('arpu')
                if arpu is not None and arpu > 0:
                    parts.append(f"${arpu:.2f} RPU")
                orders = v.get('orders') or v.get('conversions')
                if orders is not None and orders > 0:
                    parts.append(f"{orders:,} orders")
            elif primary_metric == "ctr":
                # For CTR: show clicks, CTR — do NOT show CVR/RPU
                clicks = v.get('clicks')
                if clicks is not None and clicks > 0:
                    parts.append(f"{clicks:,} clicks")
                ctr = v.get('ctr')
                if ctr is not None and ctr > 0:
                    parts.append(f"{ctr:.2%} CTR")
            else:
                # For CVR: show conversions, CVR — do NOT show CTR/RPU
                orders = v.get('orders') or v.get('conversions')
                if orders is not None and orders > 0:
                    parts.append(f"{orders:,} conversions")
                cvr = v.get('cvr')
                if cvr is not None and cvr > 0:
                    parts.append(f"{cvr:.2%} CVR")
            
            variant_lines.append("- " + ", ".join(parts))
        
        variant_str = "\n".join(variant_lines)
        
        # Build secondary metrics section — always include cross-metric data when available
        # so the LLM can reason about trade-offs (AOV, CVR/RPU cross-reference)
        secondary_lines = []
        for v in variant_results:
            name = v.get('name', 'Unknown')
            users = v.get('users', 0)
            orders = v.get('orders') or v.get('conversions')
            revenue = v.get('revenue')
            clicks = v.get('clicks')
            
            sec_parts = []
            # Compute AOV if both orders and revenue are available
            if orders and orders > 0 and revenue and revenue > 0:
                aov = revenue / orders
                sec_parts.append(f"AOV=${aov:.2f}")
            # Compute CVR if orders available (and it's not the primary metric)
            if not is_monetary and primary_metric != "cvr" and orders and orders > 0 and users > 0:
                cvr = orders / users
                sec_parts.append(f"CVR={cvr:.2%}")
            elif is_monetary and orders and orders > 0 and users > 0:
                cvr = orders / users
                sec_parts.append(f"CVR={cvr:.2%}")
            # Compute RPU if revenue available (and it's not the primary metric)
            if primary_metric != "revenue_per_user" and revenue and revenue > 0 and users > 0:
                rpu = revenue / users
                sec_parts.append(f"RPU=${rpu:.2f}")
            # Compute CTR if clicks available (and it's not the primary metric)
            if primary_metric != "ctr" and clicks and clicks > 0 and users > 0:
                ctr_val = clicks / users
                sec_parts.append(f"CTR={ctr_val:.2%}")
            
            if sec_parts:
                secondary_lines.append(f"- {name}: " + ", ".join(sec_parts))
        
        secondary_str = "\n".join(secondary_lines) if secondary_lines else "No secondary metrics available"
        
        # Build comparison summary with explicit sign convention
        comparison_lines = []
        for c in comparisons:
            metric = c.get('metric_name', 'Conversion Rate')
            treatment = c.get('treatment_name', 'Treatment')
            control = c.get('control_name', 'Control')
            
            abs_diff = c.get('absolute_difference', 0)
            rel_uplift = c.get('relative_uplift_percent', 0)
            p_value = c.get('p_value', 1.0)
            is_sig = c.get('is_significant', False)
            ci_lower = c.get('ci_lower')
            ci_upper = c.get('ci_upper')
            
            line = f"- **{treatment}** vs **{control}** ({metric}):\n"
            
            # Determine unit formatting based on metric type
            is_monetary = metric.lower() in ('revenue per user', 'rpu', 'aov', 'arpu', 'average order value')
            
            if is_monetary:
                line += f"  - Absolute difference (treatment - control): ${abs_diff:+.2f} per user\n"
                line += f"  - Relative uplift: {rel_uplift:+.1f}%\n"
                line += f"  - p-value: {p_value:.4f}\n"
                
                if ci_lower is not None and ci_upper is not None:
                    line += f"  - 95% CI for diff: [${ci_lower:.2f}, ${ci_upper:.2f}] per user\n"
            else:
                # Proportion metrics (CTR, CVR) — use pp
                line += f"  - Absolute difference (treatment - control): {abs_diff:+.4f} ({abs_diff*100:+.2f} pp)\n"
                line += f"  - Relative uplift: {rel_uplift:+.1f}%\n"
                line += f"  - p-value: {p_value:.4f}\n"
                
                if ci_lower is not None and ci_upper is not None:
                    line += f"  - 95% CI for diff: [{ci_lower*100:.2f} pp, {ci_upper*100:.2f} pp]\n"
            
            line += f"  - Statistically significant at α=0.05: {'**Yes**' if is_sig else 'No'}"
            
            comparison_lines.append(line)
        
        comparison_str = "\n".join(comparison_lines) if comparison_lines else "No comparisons available"
        
        # Build warnings - highlight SRM prominently
        srm_warnings = [w for w in warnings if 'SRM' in w.upper() or 'allocation' in w.lower()]
        other_warnings = [w for w in warnings if w not in srm_warnings]
        
        warning_parts = []
        if srm_warnings:
            warning_parts.append("**⚠️ CRITICAL - SRM/Allocation Issues:**")
            warning_parts.extend([f"- {w}" for w in srm_warnings])
        if other_warnings:
            if srm_warnings:
                warning_parts.append("\n**Other Warnings:**")
            warning_parts.extend([f"- {w}" for w in other_warnings])
        
        warning_str = "\n".join(warning_parts) if warning_parts else "None"
        
        # Build trade-off notes section
        trade_off_str = trade_off_notes if trade_off_notes else "No secondary metric trade-offs to note."
        
        # Build metric context for the LLM
        if is_monetary:
            metric_context = f"""PRIMARY METRIC: Revenue Per User (RPU) — a MONETARY metric.
UNIT RULES:
- ALL values must be in CURRENCY units ($ per user). Do NOT use %, pp, or proportion notation.
- In Section 1, report Control RPU and Treatment RPU in $ (e.g., "Control: $5.00/user, Treatment: $6.00/user").
- Report absolute lift in $ (e.g., "+$1.00 per user"), NOT in pp.
- Report CI in $ (e.g., "[$0.52, $1.48] per user"), NOT in pp.
- Relative uplift can be shown as % (e.g., "+20.0%").
- Do NOT compute or mention conversion rate (CVR) or CTR unless noted as a secondary metric."""
        elif primary_metric == "ctr":
            metric_context = """PRIMARY METRIC: Click-Through Rate (CTR) — a PROPORTION metric.
UNIT RULES:
- Use percentage points (pp) for absolute differences and CI.
- Do NOT mention CVR, RPU, or other metrics unless noted as a secondary metric."""
        else:
            metric_context = """PRIMARY METRIC: Conversion Rate (CVR) — a PROPORTION metric.
UNIT RULES:
- Use percentage points (pp) for absolute differences and CI.
- Do NOT mention CTR, RPU, or other metrics unless noted as a secondary metric."""
        
        # Construct the human message
        human_content = f"""Analyze this A/B test data and write a professional report following the 5-section structure:

{metric_context}

## Variant Data (Primary Metric)
{variant_str}

## Secondary Metrics (for trade-off analysis in Sections 3-4)
{secondary_str}

## Statistical Comparisons (pre-calculated, sign = treatment - control)
{comparison_str}

## Warnings
{warning_str}

## Trade-off Notes (for secondary metrics)
{trade_off_str}

Remember: 
- The primary metric is the ONLY metric for Section 1 (Result Summary). Use ONLY the units specified above.
- All statistics are pre-calculated - just explain them clearly
- Keep it concise: 6-10 bullets for main insights
- Write for PMs and marketers who need to make a launch decision
- If SRM is detected, make this the FIRST thing you mention in Risks section"""

        messages = [
            SystemMessage(content=AB_TEST_REPORT_SYSTEM_PROMPT),
            HumanMessage(content=human_content)
        ]
        
        response = self.llm.invoke(messages)
        return response.content if hasattr(response, 'content') else str(response)
    
    def write_did_report(
        self,
        did_results: Dict[str, Any]
    ) -> str:
        """
        Write a human-friendly DiD analysis report.
        
        Args:
            did_results: Dictionary with DiD results from causal_analyzer.py
        
        Returns:
            Markdown formatted report
        """
        # Calculate changes for clearer context
        treatment_pre = did_results.get('treatment_pre', 0)
        treatment_post = did_results.get('treatment_post', 0)
        control_pre = did_results.get('control_pre', 0)
        control_post = did_results.get('control_post', 0)
        metric_type = did_results.get('metric_type', 'proportion')
        
        treatment_change = treatment_post - treatment_pre
        control_change = control_post - control_pre
        did_estimate = did_results.get('did_estimate', 0)
        
        # Determine p-value string (guard against missing)
        p_val = did_results.get('p_value')
        if p_val is None:
            if metric_type == "mean":
                p_str = "not provided (variance/SD not available from aggregate means)"
            else:
                p_str = "not provided"
        elif p_val < 0.001:
            p_str = "< 0.001"
        else:
            p_str = f"{p_val:.4f}"

        # Guard against fabricated CI
        ci_lower = did_results.get('ci_lower')
        ci_upper = did_results.get('ci_upper')
        ci_is_valid = (
            ci_lower is not None
            and ci_upper is not None
            and not (ci_lower == 0 and ci_upper == 0)
        )

        # Format values based on metric_type
        if metric_type == "proportion":
            # Proportion: use % and pp
            def fmt_val(v):
                return f"{v*100:.2f}%"
            def fmt_change(v):
                return f"{v:+.4f} ({v*100:+.2f} pp)"
            def fmt_did(v):
                return f"{v:+.4f} ({v*100:+.2f} pp)"
            if ci_is_valid:
                ci_str = f"[{ci_lower*100:.2f} pp, {ci_upper*100:.2f} pp]"
            else:
                ci_str = "not provided"
            unit_note = "Values are proportions (rates). Changes expressed in percentage points (pp)."
        else:
            # Mean: use plain numeric units
            def fmt_val(v):
                return f"{v:,.2f}"
            def fmt_change(v):
                return f"{v:+,.2f} units"
            def fmt_did(v):
                return f"{v:+,.2f} units"
            if ci_is_valid:
                ci_str = f"[{ci_lower:,.2f}, {ci_upper:,.2f}] units"
            else:
                ci_str = "not provided (variance/SD not available from aggregate means)"
            unit_note = "Values are numeric means. Changes expressed in original units (not % or pp)."

        # Determine parallel trends status based on number of pre-periods
        pre_periods = did_results.get('pre_periods', 1)
        if pre_periods is not None and pre_periods > 1:
            parallel_trends_status = f"Multiple pre-periods provided ({pre_periods}). Parallel trends can be assessed."
        else:
            parallel_trends_status = "Single pre-period only. Parallel trends cannot be validated with a single pre-period."

        human_content = f"""Difference-in-Differences Analysis Results:

Metric Type: {metric_type.upper()}
{unit_note}

Treatment group:
- Pre-period: {fmt_val(treatment_pre)}
- Post-period: {fmt_val(treatment_post)}
- Change (Post - Pre): {fmt_change(treatment_change)}

Control group:
- Pre-period: {fmt_val(control_pre)}
- Post-period: {fmt_val(control_post)}
- Change (Post - Pre): {fmt_change(control_change)}

DiD Results:
- Pre-period difference (Treatment - Control): {fmt_val(did_results.get('pre_difference', 0))}
- Post-period difference (Treatment - Control): {fmt_val(did_results.get('post_difference', 0))}
- DiD Estimate (causal effect): {fmt_did(did_estimate)}
- 95% Confidence Interval: {ci_str}
- P-value: {p_str}

Parallel Trends Status: {parallel_trends_status}

Write a professional DiD analysis report following the 5-section structure:
1. Result Summary
2. Statistical Interpretation
3. Decision Recommendation
4. Assumptions / Risks
5. Next Checks
"""

        messages = [
            SystemMessage(content=DID_REPORT_SYSTEM_PROMPT),
            HumanMessage(content=human_content)
        ]
        
        response = self.llm.invoke(messages)
        return response.content if hasattr(response, 'content') else str(response)
    
    def write_uplift_report(
        self,
        uplift_results: Dict[str, Any]
    ) -> str:
        """
        Write a human-friendly uplift modeling report.
        
        Args:
            uplift_results: Dictionary with uplift modeling results
        
        Returns:
            Markdown formatted report
        """
        system_prompt = """You are a data scientist explaining uplift modeling results to Product Managers.

Your report should:
1. Explain which user segments benefit most from treatment
2. Provide business interpretation of the uplift values
3. Warn about observational bias and potential confounders
4. Suggest validation approaches

Use professional English focused on actionable insights."""

        buckets_str = "\n".join([
            f"- {b.get('bucket_name', 'Unknown')}: "
            f"Average predicted uplift = {b.get('average_predicted_uplift', 0):.4f}, "
            f"Fraction of users = {b.get('fraction_of_users', 0):.2%}, "
            f"Estimated incremental conversions = {b.get('estimated_incremental_conversions', 0) or 0:.2f}"
            for b in uplift_results.get("buckets", [])
        ])
        
        human_content = f"""Uplift Modeling Results:

Overall Average Uplift: {uplift_results.get('overall_average_uplift', 0):.4f}
Total Users: {uplift_results.get('total_users', 0):,}

Uplift Buckets:
{buckets_str}

Write a comprehensive report explaining:
1. Which segments benefit most from the treatment
2. Business implications for targeting
3. Limitations of observational uplift analysis
4. Recommendations for validation with randomized experiments"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_content)
        ]
        
        response = self.llm.invoke(messages)
        return response.content if hasattr(response, 'content') else str(response)
