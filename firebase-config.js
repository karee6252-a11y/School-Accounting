// ========================================
// FIREBASE CONFIGURATION
// ========================================

const firebaseConfig = {
  apiKey: "AIzaSyBI76EQVpd21sgAHKMBmdDCKLJU9s8RrXQ",
  authDomain: "school-accounting-dd351.firebaseapp.com",
  projectId: "school-accounting-dd351",
  storageBucket: "school-accounting-dd351.firebasestorage.app",
  messagingSenderId: "186711273841",
  appId: "1:186711273841:web:d979afcdd091ad207286d0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// بقاء تسجيل الدخول بعد إغلاق الـ PWA/المتصفح (مهم للإشعارات)
try {
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
} catch (_) { /* ignore */ }

// ========================================
// SCHOOLS — 4 مدارس
// ========================================
const SCHOOLS = {
  bristol: {
    id: "bristol",
    name: "Bristol Language School",
    nameEn: "Bristol Language School",
    primaryColor: "#1e2d5a",
    secondaryColor: "#4a6fa5",
    accentColor: "#e8ecf5",
    logo: "Bristol.jpeg",
    users: [
      "acc1.bristol@bristol-school.com",
      "acc2.bristol@bristol-school.com"
    ],
    hrUsers: [
      "hr@bristol-school.com",
      "hr2@bristol-school.com"
    ],
    shu2onUsers: [
      "shu2on@bristol-school.com",
      "shu2on2@bristol-school.com",
      "shu2on3@bristol-school.com",
      "shu2on4@bristol-school.com"
    ],
    contractorsUsers: [
      "contractors@bristol-school.com"
    ]
  },
  cardiff: {
    id: "cardiff",
    name: "Cardiff International School",
    nameEn: "Cardiff International School",
    primaryColor: "#6b1a1a",
    secondaryColor: "#a05050",
    accentColor: "#f5eaea",
    logo: "cis.jpeg",
    users: [
      "acc1.cardiff@cardiff-school.com",
      "acc2.cardiff@cardiff-school.com"
    ],
    hrUsers: [
      "hr@cardiff-school.com",
      "hr2@cardiff-school.com"
    ],
    shu2onUsers: [
      "shu2on@cardiff-school.com",
      "shu2on2@cardiff-school.com",
      "shu2on3@cardiff-school.com",
      "shu2on4@cardiff-school.com"
    ],
    contractorsUsers: [
      "contractors@cardiff-school.com"
    ]
  },
  stanford1: {
    id: "stanford1",
    name: "Stanford Language School 1",
    nameEn: "Stanford Language School 1",
    primaryColor: "#1a1a1a",
    secondaryColor: "#d4a017",
    accentColor: "#fdf8e8",
    logo: "stanford.jpeg",
    users: [
      "acc1.stanford1@stanford-school.com",
      "acc2.stanford1@stanford-school.com"
    ],
    hrUsers: [
      "hr@stanford1-school.com",
      "hr2@stanford1-school.com"
    ],
    shu2onUsers: [
      "shu2on@stanford1-school.com",
      "shu2on2@stanford1-school.com",
      "shu2on3@stanford1-school.com",
      "shu2on4@stanford1-school.com"
    ],
    contractorsUsers: [
      "contractors@stanford1-school.com"
    ]
  },
  stanford2: {
    id: "stanford2",
    name: "Stanford Language School 2",
    nameEn: "Stanford Language School 2",
    primaryColor: "#1a1a1a",
    secondaryColor: "#d4a017",
    accentColor: "#fdf8e8",
    logo: "stanford.jpeg",
    users: [
      "acc1.stanford2@stanford-school.com",
      "acc2.stanford2@stanford-school.com"
    ],
    hrUsers: [
      "hr@stanford2-school.com",
      "hr2@stanford2-school.com"
    ],
    shu2onUsers: [
      "shu2on@stanford2-school.com",
      "shu2on2@stanford2-school.com",
      "shu2on3@stanford2-school.com",
      "shu2on4@stanford2-school.com"
    ],
    contractorsUsers: [
      "contractors@stanford2-school.com"
    ]
  }
};

// ========================================
// ADMINS
// ========================================
const ADMINS = [
  "admin@schools-system.com",
  "admin2@schools-system.com"
];

// ========================================
// ROUTE PROTECTION
// ─────────────────────────────────────────
// صفحات المحاسبة — HR و shu2on ممنوع يدخلوا عليها
// ========================================
const ACCOUNTING_PAGES = [
  'dashboard', 'collection', 'student-search', 'debts',
  'expenses', 'buses', 'reports', 'analytics',
  'party', 'photo-package', 'admin', 'accounts'
];

/**
 * بناء جلسة من مستخدم Firebase (لو التخزين اتمسح والـ Auth لسه شغّال)
 */
function buildSessionFromUser(user) {
  if (!user || !user.email) return null;
  const email = user.email;
  if (ADMINS.includes(email)) {
    let schoolId = null;
    try { schoolId = localStorage.getItem('remembered_school'); } catch (_) { /* ignore */ }
    if (!schoolId || !SCHOOLS[schoolId]) schoolId = Object.keys(SCHOOLS)[0];
    return {
      uid: user.uid,
      email,
      role: 'admin',
      schoolId,
      name: 'مدير النظام'
    };
  }
  const school = Object.values(SCHOOLS).find(sc =>
    sc.users.includes(email) ||
    sc.hrUsers?.includes(email) ||
    sc.shu2onUsers?.includes(email) ||
    sc.contractorsUsers?.includes(email)
  );
  if (!school) return null;
  let role = 'accountant';
  if (school.hrUsers?.includes(email)) role = 'hr';
  else if (school.shu2onUsers?.includes(email)) role = 'shu2on';
  else if (school.contractorsUsers?.includes(email)) role = 'contractors';
  return {
    uid: user.uid,
    email,
    role,
    schoolId: school.id,
    schoolName: school.name,
    name: email.split('@')[0]
  };
}

/**
 * استدعِ الدالة دي في أول كل صفحة محاسبة
 * لو الـ session بتاعها HR → يتحول لصفحة الـ HR
 * لو الـ session بتاعها shu2on → يتحول لصفحة شئون الطلاب
 * لو الـ session بتاعها contractors → يتحول لصفحة المقاولات فقط
 */
function guardAccountingPage() {
  const session = SESSION.get();
  if (!session) { window.location.href = 'index.html'; return null; }
  if (session.role === 'hr') {
    window.location.href = 'hr.html';
    return null;
  }
  if (session.role === 'shu2on') {
    window.location.href = 'student-affairs.html';
    return null;
  }
  if (session.role === 'contractors') {
    window.location.href = 'contractors.html';
    return null;
  }
  auth.onAuthStateChanged(user => {
    if (!user) { SESSION.clear(); window.location.href = 'index.html'; }
    else {
      const s = SESSION.get();
      if (!s) { window.location.href = 'index.html'; return; }
      if (s.role === 'hr') window.location.href = 'hr.html';
      if (s.role === 'shu2on') window.location.href = 'student-affairs.html';
      if (s.role === 'contractors') window.location.href = 'contractors.html';
    }
  });
  return session;
}

/** تعديل بيانات الطلاب — محاسب / أدمن / شئون طلاب */
function guardEditStudentPage() {
  const session = SESSION.get();
  if (!session) { window.location.href = 'index.html'; return null; }
  if (session.role === 'hr') {
    window.location.href = 'hr.html';
    return null;
  }
  if (session.role === 'contractors') {
    window.location.href = 'contractors.html';
    return null;
  }
  auth.onAuthStateChanged(user => {
    if (!user) { SESSION.clear(); window.location.href = 'index.html'; }
  });
  return session;
}

/**
 * استدعِ الدالة دي في صفحة hr.html
 * لو الـ session مش HR أو Admin → يتحول لـ index
 */
function guardHRPage() {
  const session = SESSION.get();
  if (!session) { window.location.href = 'index.html'; return null; }
  if (session.role !== 'hr' && session.role !== 'admin') {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

/**
 * استدعِ الدالة دي في صفحة student-affairs.html
 * بس شئون الطلاب والـ Admin يدخلوا — أي حد تاني يتحول لـ index
 */
function guardShu2onPage() {
  const session = SESSION.get();
  if (!session) { window.location.href = 'index.html'; return null; }
  // سمح لـ: shu2on + admin + محاسب
  const isKnownAccountant = Object.values(SCHOOLS).some(sc => sc.users.includes(session.email));
  const isKnownAdmin      = ADMINS.includes(session.email);
  if (session.role !== 'shu2on' && !isKnownAdmin && !isKnownAccountant) {
    window.location.href = 'index.html';
    return null;
  }
  const school = SESSION.getSchool();
  if (school) applySchoolTheme(school);
  auth.onAuthStateChanged(user => {
    if (!user) { SESSION.clear(); window.location.href = 'index.html'; }
  });
  return session;
}

/**
 * استدعِ الدالة دي في صفحة contractors.html
 * بس حساب المقاولات + المحاسب + الأدمن يدخلوا — أي حد تاني يتحول لـ index
 */
function guardContractorsPage() {
  const session = SESSION.get();
  if (!session) { window.location.href = 'index.html'; return null; }
  // سمح لـ: contractors + admin + محاسب
  const isKnownAccountant = Object.values(SCHOOLS).some(sc => sc.users.includes(session.email));
  const isKnownAdmin      = ADMINS.includes(session.email);
  if (session.role !== 'contractors' && !isKnownAdmin && !isKnownAccountant) {
    window.location.href = 'index.html';
    return null;
  }
  const school = SESSION.getSchool();
  if (school) applySchoolTheme(school);
  auth.onAuthStateChanged(user => {
    if (!user) { SESSION.clear(); window.location.href = 'index.html'; }
  });
  return session;
}

// ========================================
// STAGES & PRICING
// ========================================
const STAGES = {
  "pre_kg": {
    label: "Pre-KG",
    labelAr: "ما قبل الروضة",
    grades: ["Pre-KG"],
    prices: {
      "مصروفات دراسية": 26000,
      "مصروفات - قسط 1": 0,
      "مصروفات - قسط 2": 0,
      "باص": 0,
      "يونيفورم": 4000,
      "فايل": 450,
      "أبليكيشن": 700,
      "رحلات": 0,
      "امتحانات": 0,
      "إيرادات أخرى": 0
    }
  },
  "kg": {
    label: "KG",
    labelAr: "الروضة",
    grades: ["KG1", "KG2"],
    prices: {
      "مصروفات دراسية": 30500,
      "مصروفات - قسط 1": 17550,
      "مصروفات - قسط 2": 12950,
      "باص": 0,
      "يونيفورم": 4000,
      "فايل": 450,
      "أبليكيشن": 700,
      "رحلات": 0,
      "امتحانات": 0,
      "إيرادات أخرى": 0
    }
  },
  "grade": {
    label: "Grade",
    labelAr: "الابتدائي",
    grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"],
    prices: {
      "مصروفات دراسية": 31500,
      "مصروفات - قسط 1": 18050,
      "مصروفات - قسط 2": 13450,
      "باص": 0,
      "يونيفورم": 4500,
      "فايل": 450,
      "أبليكيشن": 700,
      "رحلات": 0,
      "امتحانات": 0,
      "إيرادات أخرى": 0
    }
  },
  "prep": {
    label: "Prep",
    labelAr: "الإعدادي",
    grades: ["Prep 1", "Prep 2", "Prep 3"],
    prices: {
      "مصروفات دراسية": 32500,
      "مصروفات - قسط 1": 18250,
      "مصروفات - قسط 2": 14250,
      "باص": 0,
      "يونيفورم": 4800,
      "فايل": 450,
      "أبليكيشن": 700,
      "رحلات": 0,
      "امتحانات": 0,
      "إيرادات أخرى": 0
    }
  }
};

// ========================================
// CARDIFF STAGES & PRICING
// ========================================
const CARDIFF_STAGES = {
  "international": {
    label: "American Section",
    labelAr: "American Section",
    grades: ["KG1", "KG2", "Grade 1", "Grade 2", "Grade 3", "Grade 10", "Grade 11"],
    installments: 3,
    fees: {
      "أبليكيشن": 1200,
      "فايل": 650
    },
    gradeFees: {
      "KG1":      { total: 63200, inst1: 25000, inst2: 20000, inst3: 18200 },
      "KG2":      { total: 64700, inst1: 25000, inst2: 20000, inst3: 19700 },
      "Grade 1":  { total: 71300, inst1: 30000, inst2: 25000, inst3: 16300 },
      "Grade 2":  { total: 72600, inst1: 30000, inst2: 25000, inst3: 17600 },
      "Grade 3":  { total: 72800, inst1: 30000, inst2: 25000, inst3: 17800 },
      "Grade 10": { total: 74800, inst1: 30000, inst2: 25000, inst3: 19800 },
      "Grade 11": { total: 75300, inst1: 30000, inst2: 25000, inst3: 20300 }
    },
    otherPrices: {
      "باص": 9000,
      "يونيفورم": 4500,
      "امتحانات": 1200,
      "رحلات": 0,
      "سمر كورس": 4000
    }
  },
  "semi_international": {
    label: "Semi-International",
    labelAr: "سيمي إنترناشونال",
    grades: ["KG1", "KG2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Prep 1"],
    installments: 2,
    paymentTypes: [
      { value: "normal", label: "دفعة عادية" },
      { value: "golden", label: "دفعة ذهبية" }
    ],
    fees: {
      normal:  { "أبليكيشن": 800, "فايل": 450 },
      golden:  { "أبليكيشن": 800, "فايل": 450 }
    },
    gradeFees: {
      normal: {
        "KG":    { total: 35750, inst1: 20000, inst2: 15750 },
        "Grade": { total: 36400, inst1: 20000, inst2: 16400 }
      },
      golden: {
        "KG":    { total: 34935, inst1: 20000, inst2: 14935 },
        "Grade": { total: 35650, inst1: 20000, inst2: 15650 }
      }
    },
    getGradeGroup: (grade) => {
      return (grade === "KG1" || grade === "KG2") ? "KG" : "Grade";
    },
    otherPrices: {
      "باص": 8000,
      "يونيفورم": 4500,
      "امتحانات": 1000,
      "رحلات": 0,
      "سمر كورس": 4000
    },
    uniformByGrade: (grade) => {
      return (grade && grade.startsWith("Prep")) ? 4800 : 4500;
    }
  }
};

const PAYMENT_TYPES = [
  { value: "cash",          label: "نقدي",       icon: "" },
  { value: "bank_transfer", label: "تحويل بنكي", icon: "" },
  { value: "check",         label: "شيك",         icon: "" },
  { value: "instapay",      label: "إنستاباي",    icon: "" }
];

const PAYMENT_ITEMS = [
  "مصروفات دراسية",
  "مصروفات - قسط 1",
  "مصروفات - قسط 2",
  "باص",
  "يونيفورم",
  "فايل",
  "أبليكيشن",
  "رحلات",
  "امتحانات",
  "إيرادات أخرى"
];

// ========================================
// ACADEMIC YEAR
// ========================================
function getAcademicYear(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 7) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

const _currentAcademicYearData = (() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 7) {
    return { label: `${year}/${year + 1}`, start: `${year}-07-01` };
  }
  return { label: `${year - 1}/${year}`, start: `${year - 1}-07-01` };
})();

// مصدر واحد للسنة الدراسية الحالية (يوليو → يونيو)
const ACADEMIC_YEAR       = _currentAcademicYearData.label;
const ACADEMIC_YEAR_START = _currentAcademicYearData.start;

// ========================================
// SESSION MANAGEMENT
// ========================================
const SESSION_KEY = 'school_session';
const SESSION_PERSIST_KEY = 'school_session_persist';

const SESSION = {
  _readRaw: () => {
    try {
      return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    } catch (_) {
      return null;
    }
  },
  _writeRaw: (json, persist) => {
    try { sessionStorage.setItem(SESSION_KEY, json); } catch (_) { /* ignore */ }
    try {
      if (persist) {
        localStorage.setItem(SESSION_KEY, json);
        localStorage.setItem(SESSION_PERSIST_KEY, '1');
      } else {
        // لو تذكرني مقفول: امسح النسخة الدائمة فقط
        localStorage.removeItem(SESSION_KEY);
        localStorage.setItem(SESSION_PERSIST_KEY, '0');
      }
    } catch (_) { /* ignore */ }
  },
  shouldPersist: () => {
    try {
      const flag = localStorage.getItem(SESSION_PERSIST_KEY);
      if (flag === '0') return false;
      // افتراضي: نعم (مهم للـ PWA والإشعارات)
      return true;
    } catch (_) {
      return true;
    }
  },
  get: () => {
    try {
      const raw = SESSION._readRaw();
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.uid || !s.email || !s.role) return null;

      const isKnownAdmin       = ADMINS.includes(s.email);
      const isKnownAccountant  = Object.values(SCHOOLS).some(sc => sc.users.includes(s.email));
      const isKnownHR          = Object.values(SCHOOLS).some(sc => sc.hrUsers?.includes(s.email));
      const isKnownShu2on      = Object.values(SCHOOLS).some(sc => sc.shu2onUsers?.includes(s.email));
      const isKnownContractors = Object.values(SCHOOLS).some(sc => sc.contractorsUsers?.includes(s.email));

      if (!isKnownAdmin && !isKnownAccountant && !isKnownHR && !isKnownShu2on && !isKnownContractors) {
        SESSION.clear();
        return null;
      }

      if (!SCHOOLS[s.schoolId]) {
        SESSION.clear();
        return null;
      }

      // تحقق: المحاسب أو HR أو shu2on لازم يكون مصرح له بمدرسته فقط
      if (!isKnownAdmin) {
        const allowedSchool = Object.values(SCHOOLS).find(sc =>
          sc.users.includes(s.email) ||
          sc.hrUsers?.includes(s.email) ||
          sc.shu2onUsers?.includes(s.email) ||
          sc.contractorsUsers?.includes(s.email)
        );
        if (!allowedSchool || allowedSchool.id !== s.schoolId) {
          SESSION.clear();
          return null;
        }
      }

      // زامن النسخة في sessionStorage لو جاية من localStorage
      try { sessionStorage.setItem(SESSION_KEY, raw); } catch (_) { /* ignore */ }
      return s;
    } catch (e) {
      SESSION.clear();
      return null;
    }
  },
  set: (data, opts = {}) => {
    if (!data || !data.uid || !data.email || !data.role || !data.schoolId) {
      console.error('SESSION.set: بيانات ناقصة', data);
      return;
    }
    const persist = opts.persist !== undefined ? !!opts.persist : SESSION.shouldPersist();
    SESSION._writeRaw(JSON.stringify(data), persist);
  },
  clear: () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) { /* ignore */ }
    try { localStorage.removeItem(SESSION_KEY); } catch (_) { /* ignore */ }
  },
  isAdmin: () => {
    const s = SESSION.get();
    return !!(s && ADMINS.includes(s.email));
  },
  isHR: () => {
    const s = SESSION.get();
    return s && s.role === 'hr';
  },
  isShu2on: () => {
    const s = SESSION.get();
    return s && s.role === 'shu2on';
  },
  isContractors: () => {
    const s = SESSION.get();
    return s && s.role === 'contractors';
  },
  getSchool: () => {
    const s = SESSION.get();
    if (!s) return null;
    return SCHOOLS[s.schoolId];
  }
};

