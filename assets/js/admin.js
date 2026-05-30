const state = {
  leads: [],
  partners: [],
  partnerLocations: [],
  procedures: [],
  daily: [],
  filtered: [],
  username: sessionStorage.getItem("dra_vanessa_admin_user") || "",
  password: sessionStorage.getItem("dra_vanessa_admin_password") || "",
};

const els = {
  loginScreen: document.querySelector("[data-login-screen]"),
  dashboard: document.querySelector("[data-dashboard]"),
  accessForm: document.querySelector("[data-access-form]"),
  loginMessage: document.querySelector("[data-login-message]"),
  refresh: document.querySelector("[data-refresh]"),
  logout: document.querySelector("[data-logout]"),
  print: document.querySelector("[data-print]"),
  search: document.querySelector("[data-search]"),
  procedureFilter: document.querySelector("[data-procedure-filter]"),
  startDate: document.querySelector("[data-start-date]"),
  endDate: document.querySelector("[data-end-date]"),
  clearFilters: document.querySelector("[data-clear-filters]"),
  tabs: document.querySelectorAll("[data-tab]"),
  tabPanels: document.querySelectorAll("[data-tab-panel]"),
  partnerForm: document.querySelector("[data-partner-form]"),
  partnerStatus: document.querySelector("[data-partner-status]"),
  partnersList: document.querySelector("[data-partners-list]"),
  statTotal: document.querySelector("[data-stat-total]"),
  statFiltered: document.querySelector("[data-stat-filtered]"),
  statTop: document.querySelector("[data-stat-top]"),
  statLatest: document.querySelector("[data-stat-latest]"),
  generated: document.querySelector("[data-generated]"),
  table: document.querySelector("[data-leads-table]"),
  procedureBars: document.querySelector("[data-procedure-bars]"),
  dailyBars: document.querySelector("[data-daily-bars]"),
};

const formatDateTime = (value) => {
  if (!value) return "--";
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(date);
};

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildEndpoint = () => {
  const url = new URL("/api/admin/leads", window.location.origin);
  url.searchParams.set("limit", "5000");
  return url;
};

const buildPartnersEndpoint = () => new URL("/api/admin/partners", window.location.origin);

const getAuthHeaders = () => {
  if (!state.username || !state.password) return {};
  return {
    Authorization: `Basic ${btoa(`${state.username}:${state.password}`)}`,
  };
};

const showLogin = (message = "") => {
  els.loginScreen.hidden = false;
  els.dashboard.hidden = true;
  if (els.loginMessage) els.loginMessage.textContent = message;
};

const showDashboard = () => {
  els.loginScreen.hidden = true;
  els.dashboard.hidden = false;
  if (els.loginMessage) els.loginMessage.textContent = "";
};

const getLeadDay = (lead) => String(lead.created_at || "").slice(0, 10);

const getComparableDay = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
};

const applyFilters = () => {
  const query = normalize(els.search.value);
  const procedure = normalize(els.procedureFilter.value);
  const start = els.startDate.value;
  const end = els.endDate.value;

  state.filtered = state.leads.filter((lead) => {
    const leadText = normalize(
      `${lead.name} ${lead.phone} ${lead.procedure} ${lead.source} ${lead.partner_name} ${lead.partner_code}`
    );
    const leadProcedure = normalize(lead.procedure || "Sem procedimento");
    const day = getComparableDay(lead.created_at);

    if (query && !leadText.includes(query)) return false;
    if (procedure && leadProcedure !== procedure) return false;
    if (start && day < start) return false;
    if (end && day > end) return false;
    return true;
  });

  render();
};

