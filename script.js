/**
 * Ramazan Rehberi - Akıllı Randevu Sistemi
 * Namaz Vakitleri, Aylık İmsakiye ve Geri Sayım
 */

/* ─── SABİTLER ──────────────────────────────────────────── */

const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const TR_CITIES = [
  { name: "Adana" }, { name: "Adıyaman" }, { name: "Afyon" },
  { name: "Ağrı" }, { name: "Aksaray" }, { name: "Amasya" },
  { name: "Ankara" }, { name: "Antalya" }, { name: "Artvin" },
  { name: "Aydın" }, { name: "Balıkesir" }, { name: "Bilecik" },
  { name: "Bingöl" }, { name: "Bitlis" }, { name: "Bolu" },
  { name: "Burdur" }, { name: "Bursa" }, { name: "Çanakkale" },
  { name: "Çankırı" }, { name: "Çorum" }, { name: "Denizli" },
  { name: "Diyarbakır" }, { name: "Düzce" }, { name: "Edirne" },
  { name: "Elazığ" }, { name: "Erzincan" }, { name: "Erzurum" },
  { name: "Eskişehir" }, { name: "Gaziantep" }, { name: "Giresun" },
  { name: "Gümüşhane" }, { name: "Hakkari" }, { name: "Hatay" },
  { name: "Iğdır" }, { name: "Isparta" }, { name: "Istanbul" },
  { name: "İzmir" }, { name: "Kahramanmaraş" }, { name: "Karabük" },
  { name: "Karaman" }, { name: "Kars" }, { name: "Kastamonu" },
  { name: "Kayseri" }, { name: "Kırıkkale" }, { name: "Kırklareli" },
  { name: "Kırşehir" }, { name: "Kilis" }, { name: "Kocaeli" },
  { name: "Konya" }, { name: "Kütahya" }, { name: "Malatya" },
  { name: "Manisa" }, { name: "Mardin" }, { name: "Mersin" },
  { name: "Muğla" }, { name: "Muş" }, { name: "Nevşehir" },
  { name: "Niğde" }, { name: "Ordu" }, { name: "Osmaniye" },
  { name: "Rize" }, { name: "Sakarya" }, { name: "Samsun" },
  { name: "Siirt" }, { name: "Sinop" }, { name: "Sivas" },
  { name: "Şanlıurfa" }, { name: "Şırnak" }, { name: "Tekirdağ" },
  { name: "Tokat" }, { name: "Trabzon" }, { name: "Tunceli" },
  { name: "Uşak" }, { name: "Van" }, { name: "Yalova" },
  { name: "Yozgat" }, { name: "Zonguldak" },
];

const prayerTimeIds = {
  Fajr: "fajrTime",
  Sunrise: "sunriseTime",
  Dhuhr: "dhuhrTime",
  Asr: "asrTime",
  Maghrib: "maghribTime",
  Isha: "ishaTime"
};

/* ─── DURUM ─────────────────────────────────────────────── */

let prayerData = null;
let activeCity = localStorage.getItem("savedCity") || "Istanbul";
let countdownId = null;   // setInterval handle — temizlemek için


// Gösterilen ay: { year, month (1-indexed) }
const now = new Date();
let viewYear = now.getFullYear();
let viewMonth = now.getMonth() + 1;

/* ─── BAŞLAT ────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  updateMonthLabel();
  buildCityGrid();
  init();
});

/* ─── KOD/LOKASYOn ──────────────────────────────────────── */

function init() {
  const savedCity = localStorage.getItem("savedCity");
  if (savedCity) {
    activeCity = savedCity;
    setLocation(`<i class="fas fa-map-marker-alt me-1"></i>${savedCity}`);
    loadData(savedCity, "TR");
    return;
  }

  // Önce tarayıcı konumu dene
  if (navigator.geolocation) {
    setLocation('<i class="fas fa-spinner fa-spin me-1"></i>Konum alınıyor...');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        handleGeoSuccess(lat, lon);
      },
      () => loadByIP(), // Tarayıcı izni başarısız → IP üzerinden dene
      { timeout: 7000 }
    );
  } else {
    loadByIP();
  }
}

function handleGeoSuccess(lat, lon) {
  setLocation('<i class="fas fa-spinner fa-spin me-1"></i>Şehir tespit ediliyor...');
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr`)
    .then(r => r.json())
    .then(geo => {
      const addr = geo.address || {};
      const detectedName = addr.province || addr.state || addr.city || addr.town || addr.village || "Istanbul";
      processDetectedCity(detectedName, "Cihaz konumu");
    })
    .catch(() => loadDataByCoords(lat, lon));
}

function loadByIP() {
  setLocation('<i class="fas fa-spinner fa-spin me-1"></i>İnternet üzerinden konum alınıyor...');
  fetch('https://ipapi.co/json/')
    .then(r => r.json())
    .then(data => {
      const city = data.city || "Istanbul";
      processDetectedCity(city, "İnternet konumu");
    })
    .catch(() => {
      processDetectedCity("Istanbul", "Varsayılan");
    });
}

function processDetectedCity(rawName, sourceInfo) {
  const searchName = rawName.toLowerCase()
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(" ili", "").replace(" belediyesi", "").trim();

  const match = TR_CITIES.find(c => {
    const cityName = c.name.toLowerCase()
      .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
      .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c");
    return cityName === searchName || searchName.includes(cityName) || cityName.includes(searchName);
  });

  const cityToUse = match ? match.name : "Istanbul";
  activeCity = cityToUse;
  localStorage.setItem("savedCity", cityToUse);
  setLocation(`<i class="fas fa-map-marker-alt me-1"></i>${cityToUse}`);
  buildCityGrid();
  loadData(cityToUse, "TR");

  const icon = sourceInfo === "Cihaz konumu" ? "📍" : "🌍";
  showToast(`${icon} ${cityToUse} tespit edildi (${sourceInfo}).`, "success");
}



/* ─── VERİ YÜKLE ────────────────────────────────────────── */

function loadDataByCoords(lat, lon) {
  // Günlük vakit
  fetchJSON(
    `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=13`,
    d => {
      prayerData = d.data.timings;
      updateDailyUI(prayerData);
      restartCountdown();
      setLocation(`<i class="fas fa-map-marker-alt me-1"></i>${d.data.meta.timezone}`);
    },
    () => showError("Günlük vakit alınamadı.")
  );

  // Aylık takvim
  loadCalendarByCoords(lat, lon);
}

function loadData(city, country = "TR") {
  prayerData = null;
  // Diyanet metodu (13) ile dene
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=13`;

  fetchJSON(
    url,
    d => {
      prayerData = d.data.timings;
      updateDailyUI(prayerData);
      restartCountdown();
      setLocation(`<i class="fas fa-map-marker-alt me-1"></i>${city}`);
      updateHijri(d.data.date);
    },
    err => {
      console.warn("Diyanet API hatası, genel metoda (3) geçiliyor...", err);
      // Fallback: Metod 3 (Muslim World League) ile tekrar dene
      fetchJSON(
        `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=3`,
        d => {
          prayerData = d.data.timings;
          updateDailyUI(prayerData);
          restartCountdown();
          setLocation(`<i class="fas fa-map-marker-alt me-1"></i>${city} (Genel Vakit)`);
          updateHijri(d.data.date);
          showToast("Diyanet vakitlerine ulaşılamadı, genel vakitler yüklendi.", "warning");
        },
        () => showError(`Vakit bilgileri alınamadı. Lütfen internetinizi kontrol edip sayfayı yenileyin. (${city})`)
      );
    }
  );

  // Aylık takvimi de ülke koduyla yükle
  loadCalendarByCity(city, country);
}

function loadCalendarByCoords(lat, lon) {
  showTableLoading();
  fetchJSON(
    `https://api.aladhan.com/v1/calendar/${viewYear}/${viewMonth}?latitude=${lat}&longitude=${lon}&method=13`,
    d => {
      if (d.code === 200 && d.data) populateTable(d.data);
      else showTableError("Takvim verisi alınamadı.");
    },
    () => showTableError("Takvim isteği başarısız.")
  );
}

function loadCalendarByCity(city, country) {
  showTableLoading();
  fetchJSON(
    `https://api.aladhan.com/v1/calendarByCity/${viewYear}/${viewMonth}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=13`,
    d => {
      if (d.code === 200 && d.data) populateTable(d.data);
      else showTableError("Takvim verisi alınamadı.");
    },
    () => showTableError("Takvim isteği başarısız.")
  );
}

/* ─── YARDIMCI FETCH ─────────────────────────────────────── */

function fetchJSON(url, onSuccess, onError) {
  fetch(url)
    .then(r => {
      if (!r.ok) {
        console.error(`API Hatası: ${r.status} - ${url}`);
        throw new Error(`HTTP ${r.status}`);
      }
      return r.json();
    })
    .then(data => {
      if (data && (data.code === 200 || data.status === "OK")) {
        onSuccess(data);
      } else {
        throw new Error(data.data || "Veri formatı hatalı");
      }
    })
    .catch(err => {
      console.error("Fetch Hatası:", err);
      onError(err);
    });
}

