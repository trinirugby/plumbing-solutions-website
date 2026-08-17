/* motion.js — scroll reveals, kinetic stagger groups, stat count-up,
   and the hero/section video controller. Operates on static in-page
   markup only; does NOT wait on the nav/footer includes.
   Every effect is fail-safe: if anything throws, content stays visible. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  // Ensure the .js flag is present (inline head script normally sets it).
  if (hasIO) root.classList.add("js");

  /* ---------- Reveal groups: assign staggered delays ---------- */
  try {
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      var stagger = parseInt(group.getAttribute("data-reveal-group"), 10);
      if (isNaN(stagger)) stagger = 90;
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (!child.hasAttribute("data-reveal")) child.setAttribute("data-reveal", "");
        child.style.setProperty("--reveal-delay", i * stagger + "ms");
      });
    });
  } catch (e) { /* non-fatal */ }

  /* ---------- Scroll reveal ---------- */
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  function reveal(el) {
    el.classList.add("is-revealed");
    // kick off any count-ups inside a revealed block
    el.querySelectorAll ? countUpWithin(el) : null;
  }

  if (!hasIO || reduceMotion) {
    revealTargets.forEach(reveal);
  } else {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    revealTargets.forEach(function (el) { io.observe(el); });

    // Safety sweep: force-reveal anything still hidden shortly after load.
    window.addEventListener("load", function () {
      setTimeout(function () {
        revealTargets.forEach(function (el) {
          if (!el.classList.contains("is-revealed")) reveal(el);
        });
      }, 1500);
    });
  }

  /* ---------- Stat count-up ---------- */
  var counted = new WeakSet();

  function animateCount(el) {
    if (counted.has(el)) return;
    counted.add(el);
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    var suffix = el.getAttribute("data-suffix") || "";
    var prefix = el.getAttribute("data-prefix") || "";
    if (reduceMotion) { el.textContent = prefix + target + suffix; return; }
    var dur = 1400, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target + suffix;
    }
    requestAnimationFrame(step);
  }

  function countUpWithin(scope) {
    (scope.matches && scope.matches("[data-count]") ? [scope] : [])
      .concat(Array.prototype.slice.call(scope.querySelectorAll("[data-count]")))
      .forEach(animateCount);
  }

  // Counters not inside a reveal block: observe them directly (or run now).
  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  if (!hasIO || reduceMotion) {
    counters.forEach(animateCount);
  } else {
    var cio = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Video controller (hero + section bands) ---------- */
  try {
    var videos = document.querySelectorAll(".hero__video, .video-band__media video");
    var saveData = navigator.connection && navigator.connection.saveData;

    videos.forEach(function (v) {
      // These are decorative loops, never a player: no native chrome, no
      // picture-in-picture, no cast target, not focusable. Belt-and-braces
      // against mobile browsers that volunteer their own play/pause and
      // ±10s buttons over a tappable <video>.
      v.controls = false;
      v.removeAttribute("controls");
      v.setAttribute("controlslist", "nodownload noplaybackrate nofullscreen noremoteplayback");
      v.disablePictureInPicture = true;
      v.setAttribute("disablepictureinpicture", "");
      v.setAttribute("disableremoteplayback", "");
      v.setAttribute("tabindex", "-1");

      // Data-saver is the one case we honour by leaving the poster up. We
      // intentionally still play under reduced-motion: it's a muted,
      // non-flashing ambient loop, and the client wants the hero to move.
      if (saveData) {
        v.removeAttribute("autoplay");
        return;
      }
      v.muted = true;            // property (not just attribute) — required for autoplay
      v.setAttribute("muted", "");
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.preload = "auto";

      // Speed up the ambient loop so it reads as lively, not sluggish.
      // Per-video override via data-speed; hero defaults faster.
      var speed = parseFloat(v.getAttribute("data-speed")) ||
                  (v.classList.contains("hero__video") ? 1.5 : 1);
      if (speed !== 1) {
        v.playbackRate = speed;
        v.addEventListener("loadedmetadata", function () { v.playbackRate = speed; });
      }

      var started = false;
      function cleanup() {
        started = true;
        ["pointerdown", "touchstart", "keydown", "scroll", "mousemove"].forEach(function (ev) {
          window.removeEventListener(ev, kick);
        });
      }
      function tryPlay() {
        if (started) return;
        var a = v.play();
        if (a && typeof a.then === "function") a.then(cleanup).catch(function () {});
      }
      // when it genuinely starts, stop retrying
      v.addEventListener("playing", cleanup, { once: true });

      tryPlay();                                   // immediate
      v.addEventListener("loadeddata", tryPlay);
      v.addEventListener("canplay", tryPlay);
      // Autoplay blocked (Brave, efficiency mode, etc.)? Kick it off on the
      // first real interaction — and KEEP listening until it actually plays.
      var kick = function () { tryPlay(); };
      ["pointerdown", "touchstart", "keydown", "scroll", "mousemove"].forEach(function (ev) {
        window.addEventListener(ev, kick, { passive: true });
      });
      // Belt-and-braces: if still stalled after load, reload the source once.
      window.addEventListener("load", function () {
        setTimeout(function () {
          if (!started && v.paused) { try { v.load(); } catch (e) {} tryPlay(); }
        }, 1200);
      });
    });
  } catch (e) { /* non-fatal — poster remains */ }
})();
