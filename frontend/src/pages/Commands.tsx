import { useGetHealthQuery, useGetIngestHealthQuery } from '../services/api'

export default function Commands() {
  const cmd = useGetHealthQuery()
  const ingest = useGetIngestHealthQuery()
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
    </div>
  )
}
