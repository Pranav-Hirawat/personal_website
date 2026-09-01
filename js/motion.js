/* Scroll-driven polish: header state, reading progress, reveal-on-scroll,
   and nav highlighting. Everything here is progressive enhancement — with
   this file removed the page still reads and works exactly the same. */

(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var header   = document.getElementById('site-header');
  var hero     = reduced ? null : document.querySelector('.hero');
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

      if (hero) {
        /* Hold steady while the hero is still comfortably on screen, then
           recede. Fading from the first pixel of scroll just looks like the
           page is dimming for no reason. */
        var vh = window.innerHeight;
        var out = (y - vh * 0.3) / (vh * 0.55);
        hero.style.setProperty('--out', Math.max(0, Math.min(out, 1)).toFixed(3));
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

  /* ---- Magnetic buttons ---------------------------------------------- */

  if (!reduced && finePointer) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      var PULL = 0.15;   // fraction of the cursor's offset from centre
      var MAX  = 9;      // px, so the button never lunges out from under you

      var clamp = function (n) { return Math.max(-MAX, Math.min(n, MAX)); };

      btn.addEventListener('pointermove', function (e) {
        var b = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', clamp((e.clientX - (b.left + b.width / 2)) * PULL).toFixed(1) + 'px');
        btn.style.setProperty('--my', clamp((e.clientY - (b.top + b.height / 2)) * PULL).toFixed(1) + 'px');
      }, { passive: true });

      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
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

  /* ---- Split the headline into characters -----------------------------
     Done in JS so the HTML stays plain text: without this the line renders
     normally, just unanimated. Words stay intact as inline-block spans so
     line-breaking still works; spaces stay as real text between them. */

  if (!reduced) {
    document.querySelectorAll('.as-line').forEach(function (line) {
      var index = 0;

      function split(node) {
        var out = document.createDocumentFragment();

        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {                       // text
            child.textContent.split(/(\s+)/).forEach(function (chunk) {
              if (!chunk) return;
              if (/^\s+$/.test(chunk)) { out.appendChild(document.createTextNode(chunk)); return; }

              var word = document.createElement('span');
              word.className = 'word';
              chunk.split('').forEach(function (ch) {
                var el = document.createElement('span');
                el.className = 'ch';
                el.style.setProperty('--i', index++);
                el.textContent = ch;
                word.appendChild(el);
              });
              out.appendChild(word);
            });
          } else if (child.nodeType === 1) {                // keep <em> etc.
            var clone = child.cloneNode(false);
            clone.appendChild(split(child));
            out.appendChild(clone);
          }
        });
        return out;
      }

      var built = split(line);
      line.textContent = '';
      line.appendChild(built);
      line.classList.add('is-split');
    });
  }

  /* ---- Counting numbers ------------------------------------------------ */

  if ('IntersectionObserver' in window) {
    var tallies = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        tallies.unobserve(el);

        var to = parseFloat(el.dataset.to);
        if (isNaN(to)) return;
        var comma = el.hasAttribute('data-comma');
        var show = function (n) {
          el.textContent = comma ? Math.round(n).toLocaleString() : String(Math.round(n));
        };

        if (reduced) { show(to); return; }

        var start = null, DUR = 1200;
        requestAnimationFrame(function step(t) {
          if (start === null) start = t;
          var p = Math.min((t - start) / DUR, 1);
          show(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        });
      });
    }, { threshold: 0.6 });

    document.querySelectorAll('.tally').forEach(function (el) { tallies.observe(el); });
  }

  /* ---- Section dividers draw in ---------------------------------------- */

  if (!reduced && 'IntersectionObserver' in window) {
    var drawer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        drawer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -15% 0px' });

    document.querySelectorAll('.section').forEach(function (el) { drawer.observe(el); });
  }

  /* ---- Copy-to-clipboard ---------------------------------------------
     mailto: silently does nothing when no mail client is registered, which
     looks like a broken link. This always works. */

  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.dataset.copy;

      /* If the clipboard is refused (permission denied, or a browser that
         blocks it in this context), select the address instead — otherwise
         "Press Cmd-C" is advice the visitor cannot act on. */
      function selectAddress() {
        var link = btn.parentNode.querySelector('a');
        if (!link) return;
        var range = document.createRange();
        range.selectNodeContents(link);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }

      function done(ok) {
        if (!ok) selectAddress();
        btn.textContent = ok ? 'Copied' : 'Press \u2318C';
        btn.classList.toggle('is-done', ok);
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.classList.remove('is-done');
        }, ok ? 1800 : 3000);
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(function () { done(true); },
                                                  function () { done(false); });
        return;
      }

      /* Fallback for insecure contexts, where the clipboard API is absent. */
      try {
        var ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:absolute;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        done(document.execCommand('copy'));
        document.body.removeChild(ta);
      } catch (e) { done(false); }
    });
  });

  /* ---- Nav highlighting --------------------------------------------- */

  /* Slide the pill to sit behind the active link. */
  var pill = document.querySelector('.nav-pill');

  function movePill(active) {
    if (!pill) return;

    var link = active && navLinks.filter(function (a) {
      return a.getAttribute('href') === '#' + active.id;
    })[0];

    if (!link) { pill.classList.remove('is-on'); return; }

    var nav = link.parentNode.getBoundingClientRect();
    var box = link.getBoundingClientRect();
    var padX = 10;

    pill.style.width = (box.width + padX * 2) + 'px';
    pill.style.setProperty('--pill-x', (box.left - nav.left - padX) + 'px');
    pill.classList.add('is-on');
  }

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

      movePill(active);
    };

    var spy = new IntersectionObserver(syncNav, { rootMargin: '-20% 0px -60% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
