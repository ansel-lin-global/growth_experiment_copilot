"""LangChain agent for experiment design reasoning."""
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import json

from app.core.config import settings
from app.models.experiment_design import ExperimentDesignCard


class ExperimentDesignAgent:
    """Agent that uses LLM to design experiments from natural language descriptions."""
    
    def __init__(self):
        # LangChain 1.0: api_key can be passed directly or via environment variable
        self.llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=settings.LLM_TEMPERATURE,
            api_key=settings.OPENAI_API_KEY if settings.OPENAI_API_KEY else None
        )
    
    def design_experiment(
        self,
        description: str,
        baseline_rate: float = 0.1,
        minimum_detectable_effect: float = 0.05,
        alpha: float = 0.05,
        power: float = 0.8,
        expected_daily_traffic: int = 1000,
        sample_size: int = None,
        estimated_duration: int = None
    ) -> Dict[str, Any]:
        """
        Design an experiment from a natural language description.
        
        Args:
            description: Natural language description of the experiment
            baseline_rate: Optional baseline rate
            minimum_detectable_effect: Optional MDE
            alpha: Significance level
            power: Statistical power
            expected_daily_traffic: Optional expected daily traffic
            sample_size: Pre-calculated sample size (if available)
            estimated_duration: Pre-calculated duration (if available)
        
        Returns:
            Dictionary with design_card and llm_explanation
        """
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", """You are a senior Product Data Scientist specializing in experiment design. 
Your task is to analyze an experiment description and extract structured parameters for a formal design blueprint.

Guidelines:
- Tone: Professional, neutral, and concise. 
- Goal: Short plain English summary of the objective.
- Hypothesis: Provide H0 (null) and H1 (alternative).
  CRITICAL RULES for hypothesis:
  - Compare Treatment vs Control (p_treatment vs p_control), NOT "baseline".
  - If user mentions directional intent ("increase", "higher", "improve", "boost", "better"), use ONE-SIDED:
    H0: p_treatment ≤ p_control
    H1: p_treatment > p_control
  - Otherwise use TWO-SIDED:
    H0: p_treatment = p_control  
    H1: p_treatment ≠ p_control
  - Do NOT use the word "baseline" in H0/H1. Always compare treatment to control.
  - Ensure clean punctuation (no double periods).
- Design type: Usually "A/B".
- Variants: 
  - If user explicitly names control/treatment variants (e.g., "blue control", "green treatment"), use descriptive names: "Control (Blue), Treatment (Green)"
  - For simple 2-variant tests, use "Control, Treatment" NOT "Control, Treatment A"
  - Only use "Treatment A, Treatment B" when there are multiple treatment variants.
- Population: Target segment if mentioned (e.g., "All desktop users").
- Randomization Unit: Default to "user" if not specified, but mark as assumption.
- Traffic Allocation: Default to "50/50" for 2 variants if not specified.
- Metrics: Identify primary, secondary, and guardrail metrics (e.g., latency, bounce rate).

Respond with a JSON object containing:
- goal: string
- hypothesis: string (formatted as "H0: ... H1: ...")
- primary_metrics: list of strings
- secondary_metrics: list of strings
- guardrail_metrics: list of strings
- design_type: string
- variants: string
- population: string or null
- randomization_unit: string or null
- traffic_allocation: string or null
- notes: list of strings

Be specific and actionable. Avoid generic advice."""),
            ("human", """Experiment description: {description}

Additional context:
- Baseline rate: {baseline_rate}
- Minimum detectable effect: {minimum_detectable_effect}
- Sample size per variant: {sample_size}
- Estimated duration: {estimated_duration} days

