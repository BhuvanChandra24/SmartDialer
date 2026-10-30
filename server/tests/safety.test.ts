import { describe, expect, it } from 'vitest'
import { SmartDialerService } from '../service.js'

describe('SmartDialer safety invariants', () => {
  it('ensures two workers cannot reserve the same agent', async () => {
    const service = new SmartDialerService()
    await service.resetSimulation()
    const campaignId = service.getState().campaign.id

    const first = await service.reserveAgentForCampaign('A1', campaignId)
    const second = await service.reserveAgentForCampaign('A1', campaignId)

    expect(first).toBe(true)
    expect(second).toBe(false)
  })

  it('never exceeds the reserved capacity when a call batch is approved', async () => {
    const service = new SmartDialerService()
    await service.resetSimulation()
    const campaignId = service.getState().campaign.id
    const { approvedCalls, reservedCalls } = await service.requestDialing({
      campaignId,
      requestedCalls: 12,
      mode: 'PREDICTIVE',
    })

    expect(approvedCalls).toBeLessThanOrEqual(reservedCalls)
    expect(approvedCalls).toBeGreaterThanOrEqual(0)
  })

  it('ignores duplicate provider events', async () => {
    const service = new SmartDialerService()
    await service.resetSimulation()
    const call = service.getState().calls[0]

    await service.processProviderEvent({
      providerEventId: 'evt-dup-1',
      callId: call.id,
      eventType: 'ANSWERED',
      provider: 'Provider A',
      timestamp: new Date().toISOString(),
      sequence: 12,
    })

    await service.processProviderEvent({
      providerEventId: 'evt-dup-1',
      callId: call.id,
      eventType: 'ANSWERED',
      provider: 'Provider A',
      timestamp: new Date().toISOString(),
      sequence: 12,
    })

    const refreshed = service.getState().calls.find((item) => item.id === call.id)
    expect(refreshed?.eventHistory.filter((event) => event.providerEventId === 'evt-dup-1')).toHaveLength(1)
  })

  it('ignores out-of-order provider events after the call has advanced', async () => {
    const service = new SmartDialerService()
    await service.resetSimulation()
    const call = service.getState().calls[0]
    const liveCall = (service as any).state.calls.find((item: { id: string }) => item.id === call.id)
    if (!liveCall) {
      throw new Error('Call not found')
    }

    liveCall.sequence = 10
    liveCall.state = 'ANSWERED'

    await service.processProviderEvent({
      providerEventId: 'evt-stale-1',
      callId: call.id,
      eventType: 'RINGING',
      provider: 'Provider A',
      timestamp: new Date().toISOString(),
      sequence: 2,
    })

    const refreshed = service.getState().calls.find((item) => item.id === call.id)
    expect(refreshed?.eventHistory.filter((event) => event.providerEventId === 'evt-stale-1')).toHaveLength(0)
    expect(refreshed?.state).toBe('ANSWERED')
  })

  it('recovers the provider circuit after the open-window expires', async () => {
    const service = new SmartDialerService()
    await service.resetSimulation()
    const campaignId = service.getState().campaign.id
    const provider = service.getState().providerHealth[0]
    provider.status = 'OPEN'
    provider.failureRate = 0.8
    provider.circuitOpenUntil = Date.now() - 1000

    const result = await service.requestDialing({
      campaignId,
      requestedCalls: 2,
      mode: 'PREDICTIVE',
    })

    expect(result.approvedCalls).toBeGreaterThan(0)
    expect(service.getState().providerHealth[0].status).toBe('CLOSED')
  })
})
