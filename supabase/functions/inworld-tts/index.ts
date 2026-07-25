import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// FAL_KEY wird als Supabase-Secret gesetzt (nicht im Repo).
// Die live deployte Funktion hat den Key eingebettet; im öffentlichen Repo steht er nicht.
const FAL_KEY = Deno.env.get("FAL_KEY") || "";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!FAL_KEY) {
      return json({ error: "Server nicht konfiguriert (FAL_KEY fehlt)." }, 500);
    }

    const { text, voice, sample_rate_hertz } = await req.json().catch(() => ({}));
    if (!text || typeof text !== "string") {
      return json({ error: "Kein Text angegeben." }, 400);
    }
    if (text.length > 2000) {
      return json({ error: "Text zu lang (max 2000 Zeichen pro Aufruf)." }, 400);
    }

    const res = await fetch("https://fal.run/fal-ai/inworld-tts", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice: voice || "Mathieu (fr)",
        sample_rate_hertz: sample_rate_hertz || 24000,
      }),
    });

    const raw = await res.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { /* raw not json */ }

    if (!res.ok) {
      // Guthaben leer / Zahlung erforderlich
      const msg = (data?.detail || data?.error || raw || "").toString().toLowerCase();
      if (res.status === 402 || msg.includes("balance") || msg.includes("insufficient") || msg.includes("exhausted") || msg.includes("payment")) {
        return json({ error: "NO_BALANCE", detail: "Kein Guthaben mehr auf fal.ai." }, 402);
      }
      return json(
        { error: data?.detail || data?.error || "TTS-Fehler", status: res.status },
        res.status >= 400 && res.status < 600 ? res.status : 502,
      );
    }

    const audioUrl = data?.audio?.url || data?.audio_url || data?.url || null;
    if (!audioUrl) {
      return json({ error: "Keine Audio-URL erhalten." }, 502);
    }

    return json({ audioUrl });
  } catch (err) {
    return json({ error: "Serverfehler: " + ((err as any)?.message || String(err)) }, 500);
  }
});
