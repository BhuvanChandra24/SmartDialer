export type AgentState =
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'RESERVED'
  | 'DIALING'
  | 'CONNECTED'
  | 'WRAP_UP'
  | 'PAUSED'

export type CallState =
  | 'QUEUED'
  | 'RESERVED'
  | 'INITIATED'
  | 'RINGING'
  | 'ANSWERED'
  | 'CONNECTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'STOPPED'
export type CampaignMode = 'PROGRESSIVE' | 'PREDICTIVE'
export type ProviderStatus = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface Agent {
  id: string
  name: string
  state: AgentState
  campaignId: string | null
  reservationExpiresAt: number | null
  lastUpdated: string
}

export interface Borrower {
  id: string
  name: string
  phone: string
  score: number
  state: 'READY' | 'DNC' | 'PENDING'
}

export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  mode: CampaignMode
  providerId: string
  createdAt: string
  updatedAt: string
}

export interface CallRecord {
  id: string
  campaignId: string
  borrowerId: string
  agentId: string | null
  state: CallState
  provider: string
  createdAt: string
  lastUpdated: string
  sequence: number
  reservationToken: string | null
  statusReason: string | null
  eventHistory: Array<{
    providerEventId: string
    eventType: string
    timestamp: string
    provider: string
  }>
}

export interface SafetyDecision {
  id: string
  campaignId: string
  requestedCalls: number
  approvedCalls: number
  rejectedCalls: number
  decisionType: 'APPROVE' | 'REDUCE' | 'REJECT' | 'FALLBACK_PROGRESSIVE'
  reason: string
  capacitySnapshot: {
    availableAgents: number
    reservedAgents: number
    connectedAgents: number
    ringingCalls: number
  }
  timestamp: string
}

export interface ProviderHealth {
  id: string
  name: string
  status: ProviderStatus
  latencyMs: number
  failureRate: number
  timeouts: number
  duplicateEvents: number
  outOfOrderEvents: number
  circuitOpenUntil: number | null
  lastHealthCheck: string
  recoveryAttempts: number
}

export interface PacingRecommendation {
  id: string
  campaignId: string
  recommendedCalls: number
  answerProbability: number
  currentAgentCapacity: number
  ringingCalls: number
  connectedCalls: number
  providerHealth: string
  reasons: string[]
  timestamp: string
}

export interface EventLogEntry {
  id: string
  type: string
  message: string
  timestamp: string
}

export interface AppState {
  campaign: Campaign
  agents: Agent[]
  borrowers: Borrower[]
  calls: CallRecord[]
  safetyDecisions: SafetyDecision[]
  providerHealth: ProviderHealth[]
  pacingRecommendations: PacingRecommendation[]
  providerEvents: Array<{
    id: string
    callId: string
    provider: string
    eventType: string
    sequence: number
    timestamp: string
  }>
  eventLog: EventLogEntry[]
  processedEventIds: string[]
  lastUpdated: string
}

export interface RequestDialingInput {
  campaignId: string
  requestedCalls: number
  mode: CampaignMode
}

export interface ProviderEventInput {
  providerEventId: string
  callId: string
  eventType: string
  provider: string
  timestamp: string
  sequence: number
}

export interface SimulationConfig {
  providerId: string
  numberOfAgents: number
  numberOfBorrowers: number
  initialAvailableAgents: number
  expectedAnswerRate: number
  averageTalkDuration: number
  setupLatencyMs: number
  providerFailureRate: number
  duplicateEventProbability: number
  outOfOrderEventProbability: number
  simulationDurationSeconds: number
  mode: CampaignMode
}
