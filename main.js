"use strict";
/* ============================================================
   المصحف الإلكتروني - main.js
   نظام صفحات (604 صفحة) كالمصحف الحقيقي
   ============================================================ */

// Cache Invalidation Check (Forces fresh load for new PWA code updates)
const APP_VERSION = "v4";
if (localStorage.getItem("app_cache_version") !== APP_VERSION) {
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (let reg of regs) reg.unregister();
    });
  }
  if (window.caches) {
    caches.keys().then((keys) => {
      Promise.all(keys.map((key) => caches.delete(key))).then(() => {
        localStorage.removeItem("quranFullySynced");
        localStorage.removeItem("quranSyncedPagesCount");
        localStorage.setItem("app_cache_version", APP_VERSION);
        location.reload();
      });
    });
  }
}

// Global PWA Install prompt holder
let deferredPrompt;

// ============================================================
// SURAH START PAGES — Medina Mushaf (Hafs 'an 'Asim)
// Index = surah number (1-114), value = start page
// ============================================================
const SURAH_PAGES = [
  0,   // placeholder
  1,   2,   50,  77,  106, 128, 151, 177, 187, 208,  // 1-10
  221, 235, 249, 255, 262, 267, 282, 293, 305, 312,  // 11-20
  322, 332, 342, 350, 359, 367, 377, 385, 396, 404,  // 21-30
  411, 415, 418, 428, 434, 440, 446, 452, 458, 467,  // 31-40
  477, 483, 489, 496, 499, 502, 507, 511, 515, 518,  // 41-50
  520, 523, 526, 528, 531, 534, 537, 542, 544, 546,  // 51-60
  548, 550, 551, 553, 554, 556, 558, 560, 562, 564,  // 61-70
  566, 568, 569, 572, 574, 576, 577, 580, 582, 584,  // 71-80
  586, 587, 587, 589, 590, 591, 591, 592, 593, 594,  // 81-90
  595, 595, 596, 596, 597, 597, 598, 598, 599, 599,  // 91-100
  600, 600, 601, 601, 601, 602, 602, 602, 603, 603,  // 101-110
  603, 604, 604, 604,                                  // 111-114
];

const TOTAL_PAGES = 604;

// ============================================================
// STATE
// ============================================================
const state = {
  surahList:      [],
  currentPage:    null,
  currentPageData: null,
  flipDir:        "next",    // "next" | "prev"
  fontSize:       parseFloat(localStorage.getItem("qFontSize") || "1.85"),
  darkMode:       localStorage.getItem("qDarkMode") === "true",
  pendingBookmark: null,
  pendingAyahAction: null,
  // Audio
  audioPlaying:   false,
  audioAyah:      null,   // { surahNum, ayahNum, surahName }
};

// ============================================================
// DOM REFS
// ============================================================
const $ = (id) => document.getElementById(id);
const dom = {
  // Sidebar
  sidebar:          $("sidebar"),
  sidebarOverlay:   $("sidebarOverlay"),
  openSidebar:      $("openSidebar"),
  openSidebarWelcome: $("openSidebarWelcome"),
  closeSidebar:     $("closeSidebar"),
  surahSearch:      $("surahSearch"),
  surahList:        $("surahList"),
  // Navbar
  darkModeBtn:      $("darkModeBtn"),
  fontIncBtn:       $("fontIncBtn"),
  fontDecBtn:       $("fontDecBtn"),
  bookmarksNavBtn:  $("bookmarksNavBtn"),
  audioToggleBtn:   $("audioToggleBtn"),
  // Screens
  welcomeScreen:    $("welcomeScreen"),
  pageView:         $("pageView"),
  loadingState:     $("loadingState"),
  errorState:       $("errorState"),
  retryBtn:         $("retryBtn"),
  // Page elements
  pageInfoBar:      null, // already in DOM
  pageJuzInfo:      $("pageJuzInfo"),
  pageSurahNames:   $("pageSurahNames"),
  pageHizbInfo:     $("pageHizbInfo"),
  mushafPage:       $("mushafPage"),
  pageBody:         $("pageBody"),
  pageNumLabel:     $("pageNumLabel"),
  pageCounter:      $("pageCounter"),
  pageJump:         $("pageJump"),
  prevPageBtn:      $("prevPageBtn"),
  nextPageBtn:      $("nextPageBtn"),
  zoneLeft:         $("zoneLeft"),
  zoneRight:        $("zoneRight"),
  // Popovers
  colorPicker:      $("colorPicker"),
  ayahActions:      $("ayahActions"),
  copyAyahBtn:      $("copyAyahBtn"),
  shareAyahBtn:     $("shareAyahBtn"),
  listenAyahBtn:    $("listenAyahBtn"),
  // Modal
  bookmarksModal:   $("bookmarksModal"),
  closeModal:       $("closeModal"),
  bookmarksList:    $("bookmarksList"),
  // Audio
  audioPlayer:      $("audioPlayer"),
  audioAyahInfo:    $("audioAyahInfo"),
  audioPrevBtn:     $("audioPrevBtn"),
  audioPlayPauseBtn:$("audioPlayPauseBtn"),
  audioNextBtn:     $("audioNextBtn"),
  audioCloseBtn:    $("audioCloseBtn"),
  audioRewindBtn:   $("audioRewindBtn"),
  audioForwardBtn:  $("audioForwardBtn"),
  audioCurrentTime: $("audioCurrentTime"),
  audioProgressBar: $("audioProgressBar"),
  audioDuration:    $("audioDuration"),
  reciterSelect:    $("reciterSelect"),
  audioElement:     $("audioElement"),
  // Offline Sync
  offlineSyncContainer: $("offlineSyncContainer"),
  offlineSyncText:      $("offlineSyncText"),
  offlineSyncIcon:      $("offlineSyncIcon"),
  // PWA Install
  pwaInstallContainer:  $("pwaInstallContainer"),
  pwaInstallBtn:        $("pwaInstallBtn"),
  // Toast
  toast:            $("toast"),
};

