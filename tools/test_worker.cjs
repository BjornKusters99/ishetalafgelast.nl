// Controleer een echte bestaande workerinstallatie, niet alleen een mock.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const root = path.resolve("_site");
  let upgraded = false;
  let unavailable = false;
  const legacy = `
    self.addEventListener("install", e => e.waitUntil((async () => {
      const cache = await caches.open("v5-2");
      await cache.put("/styles.css", new Response("legacy cached CSS"));
      await cache.put("/HANDOVER.md", new Response("legacy private document"));
      await self.skipWaiting();
    })()));
    self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
    self.addEventListener("fetch", e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
  `;
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    // Het testharnas mag same-origin fetch gebruiken; de echte CSP niet.
    if (pathname === "/worker-test.html") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<!doctype html><p>Worker test</p>");
      return;
    }
    if (pathname === "/sw.js" && !upgraded) {
      res.writeHead(200, { "Content-Type": "application/javascript", "Cache-Control": "no-store" });
      res.end(legacy);
      return;
    }
    if (pathname === "/" && unavailable) {
      res.writeHead(503, { "Content-Type": "text/html" });
      res.end("unavailable");
      return;
    }
    const target = path.resolve(root, "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname));
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(404); res.end(); return;
    }
    try {
      const content = await fs.readFile(target);
      const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2", ".webp": "image/webp", ".png": "image/png" };
      res.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(content);
    } catch (err) {
      if (err.code !== "ENOENT") console.error(err);
      res.writeHead(404); res.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin + "/worker-test.html");
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    assert.equal(await page.evaluate(() => fetch("/HANDOVER.md").then((r) => r.text())), "legacy private document");
    upgraded = true;
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const changed = new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
      await registration.update();
      await changed;
      if (registration.active.state !== "activated") {
        await new Promise((resolve) => registration.active.addEventListener("statechange", function activated() {
          if (this.state === "activated") resolve();
        }));
      }
    });
    assert.equal(await page.evaluate(() => caches.has("v5-2")), false);
    assert.equal(await page.evaluate(() => fetch("/HANDOVER.md").then((r) => r.status)), 404);
    assert.notEqual(await page.evaluate(() => fetch("/styles.css").then((r) => r.text())), "legacy cached CSS");
    await page.goto(origin);
    const before = await page.evaluate(async () => {
      const key = (await caches.keys()).find((name) => name.startsWith("ishetalafgelast-"));
      const cache = await caches.open(key);
      return (await cache.match("/")).text();
    });
    unavailable = true;
    const response = await page.goto(origin);
    assert.equal(response.status(), 503);
    assert.equal(await page.evaluate(async () => {
      const key = (await caches.keys()).find((name) => name.startsWith("ishetalafgelast-"));
      return (await (await caches.open(key)).match("/")).text();
    }), before);
    await context.setOffline(true);
    await page.goto(origin);
    assert.equal(await page.isVisible("#form"), true);
    console.log("PASS worker: legacy caches removed, excluded document 404, 503 not cached, offline homepage retained");
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((err) => { console.error(err); process.exitCode = 1; });
