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
  'dashboard.html','collection.html','student-search.html','debts.html',
  'expenses.html','buses.html','contractors.html','reports.html',
  'party.html','photo-package.html','admin.html','ACCOUNTS.html'
];

// صفحات الـ HR — المحاسب ممنوع يدخل عليها
const HR_PAGES = ['hr.html'];

// صفحات شئون الطلاب — المحاسب والـ HR ممنوع يدخلوا عليها مباشرة
const SHU2ON_PAGES = ['student-affairs.html'];

/**
 * استدعِ الدالة دي في أول كل صفحة محاسبة
 * لو الـ session بتاعها HR → يتحول لصفحة الـ HR
 * لو الـ session بتاعها shu2on → يتحول لصفحة شئون الطلاب
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
  auth.onAuthStateChanged(user => {
    if (!user) { SESSION.clear(); window.location.href = 'index.html'; }
    else {
      const s = SESSION.get();
      if (!s) { window.location.href = 'index.html'; return; }
      if (s.role === 'hr') window.location.href = 'hr.html';
      if (s.role === 'shu2on') window.location.href = 'student-affairs.html';
    }
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
      "رحلات": 0
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
      "رحلات": 0
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

// السنة الدراسية مثبّتة يدوياً — تُحدَّث كل عام في يوليو
const ACADEMIC_YEAR       = '2025/2026';
const ACADEMIC_YEAR_START = '2025-07-01';

// ========================================
// SESSION MANAGEMENT
// ========================================
const SESSION = {
  get: () => {
    try {
      const raw = sessionStorage.getItem('school_session');
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.uid || !s.email || !s.role) return null;

      const isKnownAdmin      = ADMINS.includes(s.email);
      const isKnownAccountant = Object.values(SCHOOLS).some(sc => sc.users.includes(s.email));
      const isKnownHR         = Object.values(SCHOOLS).some(sc => sc.hrUsers?.includes(s.email));
      const isKnownShu2on     = Object.values(SCHOOLS).some(sc => sc.shu2onUsers?.includes(s.email));

      if (!isKnownAdmin && !isKnownAccountant && !isKnownHR && !isKnownShu2on) {
        sessionStorage.removeItem('school_session');
        return null;
      }

      if (!SCHOOLS[s.schoolId]) {
        sessionStorage.removeItem('school_session');
        return null;
      }

      // تحقق: المحاسب أو HR أو shu2on لازم يكون مصرح له بمدرسته فقط
      if (!isKnownAdmin) {
        const allowedSchool = Object.values(SCHOOLS).find(sc =>
          sc.users.includes(s.email) ||
          sc.hrUsers?.includes(s.email) ||
          sc.shu2onUsers?.includes(s.email)
        );
        if (!allowedSchool || allowedSchool.id !== s.schoolId) {
          sessionStorage.removeItem('school_session');
          return null;
        }
      }

      return s;
    } catch (e) {
      sessionStorage.removeItem('school_session');
      return null;
    }
  },
  set: (data) => {
    if (!data || !data.uid || !data.email || !data.role || !data.schoolId) {
      console.error('SESSION.set: بيانات ناقصة', data);
      return;
    }
    sessionStorage.setItem('school_session', JSON.stringify(data));
  },
  clear: () => sessionStorage.removeItem('school_session'),
  isAdmin: () => {
    const s = SESSION.get();
    return s && ADMINS.includes(s.email);
  },
  isHR: () => {
    const s = SESSION.get();
    return s && s.role === 'hr';
  },
  isShu2on: () => {
    const s = SESSION.get();
    return s && s.role === 'shu2on';
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
    window.location.href = 'index.html';
  });
}
