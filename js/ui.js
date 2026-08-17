/* ui.js — reusable, dependency-free interactive components:
   modal / lightbox, tabs, and sticky-nav shrink. Data-attribute
   driven so pages need no per-page JS. Accessible: focus trap,
   Esc, ARIA, keyboard tab navigation. */
(function () {
  "use strict";

  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  /* =========================================================
     MODAL / LIGHTBOX
     ========================================================= */
  var modal, dialog, contentEl, lastFocused, lightboxItems = [], lightboxIndex = -1;
  var lockedScrollY = 0;
  // overflow:hidden on body does not lock scrolling in iOS Safari; the
  // position:fixed dance does, but it's only needed on touch, so desktop
  // keeps the simpler (and visually identical) path.
  var NEEDS_FIXED_LOCK = window.matchMedia("(hover: none)").matches;

  function buildModal() {
    modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "ui-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="modal__scrim" data-modal-close></div>' +
      '<div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="ui-modal-label" tabindex="-1">' +
      '<button class="modal__close" data-modal-close aria-label="Close">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button>' +
      '<div class="modal__content" id="ui-modal-content"></div>' +
      '</div>';
    document.body.appendChild(modal);
    dialog = modal.querySelector(".modal__dialog");
    contentEl = modal.querySelector(".modal__content");
    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-modal-close]")) closeModal();
    });
    bindLightboxGestures();
  }

  /* Touch navigation — the lightbox was arrow-keys-and-buttons only, which
     is unusable as the primary gallery interaction on a phone. */
  function bindLightboxGestures() {
    var x0 = null, y0 = null;
    modal.addEventListener("touchstart", function (e) {
      if (lightboxIndex < 0 || e.touches.length !== 1) { x0 = null; return; }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    }, { passive: true });

    modal.addEventListener("touchend", function (e) {
      if (x0 === null || lightboxIndex < 0) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - x0, dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        showLightbox(lightboxIndex + (dx < 0 ? 1 : -1));
      } else if (dy > 90 && dy > Math.abs(dx)) {
        closeModal();                       // drag down to dismiss
      }
    }, { passive: true });
  }

  function scrollbarWidth() { return window.innerWidth - document.documentElement.clientWidth; }

  function openModal(html, opts) {
    opts = opts || {};
    if (!modal) buildModal();
    lastFocused = document.activeElement;
    contentEl.innerHTML = html;
    modal.classList.toggle("modal--lightbox", !!opts.lightbox);
    // heading id for aria-labelledby
    var h = contentEl.querySelector("h1,h2,h3,h4");
    if (h) { h.id = "ui-modal-label"; }
    dialog.style.setProperty("--modal-origin", opts.origin || "50% 50%");

    var sb = scrollbarWidth();
    lockedScrollY = window.scrollY;
    document.body.style.paddingRight = sb ? sb + "px" : "";
    document.body.classList.add("modal-open");
    if (NEEDS_FIXED_LOCK) {
      document.body.style.position = "fixed";
      document.body.style.top = -lockedScrollY + "px";
      document.body.style.width = "100%";
    }

    modal.hidden = false;
    // next frame → animate in
    requestAnimationFrame(function () { requestAnimationFrame(function () { modal.classList.add("is-open"); }); });
    dialog.focus();

    document.addEventListener("keydown", onKeydown);
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.classList.remove("is-open");
    document.removeEventListener("keydown", onKeydown);
    lightboxItems = []; lightboxIndex = -1;
    var done = function () {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
      document.body.style.paddingRight = "";
      if (NEEDS_FIXED_LOCK) {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, lockedScrollY);
      }
      dialog.removeEventListener("transitionend", done);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };
    // fall back if transitions are disabled (reduced motion)
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { done(); } else { dialog.addEventListener("transitionend", done); setTimeout(done, 500); }
  }

  function onKeydown(e) {
    if (e.key === "Escape") { closeModal(); return; }
    if (e.key === "ArrowLeft" && lightboxIndex > -1) { showLightbox(lightboxIndex - 1); return; }
    if (e.key === "ArrowRight" && lightboxIndex > -1) { showLightbox(lightboxIndex + 1); return; }
    if (e.key !== "Tab") return;
    var f = dialog.querySelectorAll(FOCUSABLE);
    if (!f.length) { e.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function originFrom(el) {
    if (!el) return "50% 50%";
    var r = el.getBoundingClientRect();
    return (r.left + r.width / 2) + "px " + (r.top + r.height / 2) + "px";
  }

  /* Content modal from a <template> */
  function openTemplateModal(trigger) {
    var sel = trigger.getAttribute("data-modal-target");
    var tpl = document.querySelector(sel);
    if (!tpl) return;
    var html = tpl.innerHTML;
    openModal(html, { origin: originFrom(trigger) });
  }

  /* Lightbox */
  function collectLightbox(trigger) {
    var group = trigger.getAttribute("data-lightbox-group");
    var selector = group ? '[data-lightbox][data-lightbox-group="' + group + '"]' : "[data-lightbox]";
    lightboxItems = Array.prototype.slice.call(document.querySelectorAll(selector));
    lightboxIndex = lightboxItems.indexOf(trigger);
  }

  function lightboxHTML(item) {
    var full = item.getAttribute("data-full");
    var cap = item.getAttribute("data-caption") || "";
    var alt = item.getAttribute("data-alt") || cap || "Enlarged image";
    var nav = lightboxItems.length > 1 ?
      '<button class="lightbox__nav lightbox__nav--prev" data-lightbox-prev aria-label="Previous image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
      '<button class="lightbox__nav lightbox__nav--next" data-lightbox-next aria-label="Next image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>'
      : "";
    var safeAlt = alt.replace(/"/g, "&quot;");
    // data-full points at the -1600.jpg original. Every gallery asset also
    // has -800/-1600 in avif and webp, so serve those instead of shipping a
    // ~900KB JPEG to a phone showing it ~375px wide.
    var base = /^(.*)-1600\.jpg$/.exec(full);
    var media;
    if (base) {
      var sizes = 'sizes="(max-width: 640px) 94vw, min(1000px, 92vw)"';
      var set = function (ext) {
        return base[1] + "-800." + ext + " 800w, " + base[1] + "-1600." + ext + " 1600w";
      };
      media = '<picture>' +
        '<source type="image/avif" srcset="' + set("avif") + '" ' + sizes + '>' +
        '<source type="image/webp" srcset="' + set("webp") + '" ' + sizes + '>' +
        '<img class="lightbox__img" src="' + full + '" srcset="' + set("jpg") + '" ' + sizes +
        ' alt="' + safeAlt + '">' +
        '</picture>';
    } else {
      media = '<img class="lightbox__img" src="' + full + '" alt="' + safeAlt + '">';
    }

    return '<figure class="lightbox__figure">' + media +
      (cap ? '<figcaption class="lightbox__caption">' + cap + '</figcaption>' : "") +
      '</figure>' + nav;
  }

  function showLightbox(i) {
    if (!lightboxItems.length) return;
    lightboxIndex = (i + lightboxItems.length) % lightboxItems.length;
    contentEl.innerHTML = lightboxHTML(lightboxItems[lightboxIndex]);
  }

  function openLightbox(trigger) {
    collectLightbox(trigger);
    openModal(lightboxHTML(trigger), { lightbox: true, origin: originFrom(trigger) });
  }

  // Delegated triggers
  document.addEventListener("click", function (e) {
    var mt = e.target.closest("[data-modal-target]");
    if (mt) { e.preventDefault(); openTemplateModal(mt); return; }
    var lb = e.target.closest("[data-lightbox]");
    if (lb) { e.preventDefault(); openLightbox(lb); return; }
    if (e.target.closest("[data-lightbox-prev]")) { showLightbox(lightboxIndex - 1); return; }
    if (e.target.closest("[data-lightbox-next]")) { showLightbox(lightboxIndex + 1); return; }
  });

  // Keyboard activation for non-button modal triggers
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var t = e.target;
    if (t.matches && t.matches("[data-modal-target],[data-lightbox]") && t.tagName !== "BUTTON" && t.tagName !== "A") {
      e.preventDefault(); t.click();
    }
  });

  /* =========================================================
     TABS
     ========================================================= */
  function initTabs(container) {
    var tabs = Array.prototype.slice.call(container.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });

    function select(idx, focus) {
      tabs.forEach(function (t, i) {
        var sel = i === idx;
        t.setAttribute("aria-selected", String(sel));
        t.tabIndex = sel ? 0 : -1;
        var panel = panels[i];
        if (!panel) return;
        if (sel) {
          panel.hidden = false;
          panel.classList.remove("is-leaving");
        } else if (!panel.hidden) {
          panel.hidden = true;
        }
      });
      if (focus) tabs[idx].focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(i); });
      tab.addEventListener("keydown", function (e) {
        var idx = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") idx = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") idx = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") idx = 0;
        else if (e.key === "End") idx = tabs.length - 1;
        if (idx !== null) { e.preventDefault(); select(idx, true); }
      });
    });

    var initial = tabs.findIndex(function (t) { return t.getAttribute("aria-selected") === "true"; });
    select(initial < 0 ? 0 : initial);
  }

  document.querySelectorAll("[data-tabs]").forEach(initTabs);

  /* =========================================================
     STICKY NAV (nav is injected async by main.js)
     ========================================================= */
  function initStickyNav() {
    var nav = document.querySelector(".nav");
    if (!nav) return false;
    var onScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return true;
  }
  if (!initStickyNav()) {
    document.addEventListener("partials:ready", initStickyNav, { once: true });
  }

  /* =========================================================
     MAP EMBED — click to activate (touch only)
     mobile.css sets pointer-events:none on the iframe for coarse
     pointers, so a drag over the full-width map scrolls the page
     instead of panning Google Maps. One tap hands it the gestures.
     ========================================================= */
  document.addEventListener("click", function (e) {
    var map = e.target.closest && e.target.closest(".contact__map");
    if (map) map.classList.add("is-active");
  });
})();
