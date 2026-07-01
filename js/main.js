/* Site shell: load nav/footer partials, then wire mobile-nav toggle. */
(function () {
  const includes = document.querySelectorAll("[data-include]");

  const fetches = Array.from(includes).map((el) => {
    const url = el.getAttribute("data-include");
    return fetch(url, { cache: "no-cache" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${url} ${r.status}`))))
      .then((html) => {
        el.innerHTML = html;
      })
      .catch((err) => console.error("Include failed:", err));
  });

  Promise.all(fetches).then(setupNav).then(markActiveLink).then(setupGauge);

  function setupNav() {
    const btn = document.querySelector(".nav__hamburger");
    const menu = document.querySelector(".nav__mobile");
    if (!btn || !menu) return;

    btn.addEventListener("click", () => {
      const open = btn.classList.toggle("is-open");
      menu.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });

    menu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        btn.classList.remove("is-open");
        menu.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      });
    });
  }

  function markActiveLink() {
    const path = location.pathname.replace(/\/$/, "") || "/";
    document.querySelectorAll(".nav__link, .footer__link").forEach((a) => {
      const href = (a.getAttribute("href") || "").replace(/\/$/, "") || "/";
      const matchHome = href === "/" && (path === "/" || path === "/index.html");
      const matchPage = href !== "/" && path.startsWith(href.replace(".html", ""));
      if (matchHome || matchPage) a.classList.add("nav__link--active");
    });
  }

  function setupGauge() {
    const needle = document.querySelector(".gauge__needle");
    if (!needle) return;
    const target = needle.getAttribute("data-angle") || "-45";
    requestAnimationFrame(() => {
      setTimeout(() => {
        needle.style.transform = `rotate(${target}deg)`;
      }, 300);
    });
  }
})();
