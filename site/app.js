/* ─────────────────────────────────────────────────────────────
   RvgeShot landing — interaktivnost

   ▼ DOWNLOAD LINKOVI ▼
   Prazan string ("") => gumb pokaže „coming soon".
   Windows je objavljen i radi odmah. macOS dolazi kad se build potvrdi —
   tad vrati .dmg link: ".../releases/latest/download/RvgeShot.dmg".
   ───────────────────────────────────────────────────────────── */
const DOWNLOADS = {
  windows: "https://github.com/notbrec/RvgeShot/releases/latest/download/RvgeShot-Setup.msi",
  mac: "", // coming soon
};

const OS_LABEL = { windows: "Windows", mac: "macOS" };

/* ── detekcija operativnog sustava posjetitelja ──────────────── */
function detectOS() {
  const p = (navigator.userAgentData?.platform || navigator.platform || "")
    .toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  if (p.includes("mac") || ua.includes("mac")) return "mac";
  if (p.includes("win") || ua.includes("win")) return "windows";
  return null; // Linux / mobitel / nepoznato → ne nameći ništa
}

/* ── poveži download gumbe ───────────────────────────────────── */
function wireDownloads() {
  const os = detectOS();

  document.querySelectorAll("[data-os]").forEach((el) => {
    const target = el.dataset.os;
    const url = DOWNLOADS[target] || "";

    if (url) {
      el.setAttribute("href", url);
    } else {
      // build još nije objavljen → blagi feedback umjesto mrtvog linka
      el.addEventListener("click", (e) => {
        e.preventDefault();
        flashHint(`${OS_LABEL[target]} build coming soon 🚀`);
      });
    }

    // istakni gumb za posjetiteljev OS
    if (os && target === os && el.classList.contains("btn")) {
      el.setAttribute("data-recommended", "");
    }
  });

  // stiša "drugi" gumb da preporučeni dominira
  if (os) {
    document
      .querySelectorAll(`.btn[data-os]:not([data-os="${os}"])`)
      .forEach((el) => {
        if (el.classList.contains("btn--primary")) {
          el.classList.replace("btn--primary", "btn--ghost");
        }
      });
    document.querySelectorAll(`.btn[data-os="${os}"]`).forEach((el) => {
      if (el.classList.contains("btn--ghost")) {
        el.classList.replace("btn--ghost", "btn--primary");
      }
    });

    const hint = document.getElementById("os-hint");
    if (hint) hint.textContent = `Detected: ${OS_LABEL[os]} · 64-bit`;
  }
}

let hintTimer;
function flashHint(msg) {
  const hint = document.getElementById("os-hint");
  if (!hint) return;
  hint.textContent = msg;
  hint.style.color = "rgb(90 170 255)";
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    hint.style.color = "";
  }, 2600);
}

/* ── reveal na scroll ────────────────────────────────────────── */
function wireReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  els.forEach((el) => io.observe(el));
}

/* ── nav dobiva pozadinu nakon scrolla ───────────────────────── */
function wireNav() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ── mobilni "Soon" gumbi ────────────────────────────────────── */
function wireMobile() {
  const hint = document.getElementById("os-hint");
  const say = () => {
    if (hint) {
      hint.textContent = "iOS & Android are in the works — desktop is ready now. 📱";
      hint.style.color = "rgb(90 170 255)";
    }
  };
  document.querySelectorAll(".store[data-soon]").forEach((el) => {
    el.addEventListener("click", say);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        say();
      }
    });
  });
}

/* ── init ────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  wireDownloads();
  wireReveal();
  wireNav();
  wireMobile();
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});