// ============================================================
// PWA INSTALL LOGIC
// ============================================================
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (dom.pwaInstallContainer) {
    dom.pwaInstallContainer.classList.remove("hidden");
  }
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  if (dom.pwaInstallContainer) {
    dom.pwaInstallContainer.classList.add("hidden");
  }
  showToast("🎉 تم تثبيت التطبيق بنجاح!");
});

// ============================================================
// INIT
// ============================================================
function init() {
  applyDarkMode();
  applyFontSize();
  fetchSurahList();
  bindEvents();
  bindSwipe();
  registerServiceWorker();
  startOfflineSync();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then((reg) => console.log("[PWA] Service Worker registered with scope:", reg.scope))
        .catch((err) => console.error("[PWA] Service Worker registration failed:", err));
    });
  }
}

function startOfflineSync() {
  const isSynced = localStorage.getItem("quranFullySynced") === "true";
  const syncContainer = dom.offlineSyncContainer;
  const syncText = dom.offlineSyncText;
  const syncIcon = dom.offlineSyncIcon;

  if (isSynced) {
    if (syncContainer) syncContainer.classList.add("synced");
    if (syncText) syncText.textContent = "المصحف جاهز بالكامل للقراءة بدون إنترنت";
    if (syncIcon) syncIcon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #2ec771;"></i>';
    return;
  }

  if (!navigator.onLine) {
    if (syncText) syncText.textContent = "أنت غير متصل بالإنترنت لمزامنة المصحف";
    return;
  }

  let curPage = 1;
  const totalPages = 604;
  let syncedPagesCount = parseInt(localStorage.getItem("quranSyncedPagesCount") || "0");

  caches.open("quran-mushaf-cache-v4").then(async (cache) => {
    let batchSize = 15;

    function downloadNextBatch() {
      if (curPage > totalPages) {
        localStorage.setItem("quranFullySynced", "true");
        if (syncContainer) syncContainer.classList.add("synced");
        if (syncText) syncText.textContent = "المصحف جاهز بالكامل للقراءة بدون إنترنت";
        if (syncIcon) syncIcon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #2ec771;"></i>';
        return;
      }

      let promises = [];
      let batchEnd = Math.min(curPage + batchSize - 1, totalPages);

      for (let p = curPage; p <= batchEnd; p++) {
        const url = `https://api.alquran.cloud/v1/page/${p}/quran-uthmani`;
        promises.push(
          cache.match(url).then((res) => {
            if (res) {
              return true;
            } else {
              return fetch(url)
                .then((fetchRes) => {
                  if (fetchRes.status === 200) {
                    return cache.put(url, fetchRes.clone()).then(() => true);
                  }
                  return false;
                })
                .catch(() => false);
            }
          })
        );
      }

      Promise.all(promises).then((results) => {
        curPage += batchSize;
        syncedPagesCount = Math.min(totalPages, Math.max(syncedPagesCount, curPage - 1));
        localStorage.setItem("quranSyncedPagesCount", syncedPagesCount);

        let percent = Math.floor((syncedPagesCount / totalPages) * 100);
        if (syncText) syncText.textContent = `جاري تحميل المصحف أوفلاين: ${percent}%`;

        setTimeout(downloadNextBatch, 1800);
      });
    }

    downloadNextBatch();
  });
}

