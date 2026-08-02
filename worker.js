function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/analyze") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Méthode non autorisée" }, 405);
    }

    try {
      const body = await request.json();
      const image = body?.image;

      if (!image || typeof image !== "string") {
        return json({ ok: false, error: "Image manquante" }, 400);
      }

      const result = await env.AI.run(
        "@cf/google/gemma-4-26b-a4b-it",
        {
          messages: [
            {
              role: "system",
              content:
                "Tu es GoMo Coach, coach francophone pour Last War: Survival. Analyse uniquement ce qui est visible. Distingue confirmé, probable et manquant. Ne propose jamais de gaspiller une ressource rare."
            },
            {
              role: "user",
              content:
                "Analyse cette capture Last War. Réponds en français avec : Profil reconnu, Tes 3 priorités, À garder, Il me manque. Maximum 3 priorités simples."
            }
          ],
          image: image,
          max_tokens: 700,
          temperature: 0.2
        }
      );

      const analysis =
        result?.response ??
        result?.choices?.[0]?.message?.content ??
        "Analyse reçue mais réponse vide.";

      return json({ ok: true, analysis });
    } catch (error) {
      return json(
        {
          ok: false,
          error: error?.message || "Erreur pendant l’analyse IA"
        },
        500
      );
    }
  }
};