Provide the experiment design in JSON format.""")
        ])
        
        prompt = prompt_template.format_messages(
            description=description,
            baseline_rate=baseline_rate if baseline_rate is not None else "not provided",
            minimum_detectable_effect=minimum_detectable_effect if minimum_detectable_effect is not None else "not provided",
            sample_size=sample_size if sample_size is not None else "not calculated",
            estimated_duration=estimated_duration if estimated_duration is not None else "not calculated"
        )
        
        # Get structured response
        response = self.llm.invoke(prompt)
        # LangChain 1.0: response is an AIMessage with content attribute
        content = response.content if hasattr(response, 'content') else str(response)
        
        # Try to parse JSON from the response
        try:
            # Extract JSON if wrapped in markdown code blocks
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                content = content[json_start:json_end].strip()
            elif "```" in content:
                json_start = content.find("```") + 3
                json_end = content.find("```", json_start)
                content = content[json_start:json_end].strip()
            
            design_data = json.loads(content)
        except json.JSONDecodeError:
            # Fallback
            design_data = {
                "goal": "Experiment to test the described change",
                "hypothesis": "H0: No difference between variants. H1: Treatment differs from control.",
                "primary_metrics": ["conversion_rate"],
                "secondary_metrics": [],
                "guardrail_metrics": [],
                "design_type": "A/B",
                "variants": "2 variants: control and treatment",
                "notes": ["Ensure proper randomization"]
            }
        
        # Detect if user intent is directional (one-sided)
        is_one_sided = any(word in description.lower() for word in ['increase', 'higher', 'improve', 'boost', 'better', 'more'])
        hypothesis_type = "one-sided (treatment > control)" if is_one_sided else "two-sided"
        
        # Prepare actual values for the prompt
        baseline_str = f"{baseline_rate}" if baseline_rate is not None else "not provided"
        mde_str = f"{minimum_detectable_effect * 100:.0f}%" if minimum_detectable_effect is not None else "not provided"
        traffic_str = f"{expected_daily_traffic:,}" if expected_daily_traffic is not None else "not provided"
        sample_str = f"{sample_size:,}" if sample_size else "not computed"
        duration_str = f"{estimated_duration}" if estimated_duration else "not computed"
        
        # Feasibility flag
        duration_is_long = estimated_duration is not None and estimated_duration > 30
        
        # Generate explanation (Rationale)
        explanation_prompt = ChatPromptTemplate.from_messages([
("system", """You are a senior Product Data Scientist writing experiment rationale for a Product Manager.
Tone: Neutral, concise, decisional. No hype, no teaching tone.

FORMAT (hard):
- Output exactly three markdown headings with "-" bullets only:
  ## Why this experiment
  ## Key design choices
  ## Checks before running
- 4–5 bullets per section. Never exceed 5 bullets.
- No paragraphs. No numbered lists.
- Use ONLY the actual values provided in the context.
- Do NOT invent thresholds, attribution windows, event names, or metric definitions.
- If a required value is missing, prefer one practical default with "Assumption:" instead of repeatedly using placeholders.
- Use "Next action:" only when no safe default exists.
- Keep "Assumption" + "Next action" combined to at most 2 bullets total across the whole response.

CONTENT GUIDANCE:

## Why this experiment
- State the causal effect being isolated, specific to {description} and {variants}. Do NOT reference other features or use case examples — stay strictly on the user's described experiment.
- State the decision rule: reject H0 if the result is statistically significant at alpha={alpha} AND the observed relative uplift meets or exceeds the MDE of {mde} (relative improvement over baseline, not absolute percentage points).
- State downside risk of shipping without evidence, specific to the primary metric moving negatively.
- Include one business-facing risk sentence tied to {description} and the metric. Do NOT use generic examples from other experiments.

## Key design choices
- Randomization: always specify user-level sticky assignment (user_id hash bucketing) and allocation={allocation}.
- Exposure definition: analyze exposed users only (users who actually encountered the treatment) and call this out explicitly. Use language specific to {description}, not generic examples.
- Primary metric: {primary_metrics}. Include a fixed measurement window; if not provided, use "Assumption: window = same session or 24h (choose one and keep fixed)".
- Planning inputs: baseline={baseline_rate}, MDE={mde} (relative uplift), alpha={alpha}, power={power}.
- MUST include sample size estimation: if {sample_size} and {duration_days} are available (not "not computed"), state them as a dedicated bullet: "Sample size: {sample_size} users/variant; estimated duration: {duration_days} days at {daily_traffic} users/day." If not computed, state: "Sample size: not computed (provide baseline rate, MDE, and daily traffic to calculate)."
- Add one concise feasibility line: if {duration_is_long} is true, flag timeline risk and name levers (increase traffic; larger MDE; CUPED/proxy metrics; sequential testing); otherwise state timeline is operationally feasible.
- Optional segmentation line: if mentioning segmentation, keep it to sanity checks only (new vs returning, device), not as formal multiple-comparison inference.

Metric-specific definition checklist rule (use only when the primary metric matches):
- If primary metric is monetary (AOV / revenue / ARPU / GMV): include one bullet with "Assumption/Next action (monetary definition): gross vs net; discounts/coupons; tax/shipping; refunds/cancels; currency; aggregation unit."
- If primary metric is email open rate: include one bullet with "Assumption/Next action (open-rate definition): denominator (delivered vs sent); unique vs total opens; MPP/bot filtering; attribution window."
- If primary metric is activation rate: include one bullet with "Assumption/Next action (activation definition): success event; window; de-duplication; eligibility cohort."

