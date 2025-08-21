import { createBrowserRouter } from "react-router-dom";
import App from "../components/App";
import Dashboard from "../pages/Dashboard";
import Devices from "../pages/Devices";
import DeviceDetailsPage from "../pages/devices/DeviceDetailsPage";
import UpdatesPage from "../pages/updates/UpdatesPage";
import DeploymentsPage from "../pages/deployments/DeploymentsPage";
import CommandsPage from "../pages/commands/CommandsPage";
import AnalyticsPage from "../pages/analytics/AnalyticsPage";

// Main application routes
export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // Dashboard
      { index: true, element: <Dashboard /> },

      // Devices
      { path: "devices", element: <Devices /> },
      {
        path: "devices/:id",
        element: <DeviceDetailsPage />,
        // Add any device-specific loaders or actions here if needed
      },

      // Updates
      { path: "updates", element: <UpdatesPage /> },

      // Deployments
      { path: "deployments", element: <DeploymentsPage /> },

      // Commands
      { path: "commands", element: <CommandsPage /> },

      // Analytics
      { path: "analytics", element: <AnalyticsPage /> },

      // TODO: Add 404 page
      // { path: "*", element: <NotFound /> },
    ],
  },
]);
