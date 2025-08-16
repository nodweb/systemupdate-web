import { useGetAnalyticsHealthQuery } from '../services/api'

export default function Analytics() {
  const { data, isLoading, isError } = useGetAnalyticsHealthQuery()
  return (
    <div>
      <h1>Analytics</h1>
      <div>
        <strong>Analytics Service Health:</strong>{' '}
        {isLoading ? 'Loading…' : isError ? 'Error' : data?.status ?? 'unknown'}
      </div>
    </div>
  )
}
