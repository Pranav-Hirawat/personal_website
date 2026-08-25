/* Fills the GitHub section from the public GitHub API.

   Progressive enhancement, and deliberately fail-quiet: the section starts
   hidden and only reveals itself once real data has arrived. GitHub allows
   60 unauthenticated requests per hour per IP, so a visitor behind a busy
   shared address can legitimately get refused — that must look like the
   section was never there, not like the page is broken. */

(function () {
  var USER = 'Pranav-Hirawat';

  var section = document.getElementById('github');
  if (!section) return;

  var CELL = 11;    // square size in px
  var GAP  = 3;
  var TOP  = 15;    // room for month labels

  function j(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' from ' + url);
      return r.json();
    });
  }

  /* ---- contribution heatmap ---------------------------------------- */

  function drawGraph(days, total) {
    var svg = document.getElementById('gh-graph');
    var NS = 'http://www.w3.org/2000/svg';

    /* Pad the front so the first column starts on the right weekday. */
    var lead = new Date(days[0].date).getDay();
    var cells = new Array(lead).fill(null).concat(days);
    var weeks = Math.ceil(cells.length / 7);

    svg.setAttribute('width', weeks * (CELL + GAP));
    svg.setAttribute('height', TOP + 7 * (CELL + GAP));
    svg.setAttribute('viewBox', '0 0 ' + weeks * (CELL + GAP) + ' ' + (TOP + 7 * (CELL + GAP)));

    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var lastMonth = -1;

    cells.forEach(function (day, i) {
      var col = Math.floor(i / 7);
      var row = i % 7;

      if (!day) return;

      var d = new Date(day.date);

      /* One label per month, at the column where that month first appears. */
      if (row === 0 && d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        var t = document.createElementNS(NS, 'text');
        t.setAttribute('x', col * (CELL + GAP));
        t.setAttribute('y', 10);
        t.setAttribute('class', 'gh-month');
        t.textContent = months[lastMonth];
        svg.appendChild(t);
      }

      var rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', col * (CELL + GAP));
      rect.setAttribute('y', TOP + row * (CELL + GAP));
      rect.setAttribute('width', CELL);
      rect.setAttribute('height', CELL);
      rect.setAttribute('rx', 2);
      rect.setAttribute('data-level', day.level);
      rect.setAttribute('aria-hidden', 'true');
      rect.dataset.label = day.count + (day.count === 1 ? ' contribution' : ' contributions') +
                           ' on ' + d.toDateString();

      /* Staggered by column, so the year sweeps in left to right. */
      rect.style.transitionDelay = (col * 11) + 'ms';

      svg.appendChild(rect);
    });

    var totalEl = document.getElementById('gh-total');
    totalEl.innerHTML = '<span class="gh-count" data-to="' + total + '">0</span>' +
                        ' contributions in the last year';

    svg.setAttribute('aria-label',
      total + ' contributions in the last year, shown as a calendar heat map');
  }

  /* ---- repositories ------------------------------------------------- */

  function drawRepos(repos) {
    var list = document.getElementById('gh-repos');

    repos
      .filter(function (r) { return !r.fork && !r.archived; })
      .sort(function (a, b) { return new Date(b.pushed_at) - new Date(a.pushed_at); })
      .slice(0, 6)
      .forEach(function (r, i) {
        var li = document.createElement('li');
        li.className = 'gh-repo';
        li.style.transitionDelay = (i * 70) + 'ms';

        var a = document.createElement('a');
        a.href = r.html_url;
        a.className = 'gh-repo-name';
        a.textContent = r.name;
        li.appendChild(a);

        if (r.description) {
          var p = document.createElement('p');
          p.className = 'gh-repo-desc';
          p.textContent = r.description;
          li.appendChild(p);
        }

        var meta = document.createElement('p');
        meta.className = 'gh-repo-meta';
        if (r.language) {
          var lang = document.createElement('span');
          lang.textContent = r.language;
          meta.appendChild(lang);
        }
        if (r.stargazers_count) {
          var star = document.createElement('span');
          star.textContent = '★ ' + r.stargazers_count;
          meta.appendChild(star);
        }
        var when = document.createElement('span');
        when.textContent = 'updated ' + new Date(r.pushed_at).toLocaleDateString(undefined, {
          month: 'short', year: 'numeric'
        });
        meta.appendChild(when);
        li.appendChild(meta);

        list.appendChild(li);
      });
  }

  /* ---- entrance + counter ------------------------------------------- */

  function animate(hasGraph) {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var svg = hasGraph ? document.getElementById('gh-graph') : null;
    var counter = section.querySelector('.gh-count');

    function count() {
      if (!counter) return;
      var to = parseInt(counter.dataset.to, 10) || 0;
      if (reduced) { counter.textContent = to.toLocaleString(); return; }

      var start = null, DUR = 1100;
      requestAnimationFrame(function step(t) {
        if (start === null) start = t;
        var p = Math.min((t - start) / DUR, 1);
        var eased = 1 - Math.pow(1 - p, 3);          // ease-out cubic
        counter.textContent = Math.round(to * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      });
    }

    function light() {
      if (svg) svg.classList.add('gh-lit');
      section.classList.add('gh-lit-repos');
      count();
    }

    if (reduced || !('IntersectionObserver' in window)) { light(); return; }

    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        light();
        seen.disconnect();
      });
    }, { threshold: 0.15 });

    seen.observe(section);
  }

  /* ---- themed tooltip ------------------------------------------------ */

  function tooltip() {
    var wrap = section.querySelector('.gh-graph-wrap');
    var svg = document.getElementById('gh-graph');

    var tip = document.createElement('div');
    tip.className = 'gh-tip';
    tip.setAttribute('aria-hidden', 'true');
    wrap.appendChild(tip);

    svg.addEventListener('pointermove', function (e) {
      var cell = e.target.closest('rect');
      if (!cell || !cell.dataset.label) { tip.classList.remove('is-on'); return; }

      var box = wrap.getBoundingClientRect();
      var c = cell.getBoundingClientRect();

      tip.textContent = cell.dataset.label;
      tip.classList.add('is-on');
      /* Centre over the square, clamped so it can't hang off either edge. */
      tip.style.left = Math.max(0, Math.min(
        c.left - box.left + c.width / 2 - tip.offsetWidth / 2,
        box.width - tip.offsetWidth
      )) + 'px';
      tip.style.top = (c.top - box.top - tip.offsetHeight - 8) + 'px';
    }, { passive: true });

    svg.addEventListener('pointerleave', function () { tip.classList.remove('is-on'); });
  }

  /* ---- go ------------------------------------------------------------ */

  /* allSettled, not all: the two endpoints fail independently — GitHub's API
     rate-limits per IP, and either host can be blocked by a content blocker.
     Half a section beats none, so render whatever arrived and only give up
     if both failed. */
  Promise.allSettled([
    j('https://github-contributions-api.jogruber.de/v4/' + USER + '?y=last'),
    j('https://api.github.com/users/' + USER + '/repos?sort=pushed&per_page=100')
  ]).then(function (res) {
    var graph = res[0].status === 'fulfilled' ? res[0].value : null;
    var repos = res[1].status === 'fulfilled' ? res[1].value : null;

    var gotGraph = !!(graph && graph.contributions && graph.contributions.length);
    var gotRepos = !!(repos && Array.isArray(repos) && repos.length);

    if (!gotGraph && !gotRepos) {
      section.remove();
      if (window.console) console.info('GitHub section skipped: both requests failed');
      return;
    }

    if (gotGraph) drawGraph(graph.contributions, (graph.total && graph.total.lastYear) || 0);
    else section.querySelector('.gh-graph-wrap').remove();

    if (gotRepos) drawRepos(repos);
    else document.getElementById('gh-repos').remove();

    section.hidden = false;

    /* The section was hidden when motion.js set up its observers, so it never
       got measured. Tell it to look again now that the section has height. */
    window.dispatchEvent(new Event('resize'));

    animate(gotGraph);
    if (gotGraph) tooltip();
  });
})();
