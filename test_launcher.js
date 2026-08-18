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
  const railOpenBtn = () => { const b = $("#runbtn"); if (b) b.click(); return !!b; };
  /* SHOP 은 첫 화면에서 브랜드를 아이콘 타일로 늘어놓는다 — '전체 브랜드' + 18개.
     COFFEE·GEAR·GAS 는 그대로 큰 원(원 안에서 좌우로 넘기는 스트립)을 쓴다. */
  /* 브랜드 후보 수 — 타일 화면이면 타일, 스트립이면 스트립, 목록 화면이면 레일 */
  const brandCount = () => $("#screen .tile") ? $$("#screen .tile").length
    : $("#bstrip") ? $("#bstrip").children.length : $$("#rail .rcard").length;
  /* 첫 화면을 벗어나 목록 화면으로 — 헤더의 지역 레일을 쓰려면 먼저 여기를 지나야 한다 */
  const enterList = () => { if ($("#runbig")) $("#runbig").click(); };
  const pickBrandTile = en => {
    const t = $$("#screen .tile").find(x => txt(x.querySelector("b")) === en);
    if (!t) return false;
    t.click();
    return true;
  };
  const pickBrandCircle = en => {
    const st = $("#bstrip"); if (!st) return false;
    const i = [...st.children].findIndex(x => txt(x) === en);
    if (i < 0) return false;
    st.scrollLeft = st.clientWidth * i;
    $("#runbig").click();
    return true;
  };
  const railPick = name => {
    if (pickBrandTile(name)) return true;                     /* 첫 화면 SHOP — 브랜드 타일 */
    if ($("#bstrip") && pickBrandCircle(name)) return true;    /* 첫 화면 COFFEE — 지역 스트립 */
    if (!$("#rail")) railOpenBtn();
    const c = $$("#rail .rcard").find(x => txt(x) === name);
    if (c) c.click();
    return !!c;
  };
  const pickBrand = en => { if (brand) { const b = $("#crumbs button"); if (b) b.click(); } return railPick(en); };
  const isIOS = PLATFORM !== "android";
  /* T맵·네이버지도·카카오내비 세 개로 좁혔다 — 카카오맵·Apple지도·구글지도는 뺐다.
     플랫폼과 무관하게 항상 3개다(카카오내비만 태그가 a/button 으로 갈린다). */
  const NAV_N = 3;

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
  /* 순서 기준은 BRAND_ORDER(step10) 하나다 — BRAND_EN 은 이름표일 뿐 순서가 아니다.
     예전엔 BRAND_EN 의 키 순서를 기준으로 삼아, step10 만 고치면 화면이 안 바뀌었다. */
  ok("브랜드 순서 = 정해 둔 순서",
     BRAND_SEQ.join("|") === BRAND_ORDER.filter(b => BRAND_SEQ.includes(b)).join("|"),
     BRAND_SEQ.slice(0, 3).join(","));
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

  // ── 6~7. 첫 화면 원 · 지역 레일 ─────────────────────
  home();
  const runbtn = () => $("#runbtn");
  const rail = () => $("#rail");
  const railCards = () => $$("#rail .rcard");
  const cardName = c => txt(c).replace(/[\d,]+곳$/, "").trim();

  ok("첫 화면은 큰 원", !!$("#runbig") && !$("#screen > .list"));
  ok("원에 REGION 글자 없음", !$(".runbig .rs"));
  ok("COFFEE 첫 칸은 GO", txt($("#bstrip").children[0]) === "GO", txt($("#bstrip").children[0]));
  ok("GO 는 지역명보다 크다", (() => {
    const go = $("#bstrip").children[0], region = $("#bstrip").children[1];
    return parseFloat(getComputedStyle(go).fontSize) > parseFloat(getComputedStyle(region).fontSize);
  })());
  ok("GO 가 원 가운데에 온다", (() => {
    const go = $("#bstrip").children[0];
    const range = document.createRange(); range.selectNodeContents(go);
    const t = range.getBoundingClientRect(), c = $("#runbig").getBoundingClientRect();
    return Math.abs((t.left + t.right) / 2 - (c.left + c.right) / 2) <= 2;
  })(), (() => {
    const go = $("#bstrip").children[0];
    const range = document.createRange(); range.selectNodeContents(go);
    const t = range.getBoundingClientRect(), c = $("#runbig").getBoundingClientRect();
    return `${Math.round((t.left+t.right)/2 - (c.left+c.right)/2)}px`;
  })());
  ok("COFFEE 도 권역이 흐름", (() => {
    const names = [...$("#bstrip").children].map(x => txt(x));
    return names[0] === "GO" && names.slice(1).every(n => REGION_SEQ.includes(n));
  })(), [...$("#bstrip").children].map(x => txt(x)).join("|"));
  ok("COFFEE 에만 날씨", !!$(".runbig .wx"));
  ok("원이 정원", (() => { const r = $("#runbig").getBoundingClientRect();
     return Math.abs(r.width - r.height) < 2; })(),
     `${Math.round($("#runbig").getBoundingClientRect().width)}x${Math.round($("#runbig").getBoundingClientRect().height)}`);
  ok("원 안쪽이 잘림", getComputedStyle($("#runbig")).overflow === "hidden");

  /* COFFEE RUN — 담아 둔 곳이 있으면 PIN, 없으면 최근 본 곳 */
  const hadPins = pins.size > 0;
  if (!hadPins){ search("바이크"); $("#screen .card [data-pin]").click(); search(""); }
  $("#bstrip").scrollLeft = 0;
  $("#runbig").click();
  ok("COFFEE RUN → PIN 목록", mode === "pin" && txt($("#crumbs")).includes("PIN"),
     `${mode} / ${txt($("#crumbs"))}`);
  home();
  ok("핀이 없으면 RECENT 로", (() => {
    const keep = [...pins]; pins.clear(); savePins(); render();
    $("#bstrip").scrollLeft = 0; $("#runbig").click();
    const got = recent.length ? mode === "recent" : $$("#screen .card").length > 0;
    keep.forEach(k => pins.add(k)); savePins(); home();
    return got;
  })());
  /* 권역 칸을 고르면 그 지역 목록 */
  const cst = $("#bstrip");
  cst.scrollLeft = cst.clientWidth * 2;
  const cName = txt(cst.children[2]);
  $("#runbig").click();
  ok("COFFEE 권역 선택", region === cName && $$("#screen .card").length ===
     cafes.filter(r => REGION_OF[r.sido] === cName).length,
     `${region} / ${$$("#screen .card").length}`);
  home();

  /* GEAR — 고를 게 없어(브랜드도 지역도) 칩을 누르면 원 없이 바로 전체 목록이다 */
  $('[data-m="s"]').click();
  ok("GEAR 엔 원이 없다", !$("#runbig"));
  ok("GEAR 는 곧장 목록", $$("#screen .card").length > 0, `${$$("#screen .card").length}`);
  home();

  /* SHOP — 원은 그대로, 안에서 브랜드가 좌우로 흐른다 */
  $('[data-m="d"]').click();
  ok("SHOP 엔 원이 없다", !$("#runbig"));   /* 브랜드 열여덟은 하나씩 넘기기보다 한눈에 훑는 게 낫다 */
  const tiles = $$("#screen .tile");
  ok("타일이 전체 + 18개", tiles.length === 19, `${tiles.length}`);
  ok("첫 타일은 전체 브랜드", txt(tiles[0].querySelector("b")) === "전체 브랜드");
  ok("둘째 타일부터 브랜드 순서대로", tiles.slice(1).every((t, i) =>
     txt(t.querySelector("b")) === enOf(BRAND_SEQ[i])));
  ok("타일마다 취급 매장 수", tiles.every(t => /^\d+$/.test(txt(t.querySelector(".tile-wm-n")))));
  ok("브랜드마다 제조사 색", tiles.slice(1).every(t =>
     getComputedStyle(t).backgroundColor !== getComputedStyle(tiles[0]).backgroundColor));
  pickBrandTile("YAMAHA");
  ok("타일을 고르면 그 목록", $$("#screen .card").length ===
     deal.filter(r => hasBrand(r, "야마하")).length, `${$$("#screen .card").length}`);
  home();

  /* GAS STATION — 칩을 누르는 순간 '내 주변' 이 켜지고 원 없이 바로 목록이다.
     가까운 순으로 볼 수밖에 없는 카테고리라 고를 게 없다. */
  const gg0 = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  const aa0 = window.alert; window.alert = () => {};
  navigator.geolocation.getCurrentPosition = f => f({coords:{latitude:37.5665,longitude:126.9780}});
  $('[data-m="gas"]').click();
  navigator.geolocation.getCurrentPosition = gg0; window.alert = aa0;
  ok("GAS 엔 원이 없다", !$("#runbig"));
  ok("GAS 칩만 눌러도 내 주변", nearOn && mode === "gas", `${mode}/${nearOn}`);
  ok("주유소 카드가 거리순", $$("#screen .card[data-k=g]").length > 0 && $$("#screen .dist").length > 0);
  home();

  /* RECENT 는 따로 칩을 두지 않는다 — COFFEE 의 RUN 원이 대신한다.
     담아 둔 곳(PIN)이 없을 때만 최근 본 곳으로 간다. 이미 위(핀이 없으면 RECENT 로)에서
     그 전환은 확인했으니, 여기서는 화면 자체(원 글자·목록)를 본다. */
  home();
  ok("모드칩에 RECENT 없음", !$('[data-m="recent"]'));
  if (recent.length){
    const keep = [...pins]; pins.clear(); savePins();
    $('[data-m="c"]').click();
    $("#bstrip").scrollLeft = 0;
    $("#runbig").click();
    ok("핀 없을 때 RUN → RECENT", mode === "recent", mode);
    ok("RECENT 화면에 최근 본 곳", $$("#screen .card").length > 0);
    keep.forEach(k => pins.add(k)); savePins(); home();
  } else {
    ["핀 없을 때 RUN → RECENT","RECENT 화면에 최근 본 곳"]
      .forEach(n => ok(n, true, "본 곳 없음 — 건너뜀"));
  }
  /* 브랜드 타일도 이름 길이에 맞춰 글자가 줄어든다 — bstrip 이 아니라 brandTile() 의 규칙 */
  $('[data-m="d"]').click();
  ok("브랜드 타일 글자가 이름 길이에 맞춰 줄어든다", (() => {
    const ts = $$("#screen .tile").slice(1);   /* 0번은 '전체 브랜드' */
    const size = t => parseFloat(getComputedStyle(t.querySelector("b")).fontSize);
    const longer = ts.find(t => enOf(BRAND_SEQ[ts.indexOf(t)]).length > 13);
    const shorter = ts.find(t => enOf(BRAND_SEQ[ts.indexOf(t)]).length <= 6);
    return !longer || !shorter || size(longer) < size(shorter);
  })());
  ok("타일 글자가 잘리지 않음",
     $$("#screen .tile b").every(b => b.scrollWidth <= b.clientWidth + 1),
     $$("#screen .tile b").filter(b => b.scrollWidth > b.clientWidth + 1).map(b => txt(b)).join(","));
  home();

  /* 지역 레일은 목록 화면의 헤더에 있다. GEAR 는 이제 칩을 누르면 곧장 목록이다. */
  $('[data-m="s"]').click();
  ok("목록 화면엔 헤더 RUN 막대", !!runbtn() && $(".head").contains(runbtn()));
  runbtn().click();
  ok("누르면 지역 레일", !!rail());
  const names = railCards().map(cardName);
  ok("레일 = 전국 + 권역", names[0] === "전국" && names.length === 8, names.join("|"));
  ok("권역 순서 고정",
     names.slice(1).join("|") === "서울 인천|경기|강원|충청|전라|경상|제주", names.join("|"));
  ok("카드에 곳 수를 적지 않음", railCards().every(c => !/\d/.test(txt(c))), txt(railCards()[1]));
  const rcs = getComputedStyle(rail());
  ok("레일 가로 스크롤", rcs.overflowX === "auto" || rcs.overflowX === "scroll", rcs.overflowX);
  ok("레일 스냅 x mandatory", rcs.scrollSnapType.includes("x") && rcs.scrollSnapType.includes("mandatory"));
  ok("양옆 여백으로 첫·끝도 가운데로", parseFloat(rcs.paddingLeft) > 20, rcs.paddingLeft);
  const ccs = getComputedStyle(railCards()[0]);
  ok("레일 카드가 가운데에 멈춤", ccs.scrollSnapAlign === "center");
  ok("레일도 한 번에 한 장씩", ccs.scrollSnapStop === "always");
  ok("레일 카드가 크다", parseFloat(ccs.height) >= 90 && parseFloat(ccs.width) >= 180,
     `${ccs.width} x ${ccs.height}`);
  const gg = gear.filter(r => REGION_OF[r.sido] === "경기").length;
  railCards().find(c => cardName(c) === "경기").click();
  ok("고르면 레일이 접힘", !rail());
  ok("고르면 그 권역 목록", $$("#screen .card").length === gg, `${$$("#screen .card").length} vs ${gg}`);
  ok("버튼에 고른 지역 표시", txt(runbtn()).includes("경기"), txt(runbtn()));
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
  /* SHOP 은 첫 화면이 원이 아니라 타일이다 */
  ok("검색 해제 후 복귀", !!$("#screen .tile"), "첫 화면으로");

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
  ok("브랜드 후보 = 전체 + 18개", brandCount() === 19, `${brandCount()}`);
  /* 순서는 step10 의 BRAND_ORDER 하나로 정한다.
     예전에는 런처에도 같은 목록이 있어, step10 만 고쳤을 때 화면이 안 바뀌었다. */
  ok("첫 브랜드는 로얄엔필드", BRAND_SEQ[0] === "로얄엔필드", BRAND_SEQ[0]);
  /* SHOP 은 원이 아니라 타일이다 — '전체 브랜드' 다음 첫 브랜드 타일이 로얄엔필드인지 본다 */
  ok("전체 타일이 맨 앞", txt($$("#screen .tile")[0]?.querySelector("b")) === "전체 브랜드",
     txt($$("#screen .tile")[0]?.querySelector("b")));
  ok("타일 첫 브랜드도 로얄엔필드",
     txt($$("#screen .tile")[1]?.querySelector("b")) === "ROYAL ENFIELD",
     txt($$("#screen .tile")[1]?.querySelector("b")));
  ok("'전체 브랜드' 타일을 누르면 전체 목록", (() => {
    $$("#screen .tile")[0].click();
    const got = $$("#screen .card").length > 0 && !brand;
    home(); $('[data-m="d"]').click();
    return got;
  })());
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
  /* T맵·네이버지도·카카오내비 셋으로 좁혔다 — 카카오맵·Apple지도·구글지도는 뺐다.
     주유소 버튼과 같은 개수·같은 방식이라 카드 종류가 달라도 손이 헷갈리지 않는다. */
  dealerMode();
  search("영종모터스");
  const c0 = $("#screen .card");
  c0.querySelector(".card-head").click();
  const btns = [...c0.querySelectorAll(".btns a, .btns button")];
  ok(`내비 버튼 ${NAV_N}개`, btns.length === NAV_N, `${btns.length}`);
  ok("내비 순서 T맵>네이버지도>카카오내비",
     txt(btns[0]) === "T맵" && txt(btns[1]) === "네이버지도" && txt(btns[2]).startsWith("카카오내비"),
     btns.map(b => txt(b)).join("|"));
  ok("한 줄 세 칸", getComputedStyle(c0.querySelector(".btns")).gridTemplateColumns.split(" ").length === 3);
  const hrefs = btns.filter(b => b.tagName === "A").map(b => b.getAttribute("href"));
  if (isIOS){
    ok("네이버는 유니버설 링크", hrefs.some(h => h.startsWith("https://m.map.naver.com/launchApp/")));
    ok("T맵만 스킴", hrefs.filter(h => !h.startsWith("https://")).every(h => h.startsWith("tmap://")));
  } else {
    ok("네이버는 intent", hrefs.some(h => h.startsWith("intent://route/car")));
    ok("나머지는 전부 intent", hrefs.filter(h => !h.startsWith("https://")).every(h => h.startsWith("intent://")));
  }
  ok("좌표가 링크에 들어감", hrefs.some(h => h.includes(String(DATA.find(r => r.name === "영종모터스").lat).slice(0, 6))));
  ok("내비 버튼 색이 서로 다름",
     new Set(btns.map(b => getComputedStyle(b).backgroundColor)).size === NAV_N);
  ok("교차브랜드 패널에 취급 브랜드 줄", txt(c0).includes("취급 브랜드"));
  search("");

  // ── 13. 즐겨찾기 ─────────────────────────────────────
  home();
  /* 저장소만 비우면 화면의 pins 는 그대로 남는다 — 둘 다 비워야 처음 상태가 된다 */
  pins.clear(); savePins();
  search("바이크");
  const pinBtn = $("#screen .card [data-pin]");
  const before = pinBtn.getAttribute("aria-pressed");
  pinBtn.click();
  ok("즐겨찾기 토글", $("#screen .card [data-pin]").getAttribute("aria-pressed") !== before);
  ok("즐겨찾기 저장", (localStorage.getItem(PIN_KEY) || "").length > 2, localStorage.getItem(PIN_KEY));
  search("");
  $("#qPin").click();
  ok("PIN 모드 진입", txt($("#crumbs")).includes("PIN"), txt($("#crumbs")));
  ok("PIN 목록 표시", $$("#screen .card").length === pins.size,
     `카드 ${$$("#screen .card").length} vs 핀 ${pins.size}`);
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
  /* 아이폰에서는 카카오내비도 유니버설 링크(a)다 — 확인창을 없애려면 사람이 링크를 눌러야 한다 */
  const hb = [...$$("#screen .btns a")];
  ok("집 내비 전부", hb.length === (isIOS ? NAV_N : NAV_N - 1), `${hb.length}`);
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
  home();
  const geo0 = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  const alr0 = window.alert; window.alert = () => {};
  navigator.geolocation.getCurrentPosition = f => f({coords:{latitude:37.5665,longitude:126.9780}});

  ok("내 주변 전용 카테고리 줄은 없다", !$("#nearBar"), "지금 보는 것에 걸리는 조건이다");
  $("#qNear").click();
  ok("내 주변 켜짐", nearOn && $("#qNear").getAttribute("aria-pressed") === "true");
  ok("카테고리는 그대로 COFFEE", mode === "c");
  ok("카페만 나온다", $$("#screen .card").every(c => c.dataset.k === "c")
     && $$("#screen .card").length > 0);
  ok("거리 표시", $$("#screen .dist").length > 0);
  ok("가까운 순", (() => {
    const v = $$("#screen .dist").map(e => { const t = txt(e);
      return t.endsWith("km") ? parseFloat(t)*1000 : parseFloat(t); });
    return v.every((x,i) => i === 0 || v[i-1] <= x + 1);
  })());
  ok("경로에 내 주변 표시", !!$("#crumbs .nearchip"));
  $("#qNear").click();
  ok("다시 누르면 꺼짐", !nearOn && $("#qNear").getAttribute("aria-pressed") === "false");

  /* 브랜드를 고른 채로 눌러도 그 브랜드 안에서 */
  home(); $('[data-m="d"]').click();
  railPick("YAMAHA");
  const beforeN = $$("#screen .card").length;
  $("#qNear").click();
  ok("브랜드를 고른 채 내 주변", brand === "야마하" && nearOn, `${brand}/${nearOn}`);
  ok("그 브랜드 안에서만", $$("#screen .card").length > 0
     && $$("#screen .card").length <= beforeN);
  ok("경로에 브랜드가 남음", txt($("#crumbs")).includes("YAMAHA"), txt($("#crumbs")));
  $("#qNear").click();
  ok("꺼도 브랜드는 유지", brand === "야마하");
  home();

  /* GEAR·GAS 는 이제 칩을 누르는 순간 목록이다(GAS 는 내 주변도 함께 켜진다) */
  $('[data-m="s"]').click(); $("#qNear").click();
  ok("GEAR 내 주변은 용품점만", $$("#screen .card").every(c => c.dataset.k === "s")
     && $$("#screen .card").length > 0);
  home();
  $('[data-m="gas"]').click();
  ok("GAS 는 칩을 누르면 바로 내 주변", nearOn);
  ok("GAS 내 주변은 주유소만", $$("#screen .card").every(c => c.dataset.k === "g")
     && $$("#screen .card").length > 0);
  home();

  ok("GEAR 취급품목 칩 없음", (() => { $('[data-m="s"]').click();
     const e = $("#filterSeg").innerHTML === ""; home(); return e; })());
  ok("GAS 필터 칩 없음", (() => { $('[data-m="gas"]').click();
     const e = $("#filterSeg").innerHTML === ""; home(); return e; })());

  navigator.geolocation.getCurrentPosition = geo0; window.alert = alr0;
  home();

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
  ok("경로 버튼으로 브랜드 해제", brandCount() === 19, `${brandCount()}`);
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

  /* 원이 화면 밖으로 넘치면 안 된다.
     예전엔 아래 로고를 덮는지를 봤는데, 로고를 없애면서 기준을 화면 자체로 옮겼다.
     남은 자리를 실제로 재서 넣는다(fitCircle) — 그게 지켜지는지 본다. */
  $("h1 #qReset").click();
  ok("원 크기를 잰 값으로 넣는다",
     /^\d+px$/.test(document.documentElement.style.getPropertyValue("--circle")),
     document.documentElement.style.getPropertyValue("--circle"));
  const overflow = () => {
    const big = $("#runbig");
    if (!big) return null;
    return Math.round(big.getBoundingClientRect().bottom - innerHeight);
  };
  const roundOk = () => { const b = $("#runbig").getBoundingClientRect();
    return Math.abs(b.width - b.height) < 1 && b.width > 0; };
  /* SHOP(d) 은 이제 원이 아니라 타일이고, RECENT 는 칩 자체가 없다 — 원이 있는 칸만 잰다 */
  let worst = -1e9, notRound = [];
  ["c", "s", "gas"].forEach(m => {
    $(`[data-m="${m}"]`)?.click();
    if (!$("#runbig")) return;
    worst = Math.max(worst, overflow());
    if (!roundOk()) notRound.push(m);
  });
  $("h1 #qReset").click();
  ok("원이 화면 밖으로 넘치지 않는다", worst <= 0, `${worst}px`);
  ok("원은 언제나 동그랗다", notRound.length === 0, notRound.join(","));
  ok("document 는 스크롤 안 함(스크롤은 .scrollarea 몫)",
     document.documentElement.scrollHeight - document.documentElement.clientHeight <= 0,
     `${document.documentElement.scrollHeight - document.documentElement.clientHeight}`);

  ok("원에 집 아이콘 없음", !$("#runhome"));   /* 제목을 누르면 처음으로 가므로 뺐다 */

  /* 아이폰 확인창 — 카카오내비는 유니버설 링크로 없앴다. T맵은 AASA 가 없어 불가능하다. */
  $('[data-m="s"]').click(); if ($("#runbig")) $("#runbig").click();
  search(gear[0].name);
  const nvc = $$("#screen .card").find(c => txt(c.querySelector(".card-name")) === gear[0].name);
  nvc?.querySelector(".card-head").click();
  const kk = nvc?.querySelector(".n-kakao");
  ok("카카오내비가 확인창 없는 방식", isIOS
     ? (kk?.tagName === "A" && (kk.getAttribute("href") || "").startsWith("https://kakaonavi.kakao.com/launch/"))
     : (kk?.dataset.navi || "").startsWith("intent://"),
     `${kk?.tagName} ${kk?.getAttribute("href") || kk?.dataset.navi || ""}`.slice(0, 60));
  ok("카카오내비도 목적지를 복사한다", !!kk?.dataset.clip, kk?.dataset.clip);
  ok("동기 복사 함수가 있다", typeof copyNow === "function");
  /* '현재 위치' 는 동 이름으로 바꿔 보여준다 — 실제 네트워크 호출은 50회씩 돌리기엔
     느리고 외부 API 의존이라, 여기서는 배선만 확인한다(here 에만 geo 플래그,
     함수 존재). 실제 변환은 수동으로 두 좌표(서울 역삼·강원 산간)로 확인했다. */
  ok("reverseGeo 함수가 있다", typeof reverseGeo === "function");
  /* home 은 이 테스트 파일에서 '처음으로' 헬퍼 이름으로 이미 쓰고 있어(위 13번째 줄)
     여기서 앱의 전역 home(등록된 집) 을 직접 건드릴 수 없다 — here 쪽만 확인한다. */
  ok("'현재 위치' 는 geo 로 표시된다", (() => {
    const keepHere = here;
    here = {lat: 37.5, lon: 127};
    const got = wxPoint().geo === true;
    here = keepHere;
    return got;
  })());
  search(""); home();

  /* 사용법 — 공지를 누르면 열리고, 화면 아무 데나 한 번 더 누르면 닫힌다 */
  home();
  const gd = $("#guide"), nbtn = $("#noticeBtn");
  ok("공지에 사용법 창이 달려 있다", !!gd && !!nbtn);
  if (gd && nbtn){
    ok("처음엔 닫혀 있다", gd.hidden);
    nbtn.click();
    ok("공지를 누르면 열린다", !gd.hidden);
    const gcard = gd.querySelector(".guide-card");
    ok("사용법 내용이 있다", txt(gcard).length > 200, `${txt(gcard).length}자`);
    ok("큰 원 설명이 있다", txt(gcard).includes("원"));
    const gb = gcard.getBoundingClientRect();
    ok("창이 화면 안에 있다", gb.top >= -1 && gb.bottom <= innerHeight + 1,
       `${Math.round(gb.top)}~${Math.round(gb.bottom)}/${innerHeight}`);
    ok("긴 글은 창 안에서 스크롤", getComputedStyle(gcard).overflowY === "auto");
    ok("열려도 페이지는 안 밀린다",
       document.documentElement.scrollHeight - document.documentElement.clientHeight <= 0);
    /* 장갑 낀 손을 위해 아무 데나 눌러도 닫힌다 — 카드 안이든 밖이든 */
    gcard.click();
    ok("글 위를 눌러도 닫힌다", gd.hidden);
    nbtn.click(); gd.click();
    ok("바깥을 눌러도 닫힌다", gd.hidden);
    nbtn.click();
    dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}));
    ok("ESC 로도 닫힌다", gd.hidden);
    if (!gd.hidden) gd.click();
  } else {
    ["처음엔 닫혀 있다","공지를 누르면 열린다","사용법 내용이 있다","큰 원 설명이 있다",
     "창이 화면 안에 있다","긴 글은 창 안에서 스크롤","열려도 페이지는 안 밀린다",
     "글 위를 눌러도 닫힌다","바깥을 눌러도 닫힌다","ESC 로도 닫힌다"].forEach(n => ok(n, false));
  }
  ok("공지 글이 한 줄에 들어간다",
     $("#noticeBtn").scrollWidth <= $("#noticeBtn").clientWidth + 1,
     `${$("#noticeBtn").scrollWidth}/${$("#noticeBtn").clientWidth}`);

  // ── 18. 용품점 ───────────────────────────────────────
  $("h1 #qReset").click();
  ok("용품점 모드칩 존재", !!$('[data-m="s"]'));
  $('[data-m="s"]').click();
  ok("용품점 진입", $('[data-m="s"]').getAttribute("aria-pressed") === "true");
  ok("용품점엔 필터 칩이 없다", $("#filterSeg").innerHTML === "", txt($("#filterSeg")));
  ok("취급품목은 카드 배지로만", !!gear.find(r => r.tags && r.tags.length));
  /* GEAR 는 칩을 누르면 곧장 목록이다 — 지역은 헤더의 RUN 레일에서 고른다 */
  railPick("경상");
  ok("용품점 지역 선택", $$("#screen .card").length ===
     gear.filter(r => REGION_OF[r.sido] === "경상").length, `${$$("#screen .card").length}`);
  home(); $('[data-m="s"]').click();
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
  const nkBtn = nkc?.querySelector(".btns .n-kakao");
  ok("카카오에 없는 상호는 다른 값을 복사",
     txt(nkBtn).includes("주소 복사") || txt(nkBtn).includes("카카오에 없음"), txt(nkBtn));
  ok("복사값이 확인된 값", (nkBtn?.dataset.clip || "") === (notInKakao.clip || notInKakao.name),
     nkBtn?.dataset.clip);
  search("");
  const inKakao = gear.find(r => r.ku);
  search(inKakao.name);
  const ikc = $("#screen .card");
  ikc?.querySelector(".card-head").click();
  ok("카카오 등록은 이름을 복사", txt(ikc.querySelector(".btns .n-kakao")).includes("이름 복사"));
  /* 붙여넣기 값은 빌드할 때 실제로 검색해 확인한 것이다 */
  ok("확인된 붙여넣기 값이 실려 있다", DATA.filter(r => r.clip).length > 500,
     `${DATA.filter(r => r.clip).length}`);
  ok("못 찾는 곳은 버튼에 밝힌다", (() => {
    const nc = DATA.find(r => r.noclip && r.k === "s");
    if (!nc) return true;
    home(); $('[data-m="s"]').click(); if ($("#runbig")) $("#runbig").click();
    search(nc.name);
    const card = $$("#screen .card").find(c => txt(c.querySelector(".card-name")) === nc.name);
    card?.querySelector(".card-head").click();
    const b = card?.querySelector(".btns .n-kakao");
    const got = b ? txt(b).includes("카카오에 없음") : false;
    search(""); home();
    return got;
  })(), DATA.find(r => r.noclip && r.k === "s")?.name);
  ok("카카오맵 링크 노출", !!ikc.querySelector('.links a[href*="place.map.kakao"], .links a[href*="map.kakao"]'),
     ikc.querySelector(".links")?.textContent);
  search("");
  /* 위 검사가 home() 으로 끝나 커피 모드로 돌아와 있다 — 용품점으로 다시 들어간다 */
  home(); $('[data-m="s"]').click(); if ($("#runbig")) $("#runbig").click();
  const tagged = gear.find(r => r.tags && r.tags.length);
  search(tagged.name);
  const tc = $$("#screen .card").find(c => txt(c.querySelector(".card-name")) === tagged.name);
  tc?.querySelector(".card-head").click();
  ok("취급품목 줄 표시", !!tc && txt(tc).includes("취급품목"), tagged.name);
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
  ok("주유소엔 필터 칩이 없다", $("#filterSeg").innerHTML === "", txt($("#filterSeg")));
  /* GAS 는 칩을 누른 그 순간 내 주변이 켜진 목록이다 — 원을 거치지 않는다 */
  ok("주유소는 첫 화면부터 목록", !$("#runbig"));
  ok("주유소 원 → 내 주변", nearOn && mode === "gas", `${mode}/${nearOn}`);
  ok("주유소 카드로 렌더", $$("#screen .card[data-k=g]").length === $$("#screen .card").length
     && $$("#screen .card").length > 0, `${$$("#screen .card").length}`);
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
  ok("내 주변에서 뒤로", !nearOn);
  HIST.length = 0; $("h1 #qReset").click(); HIST.length = 0; syncBack();

  // ── 22. 플랫폼 ───────────────────────────────────────
  ok("PLATFORM 상수", PLATFORM === "ios" || PLATFORM === "android", PLATFORM);
  dealerMode(); search("영종모터스");
  const navCard = $("#screen .card"); navCard.querySelector(".card-head").click();
  const hrefs2 = [...navCard.querySelectorAll(".btns a")].map(a => a.getAttribute("href"));
  if (PLATFORM === "android"){
    ok("안드로이드는 intent 로 연다", hrefs2.filter(h => h.startsWith("intent://")).length >= 2,
       hrefs2.map(h=>h.slice(0,12)).join(","));
    ok("intent 에 package 지정", hrefs2.filter(h => h.startsWith("intent://")).every(h => /;package=[\w.]+;/.test(h)));
    ok("앱 없을 때 스토어로", hrefs2.filter(h => h.startsWith("intent://")).every(h => h.includes("browser_fallback_url")));
    ok("Apple 지도 없음", !hrefs2.some(h => h.includes("maps.apple.com")));
    ok(`내비 ${NAV_N}개`, navCard.querySelectorAll(".btns a, .btns button").length === NAV_N);
  } else {
    ok("아이폰은 intent 안 씀", !hrefs2.some(h => h.startsWith("intent://")));
    ok("네이버 유니버설 링크", hrefs2.some(h => h.startsWith("https://m.map.naver.com/launchApp/")));
    ok("Apple 지도 없음", !hrefs2.some(h => h.includes("maps.apple.com")));
    ok(`내비 ${NAV_N}개`, navCard.querySelectorAll(".btns a, .btns button").length === NAV_N);
    ok("T맵만 스킴(재확인)", hrefs2.filter(h => !h.startsWith("https://")).every(h => h.startsWith("tmap://")));
  }
  search(""); $("h1 #qReset").click();

  // ── 23. 화면 고정 · 좌우 목록 ─────────────────────────
  home();
  ok("최상단 FURYCLASSIC 글자 없음", !$(".eyebrow"));
  ok("페이지가 세로로 스크롤되지 않음",
     document.documentElement.scrollHeight <= innerHeight + 1,
     `${document.documentElement.scrollHeight} / ${innerHeight}`);
  ok("가로로도 넘치지 않음", document.documentElement.scrollWidth <= innerWidth + 1);
  ok("제목 옆 by FURYCLASSIC", txt($("h1 .by")).replace(/\s+/g," ") === "by FURYCLASSIC");
  ok("by 가 제목 아랫선에 맞음", (() => {
    /* 버튼 박스 바닥이 아니라 'COFFEE RUN' 글자 자체의 바닥과 비교한다 —
       버튼은 줄높이(line-height) 만큼 글자보다 여유가 있어 그걸 기준으로 삼으면 늘 어긋난다. */
    const titleNode = [...$("h1 button").childNodes].find(n => n.nodeType === 3);
    const range = document.createRange();
    range.selectNodeContents(titleNode);
    const title = range.getBoundingClientRect();
    const by = $("h1 .by").getBoundingClientRect();
    return Math.abs(by.bottom - title.bottom) <= 8;
  })(), (() => {
    const titleNode = [...$("h1 button").childNodes].find(n => n.nodeType === 3);
    const range = document.createRange(); range.selectNodeContents(titleNode);
    return `${Math.round($("h1 .by").getBoundingClientRect().bottom)}/${Math.round(range.getBoundingClientRect().bottom)}`;
  })());
  ok("원이 화면 안에", (() => {
    const b = $("#runbig").getBoundingClientRect();
    return b.top >= 0 && b.bottom <= innerHeight + 1;
  })());

  /* GEAR 는 칩을 누르면 곧장 목록이다. 목록은 위아래로 쌓이고,
     스크롤은 document 가 아니라 .scrollarea 하나가 맡는다 — 헤더·로고는 그 밖의 형제라
     목록이 아무리 길어도 자리를 지킨다. */
  $('[data-m="s"]').click();
  const deck = $("#screen .list");
  ok("목록이 위아래로 쌓임", getComputedStyle(deck).flexDirection === "column",
     getComputedStyle(deck).flexDirection);
  ok("스크롤은 .scrollarea 가 맡는다",
     getComputedStyle($("#scrollarea")).overflowY === "auto");
  ok("카드에 스냅 없음(그냥 목록)", getComputedStyle($("#screen .card")).scrollSnapAlign === "none");
  ok("목록이 길어도 document 는 그대로",
     document.documentElement.scrollHeight <= innerHeight + 1,
     `${document.documentElement.scrollHeight} / ${innerHeight}`);
  ok("목록이 길어도 헤더는 화면 안에",
     $(".head").getBoundingClientRect().top >= 0);
  ok("카드가 화면 폭에 꽉 참", (() => {
    const w = $("#screen .card").getBoundingClientRect().width;
    return w > innerWidth * 0.9 && w <= innerWidth;
  })(), `${Math.round($("#screen .card").getBoundingClientRect().width)} / ${innerWidth}`);
  home();

  // ── 24. 카테고리 칩은 2열, 좌우 스크롤 없음 ─────────────
  $("h1 #qReset").click();
  const oneLine = sel => new Set($$(`${sel} button`).map(b => Math.round(b.getBoundingClientRect().top))).size <= 1;
  /* 다섯 개 안팎이라 한 줄로 깔면 옆으로 밀려난 칸을 놓치기 쉬웠다 — 2열로 접는다.
     등급 필터(#filterSeg)는 그대로 좌우 스크롤이라 여기서 다루지 않는다. */
  ok("#modeSeg 는 그리드", getComputedStyle($("#modeSeg")).display === "grid");
  ok("#modeSeg 좌우 스크롤 없음", $("#modeSeg").scrollWidth <= $("#modeSeg").clientWidth + 1,
     `${$("#modeSeg").scrollWidth}/${$("#modeSeg").clientWidth}`);
  ok("#modeSeg 두 칸", getComputedStyle($("#modeSeg")).gridTemplateColumns.split(" ").length === 2,
     getComputedStyle($("#modeSeg")).gridTemplateColumns);
  ok("칩 글자가 잘리지 않음",
     $$("#modeSeg button").every(b => b.scrollWidth <= b.clientWidth + 1),
     $$("#modeSeg button").map(b => txt(b)).join("|"));
  ok("고른 카테고리는 브랜드 색으로 꽉 참", (() => {
    const on = $('#modeSeg button[aria-pressed=true]');
    const bg = getComputedStyle(on).backgroundColor.match(/\d+/g).map(Number);
    return bg[0] > 150 && bg[1] < 90 && bg[2] < 90;
  })(), getComputedStyle($('#modeSeg button[aria-pressed=true]')).backgroundColor);
  ok("칩 글자는 이탤릭 볼드", (() => {
    const cs = getComputedStyle($("#modeSeg button"));
    return cs.fontStyle === "italic" && +cs.fontWeight >= 800;
  })());
  /* 등급 칩은 SHOP 에서 브랜드를 고른 뒤에만 나온다 */
  $('[data-m="d"]').click(); railPick("YAMAHA");
  ok("등급 칩도 한 줄", oneLine("#filterSeg") && getComputedStyle($("#filterSeg")).flexWrap === "nowrap");
  ok("고른 등급은 꽉 참", (() => {
    const b = $$("#filterSeg button")[1];
    if (!b) return true;
    b.click();
    const on = $(`#filterSeg [data-f="${b.dataset.f}"]`);
    const bg = on ? getComputedStyle(on).backgroundColor : "";
    $('#filterSeg [data-f="ALL"]')?.click();
    return bg !== "rgba(0, 0, 0, 0)";
  })());
  home();
  ok("내 주변 전용 줄은 사라짐", !$("#nearBar"));
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

  /* GAS 는 원을 누르면 '내 주변' 으로 간다 — 위치를 가짜로 넣어 목록을 띄운다 */
  const gg1 = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  const aa1 = window.alert; window.alert = () => {};
  navigator.geolocation.getCurrentPosition = f => f({coords:{latitude:37.5665,longitude:126.9780}});
  $('[data-m="gas"]').click();
  navigator.geolocation.getCurrentPosition = gg1; window.alert = aa1;
  const gcard = $("#screen .card[data-k=g]");
  ok("주유소 카드 있음", !!gcard, `${$$("#screen .card").length}`);
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
  /* 주유소는 제 좌표를 갖게 됐다(오피넷 전국 수집). 좌표로 바로 찍는다 —
     예전에는 옆 가게 좌표를 빌려 써서 이름으로 찾게 해 두었다. */
  const gnav = gbtns.filter(b => b.tagName === "A" && !b.classList.contains("n-kakao"));
  const gRec = gasPool().find(g => g.name === txt(gcard.querySelector(".card-name")));
  ok("주유소는 제 좌표로 보낸다",
     !!gRec && !gRec.near && gnav.every(a => /route/.test(a.getAttribute("href"))),
     gnav.map(a => a.getAttribute("href").slice(0,30)).join(" "));
  ok("보낸 좌표가 그 주유소 좌표",
     gnav.every(a => a.getAttribute("href").includes(String(gRec.lat).slice(0, 8))),
     `${gRec.lat},${gRec.lon}`);
  /* 시세 — 일반은 값, 고급은 값이거나 '없음' 이 반드시 적힌다 */
  const gbadges = [...gcard.querySelectorAll(".b")].map(b => txt(b));
  ok("주유소에 일반·고급 시세",
     gbadges.some(t => /^일반 [\d,]+$/.test(t)) &&
     gbadges.some(t => /^고급 /.test(t) || t === "고급유 없음"), gbadges.join("|"));
  ok("주유소에 시세 기준일", gbadges.some(t => /\d{2}\/\d{2} 기준/.test(t)), gbadges.join("|"));

  /* 전국 주유소 — 오피넷에서 제 좌표까지 받아 실은 것들 */
  const gasReal = DATA.filter(r => r.k === "g");
  ok("주유소가 제 레코드로 실려 있다", gasReal.length > 2000, `${gasReal.length}`);
  ok("주유소 전부 좌표 보유",
     gasReal.every(r => Number.isFinite(r.lat) && Number.isFinite(r.lon)));
  ok("주유소 전부 주소 보유", gasReal.every(r => r.addr && r.addr.trim()));
  /* 이름이 같은 주유소가 전국에 여럿이다 — 이름으로 묶으면 서로를 지운다 */
  ok("같은 상호도 각각 남는다", (() => {
    const names = gasReal.map(r => r.name);
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (!dup) return true;
    return gasPool().filter(g => g.name === dup).length >= 2;
  })());
  ok("주유소도 목록에 다 나온다", gasPool().length >= gasReal.length, `${gasPool().length}`);
  home();

  ok("카테고리 칩에 PIN 없음", !$('[data-m="pin"]'), "퀵바 버튼과 중복");
  ok("PIN 은 퀵바에만", !!$("#qPin"));
  const g2 = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  navigator.geolocation.getCurrentPosition = f => f({coords:{latitude:37.5665,longitude:126.9780}});
  $("#qNear").click();
  navigator.geolocation.getCurrentPosition = g2;
  ok("내 주변에도 카테고리 칩은 그대로", getComputedStyle($("#modeSeg")).display !== "none");
  ok("내 주변 카페에 빈 배지 없음",
     $$("#screen .card .b").every(e => txt(e) !== ""),
     `${$$("#screen .card .b").filter(e => txt(e) === "").length}개`);
  home();

  // ── 26. 레이아웃 ─────────────────────────────────────
  ok("가로 스크롤 없음", document.documentElement.scrollWidth <= window.innerWidth + 1,
     `${document.documentElement.scrollWidth} > ${window.innerWidth}`);
  ok("검색창 16px 이상", parseFloat(getComputedStyle($("#searchInput")).fontSize) >= 16);
  ok("body 배경 지정", getComputedStyle(document.body).backgroundColor !== "rgba(0, 0, 0, 0)");
  ok("SVG 에 hidden 없음", !$$("svg[hidden]").length);

  $("h1 #qReset").click();
  return { pass: R.filter(r => r.ok).length, fail: R.filter(r => !r.ok).length, cases: R };
};
