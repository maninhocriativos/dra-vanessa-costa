const state = {
  leads: [],
  procedures: [],
  daily: [],
  filtered: [],
  username: sessionStorage.getItem("dra_vanessa_admin_user") || "",
  password: sessionStorage.getItem("dra_vanessa_admin_password") || "",
};

const els = {
  accessCard: document.querySelector("[data-access-card]"),
  accessForm: document.querySelector("[data-access-form]"),
  refresh: document.querySelector("[data-refresh]"),
  print: document.querySelector("[data-print]"),
  search: document.querySelector("[data-search]"),
  procedureFilter: document.querySelector("[data-procedure-filter]"),
  startDate: document.querySelector("[data-start-date]"),
  endDate: document.querySelector("[data-end-date]"),
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

const getAuthHeaders = () => {
  if (!state.username || !state.password) return {};
  return {
    Authorization: `Basic ${btoa(`${state.username}:${state.password}`)}`,
  };
};

const getLeadDay = (lead) => String(lead.created_at || "").slice(0, 10);

const applyFilters = () => {
  const query = normalize(els.search.value);
  const procedure = normalize(els.procedureFilter.value);
  const start = els.startDate.value;
  const end = els.endDate.value;

  state.filtered = state.leads.filter((lead) => {
    const leadText = normalize(`${lead.name} ${lead.phone} ${lead.procedure} ${lead.source}`);
    const leadProcedure = normalize(lead.procedure || "Sem procedimento");
    const day = getLeadDay(lead);

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
    els.table.innerHTML = '<tr><td class="empty-state" colspan="5">Nenhum lead encontrado.</td></tr>';
    return;
  }

  els.table.innerHTML = state.filtered
    .map(
      (lead) => `
        <tr>
          <td>${formatDateTime(lead.created_at)}</td>
          <td>${escapeHtml(lead.name)}</td>
          <td>${escapeHtml(lead.phone)}</td>
          <td>${escapeHtml(lead.procedure || "Sem procedimento")}</td>
          <td>
            ${escapeHtml(lead.source || "Landing page")}
            ${lead.page_url ? `<small>${escapeHtml(lead.page_url)}</small>` : ""}
          </td>
        </tr>
      `
    )
    .join("");
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
  els.generated.textContent = message;
  els.table.innerHTML = `<tr><td colspan="5">${message}</td></tr>`;
};

const loadLeads = async () => {
  setLoading("Carregando leads...");

  const response = await fetch(buildEndpoint(), {
    headers: getAuthHeaders(),
  });

  if (response.status === 401 || response.status === 503) {
    els.accessCard.hidden = false;
    const data = await response.json().catch(() => ({}));
    setLoading(data.error || "Entre com login e senha para carregar os dados.");
    return;
  }

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar os leads.");
  }

  const data = await response.json();
  state.leads = data.leads || [];
  state.procedures = data.procedures || [];
  state.daily = data.daily || [];
  els.accessCard.hidden = true;
  els.generated.textContent = `Atualizado em ${formatDateTime(data.generatedAt)}`;
  renderProcedureOptions();
  applyFilters();
};

els.accessForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(els.accessForm);
  state.username = String(formData.get("username") || "").trim();
  state.password = String(formData.get("password") || "");
  sessionStorage.setItem("dra_vanessa_admin_user", state.username);
  sessionStorage.setItem("dra_vanessa_admin_password", state.password);
  loadLeads().catch((error) => setLoading(error.message));
});

[els.search, els.procedureFilter, els.startDate, els.endDate].forEach((input) => {
  input?.addEventListener("input", applyFilters);
});

els.refresh?.addEventListener("click", () => {
  loadLeads().catch((error) => setLoading(error.message));
});

els.print?.addEventListener("click", () => {
  document.title = `Relatorio de Leads - Dra Vanessa Costa - ${new Date().toLocaleDateString("pt-BR")}`;
  window.print();
});

loadLeads().catch((error) => setLoading(error.message));
