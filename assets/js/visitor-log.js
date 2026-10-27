/* ============================================================
   أكاديمية الرشم المقدس — تسجيل الزيارات (اختياري)
   ------------------------------------------------------------
   - لو visitorLogUrl فاضي (الوضع الافتراضي): مفيش أي تسجيل
     ومفيش أي طلب خارجي ومفيش إشعار.
   - لو مضبوط: بيبعت بيانات الزيارة لـ Google Apps Script.
   - بيحترم Do Not Track / Global Privacy Control.
   ============================================================ */
(function () {
  'use strict';

  var SITE = window.ARA_SITE || {};
  var ENDPOINT = String(SITE.visitorLogUrl || '').trim();
  if (!ENDPOINT) return;

  var NOTICE_ID = 'visitor-privacy-note';
  var VID_KEY = 'ara_visitor_id';
  var DNT = navigator.doNotTrack === '1' ||
            window.doNotTrack === '1' ||
            navigator.msDoNotTrack === '1' ||
            navigator.globalPrivacyControl === true;

  function addNotice() {
    if (document.getElementById(NOTICE_ID)) return;
    var container = document.querySelector('.site-footer .container');
    if (!container) return;
    var note = document.createElement('div');
    note.id = NOTICE_ID;
    note.className = 'visitor-note';
    note.innerHTML =
      '<strong>خصوصية الزوار:</strong> لأغراض الأمن والإحصاء، الموقع يسجّل وقت الزيارة، ' +
      'وعنوان IP، والصفحة، ونوع المتصفح والجهاز. لا نسجّل حسابات الزوار على تيك توك أو تليجرام ' +
      'ولا كلمات المرور. لو فعّلت «عدم التتبع» (Do Not Track) في متصفحك، مش هنسجّل زيارتك.';
    var bottom = container.querySelector('.footer-bottom');
    if (bottom) container.insertBefore(note, bottom);
    else container.appendChild(note);
  }

  function whenReady(fn) {
    var done = false;
    function run() {
      if (done) return;
      done = true;
      fn();
    }
    if (window.ARA && window.ARA.ready) { run(); return; }
    document.addEventListener('ara:ready', run, { once: true });
    window.addEventListener('load', function () { setTimeout(run, 100); }, { once: true });
  }

  function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function lsSet(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* التخزين مرفوض */ } }

  function visitor() {
    var id = lsGet(VID_KEY);
    var fresh = false;
    if (!id) {
      fresh = true;
      try {
        id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
          : 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      } catch (e) {
        id = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      }
      lsSet(VID_KEY, id);
    }
    return { id: id, isNew: fresh };
  }

  function lookupIp() {
    if (!window.fetch || !window.AbortController) return Promise.resolve('');
    return new Promise(function (resolve) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () {
        try { ctrl.abort(); } catch (e) { /* متصفح قديم */ }
        resolve('');
      }, 1600);
      fetch('https://api.ipify.org?format=json', {
        cache: 'no-store',
        signal: ctrl.signal,
        referrerPolicy: 'no-referrer'
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          clearTimeout(timer);
          resolve(d && typeof d.ip === 'string' ? d.ip : '');
        })
        .catch(function () {
          clearTimeout(timer);
          resolve('');
        });
    });
  }

  function timeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  }

  function buildPayload(ip) {
    var v = visitor();
    var page = location.pathname + location.search;
    if (!page || page === '/') page = '/index.html';
    return {
      v: 1,
      ip: ip,
      page: page,
      host: location.host,
      ref: document.referrer || '',
      ua: navigator.userAgent || '',
      platform: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '',
      lang: navigator.language || '',
      tz: timeZone(),
      screen: screen.width + 'x' + screen.height,
      viewport: window.innerWidth + 'x' + window.innerHeight,
      vid: v.id,
      isNew: v.isNew
    };
  }

  function send(data) {
    if (!window.fetch) return;
    fetch(ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(data),
      keepalive: true,
      referrerPolicy: 'no-referrer'
    }).catch(function () { /* الفشل هنا مايأثرش على الموقع */ });
  }

  function run() {
    if (DNT) return;
    setTimeout(function () {
      lookupIp().then(function (ip) { send(buildPayload(ip)); });
    }, 700);
  }

  whenReady(function () {
    addNotice();
    run();
  });
})();
