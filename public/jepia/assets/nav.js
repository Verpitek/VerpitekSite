// Jepia Webdoc — Navigation & UI interactions

(function () {
  // ---- Active nav link ----
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.topnav-links a').forEach(function (a) {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // ---- Hamburger menu ----
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('topnav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      const open = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
    });
    // Close when clicking a link
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
    // Close when clicking outside
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---- Sidebar toggle (mobile) ----
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      const open = sidebar.classList.toggle('open');
      sidebarToggle.classList.toggle('open', open);
    });
  }

  // ---- Scroll spy for sidebar active links ----
  const sidebarLinks = document.querySelectorAll('.sidebar a[href^="#"]');
  if (sidebarLinks.length > 0) {
    const headings = [];
    sidebarLinks.forEach(function (link) {
      const id = link.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) headings.push({ el: el, link: link });
    });

    function updateActive() {
      const scrollY = window.scrollY + 100;
      let current = headings[0];
      for (let i = 0; i < headings.length; i++) {
        if (headings[i].el.offsetTop <= scrollY) {
          current = headings[i];
        }
      }
      sidebarLinks.forEach(function (l) { l.classList.remove('active'); });
      if (current) current.link.classList.add('active');
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
  }

  // ---- Collapsible sidebar categories ----
  document.querySelectorAll('.sidebar .category-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var group = toggle.nextElementSibling;
      if (group && group.classList.contains('section-group')) {
        toggle.classList.toggle('collapsed');
        group.classList.toggle('collapsed');
      }
    });
  });

  // ---- Sidebar search filter ----
  var searchInput = document.getElementById('sidebar-search');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.toLowerCase();
      document.querySelectorAll('.sidebar .section-group li').forEach(function (li) {
        var text = li.textContent.toLowerCase();
        li.style.display = text.includes(q) ? '' : 'none';
      });
      // Expand all groups when searching, collapse when cleared
      document.querySelectorAll('.sidebar .section-group').forEach(function (g) {
        if (q) {
          g.classList.remove('collapsed');
          var t = g.previousElementSibling;
          if (t && t.classList.contains('category-toggle')) t.classList.remove('collapsed');
        }
      });
    });
  }
})();
