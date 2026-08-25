/* Scroll-driven polish: header state, reading progress, reveal-on-scroll,
   and nav highlighting. Everything here is progressive enhancement — with
   this file removed the page still reads and works exactly the same. */

(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var header   = document.getElementById('site-header');
  var progress = document.getElementById('progress');
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.site-header nav a[href^="#"]')
  );

  /* ---- Header state + reading progress ------------------------------ */

  var ticking = false;
  var syncNav = null;        /* assigned below, once the nav observer is set up */
  var sweepReveals = null;   /* ditto, for the reveal safety net */

  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(function () {
      var y = window.scrollY;

      if (header) header.classList.toggle('is-stuck', y > 8);

      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.setProperty('--p', max > 0 ? Math.min(y / max, 1) : 0);
      }

      if (syncNav) syncNav();
      if (sweepReveals) sweepReveals();

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---- Reveal on scroll --------------------------------------------- */

  /* Only opt in to the hidden starting state once we know we can animate
     out of it — otherwise a no-JS or reduced-motion visitor sees nothing. */
  if (!reduced && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-motion');

    var pending = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

    function show(el) {
      el.classList.add('is-visible');
      revealer.unobserve(el);             // reveal once, then stop watching
      var i = pending.indexOf(el);
      if (i > -1) pending.splice(i, 1);
    }

    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) show(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    pending.forEach(function (el) { revealer.observe(el); });

    /* Safety net. Jumping straight past an element — a restored scroll
       position, a deep link, a fast flick — moves it from "below the fold"
       to "above the fold" without ever crossing the threshold, so the
       observer stays silent and the content is stranded invisible. Anything
       already fully above the viewport gets shown outright. */
    sweepReveals = function () {
      if (!pending.length) return;

      Array.prototype.slice.call(pending).forEach(function (el) {
        if (el.getBoundingClientRect().bottom < 0) show(el);
      });
    };
    sweepReveals();
  }

  /* ---- Cursor spotlight on project rows ------------------------------ */

  /* Skipped on touch: there's no hover state to light up, and the listeners
     would fire on every tap-scroll for nothing. */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!reduced && finePointer) {
    document.querySelectorAll('.project').forEach(function (row) {
      var pending = false;
      var lastEvent = null;

      row.addEventListener('pointermove', function (e) {
        lastEvent = e;
        if (pending) return;
        pending = true;

        requestAnimationFrame(function () {
          var box = row.getBoundingClientRect();
          row.style.setProperty('--mx', ((lastEvent.clientX - box.left) / box.width * 100) + '%');
          row.style.setProperty('--my', ((lastEvent.clientY - box.top) / box.height * 100) + '%');
          pending = false;
        });
      }, { passive: true });
    });
  }

  /* ---- Hero glow parallax -------------------------------------------- */

  var glow = document.querySelector('.hero-glow');

  if (!reduced && glow) {
    var glowTicking = false;

    var parallax = function () {
      if (glowTicking) return;
      glowTicking = true;

      requestAnimationFrame(function () {
        /* Drifts down at a fraction of scroll speed. Stops once the hero is
           well off screen — no point animating what nobody can see. */
        var y = window.scrollY;
        if (y < window.innerHeight * 1.5) {
          glow.style.setProperty('--par', (y * 0.18) + 'px');
        }
        glowTicking = false;
      });
    };

    window.addEventListener('scroll', parallax, { passive: true });
    parallax();
  }

  /* ---- Nav highlighting --------------------------------------------- */

  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var visible = new Set();

    syncNav = function (entries) {
      (entries || []).forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });

      /* Highlight the topmost section currently on screen. At the very
         bottom the last section can never reach the observer band, so
         claim it explicitly once the page has nowhere left to scroll. */
      var atBottom = window.innerHeight + window.scrollY >=
                     document.documentElement.scrollHeight - 2;

      var active = atBottom
        ? sections[sections.length - 1]
        : sections.filter(function (s) { return visible.has(s.id); })[0];

      navLinks.forEach(function (a) {
        if (active && a.getAttribute('href') === '#' + active.id) {
          a.setAttribute('aria-current', 'true');
        } else {
          a.removeAttribute('aria-current');
        }
      });
    };

    var spy = new IntersectionObserver(syncNav, { rootMargin: '-20% 0px -60% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
