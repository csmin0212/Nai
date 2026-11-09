/* ============================================================
   니알라토텝의 가면들 — 핸드아웃 아카이브 앱
   의존성 없음. data/handouts.js 의 window.MASKS_DATA 를 읽어 렌더링합니다.

   키퍼 메모는 keeper.html 에서만 data/keeper-notes.js 를 함께 읽어 들입니다.
   플레이어판(index.html)에는 window.MASKS_KEEPER 가 존재하지 않으므로
   키퍼 관련 UI가 통째로 나타나지 않습니다.
   ============================================================ */
(function () {
  "use strict";

  var APP_VERSION = "9";     /* index.html / keeper.html 의 ?v= 값과 맞춘다 */

  var D = window.MASKS_DATA;
  if (!D) { document.getElementById("main").innerHTML = "<p class='empty'>data/handouts.js 를 불러오지 못했습니다.</p>"; return; }

  var K = window.MASKS_KEEPER || null;          /* 키퍼판에서만 값이 있음 */
  var keeperEl = document.getElementById("keeper-mode");

  var state = {
    view: "archive",
    chapter: "all",
    type: "all",
    query: "",
    keeper: !!K && localStorage.getItem("masks.keeper") === "1"
  };

  function keeperNote(id) { return K ? K[id] : null; }

  /* ---------------- 유틸 ---------------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* 아주 작은 마크다운: ### 소제목 / - 목록 / **강조** / *기울임* / 빈 줄 = 문단
     전단처럼 글자 크기가 다른 인쇄물은 # (가장 큼) · ## (큼) 을 쓴다. */
  var HEAD_CLASS = { 1: " class='md-xl'", 2: " class='md-lg'", 3: "" };
  function fmt(text) {
    var blocks = String(text || "").trim().split(/\n{2,}/);
    return blocks.map(function (block) {
      var lines = block.split("\n");
      var m = /^(#{1,3})\s+/.exec(lines[0]);
      if (m) {
        var h = inline(lines[0].slice(m[0].length));
        var rest = lines.slice(1).join("\n").trim();
        return "<h3" + HEAD_CLASS[m[1].length] + ">" + h + "</h3>" + (rest ? fmt(rest) : "");
      }
      if (/^-\s/.test(lines[0])) {
        return "<ul>" + lines.filter(Boolean).map(function (l) {
          return "<li>" + inline(l.replace(/^-\s*/, "")) + "</li>";
        }).join("") + "</ul>";
      }
      return "<p>" + inline(block).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  function inline(s) {
    return esc(s)
      .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n][^*]*?)\*/g, "<em>$1</em>");
  }

  function typeLabel(id) {
    var t = D.types.filter(function (x) { return x.id === id; })[0];
    return t ? t.label : id;
  }
  function chapterOf(id) {
    return D.chapters.filter(function (c) { return c.id === id; })[0] || { name: id, en: "" };
  }
  function byId(id) {
    return D.handouts.filter(function (h) { return h.id === id; })[0];
  }
  /* 날짜가 적히지 않은 자료는 맨 뒤로 */
  function sortByDate(a, b) {
    return (a.date || "9999").localeCompare(b.date || "9999");
  }
  function yearOf(h) {
    return /^\d{4}/.test(h.date || "") ? h.date.slice(0, 4) : "시기 미상";
  }

  /* 지도는 '지도' 탭에서 따로 보여 준다 */
  function isMap(h) { return h.type === "map"; }
  function archiveList() { return D.handouts.filter(function (h) { return !isMap(h); }); }

  /* 지도 범례에 적힌 지명들 — 검색 대상에 포함시킨다 */
  function legendNames(h) {
    if (!h.legendGroups) return [];
    return h.legendGroups.reduce(function (acc, g) {
      return acc.concat((g.items || []).map(function (it) { return it.name; }));
    }, []);
  }

  /* ---------------- 필터 ---------------- */

  function usedChapters() {
    return D.chapters.filter(function (c) {
      return D.handouts.some(function (h) { return h.chapter === c.id; });
    }).sort(function (a, b) { return a.order - b.order; });
  }

  function matches(h) {
    if (state.chapter !== "all" && h.chapter !== state.chapter) return false;
    if (state.type !== "all" && h.type !== state.type) return false;
    var q = state.query.trim().toLowerCase();
    if (!q) return true;
    var hay = [h.title, h.headline, h.summary, h.body, h.source, h.dateLabel]
      .concat(h.tags || [], h.people || [], h.places || [], legendNames(h))
      .join(" ").toLowerCase();
    if (state.keeper && keeperNote(h.id)) hay += " " + keeperNote(h.id).toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function renderFilters() {
    var wrap = document.getElementById("filters");
    var chaps = usedChapters();
    var html = "";

    if (chaps.length > 1) {
      html += chip("chapter", "all", "전체", D.handouts.length);
      chaps.forEach(function (c) {
        var n = D.handouts.filter(function (h) { return h.chapter === c.id; }).length;
        html += chip("chapter", c.id, c.name, n);
      });
      html += "<span style='width:14px'></span>";
    }

    html += chip("type", "all", "모든 유형", null);
    D.types.forEach(function (t) {
      if (t.id === "map") return;                       /* 지도는 전용 탭에 있음 */
      var n = archiveList().filter(function (h) { return h.type === t.id; }).length;
      if (n) html += chip("type", t.id, t.label, n);
    });

    wrap.innerHTML = html;
  }

  function chip(kind, val, label, n) {
    var on = state[kind] === val ? " is-on" : "";
    return "<button class='chip" + on + "' data-kind='" + kind + "' data-val='" + esc(val) + "'>" +
      esc(label) + (n != null ? "<span class='n'>" + n + "</span>" : "") + "</button>";
  }

  /* ---------------- 아카이브 ---------------- */

  function renderArchive() {
    var list = archiveList().filter(matches).sort(sortByDate);
    var el = document.getElementById("view-archive");

    if (!list.length) { el.innerHTML = emptyMsg(); return; }

    var groups = {};
    list.forEach(function (h) { (groups[h.chapter] = groups[h.chapter] || []).push(h); });

    var html = "";
    usedChapters().forEach(function (c) {
      var items = groups[c.id];
      if (!items) return;
      html += "<div class='chapter-head'><h2>" + esc(c.name) + "</h2>" +
              "<span class='en'>" + esc(c.en) + "</span>" +
              "<span class='count'>자료 " + items.length + "건</span></div>";
      if (c.note && state.chapter === c.id) html += "<div class='note-block'>" + esc(c.note) + "</div>";
      html += "<div class='grid'>" + items.map(card).join("") + "</div>";
    });
    el.innerHTML = html;
  }

  function card(h) {
    var secret = state.keeper && keeperNote(h.id) ? " has-secret" : "";
    var tags = (h.tags || []).slice(0, 3).map(function (t) {
      return "<span class='tagpill'>" + esc(t) + "</span>";
    }).join("");
    return "<article class='card" + secret + "' data-open='" + esc(h.id) + "' tabindex='0'>" +
      "<div class='card-tag'>" + esc(typeLabel(h.type)) + "</div>" +
      "<h3>" + esc(h.headline || h.title) + "</h3>" +
      "<div class='meta'>" + metaLine(h) + "</div>" +
      "<p class='excerpt'>" + esc(h.summary || "") + "</p>" +
      "<div class='foot'>" + tags + "</div>" +
      "</article>";
  }

  /* "날짜 · 출처" — 빈 칸은 건너뛴다 (예전엔 날짜 없는 자료가 "· 명함" 처럼 나왔다) */
  function metaLine(h) {
    return [h.dateLabel || h.date, h.source].filter(Boolean).map(esc).join(" · ");
  }

  function emptyMsg() {
    return "<div class='empty'><span class='big'>&#10022;</span>조건에 맞는 자료가 없습니다.</div>";
  }

  /* ---------------- 연표 ---------------- */

  function renderTimeline() {
    var list = archiveList().filter(matches).sort(sortByDate);
    var el = document.getElementById("view-timeline");
    if (!list.length) { el.innerHTML = emptyMsg(); return; }

    var html = "<div class='timeline'>", year = null;
    list.forEach(function (h) {
      var y = yearOf(h);
      if (y !== year) { year = y; html += "<div class='tl-year'>" + esc(y) + "</div>"; }
      html += "<div class='tl-item' data-open='" + esc(h.id) + "' tabindex='0'>" +
        "<div class='tl-date'>" + esc(h.dateLabel || h.date || "날짜 없음") + "</div>" +
        "<div><div class='tl-title'>" + esc(h.headline || h.title) + "</div>" +
        "<div class='tl-sub'>" + esc(typeLabel(h.type)) +
          (h.source ? " · " + esc(h.source) : "") + "</div></div></div>";
    });
    el.innerHTML = html + "</div>";
  }

  /* ---------------- 인물 ---------------- */

  function renderPeople() {
    var q = state.query.trim().toLowerCase();
    var list = (D.people || []).filter(function (p) {
      if (state.chapter !== "all" && p.chapter !== state.chapter) return false;
      if (!q) return true;
      return (p.name + " " + p.en + " " + p.role + " " + p.desc).toLowerCase().indexOf(q) !== -1;
    });
    var el = document.getElementById("view-people");
    if (!list.length) { el.innerHTML = emptyMsg(); return; }

    el.innerHTML = "<div class='people-grid'>" + list.map(function (p) {
      var n = refsOf(p.name).length;
      return "<article class='person' data-person='" + esc(p.name) + "' tabindex='0'>" +
        "<h3>" + esc(p.name) + "</h3>" +
        "<div class='en'>" + esc(p.en || "") + "</div>" +
        "<p class='role'>" + esc(p.role || "") + "</p>" +
        "<p class='desc'>" + esc(p.desc || "") + "</p>" +
        "<span class='status " + esc(p.status || "") + "'>" + esc(statusOf(p)) + "</span>" +
        "<span class='ref-count'>관련 자료 " + n + "건</span>" +
        "</article>";
    }).join("") + "</div>";
  }

  var STATUS_LABEL = { alive: "생존", dead: "사망", missing: "행방 불명", unknown: "미상" };
  function statusOf(p) { return p.statusText || STATUS_LABEL[p.status] || "미상"; }
  function personByName(n) { return (D.people || []).filter(function (p) { return p.name === n; })[0]; }
  function refsOf(name) {
    return D.handouts.filter(function (h) {
      return (h.people || []).indexOf(name) !== -1;
    }).sort(sortByDate);
  }

  /* 인물 상세 — 자료 · 함께 언급된 인물 · 지명으로 이어진다 */
  function personHtml(p) {
    if (!p) return "";
    var refs = refsOf(p.name);
    var others = {}, places = {};
    refs.forEach(function (h) {
      (h.people || []).forEach(function (n) { if (n !== p.name) others[n] = 1; });
      (h.places || []).forEach(function (pl) { places[pl] = 1; });
    });

    var parts = ["<div class='doc person-file'>"];
    parts.push("<div class='pf-head'>" +
      "<h2 id='modal-title'>" + esc(p.name) + "</h2>" +
      "<p class='pf-en'>" + esc(p.en || "") + "</p>" +
      "<p class='pf-role'>" + esc(p.role || "") + "</p>" +
      "<span class='pf-status " + esc(p.status || "") + "'>" + esc(statusOf(p)) + "</span>" +
      "</div>");

    if (p.desc) parts.push("<div class='body'>" + fmt(p.desc) + "</div>");

    parts.push("<div class='pf-block'><h3>이 인물이 나오는 자료</h3>" +
      (refs.length
        ? "<ul class='pf-refs'>" + refs.map(function (h) {
            return "<li data-open='" + esc(h.id) + "' tabindex='0'>" +
              "<span class='pf-ref-title'>" + esc(h.headline || h.title) + "</span>" +
              "<span class='pf-ref-meta'>" + esc(typeLabel(h.type)) +
              (h.dateLabel ? " · " + esc(h.dateLabel) : "") + "</span></li>";
          }).join("") + "</ul>"
        : "<p class='pf-none'>아직 없습니다.</p>") + "</div>");

    var otherNames = Object.keys(others).filter(personByName);
    if (otherNames.length) {
      parts.push("<div class='pf-block'><h3>같은 자료에 함께 나오는 인물</h3><div class='pf-chips'>" +
        otherNames.map(function (n) {
          return "<button class='linkchip' data-person='" + esc(n) + "'>" + esc(n) + "</button>";
        }).join("") + "</div></div>");
    }

    var placeNames = Object.keys(places);
    if (placeNames.length) {
      parts.push("<div class='pf-block'><h3>관련 지명</h3><div class='pf-chips'>" +
        placeNames.map(function (pl) {
          return "<button class='linkchip place' data-place='" + esc(pl) + "'>" + esc(pl) + "</button>";
        }).join("") + "</div>" +
        "<p class='pf-hint'>지명을 누르면 그 지명이 나오는 자료를 모아 봅니다.</p></div>");
    }

    parts.push("</div>");
    return parts.join("");
  }

  /* ---------------- 장서 ---------------- */

  function renderLibrary() {
    var lib = D.library || { books: [] };
    var q = state.query.trim().toLowerCase();
    var books = lib.books.filter(function (b) {
      return !q || (b.title + " " + b.desc + " " + b.year).toLowerCase().indexOf(q) !== -1;
    });
    document.getElementById("view-library").innerHTML =
      "<div class='chapter-head'><h2>" + esc(lib.title || "장서") + "</h2>" +
      "<span class='en'>BIBLIOGRAPHY</span><span class='count'>" + books.length + "권</span></div>" +
      (lib.note ? "<div class='note-block'>" + esc(lib.note) + "</div>" : "") +
      (books.length
        ? "<div class='shelf'>" + books.map(function (b) {
            return "<div class='book'><div class='yr'>" + esc(b.year) + "</div>" +
              "<div><h4>《" + esc(b.title) + "》</h4><p>" + esc(b.desc) + "</p></div></div>";
          }).join("") + "</div>"
        : emptyMsg());
  }

  /* ---------------- 지도 ---------------- */

  function renderMaps() {
    var maps = D.handouts.filter(isMap).filter(matches).sort(sortByDate);
    var el = document.getElementById("view-maps");
    el.innerHTML = maps.length
      ? "<div class='chapter-head'><h2>지도</h2><span class='en'>MAPS</span>" +
        "<span class='count'>" + maps.length + "장</span></div>" +
        "<div class='grid'>" + maps.map(card).join("") + "</div>"
      : emptyMsg();
  }

  /* ---------------- 상세 문서 ---------------- */

  /* 실물에 제목이 인쇄돼 있는 유형. 나머지(편지·전보·메모·사진·전단)는
     제목이 아카이브용 이름일 뿐이라 종이 위에 찍지 않는다. */
  var PRINTED_TITLE = { news: 1, card: 1, matchbook: 1, dossier: 1, map: 1 };
  /* 실물 크기가 작은 물건 — 창 가운데에 좁게 놓는다 */
  var SMALL_OBJECT = { card: 1, flyer: 1, matchbook: 1, photo: 1 };

  /* 화면 구성: [캡션: 유형 · 제목 · 출처/날짜]  [실물]  [정보: 생김새 · 인물 · 지명 · 태그]
     인쇄할 때는 실물만 나간다. */
  function docHtml(h) {
    var parts = [];

    parts.push("<header class='doc-cap'>" +
      "<span class='cap-type'>" + esc(typeLabel(h.type)) + "</span>" +
      "<h2 class='cap-title' id='modal-title'>" + esc(h.title) + "</h2>" +
      (metaLine(h) ? "<p class='cap-meta'>" + metaLine(h) + "</p>" : "") +
      "</header>");

    /* 유형 클래스에 t- 를 붙인다. 'card' 를 그대로 쓰면 목록 카드(.card)의
       장식과 hover 효과가 핸드아웃 창에 섞여 들어간다. */
    parts.push("<div class='doc t-" + esc(h.type) + (SMALL_OBJECT[h.type] ? " is-small" : "") +
      "' id='doc-print'>");
    if (h.back) parts.push("<span class='side-lbl'>앞면</span>");
    if (h.stamp) parts.push("<div class='stamp'>" + esc(h.stamp) + "</div>");

    if (h.type === "telegram") {
      var tm = h.telegramMeta || {};
      parts.push(
        "<div class='tg-head'>" +
          "<p class='tg-fine'>This company TRANSMITS and RECEIVES messages subject to the terms and conditions on the back of this blank.</p>" +
          "<p class='tg-brand'>WORLD-WIDE TELEGRAPH SERVICE</p>" +
          "<p class='tg-fine'>KINDLY RECEIVED at " + esc(tm.office || "") + "</p>" +
          "<div class='tg-boxes'><span>DATED " + esc(tm.dated || h.date) + "</span>" +
          "<span>RECEIVED " + esc(tm.received || "") + "</span>" +
          "<span>CHARGE " + esc(tm.charge || "") + "</span></div>" +
        "</div>");
    } else if (h.type === "news") {
      parts.push("<div class='paper-name'><span>" + esc(h.source || "") + "</span><span>" +
        esc(h.dateLabel || h.date || "") + "</span></div>");
    } else if (h.type === "letter" && h.letterMeta) {
      parts.push("<div class='lt-head'><span>" + esc(h.letterMeta.place || "") + "</span>" +
        "<span>" + esc(h.letterMeta.when || h.dateLabel || "") + "</span></div>");
    }

    if (PRINTED_TITLE[h.type]) {
      parts.push("<h2 class='doc-title'>" + esc(h.headline || h.title) + "</h2>");
    }

    if (h.subheads) {
      parts.push("<div class='news-subheads'>" + h.subheads.map(function (s) {
        return "<p>" + esc(s) + "</p>";
      }).join("") + "</div>");
    }
    if (h.byline) parts.push("<p class='news-byline'>" + esc(h.byline) + "</p>");

    if (h.type === "photo") {
      /* 사진은 인화지 틀을 항상 그린다. 원본 파일이 없으면 틀 안에 안내만 남는다. */
      parts.push("<figure class='photo-print" + (h.image ? "" : " is-missing") + "'>" +
        (h.image ? "<img src='" + esc(h.image) + "' alt='" + esc(h.title) + "'>" : "") +
        "</figure>");
    } else if (h.image) {
      parts.push("<figure class='doc-figure'>" +
        "<img src='" + esc(h.image) + "' alt='" + esc(h.title) + "'>" +
        "</figure>");
    }

    if (h.type === "letter" && h.letterMeta && h.letterMeta.to) {
      parts.push("<p class='lt-to'>" + esc(h.letterMeta.to) + "</p>");
    }

    parts.push("<div class='body'>" + fmt(h.body) + "</div>");

    if (h.type === "letter" && h.letterMeta) {
      parts.push("<div class='lt-sign'>" +
        (h.letterMeta.from ? "<p class='lt-from'>" + esc(h.letterMeta.from) + "</p>" : "") +
        (h.letterMeta.signature ? "<p class='lt-scrawl'>" + esc(h.letterMeta.signature) + "</p>" : "") +
        "</div>");
    }

    if (h.motto) parts.push("<div class='mb-band'><span>&ldquo;" + esc(h.motto) + "&rdquo;</span></div>");

    if (h.legendGroups) {
      parts.push("<div class='map-legend'>" + h.legendGroups.map(function (g) {
        return "<div class='legend-group'><h3>" + esc(g.title) + "</h3><ul class='legend-list'>" +
          (g.items || []).map(function (it) {
            return "<li><span class='num'>" + esc(it.n) + "</span>" +
                   "<span class='nm'>" + esc(it.name) + "</span></li>";
          }).join("") + "</ul></div>";
      }).join("") + "</div>");
    }
    parts.push("</div>");                                   /* 실물 끝 */

    /* 뒷면에 손으로 적힌 것 (명함 등) */
    if (h.back) {
      parts.push("<div class='doc t-" + esc(h.type) + " card-back" +
        (SMALL_OBJECT[h.type] ? " is-small" : "") + "'>" +
        "<span class='side-lbl'>뒷면</span>" +
        "<p class='back-hand'>" + esc(h.back) + "</p></div>");
    }

    var rows = "";
    if (h.objectNote) {
      rows += "<div class='info-row note'><span class='lbl'>생김새</span>" +
        "<p class='obj-note'>" + esc(h.objectNote) + "</p></div>";
    }
    var whom = (h.people || []).filter(personByName);
    if (whom.length) {
      rows += "<div class='info-row'><span class='lbl'>인물</span><div class='chips'>" + whom.map(function (n) {
        return "<button class='linkchip' data-person='" + esc(n) + "'>" + esc(n) + "</button>";
      }).join("") + "</div></div>";
    }
    if ((h.places || []).length) {
      rows += "<div class='info-row'><span class='lbl'>지명</span><div class='chips'>" + h.places.map(function (p) {
        return "<button class='linkchip place' data-place='" + esc(p) + "'>" + esc(p) + "</button>";
      }).join("") + "</div></div>";
    }
    if ((h.tags || []).length) {
      rows += "<div class='info-row'><span class='lbl'>태그</span><div class='chips'>" + h.tags.map(function (t) {
        return "<span class='tagpill'>" + esc(t) + "</span>";
      }).join("") + "</div></div>";
    }
    parts.push("<section class='doc-info'>" + rows +
      "<div class='info-actions'><button class='btn-print'>인쇄 / PDF</button></div></section>");

    if (state.keeper && keeperNote(h.id)) {
      parts.push("<div class='keeper-box'><span class='lbl'>KEEPER ONLY</span>" + fmt(keeperNote(h.id)) + "</div>");
    }
    return parts.join("");
  }

  /* ----------------------------------------------------------
     팝업 창
     자료 → 인물 → 다른 자료로 타고 들어갈 수 있고,
     '←' 로 한 단계씩 돌아온다. 배경 페이지는 스크롤되지 않는다.
     ---------------------------------------------------------- */

  var lastFocus = null;
  var trail = [];                      /* [{kind:'doc'|'person', key:'...'}] */

  function openDoc(id)      { pushEntry("doc", id); }
  function openPerson(name) { pushEntry("person", name); }

  function pushEntry(kind, key) {
    var exists = kind === "doc" ? byId(key) : personByName(key);
    if (!exists) return;
    var top = trail[trail.length - 1];
    if (!top || top.kind !== kind || top.key !== key) trail.push({ kind: kind, key: key });
    paintModal();
  }

  function paintModal() {
    var cur = trail[trail.length - 1];
    if (!cur) { closeDoc(); return; }

    var body = document.getElementById("modal-body");
    var back = document.getElementById("modal-back");

    var html = "";
    try {
      html = cur.kind === "doc"
        ? docHtml(byId(cur.key))
        : personHtml(personByName(cur.key));
    } catch (err) {
      html = errorDoc(cur, err.message);
    }
    /* 빈 창이 뜨는 일이 없도록 — 내용이 비면 이유를 보여 준다 */
    if (!html) html = errorDoc(cur, "내용을 만들지 못했습니다.");

    body.innerHTML = html;

    /* 이미지가 없으면 자리를 지운다 (사진은 틀만 남기고 '원본 없음' 표시).
       캐시된 404 는 리스너를 달기 전에 이미 실패해 있을 수 있어서 complete 도 확인한다. */
    body.querySelectorAll(".doc-figure img, .photo-print img").forEach(function (img) {
      function fail() {
        var fig = img.parentNode;
        if (!fig) return;
        if (fig.classList.contains("photo-print")) { fig.classList.add("is-missing"); img.remove(); }
        else fig.remove();
      }
      if (img.complete && !img.naturalWidth) fail();
      else img.addEventListener("error", fail);
    });

    if (back) back.hidden = trail.length < 2;

    var ov = document.getElementById("overlay");
    if (ov.hidden) {
      lastFocus = document.activeElement;
      ov.hidden = false;
      document.body.classList.add("modal-open", "print-doc");
    }
    ov.scrollTop = 0;
    ov.querySelector(".modal").focus({ preventScroll: true });
    setHash(cur);
  }

  /* 창이 비어 버리는 상황을 눈에 보이게 만든다.
     style.css 가 어떤 상태든 보이도록 인라인 스타일만 쓴다. */
  function errorDoc(cur, msg) {
    console.error("[Masks] 창을 그리지 못했습니다:", cur, msg);
    return "<div style=\"background:#f2e7cd;color:#241d13;padding:28px 30px;" +
      "font-family:serif;line-height:1.8\">" +
      "<h2 style=\"margin:0 0 14px;font-size:22px\">이 자료를 열지 못했습니다</h2>" +
      "<p style=\"margin:0 0 10px\"><b>" + esc(cur.kind === "doc" ? "자료" : "인물") +
      ":</b> " + esc(cur.key) + "</p>" +
      "<p style=\"margin:0 0 10px\"><b>원인:</b> " + esc(msg) + "</p>" +
      "<p style=\"margin:0 0 10px\">브라우저가 옛 파일을 쓰고 있을 수 있습니다. " +
      "<b>Ctrl + Shift + R</b> 로 새로고침해 보세요.</p>" +
      "<p style=\"margin:0;font-size:13px;color:#6d5c40\">앱 버전 " + APP_VERSION +
      " · 자료 " + D.handouts.length + "건 · 인물 " + (D.people || []).length + "명</p>" +
      "</div>";
  }

  function modalBack() {
    trail.pop();
    if (trail.length) paintModal(); else closeDoc();
  }

  function setHash(cur) {
    if (!history.replaceState) return;
    var h = cur.kind === "doc" ? cur.key : "p/" + encodeURIComponent(cur.key);
    history.replaceState(null, "", "#" + h);
  }

  function openFromHash(raw) {
    if (!raw) return;
    if (raw.indexOf("p/") === 0) openPerson(decodeURIComponent(raw.slice(2)));
    else openDoc(raw);
  }

  function closeDoc() {
    var ov = document.getElementById("overlay");
    trail = [];
    if (ov.hidden) return;
    ov.hidden = true;
    document.body.classList.remove("modal-open", "print-doc");
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* 지명 칩 — 그 지명이 나오는 자료를 아카이브에서 모아 본다 */
  function gotoPlace(place) {
    closeDoc();
    state.view = "archive";
    state.type = "all";
    state.query = place;
    document.getElementById("search").value = place;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- 렌더 ---------------- */

  function render() {
    renderFilters();
    ["archive", "timeline", "maps", "people", "library"].forEach(function (v) {
      var el = document.getElementById("view-" + v);
      if (el) el.hidden = (v !== state.view);
    });
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.view === state.view);
    });
    document.body.classList.toggle("on-maps", state.view === "maps");
    if (state.view === "archive") renderArchive();
    else if (state.view === "timeline") renderTimeline();
    else if (state.view === "maps") renderMaps();
    else if (state.view === "people") renderPeople();
    else renderLibrary();
  }

  /* ---------------- 이벤트 ---------------- */

  document.getElementById("tabs").addEventListener("click", function (e) {
    var b = e.target.closest(".tab");
    if (!b) return;
    state.view = b.dataset.view;
    render();
  });

  document.getElementById("filters").addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    state[b.dataset.kind] = b.dataset.val;
    render();
  });

  var searchEl = document.getElementById("search");
  searchEl.addEventListener("input", function () { state.query = searchEl.value; render(); });

  if (keeperEl) {
    keeperEl.checked = state.keeper;
    keeperEl.addEventListener("change", function () {
      state.keeper = keeperEl.checked;
      localStorage.setItem("masks.keeper", state.keeper ? "1" : "0");
      var ov = document.getElementById("overlay");
      render();
      if (!ov.hidden) paintModal();
    });
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest(".btn-print")) { window.print(); return; }
    if (e.target.closest("#modal-back")) { modalBack(); return; }
    if (e.target.closest("#modal-close") || e.target.id === "overlay") { closeDoc(); return; }

    var place = e.target.closest("[data-place]");
    if (place) { gotoPlace(place.dataset.place); return; }

    var person = e.target.closest("[data-person]");
    if (person) { openPerson(person.dataset.person); return; }

    var opener = e.target.closest("[data-open]");
    if (opener) { openDoc(opener.dataset.open); return; }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeDoc(); return; }
    if (e.key === "Backspace" && trail.length > 1 &&
        !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      modalBack(); e.preventDefault(); return;
    }
    var a = document.activeElement;
    if (e.key === "Enter" && a && a.dataset) {
      if (a.dataset.open)   { openDoc(a.dataset.open); e.preventDefault(); return; }
      if (a.dataset.person) { openPerson(a.dataset.person); e.preventDefault(); return; }
    }
    if (e.key === "/" && a !== searchEl) {
      e.preventDefault(); searchEl.focus(); searchEl.select();
    }
  });

  /* ---------------- 시작 ---------------- */

  render();
  if (location.hash.length > 1) openFromHash(location.hash.slice(1));
})();
