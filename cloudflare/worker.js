const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    try {
      const payload = await request.json();
      const name = String(payload.name || "").trim();
      const phone = String(payload.phone || "").trim();
      const source = String(payload.source || "Landing page Dra. Vanessa Costa").trim();
      const pageUrl = String(payload.pageUrl || "").trim();
      const userAgent = request.headers.get("user-agent") || "";

      if (!name || !phone) {
        return Response.json({ error: "Name and phone are required" }, { status: 400, headers: corsHeaders });
      }

      await env.DB.prepare(
        "INSERT INTO leads (name, phone, source, page_url, user_agent) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(name, phone, source, pageUrl, userAgent)
        .run();

      return Response.json({ ok: true }, { headers: corsHeaders });
    } catch (error) {
      return Response.json({ error: "Unable to save lead" }, { status: 500, headers: corsHeaders });
    }
  },
};
