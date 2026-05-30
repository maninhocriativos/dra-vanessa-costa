import { assertAdminAccess, ensurePartnerSchema, jsonHeaders } from "../../_admin.js";

export async function onRequestGet(context) {
  const restricted = assertAdminAccess(context.request, context.env);
  if (restricted) return restricted;

  try {
    await ensurePartnerSchema(context.env.DB);

    const url = new URL(context.request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 1000, 1), 5000);

    const leads = await context.env.DB.prepare(
      `SELECT
        id,
        name,
        phone,
        COALESCE(procedure, '') AS procedure,
        COALESCE(source, '') AS source,
        COALESCE(partner_code, '') AS partner_code,
        COALESCE(partner_name, '') AS partner_name,
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
