import cors from 'cors'
import express from 'express'
import { SmartDialerService } from './service.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const dialer = new SmartDialerService()

await dialer.initialize()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    environment: 'LOCAL SIMULATION',
    provider: 'CredResolve SmartDialer',
  })
})

app.get('/api/overview', async (_request, response) => {
  const overview = await dialer.getOverview()
  response.json(overview)
})

app.get('/api/operations', async (_request, response) => {
  const operations = await dialer.getOperations()
  response.json(operations)
})

app.get('/api/safety-decisions', async (_request, response) => {
  const decisions = await dialer.getSafetyHistory()
  response.json(decisions)
})

app.get('/api/provider-health', async (_request, response) => {
  const health = await dialer.getProviderHealth()
  response.json(health)
})

app.get('/api/pacing', async (_request, response) => {
  const recommendation = await dialer.getPacingRecommendation()
  response.json(recommendation)
})

app.get('/api/diagnostics', async (_request, response) => {
  const diagnostics = await dialer.getDiagnostics()
  response.json(diagnostics)
})

app.post('/api/campaign/start', async (_request, response) => {
  const campaign = await dialer.startCampaign()
  response.json(campaign)
})

app.post('/api/campaign/stop', async (_request, response) => {
  const campaign = await dialer.stopCampaign()
  response.json(campaign)
})

app.post('/api/campaign/pause', async (_request, response) => {
  const campaign = await dialer.pauseCampaign()
  response.json(campaign)
})

app.post('/api/campaign/resume', async (_request, response) => {
  const campaign = await dialer.resumeCampaign()
  response.json(campaign)
})

app.post('/api/campaign/mode', async (request, response) => {
  const { mode } = request.body ?? {}
  const campaign = await dialer.setMode(mode)
  response.json(campaign)
})

app.post('/api/provider/select', async (request, response) => {
  const { providerId } = request.body ?? {}
  const provider = await dialer.selectProvider(providerId)
  response.json(provider)
})

app.post('/api/dialing/request', async (request, response) => {
  const { campaignId, requestedCalls, mode } = request.body ?? {}

  const result = await dialer.requestDialing({
    campaignId: campaignId ?? dialer.getState().campaign.id,
    requestedCalls: Number(requestedCalls ?? 1),
    mode: mode ?? 'PROGRESSIVE',
  })

  response.json(result)
})

app.post('/api/provider/event', async (request, response) => {
  const event = request.body ?? {}
  const processed = await dialer.processProviderEvent({
    providerEventId: event.providerEventId ?? `evt-${Date.now()}`,
    callId: event.callId,
    eventType: event.eventType,
    provider: event.provider ?? 'Provider A',
    timestamp: event.timestamp ?? new Date().toISOString(),
    sequence: Number(event.sequence ?? 0),
  })

  response.json({ processed })
})

app.post('/api/simulation/run', async (request, response) => {
  const config = request.body ?? {}
  const simulation = await dialer.runSimulation({
    providerId: config.providerId ?? 'Provider A',
    numberOfAgents: Number(config.numberOfAgents ?? 10),
    numberOfBorrowers: Number(config.numberOfBorrowers ?? 25),
    initialAvailableAgents: Number(config.initialAvailableAgents ?? 6),
    expectedAnswerRate: Number(config.expectedAnswerRate ?? 0.45),
    averageTalkDuration: Number(config.averageTalkDuration ?? 120),
    setupLatencyMs: Number(config.setupLatencyMs ?? 500),
    providerFailureRate: Number(config.providerFailureRate ?? 0.12),
    duplicateEventProbability: Number(config.duplicateEventProbability ?? 0.04),
    outOfOrderEventProbability: Number(config.outOfOrderEventProbability ?? 0.05),
    simulationDurationSeconds: Number(config.simulationDurationSeconds ?? 120),
    mode: config.mode ?? 'PROGRESSIVE',
  })

  response.json(simulation)
})

app.post('/api/simulation/reset', async (_request, response) => {
  const state = await dialer.resetSimulation()
  response.json(state)
})

app.listen(port, () => {
  console.log(`CredResolve SmartDialer API listening on http://localhost:${port}`)
})

export default app
