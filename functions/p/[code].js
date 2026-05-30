import { ensurePartnerSchema, normalizePartnerCode } from "../_admin.js";

const hashIp = async (value) => {
  if (!value || !crypto?.subtle) return "";
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
};

export async function onRequestGet(context) {
  const code = normalizePartnerCode(context.params.code);
  const url = new URL(context.request.url);
  const destination = new URL("/", url.origin);

  if (!code) return Response.redirect(destination.toString(), 302);

  try {
    await ensurePartnerSchema(context.env.DB);

    const partner = await context.env.DB.prepare(
      "SELECT name, code FROM partners WHERE code = ? AND active = 1 LIMIT 1"
    )
      .bind(code)
      .first();

    if (partner) {
      const cf = context.request.cf || {};
      const ip = context.request.headers.get("cf-connecting-ip") || "";
      await context.env.DB.prepare(
        `INSERT INTO partner_clicks (partner_code, city, region, country, ip_hash, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          partner.code,
          String(cf.city || ""),
          String(cf.region || ""),
          String(cf.country || ""),
          await hashIp(ip),
          context.request.headers.get("user-agent") || ""
        )
        .run();

      destination.searchParams.set("ref", partner.code);
      destination.searchParams.set("partner", partner.name);
    }
  } catch (error) {
    destination.searchParams.set("ref", code);
  }

  return Response.redirect(destination.toString(), 302);
}
