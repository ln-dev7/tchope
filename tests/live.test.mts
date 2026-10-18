import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LiveSession,
  SpeechTranscript,
  clampStep,
  stepCommand,
} from "../lib/live/session.ts";
import { RequestScope } from "../lib/live/request-scope.ts";
import {
  createLiveQuota,
  LIVE_QUOTA_KEY,
  weekWindow,
} from "../lib/live/quota.ts";

const deferred = () => {
  let resolve!: (s: string) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<string>((r, j) => {
    resolve = r;
    reject = j;
  });
  return { promise, resolve, reject };
};
const setup = (ask: any = async () => "Réponse") => {
  const spoken: string[] = [],
    calls: any[] = [];
  const session = new LiveSession({
    steps: ["Laver.", "Cuire.", "Servir."],
    initialStep: -1,
    ask: (...args) => {
      calls.push(args);
      return ask(...args);
    },
    speak: async (text) => {
      spoken.push(text);
    },
    change: () => {},
    errorText: () => "Erreur visible",
  });
  return { session, spoken, calls };
};
test("speech transcript: interim, final after release, segments and cumulative results", () => {
  const b = new SpeechTranscript();
  b.result("Comment", false);
  b.result("Comment cuire", false);
  b.result("Comment cuire le ndolé", true);
  assert.equal(b.value(), "Comment cuire le ndolé");
  b.result("sans brûler", false);
  assert.equal(b.value(), "Comment cuire le ndolé sans brûler");
  b.result("Comment cuire le ndolé sans brûler", true);
  assert.equal(b.value(), "Comment cuire le ndolé sans brûler");
  b.reset();
  assert.equal(b.value(), "");
});
test("step bounds, exact FR/EN commands and negations", () => {
  assert.equal(clampStep(NaN, 3), 0);
  assert.equal(clampStep(-2, 3), 0);
  assert.equal(clampStep(99, 3), 2);
  assert.equal(stepCommand("Étape suivante !", 0, 3), 1);
  assert.equal(stepCommand("next step please", 2, 3), 2);
  assert.equal(stepCommand("Ne passe pas à l’étape suivante", 0, 3), null);
  assert.equal(stepCommand("Il faut encore du sel ?", 0, 3), null);
});
test("local step navigation never calls the paid AI", async () => {
  const { session, spoken, calls } = setup();
  await session.submit("next step");
  assert.equal(session.snapshot.step, 1);
  assert.deepEqual(spoken, ["Cuire."]);
  assert.equal(calls.length, 0);
  assert.equal(session.snapshot.subtitle, "Cuire.");
  assert.equal(session.snapshot.state, "idle");
});
test("double submit uses one request; late result after closing never speaks or changes history", async () => {
  const pending = deferred(),
    { session, calls, spoken } = setup(() => pending.promise);
  const first = session.submit("Question");
  assert.equal(await session.submit("Double"), false);
  assert.equal(calls.length, 1);
  session.cancel();
  pending.resolve("Late");
  assert.equal(await first, false);
  assert.equal(spoken.length, 0);
  assert.equal(session.history.length, 0);
  assert.equal(session.snapshot.state, "idle");
});
test("old failure cannot overwrite a newer successful turn", async () => {
  const first = deferred();
  let n = 0;
  const { session } = setup(() =>
    ++n === 1 ? first.promise : Promise.resolve("Nouvelle réponse"),
  );
  const old = session.submit("old");
  session.cancel();
  await session.submit("new");
  first.reject(new Error("old error"));
  await old;
  assert.equal(session.snapshot.subtitle, "Nouvelle réponse");
  assert.equal(session.snapshot.error, false);
});
test("AI failure stays visible, does not poison history and allows retry", async () => {
  let fail = true;
  const { session } = setup(async () => {
    if (fail) throw new Error("network");
    return "OK";
  });
  await session.submit("question");
  assert.equal(session.snapshot.state, "idle");
  assert.equal(session.snapshot.error, true);
  assert.equal(session.history.length, 0);
  fail = false;
  await session.submit("retry");
  assert.equal(session.snapshot.subtitle, "OK");
  assert.equal(session.history.length, 2);
});
test("consecutive photos keep only current image and bounded text context", async () => {
  const { session, calls } = setup();
  for (let i = 0; i < 8; i++)
    await session.submit(`photo ${i}`, {
      data: `private-${i}`,
      media_type: "image/jpeg",
    });
  for (const [messages] of calls) {
    assert.ok(messages.length <= 7);
    assert.equal(JSON.stringify(messages).match(/private-/g)?.length, 1);
  }
  assert.ok(!JSON.stringify(session.history).includes("private-"));
});
test("chat cancel / new chat invalidates old work, prevents double send and leaves new request intact", () => {
  const scope = new RequestScope();
  const first = scope.begin()!;
  assert.equal(scope.begin(), null);
  scope.cancel();
  const second = scope.begin()!;
  assert.equal(first.signal.aborted, true);
  assert.equal(first.current(), false);
  first.finish();
  assert.equal(second.current(), true);
  second.finish();
  assert.ok(scope.begin());
});
const memory = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      data.set(k, v);
    },
  };
};
const NOW = Date.parse("2026-10-18T23:59:00Z");
test("week resets Monday UTC including year boundary", () => {
  assert.deepEqual(weekWindow(NOW), {
    week: "2026-10-12",
    reset: "2026-10-19T00:00:00.000Z",
  });
  assert.equal(
    weekWindow(Date.parse("2027-01-01T00:00:00Z")).week,
    "2026-12-28",
  );
});
test("local 100 responses limit persists across app restarts and resets next week", async () => {
  const storage = memory();
  let now = NOW;
  const quota = createLiveQuota(storage, () => now);
  for (let i = 0; i < 100; i++) {
    const r = await quota.reserve(false);
    await r.finish(false);
  }
  await assert.rejects(quota.reserve(false), /weekly-limit/);
  assert.equal(
    (await createLiveQuota(storage, () => now).getUsage()).remaining,
    0,
  );
  now += 120_000;
  assert.equal((await quota.getUsage()).remaining, 100);
});
test("20 photos are included in 100, photo cap still permits audio", async () => {
  const q = createLiveQuota(memory(), () => NOW);
  for (let i = 0; i < 20; i++) {
    const r = await q.reserve(true);
    await r.finish(false);
  }
  await assert.rejects(q.reserve(true), /weekly-photo-limit/);
  const r = await q.reserve(false);
  await r.finish(false);
  assert.equal((await q.getUsage()).remaining, 79);
  assert.equal((await q.getUsage()).photosRemaining, 0);
});
test("simultaneous local calls reserve once; rejected upstream refund is idempotent", async () => {
  const q = createLiveQuota(memory(), () => NOW);
  const results = await Promise.allSettled([q.reserve(true), q.reserve(true)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const ok = results.find(
    (r) => r.status === "fulfilled",
  ) as PromiseFulfilledResult<Awaited<ReturnType<typeof q.reserve>>>;
  await ok.value.finish(true);
  await ok.value.finish(true);
  assert.equal((await q.getUsage()).used, 0);
  assert.equal((await q.getUsage()).photosUsed, 0);
});
test("cancel after dispatch counts; old-week refund cannot subtract new-week calls", async () => {
  let now = NOW;
  const q = createLiveQuota(memory(), () => now);
  const old = await q.reserve(true);
  now += 120_000;
  await old.finish(true);
  const next = await q.reserve(false);
  await next.finish(false);
  assert.equal((await q.getUsage()).used, 1);
});
test("quota storage error prevents dispatch, corrupted local state recovers", async () => {
  const q = createLiveQuota({
    getItem: async () => {
      throw new Error("disk");
    },
    setItem: async () => {},
  });
  await assert.rejects(q.reserve(false), /quota-unavailable/);
  const storage = memory();
  storage.data.set(LIVE_QUOTA_KEY, "{bad json");
  assert.equal((await createLiveQuota(storage).getUsage()).remaining, 100);
});
