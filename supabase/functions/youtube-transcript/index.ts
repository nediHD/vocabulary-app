import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// SUPADATA_API_KEY wird als Supabase-Secret gesetzt (nicht im Repo).
// Die live deployte Funktion hat den Key eingebettet; im öffentlichen Repo steht er nicht.
const SUPADATA_KEY = Deno.env.get("SUPADATA_API_KEY") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function extractVideoId(input: string): string | null {
  if (!input) return null;
  const patterns = [
    /youtube\.com\/watch\?[^#]*\bv=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  if (/^[\w-]{11}$/.test(input.trim())) return input.trim();
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!SUPADATA_KEY) {
      return json({ error: "Server nicht konfiguriert (SUPADATA_API_KEY fehlt)." }, 500);
    }

    const { url, lang } = await req.json().catch(() => ({}));
    const videoId = extractVideoId(url || "");
    if (!videoId) return json({ error: "Ungültige YouTube-URL" }, 400);

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let api = `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(videoUrl)}`;
    if (lang) api += `&lang=${encodeURIComponent(lang)}`;

    const res = await fetch(api, { headers: { "x-api-key": SUPADATA_KEY } });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      return json(
        { error: data?.error || data?.message || "Transkript konnte nicht geladen werden.", status: res.status },
        res.status >= 400 && res.status < 600 ? res.status : 502,
      );
    }

    const content = Array.isArray(data.content) ? data.content : [];
    const transcript = content
      .map((c: any) => ({
        start: (c.offset || 0) / 1000,
        dur: (c.duration || 0) / 1000,
        text: String(c.text || "").replace(/\s+/g, " ").trim(),
      }))
      .filter((c: any) => c.text.length > 0);

    if (transcript.length === 0) {
      return json({ error: "Für dieses Video ist kein Transkript verfügbar." }, 404);
    }

    return json({
      videoId,
      language: data.lang || lang || "",
      availableLangs: data.availableLangs || [],
      transcript,
    });
  } catch (err) {
    return json({ error: "Serverfehler: " + ((err as any)?.message || String(err)) }, 500);
  }
});
