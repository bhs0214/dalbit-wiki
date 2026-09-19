// ★ 달빛여관 신청함 + 인명부 + 관리 — Google Apps Script
// 이 파일 내용 전체를 Apps Script 편집기에 붙여넣고, 배포 → 배포 관리 → 새 버전으로 재배포하세요.
// (이미지 저장 때문에 구글 드라이브 권한이 추가로 필요합니다. 재배포 때 권한 허용 창이 한 번 더 뜹니다.)
// - doGet  : 상태가 활동중/휴면/소멸 인 캐릭터를 JSON으로 돌려줌 (인명부가 읽음)
// - doPost : 사이트에서 보낸 신청을 시트에 "심사중"으로 저장 (+이미지는 드라이브에)  /  admin.html 의 관리 요청 처리

var ADMIN_KEY  = '2328';              // ★ 관리 페이지 비밀번호. 원하는 걸로 바꾸세요 (따옴표는 남기고)
var IMG_FOLDER = '달빛여관_이미지';     // 캐릭터 이미지가 저장될 드라이브 폴더 (없으면 자동 생성)

var HEADERS = ['날짜','상태','이름','오너','이모지','종족','출신','모티프','나이','성별','소속','거점','직책','계약상대',
               '법기','랭크','외형','성격','이야기','법기설명','술식','관계','한줄','이미지'];
var SHOW = ['활동중','휴면','소멸'];   // 인명부에 보여줄 상태 ("심사중"은 안 보임)
var FIELD = { date:'날짜', status:'상태', name:'이름', owner:'오너', emoji:'이모지', kind:'종족', origin:'출신', motif:'모티프',
  age:'나이', gender:'성별', affiliation:'소속', base:'거점', role:'직책', partner:'계약상대',
  artifact:'법기', rank:'랭크', look:'외형', personality:'성격', story:'이야기', artifactDesc:'법기설명',
  skills:'술식', relations:'관계', line:'한줄', image:'이미지' };

// 시트 준비: 제목행이 없으면 만들고, 새로 생긴 칸(나이·성별…)이 빠져 있으면 오른쪽 끝에 붙임
function sheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
  }
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  var missing = HEADERS.filter(function (h) { return head.indexOf(h) < 0; });
  if (missing.length) {
    var start = head.filter(String).length + 1;
    sh.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold');
  }
  return sh;
}
function head_(sh) {
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var idx = {}; head.forEach(function (h, i) { if (h) idx[h] = i; });
  return { head: head, idx: idx };
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function readAll_(sh) {                      // 시트 전체를 {row, 필드...} 배열로 (제목 이름으로 찾으므로 열 순서는 상관없음)
  var H = head_(sh);
  var rows = sh.getDataRange().getValues(); rows.shift();
  function g(r, k) { var i = H.idx[k]; return i === undefined ? '' : String(r[i] == null ? '' : r[i]).trim(); }
  var out = [];
  rows.forEach(function (r, n) {
    if (r.join('') === '') return;
    var o = { row: n + 2 };
    for (var k in FIELD) o[k] = g(r, FIELD[k]);
    out.push(o);
  });
  return { idx: H.idx, items: out };
}

// ★ 드라이브 권한 허용용 — 편집기에서 이 함수를 고르고 ▶ 실행을 한 번 누르세요 (권한 창 → 허용)
function setup() {
  var f = folder_();
  Logger.log('OK — 드라이브 폴더 준비됨: ' + f.getName());
}

// 이미지: base64 → 드라이브 폴더에 저장 → 링크 공개 → 보기용 URL 반환
function folder_() {
  var it = DriveApp.getFoldersByName(IMG_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(IMG_FOLDER);
}
function saveImage_(d) {
  if (!d.imageData) return '';
  var type = d.imageType || 'image/jpeg';
  var ext  = type.indexOf('png') >= 0 ? 'png' : type.indexOf('gif') >= 0 ? 'gif' : type.indexOf('webp') >= 0 ? 'webp' : 'jpg';
  var name = (d.name || '캐릭터').replace(/[\\\/:*?"<>|]/g, '') + '_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmmss') + '.' + ext;
  var blob = Utilities.newBlob(Utilities.base64Decode(d.imageData), type, name);
  var f = folder_().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w1000';
}

// 신청 저장 / 관리
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  if (d._type === 'admin') return json_(admin_(d));
  var sh = sheet_(); var H = head_(sh);
  var row = []; for (var i = 0; i < H.head.length; i++) row.push('');
  function put(k, v) { var i = H.idx[k]; if (i !== undefined) row[i] = v == null ? '' : String(v); }
  put('날짜', d._date || new Date().toLocaleString('ko-KR'));
  put('상태', '심사중');
  for (var k in FIELD) if (k !== 'date' && k !== 'status' && k !== 'image') put(FIELD[k], d[k] || '');
  var imgUrl = '';
  try { imgUrl = saveImage_(d); } catch (err) { imgUrl = '(이미지 저장 실패: ' + err + ')'; }
  put('이미지', imgUrl);
  sh.appendRow(row);
  return ContentService.createTextOutput('ok');
}

// 관리 요청 (admin.html) — 비밀번호가 맞아야만 동작
function admin_(d) {
  if (String(d.key || '') !== ADMIN_KEY) return { ok: false, error: 'key' };
  var lock = LockService.getScriptLock(); lock.tryLock(10000);
  try {
    var sh = sheet_();
    var all = readAll_(sh);
    if (d.action === 'list') return { ok: true, items: all.items };

    var row = parseInt(d.row, 10);
    if (!(row >= 2 && row <= sh.getLastRow())) return { ok: false, error: 'row' };
    var col = function (k) { var i = all.idx[FIELD[k]]; return i === undefined ? 0 : i + 1; };

    if (d.action === 'status') {
      if (!col('status')) return { ok: false, error: 'nocol' };
      sh.getRange(row, col('status')).setValue(String(d.status || ''));
      return { ok: true };
    }
    if (d.action === 'update') {
      var f = d.fields || {};
      if (f.imageData) { try { f.image = saveImage_({ imageData: f.imageData, imageType: f.imageType, name: f.name }); } catch (err) {} }
      for (var k in f) if (FIELD[k] && k !== 'date' && col(k)) sh.getRange(row, col(k)).setValue(String(f[k] == null ? '' : f[k]));
      return { ok: true, image: f.image || '' };
    }
    if (d.action === 'delete') { sh.deleteRow(row); return { ok: true }; }
    return { ok: false, error: 'action' };
  } finally { lock.releaseLock(); }
}

// 인명부 읽기 (공개)
function doGet(e) {
  var all = readAll_(sheet_());
  var out = all.items.filter(function (o) { return SHOW.indexOf(o.status) >= 0; })
    .map(function (o) { var c = {}; for (var k in o) if (k !== 'row' && k !== 'date') c[k] = o[k]; return c; });
  return json_(out);
}