/* ─── UI GÜNCELLEYICILER ────────────────────────────────── */

function updateDailyUI(times) {
  for (const [key, id] of Object.entries(prayerTimeIds)) {
    const el = document.getElementById(id);
    if (el) el.innerText = cleanTime(times[key]);
  }
}

function populateTable(days) {
  const tbody = document.getElementById("imsakiyeBody");
  const todayNow = new Date();
  const todayNum = todayNow.getDate();
  const todayMonth = todayNow.getMonth() + 1; // 1-indexed
  const todayYear = todayNow.getFullYear();

  let html = "";
  days.forEach(day => {
    const dayNum = parseInt(day.date.gregorian.day);
    const monthNum = parseInt(day.date.gregorian.month.number);
    const yearNum = parseInt(day.date.gregorian.year);

    const isToday = dayNum === todayNum && monthNum === todayMonth && yearNum === todayYear;
    const rowCls = isToday ? "today-row fw-bold" : "";
    const badge = isToday
      ? ' <span class="badge bg-warning text-dark ms-1" style="font-size:.65rem">Bugün</span>'
      : "";

    const trMonth = TR_MONTHS[monthNum - 1] || "";
    html += `
      <tr class="${rowCls}">
        <td>${dayNum} ${trMonth}${badge}</td>
        <td>${cleanTime(day.timings.Fajr)}</td>
        <td>${cleanTime(day.timings.Sunrise)}</td>
        <td>${cleanTime(day.timings.Dhuhr)}</td>
        <td>${cleanTime(day.timings.Asr)}</td>
        <td><span class="text-gold fw-bold">${cleanTime(day.timings.Maghrib)}</span></td>
        <td>${cleanTime(day.timings.Isha)}</td>
      </tr>`;
  });

  tbody.innerHTML = html || `<tr><td colspan="7" class="text-center text-muted py-3">Veri bulunamadı.</td></tr>`;

  // Bugünün satırına scroll et (eğer aynı ay gösteriliyorsa)
  if (viewMonth === todayMonth && viewYear === todayYear) {
    setTimeout(() => {
      const todayRow = tbody.querySelector(".today-row");
      if (todayRow) todayRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }
}

/* ─── AY NAVİGASYONU ────────────────────────────────────── */

function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth > 12) { viewMonth = 1; viewYear++; }
  if (viewMonth < 1) { viewMonth = 12; viewYear--; }
  updateMonthLabel();

  // Takvimi yeniden yükle (günlük vakit değişmez)
  if (navigator.geolocation) {
    // koordinatı tekrar almak yerine şehir bazlı kullan
    loadCalendarByCity(activeCity, "Turkey");
  } else {
    loadCalendarByCity(activeCity, "Turkey");
  }
}

function updateMonthLabel() {
  const el = document.getElementById("monthLabel");
  if (el) el.innerText = `${TR_MONTHS[viewMonth - 1]} ${viewYear}`;
}

/* ─── HİCRİ TARİH + RAMAZAN GÜNÜ ───────────────────────── */

const HIJRI_MONTHS_TR = [
  "Muharrem", "Safer", "Rebiülevvel", "Rebiülahir",
  "Cemâziyelevvel", "Cemâziyelahir", "Recep", "Şaban",
  "Ramazan", "Şevval", "Zilkade", "Zilhicce"
];

function updateHijri(dateObj) {
  if (!dateObj || !dateObj.hijri) return;
  const h = dateObj.hijri;
  const day = h.day;
  const mon = parseInt(h.month.number);
  const yr = h.year;
  const monName = HIJRI_MONTHS_TR[mon - 1] || "";

  const hijriEl = document.getElementById("hijriDate");
  if (hijriEl) hijriEl.innerText = `${day} ${monName} ${yr}`;

  const rdEl = document.getElementById("ramadanDay");
  if (rdEl) {
    if (mon === 9) {
      rdEl.innerText = day;
      buildRamadanCalendar(day);
    } else {
      rdEl.innerText = "?";
      const chip = document.getElementById("ramadanDayChip");
      if (chip) chip.style.opacity = "0.4";
      buildRamadanCalendar(1);
    }
  }

  // İstatistikleri de güncelle
  updateRamadanStats(mon === 9 ? day : 1);
}

/* ─── İFTAR ALARMI ──────────────────────────────────────── */

let alarmOn = false;
let alarmFired = false;

function toggleAlarm() {
  alarmOn = !alarmOn;
  alarmFired = false;
  const btn = document.getElementById("alarmBtn");

  if (alarmOn) {
    btn.classList.add("alarm-on");
    btn.innerHTML = '<i class="fas fa-bell-slash me-2"></i>Alarm Açık';

    // İzin durumuna göre SweetAlert ile bildir
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") {
          Swal.fire({
            toast: true, position: "bottom-end", icon: "success",
            title: "🔔 Bildirimler açık! İftar vakti haber vereceğiz.",
            showConfirmButton: false, timer: 3500, timerProgressBar: true,
            background: "#0d1b2a", color: "#e0c08d", iconColor: "#c5a059"
          });
        } else {
          Swal.fire({
            toast: true, position: "bottom-end", icon: "warning",
            title: "Bildirim izni verilmedi — alarm sayfa içinde çalışır.",
            showConfirmButton: false, timer: 4000, timerProgressBar: true,
            background: "#0d1b2a", color: "#e0c08d", iconColor: "#f59e0b"
          });
        }
      });
    } else if ("Notification" in window && Notification.permission === "granted") {
      Swal.fire({
        toast: true, position: "bottom-end", icon: "success",
        title: "⏰ İftar Alarmı aktif!",
        showConfirmButton: false, timer: 2500, timerProgressBar: true,
        background: "#0d1b2a", color: "#e0c08d", iconColor: "#c5a059"
      });
    } else {
      Swal.fire({
        toast: true, position: "bottom-end", icon: "info",
        title: "⏰ İftar Alarmı aktif (sayfa içi).",
        showConfirmButton: false, timer: 2500, timerProgressBar: true,
        background: "#0d1b2a", color: "#e0c08d", iconColor: "#3b82f6"
      });
    }
  } else {
    btn.classList.remove("alarm-on");
    btn.innerHTML = '<i class="fas fa-bell me-2"></i>İftar Alarmı';
    Swal.fire({
      toast: true, position: "bottom-end", icon: "info",
      title: "🔕 İftar Alarmı kapatıldı.",
      showConfirmButton: false, timer: 2000, timerProgressBar: true,
      background: "#0d1b2a", color: "#e0c08d", iconColor: "#6b7280"
    });
  }
}

function checkAlarm(now, iftarTime) {
  if (!alarmOn || alarmFired) return;
  const diff = iftarTime - now;
  if (diff <= 60000 && diff > 55000) {
    alarmFired = true;
    sendNotification("⏰ 1 dakika kaldı!", `${activeCity} iftarına 1 dakika kaldı.`);
  }
  if (diff <= 0 && diff > -3000) {
    sendNotification("🌙 İFTAR VAKTİ!", `${activeCity} - Hayırlı iftarlar!`);
  }
}

function sendNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

/* ─── COUNTDOWN (GELİŞMİŞ) ──────────────────────────────── */

function restartCountdown() {
  if (countdownId) clearInterval(countdownId);
  if (!prayerData) return;

  const cdEl = document.getElementById("countdown");
  const pgEl = document.getElementById("iftarProgress");
  const titleEl = document.getElementById("countdownTitle");

  function tick() {
    const n = new Date();
    const iftar = parseTime(prayerData.Maghrib);
    const imsak = parseTime(prayerData.Fajr);

    checkAlarm(n, iftar);

    // Gece yarısı — imsak öncesi → Sahur geri sayımı
    if (n < imsak) {
      if (titleEl) titleEl.innerText = "Sahura Kalan Süre";
      const diff = imsak - n;
      cdEl.innerText = `${pad(Math.floor(diff / 3600000))}:${pad(Math.floor((diff % 3600000) / 60000))}:${pad(Math.floor((diff % 60000) / 1000))}`;
      pgEl.style.width = "0%";
      return;
    }

    // İftar geçti
    if (n >= iftar) {
      if (titleEl) titleEl.innerText = "İftar Vakti";
      cdEl.innerHTML = "<span class='text-gold animate-pulse'>🌙 ALLAHU EKBER!</span>";
      pgEl.style.width = "100%";
      clearInterval(countdownId);
      return;
    }

    // Normal: imsak → iftar arası
    if (titleEl) titleEl.innerText = "İftara Kalan Süre";
    const diff = iftar - n;
    cdEl.innerText = `${pad(Math.floor(diff / 3600000))}:${pad(Math.floor((diff % 3600000) / 60000))}:${pad(Math.floor((diff % 60000) / 1000))}`;

    const total = iftar - imsak;
    const elapsed = n - imsak;
    pgEl.style.width = `${Math.min(100, Math.max(0, (elapsed / total) * 100))}%`;
  }

  countdownId = setInterval(tick, 1000);
  tick();

  // Yeni Özellik: Namaz Vakti Vurgulama
  setTimeout(highlightNextPrayer, 400);
}

