import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import type { AddressInfo } from "net";
import { randomUUID } from "crypto";
import { sendSuccess } from "./api-response";

// Plain http.request (not fetch) so no implicit Cache-Control header is added,
// matching what the Flutter apps send.
function get(port: number, path: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; etag?: string; body: string }>((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, headers }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () =>
        resolve({ status: res.statusCode ?? 0, etag: res.headers.etag as string | undefined, body }),
      );
    });
    req.on("error", reject);
    req.end();
  });
}

describe("sendSuccess ETag (bandwidth saver)", () => {
  let server: http.Server;
  let port: number;
  let payload: unknown = { offers: [{ id: 1, sellingPrice: 5000 }] };

  beforeAll(async () => {
    const app = express();
    app.use((_req, res, next) => {
      res.locals.requestId = randomUUID(); // differs on every request
      next();
    });
    app.get("/x", (_req, res) => sendSuccess(res, { data: payload }));
    server = app.listen(0);
    await new Promise((r) => server.once("listening", r));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => server.close());

  it("returns the same ETag for the same data despite a new requestId", async () => {
    const a = await get(port, "/x");
    const b = await get(port, "/x");
    expect(a.status).toBe(200);
    expect(a.etag).toBeDefined();
    expect(a.etag).toBe(b.etag);
    expect(JSON.parse(a.body).requestId).not.toBe(JSON.parse(b.body).requestId);
  });

  it("answers 304 with an empty body when nothing changed", async () => {
    const first = await get(port, "/x");
    const second = await get(port, "/x", { "If-None-Match": first.etag! });
    expect(second.status).toBe(304);
    expect(second.body).toBe("");
  });

  it("returns 200 with new data after the data changes", async () => {
    const first = await get(port, "/x");
    payload = { offers: [{ id: 1, sellingPrice: 9900 }] };
    const second = await get(port, "/x", { "If-None-Match": first.etag! });
    expect(second.status).toBe(200);
    expect(JSON.parse(second.body).data.offers[0].sellingPrice).toBe(9900);
  });
});
