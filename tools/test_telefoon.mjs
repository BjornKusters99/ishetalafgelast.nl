import assert from "node:assert/strict";
import test from "node:test";
import { weeklyDates, isApp, origin } from "../js/native.js";

// beginscherm.js haalt de tekstballon uit eggs.js, en die kijkt bij het laden naar de pagina.
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {} });
globalThis.document ??= { getElementById: () => null, querySelector: () => null, addEventListener() {} };
globalThis.addEventListener ??= () => {};
const { installRoute } = await import("../js/beginscherm.js");

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const INSTA_IOS = IPHONE + " Instagram 300.0.0.0";
const ANDROID_WV = "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36";

test("install route per device", () => {
  assert.equal(installRoute({ ua: IPHONE }), "ios");
  assert.equal(installRoute({ ua: IPAD, touch: 5 }), "ios", "iPadOS says Macintosh but has touch");
  assert.equal(installRoute({ ua: IPAD, touch: 0 }), "desktop", "a real Mac");
  assert.equal(installRoute({ ua: INSTA_IOS }), "ios-inapp");
  assert.equal(installRoute({ ua: ANDROID }), "android");
  assert.equal(installRoute({ ua: ANDROID, prompt: true }), "prompt");
  assert.equal(installRoute({ ua: ANDROID_WV }), "android-inapp");
  assert.equal(installRoute({ ua: IPHONE, standalone: true }), "klaar", "already on the home screen");
});

test("weekly reminders: the evening before, at 19:00, skipping the summer break", () => {
  // Woensdag 18 november 2026, 12:00.
  const now = new Date(2026, 10, 18, 12);
  const sat = weeklyDates(6, now);
  assert.equal(sat.length, 6);
  assert.deepEqual(sat.slice(0, 2).map((d) => [d.getDate(), d.getDay(), d.getHours()]), [[20, 5, 19], [27, 5, 19]]);
  const sun = weeklyDates(0, now);
  assert.deepEqual([sun[0].getDate(), sun[0].getDay()], [21, 6]);
  // Vrijdag 19:30: deze week is al voorbij, dus volgende week.
  assert.equal(weeklyDates(6, new Date(2026, 10, 20, 19, 30))[0].getDate(), 27);
  // Eind mei: geen seintjes voor wedstrijden in juni en juli.
  const summer = weeklyDates(6, new Date(2026, 4, 25, 12), 3);
  assert.ok(summer.every((d) => { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getMonth(); return m !== 5 && m !== 6; }));
  assert.deepEqual([summer[1].getMonth(), summer[1].getDate()], [6, 31], "next one: Friday 31 July, for the first match in August");
});

test("outside the app, links keep the site origin and nothing is native", () => {
  assert.equal(isApp, false);
  assert.equal(origin, "https://www.ishetalafgelast.nl");
});
