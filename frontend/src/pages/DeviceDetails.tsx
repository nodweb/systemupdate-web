import { useParams } from 'react-router-dom'

export default function DeviceDetails() {
  const { id } = useParams()
  return <h1>Device Details for {id}</h1>
}
