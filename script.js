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
  // Kayıtlı şehir varsa direkt yükle, konuma gitme
  const savedCity = localStorage.getItem("savedCity");
  if (savedCity) {
    activeCity = savedCity;
    setLocation(`<i class="fas fa-map-marker-alt me-1"></i>${savedCity}`);
    loadData(savedCity, "Turkey");
    return;
  }

  if (!navigator.geolocation) {
    setLocation("Konum desteklenmiyor.");
    loadData(activeCity, "Turkey");
    return;
  }

  setLocation('<i class="fas fa-spinner fa-spin me-1"></i>Konum alınıyor...');

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      setLocation('<i class="fas fa-spinner fa-spin me-1"></i>Şehir tespit ediliyor...');

      // OpenStreetMap Nominatim ile ters geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr`)
        .then(r => r.json())
        .then(geo => {
          const addr = geo.address || {};
          // Önce il, sonra ilçe, sonra şehir adını dene
          const detected =
            addr.province ||
            addr.city ||
            addr.county ||
            addr.state ||
            "Istanbul";

          // Listemizde tam eşleşen şehri bul (Türkçe karakter toleranslı)
          const match = TR_CITIES.find(c =>
            c.name.toLowerCase().replace(/ı/g, "i").replace(/ğ/g, "g")
              .replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
            ===
            detected.toLowerCase().replace(/ı/g, "i").replace(/ğ/g, "g")
              .replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
          );

          const cityToUse = match ? match.name : detected;
          activeCity = cityToUse;
          localStorage.setItem("savedCity", cityToUse); // kaydet

          setLocation(`<i class="fas fa-map-marker-alt me-1"></i>${cityToUse}`);
          buildCityGrid(); // aktif şehiri güncelle
          loadData(cityToUse, "Turkey");
        })
        .catch(() => {
          // Geocoding başarısız → koordinata göre yükle
          setLocation(`<i class="fas fa-location-dot me-1"></i>Konum alındı`);
          loadDataByCoords(lat, lon);
        });
    },
    err => {
      setLocation(`<i class="fas fa-exclamation-triangle me-1"></i>Konum izni yok — İstanbul gösteriliyor.`);
      loadData("Istanbul", "Turkey");
    },
    { timeout: 10000 }
  );
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

function loadData(city, country) {
  prayerData = null;

  // Günlük vakit
  fetchJSON(
    `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=13`,
    d => {
      prayerData = d.data.timings;
      updateDailyUI(prayerData);
      restartCountdown();
      setLocation(`<i class="fas fa-map-marker-alt me-1"></i>${city}`);
    },
    () => showError("Günlük vakit alınamadı.")
  );

  // Aylık takvim
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
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(onSuccess)
    .catch(onError);
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

/* ─── COUNTDOWN ─────────────────────────────────────────── */

function restartCountdown() {
  if (countdownId) clearInterval(countdownId); // eski interval'ı temizle
  if (!prayerData) return;

  const cdEl = document.getElementById("countdown");
  const pgEl = document.getElementById("iftarProgress");

  function tick() {
    const n = new Date();
    const iftar = parseTime(prayerData.Maghrib);
    const imsak = parseTime(prayerData.Fajr);

    if (n >= iftar) {
      cdEl.innerHTML = "<span class='text-gold animate-pulse'>🌙 İFTAR VAKTİ GELDİ!</span>";
      pgEl.style.width = "100%";
      clearInterval(countdownId);
      return;
    }

    const diff = iftar - n;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    cdEl.innerText = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;

    const total = iftar - imsak;
    const elapsed = n - imsak;
    pgEl.style.width = `${Math.min(100, Math.max(0, (elapsed / total) * 100))}%`;
  }

  countdownId = setInterval(tick, 1000);
  tick();
}

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
  loadData(city, "Turkey");
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

function setLocation(html) { document.getElementById("locationText").innerHTML = html; }
function showError(msg) { document.getElementById("countdown").innerText = msg; }
function showTableLoading() {
  document.getElementById("imsakiyeBody").innerHTML =
    `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Yükleniyor...</td></tr>`;
}
function showTableError(msg) {
  document.getElementById("imsakiyeBody").innerHTML =
    `<tr><td colspan="7" class="text-center text-danger py-3"><i class="fas fa-exclamation-triangle me-2"></i>${msg}</td></tr>`;
}
