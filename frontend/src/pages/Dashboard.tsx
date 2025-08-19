import { useGetHealthQuery } from "../services/api";

export default function Dashboard() {
  const { data, isLoading, isError } = useGetHealthQuery();
  return (
    <div>
      <h1>Dashboard</h1>
      <div>
        <strong>Command Service Health:</strong>{" "}
        {isLoading ? "Loading…" : isError ? "Error" : data?.status ?? "unknown"}
      </div>
    </div>
  );
}
