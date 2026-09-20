/* ==========================================================
   なずな祭 共通スクリプト

   1. ハンバーガーメニュー
   2. ページ先頭へ戻るボタン
   3. 企画展示の生成・絞り込み・検索
   4. タイムテーブル
   5. お知らせのリンク先を自動で開く
   ========================================================== */

(() => {
  'use strict';


  /* ========================================================
     共通ヘルパー
     ======================================================== */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const norm = (text) =>
    (text || '').normalize('NFKC').toLowerCase();

  const reduceMotion =
    window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  /* ========================================================
     1. ハンバーガーメニュー
     ======================================================== */

  function initMenu() {
    const btn = $('[data-menu-toggle]');
    const drawer = $('#drawer');
    const overlay = $('.drawer-overlay');

    if (!btn || !drawer) return;

    const label = $('.menu-btn__label', btn);

    let lastFocus = null;

    const isOpen = () =>
      drawer.classList.contains('is-open');


    const open = () => {
      lastFocus = document.activeElement;

      drawer.classList.add('is-open');

      overlay?.classList.add('is-open');

      btn.setAttribute(
        'aria-expanded',
        'true'
      );

      if (label) {
        label.textContent = 'とじる';
      }

      document.body.classList.add(
        'is-locked'
      );

      const target =
        $('a[aria-current="page"]', drawer) ||
        $('a', drawer);

      requestAnimationFrame(() => {
        target?.focus({
          preventScroll: true
        });
      });
    };


    const close = () => {
      drawer.classList.remove('is-open');

      overlay?.classList.remove('is-open');

      btn.setAttribute(
        'aria-expanded',
        'false'
      );

      if (label) {
        label.textContent = 'メニュー';
      }

      document.body.classList.remove(
        'is-locked'
      );

      (lastFocus || btn).focus({
        preventScroll: true
      });
    };


    btn.addEventListener('click', () => {
      isOpen() ? close() : open();
    });


    $$('[data-menu-close]').forEach((element) => {
      element.addEventListener(
        'click',
        close
      );
    });


    $$('a', drawer).forEach((link) => {
      link.addEventListener('click', () => {
        if (isOpen()) {
          close();
        }
      });
    });


    document.addEventListener('keydown', (event) => {
      if (
        event.key === 'Escape' &&
        isOpen()
      ) {
        close();
      }
    });


    drawer.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;

      const focusable = $$(
        'a[href], button:not([disabled])',
        drawer
      );

      if (!focusable.length) return;

      const first = focusable[0];
      const last =
        focusable[focusable.length - 1];


      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();

      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    });
  }


  /* ========================================================
     2. ページ先頭へ戻るボタン
     ======================================================== */

  function initToTop() {
    const btn = $('.to-top');

    if (!btn) return;

    let ticking = false;


    const update = () => {
      btn.classList.toggle(
        'is-show',
        window.scrollY > 420
      );

      ticking = false;
    };


    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;

        ticking = true;

        requestAnimationFrame(update);
      },
      { passive: true }
    );


    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion
          ? 'auto'
          : 'smooth'
      });
    });


    update();
  }


  /* ========================================================
     3. 企画展示
     ======================================================== */

  /*
    HTML側はこれだけでOK

    <li
      data-item
      data-category="food"
    >
      企画名｜団体名｜場所｜説明
    </li>

    category

      food
      exhibit
      experience
      goods
  */


  function makeExhibits(root) {
    const categoryNames = {
      food: '飲食',
      exhibit: '展示',
      experience: '体験',
      goods: '物販'
    };


    $$('[data-item]', root).forEach((item) => {

      const data = item.textContent
        .trim()
        .split('｜')
        .map((text) => text.trim());


      const [
        title = '',
        organization = '',
        place = '',
        description = ''
      ] = data;


      const category =
        item.dataset.category || '';


      item.classList.add('shop');


      item.innerHTML = `
        <div
          class="awning"
          aria-hidden="true"
        ></div>

        <div class="shop__body">

          <div class="shop__meta">
            <span class="tag"></span>
            <span class="shop__place"></span>
          </div>

          <h2 class="shop__title"></h2>

          <p class="shop__org"></p>

          <p class="shop__desc"></p>

        </div>
      `;


      $('.tag', item).textContent =
        categoryNames[category] || '';

      $('.shop__place', item).textContent =
        place;

      $('.shop__title', item).textContent =
        title;

      $('.shop__org', item).textContent =
        organization;

      $('.shop__desc', item).textContent =
        description;
    });
  }


  /* ========================================================
     企画展示の検索・絞り込み
     ======================================================== */

  function initFilter(root) {
    const chips =
      $$('[data-chip]', root);

    const items =
      $$('[data-item]', root);

    const search =
      $('[data-search]', root);

    const count =
      $('[data-count]', root);

    const empty =
      $('[data-empty]', root);


    let category = 'all';
    let words = [];


    items.forEach((item) => {
      item._text =
        norm(item.textContent);
    });


    const apply = () => {

      let visibleCount = 0;


      items.forEach((item) => {

        const categoryMatch =
          category === 'all' ||
          item.dataset.category === category;


        const wordMatch =
          words.every((word) =>
            item._text.includes(word)
          );


        const visible =
          categoryMatch &&
          wordMatch;


        item.hidden = !visible;


        if (visible) {
          visibleCount++;
        }
      });


      if (count) {
        count.textContent =
          visibleCount;
      }


      if (empty) {
        empty.hidden =
          visibleCount !== 0;
      }
    };


    chips.forEach((chip) => {

      chip.addEventListener('click', () => {

        category =
          chip.dataset.chip;


        chips.forEach((button) => {
          button.setAttribute(
            'aria-pressed',
            String(button === chip)
          );
        });


        apply();
      });
    });


    search?.addEventListener(
      'input',
      () => {

        words =
          norm(search.value)
            .split(/\s+/)
            .filter(Boolean);


        apply();
      }
    );


    apply();
  }


  /* ========================================================
     4. タイムテーブル
     ======================================================== */

  function initTimetable(timetable) {

    const STORAGE_KEY =
      'nazuna-timetable-favorites';


    const stageNames = {
      gym: 'アリーナ',
      hall: '國枝ホール',
      yard: '北館中庭'
    };


    const stageClasses = {
      gym: 'st-gym',
      hall: 'st-hall',
      yard: 'st-yard'
    };


    let favorites =
      loadFavorites();


    let currentStage = 'all';

    let favoriteOnly = false;


    /* ------------------------------------------------------
       公演データを生成
       ------------------------------------------------------ */

    $$(
      '[data-day-panel]',
      timetable
    ).forEach((panel) => {

      const day =
        panel.dataset.day;


      const timeline =
        $('.timeline', panel);


      if (!timeline) return;


      $$(
        ':scope > li',
        timeline
      ).forEach((item, index) => {

        const time =
          item.dataset.time || '';


        const end =
          item.dataset.end || '';


        const stage =
          item.dataset.stage || 'gym';


        const text =
          item.textContent.trim();


        const [
          title = '',
          by = ''
        ] =
          text
            .split('/')
            .map((value) =>
              value.trim()
            );


        const id =
  item.dataset.id || `d${day}-${index + 1}`;


        item.dataset.slot = '';

        item.dataset.id = id;

        item.dataset.stage = stage;


        item.className =
          `slot ${
            stageClasses[stage] || ''
          }`;


        item.innerHTML = `
          <div class="slot__time">

            <b>
              ${escapeHTML(time)}
            </b>

            <small>
              〜${escapeHTML(end)}
            </small>

          </div>


          <div class="slot__card">

            <span class="slot__place">
              ${
                escapeHTML(
                  stageNames[stage] ||
                  stage
                )
              }
            </span>


            <h2 class="slot__title">
              ${escapeHTML(title)}
            </h2>


            <p class="slot__by">
              ${escapeHTML(by)}
            </p>


            <button
              class="star"
              type="button"
              aria-label="${escapeHTML(
                title
              )}をマイ予定に追加"
              aria-pressed="false"
              data-star
            >
              ☆
            </button>

          </div>
        `;


        const star =
          $('[data-star]', item);


        if (
          favorites.includes(id)
        ) {
          setFavorite(
            item,
            star,
            true
          );
        }


        star.addEventListener(
          'click',
          () => {

            const isFavorite =
              !favorites.includes(id);


            if (isFavorite) {

              favorites.push(id);

            } else {

              favorites =
                favorites.filter(
                  (value) =>
                    value !== id
                );
            }


            saveFavorites();


            setFavorite(
              item,
              star,
              isFavorite
            );


            updateTimetable();
          }
        );

      });
    });


    /* ------------------------------------------------------
       日付タブ
       ------------------------------------------------------ */

    const dayTabs =
      $$(
        '[data-day-tab]',
        timetable
      );


    const dayPanels =
      $$(
        '[data-day-panel]',
        timetable
      );


    dayTabs.forEach((tab) => {

      tab.addEventListener(
        'click',
        () => {

          const selectedDay =
            tab.dataset.day;


          dayTabs.forEach(
            (button) => {

              const active =
                button === tab;


              button.setAttribute(
                'aria-selected',
                String(active)
              );


              button.tabIndex =
                active ? 0 : -1;
            }
          );


          dayPanels.forEach(
            (panel) => {

              panel.hidden =
                panel.dataset.day !==
                selectedDay;
            }
          );


          updateTimetable();
        }
      );
    });


    /* ------------------------------------------------------
       会場フィルター
       ------------------------------------------------------ */

    const stageButtons =
      $$(
        '[data-stage-chip]',
        timetable
      );


    stageButtons.forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          currentStage =
            button.dataset.stageChip;


          stageButtons.forEach(
            (item) => {

              item.setAttribute(
                'aria-pressed',
                String(
                  item === button
                )
              );
            }
          );


          updateTimetable();
        }
      );
    });


    /* ------------------------------------------------------
       マイ予定フィルター
       ------------------------------------------------------ */

    const favoriteButton =
      $('[data-fav-only]', timetable);


    favoriteButton?.addEventListener(
      'click',
      () => {

        favoriteOnly =
          !favoriteOnly;


        favoriteButton.setAttribute(
          'aria-pressed',
          String(favoriteOnly)
        );


        updateTimetable();
      }
    );


    /* ------------------------------------------------------
       絞り込み
       ------------------------------------------------------ */

    function updateTimetable() {

      const activePanel =
        dayPanels.find(
          (panel) =>
            !panel.hidden
        );


      if (!activePanel) return;


      const slots =
        $$(
          '[data-slot]',
          activePanel
        );


      const empty =
        $('[data-panel-empty]', activePanel);


      let visibleCount = 0;


      slots.forEach((slot) => {

        const stage =
          slot.dataset.stage;


        const id =
          slot.dataset.id;


        const stageMatch =
          currentStage === 'all' ||
          stage === currentStage;


        const favoriteMatch =
          !favoriteOnly ||
          favorites.includes(id);


        const visible =
          stageMatch &&
          favoriteMatch;


        slot.hidden =
          !visible;


        if (visible) {
          visibleCount++;
        }
      });


      if (empty) {
        empty.hidden =
          visibleCount !== 0;
      }


      const count =
        $('[data-count]', timetable);


      if (count) {
        count.textContent =
          visibleCount;
      }
    }


    /* ------------------------------------------------------
       ☆表示
       ------------------------------------------------------ */

    function setFavorite(
      slot,
      star,
      active
    ) {

      if (!star) return;


      slot.classList.toggle(
        'is-favorite',
        active
      );


      star.setAttribute(
        'aria-pressed',
        String(active)
      );


      star.textContent =
        active ? '★' : '☆';


      const title =
        $('.slot__title', slot)
          ?.textContent
          .trim() || '';


      star.setAttribute(
        'aria-label',
        active
          ? `${title}をマイ予定から削除`
          : `${title}をマイ予定に追加`
      );
    }


    /* ------------------------------------------------------
       localStorage
       ------------------------------------------------------ */

    function loadFavorites() {

      try {

        const data =
          localStorage.getItem(
            STORAGE_KEY
          );


        const parsed =
          data
            ? JSON.parse(data)
            : [];


        return Array.isArray(parsed)
          ? parsed
          : [];

      } catch {

        return [];
      }
    }


    function saveFavorites() {

      try {

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            favorites
          )
        );

      } catch {
        // 保存できない環境では何もしない
      }
    }


    /* ------------------------------------------------------
       初期表示
       ------------------------------------------------------ */

    updateTimetable();
  }


  /* ========================================================
     HTMLエスケープ
     ======================================================== */

  function escapeHTML(value) {

    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }


  /* ========================================================
     5. お知らせ
     ======================================================== */

  function openHashNotice() {

    const id =
      decodeURIComponent(
        location.hash.replace(
          '#',
          ''
        )
      );


    if (!id) return;


    const element =
      document.getElementById(id);


    if (
      element &&
      element.tagName === 'DETAILS'
    ) {
      element.open = true;
    }
  }


  /* ========================================================
     起動
     ======================================================== */

  function init() {

    /* メニュー */
    initMenu();


    /* ページトップ */
    initToTop();


    /* 企画展示 */
    $$(
      '[data-filter-root]'
    ).forEach((root) => {

      makeExhibits(root);

      initFilter(root);
    });


    /* タイムテーブル */
    const timetable =
      $('[data-timetable]');


    if (timetable) {
      initTimetable(timetable);
    }


    /* お知らせ */
    openHashNotice();


    window.addEventListener(
      'hashchange',
      openHashNotice
    );
  }


  /* ========================================================
     DOM読み込み後に起動
     ======================================================== */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();
  }

})();