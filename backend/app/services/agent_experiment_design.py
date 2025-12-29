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
        baseline_rate: float = None,
        minimum_detectable_effect: float = None,
        alpha: float = 0.05,
        power: float = 0.8,
        expected_daily_traffic: int = None,
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
  - Standardize as two-sided ("is different from") unless the user explicitly specifies a direction like "increase", "higher", or "better".
  - If a direction is specified, use one-sided ("is higher than").
  - Ensure clean punctuation (no double periods).
- Design type: Usually "A/B".
- Variants: Use clear names like "Control", "Treatment A", etc.
- Population: Target segment if mentioned (e.g., "All mobile users").
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
        
        # Generate explanation (Rationale)
        explanation_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a senior Product Data Scientist. 
Explain the design rationale for this experiment to a Product Manager.
Tone: Professional, neutral, concise. 
Format: Use exactly three sections with these headings:
1) Why this experiment
2) Key design choices
3) Checks before running

Rules:
- Use bullet points (max 6 per section).
- No chatty openings like "Absolutely!" or "Great idea!".
- No concluding generic advice like "Feel free to ask".
- Keep it specific to this scenario.
- If baseline rate, MDE, or traffic are missing, explicitly state they are required for sample size calculation."""),
            ("human", """Experiment: "{description}"

Design:
- Design type: {design_type}
- Variants: {variants}
- Primary metrics: {primary_metrics}
- Sample size: {sample_size}
- Duration: {estimated_duration}

Provide the structured rationale.""")
        ])
        
        explanation_response = self.llm.invoke(explanation_prompt.format_messages(
            description=description,
            design_type=design_data.get("design_type", "A/B"),
            variants=design_data.get("variants", "2 variants"),
            primary_metrics=", ".join(design_data.get("primary_metrics", [])),
            sample_size=f"{sample_size} per variant" if sample_size else "Not available (missing inputs)",
            estimated_duration=f"{estimated_duration} days" if estimated_duration else "Not available"
        ))
        
        # LangChain 1.0: response is an AIMessage with content attribute
        llm_explanation = explanation_response.content if hasattr(explanation_response, 'content') else str(explanation_response)
        
        # Build design card - handle hypothesis that might be a dict
        hypothesis_raw = design_data.get("hypothesis", "H0: No difference. H1: Treatment differs from control.")
        if isinstance(hypothesis_raw, dict):
            # Convert dict hypothesis to string
            h0 = hypothesis_raw.get("H0", "No difference between variants")
            h1 = hypothesis_raw.get("H1", "Treatment differs from control")
            hypothesis = f"H0: {h0}. H1: {h1}"
        else:
            hypothesis = str(hypothesis_raw)
        
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

