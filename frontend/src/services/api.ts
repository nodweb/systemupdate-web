import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (build: any) => ({
    getHealth: build.query<{ status: string }, void>({
      query: () => ({ url: '/command/healthz' }),
    }),
    getIngestHealth: build.query<{ status: string }, void>({
      query: () => ({ url: '/ingest/healthz' }),
    }),
    getAnalyticsHealth: build.query<{ status: string }, void>({
      query: () => ({ url: '/analytics/healthz' }),
    }),
    getExampleCommands: build.query<{ items: Array<{ id: string; device_id: string; name: string; created_at: string }> }, void>({
      query: () => ({ url: '/command/example/commands' }),
    }),
  }),
})

export const { useGetHealthQuery, useGetIngestHealthQuery, useGetAnalyticsHealthQuery, useGetExampleCommandsQuery } = api
