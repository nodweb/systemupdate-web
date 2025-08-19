import { test, expect, request } from '@playwright/test';

// This test exercises the gateway → command-service happy path
// Requires docker compose stack with gateway (port 8000) and command-service up.
// Security toggles are off by default, so no bearer token is required in dev.

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8000';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

test.describe('Gateway happy path: create command → verify → ack → verify', () => {
  test('create, read, ack, read', async ({}, testInfo) => {
    const ctx = await request.newContext({ baseURL: GATEWAY, timeout: 10_000 });

    // 1) Create command
    const createBody = {
      device_id: `e2e-dev-${Date.now()}`,
      name: 'reboot',
      payload: { reason: 'e2e-smoke' },
    };

    const createRes = await ctx.post('/commands', {
      data: createBody,
      headers: {
        'content-type': 'application/json',
        // If AUTH_REQUIRED is enabled in the future, inject a bearer token here
      },
    });
    expect(createRes.status(), await createRes.text()).toBe(201);
    const created = await createRes.json();
    expect(created).toHaveProperty('id');
    expect(created.device_id).toBe(createBody.device_id);

    const commandId = created.id as string;

    // Small wait to allow background publisher to potentially update status to 'sent'
    await sleep(250);

    // 2) Read command by id
    const readRes1 = await ctx.get(`/commands/${commandId}`);
    expect(readRes1.ok(), await readRes1.text()).toBeTruthy();
    const cmd1 = await readRes1.json();
    expect(cmd1.id).toBe(commandId);
    expect(['queued', 'sent', 'acked']).toContain(cmd1.status);

    // 3) Ack command
    const ackRes = await ctx.patch(`/commands/${commandId}/ack`);
    expect([200, 204]).toContain(ackRes.status());

    // 4) Read command again and expect acked
    const readRes2 = await ctx.get(`/commands/${commandId}`);
    expect(readRes2.ok(), await readRes2.text()).toBeTruthy();
    const cmd2 = await readRes2.json();
    expect(cmd2.id).toBe(commandId);
    expect(cmd2.status).toBe('acked');

    await ctx.dispose();
  });
});
