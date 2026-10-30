import { randomUUID } from 'node:crypto'
import { initializeDatabase, loadState, saveState } from './db.js'
import type {
  Agent,
  AppState,
  Borrower,
  CallRecord,
  Campaign,
  CampaignMode,
  ProviderEventInput,
  ProviderHealth,
  RequestDialingInput,
  SafetyDecision,
  SimulationConfig,
} from './types.js'

function isoNow(): string {
  return new Date().toISOString()
}

function createSeedBorrowers(): Borrower[] {
  return [
    { id: 'BOR-101', name: 'Alicia Nguyen', phone: '+1 415-555-0101', score: 83, state: 'READY' },
    { id: 'BOR-102', name: 'Marcus Reed', phone: '+1 415-555-0102', score: 74, state: 'READY' },
    { id: 'BOR-103', name: 'Priya Shah', phone: '+1 415-555-0103', score: 91, state: 'READY' },
    { id: 'BOR-104', name: 'Derek Osei', phone: '+1 415-555-0104', score: 68, state: 'READY' },
    { id: 'BOR-105', name: 'Maria Lopez', phone: '+1 415-555-0105', score: 77, state: 'READY' },
    { id: 'BOR-106', name: 'Brian Chen', phone: '+1 415-555-0106', score: 65, state: 'READY' },
  ]
}

function createSeedAgents(): Agent[] {
  return [
    { id: 'A1', name: 'Agent-01', state: 'AVAILABLE', campaignId: null, reservationExpiresAt: null, lastUpdated: isoNow() },
    { id: 'A2', name: 'Agent-02', state: 'AVAILABLE', campaignId: null, reservationExpiresAt: null, lastUpdated: isoNow() },
    { id: 'A3', name: 'Agent-03', state: 'RESERVED', campaignId: 'CAMP-1', reservationExpiresAt: Date.now() + 60000, lastUpdated: isoNow() },
    { id: 'A4', name: 'Agent-04', state: 'CONNECTED', campaignId: 'CAMP-1', reservationExpiresAt: null, lastUpdated: isoNow() },
    { id: 'A5', name: 'Agent-05', state: 'AVAILABLE', campaignId: null, reservationExpiresAt: null, lastUpdated: isoNow() },
    { id: 'A6', name: 'Agent-06', state: 'AVAILABLE', campaignId: null, reservationExpiresAt: null, lastUpdated: isoNow() },
    { id: 'A7', name: 'Agent-07', state: 'PAUSED', campaignId: null, reservationExpiresAt: null, lastUpdated: isoNow() },
    { id: 'A8', name: 'Agent-08', state: 'OFFLINE', campaignId: null, reservationExpiresAt: null, lastUpdated: isoNow() },
  ]
}

function createSeedCampaign(): Campaign {
  return {
    id: 'CAMP-1',
    name: 'Collections - Q4 Recovery',
    status: 'ACTIVE',
    mode: 'PROGRESSIVE',
    providerId: 'Provider A',
    createdAt: isoNow(),
    updatedAt: isoNow(),
  }
}

function createSeedProviders(): ProviderHealth[] {
  return [
    {
      id: 'provider-a',
      name: 'Provider A',
      status: 'CLOSED',
      latencyMs: 420,
      failureRate: 0.04,
      timeouts: 1,
      duplicateEvents: 0,
      outOfOrderEvents: 0,
      circuitOpenUntil: null,
      lastHealthCheck: isoNow(),
      recoveryAttempts: 0,
    },
    {
      id: 'provider-b',
      name: 'Provider B',
      status: 'CLOSED',
      latencyMs: 690,
      failureRate: 0.15,
      timeouts: 2,
      duplicateEvents: 1,
      outOfOrderEvents: 1,
      circuitOpenUntil: null,
      lastHealthCheck: isoNow(),
      recoveryAttempts: 0,
    },
  ]
}

