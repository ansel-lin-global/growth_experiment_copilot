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
            ("system", """You are an expert experiment design consultant. Your task is to analyze a natural language description of an experiment and extract structured information.

Extract the following:
1. Target event (e.g., "add_to_cart", "purchase", "open", "click")
2. Metric type: "proportion" (for conversion rates, CTR, CVR), "revenue" (for revenue metrics), or "mean" (for average values)
3. Experiment type: "A/B" (two variants), "A/B/n" (multiple variants), or "AA" (sanity check)
4. Effect direction: "increase", "decrease", or "non-inferiority"
5. Primary and secondary metrics
6. Important design considerations (seasonality, confounders, holiday risks, etc.)

Respond with a JSON object containing:
- goal: short plain English summary
- hypothesis: H0 and H1 in natural language
- primary_metrics: list of primary metrics
- secondary_metrics: list of secondary metrics
- design_type: "A/B", "A/B/n", or "AA"
- variants: suggested number of variants and naming (e.g., "2 variants: control and treatment_a")
- notes: list of important design considerations

Be concise but thorough."""),
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
            # Fallback: try to extract key fields manually
            design_data = {
                "goal": "Experiment to test the described change",
                "hypothesis": "H0: No difference between variants. H1: Treatment differs from control.",
                "primary_metrics": ["conversion_rate"],
                "secondary_metrics": [],
                "design_type": "A/B",
                "variants": "2 variants: control and treatment",
                "notes": ["Ensure proper randomization", "Monitor for external factors"]
            }
        
        # Generate explanation
        explanation_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an experiment design consultant explaining experiment design to a product manager."),
            ("human", """Based on this experiment description: "{description}"

And the design parameters:
- Design type: {design_type}
- Variants: {variants}
- Primary metrics: {primary_metrics}
- Sample size: {sample_size} per variant
- Duration: {estimated_duration} days

Provide a clear, natural language explanation of:
1. What this experiment is testing
2. Why this design is appropriate
3. What to watch out for
4. How to interpret results

Be conversational and helpful.""")
        ])
        
        explanation_response = self.llm.invoke(explanation_prompt.format_messages(
            description=description,
            design_type=design_data.get("design_type", "A/B"),
            variants=design_data.get("variants", "2 variants"),
            primary_metrics=", ".join(design_data.get("primary_metrics", [])),
            sample_size=sample_size if sample_size else "TBD",
            estimated_duration=estimated_duration if estimated_duration else "TBD"
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
            design_type=design_data.get("design_type", "A/B"),
            variants=variants,
            sample_size_per_variant=sample_size,
            estimated_duration_days=estimated_duration,
            notes=design_data.get("notes", [])
        )
        
        return {
            "design_card": design_card,
            "llm_explanation": llm_explanation
        }

