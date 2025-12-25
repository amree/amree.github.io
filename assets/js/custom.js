// Theme toggle
(function() {
  const toggle = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');
  if (!toggle || !icon) return;

  const STORAGE_KEY = 'theme-preference';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || getSystemTheme();
  }

  function setTheme(theme) {
    document.body.classList.toggle('light-theme', theme === 'light');
    icon.textContent = theme === 'light' ? '🌙' : '☀️';
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // Initialize
  setTheme(getTheme());

  // Toggle on click
  toggle.addEventListener('click', function() {
    const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    setTheme(current === 'light' ? 'dark' : 'light');
  });

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function(e) {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTheme(e.matches ? 'light' : 'dark');
    }
  });
})();

// Reading progress bar
(function() {
  const progress = document.getElementById('reading-progress');
  if (!progress) return;

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progress.style.width = scrollPercent + '%';
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
})();

// Toast notification
function showToast(message) {
  var toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 2000);
}

// Convert abbr[title] to use data-tip (disables browser tooltip)
(function() {
  document.querySelectorAll('abbr[title]').forEach(function(abbr) {
    abbr.setAttribute('data-tip', abbr.getAttribute('title'));
    abbr.removeAttribute('title');
  });
})();

// Heading anchors - enhance theme's existing .hanchor with copy and icon
(function() {
  const linkIcon = '<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg>';

  const anchors = document.querySelectorAll('.hanchor');
  anchors.forEach(function(anchor) {
    // Replace # with link icon
    anchor.innerHTML = linkIcon;
    anchor.title = 'Permalink';

    // Add copy to clipboard on click
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const url = window.location.origin + window.location.pathname + anchor.getAttribute('href');
      navigator.clipboard.writeText(url).then(function() {
        anchor.classList.add('copied');
        showToast('Link copied to clipboard');
        setTimeout(function() { anchor.classList.remove('copied'); }, 2000);
      });
      history.pushState(null, null, anchor.getAttribute('href'));
    });
  });
})();

// Sidebar
(function() {
  var overlay = null;

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.innerHTML = '<div class="sidebar-panel"><button class="sidebar-close">&times;</button><h3 class="sidebar-title"></h3><div class="sidebar-content"></div></div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeSidebar();
    });
    overlay.querySelector('.sidebar-close').addEventListener('click', closeSidebar);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        closeSidebar();
      }
    });

    return overlay;
  }

  function openSidebar(title, content) {
    var o = createOverlay();
    o.querySelector('.sidebar-title').textContent = title;
    var sidebarContent = o.querySelector('.sidebar-content');
    sidebarContent.innerHTML = content;
    // Re-render KaTeX if available
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(sidebarContent, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ]
      });
    }
    o.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // Initialize triggers
  document.querySelectorAll('.sidebar-trigger').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var target = document.getElementById(trigger.dataset.sidebar);
      if (target) {
        var title = target.dataset.title || 'Info';
        openSidebar(title, target.innerHTML);
      }
    });
  });
})();
