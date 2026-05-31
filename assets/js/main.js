const menuToggle = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("[data-menu]");
const header = document.querySelector("[data-header]");

if (menuToggle && menu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const setHeaderState = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const leadModal = document.querySelector("[data-lead-modal]");
const leadForm = document.querySelector("[data-lead-form]");
const leadStatus = document.querySelector("[data-lead-status]");
const leadCloseButtons = document.querySelectorAll("[data-lead-close]");
const procedureButtons = document.querySelectorAll("[data-procedure-option]");
const procedureInput = document.querySelector("[data-procedure-input]");
const procedureField = document.querySelector("[data-procedure-field]");
const leadTriggerLinks = document.querySelectorAll("a.btn, .treatment-card a, .whatsapp-float, .social-dot");
const whatsappNumber = "5592985338279";
const whatsappMessage = "Olá, Dra. Vanessa! Vim pelo site e gostaria de agendar um atendimento.";

const leadEndpoint = window.DRA_VANESSA_LEAD_ENDPOINT || "/api/leads";
const partnerParams = new URLSearchParams(window.location.search);
const partnerFromUrl = {
  code: String(partnerParams.get("ref") || "").trim(),
  name: String(partnerParams.get("partner") || "").trim(),
};

if (partnerFromUrl.code) {
  localStorage.setItem("dra_vanessa_partner", JSON.stringify(partnerFromUrl));
}

const getPartnerInfo = () => {
  try {
    return JSON.parse(localStorage.getItem("dra_vanessa_partner") || "{}");
  } catch (error) {
    return {};
  }
};
let pendingWhatsappUrl = "";

const buildWhatsappUrl = ({ name, phone, procedure } = {}) => {
  const details =
    name || phone || procedure
      ? `\n\nNome: ${name || ""}\nProcedimento: ${procedure || ""}\nTelefone: ${phone || ""}`
      : "";
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage + details)}`;
};

const openLeadModal = (url) => {
  if (!leadModal) return;
  pendingWhatsappUrl = url || buildWhatsappUrl();
  leadModal.classList.add("is-open");
  leadModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (leadStatus) leadStatus.textContent = "";
  leadForm?.querySelector("input[name='name']")?.focus();
};

const closeLeadModal = () => {
  if (!leadModal) return;
  leadModal.classList.remove("is-open");
  leadModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

const selectProcedure = (procedure) => {
  if (!procedureInput) return;
  procedureInput.value = procedure;
  procedureButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.procedureOption === procedure);
  });
  procedureField?.classList.remove("has-error");
  if (leadStatus) leadStatus.textContent = "";
};

procedureButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectProcedure(button.dataset.procedureOption || "");
  });
});

leadTriggerLinks.forEach((link) => {
  const href = link.getAttribute("href") || "";
  if (href.startsWith("#")) return;

  if (link.dataset.leadCapture === "true") return;
  link.dataset.leadCapture = "true";
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openLeadModal(link.href);
  });
});

leadCloseButtons.forEach((button) => button.addEventListener("click", closeLeadModal));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLeadModal();
});

const saveLeadFallback = (lead) => {
  const key = "dra_vanessa_pending_leads";
  const stored = JSON.parse(localStorage.getItem(key) || "[]");
  stored.push({ ...lead, createdAt: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(stored.slice(-20)));
};

leadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = leadForm.querySelector("button[type='submit']");
  const formData = new FormData(leadForm);
  const lead = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    procedure: String(formData.get("procedure") || "").trim(),
    source: String(formData.get("source") || "Landing page Dra. Vanessa Costa"),
    pageUrl: window.location.href,
    partnerCode: String(getPartnerInfo().code || ""),
    partnerName: String(getPartnerInfo().name || ""),
  };

  if (!lead.name || !lead.phone) return;

  if (!lead.procedure) {
    procedureField?.classList.add("has-error");
    if (leadStatus) leadStatus.textContent = "Selecione o procedimento desejado.";
    return;
  }

  submitButton.disabled = true;
  if (leadStatus) leadStatus.textContent = "Salvando seu atendimento...";

  try {
    if (leadEndpoint) {
      await fetch(leadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } else {
      saveLeadFallback(lead);
    }
  } catch (error) {
    saveLeadFallback(lead);
  } finally {
    window.location.href = buildWhatsappUrl(lead) || pendingWhatsappUrl;
    submitButton.disabled = false;
    closeLeadModal();
  }
});
