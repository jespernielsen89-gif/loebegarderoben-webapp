// === CONFIGURATION ===
// Indsæt dine Supabase-oplysninger fra Step 1 herunder
const SUPABASE_URL = "https://DIN_PROJECT_URL.supabase.co";
const SUPABASE_ANON_KEY = "DIN_ANON_PUBLIC_KEY";

// Initialisér Supabase-klienten (hvis nøglerne er indsat)
let supabase = null;
if (SUPABASE_URL.includes("supabase.co")) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// === ELEMENTS ===
const btnLocation = document.getElementById('btn-location');
const btnScan = document.getElementById('btn-scan');
const cameraInput = document.getElementById('camera-input');
const weatherInfo = document.getElementById('weather-info');
const outfitBox = document.getElementById('outfit-recommendation');
const scanStatus = document.getElementById('scan-status');

// === 1. LOKALT VEJR VIA OPEN-METEO API ===
btnLocation.addEventListener('click', () => {
  if (navigator.geolocation) {
    btnLocation.innerText = "Søger placering...";
    navigator.geolocation.getCurrentPosition(fetchWeather, (err) => {
      alert("Kunne ikke hente placering. Tjek tilladelser i browseren.");
      btnLocation.innerText = "📍 Brug min GPS til vejr";
    });
  } else {
    alert("GPS understøttes ikke af din browser.");
  }
});

async function fetchWeather(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,wind_speed_10m&timezone=auto`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const current = data.current;

    document.getElementById('temp').innerText = Math.round(current.temperature_2m);
    document.getElementById('feels-like').innerText = Math.round(current.apparent_temperature);
    document.getElementById('wind').innerText = Math.round(current.wind_speed_10m);

    weatherInfo.classList.remove('hidden');
    btnLocation.innerText = "🔄 Opdater vejr";

    generateOutfitMatch(current.apparent_temperature);
  } catch (err) {
    console.error("Fejl ved hentning af vejr:", err);
  }
}

// === 2. SIMPEL OUTFIT MATCHING LOGIK ===
function generateOutfitMatch(feelsLikeTemp) {
  const outfitList = document.getElementById('outfit-list');
  outfitList.innerHTML = '';

  let items = [];
  if (feelsLikeTemp < 5) {
    items = ["Lange Tights (Vinter)", "Langærmet Uldtrøje", "Vindtæt Løbejakke", "Handsker & Pandelampe"];
  } else if (feelsLikeTemp < 12) {
    items = ["Lange Tights (Mellem)", "Langærmet Løbetrøje", "Vindvest"];
  } else {
    items = ["Korte Tights / Shorts", "Kortærmet T-shirt / Singlet"];
  }

  items.forEach(item => {
    const li = document.createElement('li');
    li.innerText = item;
    outfitList.appendChild(li);
  });

  outfitBox.classList.remove('hidden');
}

// === 3. AI CAMERA SCANNER TRIGGER ===
btnScan.addEventListener('click', () => {
  cameraInput.click();
});

cameraInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  scanStatus.innerText = "⏳ Analyserer tøj med AI...";

  // Simulering af AI-skanning (Kobl OpenAI API Call på her senere)
  setTimeout(() => {
    scanStatus.innerText = "✅ Tøj analyseret: 'Nike Dri-FIT Langærmet' er gemt i dit klædeskab!";
  }, 2000);
});
