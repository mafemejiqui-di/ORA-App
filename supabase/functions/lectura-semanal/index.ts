// ORA · Edge Function "lectura-semanal"
// Escribe con Gemini la lectura de la última semana terminada del ciclo de un equipo.
//
// - La llama la app (cualquier integrante del equipo o la administradora) al abrir la pantalla
//   Ciclo o al exportar un PDF. Si la lectura de esa semana ya existe, no hace nada.
// - Gemini solo recibe datos agregados y anónimos (función SQL `insight_input`).
// - Secretos necesarios en Supabase → Edge Functions → Secrets:
//     GEMINI_API_KEY   (obligatorio, de https://aistudio.google.com/apikey)
//     GEMINI_MODEL     (opcional; por defecto gemini-3.5-flash-lite)
//   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen incluidos en toda Edge Function.
import { createClient } from "jsr:@supabase/supabase-js@2";

const WEEK_MS = 7 * 86_400_000;
const MIN_GROUP = 3;
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const WEEK_FOCUS: Record<number, string> = {
  1: "Semana 1: el equipo respondió \"Ver cómo estamos\" (cómo llega cada persona, qué siente en el equipo y qué actitud nota).",
  2: "Semana 2: el foco es \"Tomar una decisión\" (qué decisiones enfrentan, qué las frena y qué tan urgentes son).",
  3: "Semana 3: el equipo cierra el ciclo (cómo termina comparado con el inicio, qué funcionó y qué se lleva al siguiente ciclo).",
};

const SYSTEM_PROMPT = `Eres el asistente de ORA, una herramienta de liderazgo consciente para equipos de trabajo intergeneracionales.
Recibes SOLO datos agregados y anónimos de un equipo durante un ciclo de 3 semanas. Toda la información está en el JSON.
Reglas:
- Escribe en español neutro, con tono cálido, claro y cercano, sin tecnicismos ni jerga de psicología.
- No inventes datos ni porcentajes que no estén en el JSON. Si un campo es null o falta, es porque respondieron muy pocas personas: no lo interpretes.
- No menciones personas ni intentes adivinar quién respondió qué.
- Cuando hables de una generación, habla de la tensión que esa generación PERCIBE en el equipo; nunca la culpes ni la estereotipes.
- La escala de tensión va de 0 (tranquilo) a 1 (mucha tensión): menos de 0.25 es baja, de 0.25 a 0.5 media y más de 0.5 alta. Energía y clima de cierre van de 1 a 5.
- La lectura la ve todo el equipo: la sugerencia debe ser una acción concreta y realizable por el equipo esta semana.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    resumen: { type: "STRING", description: "Lectura de la semana en 2 o 3 frases." },
    patron: { type: "STRING", description: "El patrón principal que se observa, en una frase." },
    sugerencia: { type: "STRING", description: "Una acción concreta para el equipo, en una o dos frases." },
  },
  required: ["resumen", "patron", "sugerencia"],
};

async function askGemini(model: string, apiKey: string, week: number, cycleNumber: number, input: unknown) {
  const prompt = `${WEEK_FOCUS[week]}
Datos del ciclo ${cycleNumber}, acumulados desde su inicio hasta el final de la semana ${week}:
${JSON.stringify(input, null, 2)}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0.6 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new Error("Gemini no devolvió texto");
  const parsed = JSON.parse(text);
  if (!parsed.resumen || !parsed.patron || !parsed.sugerencia) throw new Error("Respuesta de Gemini incompleta");
  return parsed as { resumen: string; patron: string; sugerencia: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { teamId } = await req.json().catch(() => ({}));
    if (!teamId) return json({ error: "Falta teamId" }, 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // Quien llama debe ser del equipo o la administradora.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await service.auth.getUser(token);
    if (!auth?.user) return json({ error: "Sesión no válida" }, 401);
    const { data: me } = await service.from("profiles").select("team_id, is_admin").eq("id", auth.user.id).maybeSingle();
    if (!me || (me.team_id !== teamId && !me.is_admin)) return json({ error: "Sin permiso" }, 403);

    const { data: team } = await service.from("teams").select("id, cycle_anchor").eq("id", teamId).maybeSingle();
    if (!team) return json({ error: "Equipo no encontrado" }, 404);

    // Última semana terminada (contando semanas seguidas desde el inicio del ciclo 1).
    const anchorMs = Date.parse(team.cycle_anchor);
    const elapsedWeeks = Math.floor((Date.now() - anchorMs) / WEEK_MS);
    if (elapsedWeeks < 1) return json({ status: "waiting", nextAt: new Date(anchorMs + WEEK_MS).toISOString() });
    const index = elapsedWeeks - 1;
    const cycleNumber = Math.floor(index / 3) + 1;
    const week = (index % 3) + 1;

    await service.rpc("ensure_cycles", { p_team: teamId });
    const { data: cycle } = await service
      .from("cycles")
      .select("id, starts_at")
      .eq("team_id", teamId)
      .eq("number", cycleNumber)
      .maybeSingle();
    if (!cycle) return json({ error: "Ciclo no encontrado" }, 404);

    // Si ya existe (o ya se sabe que no hubo respuestas suficientes), no se repite.
    const { data: existing } = await service
      .from("team_insights")
      .select("status")
      .eq("team_id", teamId)
      .eq("cycle_id", cycle.id)
      .eq("week", week)
      .maybeSingle();
    if (existing && existing.status !== "error") return json({ status: existing.status, cycleNumber, week });

    const until = new Date(Date.parse(cycle.starts_at) + week * WEEK_MS).toISOString();
    const { data: input, error: inputError } = await service.rpc("insight_input", {
      p_team: teamId,
      p_cycle: cycle.id,
      p_until: until,
    });
    if (inputError) throw inputError;

    const base = { team_id: teamId, cycle_id: cycle.id, cycle_number: cycleNumber, week, input };
    let row: Record<string, unknown>;
    if ((input?.personas_que_respondieron ?? 0) < MIN_GROUP) {
      row = { ...base, status: "insufficient" };
    } else {
      const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) throw new Error("Falta el secreto GEMINI_API_KEY");
      try {
        const reading = await askGemini(model, apiKey, week, cycleNumber, input);
        row = { ...base, status: "ok", model, ...reading };
      } catch (err) {
        console.error(err);
        row = { ...base, status: "error", model };
      }
    }

    const { error: saveError } = await service.from("team_insights").upsert(row, { onConflict: "team_id,cycle_id,week" });
    if (saveError) throw saveError;
    // Avisa a las pantallas abiertas del equipo (tiempo real) que hay una lectura nueva.
    // Con error no se avisa: así un fallo de Gemini no provoca recargas en cadena.
    if (row.status !== "error") {
      await service.from("teams").update({ activity_at: new Date().toISOString() }).eq("id", teamId);
    }

    return json({ status: row.status, cycleNumber, week });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