/* ─── TESBİH SAYACI ─────────────────────────────────────── */

const TESBIH_PHRASES = [
  { label: "Sübhanallah", max: 33 },
  { label: "Elhamdülillah", max: 33 },
  { label: "Allahu Ekber", max: 34 },
  { label: "Lâ ilâhe illallah", max: 100 },
];

let tesbihIndex = parseInt(localStorage.getItem("tesbihIndex") || "0");
let tesbihValue = parseInt(localStorage.getItem("tesbihValue") || "0");

function renderTesbih() {
  const phrase = TESBIH_PHRASES[tesbihIndex];
  const countEl = document.getElementById("tesbihCount");
  const labelEl = document.getElementById("tesbihLabel");
  if (countEl) countEl.innerText = tesbihValue;
  if (labelEl) labelEl.innerText = `${phrase.label}  (hedef: ${phrase.max})`;
}

function incrementTesbih() {
  const phrase = TESBIH_PHRASES[tesbihIndex];
  tesbihValue++;
  if (tesbihValue > phrase.max) {
    tesbihValue = 0;
    tesbihIndex = (tesbihIndex + 1) % TESBIH_PHRASES.length;
  }
  localStorage.setItem("tesbihValue", tesbihValue);
  localStorage.setItem("tesbihIndex", tesbihIndex);
  renderTesbih();
}

function resetTesbih() {
  tesbihValue = 0;
  localStorage.setItem("tesbihValue", 0);
  renderTesbih();
}

function changeTesbih(dir) {
  tesbihValue = 0;
  tesbihIndex = (tesbihIndex + dir + TESBIH_PHRASES.length) % TESBIH_PHRASES.length;
  localStorage.setItem("tesbihValue", 0);
  localStorage.setItem("tesbihIndex", tesbihIndex);
  renderTesbih();
}

// Tesbih modalı açılınca yenile
document.addEventListener("DOMContentLoaded", () => {
  const tesbihModal = document.getElementById("tesbihModal");
  if (tesbihModal) {
    tesbihModal.addEventListener("show.bs.modal", renderTesbih);
  }
});

/* ─── ŞEHİR SEÇİCİ ─────────────────────────────────────── */

function buildCityGrid(filter = "") {
  const grid = document.getElementById("cityGrid");
  if (!grid) return;

  const list = filter
    ? TR_CITIES.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
    : TR_CITIES;

  grid.innerHTML = list.map(c => `
    <div class="col-6 col-sm-4 col-md-3">
      <button class="city-btn ${c.name === activeCity ? "active-city" : ""}"
        onclick="selectCity('${c.name}')">
        ${c.name}
      </button>
    </div>`).join("");
}

function filterCities(val) { buildCityGrid(val); }

function selectCity(city) {
  activeCity = city;
  localStorage.setItem("savedCity", city); // 💾 Kaydet

  // Modalı kapat
  const modalEl = document.getElementById("cityModal");
  const bsModal = bootstrap.Modal.getInstance(modalEl);
  if (bsModal) bsModal.hide();

  // Temizle
  const searchEl = document.getElementById("citySearch");
  if (searchEl) searchEl.value = "";
  buildCityGrid(); // aktif şehiri güncelle

  // Vakitleri yükle
  setLocation(`<i class="fas fa-spinner fa-spin me-1"></i>${city} vakitleri yükleniyor...`);
  loadData(city, "TR");

  // Hava durumunu güncelle
  loadWeather(city);
}

/* ─── YARDIMCI FONKSİYONLAR ────────────────────────────── */

function cleanTime(t) {
  if (!t) return "--:--";
  return t.split(" ")[0].trim();
}

