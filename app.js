// === CONFIGURATION ===
const SUPABASE_URL = "https://quxjukgjwvsuismbfaof.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__8-ZIhx5r9eKFwblICJyNQ_Fexy6WA4";
const OPENAI_API_KEY = "INDSÆT_DIN_OPENAI_API_KEY_HER"; // f.eks. sk-proj-...

// Initialisér Supabase-klienten (med nyt navn for at undgå navnekonflikt)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === ELEMENTS ===
const btnLocation = document.getElementById('btn-location');
const btnScan = document.getElementById('btn-scan');
const cameraInput = document.getElementById('camera-input');
const weatherInfo = document.getElementById('weather-info');
const outfitBox = document.getElementById('outfit-recommendation');
const scanStatus = document.getElementById('scan-status');
const wardrobeList = document.getElementById('wardrobe-list');

// Hent klædeskab ved opstart
document.addEventListener('DOMContentLoaded', loadWardrobe);

// === 1. HENT KLÆDESKAB FRA SUPABASE ===
async function loadWardrobe() {
  wardrobeList.innerHTML = '<p class="empty-msg">Henter tøj...</p>';
  
  const { data, error } = await supabaseClient
    .from('user_wardrobe')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fejl ved hentning af klædeskab:", error);
    wardrobeList.innerHTML = '<p class="empty-msg">Kunne ikke hente tøj. Tjek Supabase-nøgler.</p>';
    return;
  }

  if (!data || data.length === 0) {
    wardrobeList.innerHTML = '<p class="empty-msg">Dit klædeskab er tomt. Scan dit første stykke tøj!</p>';
    return;
  }

  wardrobeList.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'wardrobe-item';
    card.innerHTML = `
      <strong>${item.brand}</strong><br>
      <small>${item.sub_category || item.category}</small><br>
      <span>Varme: ${'🔥'.repeat(item.warmth_level || 1)}</span>
    `;
    wardrobeList.appendChild(card);
  });
}

// === 2. LOKALT VEJR VIA OPEN-METEO API ===
btnLocation.addEventListener('click', () => {
  if (navigator.geolocation) {
    btnLocation.innerText = "Søger placering...";
    navigator.geolocation.getCurrentPosition(fetchWeather, (err) => {
      alert("Kunne ikke hente placering. Tjek at GPS/placering er tilladt i browseren.");
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

// === 3. OUTFIT MATCHING LOGIK ===
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

// === 4. AI CAMERA SCANNER (OPENAI GPT-4o VISION) ===
btnScan.addEventListener('click', () => {
  cameraInput.click();
});

cameraInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  scanStatus.innerText = "⏳ Analyserer tøj med AI...";

  try {
    const base64Image = await convertToBase64(file);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analysér dette løbetøj og returnér KUN et gyldigt JSON-objekt uden markdown-formatering med felterne: brand, category (overdel/underdel/tilbehoer), subCategory (f.eks. T-shirt, Jakke, Tights), warmthLevel (tal 1-5), windproof (true/false), visibilityReflective (true/false)."
              },
              {
                type: "image_url",
                image_url": { url: base64Image }
              }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    const aiData = await response.json();
    const rawContent = aiData.choices[0].message.content.trim().replace(/```json|```/g, "");
    const parsedItem = JSON.parse(rawContent);

    scanStatus.innerText = `✅ AI fandt: ${parsedItem.brand} (${parsedItem.subCategory}). Gemmer...`;

    const { error } = await supabaseClient.from('user_wardrobe').insert([{
      brand: parsedItem.brand || "Ukendt",
      category: parsedItem.category || "overdel",
      sub_category: parsedItem.subCategory || "Løbetøj",
      warmth_level: parsedItem.warmthLevel || 3,
      windproof: parsedItem.windproof || false,
      visibility_reflective: parsedItem.visibilityReflective || false
    }]);

    if (error) throw error;

    scanStatus.innerText = `🎉 Gemt! ${parsedItem.brand} ligger nu i dit klædeskab.`;
    loadWardrobe();

  } catched (err) { // corrected below to catch
