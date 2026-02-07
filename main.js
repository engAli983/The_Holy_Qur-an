const surahSelect = document.getElementById("surahSelect");
const ayahsDiv = document.getElementById("ayahs");
const bismillahHeader = document.getElementById("bismillahHeader");

// UI Elements
const colorPicker = document.getElementById("colorPicker");
const bookmarksModal = document.getElementById("bookmarksModal");
const bookmarksList = document.getElementById("bookmarksList");
const closeModalBtn = document.getElementById("closeModal");
const bookmarkBtn = document.getElementById("bookmarkBtn");

// State
let activeSurahData = null; // Store fetched data
let pendingBookmark = null; // { surah, ayah, element }

// Fetch Surah list
fetch("https://api.alquran.cloud/v1/surah")
  .then((res) => res.json())
  .then((data) => {
    data.data.forEach((surah) => {
      const option = document.createElement("option");
      option.value = surah.number;
      option.textContent = `${surah.number}. ${surah.name} (${surah.englishName})`;
      surahSelect.appendChild(option);
    });
  })
  .catch((err) => console.error("Error fetching surahs:", err));

surahSelect.addEventListener("change", () => {
  loadSurah(surahSelect.value);
});

function loadSurah(surahNumber) {
  if (!surahNumber) return;

  ayahsDiv.innerHTML = "<p>جاري التحميل...</p>";
  bismillahHeader.style.display = "none";

  fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`)
    .then((res) => res.json())
    .then((data) => {
      activeSurahData = data.data;
      renderAyahs();
    })
    .catch((err) => {
      console.error("Error:", err);
      ayahsDiv.innerHTML =
        "<p>حدث خطأ في تحميل السورة. يرجى المحاولة مرة أخرى.</p>";
    });
}

function renderAyahs() {
  if (!activeSurahData) return;

  const surahNumber = activeSurahData.number;
  ayahsDiv.innerHTML = "";

  // Bismillah Logic
  if (surahNumber != 1 && surahNumber != 9) {
    bismillahHeader.style.display = "block";
  } else if (surahNumber == 1) {
    bismillahHeader.style.display = "none";
  } else {
    bismillahHeader.style.display = "none";
  }

  const bookmarks = getBookmarks(); // Array of {surah, ayah, color}

  let fullTextHTML = "";

  activeSurahData.ayahs.forEach((ayah) => {
    let text = ayah.text;

    // Strip Bismillah if needed
    if (ayah.numberInSurah === 1 && surahNumber != 1 && surahNumber != 9) {
      const bismillah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
      if (text.startsWith(bismillah)) {
        text = text.replace(bismillah, "").trim();
      }
    }

    // Check if this verse is bookmarked
    const bookmark = bookmarks.find(
      (b) => b.surah == surahNumber && b.ayah == ayah.numberInSurah
    );
    const markerClass = bookmark
      ? `ayah-marker bookmarked-${bookmark.color || "gold"}`
      : "ayah-marker";

    // IMPORTANT: We need passing the event to get position
    fullTextHTML += `
          <span class="ayah-span" id="ayah-${ayah.numberInSurah}">
            ${text} 
            <span class="${markerClass}" onclick="openColorPicker(event, ${surahNumber}, ${
      ayah.numberInSurah
    })">
                ${ayah.numberInSurah.toLocaleString("ar-EG")}
            </span>
          </span>
        `;
  });

  ayahsDiv.innerHTML = fullTextHTML;

  // Auto-scroll logic (if requested by modal)
  if (window.pendingScrollAyah) {
    setTimeout(() => {
      const el = document.getElementById(`ayah-${window.pendingScrollAyah}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.backgroundColor = "rgba(212, 175, 55, 0.1)";
        setTimeout(() => (el.style.backgroundColor = "transparent"), 2000);
      }
      window.pendingScrollAyah = null;
    }, 500);
  }
}

/* --- Storage Logic --- */
function getBookmarks() {
  return JSON.parse(localStorage.getItem("quranBookmarks") || "[]");
}

function saveBookmark(surah, ayah, color) {
  let bookmarks = getBookmarks();
  // Remove existing if any (to update color or duplicates)
  bookmarks = bookmarks.filter((b) => !(b.surah == surah && b.ayah == ayah));

  bookmarks.push({ surah, ayah, color, timestamp: new Date().toISOString() });
  localStorage.setItem("quranBookmarks", JSON.stringify(bookmarks));
  renderAyahs(); // Re-render to show change
}

