const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  try {
    const payload = await context.request.json();
    const name = String(payload.name || "").trim();
    const phone = String(payload.phone || "").trim();
    const source = String(payload.source || "Landing page Dra. Vanessa Costa").trim();
    const pageUrl = String(payload.pageUrl || "").trim();
    const userAgent = context.request.headers.get("user-agent") || "";

    if (!name || !phone) {
      return Response.json({ error: "Name and phone are required" }, { status: 400, headers: corsHeaders });
    }

    await context.env.DB.prepare(
      "INSERT INTO leads (name, phone, source, page_url, user_agent) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(name, phone, source, pageUrl, userAgent)
      .run();

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: "Unable to save lead" }, { status: 500, headers: corsHeaders });
  }
}
