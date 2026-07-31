// ========================================
// SHARED LAYOUT - Sidebar + Topbar
// ========================================

// ── Constants مشتركة في كل الصفحات ──
// أيام الأسبوع الدراسي: الأحد → الخميس (إجازة جمعة وسبت)
const DAYS_AR_W = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

// تحويل رقم اليوم (getDay()) لـ index في DAYS_AR_W
// الأحد=0→0، الاثنين=1→1، ...، الخميس=4→4، الجمعة=5 والسبت=6→ undefined (إجازة)
const SCHOOL_DAY_IDX = { 0:0, 1:1, 2:2, 3:3, 4:4 };

function requireAuth() {
  let session = SESSION.get();

  if (!session && auth.currentUser) {
    const rebuilt = buildSessionFromUser(auth.currentUser);
    if (rebuilt) {
      SESSION.set(rebuilt);
      session = SESSION.get();
    }
  }

  if (!session) {
    auth.onAuthStateChanged(user => {
      if (!user) {
        window.location.href = 'index.html';
        return;
      }
      const rebuilt = buildSessionFromUser(user);
      if (rebuilt) {
        SESSION.set(rebuilt);
        window.location.reload();
      } else {
        // أدمن بدون جلسة (محتاج يختار مدرسة) أو مستخدم غير معروف
        window.location.href = 'index.html';
      }
    });
    return null;
  }

  const school = SESSION.getSchool();
  if (school) applySchoolTheme(school);

  auth.onAuthStateChanged(user => {
    if (!user) {
      SESSION.clear();
      window.location.href = 'index.html';
    }
  });

  return session;
}

/**
 * حماية حسب نوع الصفحة قبل رسم الواجهة
 */
function applyPageGuard(activePage) {
  if (activePage === 'hr') {
    return guardHRPage();
  }
  if (activePage === 'student-affairs') {
    return guardShu2onPage();
  }
  if (activePage === 'contractors') {
    return guardContractorsPage();
  }
  if (activePage === 'edit-student') {
    return guardEditStudentPage();
  }
  if (ACCOUNTING_PAGES.includes(activePage)) {
    return guardAccountingPage();
  }
  return SESSION.get();
}