function parseTime(raw) {
  const [h, m] = cleanTime(raw).split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function pad(n) { return String(n).padStart(2, "0"); }

function setLocation(html) {
  const el = document.getElementById("locationText");
  if (el) el.innerHTML = html;
}

function showError(msg) {
  const cd = document.getElementById("countdown");
  if (cd) cd.innerText = "Hata oluştu.";

  Swal.fire({
    icon: "error",
    title: "Vakitler Alınamadı",
    text: msg,
    background: "#0d1b2a",
    color: "#e0c08d",
    confirmButtonColor: "#c5a059",
    confirmButtonText: "Tamam"
  });
}

function showTableLoading() {
  const el = document.getElementById("imsakiyeBody");
  if (el) el.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Yükleniyor...</td></tr>`;
}

function showTableError(msg) {
  const el = document.getElementById("imsakiyeBody");
  if (el) el.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3"><i class="fas fa-exclamation-triangle me-2"></i>${msg}</td></tr>`;
}

/* ─── GÜNLÜK İBADET TAKİBİ ──────────────────────────────── */

const TRACKER_ITEMS = [
  { id: "sabah", icon: "🌅", label: "Sabah Namazı" },
  { id: "ogle", icon: "☀️", label: "Öğle Namazı" },
  { id: "ikindi", icon: "🌤️", label: "İkindi Namazı" },
  { id: "aksam", icon: "🌇", label: "Akşam Namazı" },
  { id: "yatsi", icon: "🌙", label: "Yatsı Namazı" },
  { id: "teravih", icon: "🕌", label: "Teravih" },
  { id: "oruc", icon: "🌙", label: "Oruç" },
  { id: "kuran", icon: "📖", label: "Kuran Okuma" },
  { id: "sadaka", icon: "💛", label: "Sadaka" },
  { id: "dua", icon: "🤲", label: "Dua & Zikir" },
];

function getTodayKey() {
  const d = new Date();
  return `tracker_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
}

function loadTrackerState() {
  const raw = localStorage.getItem(getTodayKey());
  return raw ? JSON.parse(raw) : {};
}

function saveTrackerState(state) {
  localStorage.setItem(getTodayKey(), JSON.stringify(state));
}

function buildTracker() {
  const grid = document.getElementById("trackerGrid");
  const dateEl = document.getElementById("trackerDate");
  if (!grid) return;

  const today = new Date();
  if (dateEl) {
    dateEl.innerText = `${today.getDate()} ${TR_MONTHS[today.getMonth()]} ${today.getFullYear()}`;
  }

  const state = loadTrackerState();

  grid.innerHTML = TRACKER_ITEMS.map(item => `
    <div class="col-6 col-sm-4 col-md-3 col-lg-2">
      <div class="tracker-item ${state[item.id] ? 'done' : ''}"
           id="ti_${item.id}" onclick="toggleTracker('${item.id}')">
        <span class="tracker-icon">${state[item.id] ? '✅' : item.icon}</span>
        <span class="tracker-label">${item.label}</span>
      </div>
    </div>`).join("");

  updateTrackerProgress(state);
}

function toggleTracker(id) {
  const state = loadTrackerState();
  state[id] = !state[id];
  saveTrackerState(state);

  const item = TRACKER_ITEMS.find(i => i.id === id);
  const el = document.getElementById(`ti_${id}`);
  if (!el || !item) return;

  if (state[id]) {
    el.classList.add("done");
    el.querySelector(".tracker-icon").innerText = "✅";
  } else {
    el.classList.remove("done");
    el.querySelector(".tracker-icon").innerText = item.icon;
  }
  updateTrackerProgress(state);
}

function updateTrackerProgress(state) {
  const done = Object.values(state).filter(Boolean).length;
  const total = TRACKER_ITEMS.length;
  const pct = Math.round((done / total) * 100);

  const bar = document.getElementById("trackerBar");
  const score = document.getElementById("trackerScore");
  if (bar) bar.style.width = `${pct}%`;
  if (score) score.innerText = `${done}/${total}`;
}

/* ─── KIBL E YÖN HESABI ─────────────────────────────────── */

// Mekke koordinatları
const MECCA_LAT = 21.4225 * (Math.PI / 180);
const MECCA_LON = 39.8262 * (Math.PI / 180);

function calculateQibla(userLat, userLon) {
  const lat1 = userLat * (Math.PI / 180);
  const lon1 = userLon * (Math.PI / 180);
  const dLon = MECCA_LON - lon1;

  const y = Math.sin(dLon) * Math.cos(MECCA_LAT);
  const x = Math.cos(lat1) * Math.sin(MECCA_LAT)
    - Math.sin(lat1) * Math.cos(MECCA_LAT) * Math.cos(dLon);

  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  return (bearing + 360) % 360;
}

function setQibla(lat, lon) {
  const angle = calculateQibla(lat, lon);
  const needle = document.getElementById("qiblaNeedle");
  const textEl = document.getElementById("qiblaText");

  if (needle) needle.style.transform = `rotate(${angle}deg)`;

  const dirs = ["Kuzey", "KD", "Doğu", "GD", "Güney", "GB", "Batı", "KB"];
  const idx = Math.round(angle / 45) % 8;
  if (textEl) textEl.innerText =
    `Kıble yönü: ${angle.toFixed(1)}° (${dirs[idx]})`;
}

// Konum alındığında kıbles ayarla
function setupQibla() {
  const savedLat = parseFloat(localStorage.getItem("qiblaLat") || "0");
  const savedLon = parseFloat(localStorage.getItem("qiblaLon") || "0");

  if (savedLat && savedLon) {
    setQibla(savedLat, savedLon);
    return;
  }

  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    localStorage.setItem("qiblaLat", pos.coords.latitude);
    localStorage.setItem("qiblaLon", pos.coords.longitude);
    setQibla(pos.coords.latitude, pos.coords.longitude);
  }, () => {
    // İstanbul'un koordinatlarıyla varsayılan
    setQibla(41.015, 28.979);
    document.getElementById("qiblaText").innerText =
      "Konum alınamadı — İstanbul'a göre gösteriliyor";
  }, { timeout: 8000 });
}

/* ─── GÜNÜN DUASI ────────────────────────────────────────── */

const DUAS = [
  {
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّار",
    turkish: "Rabbimiz! Bize dünyada iyilik ver, ahirette de iyilik ver ve bizi ateş azabından koru.",
    source: "Bakara Suresi 201"
  },
  {
    arabic: "رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيم",
    turkish: "Rabbimiz! Bizden kabul buyur. Şüphesiz sen işitensin, bilensin.",
    source: "Bakara Suresi 127"
  },
  {
    arabic: "اللَّهُمَّ إِنَّكَ عُفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
    turkish: "Allah'ım! Sen affedicisin, affetmeyi seversin, beni affet.",
    source: "Kadir Gecesi Duası (İbn Mâce)"
  },
  {
    arabic: "رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالإِيمَانِ",
    turkish: "Rabbimiz! Bizi ve bizden önce iman etmiş kardeşlerimizi bağışla.",
    source: "Haşr Suresi 10"
  },
  {
    arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِك",
    turkish: "Allah'ım! Seni zikretmem, sana şükretmem ve sana güzel ibadet etmem için bana yardım et.",
    source: "Ebu Davud"
  },
  {
    arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
    turkish: "Rabbim! Göğsümü aç ve işimi kolaylaştır.",
    source: "Tâhâ Suresi 25-26"
  },
  {
    arabic: "حَسْبِيَ اللهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ",
    turkish: "Allah bana yeter. O'ndan başka ilah yoktur. Yalnızca O'na tevekkül ettim.",
    source: "Tevbe Suresi 129"
  },
];

let duaIndex = parseInt(localStorage.getItem("duaIndex") || "0") % DUAS.length;

function showDua() {
  const dua = DUAS[duaIndex];
  const arabicEl = document.getElementById("duaArabic");
  const turkishEl = document.getElementById("duaTurkish");
  const sourceEl = document.getElementById("duaSource");
  if (arabicEl) arabicEl.innerText = dua.arabic;
  if (turkishEl) turkishEl.innerText = `"${dua.turkish}"`;
  if (sourceEl) sourceEl.innerText = `📚 ${dua.source}`;
}

function nextDua() {
  duaIndex = (duaIndex + 1) % DUAS.length;
  localStorage.setItem("duaIndex", duaIndex);
  showDua();
}

/* ─── HAVA DURUMU ────────────────────────────────────────── */

const WEATHER_EMOJIS = {
  "Sunny": "☀️", "Clear": "🌙",
  "Partly cloudy": "⛅", "Partly Cloudy": "⛅",
  "Cloudy": "☁️", "Overcast": "☁️",
  "Mist": "🌫️", "Fog": "🌫️",
  "Freezing drizzle": "🌧️", "Light drizzle": "🌦️",
  "Drizzle": "🌦️", "Rain": "🌧️",
  "Light rain": "🌦️", "Heavy rain": "🌧️",
  "Snow": "❄️", "Light snow": "🌨️",
  "Thunder": "⛈️", "Thunderstorm": "⛈️",
  "Blizzard": "🌨️", "Patchy rain": "🌦️",
};

function getWeatherEmoji(desc) {
  for (const [key, emoji] of Object.entries(WEATHER_EMOJIS)) {
    if (desc.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return "🌤️";
}

function loadWeather(city) {
  document.getElementById("weatherDesc").innerText = "Yükleniyor...";
  document.getElementById("weatherTemp").innerText = "--";

  // wttr.in ücretsiz hava durumu API
  fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
    .then(r => r.json())
    .then(data => {
      const cur = data.current_condition[0];
      const desc = cur.weatherDesc[0].value;
      const temp = cur.temp_C;
      const hum = cur.humidity;
      const wind = cur.windspeedKmph;
      const feel = cur.FeelsLikeC;
      const emoji = getWeatherEmoji(desc);

      document.getElementById("weatherTemp").innerHTML =
        `<span class="weather-emoji">${emoji}</span>${temp}°C`;
      document.getElementById("weatherDesc").innerText = desc;
      document.getElementById("weatherHumidity").innerText = `${hum}%`;
      document.getElementById("weatherWind").innerText = `${wind} km/s`;
      document.getElementById("weatherFeels").innerText = `${feel}°C`;
    })
    .catch(() => {
      document.getElementById("weatherDesc").innerText = "Hava durumu alınamadı.";
    });
}

/* ─── DÜNYA İFTAR SAATLERİ ──────────────────────────────── */

const WORLD_CITIES = [
  { name: "Mekke", city: "Makkah", country: "SA", flag: "🇸🇦" },
  { name: "Medine", city: "Madinah", country: "SA", flag: "🕌" },
  { name: "Kudüs", city: "Jerusalem", country: "PS", flag: "🇵🇸" },
  { name: "Kahire", city: "Cairo", country: "EG", flag: "🇪🇬" },
  { name: "Londra", city: "London", country: "GB", flag: "🇬🇧" },
];

function loadWorldIftarTimes() {
  const list = document.getElementById("worldIftarList");
  if (!list) return;

  // Bootstrap grid — 3 sütun (col-6 col-md-4)
  list.innerHTML = WORLD_CITIES.map(c => `
    <div class="col-6 col-md-4">
      <div class="world-iftar-row" id="wc_${c.city}">
        <span>
          <span class="world-city-flag">${c.flag}</span>
          <span class="world-city-name">${c.name}</span>
        </span>
        <span class="world-iftar-time" id="wt_${c.city}">
          <i class="fas fa-spinner fa-spin"></i>
        </span>
      </div>
    </div>`).join("");

  WORLD_CITIES.forEach(c => {
    fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(c.city)}&country=${encodeURIComponent(c.country)}&method=2`)
      .then(r => r.json())
      .then(d => {
        const el = document.getElementById(`wt_${c.city}`);
        if (el && d.data?.timings?.Maghrib) {
          el.innerText = "🌙 " + cleanTime(d.data.timings.Maghrib);
        }
      })
      .catch(() => {
        const el = document.getElementById(`wt_${c.city}`);
        if (el) el.innerText = "--:--";
      });
  });
}

/* ─── RAMAZAN AY TAKVİMİ ────────────────────────────────── */

let ramadanDay30 = 0;

function buildRamadanCalendar(hijriDay) {
  const grid = document.getElementById("ramadanCalGrid");
  const prog = document.getElementById("ramadanProgress");
  if (!grid) return;

  ramadanDay30 = parseInt(hijriDay) || 1;

  let html = "";
  for (let d = 1; d <= 30; d++) {
    let cls = "future";
    if (d < ramadanDay30) cls = "past";
    if (d === ramadanDay30) cls = "today";
    html += `<div class="cal-day ${cls}" title="Ramazan'ın ${d}. günü">${d}</div>`;
  }
  grid.innerHTML = html;
  if (prog) prog.innerText = `${ramadanDay30} / 30 gün`;
}

/* ─── BAYRAM GERİ SAYIMI ─────────────────────────────────── */

const BAYRAMLAR = [
  {
    id: "ramazan",
    name: "Ramazan Bayramı",
    // 20 Mart 2026 00:00 yerel saat
    date: new Date(2026, 2, 20, 0, 0, 0),
  },
  {
    id: "kurban",
    name: "Kurban Bayramı",
    // 27 Mayıs 2026
    date: new Date(2026, 4, 27, 0, 0, 0),
  },
];

