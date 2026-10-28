/* ============================================================
   أكاديمية الرشم المقدس — مستقبل تسجيل الزيارات
   ------------------------------------------------------------
   ده كود Google Apps Script مش جزء من الموقع نفسه.
   خطوات التركيب موجودة في README تحت قسم «تسجيل الزيارات».

   الفكرة:
   - اللي بيفتح الموقع بيبعت زيارة (وقت، IP، صفحة، متصفح… إلخ).
   - الكود بيضيف صف في Google Sheet.
   - كل يوم الساعة 8 الصبح بيتبعت إيميل فيه ملف CSV بزيارات اليوم اللي فات.

   ملاحظة: مفيش أي بيانات حسابات أو كلمات مرور — المتصفح
   مستحيل يوفّرها، والموقع مش بيطلبها.
   ============================================================ */

var SHEET_NAME = 'الزيارات';

var HEADERS = [
  'الوقت',
  'IP',
  'الصفحة',
  'الموقع',
  'المتصفح',
  'النظام',
  'الجهاز',
  'اللغة',
  'المنطقة الزمنية',
  'الشاشة',
  'نافذة العرض',
  'مصدر الزيارة',
  'معرّف الزائر',
  'زائر جديد؟',
  'بوت؟',
  'User Agent'
];

function doGet() {
  return ContentService.createTextOutput('OK');
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return reply_({ ok: false, error: 'empty' });
    var raw = e.postData.contents;
    if (raw.length > 8192) return reply_({ ok: false, error: 'too_large' });

    var d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return reply_({ ok: false, error: 'bad_payload' });

    var page = text_(d.page, 300);
    if (!page) return reply_({ ok: false, error: 'missing_page' });
    if (page.charAt(0) !== '/') page = '/' + page;

    var ua = text_(d.ua, 400);
    if (!ua) return reply_({ ok: false, error: 'missing_ua' });

    var ip = text_(d.ip, 64);
    if (!/^[0-9a-fA-F:.]{3,45}$/.test(ip)) ip = '';

    if (ip) {
      var cache = CacheService.getScriptCache();
      var key = 'seen_' + Utilities.base64EncodeWebSafe(ip).slice(0, 120);
      if (cache.get(key)) return reply_({ ok: true, skipped: 'rate' });
      cache.put(key, '1', 10);
    }

    var host = text_(d.host, 120);
    var ref = text_(d.ref, 500);
    var lang = text_(d.lang, 30);
    var tz = text_(d.tz, 80);
    var scr = text_(d.screen, 30);
    var viewport = text_(d.viewport, 30);
    var vid = text_(d.vid, 80);
    var isNew = d.isNew === true ? 'نعم' : 'لا';
    var parsed = parseUA_(ua);

    var row = [
      new Date(),
      ip,
      page,
      host,
      parsed.browser,
      parsed.os,
      parsed.device,
      lang,
      tz,
      scr,
      viewport,
      ref,
      vid,
      isNew,
      parsed.bot ? 'نعم' : 'لا',
      ua
    ];

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      getSheet_().appendRow(row.map(safeCell_));
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('لازم السكريبت يكون مربوط بالشيت (Extensions > Apps Script)');
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f3e3c3');
    sh.setFrozenRows(1);
  }
  return sh;
}

function reply_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function text_(v, max) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
}

function safeCell_(v) {
  if (v instanceof Date) return v;
  var s = String(v === null || v === undefined ? '' : v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function parseUA_(ua) {
  var s = ua || '';
  var browser = 'غير معروف';
  var os = 'غير معروف';
  var device = 'كمبيوتر';

  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(s)) browser = 'Opera';
  else if (/Firefox\//i.test(s)) browser = 'Firefox';
  else if (/Chrome\//i.test(s) || /CriOS\//i.test(s)) browser = 'Chrome';
  else if (/Safari\//i.test(s)) browser = 'Safari';

  if (/Windows NT/i.test(s)) os = 'Windows';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
  else if (/Mac OS X/i.test(s)) os = 'macOS';
  else if (/Linux/i.test(s)) os = 'Linux';

  if (/iPad|Tablet/i.test(s)) device = 'تابلت';
  else if (/Mobile|Android|iPhone/i.test(s)) device = 'موبايل';

  var bot = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|curl|wget|python-requests|monitor/i.test(s);
  return { browser: browser, os: os, device: device, bot: bot };
}

/* ------------------------------------------------------------
   التقرير اليومي
   شغّل setupDailyReport مرة واحدة بعد تركيب السكريبت.
   ------------------------------------------------------------ */
function setupDailyReport() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendDailyReport') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('sendDailyReport')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
}

function sendDailyReport() {
  var sh = getSheet_();
  var last = sh.getLastRow();
  if (last < 2) return;

  var tz = Session.getScriptTimeZone();
  var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var day = Utilities.formatDate(yesterday, tz, 'yyyy-MM-dd');

  var rows = values.filter(function (r) {
    return r[0] instanceof Date && Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') === day;
  });
  if (!rows.length) return;

  var lines = [HEADERS.map(csvCell_)];
  for (var j = 0; j < rows.length; j++) {
    lines.push(rows[j].map(csvCell_));
  }
  var csv = lines.map(function (r) { return r.join(','); }).join('\r\n');
  var blob = Utilities.newBlob('\uFEFF' + csv, 'text/csv', 'زيارات-' + day + '.csv');

  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'زيارات الموقع — ' + day + ' (' + rows.length + ')',
    body: 'مرفق ملف CSV بزيارات يوم ' + day + '.\nعدد الزيارات: ' + rows.length,
    attachments: [blob]
  });
}

function csvCell_(v) {
  var s = v instanceof Date
    ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
    : String(v === null || v === undefined ? '' : v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
