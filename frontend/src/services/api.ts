import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (build) => ({
    getHealth: build.query<{ status: string }, void>({
      query: () => ({ url: '/command/healthz' }),
    }),
    getIngestHealth: build.query<{ status: string }, void>({
      query: () => ({ url: '/ingest/healthz' }),
    }),
    getAnalyticsHealth: build.query<{ status: string }, void>({
      query: () => ({ url: '/analytics/healthz' }),
    }),
  }),
})

export const { useGetHealthQuery, useGetIngestHealthQuery, useGetAnalyticsHealthQuery } = api