// ============================================================
// DARK MODE
// ============================================================
function applyDarkMode() {
  document.documentElement.dataset.theme = state.darkMode ? "dark" : "light";
  dom.darkModeBtn.innerHTML = state.darkMode ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-regular fa-moon"></i>';
}
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  localStorage.setItem("qDarkMode", state.darkMode);
  applyDarkMode();
}

// ============================================================
// FONT SIZE
// ============================================================
function applyFontSize() {
  dom.pageBody.style.fontSize = state.fontSize + "rem";
}
function changeFontSize(d) {
  state.fontSize = Math.min(3.2, Math.max(1.1, +(state.fontSize + d).toFixed(2)));
  localStorage.setItem("qFontSize", state.fontSize);
  applyFontSize();
  showToast(d > 0 ? "🔠 تكبير الخط" : "🔡 تصغير الخط");
}

// ============================================================
// SIDEBAR
// ============================================================
function openSidebar() {
  dom.sidebar.classList.add("open");
  dom.sidebarOverlay.classList.add("active");
  setTimeout(() => dom.surahSearch.focus(), 300);
}
function closeSidebar() {
  dom.sidebar.classList.remove("open");
  dom.sidebarOverlay.classList.remove("active");
}

// ============================================================
// SURAH LIST
// ============================================================
function fetchSurahList() {
  fetch("https://api.alquran.cloud/v1/surah")
    .then((r) => r.json())
    .then((d) => {
      state.surahList = d.data;
      renderSurahList(state.surahList);
    })
    .catch(() => showToast("⚠️ خطأ في تحميل قائمة السور"));
}

function renderSurahList(list) {
  dom.surahList.innerHTML = "";
  list.forEach((s) => {
    const li = document.createElement("li");
    li.className = "surah-list-item";
    li.dataset.num = s.number;
    li.innerHTML = `
      <div class="surah-num">${s.number}</div>
      <div class="surah-names">
        <span class="surah-name-ar">${s.name}</span>
        <span class="surah-name-en">${s.englishName}</span>
      </div>
      <span class="surah-ayah-count">${s.numberOfAyahs} آية</span>
    `;
    li.addEventListener("click", () => {
      const startPage = SURAH_PAGES[s.number] || 1;
      loadPage(startPage);
      closeSidebar();
    });
    dom.surahList.appendChild(li);
  });
}

function filterSurahList(q) {
  q = q.trim().toLowerCase();
  if (!q) { renderSurahList(state.surahList); return; }
  const filtered = state.surahList.filter(
    (s) => s.name.includes(q) || s.englishName.toLowerCase().includes(q) || String(s.number).includes(q)
  );
  renderSurahList(filtered);
}

// ============================================================
// LOAD PAGE — core function
// ============================================================
function loadPage(pageNum, direction) {
  pageNum = Math.max(1, Math.min(TOTAL_PAGES, parseInt(pageNum)));
  if (isNaN(pageNum)) return;

  if (direction === undefined) {
    direction = (state.currentPage && pageNum > state.currentPage) ? "next" : "prev";
  }
  state.flipDir = direction;
  state.currentPage = pageNum;

  showView("loading");

  fetch(`https://api.alquran.cloud/v1/page/${pageNum}/quran-uthmani`)
    .then((r) => {
      if (!r.ok) throw new Error("Network error");
      return r.json();
    })
    .then((data) => {
      state.currentPageData = data.data;
      renderPage();
    })
    .catch(() => {
      showView("error");
      dom.retryBtn.onclick = () => loadPage(pageNum);
    });
}

// ===================================// Robust bismillah stripping using multiple patterns
const BISMILLAH_PATTERNS = [
  /^بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ\s*/,   // Uthmani
  /^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/,   // Alt Uthmani
  /^بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ\s*/,    // Simple
  /^بسم الله الرحمن الرحيم\s*/,                   // No diacritics
];
const BISMILLAH_DISPLAY = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ";

function stripBismillah(text) {
  // Normalize to NFC (canonical composition) to handle diacritics ordering variations
  const normText = text.normalize("NFC");
  
  for (const pat of BISMILLAH_PATTERNS) {
    const normPat = new RegExp(pat.source.normalize("NFC"), pat.flags);
    const stripped = normText.replace(normPat, "").trim();
    if (stripped.length < normText.length) return stripped;
  }
  
  // Robust Fallback: Search for common final words of Bismillah (الرحيم) and slice there
  const رحيم_words = ["الرَّحِيمِ", "ٱلرَّحِیمِ", "الرحيم", "ٱلرَّحِيمِ"];
  for (const r of رحيم_words) {
    const idx = normText.indexOf(r);
    if (idx !== -1 && idx < 55) {
      return normText.substring(idx + r.length).trim();
    }
  }
  
  // Last resort regex slice
  if (/^بِسۡ|^بِسْ|^بِ?سْمِ/.test(normText)) {
    return normText.replace(/^.{18,55}(رَّحِيمِ|الرَّحِيمِ|ٱلرَّحِیمِ|الرحيم)[ۚ۞]?\s*/, "").trim();
  }
  return normText;
}

