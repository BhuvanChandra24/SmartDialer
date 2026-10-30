import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownUp,
  Bell,
  BriefcaseBusiness,
  Gauge,
  MonitorCog,
  Phone,
  Shield,
  Siren,
  Users,
  Waves,
} from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const navItems = [
  { key: 'overview', label: 'Overview', icon: Gauge },
  { key: 'operations', label: 'Live Operations', icon: Activity },
  { key: 'campaigns', label: 'Campaigns', icon: BriefcaseBusiness },
  { key: 'agents', label: 'Agents', icon: Users },
  { key: 'calls', label: 'Call Records', icon: Phone },
  { key: 'pacing', label: 'Predictive Pacing', icon: Waves },
  { key: 'safety', label: 'Safety Controller', icon: Shield },
  { key: 'provider', label: 'Provider Health', icon: Siren },
  { key: 'simulation', label: 'Simulation Lab', icon: MonitorCog },
  { key: 'diagnostics', label: 'Tests & Diagnostics', icon: Bell },
]

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

function formatCallState(state: string) {
  return state.replace(/_/g, ' ')
}

function getStatusTone(value: string) {
  const map: Record<string, string> = {
    AVAILABLE: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    RESERVED: 'bg-amber-100 text-amber-700 border border-amber-200',
    CONNECTED: 'bg-sky-100 text-sky-700 border border-sky-200',
    OFFLINE: 'bg-slate-200 text-slate-700 border border-slate-200',
    ACTIVE: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    PAUSED: 'bg-amber-100 text-amber-700 border border-amber-200',
    STOPPED: 'bg-slate-200 text-slate-700 border border-slate-200',
    OPEN: 'bg-red-100 text-red-700 border border-red-200',
    CLOSED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    HALF_OPEN: 'bg-sky-100 text-sky-700 border border-sky-200',
    APPROVE: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    REDUCE: 'bg-amber-100 text-amber-700 border border-amber-200',
    REJECT: 'bg-red-100 text-red-700 border border-red-200',
    FALLBACK_PROGRESSIVE: 'bg-sky-100 text-sky-700 border border-sky-200',
  }

  return map[value] ?? 'bg-slate-100 text-slate-700 border border-slate-200'
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{helper}</div>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any | null>(null)
  const [operations, setOperations] = useState<any | null>(null)
  const [safety, setSafety] = useState<any[]>([])
  const [pacing, setPacing] = useState<any | null>(null)
  const [providerHealth, setProviderHealth] = useState<any[]>([])
  const [diagnostics, setDiagnostics] = useState<any | null>(null)
  const [simulationForm, setSimulationForm] = useState({
    providerId: 'Provider A',
    numberOfAgents: 12,
    numberOfBorrowers: 60,
    initialAvailableAgents: 8,
    expectedAnswerRate: 0.5,
    averageTalkDuration: 90,
    setupLatencyMs: 550,
    providerFailureRate: 0.12,
    duplicateEventProbability: 0.05,
    outOfOrderEventProbability: 0.04,
    simulationDurationSeconds: 180,
    mode: 'PREDICTIVE',
  })

  const refresh = async () => {
    setLoading(true)
    try {
      const [overviewData, opsData, safetyData, pacingData, providerData, diagnosticsData] = await Promise.all([
        apiFetch('/api/overview'),
        apiFetch('/api/operations'),
        apiFetch('/api/safety-decisions'),
        apiFetch('/api/pacing'),
        apiFetch('/api/provider-health'),
        apiFetch('/api/diagnostics'),
      ])

      setOverview(overviewData)
      setOperations(opsData)
      setSafety(safetyData)
      setPacing(pacingData)
      setProviderHealth(providerData)
      setDiagnostics(diagnosticsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const metricCards = useMemo(() => {
    if (!overview) {
      return []
    }

    return [
      { label: 'Available agents', value: String(overview.summary.availableAgents), helper: 'Idle and callable' },
      { label: 'Reserved agents', value: String(overview.summary.reservedAgents), helper: 'Allocated but not yet connected' },
      { label: 'Connected agents', value: String(overview.summary.connectedAgents), helper: 'Currently on active conversations' },
      { label: 'Active calls', value: String(overview.summary.activeCalls), helper: 'In-flight calls' },
      { label: 'Calls initiated', value: String(overview.summary.callsInitiated), helper: 'All created calls' },
      { label: 'Calls connected', value: String(overview.summary.callsConnected), helper: 'Successfully connected calls' },
      { label: 'Failed calls', value: String(overview.summary.failedCalls), helper: 'Failures tracked within state' },
      { label: 'Utilization', value: `${overview.summary.utilization}%`, helper: 'Reserved + connected / total agents' },
    ]
  }, [overview])

  const renderOverview = () => {
    if (!overview) {
      return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">No simulation data yet. Start the campaign or run a simulation to populate the backend state.</div>
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <MetricCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Calls over time</h3>
                <p className="text-xs text-slate-500">Operational trend from backend metrics</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview.callsOverTime}>
                  <defs>
                    <linearGradient id="callsGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="calls" stroke="#0f172a" fill="url(#callsGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Agent state distribution</h3>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.agentStates}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Recent operational events</h3>
            <div className="mt-4 space-y-3">
              {overview.recentEvents.map((event: any) => (
                <div key={event.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{event.type}</div>
                    <div className="text-xs text-slate-500">{event.message}</div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Recent safety decisions</h3>
            <div className="mt-4 space-y-3">
              {overview.recentSafety.map((decision: any) => (
                <div key={decision.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${getStatusTone(decision.decisionType)}`}>
                      {decision.decisionType}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-slate-400">{new Date(decision.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">{decision.reason}</div>
                  <div className="mt-2 text-[11px] text-slate-500">Requested {decision.requestedCalls} — approved {decision.approvedCalls}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderOperations = () => {
    if (!operations) {
      return null
    }

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Campaign controls</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{operations.campaign.name}</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => apiFetch('/api/campaign/start', { method: 'POST' }).then(refresh)} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">Start</button>
              <button onClick={() => apiFetch('/api/campaign/pause', { method: 'POST' }).then(refresh)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Pause</button>
              <button onClick={() => apiFetch('/api/campaign/resume', { method: 'POST' }).then(refresh)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Resume</button>
              <button onClick={() => apiFetch('/api/campaign/stop', { method: 'POST' }).then(refresh)} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Stop</button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => apiFetch('/api/campaign/mode', { method: 'POST', body: JSON.stringify({ mode: 'PROGRESSIVE' }) }).then(refresh)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Progressive</button>
            <button onClick={() => apiFetch('/api/campaign/mode', { method: 'POST', body: JSON.stringify({ mode: 'PREDICTIVE' }) }).then(refresh)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Predictive</button>
            <button onClick={() => apiFetch('/api/dialing/request', { method: 'POST', body: JSON.stringify({ requestedCalls: 3, mode: operations.campaign.mode }) }).then(refresh)} className="rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white">Initiate test batch</button>
            <button onClick={() => refresh()} className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">Refresh</button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Call queue</h3>
            <div className="mt-4 space-y-3">
              {operations.calls.length === 0 ? <div className="text-sm text-slate-500">No calls in queue.</div> : operations.calls.map((call: any) => (
                <div key={call.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{call.id}</span>
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${getStatusTone(call.state)}`}>{formatCallState(call.state)}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Borrower {call.borrowerId} · Agent {call.agentId ?? 'unassigned'}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Agent availability</h3>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Agent</th>
                    <th className="px-3 py-2">State</th>
                    <th className="px-3 py-2">Campaign</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.agents.map((agent: any) => (
                    <tr key={agent.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-medium text-slate-700">{agent.name}</td>
                      <td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${getStatusTone(agent.state)}`}>{agent.state}</span></td>
                      <td className="px-3 py-2 text-slate-500">{agent.campaignId ?? 'none'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPacing = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Predictive pacing recommendation</h3>
        {pacing ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Recommended calls" value={String(pacing.recommendedCalls)} helper="Additional calls allowed" />
            <MetricCard label="Answer probability" value={`${(pacing.answerProbability * 100).toFixed(0)}%`} helper="Rule-based estimate" />
            <MetricCard label="Current capacity" value={String(pacing.currentAgentCapacity)} helper="Available + reserved" />
            <MetricCard label="Provider health" value={pacing.providerHealth} helper="Safety controller basis" />
          </div>
        ) : <div className="mt-4 text-sm text-slate-500">No pacing recommendation available.</div>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Pacing rationale</h3>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {pacing?.reasons?.map((reason: string) => (
            <li key={reason} className="flex gap-2"><ArrowDownUp className="mt-0.5 h-4 w-4 text-slate-400" />{reason}</li>
          )) ?? <li className="text-slate-500">No reasons available.</li>}
        </ul>
      </div>
    </div>
  )

  const renderSafety = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Safety controller decisions</h3>
        <div className="mt-4 space-y-3">
          {safety.length === 0 ? <div className="text-sm text-slate-500">No safety decisions recorded yet.</div> : safety.map((decision: any) => (
            <div key={decision.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${getStatusTone(decision.decisionType)}`}>{decision.decisionType}</span>
                <span className="text-[10px] uppercase tracking-[0.1em] text-slate-400">{new Date(decision.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="mt-2 text-sm text-slate-700">{decision.reason}</div>
              <div className="mt-2 text-xs text-slate-500">Requested {decision.requestedCalls} · approved {decision.approvedCalls} · rejected {decision.rejectedCalls}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderProvider = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {providerHealth.map((provider: any) => (
          <div key={provider.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800">{provider.name}</div>
                <div className="text-xs text-slate-500">Latency {provider.latencyMs}ms</div>
              </div>
              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${getStatusTone(provider.status)}`}>{provider.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>Failure rate: {(provider.failureRate * 100).toFixed(0)}%</div>
              <div>Timeouts: {provider.timeouts}</div>
              <div>Duplicate: {provider.duplicateEvents}</div>
              <div>Out-of-order: {provider.outOfOrderEvents}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSimulation = () => (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Simulation controls</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {Object.entries(simulationForm).map(([key, value]) => (
              <label key={key} className="space-y-1 text-sm text-slate-600">
                <span className="block capitalize text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</span>
                <input
                  value={value}
                  onChange={(event) => setSimulationForm((current) => ({ ...current, [key]: key === 'providerId' ? event.target.value : Number(event.target.value) }))}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => apiFetch('/api/simulation/run', { method: 'POST', body: JSON.stringify(simulationForm) }).then(() => refresh())} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">Run simulation</button>
            <button onClick={() => apiFetch('/api/simulation/reset', { method: 'POST' }).then(() => refresh())} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Reset</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Scenario summary</h3>
          {overview ? (
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>Calls initiated: {overview.summary.callsInitiated}</div>
              <div>Calls connected: {overview.summary.callsConnected}</div>
              <div>Failed calls: {overview.summary.failedCalls}</div>
              <div>Utilization: {overview.summary.utilization}%</div>
              <div>Safety controller decisions: {overview.summary.safetyControllerRejections}</div>
            </div>
          ) : <div className="mt-4 text-sm text-slate-500">No simulation summary available.</div>}
        </div>
      </div>
    </div>
  )

  const renderDiagnostics = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Test and diagnostics</h3>
        {diagnostics ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Calls tracked" value={String(diagnostics.summary.calls)} helper="Stateful call records" />
              <MetricCard label="Agents" value={String(diagnostics.summary.agents)} helper="Current agent inventory" />
              <MetricCard label="Safety decisions" value={String(diagnostics.summary.safetyDecisions)} helper="Controller decisions recorded" />
            </div>
            <div className="space-y-2">
              {diagnostics.tests.map((test: any) => (
                <div key={test.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <div>
                    <div className="font-medium text-slate-800">{test.name}</div>
                    <div className="text-xs text-slate-500">{test.message}</div>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${getStatusTone(test.status === 'passed' ? 'APPROVE' : 'REJECT')}`}>{test.status}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <div className="mt-4 text-sm text-slate-500">No diagnostics available.</div>}
      </div>
    </div>
  )

  const renderPage = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'operations':
        return renderOperations()
      case 'campaigns':
        return renderOperations()
      case 'agents':
        return renderOperations()
      case 'calls':
        return renderOperations()
      case 'pacing':
        return renderPacing()
      case 'safety':
        return renderSafety()
      case 'provider':
        return renderProvider()
      case 'simulation':
        return renderSimulation()
      case 'diagnostics':
        return renderDiagnostics()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-200 bg-slate-950 text-slate-100">
          <div className="border-b border-slate-800 p-5">
            <div className="text-lg font-semibold tracking-tight">CredResolve</div>
            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">SmartDialer</div>
          </div>

          <nav className="space-y-1 p-3">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${activeTab === key ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Operating mode</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{operations?.campaign.mode ?? 'PROGRESSIVE'}</div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Provider health stable
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
                  API connected
                </div>
                <div className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  LOCAL SIMULATION
                </div>
              </div>
            </div>
          </header>

          <main className="p-6">
            {loading ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">Loading backend state…</div> : renderPage()}
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
