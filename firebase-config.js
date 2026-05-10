// ========================================
// FIREBASE CONFIGURATION
//  الخطوة الوحيدة: استبدل القيم دي ببيانات مشروعك على Firebase
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
// SCHOOLS — 4 مدارس جاهزة
// الألوان مستخرجة من اللوجوهات
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
// STAGES & PRICING
// ========================================
const STAGES = {
  "pre_kg": {
    label: "Pre-KG",
    labelAr: "ما قبل الروضة",
    grades: ["Pre-KG"],
    prices: {
      "مصروفات دراسية": 15000,
      "باص": 8000,
      "يونيفورم": 2500,
      "فايل": 500,
      "أبليكيشن": 1000,
      "امتحانات": 800
    }
  },
  "kg": {
    label: "KG",
    labelAr: "الروضة",
    grades: ["KG1", "KG2"],
    prices: {
      "مصروفات دراسية": 18000,
      "باص": 8000,
      "يونيفورم": 2500,
      "فايل": 600,
      "أبليكيشن": 1000,
      "امتحانات": 1000
    }
  },
  "grade": {
    label: "Grade",
    labelAr: "الابتدائي",
    grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"],
    prices: {
      "مصروفات دراسية": 22000,
      "باص": 9000,
      "يونيفورم": 3000,
      "فايل": 700,
      "أبليكيشن": 1200,
      "امتحانات": 1200
    }
  },
  "prep": {
    label: "Prep",
    labelAr: "الإعدادي",
    grades: ["Prep 1", "Prep 2", "Prep 3"],
    prices: {
      "مصروفات دراسية": 26000,
      "باص": 10000,
      "يونيفورم": 3500,
      "فايل": 800,
      "أبليكيشن": 1500,
      "امتحانات": 1500
    }
  }
};

// ========================================
// CARDIFF STAGES & PRICING (خاص بـ Cardiff فقط)
// المصروفات الدراسية مقسمة لأقساط حسب الـ PDF
// American Section  → 3 أقساط  | Semi-International → قسطين
// ========================================
const CARDIFF_STAGES = {
  "international": {
    label: "American Section",
    labelAr: "American Section",
    grades: ["KG1", "KG2", "Grade 1", "Grade 2", "Grade 3", "Grade 10", "Grade 11"],
    installments: 3,
    // أبليكيشن وفايل موحدان لكل الصفوف
    fees: {
      "أبليكيشن": 1200,
      "فايل": 650
    },
    // المصروفات الدراسية لكل grade: { total, inst1, inst2, inst3 }
    gradeFees: {
      "KG1":      { total: 63200, inst1: 25000, inst2: 20000, inst3: 18200 },
      "KG2":      { total: 64700, inst1: 25000, inst2: 20000, inst3: 19700 },
      "Grade 1":  { total: 71300, inst1: 30000, inst2: 25000, inst3: 16300 },
      "Grade 2":  { total: 72600, inst1: 30000, inst2: 25000, inst3: 17600 },
      "Grade 3":  { total: 72800, inst1: 30000, inst2: 25000, inst3: 17800 },
      "Grade 10": { total: 74800, inst1: 30000, inst2: 25000, inst3: 19800 },
      "Grade 11": { total: 75300, inst1: 30000, inst2: 25000, inst3: 20300 }
    },
    // الأسعار الموحدة للبنود الأخرى (باص، يونيفورم...)
    otherPrices: {
      "باص": 9000,
      "يونيفورم": 3000,
      "امتحانات": 1200,
      "رحلات": 0
    }
  },
  "semi_international": {
    label: "Semi-International",
    labelAr: "سيمي إنترناشونال",
    grades: ["KG1", "KG2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"],
    installments: 2,
    paymentTypes: [
      { value: "normal", label: "دفعة عادية" },
      { value: "golden", label: "دفعة ذهبية" }
    ],
    fees: {
      normal:  { "أبليكيشن": 800, "فايل": 450 },
      golden:  { "أبليكيشن": 800, "فايل": 450 }
    },
    // المصروفات حسب المرحلة (KG أو Grade) والنوع
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
    // helper: يرجع "KG" أو "Grade" بناءً على اسم الصف
    getGradeGroup: (grade) => {
      return (grade === "KG1" || grade === "KG2") ? "KG" : "Grade";
    },
    otherPrices: {
      "باص": 8000,
      "يونيفورم": 2500,
      "امتحانات": 1000,
      "رحلات": 0
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
  "باص",
  "يونيفورم",
  "فايل",
  "أبليكيشن",
  "رحلات",
  "امتحانات"
];

// ========================================
// ACADEMIC YEAR - starts 1/7 each year
// Current year: 2026/2027
// ========================================
const ACADEMIC_YEAR = '2026/2027';
const ACADEMIC_YEAR_START = '2026-07-01'; // 1 July 2026

function getAcademicYear(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  if (month >= 7) return `${year}/${year+1}`;
  return `${year-1}/${year}`;
}

// ========================================
// SESSION MANAGEMENT
// ========================================
const SESSION = {
  get: () => JSON.parse(sessionStorage.getItem('school_session') || 'null'),
  set: (data) => sessionStorage.setItem('school_session', JSON.stringify(data)),
  clear: () => sessionStorage.removeItem('school_session'),
  isAdmin: () => {
    const s = SESSION.get();
    return s && ADMINS.includes(s.email);
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

// ========================================
// LOCAL DATE HELPER — بيرجع التاريخ بالتوقيت المحلي مش UTC
// ========================================
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