// ========================================
// HELPERS
// ========================================
function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0
  }).format(amount);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
}

function localDateStr(d) {
  const date = d || new Date();
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

/** تهريب نص قبل إدخاله في innerHTML */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applySchoolTheme(school) {
  document.documentElement.style.setProperty('--primary',   school.primaryColor);
  document.documentElement.style.setProperty('--secondary', school.secondaryColor);
  document.documentElement.style.setProperty('--accent',    school.accentColor);
  const logoEl = document.getElementById('school-logo');
  if (logoEl) logoEl.src = school.logo;
  const nameEl = document.getElementById('school-name');
  if (nameEl) nameEl.textContent = school.name;
}

function logout() {
  auth.signOut().then(() => {
    SESSION.clear();
    try { localStorage.setItem(SESSION_PERSIST_KEY, '0'); } catch (_) { /* ignore */ }
    window.location.href = 'index.html';
  });
}

/**
 * إشعار الأدمن بأي نشاط من المحاسب / الموظفين (ما عدا الأدمن نفسه)
 * Firestore adminAlerts + Web Push
 * ملاحظة: بيتنادى فقط بعد حفظ/تعديل/حذف عملية — مش عند فتح الصفحات
 */
const _adminNotifyCooldown = new Map();

function _isActorAdmin(session) {
  if (!session) return false;
  if (session.role === 'admin') return true;
  if (typeof ADMINS !== 'undefined' && ADMINS.includes(session.email)) return true;
  if (typeof SESSION !== 'undefined' && SESSION.isAdmin && SESSION.isAdmin()) return true;
  return false;
}

function _notifyCooldownOk(key, ms = 2500) {
  const now = Date.now();
  if ((_adminNotifyCooldown.get(key) || 0) + ms > now) return false;
  _adminNotifyCooldown.set(key, now);
  return true;
}

async function notifyAdmins(info = {}) {
  const session = (typeof SESSION !== 'undefined' && SESSION.get) ? SESSION.get() : null;
  // الأدمن وهو شغّال مش هيبعت لنفسه أبداً
  if (_isActorAdmin(session)) return;
  if (!session) return;

  const school = (typeof SESSION !== 'undefined' && SESSION.getSchool) ? SESSION.getSchool() : null;
  const schoolName = info.schoolName || school?.name || '';
  const schoolId = info.schoolId || session?.schoolId || '';
  const createdBy = info.createdBy || session?.email || '';
  const action = info.action || info.type || 'نشاط';
  const title = String(info.title || `${action} — ${schoolName}`).slice(0, 120);
  const body = String(info.body || `${action} بواسطة ${createdBy}`).slice(0, 300);
  const url = info.url || '/admin.html';
  const type = info.type || 'activity';

  const coolKey = `${type}|${action}|${createdBy}|${body}`;
  if (!_notifyCooldownOk(coolKey)) return;

  try {
    await db.collection('adminAlerts').add({
      type,
      action,
      title,
      body,
      url,
      schoolId,
      schoolName,
      createdBy,
      meta: info.meta || null,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn('[notify] alert write failed', e);
  }

  try {
    const snap = await db.collection('adminPushSubs').get();
    const subscriptions = [];
    snap.forEach((doc) => {
      const d = doc.data() || {};
      const sub = d.subscription;
      if (!sub || !sub.endpoint) return;
      // الاشتراكات للأدمن فقط — ومتبعتش لنفس الفاعل
      if (!d.email || d.email === createdBy) return;
      if (typeof ADMINS !== 'undefined' && !ADMINS.includes(d.email)) return;
      // فلتر حسب المدرسة: الاشتراك لازم يكون للمدرسة دي أو لكل المدارس
      const ids = Array.isArray(d.schoolIds) ? d.schoolIds : (d.schoolId ? [d.schoolId] : ['*']);
      const matchSchool = !schoolId
        || ids.includes('*')
        || ids.includes('all')
        || ids.includes(schoolId);
      if (!matchSchool) return;
      subscriptions.push(sub);
    });
    if (!subscriptions.length) return;

    await fetch('/api/notify-admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url, schoolId, subscriptions }),
    });
  } catch (e) {
    console.warn('[notify] push send failed', e);
  }
}

/** اختصار سريع من أي صفحة بعد حفظ/تعديل/حذف فقط */
function notifyAdminActivity(action, details = '', opts = {}) {
  const session = (typeof SESSION !== 'undefined' && SESSION.get) ? SESSION.get() : null;
  if (!session || _isActorAdmin(session)) return Promise.resolve();

  const school = SESSION.getSchool ? SESSION.getSchool() : null;
  const schoolName = school?.name || '';
  const detailTxt = details ? String(details) : '';
  // العنوان: العملية + المدرسة | النص: المدرسة ثم البيان ثم المحاسب
  const title = opts.title || `${action} — ${schoolName}`;
  const body = opts.body || [schoolName, detailTxt, session.email].filter(Boolean).join(' — ');

  return notifyAdmins({
    type: opts.type || 'activity',
    action,
    title,
    body,
    url: opts.url || '/admin.html',
    schoolId: session.schoolId,
    schoolName,
    createdBy: session.email,
    meta: opts.meta || { details: detailTxt },
  }).catch((e) => console.warn('[notify]', e));
}

/** تحصيل يومي جديد — اسم المدرسة + البيان (البند/الطالب/المبلغ) */
async function notifyAdminsOfPayment(info) {
  const schoolName = info.schoolName || '';
  const amountTxt = formatCurrency(info.amount || 0);
  const bayan = info.paymentItem || info.notes || 'تحصيل';
  const student = info.studentName || '';
  return notifyAdmins({
    type: 'collection',
    action: 'تحصيل جديد',
    title: `تحصيل جديد — ${schoolName}`,
    body: [
      schoolName,
      student ? `الطالب: ${student}` : '',
      `البيان: ${bayan}`,
      amountTxt,
      info.paymentTypeName || info.paymentType || '',
      info.createdBy || ''
    ].filter(Boolean).join(' — '),
    url: '/collection.html',
    schoolId: info.schoolId,
    schoolName,
    createdBy: info.createdBy,
    meta: info,
  });
}

/** مصروف جديد — اسم المدرسة + البيان + المستلم + المبلغ */
async function notifyAdminsOfExpense(info) {
  const session = (typeof SESSION !== 'undefined' && SESSION.get) ? SESSION.get() : null;
  if (_isActorAdmin(session)) return;

  const school = (typeof SESSION !== 'undefined' && SESSION.getSchool) ? SESSION.getSchool() : null;
  const schoolName = info.schoolName || school?.name || '';
  const schoolId = info.schoolId || session?.schoolId || '';
  const amountTxt = formatCurrency(info.amount || 0);
  const bayan = info.bayan || info.categoryLabel || info.customLabel || info.notes || 'مصروف';
  const recipient = info.recipientName || '';
  const action = info.action || 'مصروف جديد';

  return notifyAdmins({
    type: info.type || 'expense',
    action,
    title: `${action} — ${schoolName}`,
    body: [
      schoolName,
      recipient ? `المستلم: ${recipient}` : '',
      `البيان: ${bayan}`,
      amountTxt,
      info.notes && info.notes !== bayan ? `ملاحظات: ${info.notes}` : '',
      info.createdBy || session?.email || ''
    ].filter(Boolean).join(' — '),
    url: info.url || '/expenses.html',
    schoolId,
    schoolName,
    createdBy: info.createdBy || session?.email || '',
    meta: info,
  });
}
