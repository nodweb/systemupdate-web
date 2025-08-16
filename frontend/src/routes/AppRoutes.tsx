import { createBrowserRouter } from 'react-router-dom'
import App from '../components/App'
import Dashboard from '../pages/Dashboard'
import Devices from '../pages/Devices'
import DeviceDetails from '../pages/DeviceDetails'
import Commands from '../pages/Commands'
import Analytics from '../pages/Analytics'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'devices', element: <Devices /> },
      { path: 'devices/:id', element: <DeviceDetails /> },
      { path: 'commands', element: <Commands /> },
      { path: 'analytics', element: <Analytics /> },
    ],
  },
])
