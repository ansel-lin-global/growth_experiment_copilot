/**
 * API client for backend communication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ExperimentDesignRequest {
  description: string
  baseline_rate?: number
  minimum_detectable_effect?: number
  alpha?: number
  power?: number
  expected_daily_traffic?: number
}

export interface ExperimentDesignResponse {
  design_card: {
    goal: string
    hypothesis: string
    primary_metrics: string[]
    secondary_metrics: string[]
    guardrail_metrics: string[]
    design_type: string
    variants: string
    population: string | null
    randomization_unit: string | null
    traffic_allocation: string | null
    sample_size_per_variant: number | null
    estimated_duration_days: number | null
    notes: string[]
  }
  llm_explanation: string
}

export interface VariantData {
  name: string
  users: number
  clicks?: number
  orders?: number
  revenue?: number
}

export interface ABTestAnalysisRequest {
  variants: VariantData[]
  overall_metric_type: 'ctr' | 'cvr' | 'revenue_per_user' | 'custom'
}

export interface ABTestAnalysisResponse {
  structured_results: {
    variants: any[]
    comparisons: any[]
    primary_metric: string
  }
  llm_report_markdown: string
  warnings: string[]
}

export interface DiDDataPoint {
  group: 'treatment' | 'control'
  period: 'pre' | 'post'
  users: number
  outcome: number
}

export interface CausalDiDRequest {
  data: DiDDataPoint[]
  metric_type: 'proportion' | 'mean'
}

export interface UpliftDataPoint {
  treatment: number
  outcome: number
  features?: Record<string, any>
}

export interface CausalUpliftRequest {
  data: UpliftDataPoint[]
}

export interface CausalAnalysisRequest {
  mode: 'did' | 'uplift'
  did_data?: CausalDiDRequest
  uplift_data?: CausalUpliftRequest
}

export async function designExperiment(
  request: ExperimentDesignRequest
): Promise<ExperimentDesignResponse> {
  const response = await fetch(`${API_BASE_URL}/api/experiment-design`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to design experiment')
  }

  return response.json()
}

export async function analyzeABTest(
  request: ABTestAnalysisRequest
): Promise<ABTestAnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analyze-ab-test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to analyze A/B test')
  }

  return response.json()
}

export async function analyzeCausal(
  request: CausalAnalysisRequest
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/analyze-causal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to analyze causal experiment')
  }

  return response.json()
}

// Agent Chat API
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AgentChatRequest {
  messages: ChatMessage[]
  conversation_id?: string
  metadata?: Record<string, any>
}

export interface AgentChatResponse {
  reply: string
  detected_intent: 'experiment_design' | 'ab_test_analysis' | 'causal_analysis' | 'clarification_needed' | 'general_conversation'
  extra?: Record<string, any>
}

export async function sendAgentChat(
  request: AgentChatRequest
): Promise<AgentChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/agent-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to send chat message')
  }

  return response.json()
}


