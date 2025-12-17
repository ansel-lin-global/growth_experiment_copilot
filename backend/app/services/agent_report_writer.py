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


# System prompt for A/B test report writing
AB_TEST_REPORT_SYSTEM_PROMPT = """You are an experienced Product Data Scientist writing A/B test analysis reports for Product Managers and Marketers.

Your reports should be:
- Written in clear, professional English
- Focused on business decisions, not statistical jargon
- Based ONLY on the data provided - never invent metrics that weren't given

CRITICAL RULES:
1. ONLY discuss metrics that are explicitly provided in the input data
2. If a metric (like CTR, revenue, ARPU) is not provided or is null/zero, do NOT mention it at all
3. Do NOT say things like "CTR = 0.00%" or "ARPU = $0.00" - simply omit missing metrics
4. All statistical values (uplift, p-value, CI) come from pre-calculated inputs - just explain them, don't recalculate
5. Focus on conversion rate if that's the only metric provided

Your report MUST follow this exact structure with these 4 sections:

## 1. Result Summary
Use bullet points to summarize:
- Control group: X users, Y conversions, Z% conversion rate
- Treatment group: X users, Y conversions, Z% conversion rate  
- Absolute difference: +/- X.X percentage points
- Relative uplift: +/- X.X%
- p-value: X.XXXX
- 95% confidence interval: [lower, upper] (if provided)

## 2. Statistical Interpretation
Explain in plain language:
- Whether the observed uplift is positive or negative
- Whether the result is statistically significant at the 0.05 level
- If NOT significant: explicitly state that current data doesn't provide strong enough evidence to conclude there's a real difference
- Add 1-2 sentences on what this means for decision-making

## 3. Decision Recommendation
Evaluate these three options and recommend the most appropriate one with clear reasoning:
1. **Roll out the treatment** - if uplift is positive AND statistically significant
2. **Extend the experiment** - if uplift looks promising but needs more data for significance
3. **Do not roll out / Redesign** - if uplift is negative, negligible, or fundamentally flawed

Provide brief justification for your recommendation.

## 4. Risks and Limitations
Briefly note potential issues:
- Sample size adequacy
- Experiment duration considerations
- Segment-level variations that might be hidden
- Any warnings provided in the data

Keep this section concise - 2-3 bullet points maximum.
"""


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
        warnings: List[str]
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
            comparisons: List of comparison result dictionaries containing:
                - treatment_name, control_name
                - metric_name: the metric being compared (CVR, CTR, etc.)
                - absolute_difference: raw difference
                - relative_uplift_percent: percentage uplift
                - p_value: statistical significance
                - ci_lower, ci_upper: confidence interval bounds
                - is_significant: boolean
            warnings: List of warning messages
        
        Returns:
            Markdown formatted report following the 4-section structure
            
        Example:
            For control (1000 users, 50 conversions) vs treatment (1000 users, 65 conversions):
            - CVR: 5.0% vs 6.5%
            - Absolute diff: +1.5pp
            - Relative uplift: +30%
            - p-value: ~0.15 (not significant)
            - Recommendation: Extend experiment to gather more data
        """
        # Build variant summary - only include metrics that exist
        variant_lines = []
        for v in variant_results:
            parts = [f"**{v.get('name', 'Unknown')}**: {v.get('users', 0):,} users"]
            
            # Add conversions/orders if present
            orders = v.get('orders') or v.get('conversions')
            if orders is not None and orders > 0:
                parts.append(f"{orders:,} conversions")
            
            # Add CVR if present and meaningful
            cvr = v.get('cvr')
            if cvr is not None and cvr > 0:
                parts.append(f"{cvr:.2%} conversion rate")
            
            # Add clicks if present
            clicks = v.get('clicks')
            if clicks is not None and clicks > 0:
                parts.append(f"{clicks:,} clicks")
            
            # Add CTR if present and meaningful
            ctr = v.get('ctr')
            if ctr is not None and ctr > 0:
                parts.append(f"{ctr:.2%} CTR")
            
            # Add revenue if present
            revenue = v.get('revenue')
            if revenue is not None and revenue > 0:
                parts.append(f"${revenue:,.2f} revenue")
            
            # Add ARPU if present and meaningful
            arpu = v.get('arpu')
            if arpu is not None and arpu > 0:
                parts.append(f"${arpu:.2f} ARPU")
            
            variant_lines.append("- " + ", ".join(parts))
        
        variant_str = "\n".join(variant_lines)
        
        # Build comparison summary
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
            line += f"  - Absolute difference: {abs_diff:+.4f} ({abs_diff*100:+.2f} percentage points)\n"
            line += f"  - Relative uplift: {rel_uplift:+.1f}%\n"
            line += f"  - p-value: {p_value:.4f}\n"
            
            if ci_lower is not None and ci_upper is not None:
                line += f"  - 95% CI: [{ci_lower:.4f}, {ci_upper:.4f}]\n"
            
            line += f"  - Statistically significant: {'Yes' if is_sig else 'No'}"
            
            comparison_lines.append(line)
        
        comparison_str = "\n".join(comparison_lines) if comparison_lines else "No comparisons available"
        
        # Build warnings
        warning_str = "\n".join([f"- {w}" for w in warnings]) if warnings else "None"
        
        # Construct the human message
        human_content = f"""Analyze this A/B test data and write a professional report:

## Variant Data
{variant_str}

## Statistical Comparisons (pre-calculated)
{comparison_str}

## Warnings
{warning_str}

Remember: 
- Use ONLY the metrics shown above
- Do NOT mention CTR, ARPU, or other metrics if they weren't provided
- All statistics are pre-calculated - just explain them
- Write for PMs and marketers who need to make a launch decision"""

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
        system_prompt = """You are a data scientist explaining causal inference results using Difference-in-Differences to Product Managers.

Write a clear report that:
1. Explains what the DiD estimator measures in plain language
2. Interprets whether the treatment had a real causal effect
3. Reminds about the parallel trends assumption
4. Provides actionable recommendations

Use professional English and focus on business decisions."""

        human_content = f"""Difference-in-Differences Analysis Results:

Treatment group:
- Pre-period: {did_results.get('treatment_pre', 0):.4f}
- Post-period: {did_results.get('treatment_post', 0):.4f}

Control group:
- Pre-period: {did_results.get('control_pre', 0):.4f}
- Post-period: {did_results.get('control_post', 0):.4f}

Pre-period difference (Treatment - Control): {did_results.get('pre_difference', 0):.4f}
Post-period difference (Treatment - Control): {did_results.get('post_difference', 0):.4f}

DiD Estimate (causal effect): {did_results.get('did_estimate', 0):.4f}
95% Confidence Interval: [{did_results.get('ci_lower', 0):.4f}, {did_results.get('ci_upper', 0):.4f}]
P-value: {did_results.get('p_value', 1.0) or 'N/A'}

Write a comprehensive report with:
1. What DiD measures and why it's appropriate here
2. Interpretation of the causal effect estimate
3. Whether the effect is statistically significant
4. The parallel trends assumption and its importance
5. Recommendations for next steps"""

        messages = [
            SystemMessage(content=system_prompt),
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
