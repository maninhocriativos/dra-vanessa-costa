export const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export const decodeBasicAuth = (request) => {
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

export const assertAdminAccess = (request, env) => {
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

  return Response.json({ error: "Login ou senha invalidos." }, { status: 401, headers: jsonHeaders });
};

export const ensurePartnerSchema = async (db) => {
  await db.prepare("ALTER TABLE leads ADD COLUMN procedure TEXT").run().catch(() => {});
  await db.prepare("ALTER TABLE leads ADD COLUMN partner_code TEXT").run().catch(() => {});
  await db.prepare("ALTER TABLE leads ADD COLUMN partner_name TEXT").run().catch(() => {});
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS partners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        city TEXT,
        state TEXT,
        instagram TEXT,
        notes TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_partners_code ON partners (code)").run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS partner_clicks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partner_code TEXT NOT NULL,
        city TEXT,
        region TEXT,
        country TEXT,
        ip_hash TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_partner_clicks_code ON partner_clicks (partner_code)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_leads_partner_code ON leads (partner_code)").run().catch(() => {});
};

export const normalizePartnerCode = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
