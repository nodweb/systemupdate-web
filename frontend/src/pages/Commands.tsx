import { useGetHealthQuery, useGetIngestHealthQuery, useGetExampleCommandsQuery } from '../services/api'

export default function Commands() {
  const cmd = useGetHealthQuery()
  const ingest = useGetIngestHealthQuery()
  const example = useGetExampleCommandsQuery()
  return (
    <div>
      <h1>Commands</h1>
      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          <strong>Command Service:</strong>{' '}
          {cmd.isLoading ? 'Loading…' : cmd.isError ? 'Error' : cmd.data?.status ?? 'unknown'}
        </div>
        <div>
          <strong>Ingest Service:</strong>{' '}
          {ingest.isLoading ? 'Loading…' : ingest.isError ? 'Error' : ingest.data?.status ?? 'unknown'}
        </div>
      </div>
      <hr />
      <h2>Example Commands</h2>
      {example.isLoading && <div>Loading…</div>}
      {example.isError && <div>Error loading commands</div>}
      {example.data && (
        <ul>
          {example.data.items.map((it: { id: string; device_id: string; name: string; created_at: string }) => (
            <li key={it.id}>
              <code>{it.id}</code> — {it.name} for <code>{it.device_id}</code> at {it.created_at}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
