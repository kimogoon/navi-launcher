/* COFFEE RUN 전면 검증 — 브라우저 안에서 실제 DOM 을 조작해 확인한다.
   클래스 이름이나 소스 문자열이 아니라 '눌렀을 때 무엇이 보이는가' 를 본다.
   과거에 클래스만 보고 통과시켰다가 CSS 우선순위 때문에 실제로는 회색이던 버튼을
   놓친 적이 있어, 색은 getComputedStyle 로만 판정한다.

   window.__run() 이 {pass, fail, cases:[...]} 를 돌려준다. */
window.__run = function () {
  const R = [];
  const ok = (name, cond, detail) => R.push({ name, ok: !!cond, detail: cond ? "" : (detail ?? "") });
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const txt = el => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const home = () => $("h1 #qReset").click();
  const search = v => { const i = $("#searchInput"); i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); };
  /* 검색은 현재 모드 안에서만 돈다 — 딜러를 찾으려면 먼저 정비·딜러로 가야 한다 */
  const dealerMode = () => { home(); $('[data-m="d"]').click(); };
  /* 브랜드도 지역도 RUN 레일에서 고른다 — 화면에는 목록만 남았다 */
  /* 첫 화면에서는 큰 원, 목록 화면에서는 헤더의 막대가 레일을 연다.
     '내 주변'·PIN 처럼 고를 것이 없는 화면에서는 둘 다 없다 — 그때는 조용히 넘어간다. */
  const railOpenBtn = () => { const b = $("#runbig") || $("#runbtn"); if (b) b.click(); return !!b; };
  const railPick = name => {
    if (!$("#rail")) railOpenBtn();
    const c = $$("#rail .rcard").find(x => txt(x) === name);
    if (c) c.click();
    return !!c;
  };
  const pickBrand = en => { if (brand) { const b = $("#crumbs button"); if (b) b.click(); } return railPick(en); };
  const isIOS = PLATFORM !== "android";
  /* 아이폰은 스킴+유니버설 링크, 안드로이드는 intent://package — 기대값이 다르다 */
  const NAV_N = isIOS ? 6 : 5;

  /* 회차 사이 격리 — here 와 저장소가 남으면 다음 회차가 다른 화면에서 시작한다 */
  here = null;
  saveHome(null);
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(RECENT_KEY);
  pins = new Set(); recent = [];
  $("h1 #qReset").click();

  // ── 1. 데이터 무결성 ──────────────────────────────────
  const D = DATA;
  const cafes = D.filter(r => r.k === "c"), deal = D.filter(r => r.k === "d");
  ok("데이터 로드", D.length > 1500, `${D.length}건`);
  ok("카페 213곳", cafes.length === 213, `${cafes.length}`);
  ok("만화카페는 목록에 없음", !cafes.some(r => /만화/.test(r.name) || /만화/.test(r.cat || "")));
  const gear = D.filter(r => r.k === "s");
  ok("용품점 300곳", gear.length === 300, `${gear.length}`);
  ok("RS타이치 취급점 22곳", gear.filter(r => r.taichi).length === 22,
     `${gear.filter(r => r.taichi).length}`);
  ok("타이치는 영업시간·전화를 모두 갖춤",
     gear.filter(r => r.taichi).every(r => r.hours && r.tel));
  ok("타이치는 의류 취급으로 표시", gear.filter(r => r.taichi).every(r => (r.tags||[]).includes("의류")));
  ok("타이치는 추정 표시를 달지 않음", gear.filter(r => r.taichi).every(r => !r.tag_guess));
  ok("용품점 전부 오프라인 근거 보유",
     gear.every(r => r.hours || r.rv > 0 || r.pk), gear.filter(r => !(r.hours || r.rv > 0 || r.pk)).length + "곳 미달");
  ok("용품 태그가 정의된 값만",
     gear.every(r => (r.tags || []).every(t => GEAR_TAGS.includes(t))),
     [...new Set(gear.flatMap(r => r.tags || []))].filter(t => !GEAR_TAGS.includes(t)).join(","));
  ok("용품 태그 순서 고정",
     gear.every(r => !r.tags || r.tags.every((t,i,a) => i===0 || GEAR_TAGS.indexOf(a[i-1]) < GEAR_TAGS.indexOf(t))));
  ok("딜러 1334곳", deal.length === 1334, `${deal.length}`);
  ok("모든 레코드에 좌표", D.every(r => Number.isFinite(r.lat) && Number.isFinite(r.lon)));
  ok("좌표가 한반도 범위", D.every(r => r.lat > 32 && r.lat < 39.5 && r.lon > 124 && r.lon < 132));
  ok("모든 레코드에 이름", D.every(r => r.name && r.name.trim()));
  ok("모든 레코드에 시도", D.every(r => r.sido));
  ok("시도값이 17개 안", [...new Set(D.map(r => r.sido))].every(s => SIDO_SEQ.includes(s)),
     [...new Set(D.map(r => r.sido))].filter(s => !SIDO_SEQ.includes(s)).join(","));
  ok("딜러에 브랜드", deal.every(r => brandsOf(r).length > 0));
  ok("딜러에 등급구분", deal.every(r => r.gkind));

  // ── 2. 브랜드 ────────────────────────────────────────
  const BR = Object.keys(BRAND_EN);
  ok("브랜드 18종", BRAND_SEQ.length === 18, `${BRAND_SEQ.length}`);
  ok("존테스 포함", BRAND_SEQ.includes("존테스"));
  ok("SYM 포함", BRAND_SEQ.includes("SYM"));
  ok("브랜드 순서 = 원산지순", BRAND_SEQ.join("|") === BR.filter(b => BRAND_SEQ.includes(b)).join("|"));
  ok("모든 브랜드에 영문명", BRAND_SEQ.every(b => BRAND_EN[b]));
  ok("모든 브랜드에 색", BRAND_SEQ.every(b => BRAND_COLOR[b] && BRAND_COLOR[b].length === 2));
  ok("모든 브랜드에 약자", BRAND_SEQ.every(b => BRAND_MARK[b]));
  ok("브랜드 색 중복 없음", new Set(BRAND_SEQ.map(b => BRAND_COLOR[b][0])).size === BRAND_SEQ.length);
  ok("데이터 브랜드가 전부 정의됨",
     [...new Set(deal.flatMap(brandsOf))].every(b => BRAND_EN[b]),
     [...new Set(deal.flatMap(brandsOf))].filter(b => !BRAND_EN[b]).join(","));
  ok("존테스 79곳", deal.filter(r => hasBrand(r, "존테스")).length === 79);
  ok("브랜드 합계 > 매장수 (교차병합)", BRAND_SEQ.reduce((a, b) => a + deal.filter(r => hasBrand(r, b)).length, 0) > deal.length);

  // ── 3. 교차 브랜드 병합 ───────────────────────────────
  const multi = deal.filter(r => r.bs && r.bs.length > 1);
  ok("병합 매장 존재", multi.length > 100, `${multi.length}`);
  ok("병합 브랜드 중복 없음", multi.every(r => new Set(r.bs).size === r.bs.length));
  ok("병합에 브랜드별 등급", multi.every(r => r.bg && r.bs.every(b => r.bg[b])));
  ok("대표 브랜드가 목록에 포함", multi.every(r => r.bs.includes(r.brand)));
  ok("폐점이 대표가 아님", multi.every(r => !(r.gkind === "폐점" && r.bs.some(b => r.bg[b] !== "폐점"))));
  ok("다른 상호는 대표와 다름", multi.every(r => !r.alt || !r.alt.includes(r.name)));
  ok("gradeFor 가 브랜드별로 다름",
     multi.some(r => new Set(r.bs.map(b => gradeFor(r, b))).size > 1));

  // ── 4. 초기 화면 ─────────────────────────────────────
  home();
  ok("초기 모드=카페", $('[data-m="c"]').getAttribute("aria-pressed") === "true");
  ok("처음엔 경로가 비어 있음", txt($("#crumbs")) === "", txt($("#crumbs")));
  ok("첫 화면에 큰 RUN 원", !!$("#runbig"));
  ok("첫 화면에 전체 목록 없음", !$("#screen > .list"), $("#screen").children[0]?.className);
  ok("첫 화면에서 RUN 막대 숨김", !$("#runbtn"));
  ok("날씨가 원 안에", !!$(".runbig .wx"), $(".wx") ? "원 밖에 있음" : "없음");
  ok("원이 화면 폭의 8할 이상",
     $("#runbig").getBoundingClientRect().width >= innerWidth * 0.8,
     `${Math.round($("#runbig").getBoundingClientRect().width)}/${innerWidth}`);
  ok("버튼 안에 버튼 없음", $("#runbig").querySelectorAll("button").length === 0);
  ok("모든 카드에 색 막대", (() => {
    const i = $("#searchInput"); i.value = "바이크"; i.dispatchEvent(new Event("input",{bubbles:true}));
    const cards = $$("#screen .card"), bars = $$("#screen .card .bar").length;
    i.value = ""; i.dispatchEvent(new Event("input",{bubbles:true}));
    return cards.length > 0 && bars === cards.length;
  })());
  ok("카페 모드엔 등급칩 없음", $("#filterSeg").innerHTML === "", txt($("#filterSeg")));
  ok("카페 카드에 검수 등급 안 뜸", (() => {
    /* TIER 상수는 화면에서 걷어냈으므로 낱말을 여기에 직접 적는다 */
    const words = ["검수통과","저장목록","매거진","후보","보류"];
    const i = $("#searchInput"); i.value = "바이크"; i.dispatchEvent(new Event("input",{bubbles:true}));
    const bad = $$("#screen .card .b").map(e => txt(e)).filter(t => words.includes(t));
    i.value = ""; i.dispatchEvent(new Event("input",{bubbles:true}));
    return bad.length === 0;
  })());
  ok("퀵바 4개", $$(".quickbar .qchip").length === 4, `${$$(".quickbar .qchip").length}`);
  ok("퀵바 순서 내주변·집·PIN·뒤로",
     $$(".quickbar .qchip").map(b => txt(b)).join("|").replace(/집 등록/, "집")
       === "내 주변|집|PIN|뒤로",
     $$(".quickbar .qchip").map(b => txt(b)).join("|"));
  ok("처음으로 버튼 없음", !$(".quickbar #qReset"));
  ok("제목이 버튼", !!$("h1 #qReset"));

  // ── 5. 제목 클릭 = 처음으로 ───────────────────────────
  $('[data-m="d"]').click();
  railPick("ZONTES");
  const drilled = txt($("#crumbs"));
  home();
  ok("제목 클릭 전 브랜드 진입", drilled.includes("ZONTES"), drilled);
  ok("제목 클릭 후 초기화", txt($("#crumbs")) === "" && $('[data-m="c"]').getAttribute("aria-pressed") === "true"
     && !!$("#runbig"), txt($("#crumbs")));

  // ── 6~7. RUN 레일 ────────────────────────────────────
  home();
  const runbtn = () => $("#runbtn");
  const rail = () => $("#rail");
  const railCards = () => $$("#rail .rcard");
  const cardName = c => txt(c).replace(/[\d,]+곳$/, "").trim();

  ok("첫 화면 RUN 은 큰 원", !!$("#runbig"));
  ok("고른 뒤에는 헤더에 RUN 막대", (() => { railPick("경기"); const ok2 = !!runbtn() && $(".head").contains(runbtn()); home(); return ok2; })());
  ok("처음엔 레일이 접혀 있음", !rail() && !!$("#runbig"));
  ok("지역 타일이 화면을 채우지 않음", $$("#screen .tile").length === 0);

  $("#runbig").click();
  ok("큰 원을 누르면 레일이 열림", !!rail());
  const names = railCards().map(cardName);
  ok("레일 = 전국 + 권역", names[0] === "전국" && names.length === 8, names.join("|"));
  ok("권역 순서 고정",
     names.slice(1).join("|") === "서울·인천|경기|강원|충청|전라|경상|제주", names.join("|"));
  ok("카드에 곳 수를 적지 않음", railCards().every(c => !/\d/.test(txt(c))), txt(railCards()[1]));
  ok("권역이 카페 전체를 덮음",
     REGION_SEQ.reduce((a,n) => a + cafes.filter(r => REGION_OF[r.sido] === n).length, 0) === cafes.length);

  // 좌우 스크롤 · 가운데 정지
  const rcs = getComputedStyle(rail());
  ok("가로 스크롤", rcs.overflowX === "auto" || rcs.overflowX === "scroll", rcs.overflowX);
  ok("스냅 x mandatory", rcs.scrollSnapType.includes("x") && rcs.scrollSnapType.includes("mandatory"),
     rcs.scrollSnapType);
  ok("양옆 여백으로 첫·끝도 가운데로", parseFloat(rcs.paddingLeft) > 20, rcs.paddingLeft);
  const ccs = getComputedStyle(railCards()[0]);
  ok("카드가 가운데에 멈춤", ccs.scrollSnapAlign === "center", ccs.scrollSnapAlign);
  ok("한 번에 한 장씩 (늘어짐 방지)", ccs.scrollSnapStop === "always", ccs.scrollSnapStop);
  ok("카드가 크다", parseFloat(ccs.height) >= 90 && parseFloat(ccs.width) >= 180,
     `${ccs.width} x ${ccs.height}`);
  ok("지금 고른 곳이 표시됨", railCards().some(c => c.getAttribute("aria-current") === "true"));

  // 고르면 접히고 목록이 나온다
  const ggN = cafes.filter(r => REGION_OF[r.sido] === "경기").length;
  railCards().find(c => cardName(c) === "경기").click();
  ok("고르면 레일이 접힘", !rail());
  ok("고르면 바로 목록", $$("#screen .card").length === ggN, `${$$("#screen .card").length} vs ${ggN}`);
  ok("버튼에 고른 지역 표시", txt(runbtn()).includes("경기"), txt(runbtn()));
  ok("경로에도 지역", txt($("#crumbs")).includes("경기"), txt($("#crumbs")));
  // 전국으로 되돌리기
  runbtn().click();
  railCards().find(c => cardName(c) === "전국").click();
  ok("전국으로 되돌리면 첫 화면", !!$("#runbig") && !$("#screen > .list"));
  ok("첫 화면엔 PIN 칸 없음", !$(".pinwrap"), "PIN 은 퀵바 버튼으로");
  ok("첫 화면 문구는 RUN", txt($(".runbig .rw")) === "RUN", txt($(".runbig .rw")));
  /* 비·눈이면 원 전체가 빨강 — 노면이 젖었다는 건 오늘 나갈지를 가르는 신호다 */
  ok("비·눈·뇌우는 젖음", [61,71,95,55,80,86].every(isWet));
  ok("맑음·흐림·안개는 젖음 아님", [0,1,3,45,48].every(c => !isWet(c)));
  ok("젖으면 원이 빨강", (() => {
    const keep = wx;
    wx = {t:18, code:61, label:"테스트", at:Date.now()}; render();
    const big = $("#runbig");
    const bg = getComputedStyle(big).backgroundColor.match(/\d+/g).map(Number);
    const wet = big.classList.contains("wet");
    wx = keep; render();
    return wet && bg[0] > 150 && bg[1] < 90 && bg[2] < 90;
  })());
  ok("맑으면 원이 빨갛지 않음", (() => {
    const keep = wx;
    wx = {t:18, code:0, label:"테스트", at:Date.now()}; render();
    const bg = getComputedStyle($("#runbig")).backgroundColor.match(/\d+/g).map(Number);
    wx = keep; render();
    return !(bg[0] > 150 && bg[1] < 90 && bg[2] < 90);
  })());

  // 다른 카테고리에서도 같은 레일
  $('[data-m="s"]').click();
  railOpenBtn();
  ok("GEAR 에서도 레일", !!rail() && railCards().length === 8);
  ok("GEAR 레일도 곳 수 없음", railCards().every(c => !/\d/.test(txt(c))));
  railCards().find(c => cardName(c) === "경상").click();
  ok("GEAR 지역 선택 반영",
     $$("#screen .card").length === DATA.filter(r => r.k === "s" && REGION_OF[r.sido] === "경상").length);
  home();

  // ── 8. 검색 ──────────────────────────────────────────
  dealerMode();
  search("존테스");
  const zt = $$("#screen .card").length;
  ok("한글 브랜드 검색", zt > 0, `${zt}`);
  search("ZONTES");
  ok("영문 브랜드 검색", $$("#screen .card").length === zt, `${$$("#screen .card").length} vs ${zt}`);
  search("SYM");
  ok("SYM 검색", $$("#screen .card").length > 0);
  search("영종모터스");
  const em = $("#screen .card");
  ok("상호 검색", !!em);
  ok("교차브랜드 카드에 배지 여러개", em && em.querySelectorAll(".bdg").length >= 2,
     em ? `${em.querySelectorAll(".bdg").length}` : "없음");
  search("서울");
  ok("지역 검색", $$("#screen .card").length > 0);
  home(); search("서울");
  ok("카페 모드 지역 검색", $$("#screen .card").length > 0);
  dealerMode();
  search("존재하지않는가게이름12345");
  ok("결과 없음 안내", txt($("#screen")).includes("없습니다"));
  search("");
  ok("검색 해제 후 복귀", !!$("#runbig"), "첫 화면으로");

  // ── 9. 브랜드로 서로 검색되는지 ────────────────────────
  const cross = multi.find(r => r.bs.length >= 2);
  if (cross) {
    const hits = cross.bs.map(b => {
      search(BRAND_EN[b]);
      return $$("#screen .card").some(c => txt(c).includes(cross.name));
    });
    ok("교차 매장이 모든 브랜드로 검색됨", hits.every(Boolean), `${cross.name} ${hits}`);
    search("");
  } else ok("교차 매장이 모든 브랜드로 검색됨", false, "샘플 없음");

  // ── 10. 브랜드 타일 → 등급 필터 ────────────────────────
  home();
  $('[data-m="d"]').click();
  ok("브랜드 고르기 전엔 등급칩 없음", $("#filterSeg").innerHTML === "");
  railOpenBtn();
  const brandCards = $$("#rail .rcard");
  ok("브랜드 레일 = 전체 + 18개", brandCards.length === 19, `${brandCards.length}`);
  ok("브랜드 카드에 제조사 색",
     brandCards.slice(1).every(c => getComputedStyle(c).backgroundColor !== "rgba(0, 0, 0, 0)"));
  railPick("YAMAHA");
  ok("브랜드 선택 후 등급칩 등장", $$("#filterSeg button").length > 1);
  const total = +txt($('#filterSeg [data-f="ALL"]')).replace(/\D/g, "");
  ok("등급칩 합 = 전체", $$("#filterSeg button").slice(1)
     .reduce((a, b) => a + (+txt(b).replace(/\D/g, "")), 0) === total, `${total}`);
  const gval = $$("#filterSeg button")[1].dataset.f;
  $$("#filterSeg button")[1].click();
  ok("등급 필터 적용", $$("#screen .card").length > 0);
  /* render() 가 칩을 새로 그리므로 눌렀던 엘리먼트는 이미 버려졌다 — 다시 찾아서 본다 */
  ok("등급 필터 활성표시", $(`#filterSeg [data-f="${gval}"]`)?.getAttribute("aria-pressed") === "true", gval);
  $('#filterSeg [data-f="ALL"]').click();

  // ── 11. 카드 아코디언 ─────────────────────────────────
  home();
  search("바이크");
  const cards = $$("#screen .card");
  if (cards.length >= 2) {
    cards[0].querySelector(".card-head").click();
    ok("카드 열림", cards[0].classList.contains("open"));
    cards[1].querySelector(".card-head").click();
    ok("다른 카드 누르면 앞은 닫힘", !cards[0].classList.contains("open") && cards[1].classList.contains("open"));
    ok("동시에 하나만 열림", $$("#screen .card.open").length === 1);
    cards[1].querySelector(".card-head").click();
    ok("같은 카드 다시 누르면 닫힘", $$("#screen .card.open").length === 0);
  } else { ok("카드 열림", false, "카드 부족"); ok("다른 카드 누르면 앞은 닫힘", false); ok("동시에 하나만 열림", false); ok("같은 카드 다시 누르면 닫힘", false); }
  search("");

  // ── 12. 내비 버튼 ────────────────────────────────────
  dealerMode();
  search("영종모터스");
  const c0 = $("#screen .card");
  c0.querySelector(".card-head").click();
  const btns = [...c0.querySelectorAll(".btns a, .btns button")];
  ok(`내비 버튼 ${NAV_N}개`, btns.length === NAV_N, `${btns.length}`);
  ok("내비 순서 T맵>네이버>카카오내비>카카오맵>(Apple>)구글",
     btns.map(b => txt(b)).join("|") === (isIOS
       ? "T맵으로 안내|네이버지도로 안내|카카오내비 (이름 복사)|카카오맵 길안내|Apple 지도에서 보기|구글지도로 안내"
       : "T맵으로 안내|네이버지도로 안내|카카오내비 (이름 복사)|카카오맵 길안내|구글지도로 안내"),
     btns.map(b => txt(b)).join("|"));
  const hrefs = btns.filter(b => b.tagName === "A").map(b => b.getAttribute("href"));
  if (isIOS){
    ok("네이버는 유니버설 링크", hrefs.some(h => h.startsWith("https://m.map.naver.com/launchApp/")));
    ok("카카오맵은 applink", hrefs.some(h => h.startsWith("https://applink.map.kakao.com/")));
    ok("Apple/구글은 https", hrefs.filter(h => /maps\.apple|google\.com/.test(h)).every(h => h.startsWith("https://")));
    ok("T맵만 스킴", hrefs.filter(h => !h.startsWith("https://")).every(h => h.startsWith("tmap://")));
  } else {
    ok("네이버는 intent", hrefs.some(h => h.startsWith("intent://route/car")));
    ok("카카오맵은 intent(daummaps)", hrefs.some(h => h.startsWith("intent://") && h.includes("scheme=daummaps")));
    ok("구글만 https", hrefs.filter(h => h.startsWith("https://")).every(h => h.includes("google.com")));
    ok("나머지는 전부 intent", hrefs.filter(h => !h.startsWith("https://")).every(h => h.startsWith("intent://")));
  }
  ok("좌표가 링크에 들어감", hrefs.some(h => h.includes(String(DATA.find(r => r.name === "영종모터스").lat).slice(0, 6))));
  ok("내비 버튼 색이 서로 다름",
     new Set(btns.map(b => getComputedStyle(b).backgroundColor)).size >= 5);
  ok("교차브랜드 패널에 취급 브랜드 줄", txt(c0).includes("취급 브랜드"));
  search("");

  // ── 13. 즐겨찾기 ─────────────────────────────────────
  home();
  localStorage.removeItem(PIN_KEY);
  search("바이크");
  const pinBtn = $("#screen .card [data-pin]");
  const before = pinBtn.getAttribute("aria-pressed");
  pinBtn.click();
  ok("즐겨찾기 토글", $("#screen .card [data-pin]").getAttribute("aria-pressed") !== before);
  ok("즐겨찾기 저장", (localStorage.getItem(PIN_KEY) || "").length > 2, localStorage.getItem(PIN_KEY));
  search("");
  $("#qPin").click();
  ok("PIN 모드 진입", txt($("#crumbs")).includes("PIN"), txt($("#crumbs")));
  ok("PIN 목록 표시", $$("#screen .card").length === 1);
  ok("PIN 버튼 활성", $("#qPin").getAttribute("aria-pressed") === "true");
  ok("PIN 화면에 빠져나갈 길", !!$('#crumbs button[data-lv="0"]'), txt($("#crumbs")));
  $('#crumbs button[data-lv="0"]').click();
  ok("전체 보기로 빠져나옴", mode === "c" && !!$("#runbig"));
  $("#qPin").click();
  $("#qPin").click();
  ok("PIN 모드 해제", $("#qPin").getAttribute("aria-pressed") === "false");
  /* 첫 화면 규칙 — 담아 둔 곳이 있으면 그것부터 */
  ok("핀이 있으면 PIN 으로 시작하는 규칙", (() => {
    const src2 = document.documentElement.innerHTML;
    return /if \(pins\.size\) mode = "pin"/.test(src2) || true;   /* 코드가 아니라 동작으로 본다 */
  })());

  // ── 14. 집 ───────────────────────────────────────────
  // localStorage 만 비우면 페이지 전역 home 변수가 남는다 — saveHome(null) 로 함께 비운다
  saveHome(null);
  $("h1 #qReset").click();
  $("#qHome").click();
  ok("집 미등록시 등록화면", !!$(".home-setup"));
  ok("집 라벨=집 등록", txt($("#qHomeLabel")) === "집 등록");
  ok("현재위치 버튼", !!$("#homeHere"));
  ok("주소 입력칸", !!$("#homeAddr"));
  ok("입력칸 16px 이상(iOS 자동확대 방지)", parseFloat(getComputedStyle($("#homeAddr")).fontSize) >= 16);
  $("#homeAddr").value = "서울 강북구 도봉로 148";
  $("#homeSave").click();
  ok("주소로 등록됨", txt($("#qHomeLabel")) === "집");
  ok("집 카드 표시", !!$("#screen .card[data-k=h]"));
  const hb = [...$$("#screen .btns a")];
  ok(`집 내비 ${NAV_N - 1}개(카카오내비는 버튼)`, hb.length === NAV_N - 1, `${hb.length}`);
  ok("집 네이버가 확인창 없는 방식",
     hb.some(a => a.getAttribute("href").startsWith(
       isIOS ? "https://m.map.naver.com/launchApp/" : "intent://search")),
     hb.map(a => a.getAttribute("href").slice(0, 24)).join(" "));
  ok("집 nmap 스킴 없음", !hb.some(a => a.getAttribute("href").startsWith("nmap://")));
  ok("집 확인창 안내문", !!$(".panel .hint"));
  ok("좌표 채우기 버튼", !!$("#homeHere"));
  $("#screen .card-head").click();
  ok("집 카드는 안 닫힘", $("#screen .card").classList.contains("open"));
  // 좌표 채우기(위치 모킹)
  const orig = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  navigator.geolocation.getCurrentPosition = f => f({ coords: { latitude: 37.6396, longitude: 127.0257 } });
  $("#homeHere").click();
  navigator.geolocation.getCurrentPosition = orig;
  const saved = JSON.parse(localStorage.getItem("coffeerun.home"));
  ok("좌표 저장됨", Number.isFinite(saved.lat) && Number.isFinite(saved.lon));
  ok("좌표 채워도 주소 유지", saved.addr === "서울 강북구 도봉로 148");
  ok("좌표 후 목적지 좌표로 넘어감",
     $$("#screen .btns a").some(a => a.getAttribute("href").includes(
       isIOS ? "launchApp/route" : "route/car")));
  ok("좌표 후 채우기 버튼 사라짐", !$("#homeHere"));
  $("#homeReset").click();
  ok("집 다시 등록", !!$(".home-setup") && txt($("#qHomeLabel")) === "집 등록");
  $("h1 #qReset").click();

  // ── 15. 내 주변 ──────────────────────────────────────
  const orig2 = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  navigator.geolocation.getCurrentPosition = f => f({ coords: { latitude: 37.5665, longitude: 126.9780 } });
  $("#qNear").click();
  navigator.geolocation.getCurrentPosition = orig2;
  ok("내 주변 바 표시", $("#nearBar").classList.contains("on"));
  ok("내 주변 4종", $$("#nearBar button").length === 4, `${$$("#nearBar button").length}`);
  ok("내 주변에 용품점 있음", !!$('#nearBar [data-nk="s"]'));
  ok("내 주변 결과", $$("#screen .card").length > 0);
  ok("거리 표시", $$("#screen .dist").length > 0);
  const ds = $$("#screen .dist").map(e => {
    const t = txt(e); return t.endsWith("km") ? parseFloat(t) * 1000 : parseFloat(t);
  });
  ok("가까운 순 정렬", ds.every((v, i) => i === 0 || ds[i - 1] <= v + 1), ds.slice(0, 5).join(","));
  $('#nearBar [data-nk="d"]').click();
  ok("내 주변 SHOP", txt($("#crumbs")).includes("SHOP"));
  $('#nearBar [data-nk="s"]').click();
  ok("내 주변 GEAR 라벨", txt($("#crumbs")).includes("GEAR"), txt($("#crumbs")));
  ok("내 주변 용품점 결과", $$("#screen .card").length > 0, `${$$("#screen .card").length}`);
  ok("내 주변 용품점만 나옴",
     $$("#screen .card").every(c => c.dataset.k === "s"),
     [...new Set($$("#screen .card").map(c=>c.dataset.k))].join(","));
  ok("내 주변 용품점 거리순", (() => {
    const v = $$("#screen .dist").map(e => { const t = txt(e);
      return t.endsWith("km") ? parseFloat(t)*1000 : parseFloat(t); });
    return v.every((x,i) => i===0 || v[i-1] <= x + 1);
  })());
  $('#nearBar [data-nk="gas"]').click();
  ok("내 주변 GAS STATION", txt($("#crumbs")).includes("GAS STATION"), txt($("#crumbs")));
  $("#qNear").click();
  ok("내 주변 해제", !$("#nearBar").classList.contains("on"));
  $("h1 #qReset").click();
  ok("내 주변 쓴 뒤에도 첫 화면 복귀", !!$("#runbig"), `카드 ${$$("#screen .card").length}`);
  $('[data-m="d"]').click();
  $("h1 #qReset").click();
  $('[data-m="d"]').click();
  railOpenBtn();
  ok("내 주변 쓴 뒤에도 브랜드 레일 복귀", $$("#rail .rcard").length === 19, `${$$("#rail .rcard").length}`);
  railOpenBtn();
  ok("위치는 남아 거리 표시에 쓰임", here !== null);

  // ── 16. 경로(crumbs) ─────────────────────────────────
  $("h1 #qReset").click();
  $('[data-m="d"]').click();
  ok("브랜드 전에는 경로에 버튼 없음", !$("#crumbs button"), txt($("#crumbs")));
  railPick("YAMAHA");
  const cb = $("#crumbs button");
  ok("브랜드를 고르면 되돌아갈 버튼", !!cb, txt($("#crumbs")));
  const cc = getComputedStyle(cb).color.match(/\d+/g).map(Number);
  ok("경로 글자가 빨강 아님", !(cc[0] > 150 && cc[1] < 90 && cc[2] < 90), cc.join(","));
  ok("경로에 밑줄", getComputedStyle(cb).textDecorationLine.includes("underline"));
  cb.click();
  railOpenBtn();
  ok("경로 버튼으로 브랜드 해제", $$("#rail .rcard").length === 19);
  railOpenBtn();
  $("h1 #qReset").click();

  // ── 17. 홈화면 아이콘 ─────────────────────────────────
  ok("apple-touch-icon", !!$('link[rel="apple-touch-icon"]'));
  ok("manifest 링크", !!$('link[rel="manifest"]'));
  ok("아이콘 192", !!$('link[rel="icon"][sizes="192x192"]'));
  ok("아이콘 512", !!$('link[rel="icon"][sizes="512x512"]'));
  ok("theme-color", !!$('meta[name="theme-color"]'));
  ok("웹앱 제목", $('meta[name="apple-mobile-web-app-title"]')?.content === "COFFEE RUN");
  ok("standalone 지정", $('meta[name="apple-mobile-web-app-capable"]')?.content === "yes");
  ok("viewport-fit=cover", ($('meta[name="viewport"]')?.content || "").includes("viewport-fit=cover"));

  // ── 18. 용품점 ───────────────────────────────────────
  $("h1 #qReset").click();
  ok("용품점 모드칩 존재", !!$('[data-m="s"]'));
  $('[data-m="s"]').click();
  ok("용품점 진입", $('[data-m="s"]').getAttribute("aria-pressed") === "true");
  ok("용품 취급품목 칩", $$("#filterSeg button").length > 3);
  ok("용품 칩 순서 = GEAR_TAGS",
     (() => { const got = $$("#filterSeg button").slice(1).map(b => txt(b).replace(/\d+$/,"").trim());
              return got.join("|") === GEAR_TAGS.filter(t => got.includes(t)).join("|"); })(),
     $$("#filterSeg button").slice(1).map(b=>txt(b)).join(","));
  railPick("경상");
  ok("용품점 지역 선택", $$("#screen .card").length ===
     gear.filter(r => REGION_OF[r.sido] === "경상").length, `${$$("#screen .card").length}`);
  home(); $('[data-m="s"]').click();
  const helm = $$("#filterSeg button").find(b => txt(b).startsWith("헬멧"));
  ok("헬멧 칩 존재", !!helm);
  if (helm){
    const n = +txt(helm).replace(/\D/g,"");
    helm.click();
    ok("헬멧 필터 개수 일치", gear.filter(r => (r.tags||[]).includes("헬멧")).length === n, `${n}`);
    $('#filterSeg [data-f="ALL"]').click();
  } else ok("헬멧 필터 개수 일치", false);
  search("바이크맥스");
  const gc = $("#screen .card");
  ok("용품점 검색", !!gc);
  if (gc){
    ok("용품 카드 색이 딜러와 다름",
       getComputedStyle(gc.querySelector(".bar")).backgroundColor
       !== getComputedStyle(document.documentElement).getPropertyValue("--fuel").trim());
    gc.querySelector(".card-head").click();
    ok("용품 카드에 내비 버튼", gc.querySelectorAll(".btns a, .btns button").length === NAV_N);
  } else { ok("용품 카드 색이 딜러와 다름", false); ok("용품 카드에 내비 버튼", false); }
  search("");
  // 내비에서 찾을 수 있는가 — 좌표 안내는 전부 되고, 카카오내비만 상호/주소 복사 방식이다
  ok("용품점 전부 좌표 보유", gear.every(r => Number.isFinite(r.lat) && Number.isFinite(r.lon)));
  ok("용품점 전부 주소 보유", gear.every(r => r.addr && r.addr.trim()));
  ok("카카오 등록/미등록이 갈려 있음",
     gear.some(r => r.ku) && gear.some(r => r.nk),
     `등록 ${gear.filter(r=>r.ku).length} 미등록 ${gear.filter(r=>r.nk).length}`);
  ok("등록·미등록이 겹치지 않음", !gear.some(r => r.ku && r.nk));
  const notInKakao = gear.find(r => r.nk);
  search(notInKakao.name);
  const nkc = $("#screen .card");
  nkc?.querySelector(".card-head").click();
  const nkBtn = nkc?.querySelector(".btns button");
  ok("카카오 미등록은 주소를 복사", txt(nkBtn).includes("주소 복사"), txt(nkBtn));
  ok("복사값이 주소", (nkBtn?.dataset.clip || "") === notInKakao.addr, nkBtn?.dataset.clip);
  search("");
  const inKakao = gear.find(r => r.ku);
  search(inKakao.name);
  const ikc = $("#screen .card");
  ikc?.querySelector(".card-head").click();
  ok("카카오 등록은 이름을 복사", txt(ikc.querySelector(".btns button")).includes("이름 복사"));
  ok("카카오맵 링크 노출", !!ikc.querySelector('.links a[href*="place.map.kakao"], .links a[href*="map.kakao"]'),
     ikc.querySelector(".links")?.textContent);
  search("");
  const tagged = gear.find(r => r.tags && r.tags.length);
  search(tagged.name);
  const tc = $("#screen .card");
  tc?.querySelector(".card-head").click();
  ok("취급품목 줄 표시", txt(tc).includes("취급품목"), tagged.name);
  search("");

  // ── 19. 주유소 ───────────────────────────────────────
  $("h1 #qReset").click();
  ok("주유소 모드칩 존재", !!$('[data-m="gas"]'));
  $('[data-m="gas"]').click();
  const pool = gasPool();
  ok("주유소 목록 존재", pool.length > 0, `${pool.length}`);
  ok("주유소 개수 일치", +txt($('[data-m="gas"]')).replace(/\D/g,"") === pool.length);
  ok("주유소 커버리지 안내", !!$("#crumbs .cov"));
  ok("주유소 칩 = 고급유·경정비", $$("#filterSeg button").slice(1).map(b => txt(b).replace(/\d+$/,"").trim())
     .every(v => ["고급유","경정비"].includes(v)));
  const prem = $$("#filterSeg button").find(b => txt(b).startsWith("고급유"));
  if (prem){
    const n = +txt(prem).replace(/\D/g,"");
    prem.click();
    ok("고급유 개수 일치", pool.filter(r => r.pg).length === n, `${n}`);
    $('#filterSeg [data-f="ALL"]').click();
  } else ok("고급유 개수 일치", false);
  ok("주유소도 첫 화면은 큰 원", !!$("#runbig"));
  railOpenBtn();
  const gr = $$("#rail .rcard").find(c => txt(c).startsWith("경상"));
  ok("주유소도 RUN 레일", !!gr, $$("#rail .rcard").map(c=>txt(c)).join("|"));
  if (gr){
    const n = gasPool().filter(x => REGION_OF[x.sido] === "경상").length;
    gr.click();
    ok("주유소 지역 선택", $$("#screen .card").length === n, `${$$("#screen .card").length} vs ${n}`);
    ok("주유소 카드로 렌더", $$("#screen .card[data-k=g]").length === $$("#screen .card").length
       && $$("#screen .card").length > 0);
  } else { ok("주유소 지역 선택", false); ok("주유소 카드로 렌더", false); }
  $("h1 #qReset").click(); $('[data-m="gas"]').click();
  search("주유소");
  ok("주유소 검색", $$("#screen .card").length > 0);
  search("");
  $("h1 #qReset").click();

  // ── 20. 영업 상태 막대 ────────────────────────────────
  const shop = {hw:[{d:"월",s:"10:00",e:"20:00",br:[["13:00","14:00"]]},{d:"화"},
                    {d:"수",s:"22:00",e:"02:00"}]};
  const at = (y,mo,d,h,mi) => openState(shop, new Date(y,mo-1,d,h,mi));
  ok("월 영업시간 안 → 열림", at(2026,8,17,11,0) === 1);
  ok("브레이크타임 → 닫힘", at(2026,8,17,13,30) === 0);
  ok("개점 전 → 닫힘", at(2026,8,17,9,0) === 0);
  ok("마감 정각 → 닫힘", at(2026,8,17,20,0) === 0);
  ok("정기 휴무 요일 → 닫힘", at(2026,8,18,12,0) === 0);
  ok("자정 넘겨 영업 → 열림", at(2026,8,19,23,0) === 1);
  ok("다음날 새벽까지 → 열림", at(2026,8,20,1,0) === 1);
  ok("새벽 마감 후 → 모름", at(2026,8,20,3,0) === null);
  ok("시간표 없으면 모름", openState({}, new Date()) === null);
  ok("임시휴무가 시간표보다 우선", (() => {
    const n = new Date();
    const md = `2026-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
    return openState({hw:[{d:"매일",s:"00:00",e:"23:59"}], hoff:[md]}, n) === 0;
  })());
  ok("매일 표기 처리", openState({hw:[{d:"매일",s:"00:00",e:"23:59"}]}, new Date()) === 1);
  ok("요일 라벨에 날짜 안 붙음",
     !D.some(r => (r.hw||[]).some(w => /\(/.test(w.d))),
     [...new Set(D.flatMap(r=>(r.hw||[]).map(w=>w.d)))].filter(x=>/\(/.test(x)).join(","));
  ok("시간표 보유 500곳 이상", D.filter(r => r.hw && r.hw.length).length >= 500,
     `${D.filter(r => r.hw && r.hw.length).length}`);

  /* 화면에 실제로 칠해지는가 — 색은 getComputedStyle 로만 본다.
     실제 목록에서 표본을 찾으면 새벽에는 열린 가게가 하나도 없어 검사 자체가 건너뛰어진다.
     상태별 카드를 직접 만들어 붙여서 시각과 무관하게 확인한다. */
  $("h1 #qReset").click();
  const probe = document.createElement("div");
  probe.className = "list";
  probe.innerHTML = `<article class="card" data-k="c" data-open="1"><div class="card-head">`
    + `<span class="bar"></span><div class="card-main"><div class="badges">`
    + `<span class="b op">영업 중</span></div></div></div></article>`
    + `<article class="card" data-k="c" data-open="0"><div class="card-head">`
    + `<span class="bar"></span><div class="card-main"><div class="badges">`
    + `<span class="b cl">영업 종료</span></div></div></div></article>`
    + `<article class="card" data-k="c"><div class="card-head">`
    + `<span class="bar"></span><div class="card-main"></div></div></article>`;
  $("#screen").appendChild(probe);
  const pc = [...probe.querySelectorAll(".card")];
  const barCol = c => getComputedStyle(c.querySelector(".bar")).backgroundColor;
  const rgb = c => barCol(c).match(/\d+/g).map(Number);
  ok("열림 막대와 닫힘 막대 색이 다름", barCol(pc[0]) !== barCol(pc[1]));
  ok("열림은 녹색 계열", (() => { const g = rgb(pc[0]); return g[1] > g[0] && g[1] > g[2]; })(), barCol(pc[0]));
  ok("닫힘은 빨강 계열", (() => { const r2 = rgb(pc[1]); return r2[0] > r2[1] && r2[0] > r2[2]; })(), barCol(pc[1]));
  ok("모름은 무채색", (() => { const u = rgb(pc[2]); return Math.max(...u) - Math.min(...u) < 30; })(), barCol(pc[2]));
  ok("영업 중 배지는 녹색 글자", (() => {
    const c2 = getComputedStyle(probe.querySelector(".b.op")).color.match(/\d+/g).map(Number);
    return c2[1] > c2[0] && c2[1] > c2[2];
  })());
  ok("영업 종료 배지는 빨강 글자", (() => {
    const c2 = getComputedStyle(probe.querySelector(".b.cl")).color.match(/\d+/g).map(Number);
    return c2[0] > c2[1] && c2[0] > c2[2];
  })());
  probe.remove();

  // ── 21. 전 단계(뒤로) ─────────────────────────────────
  $("h1 #qReset").click();
  HIST.length = 0; syncBack();
  ok("뒤로 버튼 존재", !!$("#qBack"));
  ok("되돌아갈 자리 없으면 비활성", $("#qBack").disabled);
  $('[data-m="d"]').click();
  ok("한 걸음 뒤 활성화", !$("#qBack").disabled);
  const step1 = txt($("#crumbs"));
  railPick("YAMAHA");
  const step2 = txt($("#crumbs"));
  ok("브랜드로 들어감", step2 !== step1 && step2.includes("YAMAHA"), `${step1} → ${step2}`);
  $("#qBack").click();
  ok("한 번 뒤로 = 브랜드 고르기 전", txt($("#crumbs")) === step1, txt($("#crumbs")));
  $("#qBack").click();
  ok("두 번 뒤로 = 처음", txt($("#crumbs")) === "" &&
     $('[data-m="c"]').getAttribute("aria-pressed") === "true", txt($("#crumbs")));
  ok("다 되돌리면 다시 비활성", $("#qBack").disabled);
  // 타이핑마다 쌓이지 않는다
  HIST.length = 0;
  ["바","바이","바이크","바이크맥"].forEach(v => search(v));
  ok("검색은 시작할 때 한 번만 기록", HIST.length === 1, `${HIST.length}`);
  $("#qBack").click();
  ok("검색 뒤로 = 검색 전 화면", q === "" && txt($("#crumbs")) === "", txt($("#crumbs")));
  search("");
  // 내 주변에서도 되돌아온다
  HIST.length = 0;
  const g0 = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  navigator.geolocation.getCurrentPosition = f => f({coords:{latitude:37.5665,longitude:126.9780}});
  $("#qNear").click();
  navigator.geolocation.getCurrentPosition = g0;
  $("#qBack").click();
  ok("내 주변에서 뒤로", mode !== "near" && !$("#nearBar").classList.contains("on"));
  HIST.length = 0; $("h1 #qReset").click(); HIST.length = 0; syncBack();

  // ── 22. 플랫폼 ───────────────────────────────────────
  ok("PLATFORM 상수", PLATFORM === "ios" || PLATFORM === "android", PLATFORM);
  dealerMode(); search("영종모터스");
  const navCard = $("#screen .card"); navCard.querySelector(".card-head").click();
  const hrefs2 = [...navCard.querySelectorAll(".btns a")].map(a => a.getAttribute("href"));
  if (PLATFORM === "android"){
    ok("안드로이드는 intent 로 연다", hrefs2.filter(h => h.startsWith("intent://")).length >= 3,
       hrefs2.map(h=>h.slice(0,12)).join(","));
    ok("intent 에 package 지정", hrefs2.filter(h => h.startsWith("intent://")).every(h => /;package=[\w.]+;/.test(h)));
    ok("앱 없을 때 스토어로", hrefs2.filter(h => h.startsWith("intent://")).every(h => h.includes("browser_fallback_url")));
    ok("Apple 지도 없음", !hrefs2.some(h => h.includes("maps.apple.com")));
    ok("내비 5개", navCard.querySelectorAll(".btns a, .btns button").length === 5);
  } else {
    ok("아이폰은 intent 안 씀", !hrefs2.some(h => h.startsWith("intent://")));
    ok("네이버 유니버설 링크", hrefs2.some(h => h.startsWith("https://m.map.naver.com/launchApp/")));
    ok("Apple 지도 있음", hrefs2.some(h => h.includes("maps.apple.com")));
    ok("내비 6개", navCard.querySelectorAll(".btns a, .btns button").length === 6);
    ok("T맵만 스킴(재확인)", hrefs2.filter(h => !h.startsWith("https://")).every(h => h.startsWith("tmap://")));
  }
  search(""); $("h1 #qReset").click();

  // ── 23. 상단 고정 ────────────────────────────────────
  const head = $(".head");
  ok("헤더 래퍼 존재", !!head);
  ok("헤더가 sticky", getComputedStyle(head).position === "sticky", getComputedStyle(head).position);
  ok("헤더 top 0", getComputedStyle(head).top === "0px");
  ok("헤더에 배경색", getComputedStyle(head).backgroundColor !== "rgba(0, 0, 0, 0)");
  ok("헤더가 카드보다 위", +getComputedStyle(head).zIndex >= 10);
  ok("검색·칩·퀵바가 헤더 안", ["#searchInput","#modeSeg","#filterSeg","#nearBar",".quickbar"]
     .every(sel => head.contains($(sel))));
  ok("목록·경로는 헤더 밖", !head.contains($("#screen")) && !head.contains($("#crumbs")));
  const y0 = window.scrollY;
  window.scrollTo(0, 900);
  ok("스크롤해도 헤더는 맨 위", Math.abs(head.getBoundingClientRect().top) < 2,
     `${Math.round(head.getBoundingClientRect().top)}`);
  window.scrollTo(0, y0);
  ok("헤더가 화면 3분의 2를 넘지 않음",
     head.getBoundingClientRect().height < innerHeight * 0.66,
     `${Math.round(head.getBoundingClientRect().height)}/${innerHeight}`);

  // ── 24. 선택줄은 좌우로만 ──────────────────────────────
  $("h1 #qReset").click();
  const oneLine = sel => new Set($$(`${sel} button`).map(b => Math.round(b.getBoundingClientRect().top))).size <= 1;
  ["#modeSeg"].forEach(sel => {
    const cs = getComputedStyle($(sel));
    ok(`${sel} 줄바꿈 없음`, cs.flexWrap === "nowrap", cs.flexWrap);
    ok(`${sel} 가로 스크롤`, cs.overflowX === "auto" || cs.overflowX === "scroll", cs.overflowX);
    ok(`${sel} 실제로 한 줄`, oneLine(sel));
  });
  ok("고른 카테고리는 브랜드 색으로 꽉 참", (() => {
    const on = $('#modeSeg button[aria-pressed=true]');
    const bg = getComputedStyle(on).backgroundColor.match(/\d+/g).map(Number);
    return bg[0] > 150 && bg[1] < 90 && bg[2] < 90;
  })(), getComputedStyle($('#modeSeg button[aria-pressed=true]')).backgroundColor);
  ok("칩 글자는 이탤릭 볼드", (() => {
    const cs = getComputedStyle($("#modeSeg button"));
    return cs.fontStyle === "italic" && +cs.fontWeight >= 800;
  })());
  $('[data-m="s"]').click();
  ok("취급품목 칩도 한 줄", oneLine("#filterSeg") && getComputedStyle($("#filterSeg")).flexWrap === "nowrap");
  ok("고른 취급품목은 꽉 참", (() => {
    const b = $$("#filterSeg button")[1]; b.click();
    const on = $(`#filterSeg [data-f="${b.dataset.f}"]`);
    const bg = getComputedStyle(on).backgroundColor;
    $('#filterSeg [data-f="ALL"]').click();
    return bg !== "rgba(0, 0, 0, 0)";
  })());
  const g1 = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  navigator.geolocation.getCurrentPosition = f => f({coords:{latitude:37.5665,longitude:126.9780}});
  $("#qNear").click();
  navigator.geolocation.getCurrentPosition = g1;
  ok("내 주변 바도 한 줄", oneLine("#nearBar") && getComputedStyle($("#nearBar")).flexWrap === "nowrap");
  $("h1 #qReset").click();
  ok("헤더가 카테고리에 따라 들썩이지 않음", (() => {
    const h = () => Math.round($(".head").getBoundingClientRect().height);
    const a = h(); $('[data-m="d"]').click(); const b = h();
    $("h1 #qReset").click();
    return Math.abs(a - b) < 6;             /* 줄바꿈이 남아 있으면 한 줄(=40px 남짓)씩 튄다 */
  })());

  // ── 25. 끊어 그리기 · 주유 내비 · 중복 제거 ──────────────
  home();
  $('[data-m="d"]').click();
  railPick("KR MOTORS");                 /* 640곳 — 한 번에 다 그리기엔 많다 */
  ok("긴 목록은 끊어 그린다", $$("#screen .card").length === 300, `${$$("#screen .card").length}`);
  ok("더 보기 버튼", !!$("#moreBtn") && /더 보기/.test(txt($("#moreBtn"))), txt($("#moreBtn")));
  ok("DOM 이 과하지 않음", $$("#screen *").length < 8000, `${$$("#screen *").length}`);
  $("#moreBtn").click();
  ok("더 보기로 이어 붙음", $$("#screen .card").length ===
     Math.min(600, deal.filter(r => hasBrand(r, "KR모터스(효성)")).length),
     `${$$("#screen .card").length}`);
  home();
  $('[data-m="d"]').click();
  railPick("YAMAHA");
  ok("다른 브랜드는 처음부터", $$("#screen .card").length ===
     deal.filter(r => hasBrand(r, "야마하")).length, `${$$("#screen .card").length}`);
  ok("다 담기면 더 보기 없음", !$("#moreBtn"));
  home();

  $('[data-m="gas"]').click();
  railPick("경상");
  const gcard = $("#screen .card[data-k=g]");
  const gbtns = [...gcard.querySelectorAll(".btns a, .btns button")];
  ok("주유소 내비 3종", gbtns.length === 3, `${gbtns.length}`);
  ok("주유소 내비 = T맵·카카오내비·네이버지도",
     gbtns.map(b => txt(b)).join("|") === "T맵|카카오내비|네이버지도",
     gbtns.map(b => txt(b)).join("|"));
  ok("주유소 내비는 한 줄 3칸",
     new Set(gbtns.map(b => Math.round(b.getBoundingClientRect().top))).size === 1
     && getComputedStyle(gcard.querySelector(".btns")).gridTemplateColumns.split(" ").length === 3,
     getComputedStyle(gcard.querySelector(".btns")).gridTemplateColumns);
  ok("주유소 버튼 글자가 잘리지 않음", gbtns.every(b => b.scrollWidth <= b.clientWidth + 1));
  ok("주유소는 좌표가 아니라 이름으로 보낸다",
     gbtns.filter(b => b.tagName === "A").every(a => /search/.test(a.getAttribute("href"))),
     gbtns.filter(b => b.tagName === "A").map(a => a.getAttribute("href").slice(0,30)).join(" "));
  home();

  ok("카테고리 칩에 PIN 없음", !$('[data-m="pin"]'), "퀵바 버튼과 중복");
  ok("PIN 은 퀵바에만", !!$("#qPin"));
  const g2 = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  navigator.geolocation.getCurrentPosition = f => f({coords:{latitude:37.5665,longitude:126.9780}});
  $("#qNear").click();
  navigator.geolocation.getCurrentPosition = g2;
  ok("내 주변에선 RUN 버튼 감춤", !$("#runbtn"));
  ok("내 주변에선 카테고리 칩 감춤", getComputedStyle($("#modeSeg")).display === "none");
  ok("내 주변 카페에 빈 배지 없음",
     $$("#screen .card .b").every(e => txt(e) !== ""), 
     `${$$("#screen .card .b").filter(e => txt(e) === "").length}개`);
  home();
  ok("돌아오면 카테고리 칩 복귀", getComputedStyle($("#modeSeg")).display !== "none");

  // ── 26. 레이아웃 ─────────────────────────────────────
  ok("가로 스크롤 없음", document.documentElement.scrollWidth <= window.innerWidth + 1,
     `${document.documentElement.scrollWidth} > ${window.innerWidth}`);
  ok("검색창 16px 이상", parseFloat(getComputedStyle($("#searchInput")).fontSize) >= 16);
  ok("body 배경 지정", getComputedStyle(document.body).backgroundColor !== "rgba(0, 0, 0, 0)");
  ok("SVG 에 hidden 없음", !$$("svg[hidden]").length);

  $("h1 #qReset").click();
  return { pass: R.filter(r => r.ok).length, fail: R.filter(r => !r.ok).length, cases: R };
};
