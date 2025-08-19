import { Outlet, Link } from "react-router-dom";

export default function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 16 }}>
      <nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Link to="/">Dashboard</Link>
        <Link to="/devices">Devices</Link>
        <Link to="/commands">Commands</Link>
        <Link to="/analytics">Analytics</Link>
      </nav>
      <Outlet />
    </div>
  );
}
