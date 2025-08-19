import {
  useGetHealthQuery,
  useGetIngestHealthQuery,
  useGetCommandsQuery,
  useCreateCommandMutation,
} from "../services/api";
import { useState } from "react";

export default function Commands() {
  const cmd = useGetHealthQuery();
  const ingest = useGetIngestHealthQuery();
  const commands = useGetCommandsQuery();
  const [createCommand, createState] = useCreateCommandMutation();
  const [deviceId, setDeviceId] = useState("device-123");
  const [name, setName] = useState("reboot");
  const [payload, setPayload] = useState('{"reason":"maintenance"}');

  return (
    <div>
      <h1>Commands</h1>
      <div style={{ display: "grid", gap: 8 }}>
        <div>
          <strong>Command Service:</strong>{" "}
          {cmd.isLoading ? "Loading…" : cmd.isError ? "Error" : cmd.data?.status ?? "unknown"}
        </div>
        <div>
          <strong>Ingest Service:</strong>{" "}
          {ingest.isLoading
            ? "Loading…"
            : ingest.isError
              ? "Error"
              : ingest.data?.status ?? "unknown"}
        </div>
      </div>
      <hr />
      <h2>Create Command</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          let parsed: Record<string, unknown> | undefined;
          try {
            parsed = payload ? JSON.parse(payload) : undefined;
          } catch (err) {
            alert("Payload must be valid JSON");
            return;
          }
          await createCommand({ device_id: deviceId, name, payload: parsed });
          commands.refetch();
        }}
        style={{ display: "grid", gap: 8, maxWidth: 480 }}
      >
        <label>
          <div>Device ID</div>
          <input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} />
        </label>
        <label>
          <div>Name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <div>Payload (JSON)</div>
          <textarea rows={4} value={payload} onChange={(e) => setPayload(e.target.value)} />
        </label>
        <button type="submit" disabled={createState.isLoading}>
          {createState.isLoading ? "Creating…" : "Create Command"}
        </button>
        {createState.isError && <div style={{ color: "crimson" }}>Error creating command</div>}
        {createState.isSuccess && <div style={{ color: "green" }}>Created!</div>}
      </form>
      <hr />
      <h2>Commands</h2>
      {commands.isLoading && <div>Loading…</div>}
      {commands.isError && <div>Error loading commands</div>}
      {commands.data && (
        <ul>
          {commands.data.map(
            (it: {
              id: string;
              device_id: string;
              name: string;
              created_at: string;
              status: string;
            }) => (
              <li key={it.id}>
                <code>{it.id}</code> — {it.name} • device <code>{it.device_id}</code> • {it.status}{" "}
                • {new Date(it.created_at).toLocaleString()}
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