function updateBayramCountdowns() {
  const now = new Date();

  BAYRAMLAR.forEach(b => {
    const el = document.getElementById(`cd_${b.id}`);
    const card = document.getElementById(`bayram${b.id === "ramazan" ? 1 : 2}`);
    if (!el) return;

    const diff = b.date - now;

    if (diff <= 0) {
      el.innerHTML = "🎉 Bayramınız mübarek olsun!";
      el.classList.add("geçti");
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    if (days > 0) {
      el.innerHTML = `⏳ <strong>${days}</strong> gün <strong>${pad(hours)}</strong>:<strong>${pad(mins)}</strong>:<strong>${pad(secs)}</strong> kaldı`;
    } else {
      el.innerHTML = `⏳ <strong>${pad(hours)}</strong>:<strong>${pad(mins)}</strong>:<strong>${pad(secs)}</strong> kaldı`;
    }
  });
}

/* ─── BAŞLANGIÇTA BAŞLAT ─────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  buildTracker();
  setupQibla();
  showDua();
  loadWorldIftarTimes();
  buildCuzGrid();

  // Bayram + Kadir geri sayımı — her saniye güncelle
  updateBayramCountdowns();
  updateKadirCountdown();
  setInterval(() => {
    updateBayramCountdowns();
    updateKadirCountdown();
  }, 1000);
});

/* ─── KADİR GECESİ GERİ SAYIMI ──────────────────────────── */

// 26 Mart 2026 Perşembe günü gece (27. Ramazan gecesi akşamdan itibaren)
const KADIR_DATE = new Date(2026, 2, 26, 18, 0, 0); // 26 Mart saat 18:00

function updateKadirCountdown() {
  const el = document.getElementById("kadirCountdown");
  if (!el) return;

  const now = new Date();
  const diff = KADIR_DATE - now;

  if (diff <= 0) {
    el.innerHTML = "✨ Kadir Geceniz mübarek olsun!";
    return;
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  el.innerHTML = days > 0
    ? `⭐ <strong>${days}</strong> gün <strong>${pad(hours)}</strong>:<strong>${pad(mins)}</strong>:<strong>${pad(secs)}</strong> kaldı`
    : `⭐ <strong>${pad(hours)}</strong>:<strong>${pad(mins)}</strong>:<strong>${pad(secs)}</strong> kaldı`;
}

/* ─── EZAN SESİ ──────────────────────────────────────────── */

let ezanPlaying = false;

function toggleEzan() {
  const audio = document.getElementById("ezanAudio");
  const btn = document.getElementById("ezanBtn");
  const icon = document.getElementById("ezanIcon");
  const label = document.getElementById("ezanLabel");
  if (!audio) return;

  if (ezanPlaying) {
    audio.pause();
    audio.currentTime = 0;
    ezanPlaying = false;
    btn.classList.remove("playing");
    icon.innerText = "🔊";
    label.innerText = "Ezan Dinle";
  } else {
    audio.play()
      .then(() => {
        ezanPlaying = true;
        btn.classList.add("playing");
        icon.innerText = "⏹️";
        label.innerText = "Durdur";
      })
      .catch(() => {
        icon.innerText = "❌";
        label.innerText = "Yüklenemedi";
      });
  }

  // Ezan bitince sıfırla
  audio.onended = () => {
    ezanPlaying = false;
    btn.classList.remove("playing");
    icon.innerText = "🔊";
    label.innerText = "Ezan Dinle";
  };
}

/* ─── 30 CÜZ HATEM TAKİBİ ───────────────────────────────── */

const CUZ_KEY = "cuzState";

function loadCuzState() {
  const raw = localStorage.getItem(CUZ_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveCuzState(state) {
  localStorage.setItem(CUZ_KEY, JSON.stringify(state));
}

function buildCuzGrid() {
  const grid = document.getElementById("cuzGrid");
  if (!grid) return;

  const state = loadCuzState();
  let html = "";

  for (let i = 1; i <= 30; i++) {
    const done = !!state[i];
    html += `
      <div class="cuz-item ${done ? "okundu" : ""}"
           id="cuz_${i}" onclick="toggleCuz(${i})"
           title="${i}. Cüz">
        <span class="cuz-num">${i}</span>
        <span class="cuz-icon">${done ? "📗" : "📄"}</span>
      </div>`;
  }

  grid.innerHTML = html;
  updateCuzProgress(state);
}

function toggleCuz(num) {
  const state = loadCuzState();
  state[num] = !state[num];
  saveCuzState(state);

  const el = document.getElementById(`cuz_${num}`);
  if (!el) return;

  if (state[num]) {
    el.classList.add("okundu");
    el.querySelector(".cuz-icon").innerText = "📗";
  } else {
    el.classList.remove("okundu");
    el.querySelector(".cuz-icon").innerText = "📄";
  }
  updateCuzProgress(state);
}

function updateCuzProgress(state) {
  const done = Object.values(state).filter(Boolean).length;
  const pct = Math.round((done / 30) * 100);
  const barEl = document.getElementById("cuzBar");
  const scoreEl = document.getElementById("cuzScore");
  if (barEl) barEl.style.width = `${pct}%`;
  if (scoreEl) scoreEl.innerText = `${done} / 30 Cüz`;
}


function resetCuz() {
  Swal.fire({
    title: "Sıfırlansın mı?",
    text: "30 Cüz takibini sıfırlamak istediğinizden emin misiniz?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Evet, sıfırla",
    cancelButtonText: "Vazgeç",
    confirmButtonColor: "#c5a059",
    cancelButtonColor: "#374151",
    background: "#0d1b2a",
    color: "#e0c08d",
    iconColor: "#f59e0b",
    customClass: {
      popup: "swal-ramazan-popup",
    }
  }).then(result => {
    if (result.isConfirmed) {
      localStorage.removeItem(CUZ_KEY);
      buildCuzGrid();
      Swal.fire({
        toast: true, position: "bottom-end", icon: "success",
        title: "📄 30 Cüz takibi sıfırlandı.",
        showConfirmButton: false, timer: 2500, timerProgressBar: true,
        background: "#0d1b2a", color: "#e0c08d", iconColor: "#c5a059"
      });
    }
  });
}

/* ─── BİLGİ KARTLARI ──────────────────────────────────────── */

const BILGI_CARDS = [
  {
    icon: "🌙",
    title: "Ramazan'ın 3 Dilimi",
    text: "İlk 10 gün RAHMET, ikinci 10 gün MAĞFIRET, son 10 gün ise CEHENNEMDEN KURTULUŞ dilimidir. Her dilim ayrı bir fırsattır."
  },
  {
    icon: "⭐",
    title: "Kadir Gecesinin Önemi",
    text: "Kadir Gecesi, bin aydan (83 yıl 4 aydan) daha hayırlıdır. Bu gecede yapılan ibadetler binlerce ay boyunca yapılmış gibi kabul edilir."
  },
  {
    icon: "🤲",
    title: "İftar Duası",
    text: "\"Allahümme leke sumtü ve bike amentü ve aleyke tevekkeltü ve ala rizkike eftartü.\" — Oruçlunun iftar anındaki duası geri çevrilmez."
  },
  {
    icon: "🌅",
    title: "Sahur Bereketi",
    text: "Hz. Peygamber (s.a.v.): \"Sahura kalkın, çünkü sahurda bereket vardır.\" (Buhârî) — Bir yudum su bile olsa sahur yapılmalıdır."
  },
  {
    icon: "💰",
    title: "Sadaka-i Fıtır",
    text: "Ramazan Bayramı namazından önce verilmesi gereken bir sadakadır. 2026 yılı için Diyanet tarafından belirlenen miktar açıklanacaktır."
  },
  {
    icon: "🕌",
    title: "Teravih Namazı",
    text: "Teravih Ramazan ayına özgü, yatsı namazından sonra kılınan bir sünnet namazdır. 20 rekat olup her 4 rekatta bir ara verilir."
  },
  {
    icon: "🫀",
    title: "Orucun Sağlık Faydaları",
    text: "Modern tıp, oruçla birlikte vücudun toksinlerden arındığını ve hücreler düzeyinde kendini yenilediğini (otofaji) kanıtlamıştır."
  },
  {
    icon: "📿",
    title: "En Faziletli Zikirler",
    text: "Sübhânallah · Elhamdülillah · Allahu Ekber · Lâ ilâhe illallah — Bu dört cümle Ramazan'da sevabı en fazla olan zikirlerdir."
  },
  {
    icon: "🕯️",
    title: "İtikâf",
    text: "Ramazan'ın son 10 gününde camide sürekli ibadet için yapılan ibadete İtikâf denir. Hz. Peygamber her yıl son 10 günde itikâfa girerdi."
  },
  {
    icon: "🌍",
    title: "Dünyada Ramazan",
    text: "Dünya genelinde 1.8 milyardan fazla Müslüman, aynı anda oruç tutar. Bazı ülkelerde gündüz süresi 22 saate kadar uzayabilmektedir."
  },
];

let bilgiScrollX = 0;
const BILGI_CARD_W = 254; // kart genişliği + gap

function buildBilgiCards() {
  const row = document.getElementById("bilgiRow");
  if (!row) return;

  row.innerHTML = BILGI_CARDS.map(c => `
    <div class="bilgi-card">
      <span class="bilgi-card-icon">${c.icon}</span>
      <div class="bilgi-card-title">${c.title}</div>
      <p class="bilgi-card-text">${c.text}</p>
    </div>`).join("");
}

function scrollBilgi(dir) {
  const wrap = document.querySelector(".bilgi-scroll-wrap");
  if (!wrap) return;
  wrap.scrollBy({ left: dir * BILGI_CARD_W * 2, behavior: "smooth" });
}

/* ─── DOMContentLoaded — bilgi kartları ──────────────────── */
document.addEventListener("DOMContentLoaded", buildBilgiCards);
document.addEventListener("DOMContentLoaded", () => { switchDuaTab("dualar"); });

/* ─── DUA & SURE KÜTÜPHANESİ ─────────────────────────────── */

const DUA_DB = {
  dualar: [
    {
      icon: "☀️", name: "Sabah Duası",
      arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
      latin: "Allahümme bike asbahna ve bike emseyna ve bike nahya ve bike nemutü ve ileyken nüşur.",
      meaning: "Allah'ım! Senin adınla sabahladık, senin adınla akşamladık. Senin adınla yaşar, senin adınla ölürüz. Dönüşümüz sanadır.",
      source: "Ebu Davud, Tirmizi"
    },
    {
      icon: "🌙", name: "Akşam Duası",
      arabic: "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ",
      latin: "Allahümme bike emseyna ve bike asbahna ve bike nahya ve bike nemutü ve ileykel masır.",
      meaning: "Allah'ım! Senin adınla akşamladık, senin adınla sabahladık. Senin adınla yaşar, senin adınla ölürüz. Dönüş yalnızca sanadır.",
      source: "Ebu Davud, Tirmizi"
    },
    {
      icon: "🍽️", name: "Yemek Duası (Önce)",
      arabic: "بِسْمِ اللهِ وَعَلَى بَرَكَةِ اللهِ",
      latin: "Bismillahi ve ala bereketillah.",
      meaning: "Allah'ın adıyla ve Allah'ın bereketi üzerine (yiyorum).",
      source: "Ebu Davud"
    },
    {
      icon: "🙏", name: "Yemek Duası (Sonra)",
      arabic: "الْحَمْدُ للهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ",
      latin: "Elhamdülillahilleẑi et'amena ve sekana ve ce'alena müslimin.",
      meaning: "Bizi doyuran, içiren ve Müslüman kılan Allah'a hamd olsun.",
      source: "Ebu Davud, Tirmizi"
    },
    {
      icon: "😴", name: "Uyku Duası",
      arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
      latin: "Bismikellahümme emutü ve ahya.",
      meaning: "Allah'ım! Senin adınla ölür (uyur) ve yaşarım (uyanırım).",
      source: "Buhari, Müslim"
    },
    {
      icon: "🌤️", name: "Uyanış Duası",
      arabic: "الْحَمْدُ للهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
      latin: "Elhamdülillahilleẑi ahyana ba'de ma ematena ve ileyhinnüşur.",
      meaning: "Bizi öldürdükten (uyuttuktan) sonra dirilten (uyandıran) Allah'a hamd olsun. Dönüş sanadır.",
      source: "Buhari"
    },
    {
      icon: "💧", name: "Abdest Duası",
      arabic: "بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ",
      latin: "Bismillahirrahmanirrahim.",
      meaning: "Rahman ve Rahim olan Allah'ın adıyla.",
      source: "Ebu Davud"
    },
    {
      icon: "🚗", name: "Yolculuk Duası",
      arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ",
      latin: "Sübhanelleẑi sahhara lena haẑa ve ma künna lehu mukriniyn ve inna ila rabbina lemünkalibuun.",
      meaning: "Bunu bizim hizmetimize vereni tesbih ederim. Biz buna güç yetiremezdik. Şüphesiz Rabbimize döneceğiz.",
      source: "Zuhruf Suresi 13-14"
    },
    {
      icon: "🏠", name: "Eve Girerken",
      arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ",
      latin: "Allahümme inni es'elüke hayrel mevlici ve hayrel mahrac. Bismillahi velecna ve bismillahi haracna.",
      meaning: "Allah'ım! Girişimin ve çıkışının hayrını senden dilerim. Allah'ın adıyla girdik, Allah'ın adıyla çıktık.",
      source: "Ebu Davud"
    },
    {
      icon: "😰", name: "Sıkıntı Anında",
      arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ",
      latin: "La ilahe illa ente sübhaneke inni küntü minez zalimiyn.",
      meaning: "Senden başka ilah yoktur. Seni tenzih ederim. Şüphesiz ben zalimlerden oldum.",
      source: "Hz. Yunus'un duası — Enbiya 87"
    },
    {
      icon: "🔄", name: "İstiğfar",
      arabic: "أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
      latin: "Esteğfirullahal'azıymelleẑi la ilahe illahüvel hayyül kayyumü ve etubü ileyh.",
      meaning: "O'ndan başka ilah bulunmayan, diri ve her şeyi ayakta tutan Yüce Allah'tan bağışlanma diler ve O'na tövbe ederim.",
      source: "Ebu Davud, Tirmizi"
    },
    {
      icon: "💊", name: "Şifa Duası",
      arabic: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَاسَ وَاشْفِهِ وَأَنْتَ الشَّافِي لَا شِفَاءَ إِلَّا شِفَاؤُكَ",
      latin: "Allahümme rabben nasi eẑhibil be'se veşfihü enteşşafi la şifae illa şifaük şifaen la yüğadiru sekaamen.",
      meaning: "Ey insanların Rabbi! Hastalığı gider ve onu şifaya kavuştur. Şifa veren sensin. Senin şifanın dışında şifa yoktur.",
      source: "Buhari, Müslim"
    },
  ],
  ramazan: [
    {
      icon: "🌅", name: "Oruç Niyet Duası",
      arabic: "نَوَيْتُ أَنْ أَصُومَ صَوْمَ شَهْرِ رَمَضَانَ مِنَ الْفَجْرِ إِلَى الْمَغْرِبِ خَالِصًا لِلَّهِ تَعَالَى",
      latin: "Nevevtü en esume savme şehri ramadane minel fecri ilel mağribi halisen lillahi teala.",
      meaning: "Ramazan ayının orucunu, fecirden akşama kadar, yalnızca Allah rızası için tutmaya niyet ettim.",
      source: "Fıkıh Kitapları"
    },
    {
      icon: "🌙", name: "İftar Duası",
      arabic: "اللَّهُمَّ لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ",
      latin: "Allahümme leke sumtü ve bike amentü ve aleyke tevekkeltü ve ala rizkike eftartü.",
      meaning: "Allah'ım! Senin için oruç tuttum, sana inandım, sana tevekkül ettim ve senin rızkınla orucumu açtım.",
      source: "Ebu Davud"
    },
    {
      icon: "✨", name: "Kadir Gecesi Duası",
      arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
      latin: "Allahümme inneke afüvvün tühibbül afve fa'fü anni.",
      meaning: "Allah'ım! Sen çok affedicisin, affı seversin. Beni de affet.",
      source: "Hz. Aişe r.a. rivayeti — İbn Mace, Tirmizi"
    },
    {
      icon: "🤲", name: "Sahur Duası",
      arabic: "وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانَ",
      latin: "Ve bisavmi ğadin nevveytü min şehri ramazan.",
      meaning: "Ramazan ayından yarının orucuna niyet ettim.",
      source: "Fıkıh Kitapları"
    },
    {
      icon: "🌟", name: "Teravih Duası",
      arabic: "سُبْحَانَ الْمَلِكِ الْقُدُّوسِ",
      latin: "Sübhaanel melikilkuddus.",
      meaning: "Melik ve Kuddüs olan Allah'ı tesbih ederim.",
      source: "Teravih namazlarında okunur"
    },
    {
      icon: "💛", name: "Sadaka-i Fıtır Niyeti",
      arabic: "نَوَيْتُ أَنْ أُخْرِجَ زَكَاةَ الْفِطْرِ عَنْ نَفْسِي فَرْضًا لِلَّهِ تَعَالَى",
      latin: "Nevevtü en uhrıce zekatel fıtrı an nefsi fardan lillahi teala.",
      meaning: "Farz olduğu için, Allah rızasına yönelik olarak nefsim adına sadakayı fıtır vermeye niyet ettim.",
      source: "Fıkıh Kitapları"
    },
    {
      icon: "🕌", name: "Bayram Namazı Tekbiri",
      arabic: "اللهُ أَكْبَرُ اللهُ أَكْبَرُ لَا إِلَهَ إِلَّا اللهُ وَاللهُ أَكْبَرُ اللهُ أَكْبَرُ وَلِلَّهِ الْحَمْدُ",
      latin: "Allahu akber, Allahu akber, la ilahe illallahu vallahu akber, Allahu akber ve lillahilhamd.",
      meaning: "Allah en büyüktür, Allah en büyüktür. Allah'tan başka ilah yoktur. Allah en büyüktür, Allah en büyüktür. Hamd Allah'adır.",
      source: "Bayram namazı tekbiri"
    },
  ],
  sureler: [
    {
      icon: "📖", name: "Fatiha Suresi",
      arabic: "بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
      latin: "Bismillahirrahmanirrahim. Elhamdülillahi rabbil alemin. Errahmanirrahim. Maliki yevmiddin. İyyake na'budü ve iyyake nestein. İHdinas sıratal müstekiym. Sıratallezine en'amte aleyhim ğayril mağdubi aleyhim ve lad dallin.",
      meaning: "Rahman ve Rahim olan Allah'ın adıyla. Hamd, âlemlerin Rabbi Allah'a mahsustur. Rahman'dır, Rahim'dir. Din (hesap) gününün sahibidir. Yalnız sana ibadet eder, yalnız senden yardım dileriz. Bizi doğru yola ilet. Kendilerine nimet verdiklerinin yoluna, gazaba uğrayanların ve sapkınların yoluna değil.",
      source: "Fatiha Suresi — 7 Ayet"
    },
    {
      icon: "✨", name: "İhlas Suresi",
      arabic: "قُلْ هُوَ اللهُ أَحَدٌ ۝ اللهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
      latin: "Kul hüvallahü ehad. Allahüssamed. Lem yelid ve lem yüled. Ve lem yekün lehü küfüven ehad.",
      meaning: "De ki: O Allah birdir. Allah Samed'dir. O doğurmamış ve doğurulmamıştır. O'nun hiçbir dengi de yoktur.",
      source: "İhlas Suresi — 4 Ayet"
    },
    {
      icon: "🌅", name: "Felak Suresi",
      arabic: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِنْ شَرِّ مَا خَلَقَ ۝ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ",
      latin: "Kul e'uẑü birabbil felak. Min şerri ma halak. Ve min şerri ğasikın iẑa vekab. Ve min şerrin neffasati fil ukad. Ve min şerri hasidin iẑa hased.",
      meaning: "De ki: Şafağın Rabbine sığınırım. Yarattığı şeylerin şerrinden, karanlığı çöktüğünde gecenin şerrinden, düğümlere üfleyenlerin şerrinden, kıskandığında kıskanç olanın şerrinden.",
      source: "Felak Suresi — 5 Ayet"
    },
    {
      icon: "🛡️", name: "Nas Suresi",
      arabic: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَـٰهِ النَّاسِ ۝ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ",
      latin: "Kul e'uẑü birabbin nas. Melikinnас. İlahinnас. Min şerril vesvasilhannas. Elleẑi yüvesvisü fi sudurinnas. Minel cinneti vennas.",
      meaning: "De ki: İnsanların Rabbine, insanların melikine, insanların ilahına sığınırım. Sinsi vesvesecinin şerrinden ki o, insanların göğüslerine vesvese verir. Cinlerden ve insanlardan.",
      source: "Nas Suresi — 6 Ayet"
    },
    {
      icon: "🕰️", name: "Asr Suresi",
      arabic: "وَالْعَصْرِ ۝ إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ ۝ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ",
      latin: "Vel asr. İnnel insane lefi husr. İllellezine amenu ve amilus salihati ve tevasaw bilhakki ve tevasaw bissabr.",
      meaning: "Asra yemin olsun ki insan gerçekten ziyan içindedir. Ancak iman edip salih amel işleyenler, birbirlerine hakkı ve sabrı tavsiye edenler başka.",
      source: "Asr Suresi — 3 Ayet"
    },
    {
      icon: "🌊", name: "Kevser Suresi",
      arabic: "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ ۝ فَصَلِّ لِرَبِّكَ وَانْحَرْ ۝ إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ",
      latin: "İnna a'taynakel kevser. Fesalli lirabbike venhar. İnne şanieke hüvel ebter.",
      meaning: "Şüphesiz biz sana Kevser'i verdik. O hâlde Rabbin için namaz kıl ve kurban kes. Asıl soyu kesik olan seni çekemeyendir.",
      source: "Kevser Suresi — 3 Ayet"
    },
    {
      icon: "🙅", name: "Kafirun Suresi",
      arabic: "قُلْ يَا أَيُّهَا الْكَافِرُونَ ۝ لَا أَعْبُدُ مَا تَعْبُدُونَ ۝ وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُدُ ۝ وَلَا أَنَا عَابِدٌ مَّا عَبَدتُّمْ ۝ وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُدُ ۝ لَكُمْ دِينُكُمْ وَلِيَ دِينِ",
      latin: "Kul ya eyyühel kafirun. La a'büdü ma ta'büdun. Ve la entüm abidune ma a'büd. Ve la ene abidün ma abedtüm. Ve la entüm abidune ma a'büd. Leküm dinüküm ve liyedin.",
      meaning: "De ki: Ey kâfirler! Ben sizin taptıklarınıza tapmam. Siz de benim taptığıma tapanlar değilsiniz. Sizin dininiz size, benim dinim bana.",
      source: "Kafirun Suresi — 6 Ayet"
    },
    {
      icon: "🐘", name: "Fil Suresi",
      arabic: "أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ ۝ أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ ۝ وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ ۝ تَرْمِيهِم بِحِجَارَةٍ مِّن سِجِّيلٍ ۝ فَجَعَلَهُمْ كَعَصْفٍ مَّأْكُولٍ",
      latin: "Elem tera keyfe fe'ale rabbüke bi eshabilfil. Elem yec'al keydehüm fi tadlil. Ve ersele aleyhim tayran ebebil. Tarmihim bihicaratin min siccil. Fece'alehüm keasfin me'kül.",
      meaning: "Rabbinin fil sahiplerine ne yaptığını görmedin mi? Onların hileli planlarını boşa çıkarmadı mı? Üzerlerine sürü sürü kuşlar gönderdi. O kuşlar onlara pişmiş çamurdan taşlar atıyordu. Böylece Allah onları yenilmiş ekin yaprağına çevirdi.",
      source: "Fil Suresi — 5 Ayet"
    },
    {
      icon: "🏛️", name: "Kureyş Suresi",
      arabic: "لِإِيلَافِ قُرَيْشٍ ۝ إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ ۝ فَلْيَعْبُدُوا رَبَّ هَـٰذَا الْبَيْتِ ۝ الَّذِي أَطْعَمَهُمْ مِنْ جُوعٍ وَآمَنَهُمْ مِنْ خَوْفٍ",
      latin: "Liylafi kurayş. Iylafihin rıhleteşşitai vessayf. Felya'büdu rabbe hazelbeyt. Elleẑi at'amehüm min cüin ve amenehüm min havf.",
      meaning: "Kureyş'in güven içinde bulunması için. Kış ve yaz yolculuklarında güven içinde bulunmaları için. Onlar da bu Beyt'in Rabbine ibadet etsinler. O ki kendilerini açlıktan kurtarıp doyurdu, korkudan kurtarıp güvene kavuşturdu.",
      source: "Kureyş Suresi — 4 Ayet"
    },
  ]
};

let activeDuaTab = "dualar";

function switchDuaTab(tab, btn) {
  activeDuaTab = tab;
  document.querySelectorAll(".dua-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  else {
    const allTabs = document.querySelectorAll(".dua-tab");
    const idx = ["dualar", "ramazan", "sureler"].indexOf(tab);
    if (allTabs[idx]) allTabs[idx].classList.add("active");
  }
  renderDuaContent(DUA_DB[tab]);
}

function renderDuaContent(items) {
  const el = document.getElementById("duaContent");
  if (!el) return;
  el.innerHTML = items.map((d, i) => `
    <div class="dua-item" id="ditem_${i}">
      <div class="dua-item-header" onclick="toggleDuaItem('ditem_${i}')">
        <span class="dua-item-name">
          <span class="dua-item-icon">${d.icon}</span>
          ${d.name}
        </span>
        <i class="fas fa-chevron-down dua-chevron"></i>
      </div>
      <div class="dua-item-body">
        <div class="dua-item-content">
          <div class="dua-arabic-text">${d.arabic}</div>
          <p class="dua-latin">${d.latin}</p>
          <p class="dua-meaning">📝 ${d.meaning}</p>
          <p class="dua-source">📚 ${d.source}</p>
        </div>
      </div>
    </div>`).join("");
}

function toggleDuaItem(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("open");
}

function filterDuaSure(query) {
  const q = query.toLowerCase().trim();
  if (!q) { renderDuaContent(DUA_DB[activeDuaTab]); return; }

  // Tüm kategorilerde ara
  const all = [...DUA_DB.dualar, ...DUA_DB.ramazan, ...DUA_DB.sureler];
  const results = all.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.meaning.toLowerCase().includes(q) ||
    d.latin.toLowerCase().includes(q)
  );
  renderDuaContent(results.length ? results : [{ icon: "😔", name: "Sonuç bulunamadı", arabic: "", latin: "", meaning: "Arama kriterlerinize uygun dua/sure bulunamadı.", source: "" }]);
}

/* ─── TOAST BİLDİRİM SİSTEMİ ─────────────────────────────── */

function showToast(message, type = "default", duration = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const icons = { success: "✅", info: "💡", warning: "⚠️", default: "🌙" };
  const icon = icons[type] || icons.default;
  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

/* ─── AY FAZI HESAPLAYICI ───────────────────────────────── */

function getMoonPhase(date) {
  const known = new Date(2000, 0, 6);
  const diff = (date - known) / (1000 * 60 * 60 * 24);
  const cycle = 29.53058867;
  const phase = ((diff % cycle) + cycle) % cycle;
  if (phase < 1.85) return { emoji: "🌑", name: "Yeni Ay" };
  if (phase < 5.54) return { emoji: "🌒", name: "Hilal" };
  if (phase < 9.22) return { emoji: "🌓", name: "İlk Dördün" };
  if (phase < 12.91) return { emoji: "🌔", name: "Şişman Hilal" };
  if (phase < 16.61) return { emoji: "🌕", name: "Dolunay" };
  if (phase < 20.30) return { emoji: "🌖", name: "Azalan Dolunay" };
  if (phase < 23.99) return { emoji: "🌗", name: "Son Dördün" };
  if (phase < 27.68) return { emoji: "🌘", name: "Azalan Hilal" };
  return { emoji: "🌑", name: "Yeni Ay" };
}

function updateMoonPhase() {
  const moon = getMoonPhase(new Date());
  const emojiEl = document.getElementById("moonPhaseEmoji");
  const nameEl = document.getElementById("moonPhaseName");
  if (emojiEl) emojiEl.textContent = moon.emoji;
  if (nameEl) nameEl.textContent = moon.name;
}

/* ─── NAMAZ VAKTİ BİLDİRİM SİSTEMİ ─────────────────────── */

const PRAYER_NAMES_TR = {
  Fajr: "İmsak", Dhuhr: "Öğle",
  Asr: "İkindi", Maghrib: "Akşam (İftar)", Isha: "Yatsı"
};

let prayerNotifyFired = {};

function checkPrayerNotifications() {
  if (!prayerData) return;
  const n = new Date();
  for (const [key, labelTR] of Object.entries(PRAYER_NAMES_TR)) {
    const pTime = parseTime(prayerData[key]);
    const diff = pTime - n;
    const fireKey = `${key}_${n.toDateString()}`;
    if (prayerNotifyFired[fireKey]) continue;
    if (diff > 0 && diff <= 5 * 60 * 1000) {
      prayerNotifyFired[fireKey] = true;
      const mins = Math.ceil(diff / 60000);
      showPrayerNotifyBanner(`🕌 ${labelTR} vakti ${mins} dakikaya kaldı!`);
      sendNotification(`🕌 ${labelTR}`, `Namaz vakti ${mins} dakikaya kaldı.`);
    }
  }
}

function showPrayerNotifyBanner(text) {
  const panel = document.getElementById("prayerNotifyPanel");
  const textEl = document.getElementById("prayerNotifyText");
  if (!panel) return;
  if (textEl) textEl.textContent = text;
  panel.classList.add("show");
  setTimeout(() => panel.classList.remove("show"), 9000);
}

function dismissPrayerNotify() {
  const panel = document.getElementById("prayerNotifyPanel");
  if (panel) panel.classList.remove("show");
}

/* ─── İFTAR VAKTİ PAYLAŞIMI ─────────────────────────────── */

function shareIftarTime() {
  const iftarEl = document.getElementById("maghribTime");
  const iftar = iftarEl ? iftarEl.textContent : "--:--";
  const text = `🌙 ${activeCity} İftar Vakti: ${iftar}\n\nHayırlı iftarlar! 🤲`;
  if (navigator.share) {
    navigator.share({ title: "İftar Vakti", text })
      .then(() => showToast("Başarıyla paylaşıldı!", "success"))
      .catch(() => { });
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showToast("İftar vakti panoya kopyalandı! 📋", "info");
    }).catch(() => {
      showToast("Paylaşım bu tarayıcıda desteklenmiyor.", "warning");
    });
  }
}

/* ─── RAMAZAN İSTATİSTİKLERİ ────────────────────────────── */

function updateRamadanStats(hijriDay) {
  const day = parseInt(hijriDay) || 1;
  const gecen = Math.max(0, day - 1);
  const kalan = Math.max(0, 30 - day);
  const state = loadTrackerState();
  const done = Object.values(state).filter(Boolean).length;
  const pct = Math.round((done / TRACKER_ITEMS.length) * 100);
  const cuzState = loadCuzState();
  const cuzDone = Object.values(cuzState).filter(Boolean).length;
  const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  setEl("statGecen", gecen);
  setEl("statKalan", kalan);
  setEl("statIbadet", pct + "%");
  setEl("statCuz", cuzDone + "/30");
}

/* ─── HAFTALIK İBADET ÖZETİ ─────────────────────────────── */

const WEEK_DAYS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function buildWeeklyGrid() {
  const grid = document.getElementById("weeklyGrid");
  if (!grid) return;
  const today = new Date();
  let html = "";
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `tracker_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
    const raw = localStorage.getItem(key);
    const state = raw ? JSON.parse(raw) : {};
    const doneCount = Object.values(state).filter(Boolean).length;
    const total = TRACKER_ITEMS.length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    const barH = Math.max(pct, 4);
    const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const dayName = WEEK_DAYS_TR[dayIdx];
    const isToday = i === 0;
    html += `
      <div class="weekly-day-col ${isToday ? "today-col" : ""}">
        <div class="weekly-day-label">${dayName}</div>
        <div class="weekly-day-bar-wrap" title="${doneCount}/${total} ibadet">
          <div class="weekly-day-bar ${isToday ? "today-bar" : ""}" style="height:${barH}%"></div>
        </div>
        <div class="weekly-day-score">${doneCount}</div>
      </div>`;
  }
  grid.innerHTML = html;
}

/* ─── SONRAKİ NAMAZ VAKTİ VURGULAMA ─────────────────────── */

function highlightNextPrayer() {
  if (!prayerData) return;
  const n = new Date();
  const order = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const idMap = {
    Fajr: "fajrTime", Sunrise: "sunriseTime", Dhuhr: "dhuhrTime",
    Asr: "asrTime", Maghrib: "maghribTime", Isha: "ishaTime"
  };
  document.querySelectorAll(".time-item").forEach(el => {
    el.classList.remove("active-time");
    const b = el.querySelector(".next-badge");
    if (b) b.remove();
  });
  for (const key of order) {
    const pTime = parseTime(prayerData[key]);
    if (pTime > n) {
      const el = document.getElementById(idMap[key]);
      if (el) {
        const wrap = el.closest(".time-item");
        if (wrap) {
          wrap.classList.add("active-time");
          const badge = document.createElement("span");
          badge.className = "next-badge";
          badge.textContent = "Sonraki";
          el.after(badge);
        }
      }
      break;
    }
  }
}

/* ─── SCROLL TO TOP ──────────────────────────────────────── */

window.addEventListener("scroll", () => {
  const btn = document.getElementById("scrollTopBtn");
  if (btn) {
    if (window.scrollY > 400) btn.classList.add("visible");
    else btn.classList.remove("visible");
  }
});

/* ─── YENİ ÖZELLİKLER BAŞLANGIÇ ───────────────────────────  */

document.addEventListener("DOMContentLoaded", () => {
  updateMoonPhase();
  buildWeeklyGrid();

  // Hava durumunu yükle
  const city = localStorage.getItem("savedCity") || "Istanbul";
  loadWeather(city);

  // Namaz vakti bildirimleri — her 30 saniyede bir kontrol
  setInterval(checkPrayerNotifications, 30000);

  // Hoş Geldin Resimli Modal (oturum başında bir kere)
  if (!sessionStorage.getItem("welcomed")) {
    sessionStorage.setItem("welcomed", "1");
    setTimeout(showWelcomeImage, 1000);
  }
});

function showWelcomeImage() {
  const quotes = [
    "“Oruç tutunuz ki sıhhat bulasınız.” — Hadis-i Şerif",
    "“Ramazan ayı, insanlara yol gösterici, doğrunun ve hakla bâtılı ayırmanın açık delilleri olarak Kur’an’ın indirildiği aydır.” — Bakara 185",
    "“Kim inanarak ve sevabını Allah’tan umarak Ramazan orucunu tutarsa, geçmiş günahları affedilir.” — Hadis-i Şerif",
    "“Ramazan bereket ayıdır. Allah bu ayda günahları bağışlar, duaları kabul eder.” — Hadis-i Şerif",
    "“Gerçek oruç, sadece yiyip içmeyi değil, boş ve hayâsızca sözleri de terk etmektir.” — Hadis-i Şerif"
  ];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  Swal.fire({
    html: `
      <div class="welcome-img-container">
        <div class="welcome-text-overlay">Hayırlı İftarlar</div>
        <img src="resim.png" alt="Ramazan">
        <div class="welcome-daily-content">
          <div class="welcome-daily-label">Günün Mesajı</div>
          <p class="welcome-daily-text">${randomQuote}</p>
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCloseButton: true,
    timer: 10000,
    timerProgressBar: true,
    background: 'transparent',
    backdrop: 'rgba(0,0,0,0.9)',
    showClass: {
      popup: 'swal-drop-down'
    },
    position: 'center',
    width: 'min(95vw, 1000px)',
    padding: '0'
  });
}