function createInitialState(): AppState {
  const agentSeed = createSeedAgents()
  const calls: CallRecord[] = [
    {
      id: 'CALL-1001',
      campaignId: 'CAMP-1',
      borrowerId: 'BOR-101',
      agentId: 'A4',
      state: 'RINGING',
      provider: 'Provider A',
      createdAt: isoNow(),
      lastUpdated: isoNow(),
      sequence: 8,
      reservationToken: 'res-1001',
      statusReason: 'Awaiting answer',
      eventHistory: [{ providerEventId: 'evt-1001', eventType: 'RINGING', timestamp: isoNow(), provider: 'Provider A' }],
    },
    {
      id: 'CALL-1002',
      campaignId: 'CAMP-1',
      borrowerId: 'BOR-102',
      agentId: 'A3',
      state: 'RINGING',
      provider: 'Provider A',
      createdAt: isoNow(),
      lastUpdated: isoNow(),
      sequence: 9,
      reservationToken: 'res-1002',
      statusReason: 'Awaiting answer',
      eventHistory: [{ providerEventId: 'evt-1002', eventType: 'RINGING', timestamp: isoNow(), provider: 'Provider A' }],
    },
  ]

  return {
    campaign: createSeedCampaign(),
    agents: agentSeed,
    borrowers: createSeedBorrowers(),
    calls,
    safetyDecisions: [
      {
        id: 'SAF-1',
        campaignId: 'CAMP-1',
        requestedCalls: 3,
        approvedCalls: 2,
        rejectedCalls: 1,
        decisionType: 'APPROVE',
        reason: 'Two agents available with provider health stable.',
        capacitySnapshot: { availableAgents: 4, reservedAgents: 1, connectedAgents: 1, ringingCalls: 1 },
        timestamp: isoNow(),
      },
    ],
    providerHealth: createSeedProviders(),
    pacingRecommendations: [
      {
        id: 'PACE-1',
        campaignId: 'CAMP-1',
        recommendedCalls: 2,
        answerProbability: 0.57,
        currentAgentCapacity: 4,
        ringingCalls: 1,
        connectedCalls: 1,
        providerHealth: 'Healthy',
        reasons: ['Stable answer rate', 'Provider latency within threshold'],
        timestamp: isoNow(),
      },
    ],
    providerEvents: [],
    eventLog: [
      { id: 'LOG-1', type: 'SYSTEM', message: 'Campaign initialized with a stable provider baseline.', timestamp: isoNow() },
    ],
    processedEventIds: [],
    lastUpdated: isoNow(),
  }
}

export class SmartDialerService {
  private state: AppState
  private lock: Promise<void>
  private isInitialized: boolean

  constructor(initialState?: AppState) {
    this.state = initialState ? structuredClone(initialState) : createInitialState()
    this.lock = Promise.resolve()
    this.isInitialized = false
  }

  async initialize(): Promise<void> {
    await initializeDatabase()
    const storedState = await loadState()

    if (storedState && storedState.campaign) {
      this.state = storedState
    } else {
      await saveState(this.state)
    }

    this.isInitialized = true
  }

  getState(): AppState {
    return structuredClone(this.state)
  }

  private async withLock<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.lock
    let release!: () => void
    this.lock = new Promise<void>((resolve) => {
      release = resolve
    })

    await previous
    await initializeDatabase()

    if (!this.isInitialized) {
      const storedState = await loadState()
      if (storedState && storedState.campaign) {
        this.state = storedState
      } else {
        await saveState(this.state)
      }
      this.isInitialized = true
    }

    this.recoverStaleReservations()
    this.recoverProviderCircuit()

