/* ============================================================
   أكاديمية الرشم المقدس — عرض الأعضاء
   تترات سينمائية متصلة + شبكة ثابتة
   ------------------------------------------------------------
   البيانات في assets/js/data/members.js — عدّلها من هناك.
   ============================================================ */
(function () {
  'use strict';

  var esc = window.ARA_ESC || function (s) { return String(s == null ? '' : s); };
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function members() {
    var list = (window.ARA_MEMBERS || []).slice().sort(function (a, b) { return a.no - b.no; });
    return list;
  }

  /* ---------- رابط TikTok ---------- */
  function tiktokUrl(m) {
    if (!m.tiktok) return '';
    return 'https://www.tiktok.com/@' + String(m.tiktok).replace(/^@+/, '');
  }

  /* ---------- صورة العضو، أو رمزية أنيقة من أول حرف ---------- */
  function avatarHtml(m, cls, lazy) {
    if (m.image) {
      return '<img class="' + cls + '" src="' + esc(m.image) + '" alt="' + esc(m.name) + '" ' +
             'loading="' + (lazy === false ? 'eager' : 'lazy') + '" decoding="async" ' +
             'data-n="' + esc(m.name) + '" ' +
             'onerror="this.outerHTML=window.ARA_FALLBACK_AVATAR(this.dataset.n)">';
    }
    return '<span class="' + cls + ' ava-fallback" role="img" aria-label="' + esc(m.name) + '">' +
           esc(initial(m.name)) + '</span>';
  }

  function initial(name) {
    var n = String(name || '').trim();
    return n ? n.charAt(0) : '؟';
  }

  /* بديل لو مسار الصورة موجود بس الملف مش موجود */
  window.ARA_FALLBACK_AVATAR = function (name) {
    return '<span class="ava-fallback" role="img" aria-label="' + esc(name) + '">' +
           esc(initial(name)) + '</span>';
  };

  var TIKTOK_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06v-3.1a5.66 5.66 0 0 0-.77-.05A5.66 5.66 0 1 0 15.54 15.4V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48z"/>' +
    '</svg>';

  /* ============================================================
     بطاقة الترات المتحركة
     ============================================================ */
  function creditCard(m) {
    var url = tiktokUrl(m);
    var hit = url
      ? '<a class="m-hit" href="' + esc(url) + '" target="_blank" rel="noopener" ' +
        'aria-label="حساب TikTok لـ ' + esc(m.name) + '"></a>'
      : '';
    return '<article class="cr-card' + (url ? '' : ' no-link') + '">' +
        hit +
        avatarHtml(m, 'cr-ava') +
        '<span class="cr-no">' + m.no + '</span>' +
        '<div class="cr-name">' + esc(m.name) + '</div>' +
        '<div class="cr-role">' + esc(m.role) + '</div>' +
      '</article>';
  }

  function mountCredits(mount) {
    if (!mount) return;
    var list = members();
    if (!list.length) { mount.innerHTML = ''; return; }

    var one = list.map(creditCard).join('');

    /* تقليل الحركة: نسخة واحدة + تمرير يدوي، من غير تكرار ولا أنيميشن */
    if (REDUCED) {
      mount.innerHTML = one;
      mount.parentNode.classList.add('is-static');
      return;
    }

    /* نسختان متطابقتان جنب بعض، لأن الترجمة -50% بترجع لنفس الشكل بالظبط
       بلا قفزة. التكرار في الواجهة بس — البيانات الأساسية فيها كل عضو مرة. */
    mount.innerHTML = one + one;

    /* النسخة التانية زينة بصرية فقط: نخفيها عن قارئ الشاشة ونمنع التاب عليها */
    var allCards = mount.querySelectorAll('.cr-card');
    for (var i = allCards.length / 2; i < allCards.length; i++) {
      allCards[i].setAttribute('aria-hidden', 'true');
      allCards[i].querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
    }

    /* المدة بتتحسب من عرض المحتوى الفعلي (نصف المسار = نسخة واحدة كاملة)
       بسرعة ثابتة ~60 بكسل/ثانية، فالحركة متوازنة على أي عدد أعضاء */
    requestAnimationFrame(function () {
      var half = mount.scrollWidth / 2;
      if (half > 0) {
        var dur = Math.min(180, Math.max(30, half / 60));
        mount.style.setProperty('--credits-dur', dur.toFixed(1) + 's');
      }
    });
  }

  /* ============================================================
     بطاقة الشبكة الثابتة
     ============================================================ */
  function gridCard(m) {
    var url = tiktokUrl(m);
    var hit = url
      ? '<a class="m-hit" href="' + esc(url) + '" target="_blank" rel="noopener" ' +
        'aria-label="حساب TikTok لـ ' + esc(m.name) + '"></a>'
      : '';
    var link = url
      ? '<span class="m-link">' + TIKTOK_SVG + ' حساب TikTok</span>'
      : '<span class="m-link is-off">' + TIKTOK_SVG + ' الرابط غير مفعّل</span>';

    return '<article class="m-card' + (url ? '' : ' no-link') + '">' +
        hit +
        '<span class="m-no">' + m.no + '</span>' +
        avatarHtml(m, 'm-ava') +
        '<h3 class="m-name">' + esc(m.name) + '</h3>' +
        '<p class="m-role">' + esc(m.role) + '</p>' +
        '<p class="m-bio">' + esc(m.bio || '') + '</p>' +
        link +
      '</article>';
  }

  function mountGrid(mount) {
    if (!mount) return;
    var list = members();
    if (!list.length) {
      mount.innerHTML = '<p style="text-align:center;color:var(--ink-dim)">لا يوجد أعضاء مسجلون بعد.</p>';
      return;
    }
    mount.innerHTML = list.map(gridCard).join('');
  }

  /* ============================================================
     تصدير للموقع
     ============================================================ */
  window.ARA_MEMBERS_VIEW = {
    credits: mountCredits,
    grid: mountGrid,
    count: members
  };

  function initPage() {
    var page = document.body.getAttribute('data-page');
    if (page === 'home') {
      mountCredits(document.getElementById('home-credits'));
    } else if (page === 'members') {
      mountCredits(document.getElementById('credits-track'));
      mountGrid(document.getElementById('members-grid'));
      var c = document.getElementById('members-count');
      if (c) c.textContent = members().length;
    }
  }

  /* app.js ممكن يكون شغّال قبل ما الملف ده يتسجّل (لو الملفات اتحمّلت
     بترتيب معكوس)، فبنتحقق من العلامة بدل ما ننتظر الحدث بس */
  if (window.ARA && window.ARA.ready) {
    initPage();
  } else {
    document.addEventListener('ara:ready', initPage);
  }
})();