// Format Uthmani text to use Alif-Madd (أٓ) instead of Hamza-Alif (ءَا) for better print mushaf rendering
function formatUthmaniText(text) {
  if (!text) return "";
  let t = text.normalize("NFC");
  // Replace 'ءَا' (\u0621\u064e\u0627) with 'أٓ' (\u0623\u0653 - Alif with Hamza and Maddah)
  t = t.replace(/\u0621\u064e\u0627/g, "\u0623\u0653");
  return t;
}

// ============================================================
// RENDER PAGE
// ============================================================

function renderPage() {
  const { ayahs } = state.currentPageData;
  if (!ayahs || !ayahs.length) return;

  const bookmarks = getBookmarks();

  // Group ayahs by surah (preserving order)
  const groups = [];
  let currentGroup = null;
  ayahs.forEach((ayah) => {
    if (!currentGroup || currentGroup.surahNum !== ayah.surah.number) {
      currentGroup = { surahNum: ayah.surah.number, surah: ayah.surah, ayahs: [] };
      groups.push(currentGroup);
    }
    currentGroup.ayahs.push(ayah);
  });

  // ---- Build HTML ----
  let html = "";
  let pageJuz = ayahs[0].juz;
  let surahNamesOnPage = [...new Set(groups.map((g) => g.surah.name))];

  groups.forEach((group) => {
    const { surahNum, surah, ayahs: gAyahs } = group;
    const firstAyahInSurah = gAyahs[0].numberInSurah === 1;

    // Show surah header if this group starts from first ayah
    if (firstAyahInSurah) {
      const showBismillah = surahNum !== 1 && surahNum !== 9;
      html += `
        <div class="page-surah-header">
          <div class="page-surah-name-band">${surah.name}</div>
          ${showBismillah ? `<div class="page-inner-bismillah">${BISMILLAH_DISPLAY}</div>` : ""}
        </div>
      `;
    }

    // Render ayahs inline
    gAyahs.forEach((ayah) => {
      let text = ayah.text;

      // Strip bismillah from first ayah (we already show it in surah header)
      if (ayah.numberInSurah === 1 && surahNum !== 1 && surahNum !== 9) {
        text = stripBismillah(text);
      }

      text = formatUthmaniText(text);

      const bm = bookmarks.find((b) => b.surah === surahNum && b.ayah === ayah.numberInSurah);
      const markerClass = bm ? `ayah-marker bm-${bm.color || "gold"}` : "ayah-marker";

      html += `<span class="ayah-word-wrap" id="ayah-${surahNum}-${ayah.numberInSurah}"
        ><span class="ayah-text-span"
          onclick="onAyahClick(event,${surahNum},${ayah.numberInSurah},\`${esc(text)}\`,\`${esc(surah.name)}\`)"
        >${text}</span><span class="${markerClass}"
          onclick="onMarkerClick(event,${surahNum},${ayah.numberInSurah})"
          title="آية ${ayah.numberInSurah}"
        >${toAr(ayah.numberInSurah)}</span> </span>`;
    });
  });

  dom.pageBody.innerHTML = html;
  applyFontSize();

  // Page info bar
  dom.pageJuzInfo.textContent  = `الجزء ${toAr(pageJuz)}`;
  dom.pageSurahNames.textContent = surahNamesOnPage.join(" • ");

  // Page counter + label
  const pageAr = toAr(state.currentPage);
  dom.pageCounter.textContent  = state.currentPage;
  dom.pageNumLabel.textContent = pageAr;

  // Nav buttons
  dom.prevPageBtn.disabled = state.currentPage <= 1;
  dom.nextPageBtn.disabled = state.currentPage >= TOTAL_PAGES;

  // Sidebar active: highlight surah closest to current page
  updateSidebarActive();

  // Page flip animation
  dom.mushafPage.classList.remove("flip-next", "flip-prev");
  void dom.mushafPage.offsetWidth; // force reflow
  dom.mushafPage.classList.add(state.flipDir === "next" ? "flip-next" : "flip-prev");
  setTimeout(() => dom.mushafPage.classList.remove("flip-next", "flip-prev"), 450);

  showView("page");

  // Scroll page body to top
  dom.pageBody.scrollTop = 0;
}