function renderLayout(activePage, pageTitle) {
  // استعادة الجلسة أولاً ثم حماية الدور
  const session = requireAuth();
  if (!session) return;
  if (!applyPageGuard(activePage)) return;

  const school = SESSION.getSchool();
  const isAdmin = SESSION.isAdmin();
  const isHR = SESSION.isHR();
  const isShu2on = SESSION.isShu2on();
  const isContractors = SESSION.isContractors();
  const userName = escapeHtml(session.name || session.email.split('@')[0]);
  const safeEmail = escapeHtml(session.email);
  const safeSchoolName = escapeHtml(school?.name || 'النظام');
  const safeSchoolLogo = escapeHtml(school?.logo || '');
  const safePageTitle = escapeHtml(pageTitle);

  // ── القائمة الكاملة (للمحاسب والأدمن) ──
  const allNavItems = [
    { id: 'dashboard',        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',                                                                                                                                     label: 'الرئيسية',             href: 'dashboard.html' },
    { id: 'collection',       icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',                                                                                                                                         label: 'تحصيل يومي',           href: 'collection.html' },
    { id: 'student-search',   icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',                                                                                                                                                               label: 'بحث الطلاب',           href: 'student-search.html' },
    { id: 'debts',            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',                label: 'المديونيات',            href: 'debts.html' },
    { id: 'expenses',         icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',                                                                                                                                              label: 'بند المصروفات',         href: 'expenses.html' },
    { id: 'buses',            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',                                                                                 label: 'بند الباصات',           href: 'buses.html' },
    { id: 'contractors',      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',                                                                 label: 'الموردون والمقاولون',   href: 'contractors.html' },
    { id: 'reports',          icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',                                                                                                                       label: 'التقارير والشيتات',     href: 'reports.html' },
    { id: 'analytics',        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',                                                                                                                                                         label: 'تحليل البيانات',        href: 'analytics.html' },
    { id: 'party',            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',                                                                                  label: 'تسجيل الحفلة',          href: 'party.html' },
    { id: 'photo-package',    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',                                                                                                           label: 'باكدج التصوير',         href: 'photo-package.html' },
    { id: 'edit-student',     icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',                                                                                               label: 'تعديل بيانات الطلاب',   href: 'edit-student.html' },
    { id: 'student-affairs',  icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',                                                                           label: 'شئون الطلاب',           href: 'student-affairs.html' },
    { id: 'hr',               icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',                                                                                     label: 'الموارد البشرية',        href: 'hr.html' },
  ];

  // ── فلترة القائمة حسب الـ role ──
  let navItems;
  if (isShu2on) {
    navItems = allNavItems.filter(i => ['student-affairs', 'edit-student'].includes(i.id));
  } else if (isContractors) {
    navItems = allNavItems.filter(i => i.id === 'contractors');
  } else if (isHR) {
    navItems = [];
  } else {
    navItems = allNavItems;
  }

  const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <img class="sidebar-logo" id="school-logo"
          src="${safeSchoolLogo}"
          alt="${safeSchoolName}"
          onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23ffffff33%22/></svg>'"
        />
        <div class="sidebar-school-name" id="school-name">${safeSchoolName}</div>
        <div class="sidebar-user">${safeEmail}</div>
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
            <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M19.07 4.93A10 10 0 0 1 4.93 19.07M19.07 4.93l-3.18 3.18M4.93 19.07l3.18-3.18"/></svg></span>
            <span>إدارة النظام</span>
          </a>
          <div class="nav-item" onclick="showSchoolSwitcher()" style="cursor:pointer">
            <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></span>
            <span>تغيير المدرسة</span>
          </div>
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="user-info-mini">
          <div class="user-avatar">
            ${isAdmin
              ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
              : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
            }
          </div>
          <div class="user-details-mini">
            <div class="user-name-mini">${userName}</div>
            <div class="user-role-mini">${isAdmin ? 'مدير النظام' : isShu2on ? 'شئون الطلاب' : isContractors ? 'الموردون والمقاولون' : isHR ? 'موارد بشرية' : 'محاسب'}</div>
          </div>
        </div>
        <button class="btn btn-outline w-full btn-sm" onclick="logout()" style="justify-content:center">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:6px"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  `;

  const topbarHTML = `
    <div class="topbar">
      <div class="d-flex align-center gap-1">
        <button class="btn btn-icon" id="sidebarToggle" onclick="toggleSidebar()" style="display:none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
        <h1 class="topbar-title">${safePageTitle}</h1>
      </div>
      <div class="topbar-actions">
        <div class="badge badge-primary">${escapeHtml(school?.name || '')}</div>
        <div style="font-size:0.8rem;color:var(--text-light)">${new Date().toLocaleDateString('ar-EG', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
  document.getElementById('topbarContainer').innerHTML = topbarHTML;

  // خلفية إغلاق السايدبار على الموبايل
  if (!document.getElementById('sidebarBackdrop')) {
    const backdrop = document.createElement('div');
    backdrop.id = 'sidebarBackdrop';
    backdrop.className = 'sidebar-backdrop';
    backdrop.addEventListener('click', closeSidebar);
    document.body.appendChild(backdrop);
  }

  markPwaStandalone();
  syncMobileChrome();

  // إغلاق القائمة عند اختيار صفحة على الموبايل
  document.querySelectorAll('.sidebar .nav-item[href]').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  const footer = document.createElement('div');
  footer.style.cssText = 'text-align:center;padding:0.55rem 0.75rem calc(0.55rem + env(safe-area-inset-bottom, 0px));font-size:0.68rem;color:var(--text-light);opacity:0.6;border-top:1px solid var(--border);margin-top:auto;';
  footer.textContent = 'Designed by Eng. Kareem Ali Mousa';
  document.querySelector('.main-content')?.appendChild(footer);

  // PWA: تثبيت إجباري + إشعارات الأدمن
  ensureMohasbaPWA(session);
}

function markPwaStandalone() {
  const standalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || navigator.standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches)
    || /(?:\?|&)source=pwa(?:&|$)/.test(location.search || '');
  document.body.classList.toggle('pwa-standalone', !!standalone);
}

function isMobileLayout() {
  return window.innerWidth <= 900;
}

function syncMobileChrome() {
  const toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.style.display = isMobileLayout() ? 'flex' : 'none';
  }
  if (!isMobileLayout()) closeSidebar();
}

function ensureMohasbaPWA(session) {
  const boot = () => {
    if (window.MohasbaPWA) {
      MohasbaPWA.initAfterAuth(session || SESSION.get());
      return;
    }
    const existing = document.querySelector('script[data-mohasba-pwa]');
    if (existing) {
      existing.addEventListener('load', () => {
        window.MohasbaPWA?.initAfterAuth(session || SESSION.get());
      });
      return;
    }
    const s = document.createElement('script');
    s.src = 'pwa.js?v=2';
    s.dataset.mohasbaPwa = '1';
    s.onload = () => window.MohasbaPWA?.initAfterAuth(session || SESSION.get());
    document.head.appendChild(s);
  };
  boot();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const open = !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', open);
  document.getElementById('sidebarBackdrop')?.classList.toggle('show', open);
  document.body.classList.toggle('sidebar-open', open);
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarBackdrop')?.classList.remove('show');
  document.body.classList.remove('sidebar-open');
}

function showSchoolSwitcher() {
  const modal = document.getElementById('schoolSwitcherModal');
  if (modal) {
    modal.classList.remove('hidden');
  } else {
    window.location.href = 'admin.html';
  }
}

let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    syncMobileChrome();
    markPwaStandalone();
  }, 150);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSidebar();
});
