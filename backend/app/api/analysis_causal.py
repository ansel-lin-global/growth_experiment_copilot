"""API endpoint for causal analysis (DiD and uplift)."""
from fastapi import APIRouter, HTTPException
from app.models.analysis_inputs import CausalAnalysisRequest
from app.models.analysis_outputs import CausalDiDResponse, CausalUpliftResponse, DiDResult
from app.services.causal_analyzer import calculate_did, calculate_uplift_model
from app.services.agent_report_writer import ReportWriterAgent

router = APIRouter()


@router.post("/analyze-causal", response_model=CausalDiDResponse | CausalUpliftResponse)
async def analyze_causal(request: CausalAnalysisRequest):
    """
    Perform causal analysis using Difference-in-Differences or uplift modeling.
    """
    try:
        if request.mode == "did":
            if request.did_data is None:
                raise HTTPException(status_code=400, detail="did_data is required for DiD mode")
            
            # Aggregate data
            treatment_pre_sum = 0
            treatment_pre_n = 0
            treatment_post_sum = 0
            treatment_post_n = 0
            control_pre_sum = 0
            control_pre_n = 0
            control_post_sum = 0
            control_post_n = 0
            
            for point in request.did_data.data:
                if point.group == "treatment" and point.period == "pre":
                    if request.did_data.metric_type == "proportion":
                        treatment_pre_sum += point.outcome
                        treatment_pre_n += point.users
                    else:
                        treatment_pre_sum += point.outcome * point.users
                        treatment_pre_n += point.users
                
                elif point.group == "treatment" and point.period == "post":
                    if request.did_data.metric_type == "proportion":
                        treatment_post_sum += point.outcome
                        treatment_post_n += point.users
                    else:
                        treatment_post_sum += point.outcome * point.users
                        treatment_post_n += point.users
                
                elif point.group == "control" and point.period == "pre":
                    if request.did_data.metric_type == "proportion":
                        control_pre_sum += point.outcome
                        control_pre_n += point.users
                    else:
                        control_pre_sum += point.outcome * point.users
                        control_pre_n += point.users
                
                elif point.group == "control" and point.period == "post":
                    if request.did_data.metric_type == "proportion":
                        control_post_sum += point.outcome
                        control_post_n += point.users
                    else:
                        control_post_sum += point.outcome * point.users
                        control_post_n += point.users
            
            # Calculate rates/means
            treatment_pre = treatment_pre_sum / treatment_pre_n if treatment_pre_n > 0 else 0.0
            treatment_post = treatment_post_sum / treatment_post_n if treatment_post_n > 0 else 0.0
            control_pre = control_pre_sum / control_pre_n if control_pre_n > 0 else 0.0
            control_post = control_post_sum / control_post_n if control_post_n > 0 else 0.0
            
            # Calculate DiD
            did_results = calculate_did(
                treatment_pre=treatment_pre,
                treatment_post=treatment_post,
                control_pre=control_pre,
                control_post=control_post,
                treatment_pre_n=treatment_pre_n,
                treatment_post_n=treatment_post_n,
                control_pre_n=control_pre_n,
                control_post_n=control_post_n,
                metric_type=request.did_data.metric_type
            )
            
            # Generate report
            report_writer = ReportWriterAgent()
            llm_report = report_writer.write_did_report(did_results)
            
            return CausalDiDResponse(
                numeric_results=DiDResult(**did_results),
                llm_report_markdown=llm_report
            )
        
        elif request.mode == "uplift":
            if request.uplift_data is None:
                raise HTTPException(status_code=400, detail="uplift_data is required for uplift mode")
            
            # Convert to list of dicts
            data_list = [point.dict() for point in request.uplift_data.data]
            
            # Calculate uplift model
            uplift_results = calculate_uplift_model(data_list)
            
            # Generate report
            report_writer = ReportWriterAgent()
            llm_report = report_writer.write_uplift_report(uplift_results)
            
            return CausalUpliftResponse(
                numeric_results=uplift_results,
                llm_report_markdown=llm_report
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown mode: {request.mode}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in causal analysis: {str(e)}")


