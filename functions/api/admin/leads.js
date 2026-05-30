const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const decodeBasicAuth = (request) => {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("basic ")) return null;

  try {
    const decoded = atob(authorization.slice(6).trim());
    const separator = decoded.indexOf(":");
    if (separator === -1) return null;

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch (error) {
    return null;
  }
};

const assertAdminAccess = (request, env) => {
  const expectedUser = env.ADMIN_USER || "";
  const expectedPassword = env.ADMIN_PASSWORD || "";

  if (!expectedUser || !expectedPassword) {
    return Response.json(
      { error: "ADMIN_USER e ADMIN_PASSWORD nao configurados no Cloudflare Pages." },
      { status: 503, headers: jsonHeaders }
    );
  }

  const credentials = decodeBasicAuth(request);
  if (credentials?.username === expectedUser && credentials?.password === expectedPassword) return null;

  return Response.json(
    { error: "Login ou senha invalidos." },
    { status: 401, headers: jsonHeaders }
  );
};

export async function onRequestGet(context) {
  const restricted = assertAdminAccess(context.request, context.env);
  if (restricted) return restricted;

  try {
    await context.env.DB.prepare("ALTER TABLE leads ADD COLUMN procedure TEXT").run().catch(() => {});

    const url = new URL(context.request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 1000, 1), 5000);

    const leads = await context.env.DB.prepare(
      `SELECT
        id,
        name,
        phone,
        COALESCE(procedure, '') AS procedure,
        COALESCE(source, '') AS source,
        COALESCE(page_url, '') AS page_url,
        COALESCE(user_agent, '') AS user_agent,
        created_at
      FROM leads
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ?`
    )
      .bind(limit)
      .all();

    const procedures = await context.env.DB.prepare(
      `SELECT COALESCE(NULLIF(procedure, ''), 'Sem procedimento') AS procedure, COUNT(*) AS total
      FROM leads
      GROUP BY COALESCE(NULLIF(procedure, ''), 'Sem procedimento')
      ORDER BY total DESC, procedure ASC`
    ).all();

    const daily = await context.env.DB.prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total
      FROM leads
      GROUP BY substr(created_at, 1, 10)
      ORDER BY day DESC
      LIMIT 30`
    ).all();

    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        total: leads.results.length,
        leads: leads.results,
        procedures: procedures.results,
        daily: daily.results,
      },
      { headers: jsonHeaders }
    );
  } catch (error) {
    return Response.json(
      { error: "Nao foi possivel carregar os leads." },
      { status: 500, headers: jsonHeaders }
    );
  }
}
