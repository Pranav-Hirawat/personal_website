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

      var title = document.createElementNS(NS, 'title');
      title.textContent = day.count + (day.count === 1 ? ' contribution' : ' contributions') +
                          ' on ' + d.toDateString();
      rect.appendChild(title);

      svg.appendChild(rect);
    });

    document.getElementById('gh-total').textContent =
      total.toLocaleString() + ' contributions in the last year';
  }

  /* ---- repositories ------------------------------------------------- */

  function drawRepos(repos) {
    var list = document.getElementById('gh-repos');

    repos
      .filter(function (r) { return !r.fork && !r.archived; })
      .sort(function (a, b) { return new Date(b.pushed_at) - new Date(a.pushed_at); })
      .slice(0, 6)
      .forEach(function (r) {
        var li = document.createElement('li');
        li.className = 'gh-repo';

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

  /* ---- go ------------------------------------------------------------ */

  Promise.all([
    j('https://github-contributions-api.jogruber.de/v4/' + USER + '?y=last'),
    j('https://api.github.com/users/' + USER + '/repos?sort=pushed&per_page=100')
  ]).then(function (res) {
    var graph = res[0], repos = res[1];

    if (!graph.contributions || !graph.contributions.length) throw new Error('no contribution data');
    if (!Array.isArray(repos)) throw new Error('no repo data');

    drawGraph(graph.contributions, (graph.total && graph.total.lastYear) || 0);
    drawRepos(repos);

    section.hidden = false;

    /* The section was hidden when motion.js set up its observers, so it never
       got measured. Tell it to look again now that the section has height. */
    window.dispatchEvent(new Event('resize'));
  }).catch(function (err) {
    /* Rate limited, offline, or the service is down. Leave the section out
       entirely — the contact list already links to the profile. */
    section.remove();
    if (window.console) console.info('GitHub section skipped:', err.message);
  });
})();