const getProcedureCounts = (leads) => {
  const counts = new Map();
  leads.forEach((lead) => {
    const key = lead.procedure || "Sem procedimento";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([procedure, total]) => ({ procedure, total }))
    .sort((a, b) => b.total - a.total || a.procedure.localeCompare(b.procedure));
};

const getDailyCounts = (leads) => {
  const counts = new Map();
  leads.forEach((lead) => {
    const key = getLeadDay(lead) || "Sem data";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([day, total]) => ({ day, total }))
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, 30);
};

const renderBars = (target, rows, labelKey) => {
  const max = Math.max(...rows.map((row) => row.total), 1);
  if (!rows.length) {
    target.innerHTML = '<p class="empty-state">Sem dados para exibir.</p>';
    return;
  }

  target.innerHTML = rows
    .map((row) => {
      const label = row[labelKey];
      const width = Math.max((row.total / max) * 100, 4);
      return `
        <div class="bar-row">
          <div class="bar-label">
            <span>${escapeHtml(label)}</span>
            <strong>${row.total}</strong>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width: ${width}%"></div></div>
        </div>
      `;
    })
    .join("");
};

const renderTable = () => {
  if (!state.filtered.length) {
    els.table.innerHTML = '<p class="empty-state">Nenhum lead encontrado.</p>';
    return;
  }

  els.table.innerHTML = state.filtered
    .map(
      (lead) => `
        <article class="lead-card">
          <button class="lead-card-head" type="button">
            <span>
              <strong>${escapeHtml(lead.name)}</strong>
              <small>${formatDateTime(lead.created_at)}</small>
            </span>
            <span>
              <b>${escapeHtml(lead.procedure || "Sem procedimento")}</b>
              <small>${escapeHtml(lead.phone)}</small>
            </span>
          </button>
          <div class="lead-card-body">
            <dl>
              <div><dt>Nome</dt><dd>${escapeHtml(lead.name)}</dd></div>
              <div><dt>Telefone</dt><dd>${escapeHtml(lead.phone)}</dd></div>
              <div><dt>Procedimento</dt><dd>${escapeHtml(lead.procedure || "Sem procedimento")}</dd></div>
              <div><dt>Parceiro</dt><dd>${escapeHtml(lead.partner_name || lead.partner_code || "Direto")}</dd></div>
              <div><dt>Origem</dt><dd>${escapeHtml(lead.source || "Landing page")}</dd></div>
              <div><dt>Pagina</dt><dd>${escapeHtml(lead.page_url || "--")}</dd></div>
            </dl>
          </div>
        </article>
      `
    )
    .join("");
};

const getPartnerLink = (code) => `${window.location.origin}/p/${encodeURIComponent(code)}`;

const renderPartners = () => {
  if (!els.partnersList) return;
  if (!state.partners.length) {
    els.partnersList.innerHTML = '<p class="empty-state">Nenhum parceiro cadastrado.</p>';
    return;
  }

  els.partnersList.innerHTML = state.partners
    .map((partner) => {
      const link = getPartnerLink(partner.code);
      const locations = state.partnerLocations
        .filter((item) => item.partner_code === partner.code)
        .slice(0, 3)
        .map((item) => `${item.city}${item.region ? `/${item.region}` : ""}: ${item.total}`)
        .join(" | ");
      return `
        <article class="partner-card">
          <div>
            <strong>${escapeHtml(partner.name)}</strong>
            <small>${escapeHtml(partner.instagram || partner.code)}</small>
          </div>
          <div class="partner-link">
            <input value="${escapeHtml(link)}" readonly />
            <button class="btn btn-ghost" type="button" data-copy-link="${escapeHtml(link)}">Copiar</button>
          </div>
          <div class="partner-metrics">
            <span><b>${partner.clicks || 0}</b> acessos</span>
            <span><b>${partner.leads || 0}</b> leads</span>
            <span>${escapeHtml(locations || "Sem origem registrada")}</span>
          </div>
        </article>
      `;
    })
    .join("");
};

const loadPartners = async () => {
  const response = await fetch(buildPartnersEndpoint(), { headers: getAuthHeaders() });
  if (!response.ok) return;
  const data = await response.json();
  state.partners = data.partners || [];
  state.partnerLocations = data.locations || [];
  renderPartners();
};

const renderProcedureOptions = () => {
  const current = els.procedureFilter.value;
  const procedures = getProcedureCounts(state.leads).map((item) => item.procedure);
  els.procedureFilter.innerHTML = '<option value="">Todos</option>';
  procedures.forEach((procedure) => {
    const option = document.createElement("option");
    option.value = procedure;
    option.textContent = procedure;
    els.procedureFilter.appendChild(option);
  });
  els.procedureFilter.value = current;
};

const render = () => {
  const procedureCounts = getProcedureCounts(state.filtered);
  const dailyCounts = getDailyCounts(state.filtered);
  const latest = state.leads[0]?.created_at;

  els.statTotal.textContent = state.leads.length;
  els.statFiltered.textContent = state.filtered.length;
  els.statTop.textContent = procedureCounts[0]?.procedure || "--";
  els.statLatest.textContent = latest ? formatDateTime(latest) : "--";

  renderTable();
  renderBars(els.procedureBars, procedureCounts, "procedure");
  renderBars(els.dailyBars, dailyCounts, "day");
};

const setLoading = (message) => {
  if (!els.generated || !els.table) return;
  els.generated.textContent = message;
  els.table.innerHTML = `<tr><td colspan="5">${message}</td></tr>`;
};

const loadLeads = async () => {
  if (!state.username || !state.password) {
    showLogin();
    return;
  }

  setLoading("Carregando leads...");

  const response = await fetch(buildEndpoint(), {
    headers: getAuthHeaders(),
  });

  if (response.status === 401 || response.status === 503) {
    const data = await response.json().catch(() => ({}));
    sessionStorage.removeItem("dra_vanessa_admin_user");
    sessionStorage.removeItem("dra_vanessa_admin_password");
    state.username = "";
    state.password = "";
    showLogin(data.error || "Entre com login e senha para carregar os dados.");
    return;
  }

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar os leads.");
  }

  const data = await response.json();
  state.leads = data.leads || [];
  state.procedures = data.procedures || [];
  state.daily = data.daily || [];
  showDashboard();
  els.generated.textContent = `Atualizado em ${formatDateTime(data.generatedAt)}`;
  renderProcedureOptions();
  applyFilters();
  loadPartners();
};

