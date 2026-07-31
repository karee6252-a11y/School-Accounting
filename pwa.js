// ============================================================
//  PWA — تثبيت إجباري (موبايل) + إشعارات الأدمن
//  بنفس أسلوب منصة LMS
// ============================================================

const MohasbaPWA = {
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
    setTimeout(() => this.runMobileOnboarding(session), 400);
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
    if (!this.isMobileDevice()) {
      if (session && session.role === 'admin') await this.maybeShowNotificationPrompt(session, true);
      return;
    }

    this._onboardingRunning = true;
    try {
      if (!this.isStandalone()) {
        if (!this._deferredInstall && this.isAndroid()) {
          await new Promise((r) => setTimeout(r, 900));
        }
        await this.showInstallModal();
      }
      const s = session || (typeof SESSION !== 'undefined' ? SESSION.get() : null);
      if (s && s.role === 'admin' && this.isStandalone()) {
        await this.maybeShowNotificationPrompt(s, true);
      }
    } finally {
      this._onboardingRunning = false;
    }
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
            <img class="pwa-icon-img" src="/icons/icon-192.png" alt="المحاسبة" />
            <h3>ثبّت تطبيق المحاسبة للمتابعة</h3>
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
    if (!session || session.role !== 'admin') return;
    if (!('Notification' in window)) return;
    if (document.getElementById('pwa-notif-overlay')) return;

    if (Notification.permission === 'granted') {
      const ok = await this.enablePush(session);
      if (ok) {
        this.startAdminAlertListener(session);
        return;
      }
    }

    if (Notification.permission === 'denied') {
      this._showNotificationModal({ denied: true, session });
      return;
    }

    if (force || Notification.permission === 'default') {
      this._showNotificationModal({ denied: false, session });
    }
  },

  _showNotificationModal({ denied, session }) {
    if (document.getElementById('pwa-notif-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'pwa-notif-overlay';
    overlay.className = 'pwa-onboard-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="pwa-onboard-modal">
        <div class="pwa-onboard-head">
          <div class="pwa-bell">🔔</div>
          <h3>${denied ? 'الإشعارات متوقفة' : 'فعّل إشعارات الأدمن'}</h3>
          <p>عشان يوصلك تنبيه فوري لما أي محاسب يسجّل تحصيل</p>
        </div>
        <div class="pwa-onboard-body">
          ${denied
            ? `<p class="pwa-lead">فعّل الإشعارات من إعدادات المتصفح/الجهاز ثم ارجع للتطبيق.</p>
               <div class="pwa-onboard-note">Settings → Site Settings → Notifications → Allow</div>
               <div class="pwa-onboard-actions">
                 <button type="button" class="pwa-btn-primary" id="pwa-notif-retry">حاول مرة أخرى</button>
               </div>`
            : `<p class="pwa-lead">التفعيل إجباري لحساب الأدمن على الموبايل.</p>
               <div class="pwa-onboard-note">يفضّل فتح التطبيق من أيقونة الشاشة الرئيسية ثم التفعيل.</div>
               <div id="pwa-notif-error" class="pwa-install-tip" style="display:none"></div>
               <div class="pwa-onboard-actions">
                 <button type="button" class="pwa-btn-primary" id="pwa-notif-enable">تفعيل الإشعارات</button>
               </div>`}
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('pwa-onboard-lock');

    const close = () => this._closeOverlay('pwa-notif-overlay');

    overlay.querySelector('#pwa-notif-retry')?.addEventListener('click', async () => {
      if (Notification.permission === 'granted') {
        await this.enablePush(session);
        this.startAdminAlertListener(session);
        close();
      } else {
        close();
        this._showNotificationModal({ denied: Notification.permission === 'denied', session });
      }
    });

    overlay.querySelector('#pwa-notif-enable')?.addEventListener('click', async () => {
      const btn = overlay.querySelector('#pwa-notif-enable');
      const errEl = overlay.querySelector('#pwa-notif-error');
      if (btn) { btn.disabled = true; btn.textContent = 'جاري التفعيل…'; }
      try {
        const ok = await this.enablePush(session);
        if (!ok) throw new Error('تعذّر الاشتراك في الإشعارات');
        this.startAdminAlertListener(session);
        close();
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'تفعيل الإشعارات'; }
        if (errEl) {
          errEl.style.display = 'block';
          errEl.style.color = '#B3261E';
          errEl.textContent = err.message || 'تعذّر تفعيل الإشعارات';
        }
        if (Notification.permission === 'denied') {
          close();
          this._showNotificationModal({ denied: true, session });
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

  async enablePush(session) {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
    const perm = await Notification.requestPermission();
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
    await db.collection('adminPushSubs').doc(key).set({
      email: session.email,
      uid: session.uid || (auth.currentUser && auth.currentUser.uid) || '',
      subscription: sub.toJSON(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 180),
    }, { merge: true });

    try {
      await reg.showNotification('تم تفعيل الإشعارات', {
        body: 'هتوصلك تنبيهات التحصيل الجديدة فوراً',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        tag: 'mohasba-notif-test',
      });
    } catch (_) { /* ignore */ }

    return true;
  },

  startAdminAlertListener(session) {
    if (!session || session.role !== 'admin') return;
    if (typeof db === 'undefined') return;
    if (this._alertUnsub) return;

    const bootAt = Date.now();
    this._alertUnsub = db.collection('adminAlerts')
      .orderBy('createdAt', 'desc')
      .limit(25)
      .onSnapshot((snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const id = change.doc.id;
          if (this._seenAlertIds.has(id)) return;
          this._seenAlertIds.add(id);
          const d = change.doc.data() || {};
          const created = d.createdAt?.toMillis ? d.createdAt.toMillis() : 0;
          // تجاهل القديم القديمة عند أول تحميل
          if (created && created < bootAt - 2000) return;
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
        padding: 0; direction: rtl;
        font-family: 'Cairo', Tahoma, sans-serif;
      }
      @media (min-width: 560px) {
        .pwa-onboard-overlay { align-items: center; padding: 1.25rem; }
      }
      .pwa-onboard-modal {
        width: 100%; max-width: 420px;
        background: #fff;
        border-radius: 22px 22px 0 0;
        box-shadow: 0 -10px 40px rgba(0,0,0,0.25);
        overflow: hidden;
        animation: pwaSlideUp 0.35s ease;
      }
      @media (min-width: 560px) {
        .pwa-onboard-modal { border-radius: 20px; }
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
        border: none; border-radius: 12px; padding: 0.85rem 1rem;
        background: #1a3a6b; color: #fff; font-family: inherit;
        font-size: 0.95rem; font-weight: 800; cursor: pointer;
      }
      .pwa-btn-primary:disabled { opacity: 0.65; cursor: wait; }
      .pwa-install-tip { font-size: 0.78rem; font-weight: 700; margin: 0 0 0.75rem; }
    `;
    document.head.appendChild(style);
  },
};

// تشغيل تلقائي خفيف على صفحة الدخول
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.app-layout')) MohasbaPWA.init();
  });
} else if (!document.querySelector('.app-layout')) {
  MohasbaPWA.init();
}