## Checks before running
- Instrumentation: require both exposure event and conversion event; include explicit de-dup rule (user_id as primary key).
- SRM check: within first 1–2 days, compare observed allocation vs {allocation}; if mismatch, stop and fix randomization/instrumentation (do NOT tie SRM to performance).
- Guardrails: include at least one negative guardrail specific to {description}; if threshold missing, use "Next action: define guardrail threshold."
- Rollout/ramp: require staged rollout and monitoring gate; if plan missing, use "Assumption: 10% -> 50% -> 100% ramp if no quality incidents."."""),
("human", """Experiment: "{description}"

Context provided:
- Hypothesis type: {hypothesis_type}
- Design type: {design_type}
- Variants: {variants}
- Primary metric: {primary_metrics}
- Allocation: {allocation}
- Baseline rate: {baseline_rate}
- MDE: {mde}
- Alpha: {alpha}
- Power: {power}
- Daily traffic: {daily_traffic}
- Sample size per variant: {sample_size}
- Estimated duration: {duration_days} days
- Duration is long (>30 days): {duration_is_long}

Generate the structured rationale using ONLY the actual values above. Be specific and decisional.""")
])
        
        explanation_response = self.llm.invoke(explanation_prompt.format_messages(
            description=description,
            hypothesis_type=hypothesis_type,
            design_type=design_data.get("design_type", "A/B"),
            variants=design_data.get("variants", "2 variants"),
            primary_metrics=", ".join(design_data.get("primary_metrics", [])),
            allocation=design_data.get("traffic_allocation", "50/50"),
            baseline_rate=baseline_str,
            mde=mde_str,
            alpha=alpha,
            power=power,
            daily_traffic=traffic_str,
            sample_size=sample_str,
            duration_days=duration_str,
            duration_is_long=duration_is_long
        ))
        
        # LangChain 1.0: response is an AIMessage with content attribute
        llm_explanation = explanation_response.content if hasattr(explanation_response, 'content') else str(explanation_response)
        
        # Debug logging: verify markdown format
        contains_heading = "\n## " in llm_explanation or llm_explanation.startswith("## ")
        contains_bullets = "\n- " in llm_explanation or llm_explanation.startswith("- ")
        print(f"[DEBUG Rationale] contains_heading={contains_heading}, contains_bullets={contains_bullets}")
        print(f"[DEBUG Rationale] First 400 chars: {llm_explanation[:400]}")
        lines = llm_explanation.split('\n')[:15]
        for i, line in enumerate(lines):
            print(f"[DEBUG Rationale] line{i:02d}=\"{line}\"")
        
        # Build design card - handle hypothesis that might be a dict
        hypothesis_raw = design_data.get("hypothesis", "H0: No difference.\nH1: Treatment differs from control.")
        if isinstance(hypothesis_raw, dict):
            # Convert dict hypothesis to string with each on its own line
            h0 = hypothesis_raw.get("H0", "No difference between variants")
            h1 = hypothesis_raw.get("H1", "Treatment differs from control")
            hypothesis = f"H0: {h0}\nH1: {h1}"
        else:
            # Ensure H1 starts on a new line
            hypothesis = str(hypothesis_raw).replace(" H1:", "\nH1:").replace(". H1:", ".\nH1:")
        
        # Handle variants that might be a list
        variants_raw = design_data.get("variants", "2 variants: control and treatment")
        if isinstance(variants_raw, list):
            variants = ", ".join(str(v) for v in variants_raw)
        else:
            variants = str(variants_raw)
        
        design_card = ExperimentDesignCard(
            goal=design_data.get("goal", "Experiment to test the described change"),
            hypothesis=hypothesis,
            primary_metrics=design_data.get("primary_metrics", ["conversion_rate"]),
            secondary_metrics=design_data.get("secondary_metrics", []),
            guardrail_metrics=design_data.get("guardrail_metrics", []),
            design_type=design_data.get("design_type", "A/B"),
            variants=variants,
            population=design_data.get("population"),
            randomization_unit=design_data.get("randomization_unit"),
            traffic_allocation=design_data.get("traffic_allocation"),
            sample_size_per_variant=sample_size,
            estimated_duration_days=estimated_duration,
            notes=design_data.get("notes", [])
        )
        
        return {
            "design_card": design_card,
            "llm_explanation": llm_explanation
        }
