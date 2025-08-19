import { test, expect } from '@playwright/test';

test.describe('Gateway smoke', () => {
  test('devices health via gateway', async ({ request }) => {
    const res = await request.get('/devices/healthz');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('commands health via gateway', async ({ request }) => {
    const res = await request.get('/commands/healthz');
    expect(res.status()).toBe(200);
  });

  test('analytics health via gateway', async ({ request }) => {
    const res = await request.get('/analytics/healthz');
    expect([200, 404]).toContain(res.status());
    // Some services may not expose /healthz; tolerate 404 until implemented
  });

  test('notification health via gateway', async ({ request }) => {
    const res = await request.get('/notify/healthz');
    expect([200, 404]).toContain(res.status());
  });

  test('ingest minimal POST via gateway', async ({ request }) => {
    const res = await request.post('/ingest', {
      data: { device_id: 'd1', kind: 'temp', data: { c: 21.5 } },
      headers: { 'content-type': 'application/json' },
    });
    expect([200, 401, 403]).toContain(res.status());
    // If auth disabled, expect success shape
    if (res.status() === 200) {
      const json = await res.json();
      expect(json.accepted).toBeTruthy();
    }
  });
});
