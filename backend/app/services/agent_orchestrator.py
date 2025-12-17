"""
Growth Experiment Agent Orchestrator.

This module provides the main orchestration logic for the Growth Experiment Agent.
It determines user intent, collects required information, and routes to the
appropriate analysis service.
"""
from typing import Dict, Any, List, Optional, Tuple
import json
import re
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import settings
from app.models.chat_agent import ChatMessage
from app.services.agent_experiment_design import ExperimentDesignAgent
from app.services.agent_report_writer import ReportWriterAgent
from app.services.stats_calculator import (
    calculate_sample_size_proportion,
    calculate_proportion_difference,
    estimate_experiment_duration
)
from app.services.causal_analyzer import calculate_did


# System prompt for intent detection and orchestration
ORCHESTRATOR_SYSTEM_PROMPT = """You are the Growth Experiment Agent, an AI assistant specialized in helping product managers, marketers, and data analysts with experiment design and analysis.

Your primary responsibilities:
1. Understand the user's intent based on their message
2. Determine if you have enough information to proceed
3. Either ask clarifying questions or provide analysis

## Intent Classification Rules

Classify user intent into one of these categories:

### EXPERIMENT_DESIGN
User wants to design a new experiment. Keywords/signals:
- "design an experiment", "set up A/B test", "sample size", "how long should I run"
- "I want to test", "planning an experiment", "MDE", "power analysis"
- Questions about experiment duration, traffic allocation, hypothesis formulation

Required info: description (required), baseline_rate, minimum_detectable_effect, expected_daily_traffic

### AB_TEST_ANALYSIS
User has A/B test results and wants analysis. Keywords/signals:
- "analyze results", "A/B test results", "can I launch", "is it significant"
- Mentions of control/treatment groups with numbers (users, clicks, conversions, revenue)

Required info: variants (name, users, clicks/orders/revenue), metric_type (ctr/cvr/revenue_per_user)

### CAUSAL_ANALYSIS
User wants causal/DiD analysis for non-randomized experiments. Keywords/signals:
- "difference in differences", "DiD", "causal analysis", "pre/post", "before and after"

Required info: treatment_pre_users, treatment_pre_outcome, treatment_post_users, treatment_post_outcome, control_pre_users, control_pre_outcome, control_post_users, control_post_outcome, metric_type

### GENERAL_CONVERSATION
Greetings, thanks, or questions about your capabilities.

## Response Format

IMPORTANT: Respond with a valid JSON object only. No markdown, no explanation, just pure JSON.

The JSON must have these fields:
- "intent": one of "experiment_design", "ab_test_analysis", "causal_analysis", "clarification_needed", "general_conversation"
- "has_sufficient_info": boolean
- "extracted_params": object with extracted parameters (can be empty object)
- "missing_info": array of strings (missing field names)
- "clarification_question": string (question in English to ask user for more info, can be empty)
- "greeting_response": string (for general_conversation, in English)

Important:
- When extracting numbers, be flexible with formats (e.g., "5%" = 0.05, "10k" = 10000)
- For MDE, if user says "10% relative improvement", treat as 0.10 relative effect
- Always respond in clear, professional English
- Response must be valid JSON only, no other text
"""


