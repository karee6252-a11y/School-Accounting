// ============================================================
//  PWA — تثبيت إجباري (موبايل) + إشعارات الأدمن
//  بنفس أسلوب منصة LMS
// ============================================================

// لازم على window — const/let مش بيتشافوا من layout.js كـ window.MohasbaPWA
window.MohasbaPWA = {
  _deferredInstall: null,
  _onboardingRunning: false,
  _alertUnsub: null,
  _seenAlertIds: new Set(),
  VAPID_PUBLIC_KEY: 'BCl2Kb31KJmksbbAPja0sRpG_To-ad8kQL80q2rj6lfoC1WBaP26sj-_7sQAjJaG4gOD5IkzzNMaMfQ-sCEA8Cg',

  init() {
    this.injectStyles();
    this.registerSW();
    this.setupInstallCapture();
    if (this.isMobileDevice() && !this.isStandalone()) {
      setTimeout(() => this.runMobileOnboarding(), 500);
    }
  },

  /** بعد تسجيل الدخول / رسم الواجهة */
  initAfterAuth(session) {
    this.injectStyles();
    this.registerSW();
    this.setupInstallCapture();
    this.mountAdminNotifButton(session);
    // نافذة تفعيل الإشعارات أول ما الأدمن يفتح على الموبايل
    setTimeout(() => this.runMobileOnboarding(session), 350);
  },

  registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(() => {});
  },

  setupInstallCapture() {
    if (this._installBound) return;
    this._installBound = true;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._deferredInstall = e;
      if (this.isMobileDevice() && !this.isStandalone()) {
        const open = document.getElementById('pwa-install-overlay');
        if (open && !open.querySelector('#pwa-install-now')) {
          this._closeOverlay('pwa-install-overlay');
          this.showInstallModal();
        } else if (!open && !this._onboardingRunning) {
          this.runMobileOnboarding();
        }
      }
    });
    window.addEventListener('appinstalled', () => {
      this._deferredInstall = null;
      this._closeOverlay('pwa-install-overlay');
    });
  },

  isMobileDevice() {
    const ua = navigator.userAgent || '';
    const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || touchMac
      || (window.matchMedia && window.matchMedia('(max-width: 900px)').matches && 'ontouchstart' in window);
  },

  isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || navigator.standalone === true
      || (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches)
      || /(?:\?|&)source=pwa(?:&|$)/.test(location.search || '');
  },

  isIOS() {
    const ua = navigator.userAgent || '';
    return /iphone|ipad|ipod/i.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },

  isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  },

  getInstallPlatform() {
    if (this.isIOS()) return 'ios';
    if (this.isAndroid()) return 'android';
    return 'other';
  },

  async runMobileOnboarding(session) {
    if (this._onboardingRunning) return;
    this._onboardingRunning = true;
    try {
      const s = session || (typeof SESSION !== 'undefined' ? SESSION.get() : null);
      const isAdmin = this._isAdminSession(s);
      const onMobile = this.isMobileDevice();
      const alreadyGranted = ('Notification' in window) && Notification.permission === 'granted';

      // 1) الأدمن: لو الإشعارات مفعّلة → اشترك بهدوء من غير توست/إشعار تجريبي
      //    لو لأ → نافذة التفعيل (مرة، مش كل تنقّل)
      if (isAdmin) {
        await new Promise((r) => setTimeout(r, 250));
        if (alreadyGranted) {
          await this.enablePush(s, { quiet: true });
          this.startAdminAlertListener(s);
          this.refreshNotifButtonState();
        } else {
          await this.maybeShowNotificationPrompt(s, true);
        }
      }

      // 2) لو لسه من المتصفح مش من الأيقونة: نافذة التثبيت
      if (onMobile && !this.isStandalone()) {
        if (!this._deferredInstall && this.isAndroid()) {
          await new Promise((r) => setTimeout(r, 400));
        }
        if (!document.getElementById('pwa-notif-overlay')) {
          this.showInstallModal();
        }
      }
    } finally {
      this._onboardingRunning = false;
    }
  },

  /** زر دائم للأدمن — موبايل وكمبيوتر */
  mountAdminNotifButton(session) {
    const s = session || (typeof SESSION !== 'undefined' ? SESSION.get() : null);
    const isAdmin = s && (
      s.role === 'admin'
      || (typeof SESSION !== 'undefined' && SESSION.isAdmin && SESSION.isAdmin())
      || (typeof ADMINS !== 'undefined' && ADMINS.includes(s.email))
    );
    if (!isAdmin) return;

    // الزر بيتبني من layout.js — هنا نحدّث حالته فقط
    let btn = document.getElementById('adminNotifBtn');
    if (!btn) {
      const host = document.querySelector('.topbar-actions') || document.querySelector('.topbar');
      if (!host) {
        setTimeout(() => this.mountAdminNotifButton(s), 400);
        return;
      }
      btn = document.createElement('button');
      btn.id = 'adminNotifBtn';
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-primary';
      btn.style.cssText = 'white-space:nowrap;font-weight:800;min-height:36px;flex-shrink:0';
      btn.textContent = '🔔 تفعيل الإشعارات';
      btn.onclick = () => (typeof openAdminNotifications === 'function'
        ? openAdminNotifications()
        : this.openNotificationCenter(s));
      host.prepend(btn);
    }
    this.refreshNotifButtonState();
  },

  _isAdminSession(session) {
    const s = session || (typeof SESSION !== 'undefined' ? SESSION.get() : null);
    if (!s) return false;
    if (s.role === 'admin') return true;
    if (typeof SESSION !== 'undefined' && SESSION.isAdmin && SESSION.isAdmin()) return true;
    if (typeof ADMINS !== 'undefined' && ADMINS.includes(s.email)) return true;
    return false;
  },

  refreshNotifButtonState() {
    const btn = document.getElementById('adminNotifBtn');
    if (!btn || !('Notification' in window)) return;
    let full = 'تفعيل الإشعارات';
    let short = 'إشعارات';
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');
    if (Notification.permission === 'granted') {
      full = 'الإشعارات مفعّلة';
      short = 'مفعّلة';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
    } else if (Notification.permission === 'denied') {
      full = 'الإشعارات متوقفة';
      short = 'متوقفة';
    }
    const fullEl = btn.querySelector('.notif-label-full');
    const shortEl = btn.querySelector('.notif-label-short');
    if (fullEl && shortEl) {
      fullEl.textContent = full;
      shortEl.textContent = short;
    } else {
      btn.textContent = '🔔 ' + (this.isMobileDevice() ? short : full);
    }
  },

  async openNotificationCenter(session) {
    const s = session || (typeof SESSION !== 'undefined' ? SESSION.get() : null);
    if (!this._isAdminSession(s)) return;
    this.injectStyles();

    if (!('Notification' in window)) {
      alert('المتصفح ده مش بيدعم الإشعارات. جرّب Chrome على أندرويد أو الكمبيوتر، أو Safari من أيقونة التطبيق على الآيفون.');
      return;
    }

    if (this.isIOS() && !this.isStandalone()) {
      alert('على الآيفون: ثبّت التطبيق (إضافة للشاشة الرئيسية) وافتحه من الأيقونة، بعدين اضغط «تفعيل الإشعارات».');
      if (!this.isStandalone()) this.showInstallModal();
      return;
    }

    if (Notification.permission === 'granted') {
      const ok = await this.enablePush(s, { quiet: true });
      this.startAdminAlertListener(s);
      this.refreshNotifButtonState();
      this._toast(ok
        ? 'الإشعارات شغّالة على الجهاز ✓'
        : 'الصلاحية موجودة لكن فشل تسجيل الجهاز — حاول مرة أخرى');
      return;
    }

    await this.maybeShowNotificationPrompt(s, true);
  },

  _toast(msg) {
    let el = document.getElementById('pwa-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pwa-toast';
      el.style.cssText = [
        'position:fixed', 'bottom:1.25rem', 'left:50%', 'transform:translateX(-50%)',
        'background:#1a3a6b', 'color:#fff', 'padding:0.75rem 1.15rem', 'border-radius:12px',
        'font-family:Cairo,sans-serif', 'font-size:0.85rem', 'font-weight:700',
        'z-index:100001', 'box-shadow:0 8px 28px rgba(0,0,0,0.25)', 'max-width:90vw',
        'text-align:center', 'direction:rtl'
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3200);
  },

  showInstallModal() {
    if (this.isStandalone()) return Promise.resolve();
    if (!this.isMobileDevice()) return Promise.resolve();
    if (document.getElementById('pwa-install-overlay')) return Promise.resolve();

    const platform = this.getInstallPlatform();
    const isIOS = platform === 'ios';
    const isAndroid = platform === 'android';
    const hasNativePrompt = !!this._deferredInstall;
    const ua = navigator.userAgent || '';
    const isChromeIOS = /CriOS/i.test(ua);
    const isSamsung = /SamsungBrowser/i.test(ua);

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'pwa-install-overlay';
      overlay.className = 'pwa-onboard-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      const deviceBadge = isIOS
        ? '<span class="pwa-device-badge">iPhone / iPad</span>'
        : isAndroid
          ? '<span class="pwa-device-badge">Android</span>'
          : '<span class="pwa-device-badge">Mobile</span>';

      const shareSvg = `<svg width="18" height="18" viewBox="0 0 50 50" fill="currentColor" style="vertical-align:-3px"><path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"/><path d="M24 7h2v21h-2z"/><path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"/></svg>`;

      const iosSteps = `
        <ol class="pwa-onboard-steps">
          <li><span class="step-num">1</span><span>${isChromeIOS
            ? 'افتح الموقع في <strong>Safari</strong> فقط (Chrome على الآيفون لا يدعم التثبيت)'
            : `اضغط زر <strong>المشاركة</strong> ${shareSvg} أسفل Safari`}</span></li>
          <li><span class="step-num">2</span><span>اختر <strong>إضافة إلى الشاشة الرئيسية</strong></span></li>
          <li><span class="step-num">3</span><span>اضغط <strong>إضافة</strong> ثم افتح التطبيق من الأيقونة</span></li>
        </ol>
        <div class="pwa-onboard-note"><strong>التثبيت إجباري:</strong> لازم تضيف التطبيق وتفتحه من الأيقونة عشان تكمل على الموبايل.</div>`;

      const androidMenu = isSamsung
        ? 'قائمة المتصفح <strong>⋮</strong> أو أيقونة التثبيت'
        : 'قائمة Chrome <strong>⋮</strong>';

      const androidSteps = `
        <ol class="pwa-onboard-steps">
          <li><span class="step-num">1</span><span>افتح ${androidMenu}</span></li>
          <li><span class="step-num">2</span><span>اختر <strong>تثبيت التطبيق</strong> أو <strong>Add to Home screen</strong></span></li>
          <li><span class="step-num">3</span><span>أكّد ثم افتح التطبيق من الشاشة الرئيسية</span></li>
        </ol>
        <div class="pwa-onboard-note"><strong>التثبيت إجباري:</strong> لازم تثبّت التطبيق وتفتحه من الأيقونة عشان تكمل على الموبايل.</div>`;

      const bodyHtml = isIOS
        ? iosSteps
        : (hasNativePrompt
          ? `<p class="pwa-lead">اضغط <strong>تثبيت التطبيق</strong> بالأسفل — مطلوب للمتابعة.</p>${androidSteps}`
          : androidSteps);

      overlay.innerHTML = `
        <div class="pwa-onboard-modal">
          <div class="pwa-onboard-head">
            <img class="pwa-icon-img" src="/icons/icon-192.png" alt="School System" />
            <h3>ثبّت School System للمتابعة</h3>
            <p>${isIOS ? 'مطلوب على الآيفون — Safari' : 'مطلوب على أندرويد — Chrome'}</p>
            ${deviceBadge}
          </div>
          <div class="pwa-onboard-body">
            ${bodyHtml}
            <div class="pwa-onboard-actions">
              ${!isIOS && hasNativePrompt
                ? '<button type="button" class="pwa-btn-primary" id="pwa-install-now">تثبيت التطبيق</button>'
                : ''}
              <button type="button" class="pwa-btn-primary" id="pwa-install-confirm">${
                isIOS ? 'فتحت من الأيقونة' : 'تم التثبيت وفتحت من الأيقونة'
              }</button>
            </div>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      document.body.classList.add('pwa-onboard-lock');

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearInterval(poll);
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onFocus);
        this._closeOverlay('pwa-install-overlay');
        resolve();
      };

      const tryFinishIfInstalled = () => {
        if (this.isStandalone()) finish();
      };

      const showMustInstallTip = (ok) => {
        let tipEl = overlay.querySelector('.pwa-install-tip');
        if (!tipEl) {
          tipEl = document.createElement('p');
          tipEl.className = 'pwa-install-tip';
          overlay.querySelector('.pwa-onboard-note')?.insertAdjacentElement('beforebegin', tipEl)
            || overlay.querySelector('.pwa-onboard-actions')?.insertAdjacentElement('beforebegin', tipEl);
        }
        tipEl.style.color = ok ? '#1F7A4D' : '#B3261E';
        tipEl.textContent = ok
          ? 'تم التثبيت — افتح التطبيق الآن من الشاشة الرئيسية.'
          : (isIOS
            ? 'التثبيت إجباري: أضف من Safari ثم افتح من الأيقونة.'
            : 'التثبيت إجباري: ثبّت من Chrome ثم افتح من الأيقونة.');
      };

      const onFocus = () => tryFinishIfInstalled();
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onFocus);
      const poll = setInterval(tryFinishIfInstalled, 800);

      overlay.querySelector('#pwa-install-now')?.addEventListener('click', async () => {
        if (!this._deferredInstall) return;
        try {
          this._deferredInstall.prompt();
          const choice = await this._deferredInstall.userChoice;
          if (choice.outcome === 'accepted') {
            this._deferredInstall = null;
            showMustInstallTip(true);
            return;
          }
          showMustInstallTip(false);
        } catch {
          showMustInstallTip(false);
        }
      });

      overlay.querySelector('#pwa-install-confirm')?.addEventListener('click', () => {
        if (this.isStandalone()) finish();
        else showMustInstallTip(false);
      });
    });
  },

  async maybeShowNotificationPrompt(session, force = false) {
    if (!this._isAdminSession(session)) return;
    if (document.getElementById('pwa-notif-overlay')) return;

    // لو المستخدم أجّل في نفس الجلسة ومتعملش force من الزر
    try {
      if (!force && sessionStorage.getItem('mohasba_notif_later') === '1') return;
    } catch (_) { /* ignore */ }

    const iosNeedsInstall = this.isIOS() && !this.isStandalone();

    if (!('Notification' in window) && !iosNeedsInstall) {
      if (force) this._toast('المتصفح ده مش بيدعم الإشعارات');
      return;
    }

    if (!iosNeedsInstall && Notification.permission === 'granted') {
      const ok = await this.enablePush(session, { quiet: true });
      if (ok) {
        this.startAdminAlertListener(session);
        this.refreshNotifButtonState();
      }
      // مفعّلة خلاص — بلاش نافذة ولا إشعار "تم التفعيل" متكرر
      return;
    }

    if (!iosNeedsInstall && Notification.permission === 'denied') {
      this._showNotificationModal({ denied: true, session, iosNeedsInstall: false });
      return;
    }

    // موبايل/كمبيوتر: نافذة التفعيل أول ما يفتح (أو لو لسه default)
    if (force || iosNeedsInstall || Notification.permission === 'default') {
      this._showNotificationModal({ denied: false, session, iosNeedsInstall });
    }
  },

  _showNotificationModal({ denied, session, iosNeedsInstall = false }) {
    if (document.getElementById('pwa-notif-overlay')) return;
    // اقفل نافذة التثبيت لو فاتحة عشان نافذة الإشعارات تبقى واضحة
    this._closeOverlay('pwa-install-overlay');

    const overlay = document.createElement('div');
    overlay.id = 'pwa-notif-overlay';
    overlay.className = 'pwa-onboard-overlay pwa-notif-priority';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    let bodyInner;
    if (iosNeedsInstall) {
      bodyInner = `
        <p class="pwa-lead">على الآيفون لازم تفتح التطبيق من <strong>أيقونة الشاشة الرئيسية</strong> الأول، وبعدين تفعّل الإشعارات.</p>
        <ol class="pwa-onboard-steps">
          <li><span class="step-num">1</span><span>ثبّت التطبيق (إضافة للشاشة الرئيسية)</span></li>
          <li><span class="step-num">2</span><span>افتحه من الأيقونة</span></li>
          <li><span class="step-num">3</span><span>اضغط تفعيل الإشعارات</span></li>
        </ol>
        <div class="pwa-onboard-note">من غير التثبيت، آيفون مش بيسمح بإشعارات الويب.</div>
        <div class="pwa-onboard-actions">
          <button type="button" class="pwa-btn-primary" id="pwa-notif-install">ثبّت التطبيق الآن</button>
          <button type="button" class="pwa-btn-ghost" id="pwa-notif-later">لاحقاً</button>
        </div>`;
    } else if (denied) {
      bodyInner = `
        <p class="pwa-lead">الإشعارات متوقفة من إعدادات الجهاز/المتصفح. فعّلها يدويًا ثم ارجع.</p>
        <div class="pwa-onboard-note">Settings → Notifications / Site Settings → Allow</div>
        <div class="pwa-onboard-actions">
          <button type="button" class="pwa-btn-primary" id="pwa-notif-retry">حاول مرة أخرى</button>
          <button type="button" class="pwa-btn-ghost" id="pwa-notif-later">لاحقاً</button>
        </div>`;
    } else {
      bodyInner = `
        <p class="pwa-lead">فعّل الإشعارات دلوقتي عشان يوصلك تنبيه فوري لأي حركة من المحاسبين على أي مدرسة.</p>
        <div class="pwa-onboard-note">اضغط الزر واختار <strong>Allow / السماح</strong> في رسالة المتصفح.</div>
        <div id="pwa-notif-error" class="pwa-install-tip" style="display:none"></div>
        <div class="pwa-onboard-actions">
          <button type="button" class="pwa-btn-primary" id="pwa-notif-enable">🔔 تفعيل الإشعارات الآن</button>
          <button type="button" class="pwa-btn-ghost" id="pwa-notif-later">لاحقاً</button>
        </div>`;
    }

    overlay.innerHTML = `
      <div class="pwa-onboard-modal">
        <div class="pwa-onboard-head">
          <div class="pwa-bell">🔔</div>
          <h3>${denied ? 'الإشعارات متوقفة' : 'فعّل إشعارات الأدمن'}</h3>
          <p>تنبيه فوري عند أي نشاط على النظام</p>
          ${this.isMobileDevice() ? '<span class="pwa-device-badge">موبايل</span>' : ''}
        </div>
        <div class="pwa-onboard-body">${bodyInner}</div>
      </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('pwa-onboard-lock');

    const close = () => {
      this._closeOverlay('pwa-notif-overlay');
      // بعد الإشعارات: لو موبايل ولسه مش مثبت، اعرض التثبيت
      if (this.isMobileDevice() && !this.isStandalone() && !document.getElementById('pwa-install-overlay')) {
        setTimeout(() => this.showInstallModal(), 300);
      }
    };

    overlay.querySelector('#pwa-notif-later')?.addEventListener('click', () => {
      try { sessionStorage.setItem('mohasba_notif_later', '1'); } catch (_) { /* ignore */ }
      close();
    });

    overlay.querySelector('#pwa-notif-install')?.addEventListener('click', () => {
      this._closeOverlay('pwa-notif-overlay');
      this.showInstallModal();
    });

    overlay.querySelector('#pwa-notif-retry')?.addEventListener('click', async () => {
      if (Notification.permission === 'granted') {
        await this.enablePush(session, { quiet: true });
        this.startAdminAlertListener(session);
        this.refreshNotifButtonState();
        this._toast('الإشعارات مفعّلة ✓');
        close();
      } else {
        close();
        this._showNotificationModal({
          denied: Notification.permission === 'denied',
          session,
          iosNeedsInstall: this.isIOS() && !this.isStandalone(),
        });
      }
    });

    overlay.querySelector('#pwa-notif-enable')?.addEventListener('click', async () => {
      const btn = overlay.querySelector('#pwa-notif-enable');
      const errEl = overlay.querySelector('#pwa-notif-error');
      if (btn) { btn.disabled = true; btn.textContent = 'جاري التفعيل…'; }
      try {
        const ok = await this.enablePush(session, { quiet: false, welcome: true });
        if (!ok) throw new Error('تعذّر الاشتراك — اسمح بالإشعارات من رسالة المتصفح');
        this.startAdminAlertListener(session);
        this.refreshNotifButtonState();
        try { sessionStorage.removeItem('mohasba_notif_later'); } catch (_) { /* ignore */ }
        this._toast('تم تفعيل الإشعارات ✓');
        close();
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = '🔔 تفعيل الإشعارات الآن'; }
        if (errEl) {
          errEl.style.display = 'block';
          errEl.style.color = '#B3261E';
          errEl.textContent = err.message || 'تعذّر تفعيل الإشعارات';
        }
        if (Notification.permission === 'denied') {
          this._closeOverlay('pwa-notif-overlay');
          this._showNotificationModal({ denied: true, session, iosNeedsInstall: false });
        }
      }
    });
  },

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  },

  async enablePush(session, opts = {}) {
    const quiet = !!opts.quiet;
    const welcome = !!opts.welcome;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
    const perm = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (perm !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
      });
    }

    const key = btoa(sub.endpoint).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
    // الأدمن العام: كل المدارس. غير كده: المدرسة الحالية فقط
    const schoolIds = (session.role === 'admin' && typeof SCHOOLS !== 'undefined')
      ? Object.keys(SCHOOLS)
      : [session.schoolId].filter(Boolean);

    await db.collection('adminPushSubs').doc(key).set({
      email: session.email,
      uid: session.uid || (auth.currentUser && auth.currentUser.uid) || '',
      subscription: sub.toJSON(),
      schoolId: session.schoolId || null,
      schoolIds: schoolIds.length ? schoolIds : ['*'],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 180),
    }, { merge: true });

    // إشعار ترحيب مرة واحدة فقط عند التفعيل اليدوي الأول — مش مع كل صفحة
    let alreadyWelcomed = false;
    try { alreadyWelcomed = localStorage.getItem('mohasba_push_welcomed') === '1'; } catch (_) { /* ignore */ }
    if (!quiet && welcome && !alreadyWelcomed) {
      try {
        await reg.showNotification('تم تفعيل الإشعارات', {
          body: 'هتوصلك تنبيهات عمليات المحاسبين فقط، كل إشعار باسم مدرسته',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-96.png',
          tag: 'mohasba-notif-welcome',
        });
        try { localStorage.setItem('mohasba_push_welcomed', '1'); } catch (_) { /* ignore */ }
      } catch (_) { /* ignore */ }
    }

    return true;
  },

  stopAdminAlertListener() {
    if (this._alertUnsub) {
      try { this._alertUnsub(); } catch (_) {}
      this._alertUnsub = null;
    }
    this._listenSchoolId = null;
    this._alertReady = false;
  },

  startAdminAlertListener(session) {
    if (!this._isAdminSession(session)) return;
    if (typeof db === 'undefined') return;

    // أعد الربط لو غيّر المدرسة
    const schoolId = session.schoolId || '';
    if (this._alertUnsub && this._listenSchoolId === schoolId) return;
    this.stopAdminAlertListener();
    this._listenSchoolId = schoolId;
    this._alertReady = false;

    const bootAt = Date.now();
    // بدون orderBy+where لتفادي composite index — فلترة على العميل
    this._alertUnsub = db.collection('adminAlerts')
      .orderBy('createdAt', 'desc')
      .limit(40)
      .onSnapshot((snap) => {
        // أول snapshot بعد فتح الصفحة = بيانات قديمة — علّمها كمقروءة ومتظهرش إشعار
        if (!this._alertReady) {
          snap.docs.forEach((doc) => this._seenAlertIds.add(doc.id));
          this._alertReady = true;
          return;
        }

        const currentSchool = (typeof SESSION !== 'undefined' && SESSION.get)
          ? (SESSION.get()?.schoolId || schoolId)
          : schoolId;

        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const id = change.doc.id;
          if (this._seenAlertIds.has(id)) return;
          this._seenAlertIds.add(id);
          const d = change.doc.data() || {};

          // متكررش إشعار لنفس الفاعل لو هو الأدمن نفسه
          if (session.email && d.createdBy && d.createdBy === session.email) return;
          if (typeof ADMINS !== 'undefined' && d.createdBy && ADMINS.includes(d.createdBy)) return;

          // إشعار حي داخل التطبيق للمدرسة المفتوحة حالياً فقط
          // (الـ Push بره التطبيق بيوصل لكل مدارس الأدمن)
          if (currentSchool && d.schoolId && d.schoolId !== currentSchool) return;

          const created = d.createdAt && typeof d.createdAt.toMillis === 'function'
            ? d.createdAt.toMillis()
            : 0;
          // لازم تاريخ صالح وبعد تشغيل المستمع — يمنع إشعارات التنقّل/البيانات القديمة
          if (!created || created < bootAt - 1000) return;

          this.showLocalNotification(d.title || 'إشعار جديد', d.body || '', d.url || '/admin.html');
        });
      }, (err) => console.warn('[PWA] alert listener:', err));
  },

  async showLocalNotification(title, body, url) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        vibrate: [100, 50, 100],
        data: { url },
        tag: 'mohasba-alert-' + Date.now(),
      });
    } catch {
      try {
        new Notification(title, { body, icon: '/icons/icon-192.png' });
      } catch (_) { /* ignore */ }
    }
  },

  _closeOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
    if (!document.querySelector('.pwa-onboard-overlay')) {
      document.body.classList.remove('pwa-onboard-lock');
    }
  },

  injectStyles() {
    if (document.getElementById('pwa-onboard-styles')) return;
    const style = document.createElement('style');
    style.id = 'pwa-onboard-styles';
    style.textContent = `
      body.pwa-onboard-lock { overflow: hidden !important; }
      .pwa-onboard-overlay {
        position: fixed; inset: 0; z-index: 100000;
        background: rgba(10, 22, 48, 0.72);
        backdrop-filter: blur(6px);
        display: flex; align-items: flex-end; justify-content: center;
        padding:
          env(safe-area-inset-top, 0px)
          max(0.75rem, env(safe-area-inset-right, 0px))
          env(safe-area-inset-bottom, 0px)
          max(0.75rem, env(safe-area-inset-left, 0px));
        direction: rtl;
        font-family: 'Cairo', Tahoma, sans-serif;
        box-sizing: border-box;
      }
      @media (min-width: 560px) {
        .pwa-onboard-overlay { align-items: center; padding: 1.25rem; }
      }
      .pwa-onboard-modal {
        width: 100%; max-width: 420px;
        max-height: min(92dvh, 92vh);
        background: #fff;
        border-radius: 22px 22px 0 0;
        box-shadow: 0 -10px 40px rgba(0,0,0,0.25);
        overflow: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        animation: pwaSlideUp 0.35s ease;
      }
      @media (min-width: 560px) {
        .pwa-onboard-modal { border-radius: 20px; max-height: 90vh; }
      }
      @keyframes pwaSlideUp {
        from { transform: translateY(24px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .pwa-onboard-head {
        background: linear-gradient(135deg, #1a3a6b 0%, #0d2247 100%);
        color: #fff; text-align: center; padding: 1.35rem 1.2rem 1.1rem;
      }
      .pwa-icon-img {
        width: 64px; height: 64px; border-radius: 16px;
        object-fit: cover; margin-bottom: 0.65rem;
        border: 2px solid rgba(255,255,255,0.35);
        background: #fff;
      }
      .pwa-bell { font-size: 2rem; margin-bottom: 0.4rem; }
      .pwa-onboard-head h3 { margin: 0 0 0.35rem; font-size: 1.1rem; font-weight: 800; }
      .pwa-onboard-head p { margin: 0; font-size: 0.82rem; opacity: 0.9; }
      .pwa-device-badge {
        display: inline-block; margin-top: 0.65rem;
        background: rgba(255,255,255,0.15); border-radius: 999px;
        padding: 0.2rem 0.7rem; font-size: 0.72rem; font-weight: 700;
      }
      .pwa-onboard-body { padding: 1.1rem 1.15rem 1.35rem; }
      .pwa-lead { font-size: 0.88rem; color: #444; line-height: 1.65; margin: 0 0 0.75rem; }
      .pwa-onboard-steps {
        list-style: none; margin: 0 0 0.85rem; padding: 0;
        display: flex; flex-direction: column; gap: 0.45rem;
      }
      .pwa-onboard-steps li {
        display: flex; gap: 0.65rem; align-items: flex-start;
        background: #f4f6fb; border-radius: 12px; padding: 0.55rem 0.75rem;
        font-size: 0.84rem; line-height: 1.5; color: #222;
      }
      .pwa-onboard-steps .step-num {
        flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
        background: #1a3a6b; color: #fff; font-size: 0.72rem; font-weight: 800;
        display: flex; align-items: center; justify-content: center; margin-top: 1px;
      }
      .pwa-onboard-note {
        background: #fff6e8; color: #7a4a00; border-radius: 12px;
        padding: 0.65rem 0.8rem; font-size: 0.78rem; line-height: 1.55;
        margin-bottom: 0.9rem; font-weight: 600;
      }
      .pwa-onboard-actions { display: flex; flex-direction: column; gap: 0.5rem; }
      .pwa-btn-primary {
        border: none; border-radius: 12px; padding: 0.9rem 1rem;
        background: #1a3a6b; color: #fff; font-family: inherit;
        font-size: 0.95rem; font-weight: 800; cursor: pointer;
        min-height: 48px;
      }
      .pwa-btn-primary:disabled { opacity: 0.65; cursor: wait; }
      .pwa-btn-ghost {
        border: 1.5px solid #d5dbe8; border-radius: 12px; padding: 0.75rem 1rem;
        background: #fff; color: #445; font-family: inherit;
        font-size: 0.88rem; font-weight: 700; cursor: pointer; min-height: 44px;
      }
      .pwa-notif-priority { z-index: 100050; }
      .pwa-install-tip { font-size: 0.78rem; font-weight: 700; margin: 0 0 0.75rem; }
    `;
    document.head.appendChild(style);
  },
};

// alias للتوافق مع الكود القديم
var MohasbaPWA = window.MohasbaPWA;

// تشغيل تلقائي خفيف على صفحة الدخول
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.app-layout')) window.MohasbaPWA.init();
  });
} else if (!document.querySelector('.app-layout')) {
  window.MohasbaPWA.init();
}
