import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Mutex } from "async-mutex";
import { logout, refreshToken } from "../store/authSlice";
import type { AppState } from "../store";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Create a mutex to handle token refresh race conditions
const mutex = new Mutex();

// Base query with authorization and error handling
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as AppState).auth.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
  credentials: "include",
});

// Base query with retry and token refresh
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  // Wait for the mutex to be available
  await mutex.waitForUnlock();

  let result = await baseQuery(args, api, extraOptions);

  // If we get a 401, try to refresh the token
  if (result.error && result.error.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();

      try {
        // Try to refresh the token
        const refreshResult = await baseQuery(
          { url: "/auth/refresh-token", method: "POST" },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          // Store the new token
          api.dispatch(refreshToken(refreshResult.data));
          // Retry the original request with the new token
          result = await baseQuery(args, api, extraOptions);
        } else {
          // Refresh failed, log out the user
          api.dispatch(logout());
          // Optionally redirect to login
          window.location.href = "/login";
        }
      } finally {
        release();
      }
    } else {
      // Wait for the mutex before retrying
      await mutex.waitForUnlock();
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

// Create the API with the base query with retry logic
const staggeredBaseQuery = retry(baseQueryWithReauth, {
  maxRetries: 3,
  // Only retry on 5xx server errors
  retryIf: (error) => error.status >= 500 && error.status < 600,
});

export const api = createApi({
  reducerPath: "api",
  baseQuery: staggeredBaseQuery,
  tagTypes: ["Auth", "Devices", "Updates", "Deployments", "Users", "Roles", "AuditLogs"],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<
      { accessToken: string; refreshToken: string },
      { username: string; password: string }
    >({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),

    // Device endpoints
    getDevices: builder.query<PaginatedResponse<Device>, QueryOptions>({
      query: (params) => ({
        url: "/devices",
        params: buildQueryParams(params),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Devices" as const, id })),
              { type: "Devices", id: "LIST" },
            ]
          : [{ type: "Devices", id: "LIST" }],
    }),

    getDevice: builder.query<Device, string>({
      query: (id) => `/devices/${id}`,
      providesTags: (result, error, id) => [{ type: "Devices", id }],
    }),

    // Update endpoints
    getUpdates: builder.query<PaginatedResponse<UpdatePackage>, QueryOptions>({
      query: (params) => ({
        url: "/updates",
        params: buildQueryParams(params),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Updates" as const, id })),
              { type: "Updates", id: "LIST" },
            ]
          : [{ type: "Updates", id: "LIST" }],
    }),

    // Deployment endpoints
    createDeployment: builder.mutation<Deployment, Partial<Deployment>>({
      query: (body) => ({
        url: "/deployments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Deployments"],
    }),

    // Health checks
    getHealth: builder.query<{ status: string }, void>({
      query: () => "/healthz",
    }),

    // ... other existing endpoints ...
    getIngestHealth: builder.query<{ status: string }, void>({
      query: () => "/ingest/healthz",
    }),

    getAnalyticsHealth: builder.query<{ status: string }, void>({
      query: () => "/analytics/healthz",
    }),

    getCommands: builder.query<Command[], void>({
      query: () => "/command/commands",
      providesTags: ["Command"],
    }),

    createCommand: builder.mutation<Command, { device_id: string; name: string; payload?: object }>(
      {
        query: (body) => ({
          url: "/command/commands",
          method: "POST",
          body,
        }),
        invalidatesTags: ["Command"],
      }
    ),
  }),
});

// Helper function to build query parameters from QueryOptions
function buildQueryParams(options: QueryOptions = {}) {
  const params: Record<string, string> = {};

  if (options.page) params.page = options.page.toString();
  if (options.pageSize) params.pageSize = options.pageSize.toString();
  if (options.search) params.search = options.search;

  // Handle sorting
  if (options.sort?.length) {
    params.sort = options.sort
      .map((s) => `${s.direction === "desc" ? "-" : ""}${s.field}`)
      .join(",");
  }

  // Handle filtering
  if (options.filter?.length) {
    options.filter.forEach((filter, index) => {
      params[`filter[${index}][field]`] = filter.field;
      params[`filter[${index}][operator]`] = filter.operator;
      params[`filter[${index}][value]`] = Array.isArray(filter.value)
        ? filter.value.join(",")
        : String(filter.value);
    });
  }

  return params;
}

// Export hooks for usage in components
export const {
  // Auth
  useLoginMutation,
  useLogoutMutation,

  // Devices
  useGetDevicesQuery,
  useGetDeviceQuery,

  // Updates
  useGetUpdatesQuery,

  // Deployments
  useCreateDeploymentMutation,

  // Health
  useGetHealthQuery,
  useGetIngestHealthQuery,
  useGetAnalyticsHealthQuery,

  // Commands
  useGetCommandsQuery,
  useCreateCommandMutation,
} = api;

// Export types for use in other files
export type { Device, UpdatePackage, Deployment, Command, QueryOptions };
