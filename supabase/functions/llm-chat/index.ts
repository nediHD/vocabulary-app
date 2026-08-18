import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// LLM-Proxy: hält den Provider-Key SERVER-SEITIG (Supabase-Secret), damit er
// nicht im öffentlichen Browser-Bundle landet. Standard-Provider ist OpenAI.
//
// Nötige Secrets (Supabase → Edge Functions → Secrets):
//   OPENAI_API_KEY   – dein OpenAI-Key (Pflicht)
//   LLM_MODEL        – optional, Default: gpt-5.6-luna
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const LLM_MODEL = Deno.env.get("LLM_MODEL") || "gpt-5.6-luna";

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
    if (!OPENAI_API_KEY) {
      return json({ error: "Server nicht konfiguriert (OPENAI_API_KEY fehlt)." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const {
      prompt,
      messages: rawMessages,
      max_tokens = 1024,
      temperature = 0.5,
      model: reqModel,
    } = body || {};

    // messages ableiten: entweder direkt übergeben oder aus prompt bauen
    let messages = Array.isArray(rawMessages) ? rawMessages : null;
    if (!messages && typeof prompt === "string" && prompt.trim()) {
      messages = [{ role: "user", content: prompt }];
    }
    if (!messages || messages.length === 0) {
      return json({ error: "Keine messages/prompt angegeben." }, 400);
    }

    const model = (typeof reqModel === "string" && reqModel.trim()) || LLM_MODEL;
    const isGpt5 = /^gpt-5/i.test(model);

    // Payload für OpenAI. GPT-5.x: max_completion_tokens statt max_tokens,
    // Temperatur nur Default (1) erlaubt → weglassen; Reasoning minimal halten,
    // damit das Token-Budget für die eigentliche (JSON-)Ausgabe reicht.
    const payload: Record<string, unknown> = {
      model,
      messages,
    };
    const cap = Math.max(Number(max_tokens) || 1024, 2048);
    if (isGpt5) {
      payload.max_completion_tokens = cap;
      payload.reasoning_effort = "minimal";
    } else {
      payload.max_tokens = cap;
      payload.temperature = temperature;
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { /* raw not json */ }

    if (!res.ok) {
      const msg = data?.error?.message || raw || "LLM-Fehler";
      return json({ error: msg, status: res.status }, res.status >= 400 && res.status < 600 ? res.status : 502);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return json({ error: "Ungültige Antwortstruktur vom LLM." }, 502);
    }
    return json({ content });
  } catch (err) {
    return json({ error: "Serverfehler: " + ((err as any)?.message || String(err)) }, 500);
  }
});
