/* Theme toggle.
   Loaded synchronously in <head> so the stored theme is applied before first
   paint — otherwise a dark-mode visitor gets a white flash on every load. */

(function () {
  var KEY = 'theme';

  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* private mode */ }

  if (stored === 'dark' || stored === 'light') {
    document.documentElement.setAttribute('data-theme', stored);
  }
  // No stored choice: no attribute, so the CSS follows prefers-color-scheme.

  function current() {
    var explicit = document.documentElement.getAttribute('data-theme');
    if (explicit) return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function apply(next) {
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
  }

  /* Anchor the wipe on the button and size it to reach the furthest corner,
     so the new theme sweeps out from where the click happened. */
  function anchor(el) {
    var box = el.getBoundingClientRect();
    var x = box.left + box.width / 2;
    var y = box.top + box.height / 2;
    var r = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    var style = document.documentElement.style;
    style.setProperty('--vt-x', x + 'px');
    style.setProperty('--vt-y', y + 'px');
    style.setProperty('--vt-r', r + 'px');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';

      if (document.startViewTransition && !reduced()) {
        anchor(btn);
        document.startViewTransition(function () { apply(next); });
      } else {
        apply(next);
      }
    });
  });
})();