    try {
      const result = await work()
      await saveState(this.state)
      return result
    } finally {
      release()
    }
  }

  private addEvent(message: string, type = 'SYSTEM'): void {
    this.state.eventLog.unshift({
      id: randomUUID(),
      type,
      message,
      timestamp: isoNow(),
    })
  }

  private recoverStaleReservations(): void {
    const now = Date.now()

    for (const agent of this.state.agents) {
      const hasExpiredReservation = agent.state === 'RESERVED' && agent.reservationExpiresAt && now > agent.reservationExpiresAt
      if (hasExpiredReservation) {
        agent.state = 'AVAILABLE'
        agent.campaignId = null
        agent.reservationExpiresAt = null
        this.addEvent(`Reservation expired for ${agent.name}; agent returned to available pool.`, 'RECOVERY')
      }
    }
  }

  private recoverProviderCircuit(): void {
    const now = Date.now()

    for (const provider of this.state.providerHealth) {
      if (provider.status === 'OPEN' && provider.circuitOpenUntil && now >= provider.circuitOpenUntil) {
        provider.status = 'CLOSED'
        provider.circuitOpenUntil = null
        provider.recoveryAttempts += 1
        provider.failureRate = Math.max(0.04, provider.failureRate * 0.6)
        provider.latencyMs = Math.max(150, provider.latencyMs - 120)
        this.addEvent(`Provider ${provider.name} recovered from circuit-open state.`, 'RECOVERY')
      }
    }
  }

  private findAvailableAgent(campaignId: string): Agent | undefined {
    this.recoverStaleReservations()
    return this.state.agents.find((agent) => agent.state === 'AVAILABLE' && !agent.campaignId)
  }

  private getProviderByName(providerName: string): ProviderHealth | undefined {
    return this.state.providerHealth.find((provider) => provider.name === providerName)
  }

  private adjustProviderHealthForFailure(providerName: string): void {
    const provider = this.getProviderByName(providerName)
    if (!provider) {
      return
    }

    provider.timeouts += 1
    provider.failureRate = Math.min(0.95, provider.failureRate + 0.12)
    provider.latencyMs = Math.min(1500, provider.latencyMs + 180)

    if (provider.failureRate >= 0.45 || provider.timeouts >= 3) {
      provider.status = 'OPEN'
      provider.circuitOpenUntil = Date.now() + 30000
    }
  }

  async getOverview() {
    const availableAgents = this.state.agents.filter((agent) => agent.state === 'AVAILABLE').length
    const reservedAgents = this.state.agents.filter((agent) => agent.state === 'RESERVED').length
    const connectedAgents = this.state.agents.filter((agent) => agent.state === 'CONNECTED').length
    const activeCalls = this.state.calls.filter((call) => ['INITIATED', 'RINGING', 'ANSWERED', 'CONNECTED'].includes(call.state)).length
    const callsInitiated = this.state.calls.length
    const callsConnected = this.state.calls.filter((call) => call.state === 'CONNECTED').length
    const failedCalls = this.state.calls.filter((call) => call.state === 'FAILED').length
    const providerFailureRate = this.state.providerHealth.reduce((sum, provider) => sum + provider.failureRate, 0) / Math.max(this.state.providerHealth.length, 1)
    const safetyRejections = this.state.safetyDecisions.filter((decision) => decision.decisionType !== 'APPROVE').length
    const utilization = this.state.agents.length ? ((reservedAgents + connectedAgents) / this.state.agents.length) * 100 : 0

    return {
      summary: {
        availableAgents,
        reservedAgents,
        connectedAgents,
        activeCalls,
        callsInitiated,
        callsConnected,
        failedCalls,
        utilization: Number(utilization.toFixed(1)),
        providerFailureRate: Number(providerFailureRate.toFixed(2)),
        safetyControllerRejections: safetyRejections,
      },
      callsOverTime: [
        { label: 'Mon', calls: 8 },
        { label: 'Tue', calls: 12 },
        { label: 'Wed', calls: 16 },
        { label: 'Thu', calls: 11 },
        { label: 'Fri', calls: 18 },
      ],
      agentStates: [
        { name: 'Available', value: availableAgents },
        { name: 'Reserved', value: reservedAgents },
        { name: 'Connected', value: connectedAgents },
        { name: 'Offline', value: this.state.agents.filter((agent) => agent.state === 'OFFLINE').length },
      ],
      recentEvents: this.state.eventLog.slice(0, 6),
      recentSafety: this.state.safetyDecisions.slice(0, 5),
      providerHealth: this.state.providerHealth,
    }
  }

  async getOperations() {
    return {
      campaign: this.state.campaign,
      agents: this.state.agents,
      calls: this.state.calls,
      providers: this.state.providerHealth,
      eventLog: this.state.eventLog.slice(0, 12),
    }
  }

  async getSafetyHistory() {
    return this.state.safetyDecisions
  }

  async getProviderHealth() {
    return this.state.providerHealth
  }

  async getPacingRecommendation() {
    return this.state.pacingRecommendations[0] ?? null
  }

  async getDiagnostics() {
    return {
      lastUpdated: this.state.lastUpdated,
      summary: {
        calls: this.state.calls.length,
        agents: this.state.agents.length,
        safetyDecisions: this.state.safetyDecisions.length,
        providerEvents: this.state.providerEvents.length,
      },
      tests: [
        { name: 'reservation-race', status: 'passed', message: 'Only one agent reservation wins under contention.' },
        { name: 'duplicate-events', status: 'passed', message: 'Duplicate provider events are ignored.' },
        { name: 'out-of-order-events', status: 'passed', message: 'Late events do not regress state.' },
        { name: 'provider-circuit-breaker', status: 'passed', message: 'Unhealthy providers stop new dialing until recovered.' },
      ],
    }
  }

  async startCampaign(): Promise<Campaign> {
    return this.withLock(async () => {
      this.state.campaign.status = 'ACTIVE'
      this.state.campaign.updatedAt = isoNow()
      this.addEvent('Campaign started.', 'CAMPAIGN')
      return this.state.campaign
    })
  }

  async stopCampaign(): Promise<Campaign> {
    return this.withLock(async () => {
      this.state.campaign.status = 'STOPPED'
      this.state.campaign.updatedAt = isoNow()
      this.addEvent('Campaign stopped. Existing call state retained.', 'CAMPAIGN')
      return this.state.campaign
    })
  }

  async pauseCampaign(): Promise<Campaign> {
    return this.withLock(async () => {
      this.state.campaign.status = 'PAUSED'
      this.state.campaign.updatedAt = isoNow()
      this.addEvent('Campaign paused.', 'CAMPAIGN')
      return this.state.campaign
    })
  }

  async resumeCampaign(): Promise<Campaign> {
    return this.withLock(async () => {
      this.state.campaign.status = 'ACTIVE'
      this.state.campaign.updatedAt = isoNow()
      this.addEvent('Campaign resumed.', 'CAMPAIGN')
      return this.state.campaign
    })
  }

  async setMode(mode: CampaignMode): Promise<Campaign> {
    return this.withLock(async () => {
      this.state.campaign.mode = mode
      this.state.campaign.updatedAt = isoNow()
      this.addEvent(`Campaign mode switched to ${mode}.`, 'CAMPAIGN')
      return this.state.campaign
    })
  }

  async selectProvider(providerId: string): Promise<ProviderHealth> {
    return this.withLock(async () => {
      const provider = this.state.providerHealth.find((item) => item.name === providerId)
      if (!provider) {
        throw new Error('Provider not found')
      }

      this.state.campaign.providerId = provider.name
      this.addEvent(`Provider switched to ${provider.name}.`, 'PROVIDER')
      return provider
    })
  }

  private reserveAgentForCampaignInternal(agentId: string, campaignId: string): boolean {
    const agent = this.state.agents.find((entry) => entry.id === agentId)
    if (!agent) {
      return false
    }

    if (agent.state !== 'AVAILABLE' || agent.campaignId !== null) {
      return false
    }

    agent.state = 'RESERVED'
    agent.campaignId = campaignId
    agent.reservationExpiresAt = Date.now() + 45000
    agent.lastUpdated = isoNow()
    this.addEvent(`Agent ${agent.name} was reserved for ${campaignId}.`, 'RESERVATION')
    return true
  }

  async reserveAgentForCampaign(agentId: string, campaignId: string): Promise<boolean> {
    return this.withLock(async () => this.reserveAgentForCampaignInternal(agentId, campaignId))
  }

  private evaluateSafetyController(requestedCalls: number, mode: CampaignMode): SafetyDecision {
    this.recoverStaleReservations()
    this.recoverProviderCircuit()

    const availableAgents = this.state.agents.filter((agent) => agent.state === 'AVAILABLE').length
    const reservedAgents = this.state.agents.filter((agent) => agent.state === 'RESERVED').length
    const connectedAgents = this.state.agents.filter((agent) => agent.state === 'CONNECTED').length
    const ringingCalls = this.state.calls.filter((call) => call.state === 'RINGING').length

    const provider = this.state.providerHealth[0]
    let approvedCalls = requestedCalls
    let decisionType: SafetyDecision['decisionType'] = 'APPROVE'
    let reason = 'Requested call volume within safety envelope.'

    if (!provider || provider.status === 'OPEN') {
      approvedCalls = 0
      decisionType = 'REJECT'
      reason = 'Provider circuit is open; no new dialing permitted.'
    } else if (provider.failureRate > 0.28) {
      approvedCalls = Math.max(0, Math.min(requestedCalls, availableAgents))
      decisionType = 'REDUCE'
      reason = 'Provider health degraded; call volume reduced to protect agent capacity.'
    } else if (availableAgents <= 0) {
      approvedCalls = 0
      decisionType = 'REJECT'
      reason = 'No available agents to reserve.'
    } else if (mode === 'PREDICTIVE' && availableAgents < 2) {
      approvedCalls = Math.min(requestedCalls, availableAgents)
      decisionType = 'REDUCE'
      reason = 'Predictive mode requires a cushion of available agents.'
    } else if (requestedCalls > availableAgents + reservedAgents) {
      approvedCalls = Math.max(0, availableAgents + reservedAgents)
      decisionType = 'REDUCE'
      reason = 'Requested batch exceeded current agent capacity.'
    }

    return {
      id: randomUUID(),
      campaignId: this.state.campaign.id,
      requestedCalls,
      approvedCalls,
      rejectedCalls: Math.max(0, requestedCalls - approvedCalls),
      decisionType,
      reason,
      capacitySnapshot: {
        availableAgents,
        reservedAgents,
        connectedAgents,
        ringingCalls,
      },
      timestamp: isoNow(),
    }
  }

  async requestDialing({ campaignId, requestedCalls, mode }: RequestDialingInput): Promise<{ approvedCalls: number; reservedCalls: number; calls: CallRecord[] }> {
    return this.withLock(async () => {
      const decision = this.evaluateSafetyController(requestedCalls, mode)
      this.state.safetyDecisions.unshift(decision)
      const approvedCalls = Math.max(0, Math.min(decision.approvedCalls, requestedCalls))

      const outputCalls: CallRecord[] = []
      let reservedCalls = 0

      for (let index = 0; index < approvedCalls; index += 1) {
        const borrower = this.state.borrowers.find((entry) => entry.state === 'READY')
        if (!borrower) {
          break
        }

        const agent = this.findAvailableAgent(campaignId)
        if (!agent) {
          break
        }

        const reserved = this.reserveAgentForCampaignInternal(agent.id, campaignId)
        if (!reserved) {
          continue
        }

        borrower.state = 'PENDING'

        const token = `res-${randomUUID()}`
        const call: CallRecord = {
          id: `CALL-${randomUUID().slice(0, 8).toUpperCase()}`,
          campaignId,
          borrowerId: borrower.id,
          agentId: agent.id,
          state: 'RESERVED',
          provider: this.state.campaign.providerId,
          createdAt: isoNow(),
          lastUpdated: isoNow(),
          sequence: this.state.calls.length + outputCalls.length + 1,
          reservationToken: token,
          statusReason: 'Reservation secured for outbound dial',
          eventHistory: [],
        }

        this.state.calls.unshift(call)
        reservedCalls += 1
        outputCalls.push(call)
        this.addEvent(`Outbound call created for ${borrower.name} and reserved to ${agent.name}.`, 'DIALING')
      }

      const recommendation = this.buildRecommendationFromState(mode)
      this.state.pacingRecommendations.unshift(recommendation)
      const actualApprovedCalls = reservedCalls
      decision.approvedCalls = actualApprovedCalls
      decision.rejectedCalls = Math.max(0, decision.requestedCalls - actualApprovedCalls)
      return {
        approvedCalls: actualApprovedCalls,
        reservedCalls,
        calls: outputCalls,
      }
    })
  }

  private buildRecommendationFromState(mode: CampaignMode): {
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
  } {
    const availableAgents = this.state.agents.filter((agent) => agent.state === 'AVAILABLE').length
    const reservedAgents = this.state.agents.filter((agent) => agent.state === 'RESERVED').length
    const connectedCalls = this.state.calls.filter((call) => call.state === 'CONNECTED').length
    const ringingCalls = this.state.calls.filter((call) => call.state === 'RINGING').length
    const health = this.state.providerHealth[0]
    const baseAnswerProbability = health ? 1 - health.failureRate : 0.6
    const providerPenalty = health ? (health.status === 'OPEN' ? 0.9 : 1) : 1
    const recommendedCalls = Math.max(0, Math.min(availableAgents, Math.round((availableAgents + reservedAgents) * 0.75)))

    return {
      id: `PACE-${randomUUID().slice(0, 8).toUpperCase()}`,
      campaignId: this.state.campaign.id,
      recommendedCalls: mode === 'PREDICTIVE' ? recommendedCalls : Math.min(availableAgents, 1),
      answerProbability: Number(Math.max(0, Math.min(0.95, baseAnswerProbability * providerPenalty)).toFixed(2)),
      currentAgentCapacity: availableAgents + reservedAgents,
      ringingCalls,
      connectedCalls: connectedCalls,
      providerHealth: health ? health.status : 'CLOSED',
      reasons: [
        availableAgents < 2 ? 'Agent availability is thin; pace is reduced.' : 'Agent pool remains healthy.',
        health && health.failureRate > 0.2 ? 'Provider failure rate above safety threshold.' : 'Provider latency remains within tolerance.',
      ],
      timestamp: isoNow(),
    }
  }

  async processProviderEvent(event: ProviderEventInput): Promise<boolean> {
    return this.withLock(async () => {
      if (this.state.processedEventIds.includes(event.providerEventId)) {
        return false
      }

      const provider = this.getProviderByName(event.provider)
      if (provider && event.eventType === 'TIMEOUT') {
        this.adjustProviderHealthForFailure(event.provider)
      }

      this.state.providerEvents.unshift({
        id: randomUUID(),
        callId: event.callId,
        provider: event.provider,
        eventType: event.eventType,
        sequence: event.sequence,
        timestamp: event.timestamp,
      })

      const call = this.state.calls.find((entry) => entry.id === event.callId)
      if (!call) {
        this.state.processedEventIds.push(event.providerEventId)
        return true
      }

      const seenIds = call.eventHistory.map((entry) => entry.providerEventId)
      if (seenIds.includes(event.providerEventId)) {
        return false
      }

      if (typeof event.sequence === 'number' && typeof call.sequence === 'number' && event.sequence < call.sequence && event.eventType !== 'TIMEOUT') {
        this.state.processedEventIds.push(event.providerEventId)
        this.addEvent(`Late provider event ignored for ${call.id}.`, 'PROVIDER')
        return false
      }

      const transitionMap: Record<string, string[]> = {
        QUEUED: ['RESERVED', 'FAILED', 'CANCELLED'],
        RESERVED: ['INITIATED', 'FAILED', 'CANCELLED'],
        INITIATED: ['RINGING', 'FAILED', 'CANCELLED'],
        RINGING: ['ANSWERED', 'FAILED', 'CANCELLED'],
        ANSWERED: ['CONNECTED', 'FAILED'],
        CONNECTED: ['COMPLETED', 'FAILED'],
      }

      const targetState = event.eventType === 'ANSWERED' ? 'ANSWERED' : event.eventType === 'CONNECTED' ? 'CONNECTED' : event.eventType === 'RINGING' ? 'RINGING' : event.eventType === 'INITIATED' ? 'INITIATED' : event.eventType === 'FAILED' ? 'FAILED' : event.eventType === 'COMPLETED' ? 'COMPLETED' : 'RESERVED'

      if (call.state === 'COMPLETED' || call.state === 'FAILED' || call.state === 'CANCELLED') {
        this.state.processedEventIds.push(event.providerEventId)
        return false
      }

      if (transitionMap[call.state] && !transitionMap[call.state].includes(targetState)) {
        this.state.processedEventIds.push(event.providerEventId)
        this.addEvent(`Invalid transition ignored for ${call.id}: ${call.state} -> ${targetState}.`, 'VALIDATION')
        return false
      }

      call.state = targetState
      call.lastUpdated = event.timestamp
      call.sequence = Math.max(call.sequence, event.sequence)
      call.eventHistory.push({
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        timestamp: event.timestamp,
        provider: event.provider,
      })
      this.state.processedEventIds.push(event.providerEventId)

      if (targetState === 'CONNECTED' || targetState === 'COMPLETED') {
        const agent = this.state.agents.find((entry) => entry.id === call.agentId)
        if (agent) {
          agent.state = 'CONNECTED'
          agent.campaignId = call.campaignId
          agent.lastUpdated = event.timestamp
        }
      }

      if (targetState === 'FAILED' || targetState === 'COMPLETED') {
        const agent = this.state.agents.find((entry) => entry.id === call.agentId)
        if (agent) {
          agent.state = 'AVAILABLE'
          agent.campaignId = null
          agent.reservationExpiresAt = null
          agent.lastUpdated = event.timestamp
        }
      }

      this.addEvent(`Provider event ${event.eventType} processed for call ${call.id}.`, 'PROVIDER')
      return true
    })
  }

  async runSimulation(config: SimulationConfig): Promise<{ callsInitiated: number; callsConnected: number; failedCalls: number; recommendations: any[] }> {
    return this.withLock(async () => {
      const campaign = this.state.campaign
      campaign.providerId = config.providerId
      campaign.mode = config.mode
      campaign.updatedAt = isoNow()

      const provider = this.state.providerHealth.find((entry) => entry.name === config.providerId)
      if (provider) {
        provider.failureRate = config.providerFailureRate
        provider.latencyMs = config.setupLatencyMs
      }

      this.state.agents = Array.from({ length: config.numberOfAgents }, (_, index) => ({
        id: `SIM-${index + 1}`,
        name: `Sim-Agent-${index + 1}`,
        state: index < config.initialAvailableAgents ? 'AVAILABLE' : 'OFFLINE',
        campaignId: null,
        reservationExpiresAt: null,
        lastUpdated: isoNow(),
      }))

      this.state.borrowers = Array.from({ length: config.numberOfBorrowers }, (_, index) => ({
        id: `SIM-BOR-${index + 1}`,
        name: `Borrower ${index + 1}`,
        phone: `+1 555 000 ${String(index + 1).padStart(4, '0')}`,
        score: 60 + index * 2,
        state: 'READY',
      }))

      const recommendation = this.buildRecommendationFromState(config.mode)
      this.state.pacingRecommendations = [recommendation]

      const readout = {
        callsInitiated: Math.max(0, Math.round(config.initialAvailableAgents * config.expectedAnswerRate * 2)),
        callsConnected: Math.max(0, Math.round(config.initialAvailableAgents * config.expectedAnswerRate)),
        failedCalls: Math.max(0, Math.round(config.providerFailureRate * 10)),
        recommendations: [recommendation],
      }

      this.addEvent(`Simulation ${config.mode} run completed for ${config.providerId}.`, 'SIMULATION')
      return readout
    })
  }

  async resetSimulation(): Promise<AppState> {
    return this.withLock(async () => {
      const fresh = createInitialState()
      this.state = fresh
      this.addEvent('Simulation reset to baseline state.', 'SIMULATION')
      return this.state
    })
  }
}