function updateSidebarActive() {
  // Find the last surah that starts on or before currentPage
  let activeSurahNum = 1;
  for (let i = 1; i <= 114; i++) {
    if (SURAH_PAGES[i] <= state.currentPage) activeSurahNum = i;
    else break;
  }
  document.querySelectorAll(".surah-list-item").forEach((li) => {
    li.classList.toggle("active", parseInt(li.dataset.num) === activeSurahNum);
  });
}

// ============================================================
// SHOW VIEW
// ============================================================
function showView(view) {
  dom.welcomeScreen.classList.add("hidden");
  dom.pageView.classList.add("hidden");
  dom.loadingState.classList.add("hidden");
  dom.errorState.classList.add("hidden");

  if (view === "welcome") dom.welcomeScreen.classList.remove("hidden");
  else if (view === "page")    dom.pageView.classList.remove("hidden");
  else if (view === "loading") dom.loadingState.classList.remove("hidden");
  else if (view === "error")   dom.errorState.classList.remove("hidden");
}

// ============================================================
// AYAH INTERACTIONS
// ============================================================
window.onAyahClick = function (event, surahNum, ayahNum, text, surahName) {
  event.stopPropagation();
  state.pendingAyahAction = { surahNum, ayahNum, text, surahName };

  const pop = dom.ayahActions;
  pop.classList.remove("hidden");

  positionPopover(pop, event.target);
};

window.onMarkerClick = function (event, surahNum, ayahNum) {
  event.stopPropagation();
  state.pendingBookmark = { surahNum, ayahNum };

  const pop = dom.colorPicker;
  pop.classList.remove("hidden");
  positionPopover(pop, event.target);
};

function positionPopover(pop, target) {
  pop.style.visibility = "hidden";
  pop.classList.remove("hidden");
  const rect = target.getBoundingClientRect();
  const pW   = pop.offsetWidth;
  const pH   = pop.offsetHeight;

  // Use pure viewport coordinates (no scroll offsets) because popover is position: fixed
  let top  = rect.top - pH - 10;
  let left = rect.left + (rect.width / 2) - (pW / 2);

  // If popover goes off the top edge (above navbar (~62px)), place it below the target
  if (top < 70) {
    top = rect.bottom + 10;
  }

  // If popover goes off the bottom of the screen, push it upwards
  if (top + pH > window.innerHeight - 10) {
    top = window.innerHeight - pH - 10;
  }

  // Keep popover within horizontal bounds
  left = Math.max(8, Math.min(left, window.innerWidth - pW - 8));

  pop.style.top  = top  + "px";
  pop.style.left = left + "px";
  pop.style.visibility = "";
}

// ============================================================
// BOOKMARKS
// ============================================================
function getBookmarks() { return JSON.parse(localStorage.getItem("quranBookmarks") || "[]"); }

function saveBookmark(surah, ayah, color) {
  let bms = getBookmarks().filter((b) => !(b.surah === surah && b.ayah === ayah));
  bms.push({ surah, ayah, color, page: state.currentPage, timestamp: new Date().toISOString() });
  localStorage.setItem("quranBookmarks", JSON.stringify(bms));
  renderPage();
  showToast("🔖 تم حفظ العلامة");
}

function removeBookmark(surah, ayah) {
  let bms = getBookmarks().filter((b) => !(b.surah === surah && b.ayah === ayah));
  localStorage.setItem("quranBookmarks", JSON.stringify(bms));
  renderPage();
  showToast("🗑️ تم حذف العلامة");
}

function openBookmarksModal() {
  const bms = getBookmarks().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  dom.bookmarksList.innerHTML = "";

  if (!bms.length) {
    dom.bookmarksList.innerHTML = `<li class="bm-empty">لا توجد علامات مرجعية.<br/>اضغط على رقم الآية لإضافة علامة.</li>`;
  } else {
    const colorHex = { gold: "#d4af37", green: "#27ae60", blue: "#2980b9", red: "#e74c3c" };
    bms.forEach((bm) => {
      const surahInfo  = state.surahList.find((s) => s.number === bm.surah);
      const surahName  = surahInfo ? surahInfo.name : `سورة ${bm.surah}`;
      const bmPage     = bm.page || (SURAH_PAGES[bm.surah] || 1);
      const hex        = colorHex[bm.color] || "#d4af37";

      const li = document.createElement("li");
      li.className = "bookmark-item";
      li.innerHTML = `
        <div class="bm-dot" style="background:${hex};box-shadow:0 0 6px ${hex}88;"></div>
        <div class="bm-info" onclick="goBmPage(${bmPage}, ${bm.surah}, ${bm.ayah})">
          <span class="bm-surah-name">${surahName} — آية ${bm.ayah}</span>
          <span class="bm-ayah-num">صفحة ${bmPage}</span>
        </div>
        <button class="bm-delete" onclick="delBm(${bm.surah}, ${bm.ayah})"><i class="fa-regular fa-trash-can"></i></button>
      `;
      dom.bookmarksList.appendChild(li);
    });
  }

  dom.bookmarksModal.classList.remove("hidden");
}

