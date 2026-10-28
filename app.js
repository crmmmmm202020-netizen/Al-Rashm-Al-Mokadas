/* ============================================================
   أكاديمية الرشم المقدس — النواة المشتركة
   مشهد الخلفية + التنقل + كشف تدريجي + تشغيل الشعار
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SITE = window.ARA_SITE || {};
  var TG = SITE.telegram || 'https://t.me/crm_3000';

  var NAV = [
    { href: 'index.html',   label: 'الرئيسية' },
    { href: 'members.html', label: 'أعضاء الأكاديمية' },
    { href: 'index.html#mission', label: 'الرسالة والأهداف' }
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  window.ARA_ESC = esc;

  /* ---------- خلفية المشهد (متعددة الطبقات + شرارات) ---------- */
  function buildScene() {
    var bg = document.createElement('div');
    bg.className = 'bg-scene';
    /* طبقات الإضاءة والموجة الضوئية */
    ['l1', 'l2', 'l3', 'l4'].forEach(function (cls) {
      var layer = document.createElement('div');
      layer.className = 'bg-layer ' + cls;
      bg.appendChild(layer);
    });
    /* canvas للشرارات */
    var canvas = document.createElement('canvas');
    canvas.className = 'bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    bg.appendChild(canvas);
    document.body.prepend(bg);

    /* تشغيل محرك الشرارات (محدود على الموبايل/الأجهزة الضعيفة) */
    startEmbers(canvas);
    /* ميلان طفيف للوهج مع الماوس (سطح المكتب فقط، بدون تأثير على الأداء) */
    startParallax(bg);
  }

  /* ---------- ميلان سينمائي خفيف للخلفية مع الماوس ---------- */
  function startParallax(bg) {
    if (REDUCED) return;
    var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;
    var raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    function step() {
      raf = 0;
      cx += (tx - cx) * .05; cy += (ty - cy) * .05;
      bg.style.transform = 'translate3d(' + (-cx).toFixed(2) + 'px,' + (-cy).toFixed(2) + 'px,0)';
      if (Math.abs(tx - cx) > .05 || Math.abs(ty - cy) > .05) raf = requestAnimationFrame(step);
    }
    window.addEventListener('mousemove', function (e) {
      tx = (e.clientX / window.innerWidth - .5) * 22;
      ty = (e.clientY / window.innerHeight - .5) * 16;
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
  }

  /* ---------- محرك الشرارات (canvas) ---------- */
  function startEmbers(canvas) {
    if (REDUCED) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var particles = [];
    var MAX = window.innerWidth < 768 ? 36 : 72;

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function spawn() {
      particles.push({
        x: Math.random() * W,
        y: H + 8,
        r: 0.6 + Math.random() * 2.2,
        vy: -(0.18 + Math.random() * 0.45),
        vx: (Math.random() - 0.5) * 0.25,
        life: 0,
        maxLife: 260 + Math.random() * 260,
        hue: Math.random() < 0.55 ? 20 : 40,
      });
    }

    var raf = 0;
    function loop() {
      ctx.clearRect(0, 0, W, H);
      if (particles.length < MAX && Math.random() < 0.35) spawn();
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life++;
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.995; p.vy *= 0.998;
        var t = p.life / p.maxLife;
        var alpha = (1 - t) * (0.35 + 0.65 * (1 - t));
        if (t >= 1 || p.y < -10) { particles.splice(i, 1); continue; }
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
        g.addColorStop(0, 'hsla(' + p.hue + ', 100%, 62%, ' + alpha + ')');
        g.addColorStop(0.4, 'hsla(' + (p.hue - 8) + ', 100%, 48%, ' + (alpha * 0.5) + ')');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    }
    loop();

    /* إيقاف عند تقليل الحركة (already handled by REDUCED check above) */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) loop();
    });
  }

  /* ---------- التنقل ---------- */
  function currentPage() {
    var p = location.pathname.split('/').pop();
    return p === '' ? 'index.html' : p;
  }

  function buildNav() {
    var links = NAV.map(function (it) {
      return '<li><a href="' + it.href + '">' + it.label + '</a></li>';
    }).join('');

    var nav = document.createElement('header');
    nav.className = 'site-nav';
    nav.innerHTML =
      '<div class="container nav-inner">' +
        '<button class="menu-toggle" id="menu-toggle" aria-label="فتح القائمة">☰</button>' +
        '<a class="brand" href="index.html">' +
          '<img src="assets/img/logo-sm.png?v=1" alt="شعار أكاديمية الرشم المقدس" width="176" height="210" class="logo-sm">' +
          '<span class="brand-name">' + esc(SITE.name || 'أكاديمية الرشم المقدس') + '</span>' +
        '</a>' +
        '<ul class="nav-links">' + links + '</ul>' +
        '<div class="nav-cta">' +
          '<a class="btn btn-sm btn-primary" href="' + TG + '" target="_blank" rel="noopener">قناة Telegram</a>' +
        '</div>' +
      '</div>';
    document.body.prepend(nav);

    var drawer = document.createElement('aside');
    drawer.className = 'drawer';
    drawer.innerHTML =
      '<button class="drawer-close" id="drawer-close" aria-label="إغلاق القائمة">✕</button>' +
      '<img src="assets/img/logo-sm.png?v=1" alt="" width="176" height="210" class="logo-sm" style="height:64px">' +
      '<ul>' + NAV.map(function (it) {
        return '<li><a href="' + it.href + '">' + it.label + '</a></li>';
      }).join('') + '</ul>' +
      '<a class="btn btn-primary btn-sm" style="margin-top:20px" href="' + TG + '" target="_blank" rel="noopener">قناة Telegram</a>';
    var overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    document.body.append(drawer, overlay);

    /* التفعيل يتبع الصفحة والجزء الحالي، فالرابط الرئيسي والجزء لا يتفعّلان معًا */
    function refreshActive() {
      var here = currentPage();
      document.querySelectorAll('.site-nav .nav-links a, .drawer ul a').forEach(function (a) {
        var parts = String(a.getAttribute('href') || '').split('#');
        var active = parts[0] === here && (parts[1] ? location.hash === '#' + parts[1] : !location.hash);
        a.classList.toggle('active', active);
      });
    }
    refreshActive();
    window.addEventListener('hashchange', refreshActive);

    function setOpen(open) {
      /* الفتح والإغلاق بالكلاسات فقط — CSS يتولى التحريك عبر خاصية right.
         ممنوع حقن transform/transition هنا: كان سبب بقاء اللوحة ظاهرة وتغطية المحتوى */
      drawer.classList.toggle('open', open);
      overlay.classList.toggle('show', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) document.getElementById('drawer-close').focus();
    }
    document.getElementById('menu-toggle').addEventListener('click', function () { setOpen(true); });
    document.getElementById('drawer-close').addEventListener('click', function () { setOpen(false); });
    overlay.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) setOpen(false);
    });
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
  }

  /* ---------- التذييل ---------- */
  function buildFooter() {
    var f = document.createElement('footer');
    f.className = 'site-footer';
    f.innerHTML =
      '<div class="container">' +
        '<div class="footer-inner">' +
          '<div>' +
            '<div class="footer-brand">' +
              '<img src="assets/img/logo-sm.png?v=1" alt="" width="176" height="210" class="logo-sm">' +
              '<div><div class="n">' + esc(SITE.name || '') + '</div>' +
              '<div class="t">Al-Rashm Al-Muqaddas Academy</div></div>' +
            '</div>' +
            '<p class="about">' + esc(SITE.slogan || '') + ' — منصة للحوار الرصين، تُقيس الأفكار بميزان الحجة وتحفظ كرامة أصحابها.</p>' +
          '</div>' +
          '<ul class="footer-links">' +
            '<li><a href="index.html">الرئيسية</a></li>' +
            '<li><a href="members.html">أعضاء الأكاديمية</a></li>' +
            '<li><a href="' + TG + '" target="_blank" rel="noopener">قناة Telegram</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-bottom">© <span id="footer-year"></span> ' + esc(SITE.name || '') + ' — جميع الحقوق محفوظة.</div>' +
      '</div>';
    document.body.appendChild(f);
    var y = f.querySelector('#footer-year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- كشف تدريجي ---------- */
  function startReveals() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || REDUCED) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- تشغيل حركة الشعار ---------- */
  function startLogo() {
    var stage = document.querySelector('.logo-stage');
    if (!stage) return;
    if (REDUCED) { stage.classList.add('frame-on', 'lit'); return; }
    setTimeout(function () { stage.classList.add('frame-on'); }, 220);
    setTimeout(function () { stage.classList.add('lit'); }, 1400);
  }

  /* ---------- تشغيل ---------- */
  window.ARA = window.ARA || {};
  window.ARA.telegram = TG;
  window.ARA.reducedMotion = REDUCED;

  function boot() {
    buildScene();
    buildNav();
    buildFooter();
    document.body.classList.add('page-ready');
    startLogo();
    startReveals();

    /* بنعلّم الاستعداد قبل الحدث، لأن ملفات الصفحة ممكن تكون اتحمّلت
       بعد app.js فيتأخّر تسجيلها للحدث وما تفتحش. */
    window.ARA.ready = true;
    document.dispatchEvent(new CustomEvent('ara:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
