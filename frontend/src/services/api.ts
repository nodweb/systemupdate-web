import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  endpoints: (build: any) => ({
    getHealth: build.query<{ status: string }, void>({
      query: () => ({ url: "/command/healthz" }),
    }),
    getIngestHealth: build.query<{ status: string }, void>({
      query: () => ({ url: "/ingest/healthz" }),
    }),
    getAnalyticsHealth: build.query<{ status: string }, void>({
      query: () => ({ url: "/analytics/healthz" }),
    }),
    getExampleCommands: build.query<
      { items: Array<{ id: string; device_id: string; name: string; created_at: string }> },
      void
    >({
      query: () => ({ url: "/command/example/commands" }),
    }),
    getCommands: build.query<
      Array<{ id: string; device_id: string; name: string; created_at: string; status: string }>,
      void
    >({
      query: () => ({ url: "/command/commands" }),
    }),
    createCommand: build.mutation<
      { id: string; device_id: string; name: string; created_at: string; status: string },
      { device_id: string; name: string; payload?: Record<string, unknown> }
    >({
      query: (body: { device_id: string; name: string; payload?: Record<string, unknown> }) => ({
        url: "/command/commands",
        method: "POST",
        body,
      }),
    }),
    postIngest: build.mutation<
      { accepted: boolean; kafka_sent: boolean },
      { device_id: string; kind: string; data: Record<string, unknown> }
    >({
      query: (body: { device_id: string; kind: string; data: Record<string, unknown> }) => ({
        url: "/ingest/ingest",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetHealthQuery,
  useGetIngestHealthQuery,
  useGetAnalyticsHealthQuery,
  useGetExampleCommandsQuery,
  useGetCommandsQuery,
  useCreateCommandMutation,
  usePostIngestMutation,
} = api;