els.accessForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(els.accessForm);
  state.username = String(formData.get("username") || "").trim();
  state.password = String(formData.get("password") || "");
  sessionStorage.setItem("dra_vanessa_admin_user", state.username);
  sessionStorage.setItem("dra_vanessa_admin_password", state.password);
  if (els.loginMessage) els.loginMessage.textContent = "Validando acesso...";
  loadLeads().catch((error) => setLoading(error.message));
});

[els.search, els.procedureFilter, els.startDate, els.endDate].forEach((input) => {
  input?.addEventListener("input", applyFilters);
  input?.addEventListener("change", applyFilters);
});

els.clearFilters?.addEventListener("click", () => {
  els.search.value = "";
  els.procedureFilter.value = "";
  els.startDate.value = "";
  els.endDate.value = "";
  applyFilters();
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
    els.tabPanels.forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== tab.dataset.tab;
    });
    if (tab.dataset.tab === "partners") loadPartners();
  });
});

els.partnerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(els.partnerForm);
  const payload = Object.fromEntries(formData.entries());
  if (els.partnerStatus) els.partnerStatus.textContent = "Salvando parceiro...";

  const response = await fetch(buildPartnersEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (els.partnerStatus) els.partnerStatus.textContent = data.error || "Nao foi possivel salvar.";
    return;
  }

  els.partnerForm.reset();
  if (els.partnerStatus) els.partnerStatus.textContent = "Parceiro salvo e link gerado.";
  loadPartners();
});

document.addEventListener("click", async (event) => {
  const head = event.target.closest(".lead-card-head");
  if (head) {
    head.closest(".lead-card")?.classList.toggle("is-open");
  }

  const copyButton = event.target.closest("[data-copy-link]");
  if (copyButton) {
    await navigator.clipboard?.writeText(copyButton.dataset.copyLink || "");
    copyButton.textContent = "Copiado";
    setTimeout(() => {
      copyButton.textContent = "Copiar";
    }, 1400);
  }
});

els.refresh?.addEventListener("click", () => {
  loadLeads().catch((error) => setLoading(error.message));
});

els.logout?.addEventListener("click", () => {
  sessionStorage.removeItem("dra_vanessa_admin_user");
  sessionStorage.removeItem("dra_vanessa_admin_password");
  state.username = "";
  state.password = "";
  state.leads = [];
  state.filtered = [];
  showLogin("Sessao encerrada.");
});

els.print?.addEventListener("click", () => {
  document.title = `Relatorio de Leads - Dra Vanessa Costa - ${new Date().toLocaleDateString("pt-BR")}`;
  window.print();
});

if (state.username && state.password) {
  loadLeads().catch((error) => showLogin(error.message));
} else {
  showLogin();
}
