/* ==========================================================
   市川学園文化祭 共通スクリプト（全ページ共通）
   1. ハンバーガーメニュー
   2. ページ先頭へ戻るボタン
   3. 絞り込み・検索（企画展示 / お知らせ / 落し物）
   4. タイムテーブル（日・会場の切り替え、マイ予定）
   5. お知らせのリンク先を自動で開く
   ========================================================== */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var norm = function (s) { return (s || '').normalize('NFKC').toLowerCase(); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  /* ---------- 1. ハンバーガーメニュー ---------- */
  function initMenu() {
    var btn = $('[data-menu-toggle]');
    var drawer = $('#drawer');
    var overlay = $('.drawer-overlay');
    if (!btn || !drawer) return;

    var label = $('.menu-btn__label', btn);
    var lastFocus = null;

    function isOpen() { return drawer.classList.contains('is-open'); }

    function open() {
      lastFocus = document.activeElement;
      drawer.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'とじる';
      document.body.classList.add('is-locked');
      var target = $('a[aria-current="page"]', drawer) || $('a', drawer);
      requestAnimationFrame(function () { if (target) target.focus({ preventScroll: true }); });
    }

    function close() {
      drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'メニュー';
      document.body.classList.remove('is-locked');
      (lastFocus || btn).focus({ preventScroll: true });
    }

    btn.addEventListener('click', function () { isOpen() ? close() : open(); });
    $$('[data-menu-close]').forEach(function (el) { el.addEventListener('click', close); });
    // メニュー内のリンクをタップしたら閉じる（同一ページ内リンクの場合に備える）
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { if (isOpen()) close(); }); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close();
    });

    // Tabキーがメニューの外へ出ないようにする
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('a[href], button:not([disabled])', drawer);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }


  /* ---------- 2. ページ先頭へ戻るボタン ---------- */
  function initToTop() {
    var btn = $('.to-top');
    if (!btn) return;
    var ticking = false;
    function update() {
      btn.classList.toggle('is-show', window.scrollY > 420);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    update();
  }


  /* ---------- 3. 絞り込み・検索 ----------
     <div data-filter-root>
       <input data-search>
       <button data-chip="カテゴリ名 or all" aria-pressed="true|false">
       <span data-count>
       <li data-item data-category="カテゴリ名">
       <p data-empty hidden>
  */
  function initFilter(root) {
    var chips = $$('[data-chip]', root);
    var items = $$('[data-item]', root);
    var search = $('[data-search]', root);
    var count = $('[data-count]', root);
    var empty = $('[data-empty]', root);
    var cat = 'all';
    var words = [];

    items.forEach(function (it) { it._text = norm(it.textContent); });

    function apply() {
      var n = 0;
      items.forEach(function (it) {
        var okCat = cat === 'all' || it.getAttribute('data-category') === cat;
        var okWord = words.every(function (w) { return it._text.indexOf(w) !== -1; });
        var show = okCat && okWord;
        it.hidden = !show;
        if (show) n++;
      });
      if (count) count.textContent = n;
      if (empty) empty.hidden = n !== 0;
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        cat = chip.getAttribute('data-chip');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        apply();
      });
    });

    if (search) {
      search.addEventListener('input', function () {
        words = norm(search.value).split(/\s+/).filter(Boolean);
        apply();
      });
    }
    apply();
  }


  /* ---------- 4. タイムテーブル ---------- */
  function initTimetable(root) {
    var KEY = 'bunkasai:my-schedule';
    var tabs = $$('[data-day-tab]', root);
    var panels = $$('[data-day-panel]', root);
    var stageChips = $$('[data-stage-chip]', root);
    var favOnlyBtn = $('[data-fav-only]', root);
    var slots = $$('[data-slot]', root);
    var countEl = $('[data-count]', root);
    var stage = 'all';
    var favOnly = false;
    var current = 0;
    var favs = [];

    try { favs = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { favs = []; }
    function isFav(id) { return favs.indexOf(id) !== -1; }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(favs)); } catch (e) { /* 保存できない環境では何もしない */ } }

    function paintStar(btn, on, title) {
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? '★' : '☆';
      btn.setAttribute('aria-label', (on ? 'マイ予定から外す：' : 'マイ予定に追加：') + title);
    }

    // 星ボタンの初期表示
    slots.forEach(function (slot) {
      var star = $('[data-star]', slot);
      var title = $('.slot__title', slot).textContent.trim();
      paintStar(star, isFav(slot.getAttribute('data-id')), title);
      star.addEventListener('click', function () {
        var id = slot.getAttribute('data-id');
        var idx = favs.indexOf(id);
        if (idx === -1) favs.push(id); else favs.splice(idx, 1);
        save();
        paintStar(star, idx === -1, title);
        if (favOnly) apply();
      });
    });

    function apply() {
      slots.forEach(function (slot) {
        var okStage = stage === 'all' || slot.getAttribute('data-stage') === stage;
        var okFav = !favOnly || isFav(slot.getAttribute('data-id'));
        slot.hidden = !(okStage && okFav);
      });
      panels.forEach(function (panel, i) {
        var visible = $$('[data-slot]:not([hidden])', panel);
        $$('[data-slot]', panel).forEach(function (s) { s.classList.remove('is-last'); });
        if (visible.length) visible[visible.length - 1].classList.add('is-last');
        var emptyMsg = $('[data-panel-empty]', panel);
        if (emptyMsg) emptyMsg.hidden = visible.length !== 0;
        if (i === current && countEl) countEl.textContent = visible.length;
      });
    }

    function selectDay(i, moveFocus) {
      current = i;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p, k) { p.hidden = k !== i; });
      if (moveFocus) tabs[i].focus();
      apply();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectDay(i, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) { e.preventDefault(); selectDay(next, true); }
      });
    });

    stageChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        stage = chip.getAttribute('data-stage-chip');
        stageChips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        apply();
      });
    });

    if (favOnlyBtn) {
      favOnlyBtn.addEventListener('click', function () {
        favOnly = !favOnly;
        favOnlyBtn.setAttribute('aria-pressed', String(favOnly));
        apply();
      });
    }

    selectDay(0, false);
  }


  /* ---------- 5. お知らせ：#リンクで該当の項目を開く ---------- */
  function openHashNotice() {
    var id = decodeURIComponent(location.hash.replace('#', ''));
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') el.open = true;
  }


  /* ---------- 起動 ---------- */
  function init() {
    initMenu();
    initToTop();
    $$('[data-filter-root]').forEach(initFilter);
    var tt = $('[data-timetable]');
    if (tt) initTimetable(tt);
    openHashNotice();
    window.addEventListener('hashchange', openHashNotice);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
