/* Panel behaviour: which panel is live, the dot rail, headline splitting,
   counters, magnetic buttons and copy-to-clipboard.

   All of it is progressive enhancement — delete this file and the page still
   reads and works, just without motion. */

(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  var railBtns = Array.prototype.slice.call(document.querySelectorAll('.rail button'));
  var bar = document.querySelector('.bar');

  /* ---- Split the headline into characters ---------------------------
     Done here rather than in the HTML so the markup stays plain text: with
     no JS the line just renders normally. Words stay whole so wrapping
     still works; spaces stay as real text between them. */

  if (!reduced) {
    document.querySelectorAll('.hero h1 .split').forEach(function (line) {
      var i = 0;
      var frag = document.createDocumentFragment();

      line.textContent.split(/(\s+)/).forEach(function (chunk) {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }

        var word = document.createElement('span');
        word.className = 'word';
        chunk.split('').forEach(function (c) {
          var el = document.createElement('span');
          el.className = 'ch';
          el.style.setProperty('--i', i++);
          el.textContent = c;
          word.appendChild(el);
        });
        frag.appendChild(word);
      });

      line.textContent = '';
      line.appendChild(frag);
      line.classList.add('is-split');
    });
  }

  /* ---- Which panel is live ------------------------------------------
     Drives both the entrance animations and the rail. A panel stays live
     once shown: re-animating on every pass back up is nauseating. */

  function setRail(id) {
    railBtns.forEach(function (b) {
      if (b.dataset.to === id) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    var live = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add('is-live');
      });
    }, { threshold: 0.15 });

    panels.forEach(function (p) { live.observe(p); });

    /* Separate observer for the rail: a tighter band, so the dot marks the
       panel actually filling the screen rather than any panel in view. */
    var current = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setRail(e.target.id);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    panels.forEach(function (p) { current.observe(p); });
  } else {
    panels.forEach(function (p) { p.classList.add('is-live'); });
  }

  /* Opt into the hidden start state only once we know we can animate out
     of it — otherwise a no-JS visitor would see nothing at all. */
  if (!reduced && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-motion');
  }

  /* ---- Rail clicks ---------------------------------------------------- */

  railBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var target = document.getElementById(b.dataset.to);
      if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---- Top bar hairline ----------------------------------------------- */

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (bar) bar.classList.toggle('is-past', window.scrollY > 8);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

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

        var start = null, DUR = 1300;
        requestAnimationFrame(function step(t) {
          if (start === null) start = t;
          var p = Math.min((t - start) / DUR, 1);
          show(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        });
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.tally').forEach(function (el) { tallies.observe(el); });
  }

  /* ---- Magnetic buttons ------------------------------------------------ */

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!reduced && finePointer) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      var PULL = 0.15, MAX = 9;
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

  /* ---- Copy to clipboard -----------------------------------------------
     mailto: silently does nothing when no mail client is registered, which
     looks like a broken link. This always works. */

  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.dataset.copy;

      /* If the clipboard is refused, select the address instead — otherwise
         "press Cmd-C" is advice the visitor cannot act on. */
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
        btn.textContent = ok ? 'Copied' : 'Press ⌘C';
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

  /* ---- Keyboard: arrows / page keys move between panels ---------------- */

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

    var dir = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') dir = 1;
    if (e.key === 'ArrowUp'   || e.key === 'PageUp')   dir = -1;
    if (!dir) return;

    var mid = window.innerHeight / 2;
    var i = panels.findIndex(function (p) {
      var r = p.getBoundingClientRect();
      return r.top <= mid && r.bottom > mid;
    });
    var next = panels[Math.max(0, Math.min(i + dir, panels.length - 1))];
    if (!next || next === panels[i]) return;

    e.preventDefault();
    next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });
})();
