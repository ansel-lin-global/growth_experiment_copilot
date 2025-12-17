"""API endpoint for experiment design."""
from fastapi import APIRouter, HTTPException
from app.models.experiment_design import ExperimentDesignRequest, ExperimentDesignResponse
from app.services.agent_experiment_design import ExperimentDesignAgent
from app.services.stats_calculator import (
    calculate_sample_size_proportion,
    estimate_experiment_duration
)
from app.core.config import settings

router = APIRouter()


@router.post("/experiment-design", response_model=ExperimentDesignResponse)
async def design_experiment(request: ExperimentDesignRequest):
    """
    Design an experiment from a natural language description.
    
    Uses LLM to extract experiment parameters and calculates sample size if baseline and MDE are provided.
    """
    try:
        agent = ExperimentDesignAgent()
        
        # Calculate sample size if baseline and MDE are provided
        sample_size = None
        estimated_duration = None
        
        if request.baseline_rate is not None and request.minimum_detectable_effect is not None:
            # Determine effect type (assume relative for now, could be enhanced)
            effect_type = "relative"
            
            sample_size = calculate_sample_size_proportion(
                baseline_rate=request.baseline_rate,
                minimum_detectable_effect=request.minimum_detectable_effect,
                alpha=request.alpha,
                power=request.power,
                effect_type=effect_type
            )
            
            # Estimate duration if traffic is provided
            if request.expected_daily_traffic is not None:
                # Assume 2 variants for now (could be enhanced with LLM output)
                num_variants = 2
                estimated_duration = estimate_experiment_duration(
                    sample_size_per_variant=sample_size,
                    num_variants=num_variants,
                    expected_daily_traffic=request.expected_daily_traffic
                )
        
        # Use agent to design experiment
        result = agent.design_experiment(
            description=request.description,
            baseline_rate=request.baseline_rate,
            minimum_detectable_effect=request.minimum_detectable_effect,
            alpha=request.alpha,
            power=request.power,
            expected_daily_traffic=request.expected_daily_traffic,
            sample_size=sample_size,
            estimated_duration=estimated_duration
        )
        
        return ExperimentDesignResponse(
            design_card=result["design_card"],
            llm_explanation=result["llm_explanation"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error designing experiment: {str(e)}")