window.goBmPage = function (page, surah, ayah) {
  dom.bookmarksModal.classList.add("hidden");
  loadPage(page);
  // After load, try to highlight ayah
  setTimeout(() => {
    const el = document.getElementById(`ayah-${surah}-${ayah}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ayah-highlighted");
      setTimeout(() => el.classList.remove("ayah-highlighted"), 2800);
    }
  }, 900);
};

window.delBm = function (surah, ayah) {
  removeBookmark(surah, ayah);
  openBookmarksModal();
};

// ============================================================
// COPY & SHARE
// ============================================================
function copyAyah({ text, surahName, ayahNum }) {
  const full = `${text}\n\n— ${surahName}، الآية ${ayahNum}`;
  navigator.clipboard.writeText(full)
    .then(() => showToast("📋 تم النسخ"))
    .catch(() => showToast("⚠️ تعذر النسخ"));
}

function shareAyah({ text, surahName, ayahNum }) {
  const shareData = { title: "القرآن الكريم", text: `${text}\n\n— ${surahName}، الآية ${ayahNum}` };
  if (navigator.share) navigator.share(shareData).catch(() => {});
  else { copyAyah({ text, surahName, ayahNum }); showToast("📋 تم النسخ (المشاركة غير متاحة)"); }
}

// ============================================================
// AUDIO
// ============================================================
let _preloaderAudio = new Audio();

function getAbsoluteAyahNumber(surahNum, ayahNum) {
  if (state.currentPageData && state.currentPageData.ayahs) {
    const found = state.currentPageData.ayahs.find(
      (a) => a.surah.number === surahNum && a.numberInSurah === ayahNum
    );
    if (found) return found.number;
  }
  let absoluteNumber = 0;
  if (state.surahList) {
    for (let i = 0; i < surahNum - 1; i++) {
      const s = state.surahList[i];
      if (s) absoluteNumber += s.numberOfAyahs;
    }
  }
  return absoluteNumber + ayahNum;
}

function preloadNextAyah(surahNum, ayahNum, reciter) {
  let nextAbsoluteNum = null;
  if (state.currentPageData && state.currentPageData.ayahs) {
    const allAyahs = state.currentPageData.ayahs;
    const idx = allAyahs.findIndex((a) => a.surah.number === surahNum && a.numberInSurah === ayahNum);
    if (idx !== -1 && idx < allAyahs.length - 1) {
      nextAbsoluteNum = allAyahs[idx + 1].number;
    }
  }
  if (!nextAbsoluteNum) {
    const currentAbsolute = getAbsoluteAyahNumber(surahNum, ayahNum);
    if (currentAbsolute && currentAbsolute < 6236) {
      nextAbsoluteNum = currentAbsolute + 1;
    }
  }
  if (nextAbsoluteNum) {
    _preloaderAudio.src = `https://cdn.islamic.network/quran/audio/128/${reciter}/${nextAbsoluteNum}.mp3`;
    _preloaderAudio.preload = "auto";
  }
}

function playAudio(surahNum, ayahNum, surahName) {
  const reciter = dom.reciterSelect.value;
  const absoluteNum = getAbsoluteAyahNumber(surahNum, ayahNum);

  state.audioAyah   = { surahNum, ayahNum, surahName, absoluteNum };
  state.audioPlaying = true;

  dom.audioPlayer.classList.remove("hidden");
  dom.audioPlayPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  dom.audioAyahInfo.textContent = `${surahName || `سورة ${surahNum}`} — آية ${ayahNum}`;

  // Direct CDN URL for instant playback (no metadata API request)
  dom.audioElement.src = `https://cdn.islamic.network/quran/audio/128/${reciter}/${absoluteNum}.mp3`;
  dom.audioElement.load();
  dom.audioElement.play()
    .then(() => {
      preloadNextAyah(surahNum, ayahNum, reciter);
    })
    .catch(() => showToast("⚠️ تعذر تشغيل الصوت"));
}

function togglePlayPause() {
  if (!state.audioAyah) return;
  if (state.audioPlaying) {
    dom.audioElement.pause();
    state.audioPlaying = false;
    dom.audioPlayPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  } else {
    dom.audioElement.play();
    state.audioPlaying = true;
    dom.audioPlayPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  }
}

function audioNext() {
  if (!state.audioAyah || !state.currentPageData) return;
  const { surahNum, ayahNum, surahName } = state.audioAyah;
  const allAyahs = state.currentPageData.ayahs;
  const idx = allAyahs.findIndex((a) => a.surah.number === surahNum && a.numberInSurah === ayahNum);
  if (idx !== -1 && idx < allAyahs.length - 1) {
    const next = allAyahs[idx + 1];
    playAudio(next.surah.number, next.numberInSurah, next.surah.name);
  } else {
    loadPage(state.currentPage + 1, "next");
    setTimeout(() => {
      if (state.currentPageData) {
        const first = state.currentPageData.ayahs[0];
        if (first) playAudio(first.surah.number, first.numberInSurah, first.surah.name);
      }
    }, 1400);
  }
}

function audioPrev() {
  if (!state.audioAyah || !state.currentPageData) return;
  const { surahNum, ayahNum } = state.audioAyah;
  const allAyahs = state.currentPageData.ayahs;
  const idx = allAyahs.findIndex((a) => a.surah.number === surahNum && a.numberInSurah === ayahNum);
  if (idx > 0) {
    const prev = allAyahs[idx - 1];
    playAudio(prev.surah.number, prev.numberInSurah, prev.surah.name);
  }
}

function closeAudio() {
  dom.audioElement.pause();
  dom.audioElement.src = "";
  state.audioPlaying = false;
  state.audioAyah    = null;
  dom.audioPlayer.classList.add("hidden");
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

dom.audioElement.addEventListener("ended", audioNext);

dom.audioElement.addEventListener("timeupdate", () => {
  if (dom.audioElement.duration) {
    const cur = dom.audioElement.currentTime;
    const dur = dom.audioElement.duration;
    const percent = (cur / dur) * 100;
    dom.audioProgressBar.value = percent;
    dom.audioCurrentTime.textContent = formatTime(cur);
  }
});

dom.audioElement.addEventListener("loadedmetadata", () => {
  if (dom.audioElement.duration) {
    dom.audioDuration.textContent = formatTime(dom.audioElement.duration);
  }
});

// ============================================================
// TOAST
// ============================================================
let _toastTimer;
function showToast(msg) {
  dom.toast.textContent = msg;
  dom.toast.style.animation = "toastIn 0.25s ease";
  dom.toast.classList.remove("hidden");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    dom.toast.style.animation = "toastOut 0.25s ease forwards";
    setTimeout(() => { dom.toast.classList.add("hidden"); dom.toast.style.animation = ""; }, 260);
  }, 2500);
}

// ============================================================
// SWIPE SUPPORT (mobile)
// ============================================================
function bindSwipe() {
  let startX = 0, startY = 0;
  dom.mushafPage.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  dom.mushafPage.addEventListener("touchend", (e) => {
    const dx = startX - e.changedTouches[0].clientX;
    const dy = Math.abs(startY - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 55 && dy < 60) {
      if (dx > 0) loadPage(state.currentPage + 1, "next");  // swipe left = next
      else        loadPage(state.currentPage - 1, "prev");  // swipe right = prev
    }
  }, { passive: true });
}

// ============================================================
// HELPERS
// ============================================================
function toAr(n) { return n.toLocaleString("ar-EG"); }
function esc(s)  { return s.replace(/`/g, "\\`").replace(/\$/g, "\\$"); }
function hidePopovers() {
  dom.colorPicker.classList.add("hidden");
  dom.ayahActions.classList.add("hidden");
}
function isInputFocused() {
  const t = document.activeElement?.tagName;
  return t === "INPUT" || t === "SELECT" || t === "TEXTAREA";
}

// ============================================================
// BIND EVENTS
// ============================================================
function bindEvents() {
  // Sidebar
  dom.openSidebar.addEventListener("click", openSidebar);
  dom.openSidebarWelcome.addEventListener("click", openSidebar);
  dom.closeSidebar.addEventListener("click", closeSidebar);
  dom.sidebarOverlay.addEventListener("click", closeSidebar);
  dom.surahSearch.addEventListener("input", (e) => filterSurahList(e.target.value));

  // Navbar
  dom.darkModeBtn.addEventListener("click", toggleDarkMode);
  dom.fontIncBtn.addEventListener("click", () => changeFontSize(0.12));
  dom.fontDecBtn.addEventListener("click", () => changeFontSize(-0.12));
  dom.bookmarksNavBtn.addEventListener("click", openBookmarksModal);
  dom.audioToggleBtn.addEventListener("click", () => {
    if (state.audioAyah) togglePlayPause();
    else if (state.currentPageData?.ayahs?.length) {
      const a = state.currentPageData.ayahs[0];
      playAudio(a.surah.number, a.numberInSurah, a.surah.name);
    } else showToast("اختر صفحة أولاً");
  });

  // Page navigation buttons
  dom.prevPageBtn.addEventListener("click", () => loadPage(state.currentPage - 1, "prev"));
  dom.nextPageBtn.addEventListener("click", () => loadPage(state.currentPage + 1, "next"));

  // Flip zones (click sides of the page)
  dom.zoneLeft.addEventListener("click",  () => loadPage(state.currentPage - 1, "prev"));
  dom.zoneRight.addEventListener("click", () => loadPage(state.currentPage + 1, "next"));

  // Jump to page (Enter key)
  dom.pageJump.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const p = parseInt(dom.pageJump.value);
      if (p >= 1 && p <= 604) { loadPage(p); dom.pageJump.value = ""; dom.pageJump.blur(); }
      else showToast("⚠️ أدخل رقم بين 1 و 604");
    }
  });

  // Color picker
  document.querySelectorAll(".color-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!state.pendingBookmark) return;
      const { surahNum, ayahNum } = state.pendingBookmark;
      if (opt.id === "removeBookmarkBtn") removeBookmark(surahNum, ayahNum);
      else saveBookmark(surahNum, ayahNum, opt.dataset.color);
      hidePopovers();
      state.pendingBookmark = null;
    });
  });

  // Ayah action buttons
  dom.copyAyahBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.pendingAyahAction) copyAyah(state.pendingAyahAction);
    hidePopovers();
  });
  dom.shareAyahBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.pendingAyahAction) shareAyah(state.pendingAyahAction);
    hidePopovers();
  });
  dom.listenAyahBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.pendingAyahAction) {
      const { surahNum, ayahNum, surahName } = state.pendingAyahAction;
      playAudio(surahNum, ayahNum, surahName);
    }
    hidePopovers();
  });

  // Bookmarks modal close
  dom.closeModal.addEventListener("click", () => dom.bookmarksModal.classList.add("hidden"));
  dom.bookmarksModal.querySelector(".modal-backdrop").addEventListener("click",
    () => dom.bookmarksModal.classList.add("hidden")
  );

  // Audio controls
  dom.audioPlayPauseBtn.addEventListener("click", togglePlayPause);
  dom.audioNextBtn.addEventListener("click", audioNext);
  dom.audioPrevBtn.addEventListener("click", audioPrev);
  dom.audioCloseBtn.addEventListener("click", closeAudio);
  
  dom.audioRewindBtn.addEventListener("click", () => {
    dom.audioElement.currentTime = Math.max(0, dom.audioElement.currentTime - 5);
  });
  dom.audioForwardBtn.addEventListener("click", () => {
    if (dom.audioElement.duration) {
      dom.audioElement.currentTime = Math.min(dom.audioElement.duration, dom.audioElement.currentTime + 5);
    }
  });

  dom.audioProgressBar.addEventListener("input", (e) => {
    if (dom.audioElement.duration) {
      const pct = e.target.value;
      dom.audioElement.currentTime = (pct / 100) * dom.audioElement.duration;
    }
  });

  dom.reciterSelect.addEventListener("change", () => {
    if (state.audioAyah) {
      const { surahNum, ayahNum, surahName } = state.audioAyah;
      playAudio(surahNum, ayahNum, surahName);
    }
  });

  // Custom PWA installation button
  dom.pwaInstallBtn.addEventListener("click", () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("[PWA] User accepted the install prompt");
      } else {
        console.log("[PWA] User dismissed the install prompt");
      }
      deferredPrompt = null;
      if (dom.pwaInstallContainer) {
        dom.pwaInstallContainer.classList.add("hidden");
      }
    });
  });

  // Close popovers on outside click
  document.addEventListener("click", (e) => {
    if (!dom.colorPicker.contains(e.target) && !e.target.classList.contains("ayah-marker"))
      dom.colorPicker.classList.add("hidden");
    if (!dom.ayahActions.contains(e.target) && !e.target.classList.contains("ayah-text-span"))
      dom.ayahActions.classList.add("hidden");
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSidebar();
      dom.bookmarksModal.classList.add("hidden");
      hidePopovers();
    }
    if (isInputFocused()) return;
    if (e.key === "ArrowLeft"  && state.currentPage) loadPage(state.currentPage + 1, "next");
    if (e.key === "ArrowRight" && state.currentPage) loadPage(state.currentPage - 1, "prev");
    if (e.key === " ")          { e.preventDefault(); if (state.audioAyah) togglePlayPause(); }
  });
}

// ============================================================
// START
// ============================================================
init();