class GrowthExperimentAgent:
    """
    Orchestrator for the Growth Experiment Agent.
    
    This class handles:
    - Intent detection from user messages
    - Parameter extraction from conversation
    - Routing to appropriate analysis services
    - Generating human-friendly responses
    """
    
    def __init__(self):
        """Initialize the agent with LLM and sub-agents."""
        self.llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=0.1,  # Lower temperature for more consistent intent detection
            api_key=settings.OPENAI_API_KEY if settings.OPENAI_API_KEY else None
        )
        self.experiment_design_agent = ExperimentDesignAgent()
        self.report_writer = ReportWriterAgent()
    
    def _format_messages_for_llm(self, messages: List[ChatMessage]) -> str:
        """Format conversation history for the LLM prompt."""
        formatted = []
        for msg in messages:
            role_label = {
                "user": "使用者",
                "assistant": "助理",
                "system": "系統"
            }.get(msg.role, msg.role)
            formatted.append(f"{role_label}: {msg.content}")
        return "\n".join(formatted)
    
    def _parse_llm_response(self, content: str) -> Dict[str, Any]:
        """Parse JSON response from LLM, handling markdown code blocks."""
        original_content = content
        
        # Try to extract JSON from markdown code blocks
        if "```json" in content:
            json_start = content.find("```json") + 7
            json_end = content.find("```", json_start)
            if json_end > json_start:
                content = content[json_start:json_end].strip()
        elif "```" in content:
            # Find the first code block
            json_start = content.find("```") + 3
            # Skip language identifier if present (e.g., ```json\n)
            newline_pos = content.find("\n", json_start)
            if newline_pos != -1 and newline_pos < json_start + 20:
                json_start = newline_pos + 1
            json_end = content.find("```", json_start)
            if json_end > json_start:
                content = content[json_start:json_end].strip()
        
        # Try to find JSON object directly if no code blocks
        if not content.strip().startswith("{"):
            # Look for JSON object pattern
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group()
        
        try:
            result = json.loads(content)
            # Validate required fields
            if "intent" not in result:
                result["intent"] = "general_conversation"
            if "has_sufficient_info" not in result:
                result["has_sufficient_info"] = False
            return result
        except json.JSONDecodeError as e:
            # Log the error for debugging
            print(f"JSON parse error: {e}")
            print(f"Content was: {content[:500]}")
            
            # Try to extract intent from text if possible
            intent = "general_conversation"
            lower_content = original_content.lower()
            if "experiment_design" in lower_content:
                intent = "experiment_design"
            elif "ab_test" in lower_content:
                intent = "ab_test_analysis"
            elif "causal" in lower_content or "did" in lower_content:
                intent = "causal_analysis"
            
            # Fallback response
            return {
                "intent": intent,
                "has_sufficient_info": False,
                "extracted_params": {},
                "missing_info": [],
                "clarification_question": "",
                "greeting_response": "Hello! I'm the Growth Experiment Agent. I can help you design experiments, analyze A/B test results, or perform causal analysis. How can I assist you today?"
            }
    
    async def process_message(self, messages: List[ChatMessage]) -> Dict[str, Any]:
        """
        Process user messages and generate appropriate response.
        
        Args:
            messages: List of conversation messages
            
        Returns:
            Dictionary with reply, detected_intent, and extra debug info
        """
        try:
            # Step 1: Detect intent and extract parameters
            intent_result = await self._detect_intent_and_extract(messages)
            
            intent = intent_result.get("intent", "general_conversation")
            has_sufficient_info = intent_result.get("has_sufficient_info", False)
            extracted_params = intent_result.get("extracted_params", {})
        except Exception as e:
            print(f"Error in process_message intent detection: {e}")
            return {
                "reply": "Hello! I'm the Growth Experiment Agent. I can help you design experiments, analyze A/B test results, or perform causal analysis. How can I assist you today?",
                "detected_intent": "general_conversation",
                "extra": {"error": str(e)}
            }
        
        # Step 2: Handle based on intent
        if intent == "general_conversation":
            return {
                "reply": intent_result.get("greeting_response", 
                    "您好！我是 Growth Experiment Agent，可以幫助您設計實驗、分析 A/B 測試結果，或進行因果分析。請問有什麼可以幫您的？"),
                "detected_intent": "general_conversation",
                "extra": {"reasoning": "General conversation or greeting detected"}
            }
        
        if not has_sufficient_info:
            return {
                "reply": intent_result.get("clarification_question", 
                    "I need more information to help you. Could you please provide more details?"),
                "detected_intent": "clarification_needed",
                "extra": {
                    "underlying_intent": intent,
                    "missing_info": intent_result.get("missing_info", []),
                    "reasoning": "Insufficient information for analysis"
                }
            }
        
        # Step 3: Route to appropriate service
        if intent == "experiment_design":
            return await self._handle_experiment_design(extracted_params)
        elif intent == "ab_test_analysis":
            return await self._handle_ab_test_analysis(extracted_params)
        elif intent == "causal_analysis":
            return await self._handle_causal_analysis(extracted_params)
        else:
            return {
                "reply": "I'm not sure what you're looking for. I can help you with:\n1. Design a new experiment\n2. Analyze A/B test results\n3. Perform causal/DiD analysis\n\nPlease describe your needs and I'll guide you through the process.",
                "detected_intent": "general_conversation",
                "extra": {"reasoning": "Unable to determine specific intent"}
            }
    
    async def _detect_intent_and_extract(self, messages: List[ChatMessage]) -> Dict[str, Any]:
        """Detect intent and extract parameters from conversation."""
        try:
            conversation_history = self._format_messages_for_llm(messages)
            
            # Use HumanMessage and SystemMessage directly to avoid template escaping issues
            from langchain_core.messages import HumanMessage, SystemMessage
            
            formatted_messages = [
                SystemMessage(content=ORCHESTRATOR_SYSTEM_PROMPT),
                HumanMessage(content=f"分析以下對話並提取意圖和參數：\n\n{conversation_history}\n\n請以 JSON 格式回應。")
            ]
            
            response = self.llm.invoke(formatted_messages)
            content = response.content if hasattr(response, 'content') else str(response)
            
            return self._parse_llm_response(content)
        except Exception as e:
            print(f"Error in intent detection: {e}")
            import traceback
            traceback.print_exc()
            # Return a safe fallback
            return {
                "intent": "general_conversation",
                "has_sufficient_info": False,
                "extracted_params": {},
                "missing_info": [],
                "clarification_question": "",
                "greeting_response": "Hello! I'm the Growth Experiment Agent. I can help you design experiments, analyze A/B test results, or perform causal analysis. How can I assist you today?"
            }
    
    async def _handle_experiment_design(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle experiment design request."""
        description = params.get("description", "")
        baseline_rate = params.get("baseline_rate")
        mde = params.get("minimum_detectable_effect")
        alpha = params.get("alpha", 0.05)
        power = params.get("power", 0.8)
        daily_traffic = params.get("expected_daily_traffic")
        
        # Calculate sample size if we have the parameters
        sample_size = None
        estimated_duration = None
        
        if baseline_rate is not None and mde is not None:
            try:
                sample_size = calculate_sample_size_proportion(
                    baseline_rate=baseline_rate,
                    minimum_detectable_effect=mde,
                    alpha=alpha,
                    power=power,
                    effect_type="relative"
                )
                
                if daily_traffic is not None:
                    estimated_duration = estimate_experiment_duration(
                        sample_size_per_variant=sample_size,
                        num_variants=2,
                        expected_daily_traffic=daily_traffic
                    )
            except Exception as e:
                pass  # Continue without sample size calculation
        
        # Use experiment design agent for structured output
        try:
            result = self.experiment_design_agent.design_experiment(
                description=description,
                baseline_rate=baseline_rate,
                minimum_detectable_effect=mde,
                alpha=alpha,
                power=power,
                expected_daily_traffic=daily_traffic,
                sample_size=sample_size,
                estimated_duration=estimated_duration
            )
            
            # Format response in Traditional Chinese
            reply = self._format_experiment_design_response(result, sample_size, estimated_duration)
            
            return {
                "reply": reply,
                "detected_intent": "experiment_design",
                "extra": {
                    "tool_used": "ExperimentDesignAgent",
                    "sample_size": sample_size,
                    "estimated_duration_days": estimated_duration
                }
            }
        except Exception as e:
            return {
                "reply": f"Sorry, an error occurred while designing the experiment: {str(e)}. Please verify the parameters you provided.",
                "detected_intent": "experiment_design",
                "extra": {"error": str(e)}
            }
    
    async def _handle_ab_test_analysis(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle A/B test analysis request."""
        variants = params.get("variants", [])
        metric_type_raw = params.get("metric_type", "cvr")
        
        # Normalize metric type
        metric_type_mapping = {
            "conversion_rate": "cvr",
            "conversion": "cvr",
            "cvr": "cvr",
            "ctr": "ctr",
            "click_through_rate": "ctr",
            "revenue_per_user": "revenue_per_user",
            "arpu": "revenue_per_user"
        }
        metric_type = metric_type_mapping.get(metric_type_raw.lower(), "cvr")
        
        if len(variants) < 2:
            return {
                "reply": "I need data for at least two variants (control and treatment) to perform the analysis. Please provide the number of users and conversions for each variant.",
                "detected_intent": "clarification_needed",
                "extra": {"missing_info": ["variants"]}
            }
        
        try:
            # Compute metrics and comparisons
            variant_results = []
            for v in variants:
                users = v.get("users", 0)
                clicks = v.get("clicks")
                # Handle various key names for conversions/orders
                orders = v.get("orders") or v.get("conversions") or v.get("converts")
                revenue = v.get("revenue")
                
                ctr = (clicks / users) if clicks is not None and users > 0 else None
                cvr = (orders / users) if orders is not None and users > 0 else None
                arpu = (revenue / users) if revenue is not None and users > 0 else None
                
                variant_results.append({
                    "name": v.get("name", "unknown"),
                    "users": users,
                    "clicks": clicks,
                    "orders": orders,
                    "revenue": revenue,
                    "ctr": ctr,
                    "cvr": cvr,
                    "arpu": arpu
                })
            
            # Find control variant
            control = next((v for v in variant_results if v["name"].lower() == "control"), variant_results[0])
            
            # Calculate comparisons
            comparisons = []
            warnings = []
            
            for treatment in variant_results:
                if treatment["name"] == control["name"]:
                    continue
                
                if metric_type == "ctr" and treatment.get("clicks") is not None and control.get("clicks") is not None:
                    abs_diff, rel_uplift, (ci_lower, ci_upper), p_value = calculate_proportion_difference(
                        n1=control["users"],
                        x1=control["clicks"],
                        n2=treatment["users"],
                        x2=treatment["clicks"]
                    )
                    metric_name = "CTR"
                elif metric_type == "cvr" and treatment.get("orders") is not None and control.get("orders") is not None:
                    abs_diff, rel_uplift, (ci_lower, ci_upper), p_value = calculate_proportion_difference(
                        n1=control["users"],
                        x1=control["orders"],
                        n2=treatment["users"],
                        x2=treatment["orders"]
                    )
                    metric_name = "CVR"
                else:
                    continue
                
                comparisons.append({
                    "treatment_name": treatment["name"],
                    "control_name": control["name"],
                    "metric_name": metric_name,
                    "absolute_difference": float(abs_diff),
                    "relative_uplift_percent": float(rel_uplift),
                    "p_value": float(p_value),
                    "ci_lower": float(ci_lower),
                    "ci_upper": float(ci_upper),
                    "is_significant": bool(p_value < 0.05)
                })
            
            # Check sample size
            min_users = min(v["users"] for v in variant_results)
            if min_users < settings.MIN_SAMPLE_SIZE_WARNING:
                warnings.append(f"Low sample size detected (minimum {min_users} users). Results may not be reliable.")
            
            # Generate report using ReportWriterAgent
            llm_report = self.report_writer.write_ab_test_report(
                variant_results=variant_results,
                comparisons=comparisons,
                warnings=warnings
            )
            
            # Format Chinese response
            reply = self._format_ab_test_response(variant_results, comparisons, warnings, llm_report)
            
            return {
                "reply": reply,
                "detected_intent": "ab_test_analysis",
                "extra": {
                    "tool_used": "stats_calculator + ReportWriterAgent",
                    "comparisons": comparisons,
                    "warnings": warnings
                }
            }
        except Exception as e:
            return {
                "reply": f"Sorry, an error occurred while analyzing the A/B test: {str(e)}. Please verify the data format.",
                "detected_intent": "ab_test_analysis",
                "extra": {"error": str(e)}
            }
    
    async def _handle_causal_analysis(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle causal/DiD analysis request."""
        try:
            # Extract DiD parameters
            treatment_pre_users = params.get("treatment_pre_users", 0)
            treatment_pre_outcome = params.get("treatment_pre_outcome", 0)
            treatment_post_users = params.get("treatment_post_users", 0)
            treatment_post_outcome = params.get("treatment_post_outcome", 0)
            control_pre_users = params.get("control_pre_users", 0)
            control_pre_outcome = params.get("control_pre_outcome", 0)
            control_post_users = params.get("control_post_users", 0)
            control_post_outcome = params.get("control_post_outcome", 0)
            metric_type = params.get("metric_type", "proportion")
            
            # Calculate rates
            if metric_type == "proportion":
                treatment_pre = treatment_pre_outcome / treatment_pre_users if treatment_pre_users > 0 else 0
                treatment_post = treatment_post_outcome / treatment_post_users if treatment_post_users > 0 else 0
                control_pre = control_pre_outcome / control_pre_users if control_pre_users > 0 else 0
                control_post = control_post_outcome / control_post_users if control_post_users > 0 else 0
            else:
                treatment_pre = treatment_pre_outcome
                treatment_post = treatment_post_outcome
                control_pre = control_pre_outcome
                control_post = control_post_outcome
            
            # Calculate DiD
            did_results = calculate_did(
                treatment_pre=treatment_pre,
                treatment_post=treatment_post,
                control_pre=control_pre,
                control_post=control_post,
                treatment_pre_n=treatment_pre_users,
                treatment_post_n=treatment_post_users,
                control_pre_n=control_pre_users,
                control_post_n=control_post_users,
                metric_type=metric_type
            )
            
            # Generate report
            llm_report = self.report_writer.write_did_report(did_results)
            
            # Format Chinese response
            reply = self._format_causal_response(did_results, llm_report)
            
            return {
                "reply": reply,
                "detected_intent": "causal_analysis",
                "extra": {
                    "tool_used": "causal_analyzer + ReportWriterAgent",
                    "did_estimate": did_results.get("did_estimate"),
                    "p_value": did_results.get("p_value")
                }
            }
        except Exception as e:
            return {
                "reply": f"Sorry, an error occurred during causal analysis: {str(e)}. Please verify the data format.",
                "detected_intent": "causal_analysis",
                "extra": {"error": str(e)}
            }
    
    def _format_experiment_design_response(
        self, 
        result: Dict[str, Any], 
        sample_size: Optional[int],
        estimated_duration: Optional[int]
    ) -> str:
        """Format experiment design result into English response."""
        design_card = result.get("design_card")
        
        response_parts = ["## 🧪 Experiment Design\n"]
        
        if design_card:
            response_parts.append(f"**Goal**: {design_card.goal}\n")
            response_parts.append(f"**Hypothesis**: {design_card.hypothesis}\n")
            response_parts.append(f"**Design Type**: {design_card.design_type}\n")
            response_parts.append(f"**Variants**: {design_card.variants}\n")
            
            if design_card.primary_metrics:
                response_parts.append(f"**Primary Metrics**: {', '.join(design_card.primary_metrics)}\n")
            
            if sample_size:
                response_parts.append(f"\n### 📊 Sample Size Estimation\n")
                response_parts.append(f"You need **{sample_size:,}** users per variant\n")
            
            if estimated_duration:
                response_parts.append(f"Estimated duration: **{estimated_duration}** days\n")
            
            if design_card.notes:
                response_parts.append(f"\n### ⚠️ Important Notes\n")
                for note in design_card.notes:
                    response_parts.append(f"- {note}\n")
        
        # Add LLM explanation
        llm_explanation = result.get("llm_explanation", "")
        if llm_explanation:
            response_parts.append(f"\n### 💡 Detailed Explanation\n{llm_explanation}")
        
        return "".join(response_parts)
    
    def _format_ab_test_response(
        self,
        variant_results: List[Dict[str, Any]],
        comparisons: List[Dict[str, Any]],
        warnings: List[str],
        llm_report: str
    ) -> str:
        """Format A/B test analysis response.
        
        The main content comes from the LLM report which follows the 4-section structure:
        1. Result Summary
        2. Statistical Interpretation
        3. Decision Recommendation
        4. Risks and Limitations
        """
        # The LLM report is the main content - it's comprehensive and well-structured
        return llm_report
    
    def _format_causal_response(
        self,
        did_results: Dict[str, Any],
        llm_report: str
    ) -> str:
        """Format causal analysis into English response."""
        # The LLM report is comprehensive - just return it directly
        return llm_report