function removeBookmark(surah, ayah) {
  let bookmarks = getBookmarks();
  bookmarks = bookmarks.filter((b) => !(b.surah == surah && b.ayah == ayah));
  localStorage.setItem("quranBookmarks", JSON.stringify(bookmarks));
  renderAyahs();
}

/* --- UI Logic --- */

// 1. Color Picker
window.openColorPicker = function (event, surah, ayah) {
  event.stopPropagation(); // prevent document click closing it immediately

  // Set pending action
  pendingBookmark = { surah, ayah };

  // Position picker
  // We append the picker to the body so it floats freely, but position it absolute
  const rect = event.target.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;

  colorPicker.style.top = rect.bottom + scrollTop + 5 + "px";
  colorPicker.style.left = rect.left + "px"; // Simple positioning

  colorPicker.classList.remove("hidden");
};

// Global click to close picker
document.addEventListener("click", (e) => {
  if (
    !colorPicker.contains(e.target) &&
    !e.target.classList.contains("ayah-marker")
  ) {
    colorPicker.classList.add("hidden");
  }
});

// Color Selection
document.querySelectorAll(".color-option").forEach((opt) => {
  opt.addEventListener("click", () => {
    if (!pendingBookmark) return;

    if (opt.id === "removeBookmarkBtn") {
      removeBookmark(pendingBookmark.surah, pendingBookmark.ayah);
    } else {
      const color = opt.getAttribute("data-color");
      saveBookmark(pendingBookmark.surah, pendingBookmark.ayah, color);
    }

    colorPicker.classList.add("hidden");
    pendingBookmark = null;
  });
});

// 2. Bookmarks Modal
bookmarkBtn.addEventListener("click", () => {
  renderBookmarksModal();
  bookmarksModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
  bookmarksModal.classList.add("hidden");
});

window.onclick = function (event) {
  if (event.target == bookmarksModal) {
    bookmarksModal.classList.add("hidden");
  }
};

function renderBookmarksModal() {
  const bookmarks = getBookmarks();
  bookmarksList.innerHTML = "";

  if (bookmarks.length === 0) {
    bookmarksList.innerHTML =
      "<li style='padding:20px; text-align:center;'>لا توجد علامات محفوظة</li>";
    return;
  }

  // Sort by most recent? Or by Surah location?
  // Let's sort by Timestamp (Newest first)
  bookmarks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  bookmarks.forEach((bm) => {
    // Need to find Surah name. Efficient way: surahSelect options
    let surahName = `سورة ${bm.surah}`;
    const option = surahSelect.querySelector(`option[value="${bm.surah}"]`);
    if (option) surahName = option.text.split("(")[0];

    const li = document.createElement("li");
    li.className = "bookmark-item";
    li.innerHTML = `
            <div class="bookmark-info" onclick="goToBookmark(${bm.surah}, ${
      bm.ayah
    })">
                <span style="background-color: ${getColorHex(bm.color)}"></span>
                ${surahName} - آية ${bm.ayah}
            </div>
            <button class="delete-bookmark" onclick="removeItem(${bm.surah}, ${
      bm.ayah
    })">🗑️</button>
        `;
    bookmarksList.appendChild(li);
  });
}

function getColorHex(colorName) {
  const map = {
    gold: "#d4af37",
    red: "#e74c3c",
    green: "#2ecc71",
    blue: "#3498db",
  };
  return map[colorName] || "#d4af37";
}

window.goToBookmark = function (surah, ayah) {
  bookmarksModal.classList.add("hidden");

  if (surahSelect.value != surah) {
    window.pendingScrollAyah = ayah;
    surahSelect.value = surah;
    loadSurah(surah); // Trigger manual load
  } else {
    const el = document.getElementById(`ayah-${ayah}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.backgroundColor = "rgba(212, 175, 55, 0.1)";
      setTimeout(() => (el.style.backgroundColor = "transparent"), 2000);
    }
  }
};

window.removeItem = function (surah, ayah) {
  // Prevent bubble up (handled by not nesting button in div)
  removeBookmark(surah, ayah);
  renderBookmarksModal(); // Re-render local list
};
