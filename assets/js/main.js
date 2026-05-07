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
const whatsappLinks = document.querySelectorAll('a[href*="wa.me/"]');
const whatsappNumber = "5592985338279";
const whatsappMessage =
  "Olá, Dra. Vanessa! Vim pelo site e gostaria de agendar uma avaliação.";

// Fill this after publishing the Cloudflare Worker.
const leadEndpoint = window.DRA_VANESSA_LEAD_ENDPOINT || "";
let pendingWhatsappUrl = "";

const buildWhatsappUrl = ({ name, phone } = {}) => {
  const details = name || phone ? `\n\nMeu nome: ${name || ""}\nWhatsApp: ${phone || ""}` : "";
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage + details)}`;
};

const openLeadModal = (url) => {
  if (!leadModal) return;
  pendingWhatsappUrl = url || buildWhatsappUrl();
  leadModal.classList.add("is-open");
  leadModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  leadForm?.querySelector("input[name='name']")?.focus();
};

const closeLeadModal = () => {
  if (!leadModal) return;
  leadModal.classList.remove("is-open");
  leadModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

whatsappLinks.forEach((link) => {
  link.dataset.whatsappCapture = "true";
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
    source: String(formData.get("source") || "Landing page Dra. Vanessa Costa"),
    pageUrl: window.location.href,
  };

  if (!lead.name || !lead.phone) return;

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
    const url = buildWhatsappUrl(lead) || pendingWhatsappUrl;
    window.location.href = url;
    submitButton.disabled = false;
    closeLeadModal();
  }
});
