export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY n'est pas configurée dans Netlify." },
        { status: 500 }
      );
    }

    const contents = [];

    if (Array.isArray(body.messages)) {
      for (const m of body.messages) {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [
            {
              text: String(m.text ?? "")
            }
          ]
        });
      }
    } else {
      const parts = [];

      if (Array.isArray(body.images)) {
        for (const img of body.images) {
          if (img?.data) {
            parts.push({
              inline_data: {
                mime_type: img.type || "image/jpeg",
                data: img.data
              }
            });
          }
        }
      }

      if (body.prompt) {
        parts.push({
          text: String(body.prompt)
        });
      }

      contents.push({
        role: "user",
        parts
      });
    }

    const payload = {
      contents
    };

    if (body.system) {
      payload.systemInstruction = {
        parts: [
          {
            text: String(body.system)
          }
        ]
      };
    }

    if (body.useWebSearch) {
      payload.tools = [
        {
          google_search: {}
        }
      ];
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();

    if (!r.ok) {
      return Response.json(
        {
          error: data?.error?.message || "Erreur Gemini"
        },
        {
          status: r.status
        }
      );
    }

    const text = (data.candidates || [])
      .flatMap(c => c.content?.parts || [])
      .filter(p => p.text)
      .map(p => p.text)
      .join("\n");

    return Response.json({ text });

  } catch (e) {
    return Response.json(
      {
        error: e.message || "Erreur serveur"
      },
      {
        status: 500
      }
    );
  }
};
