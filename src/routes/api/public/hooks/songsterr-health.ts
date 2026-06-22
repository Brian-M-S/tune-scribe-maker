import { createFileRoute } from "@tanstack/react-router";

/**
 * Periodic health probe for Songsterr. Called by pg_cron every 6h.
 * Probes both the current /api/songs endpoint and the legacy
 * /a/ra/songs.json one, then writes a row into public.service_health.
 *
 * This is a /api/public/* route so it doesn't require an auth bearer.
 * It performs no writes other than recording its own probe result,
 * so it's safe without a shared secret.
 */
export const Route = createFileRoute("/api/public/hooks/songsterr-health")({
  server: {
    handlers: {
      POST: handler,
      GET: handler,
    },
  },
});

async function handler({ request }: { request: Request }) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!expected || !provided || provided.length !== expected.length) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Constant-time-ish compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  if (diff !== 0) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const probes = await Promise.all([
    probe("songsterr-new", "https://www.songsterr.com/api/songs?pattern=metallica&size=1", (json) =>
      Array.isArray(json) && (json.length === 0 || typeof json[0]?.songId === "number"),
    ),
    probe(
      "songsterr-legacy",
      "https://www.songsterr.com/a/ra/songs.json?pattern=metallica&size=1",
      (json) => Array.isArray(json) && (json.length === 0 || typeof json[0]?.id === "number"),
    ),
  ]);

  const { error } = await supabaseAdmin.from("service_health").insert(probes);
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, probes }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function probe(
  service: string,
  endpoint: string,
  schemaCheck: (json: unknown) => boolean,
) {
  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    const text = await res.text();
    let schemaOk = false;
    try {
      schemaOk = schemaCheck(JSON.parse(text));
    } catch {
      schemaOk = false;
    }
    return {
      service,
      endpoint,
      ok: res.ok,
      status_code: res.status,
      schema_ok: schemaOk,
      sample: text.slice(0, 240),
    };
  } catch (e) {
    return {
      service,
      endpoint,
      ok: false,
      status_code: null as number | null,
      schema_ok: false,
      sample: e instanceof Error ? e.message : "unknown error",
    };
  }
}
