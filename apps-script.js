// ★ 달빛여관 신청함 + 인명부 — Google Apps Script
// 이 파일 내용 전체를 Apps Script 편집기에 붙여넣으세요.
// - doPost : 사이트에서 보낸 신청을 시트에 "심사중"으로 저장
// - doGet  : 상태가 활동중/휴면/소멸 인 캐릭터를 JSON으로 돌려줌 (인명부가 읽음)

var HEADERS = ['날짜','상태','이름','오너','이모지','종족','출신','모티프','소속','거점','직책','법기','랭크','외형','이야기','법기설명','한줄'];
var SHOW = ['활동중','휴면','소멸'];   // 인명부에 보여줄 상태 ("심사중"은 안 보임)

function sheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sh.getLastRow() === 0) {              // 빈 시트면 제목행 자동 생성
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

// 신청 저장
function doPost(e) {
  var sh = sheet_();
  var d = JSON.parse(e.postData.contents);
  sh.appendRow([
    d._date || new Date().toLocaleString('ko-KR'),
    '심사중',
    d.name || '', d.owner || '', d.emoji || '',
    d.kind || '', d.origin || '', d.motif || '',
    d.affiliation || '', d.base || '', d.role || '',
    d.artifact || '', d.rank || '',
    d.look || '', d.story || '', d.artifactDesc || '', d.line || ''
  ]);
  return ContentService.createTextOutput('ok');
}

// 인명부 읽기
function doGet(e) {
  var sh = sheet_();
  var rows = sh.getDataRange().getValues();
  var head = rows.shift().map(function (h) { return String(h).trim(); });
  var idx = {};
  head.forEach(function (h, i) { idx[h] = i; });
  function g(r, k) { var i = idx[k]; return i === undefined ? '' : String(r[i] == null ? '' : r[i]).trim(); }

  var out = [];
  rows.forEach(function (r) {
    if (r.join('') === '') return;
    var st = g(r, '상태');
    if (SHOW.indexOf(st) < 0) return;
    out.push({
      name: g(r, '이름'), owner: g(r, '오너'), emoji: g(r, '이모지'),
      kind: g(r, '종족'), origin: g(r, '출신'), motif: g(r, '모티프'),
      affiliation: g(r, '소속'), base: g(r, '거점'), role: g(r, '직책'),
      artifact: g(r, '법기'), rank: g(r, '랭크'),
      look: g(r, '외형'), story: g(r, '이야기'), artifactDesc: g(r, '법기설명'), line: g(r, '한줄'),
      status: st
    });
  });
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
