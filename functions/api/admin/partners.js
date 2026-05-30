import { assertAdminAccess, ensurePartnerSchema, jsonHeaders, normalizePartnerCode } from "../../_admin.js";

const getPartnerPayload = async (request) => {
  const payload = await request.json();
  const name = String(payload.name || "").trim();
  const code = normalizePartnerCode(payload.code || name);
  return {
    name,
    code,
    city: String(payload.city || "").trim(),
    state: String(payload.state || "").trim(),
    instagram: String(payload.instagram || "").trim(),
    notes: String(payload.notes || "").trim(),
  };
};

export async function onRequestGet(context) {
  const restricted = assertAdminAccess(context.request, context.env);
  if (restricted) return restricted;

  try {
    await ensurePartnerSchema(context.env.DB);

    const partners = await context.env.DB.prepare(
      `SELECT
        p.id,
        p.name,
        p.code,
        COALESCE(p.city, '') AS city,
        COALESCE(p.state, '') AS state,
        COALESCE(p.instagram, '') AS instagram,
        COALESCE(p.notes, '') AS notes,
        p.active,
        p.created_at,
        COUNT(DISTINCT pc.id) AS clicks,
        COUNT(DISTINCT l.id) AS leads
      FROM partners p
      LEFT JOIN partner_clicks pc ON pc.partner_code = p.code
      LEFT JOIN leads l ON l.partner_code = p.code
      GROUP BY p.id
      ORDER BY p.active DESC, datetime(p.created_at) DESC, p.name ASC`
    ).all();

    const locations = await context.env.DB.prepare(
      `SELECT
        partner_code,
        COALESCE(NULLIF(city, ''), 'Cidade nao identificada') AS city,
        COALESCE(NULLIF(region, ''), '') AS region,
        COALESCE(NULLIF(country, ''), '') AS country,
        COUNT(*) AS total
      FROM partner_clicks
      GROUP BY partner_code, COALESCE(NULLIF(city, ''), 'Cidade nao identificada'), region, country
      ORDER BY total DESC`
    ).all();

    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        partners: partners.results,
        locations: locations.results,
      },
      { headers: jsonHeaders }
    );
  } catch (error) {
    return Response.json(
      { error: "Nao foi possivel carregar os parceiros." },
      { status: 500, headers: jsonHeaders }
    );
  }
}

export async function onRequestPost(context) {
  const restricted = assertAdminAccess(context.request, context.env);
  if (restricted) return restricted;

  try {
    await ensurePartnerSchema(context.env.DB);
    const partner = await getPartnerPayload(context.request);

    if (!partner.name || !partner.code) {
      return Response.json({ error: "Nome e codigo sao obrigatorios." }, { status: 400, headers: jsonHeaders });
    }

    await context.env.DB.prepare(
      `INSERT INTO partners (name, code, city, state, instagram, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        city = excluded.city,
        state = excluded.state,
        instagram = excluded.instagram,
        notes = excluded.notes,
        active = 1`
    )
      .bind(partner.name, partner.code, partner.city, partner.state, partner.instagram, partner.notes)
      .run();

    return Response.json({ ok: true, partner }, { headers: jsonHeaders });
  } catch (error) {
    return Response.json(
      { error: "Nao foi possivel salvar o parceiro. Verifique se o codigo ja existe." },
      { status: 500, headers: jsonHeaders }
    );
  }
}
