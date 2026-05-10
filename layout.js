// ========================================
// SHARED LAYOUT - Sidebar + Topbar
// ========================================

// Enhanced requireAuth: checks localStorage session AND schedules Firebase auth sync.
// Pages won't redirect unless both session is missing AND Firebase confirms no user.
function requireAuth() {
  const session = SESSION.get();
  if (!session) {
    // Double-check with Firebase before redirecting (handles race on page load)
    auth.onAuthStateChanged(user => {
      if (!user) {
        window.location.href = 'index.html';
      } else {
        // Firebase user exists but no session — likely cleared manually, rebuild minimal session
        // and redirect to login to re-select school properly
        window.location.href = 'index.html';
      }
    });
    return null;
  }
  // Session exists — apply school theme immediately
  const school = SESSION.getSchool();
  if (school) applySchoolTheme(school);

  // Background sync: if Firebase says no user, clear session and redirect
  auth.onAuthStateChanged(user => {
    if (!user) {
      SESSION.clear();
      window.location.href = 'index.html';
    }
  });

  return session;
}

function renderLayout(activePage, pageTitle) {
  const session = requireAuth();
  if (!session) return;

  const school = SESSION.getSchool();
  const isAdmin = SESSION.isAdmin();
  const userName = session.name || session.email.split('@')[0];

  const navItems = [
    { id: 'dashboard',      icon: '', label: 'الرئيسية',             href: 'dashboard.html' },
    { id: 'collection',     icon: '', label: 'تحصيل يومي',           href: 'collection.html' },
    { id: 'student-search', icon: '', label: 'بحث الطلاب',           href: 'student-search.html' },
    { id: 'debts',          icon: '', label: 'المديونيات',            href: 'debts.html' },
    { id: 'expenses',       icon: '', label: 'بند المصروفات',         href: 'expenses.html' },
    { id: 'buses',          icon: '', label: 'بند الباصات',            href: 'buses.html' },
    { id: 'contractors',    icon: '', label: 'الموردون والمقاولون',   href: 'contractors.html' },
    { id: 'reports',        icon: '', label: 'التقارير والشيتات',     href: 'reports.html' },
    { id: 'party',          icon: '', label: 'تسجيل الحفلة',          href: 'party.html' },
    { id: 'photo-package',  icon: '', label: 'باكدج التصوير',         href: 'photo-package.html' },
  ];

  // admin link بيظهر في section منفصل أسفل القايمة — مش هنا

  const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <img class="sidebar-logo" id="school-logo" 
          src="${school?.logo || 'logos/default.png'}" 
          alt="${school?.name || ''}"
          onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23ffffff33%22/><text y=%22.9em%22 font-size=%2290%22></text></svg>'"
        />
        <div class="sidebar-school-name" id="school-name">${school?.name || 'النظام'}</div>
        <div class="sidebar-user">${session.email}</div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">القائمة الرئيسية</div>
        ${navItems.map(item => `
          <a class="nav-item ${activePage === item.id ? 'active' : ''}" href="${item.href}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
        
        ${isAdmin ? `
          <div class="nav-section-title" style="margin-top:0.5rem">الأدمن</div>
          <a class="nav-item ${activePage === 'admin' ? 'active' : ''}" href="admin.html">
            <span class="nav-icon"></span>
            <span>إدارة النظام</span>
          </a>
          <div class="nav-item" onclick="showSchoolSwitcher()">
            <span class="nav-icon"></span>
            <span>تغيير المدرسة</span>
          </div>
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="user-info-mini">
          <div class="user-avatar">${isAdmin ? '' : ''}</div>
          <div class="user-details-mini">
            <div class="user-name-mini">${userName}</div>
            <div class="user-role-mini">${isAdmin ? 'مدير النظام' : 'محاسب'}</div>
          </div>
        </div>
        <button class="btn btn-outline w-full btn-sm" onclick="logout()" style="justify-content:center">
           تسجيل الخروج
        </button>
      </div>
    </aside>
  `;

  const topbarHTML = `
    <div class="topbar">
      <div class="d-flex align-center gap-1">
        <button class="btn btn-icon" id="sidebarToggle" onclick="toggleSidebar()" style="display:none"></button>
        <h1 class="topbar-title">${pageTitle}</h1>
      </div>
      <div class="topbar-actions">
        <div class="badge badge-primary">${school?.name || ''}</div>
        <div style="font-size:0.8rem;color:var(--text-light)">${new Date().toLocaleDateString('ar-EG', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</div>
      </div>
    </div>
  `;

  // Insert before main content
  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
  document.getElementById('topbarContainer').innerHTML = topbarHTML;

  // Initial check for mobile
  const toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  }

  // Footer credit
  const footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;padding:0.5rem;font-size:0.68rem;color:var(--text-light);opacity:0.6;border-top:1px solid var(--border);margin-top:auto;';
  footer.textContent = 'Designed by Eng. Kareem Ali Mousa';
  document.querySelector('.main-content')?.appendChild(footer);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function showSchoolSwitcher() {
  const modal = document.getElementById('schoolSwitcherModal');
  if (modal) modal.classList.remove('hidden');
}

// Handle responsive
window.addEventListener('resize', () => {
  const toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  }
});
