CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  procedure TEXT,
  partner_code TEXT,
  partner_name TEXT,
  source TEXT DEFAULT 'Landing page Dra. Vanessa Costa',
  page_url TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_partner_code ON leads (partner_code);

CREATE TABLE IF NOT EXISTS partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  city TEXT,
  state TEXT,
  instagram TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partners_code ON partners (code);

CREATE TABLE IF NOT EXISTS partner_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_code TEXT NOT NULL,
  city TEXT,
  region TEXT,
  country TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partner_clicks_code ON partner_clicks (partner_code);
