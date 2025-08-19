import { test, expect, request } from '@playwright/test';

// This spec validates deny behavior when OPA is enabled and policy denies commands:ack.
// It is skipped by default unless OPA_E2E=1, because it requires:
// - docker compose --profile policy up -d opa
// - services started with AUTHZ_REQUIRED=1 and OPA_REQUIRED=1
// - OPA_URL set to http://localhost:8181/v1/data/systemupdate/allow

const enabled = process.env.OPA_E2E === '1';
const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:8000';

test.describe('OPA deny flow (conditional)', () => {
  test.skip(!enabled, 'OPA deny test disabled; set OPA_E2E=1 to enable');

  test('ack should be denied (403) when policy denies commands:ack', async ({}) => {
    const ctx = await request.newContext({ baseURL: GATEWAY, timeout: 10_000 });

    // Create a command first (allowed by policy)
    const createRes = await ctx.post('/commands', {
      data: { device_id: `e2e-dev-${Date.now()}`, name: 'reboot', payload: {} },
      headers: { 'content-type': 'application/json' },
    });
    expect(createRes.status(), await createRes.text()).toBe(201);
    const created = await createRes.json();

    // Attempt to ACK (policy denies commands:ack)
    const ackRes = await ctx.patch(`/commands/${created.id}/ack`);
    expect(ackRes.status(), await ackRes.text()).toBe(403);

    await ctx.dispose();
  });
});
