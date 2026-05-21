/**
 * Global Weather Intelligence Dashboard
 * Module 2: Weather Cards UI Enhancement
 * script.js — Front-end logic
 */

// ─── DOM References ──────────────────────────────────────────
const cityInput        = document.getElementById('city-input');
const searchBtn        = document.getElementById('search-btn');
const locBtn           = document.getElementById('loc-btn');
const loadingEl        = document.getElementById('loading');
const loadingMsg       = document.getElementById('loading-msg');
const errorBox         = document.getElementById('error-box');
const errorMessageEl   = document.getElementById('error-message');
const errorRetryBtn    = document.getElementById('error-retry-btn');
const weatherCard      = document.getElementById('weather-card');
const forecastSection  = document.getElementById('forecast-section');
const forecastGrid     = document.getElementById('forecast-grid');
const analyticsSection = document.getElementById('analytics-section');
const welcomeState     = document.getElementById('welcome-state');

// Module 8 References
const alertsSection    = document.getElementById('alerts-section');
const alertsContainer  = document.getElementById('alerts-container');

// Unit Toggle Buttons
const unitCBtn         = document.getElementById('unit-c');
const unitFBtn         = document.getElementById('unit-f');

// Module 9 References
const themeSelect      = document.getElementById('theme-select');
const weatherBgFx      = document.getElementById('weather-animations');

// Module 7 References
const favSection       = document.getElementById('favorites-section');
const favList          = document.getElementById('favorites-list');
const favClearBtn      = document.getElementById('fav-clear-btn');
const saveBtn          = document.getElementById('save-btn');

// Card — Zone 1 (location)
const cityNameEl       = document.getElementById('city-name');
const cityCountryEl    = document.getElementById('city-country');
const conditionBadgeEl = document.getElementById('condition-badge');

// Card — Zone 2 (hero)
const weatherIconEl    = document.getElementById('weather-icon');
const tempValueEl      = document.getElementById('temp-value');
const weatherCondEl    = document.getElementById('weather-condition');
const feelsLikeEl      = document.getElementById('feels-like-value');

// Card — Zone 3 (detail grid)
const humidityEl       = document.getElementById('humidity');
const windSpeedEl      = document.getElementById('wind-speed');
const tempRangeEl      = document.getElementById('temp-range');
const visibilityEl     = document.getElementById('visibility');

// ─── State ───────────────────────────────────────────────────
let lastQuery = '';
let tempChartInstance = null;
let humidityChartInstance = null;

// Module 6 Data Cache & Unit State
let currentWeatherData = null;
let currentForecastData = null;
let currentUnit = localStorage.getItem('unit') || 'metric';

// Module 7 State
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Module 9 State
let currentTheme = localStorage.getItem('theme') || 'auto';
if (themeSelect) themeSelect.value = currentTheme;

// Initialize toggle classes on load
if (currentUnit === 'imperial') {
  if (unitCBtn) unitCBtn.classList.remove('active');
  if (unitFBtn) unitFBtn.classList.add('active');
}

// ─── Helpers ─────────────────────────────────────────────────
/**
 * Format a numeric value to 1 decimal place.
 * Returns "N/A" if the value is null / undefined / NaN.
 */
function fmt1(val) {
  if (val == null || isNaN(val)) return 'N/A';
  return Number(val).toFixed(1);
}

/**
 * Module 6: Convert temperature dynamically
 * Assumes backend returns tempC (metric). Returns F if currentUnit === 'imperial'
 */
function convertTemp(tempC) {
  if (tempC == null || isNaN(tempC)) return null;
  if (currentUnit === 'imperial') {
    return (tempC * 9/5) + 32;
  }
  return tempC;
}

/**
 * Return a display string or "N/A" for arbitrary values.
 */
function orNA(val, suffix = '') {
  if (val == null || val === '') return 'N/A';
  return `${val}${suffix}`;
}

/**
 * Animate a numeric value from current to target
 */
function animateValue(obj, start, end, duration) {
  if (start === end) {
    obj.innerHTML = end.toFixed(1);
    return;
  }
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const eased = progress * (2 - progress); // easeOutQuad
    const current = (progress * (end - start) + start).toFixed(1);
    obj.innerHTML = current;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// ─── UI State Helpers ─────────────────────────────────────────
function showLoading() {
  loadingEl.classList.remove('hidden');
  errorBox.classList.add('hidden');
  weatherCard.classList.add('hidden');
  forecastSection.classList.add('hidden');
  analyticsSection.classList.add('hidden');
  alertsSection.classList.add('hidden');
  welcomeState.classList.add('hidden');
  searchBtn.disabled = true;
  if (locBtn) locBtn.disabled = true;
}

function showError(message) {
  errorMessageEl.textContent = message;
  errorBox.classList.remove('hidden');
  loadingEl.classList.add('hidden');
  weatherCard.classList.add('hidden');
  forecastSection.classList.add('hidden');
  analyticsSection.classList.add('hidden');
  alertsSection.classList.add('hidden');
  welcomeState.classList.add('hidden');
  searchBtn.disabled = false;
  if (locBtn) locBtn.disabled = false;
  loadingMsg.textContent = 'Fetching weather data…';
}

function showWeather() {
  weatherCard.classList.remove('hidden');
  forecastSection.classList.remove('hidden');
  analyticsSection.classList.remove('hidden');
  // alertsSection visibility is managed dynamically by analyzeConditions
  loadingEl.classList.add('hidden');
  errorBox.classList.add('hidden');
  welcomeState.classList.add('hidden');
  searchBtn.disabled = false;
  if (locBtn) locBtn.disabled = false;
  loadingMsg.textContent = 'Fetching weather data…';
}

function resetToWelcome() {
  welcomeState.classList.remove('hidden');
  weatherCard.classList.add('hidden');
  forecastSection.classList.add('hidden');
  analyticsSection.classList.add('hidden');
  alertsSection.classList.add('hidden');
  loadingEl.classList.add('hidden');
  errorBox.classList.add('hidden');
}

// ─── Populate Weather Card (Premium) ──────────────────────────
function populateWeatherCard(data) {
  // Update Hero Section
  const targetTemp = convertTemp(data.temp);
  const currentTemp = parseFloat(tempValueEl.innerHTML) || 0;
  
  // Use Animated Numbers for the big Temp
  animateValue(tempValueEl, currentTemp, targetTemp, 800);
  
  cityNameEl.innerHTML = data.name || 'Unknown';
  cityCountryEl.textContent = data.country || '';
  conditionBadgeEl.textContent = data.condition || data.description || '—';
  
  // Weather Condition Text
  weatherCondEl.textContent = data.description || 'N/A';
  
  // Feels Like with icon update
  const sym = currentUnit === 'imperial' ? '°F' : '°C';
  feelsLikeEl.innerHTML = `Feels like <strong>${fmt1(convertTemp(data.feels_like))}</strong>${sym}`;

  // Module 7: Update Save button state
  if (favorites.includes(data.name)) {
    saveBtn.innerHTML = '⭐ Saved';
    saveBtn.classList.add('saved');
  } else {
    saveBtn.innerHTML = '☆ Save City';
    saveBtn.classList.remove('saved');
  }

  // Zone 2 — Icon Hero (Animated Float in CSS)
  const iconUrl = data.icon ? `https://openweathermap.org/img/wn/${data.icon}@4x.png` : '';
  weatherIconEl.src = iconUrl;
  weatherIconEl.alt = data.description || 'Weather';

  // Zone 3 — Detail Grid
  humidityEl.textContent = orNA(data.humidity, '%');

  if (data.wind_speed_kmh != null) {
    windSpeedEl.textContent = `${fmt1(data.wind_speed_kmh)} km/h`;
  } else if (data.wind_speed != null) {
    windSpeedEl.textContent = `${fmt1(data.wind_speed)} m/s`;
  } else {
    windSpeedEl.textContent = 'N/A';
  }

  const hi = data.temp_max != null ? `${fmt1(convertTemp(data.temp_max))}°` : 'N/A';
  const lo = data.temp_min != null ? `${fmt1(convertTemp(data.temp_min))}°` : 'N/A';
  tempRangeEl.textContent = `${hi} / ${lo}`;

  visibilityEl.textContent = data.visibility != null ? `${data.visibility} km` : 'N/A';
}

// ─── Fetch Weather & Forecast ─────────────────────────────────
const API_KEY = '4133c7c5a7c1a95ad08706338bd6fc79';
const r1 = (n) => n != null ? parseFloat(n.toFixed(1)) : null;

async function fetchWeather(city) {
  showLoading();
  lastQuery = city;

  // Render skeletons for forecast while loading
  forecastGrid.innerHTML = `
    <div class="forecast-card skeleton"></div>
    <div class="forecast-card skeleton"></div>
    <div class="forecast-card skeleton"></div>
    <div class="forecast-card skeleton"></div>
    <div class="forecast-card skeleton"></div>
  `;

  try {
    const encodedCity = encodeURIComponent(city);
    
    // Fetch both endpoints concurrently for speed
    const [weatherRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&appid=${API_KEY}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodedCity}&appid=${API_KEY}&units=metric`)
    ]);

    if (!weatherRes.ok) {
      if (weatherRes.status === 404) {
        showError(`City "${city}" not found. Please check the spelling and try again.`);
      } else {
        showError('An unexpected error occurred while fetching weather data.');
      }
      return;
    }

    const rawWeatherData = await weatherRes.json();
    const weatherData = {
      name: rawWeatherData.name,
      country: rawWeatherData.sys.country,
      temp: r1(rawWeatherData.main.temp),
      feels_like: r1(rawWeatherData.main.feels_like),
      temp_min: r1(rawWeatherData.main.temp_min),
      temp_max: r1(rawWeatherData.main.temp_max),
      humidity: rawWeatherData.main.humidity ?? null,
      description: rawWeatherData.weather[0].description,
      condition: rawWeatherData.weather[0].main,
      icon: rawWeatherData.weather[0].icon,
      wind_speed: r1(rawWeatherData.wind?.speed),
      wind_speed_kmh: r1((rawWeatherData.wind?.speed ?? 0) * 3.6),
      visibility: rawWeatherData.visibility ? parseFloat((rawWeatherData.visibility / 1000).toFixed(1)) : null,
      timezone: rawWeatherData.timezone,
      dt: rawWeatherData.dt,
      sys: rawWeatherData.sys
    };

    // Save to globals for cache re-rendering
    currentWeatherData = weatherData;
    
    // Analyze Alerts (Module 8)
    analyzeConditions(weatherData);
    
    // Apply Background/Animations (Module 9)
    applyThemeAndAnimations(weatherData);
    
    // Populate current weather
    populateWeatherCard(weatherData);

    // Populate 5-day forecast & Charts
    if (forecastRes.ok) {
      const rawForecastData = await forecastRes.json();
      const list = rawForecastData.list;
      const forecastData = [];
      const seenDates = new Set();

      for (const item of list) {
        const dateStr = item.dt_txt.split(' ')[0];
        const hourStr = item.dt_txt.split(' ')[1];
        if (!seenDates.has(dateStr)) {
          if (hourStr === '12:00:00' || !list.find(i => i.dt_txt.startsWith(dateStr) && i.dt_txt.includes('12:00:00'))) {
            seenDates.add(dateStr);
            forecastData.push({
              date: dateStr,
              temp: r1(item.main.temp),
              humidity: item.main.humidity,
              wind_speed: r1((item.wind?.speed ?? 0) * 3.6),
              condition: item.weather[0].main,
              description: item.weather[0].description,
              icon: item.weather[0].icon,
            });
            if (forecastData.length === 5) break;
          }
        }
      }
      
      if (forecastData.length > 0) {
        currentForecastData = forecastData;
        renderForecastCards(forecastData);
        renderAnalyticsCharts(forecastData);
      } else {
        currentForecastData = null;
        analyticsSection.classList.add('hidden');
      }
    } else {
        currentForecastData = null;
        analyticsSection.classList.add('hidden');
    }

    showWeather();

  } catch (err) {
    console.error('[Fetch Error]', err);
    showError('Unable to connect to the weather service.');
  }
}

// ─── Render Forecast Cards ────────────────────────────────────
function renderForecastCards(forecastList) {
  forecastGrid.innerHTML = ''; // clear skeletons

  if (forecastList.length === 0) {
    forecastGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--clr-text-muted);">No forecast data available.</p>';
    return;
  }

  // Formatter to get short day name (e.g., "Mon", "Tue")
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

  forecastList.forEach(dayInfo => {
    // Parse "YYYY-MM-DD"
    const [year, month, day] = dayInfo.date.split('-');
    // Date constructor takes local time if passing YYYY, MM-1, DD
    const dateObj = new Date(year, month - 1, day);
    
    // Check if it's today
    const isToday = new Date().toDateString() === dateObj.toDateString();
    const dayName = isToday ? 'Today' : formatter.format(dateObj);

    const iconUrl = dayInfo.icon ? `https://openweathermap.org/img/wn/${dayInfo.icon}@2x.png` : '';
    const temp    = fmt1(convertTemp(dayInfo.temp));
    const cond    = dayInfo.condition || 'N/A';

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <span class="fc-day">${dayName}</span>
      <div class="fc-icon-wrap">
        <img class="fc-icon" src="${iconUrl}" alt="${cond}" />
      </div>
      <span class="fc-temp">${temp}°</span>
      <span class="fc-cond">${cond}</span>
    `;
    forecastGrid.appendChild(card);
  });
}

// ─── Render Analytics Charts (Module 4) ───────────────────────
function renderAnalyticsCharts(forecastList) {
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  
  // Extract data arrays
  const labels = forecastList.map(item => {
    const [year, month, day] = item.date.split('-');
    const dateObj = new Date(year, month - 1, day);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    return isToday ? 'Today' : formatter.format(dateObj);
  });
  
  const tempData = forecastList.map(item => convertTemp(item.temp));
  const humidityData = forecastList.map(item => item.humidity);
  
  const tempSym = currentUnit === 'imperial' ? '°F' : '°C';

  // Common Chart configuration
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

  // Destroy previous instances to prevent canvas re-use artifacts
  if (tempChartInstance) tempChartInstance.destroy();
  if (humidityChartInstance) humidityChartInstance.destroy();

  // 1. Temperature Line Chart
  const ctxTemp = document.getElementById('tempChart').getContext('2d');
  
  // Create beautiful gradient for line chart
  const tempGradient = ctxTemp.createLinearGradient(0, 0, 0, 300);
  tempGradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
  tempGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  tempChartInstance = new Chart(ctxTemp, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Temperature (${tempSym})`,
        data: tempData,
        borderColor: '#38bdf8',
        backgroundColor: tempGradient,
        borderWidth: 3,
        pointBackgroundColor: '#0f172a',
        pointBorderColor: '#38bdf8',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4 // Smooth curves
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 14, weight: 'bold' },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: function(context) { return context.parsed.y + ` ${tempSym}`; }
          }
        }
      },
      scales: {
        y: { 
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          border: { display: false }
        },
        x: { 
          grid: { display: false },
          border: { display: false }
        }
      }
    }
  });

  // 2. Humidity Bar Chart
  const ctxHum = document.getElementById('humidityChart').getContext('2d');
  
  humidityChartInstance = new Chart(ctxHum, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Humidity (%)',
        data: humidityData,
        backgroundColor: 'rgba(45, 212, 191, 0.8)',
        hoverBackgroundColor: '#2dd4bf',
        borderRadius: 6,
        borderWidth: 0,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 14, weight: 'bold' },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: function(context) { return context.parsed.y + '%'; }
          }
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          border: { display: false }
        },
        x: { 
          grid: { display: false },
          border: { display: false }
        }
      }
    }
  });
}

// ─── Weather Alerts (Module 8) ────────────────────────────────
function analyzeConditions(data) {
  const alerts = [];
  
  // Parse variables using raw metric values from backend
  const tempC = data.temp; 
  const windMps = data.wind_speed != null ? data.wind_speed : (data.wind_speed_kmh / 3.6);
  const condition = (data.description || data.condition || '').toLowerCase();
  
  // Evaluate logic
  if (tempC > 35) {
    alerts.push({ type: 'heat', icon: '🔥', msg: 'High temperature warning! Limit outdoor activity and stay hydrated.' });
  }
  if (tempC < 10) {
    alerts.push({ type: 'cold', icon: '❄️', msg: 'Cold temperature warning! Dress warmly and avoid prolonged exposure.' });
  }
  if (windMps > 10) {
    alerts.push({ type: 'wind', icon: '🌬️', msg: 'High wind speed detected. Secure loose objects outdoors.' });
  }
  if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('storm')) {
    alerts.push({ type: 'rain', icon: '🌧️', msg: 'Rain expected. Carry an umbrella and drive safely.' });
  }
  
  // Edge case: No alerts
  if (alerts.length === 0) {
    alerts.push({ type: 'normal', icon: '🟢', msg: 'Weather looks good today!' });
  }
  
  // Render
  alertsContainer.innerHTML = '';
  alerts.forEach((alert, index) => {
    const el = document.createElement('div');
    el.className = `alert-box alert-${alert.type}`;
    // Stagger animation so they drop in sequentially
    el.style.animationDelay = `${index * 0.15}s`;
    
    el.innerHTML = `
      <span class="alert-icon">${alert.icon}</span>
      <span class="alert-msg">${alert.msg}</span>
    `;
    alertsContainer.appendChild(el);
  });
  
  alertsSection.classList.remove('hidden');
}

// ─── Search Handler ───────────────────────────────────────────
function handleSearch() {
  const city = cityInput.value.trim();

  if (!city) {
    cityInput.focus();
    cityInput.classList.add('shake');
    cityInput.addEventListener('animationend', () => cityInput.classList.remove('shake'), { once: true });
    return;
  }

  fetchWeather(city);
}

// ─── Location Handler (Module 5) ──────────────────────────────
async function handleLocation() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser. Please search manually.');
    return;
  }

  showLoading();
  if (loadingMsg) loadingMsg.textContent = 'Fetching your location…';
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        if (loadingMsg) loadingMsg.textContent = 'Fetching weather data…';
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);
        const rawWeatherData = await res.json();
        
        if (!res.ok) {
          showError(rawWeatherData.message || 'Unable to access location weather. Please search manually.');
          return;
        }

        // Use the resolved city name to fetch everything seamlessly 
        const resolvedCity = rawWeatherData.name;
        cityInput.value = resolvedCity;
        fetchWeather(resolvedCity); 
        
      } catch (err) {
        console.error('[Coords API Error]', err);
        showError('Unable to connect to the weather service.');
      }
    },
    (error) => {
      console.error('[Geolocation Error]', error);
      let errorMsg = 'Unable to access location. Please search manually.';
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg = 'Location permission was denied. Please search manually.';
      }
      showError(errorMsg);
    },
    { timeout: 10000 }
  );
}

// ─── Unit Toggle Handler ──────────────────────────────────────
function handleUnitChange(newUnit) {
  if (currentUnit === newUnit) return;
  
  currentUnit = newUnit;
  localStorage.setItem('unit', currentUnit);
  
  // Update button active states
  if (currentUnit === 'imperial') {
    unitCBtn.classList.remove('active');
    unitFBtn.classList.add('active');
  } else {
    unitFBtn.classList.remove('active');
    unitCBtn.classList.add('active');
  }
  
  // Instantly re-render UI if we have locally cached data
  if (currentWeatherData) populateWeatherCard(currentWeatherData);
  if (currentForecastData) {
    renderForecastCards(currentForecastData);
    renderAnalyticsCharts(currentForecastData);
  }
}

// ─── Favorites Handler (Module 7) ─────────────────────────────
function renderFavorites() {
  favList.innerHTML = '';
  
  if (favorites.length === 0) {
    favSection.classList.add('hidden');
    return;
  }
  
  // Always show favorites if there are any
  favSection.classList.remove('hidden');
  
  favorites.forEach(city => {
    const chip = document.createElement('div');
    chip.className = 'fav-chip';
    
    const textNode = document.createElement('span');
    textNode.textContent = city;
    textNode.onclick = () => {
      cityInput.value = city;
      fetchWeather(city);
    };
    
    const delBtn = document.createElement('button');
    delBtn.className = 'fav-del-btn';
    delBtn.innerHTML = '✖';
    delBtn.title = 'Remove';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      favorites = favorites.filter(f => f !== city);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      renderFavorites();
      if (currentWeatherData && currentWeatherData.name === city) {
        populateWeatherCard(currentWeatherData); // sync the save-btn star
      }
    };
    
    chip.appendChild(textNode);
    chip.appendChild(delBtn);
    favList.appendChild(chip);
  });
}

function handleSaveCity() {
  if (!currentWeatherData) return;
  const city = currentWeatherData.name;
  
  if (favorites.includes(city)) {
    // Un-save it
    favorites = favorites.filter(f => f !== city);
  } else {
    // Save it
    if (favorites.length >= 5) favorites.shift(); // Keep max 5
    favorites.push(city);
  }
  
  localStorage.setItem('favorites', JSON.stringify(favorites));
  renderFavorites();
  populateWeatherCard(currentWeatherData); // updates active star state
}

function handleClearFavorites() {
  favorites = [];
  localStorage.setItem('favorites', JSON.stringify([]));
  renderFavorites();
  if (currentWeatherData) populateWeatherCard(currentWeatherData);
}

// ─── Theme & Animations (Module 9) ────────────────────────────
function applyThemeAndAnimations(data) {
  if (!data) return;
  
  // 1. Time / Day/Night Logic
  const dt = data.dt;
  const sys = data.sys || {};
  let isDay = true; 
  
  if (sys.sunrise && sys.sunset) {
    isDay = (dt >= sys.sunrise && dt < sys.sunset);
  }

  // 2. User Theme Override (Light / Dark forcing)
  if (currentTheme === 'light') isDay = true;
  else if (currentTheme === 'dark') isDay = false;
  
  const timeClass = isDay ? 'day' : 'night';
  
  // 3. Weather Condition Class
  // Convert API weather main text (Clear, Clouds, Rain, Snow, Drizzle, Thunderstorm)
  const conditionCode = (data.weather && data.weather[0] && data.weather[0].main) ? data.weather[0].main.toLowerCase() : 'clear';
  
  let weatherClass = 'sunny';
  if (conditionCode.includes('rain') || conditionCode.includes('drizzle') || conditionCode.includes('thunderstorm')) {
    weatherClass = 'rainy';
  } else if (conditionCode.includes('cloud')) {
    weatherClass = 'cloudy';
  } else if (conditionCode.includes('snow')) {
    weatherClass = 'snowy';
  }
  
  // 4. Update Body
  document.body.className = `${weatherClass}-${timeClass}`;
  
  // 5. Spawn Enhanced Particles (Premium)
  weatherBgFx.innerHTML = '';
  
  // Global floating particles for atmosphere
  generateAtmosphere();

  if (weatherClass === 'rainy') generateRain();
  else if (weatherClass === 'snowy') generateSnow();
  else if (weatherClass === 'cloudy') generateClouds();
  else if (weatherClass === 'sunny') generateSunFX();
  
  // Add wind streaks if wind is high
  const windMps = data.wind_speed != null ? data.wind_speed : (data.wind_speed_kmh / 3.6);
  if (windMps > 8) generateWind();
}

function generateAtmosphere() {
  const count = 15;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top = `${Math.random() * 100}vh`;
    el.style.animationDelay = `${Math.random() * 5}s`;
    weatherBgFx.appendChild(el);
  }
}

function generateRain() {
  // Front Layer (Faster, Larger)
  spawnRainDrops(40, 0.4, 0.8, 3, 10);
  // Back Layer (Slower, Smaller, Blurrier)
  spawnRainDrops(60, 0.8, 1.2, 1, 5, 0.4);
}

function spawnRainDrops(count, minDur, maxDur, width, height, opacity = 0.6) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'rain-drop';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.opacity = opacity;
    el.style.animationDuration = `${Math.random() * (maxDur - minDur) + minDur}s`;
    el.style.animationDelay = `${Math.random() * 2}s`;
    weatherBgFx.appendChild(el);
  }
}

function generateSnow() {
  const flakes = 60;
  for (let i = 0; i < flakes; i++) {
    const el = document.createElement('div');
    el.className = 'snow-flake';
    el.style.left = `${Math.random() * 100}vw`;
    const size = `${Math.random() * 4 + 2}px`;
    el.style.width = size;
    el.style.height = size;
    el.style.opacity = Math.random() * 0.5 + 0.3;
    el.style.animationDuration = `${Math.random() * 6 + 4}s`;
    el.style.animationDelay = `${Math.random() * 5}s`;
    weatherBgFx.appendChild(el);
  }
}

function generateClouds() {
  const clouds = 8;
  for (let i = 0; i < clouds; i++) {
    const el = document.createElement('div');
    el.className = 'cloud-part';
    el.style.left = `-${Math.random() * 50 + 20}vw`;
    el.style.top = `${Math.random() * 60}vh`;
    // Triple layered parallax
    const scale = Math.random() * 0.5 + 0.5;
    el.style.width = `${(Math.random() * 300 + 200) * scale}px`;
    el.style.height = `${(Math.random() * 120 + 80) * scale}px`;
    el.style.opacity = Math.random() * 0.1 + 0.05;
    el.style.animationDuration = `${(Math.random() * 40 + 30) / scale}s`;
    el.style.animationDelay = `${Math.random() * -40}s`;
    weatherBgFx.appendChild(el);
  }
}

function generateSunFX() {
  const el = document.createElement('div');
  el.className = 'sun-glow';
  el.style.width = '600px';
  el.style.height = '600px';
  el.style.top = '-200px';
  el.style.left = '5%';
  weatherBgFx.appendChild(el);
}

function generateWind() {
  const lines = 12;
  for (let i = 0; i < lines; i++) {
    const el = document.createElement('div');
    el.className = 'wind-line';
    el.style.top = `${Math.random() * 100}vh`;
    el.style.width = `${Math.random() * 200 + 100}px`;
    el.style.animationDuration = `${Math.random() * 1 + 0.8}s`;
    el.style.animationDelay = `${Math.random() * 4}s`;
    weatherBgFx.appendChild(el);
  }
}

function handleThemeChange(e) {
  currentTheme = e.target.value;
  localStorage.setItem('theme', currentTheme);
  // Re-apply the styles onto the current cached UI
  if (currentWeatherData) {
    applyThemeAndAnimations(currentWeatherData);
  }
}

// ─── Event Listeners ──────────────────────────────────────────
searchBtn.addEventListener('click', handleSearch);
if (locBtn) locBtn.addEventListener('click', handleLocation);
if (unitCBtn) unitCBtn.addEventListener('click', () => handleUnitChange('metric'));
if (unitFBtn) unitFBtn.addEventListener('click', () => handleUnitChange('imperial'));
if (saveBtn) saveBtn.addEventListener('click', handleSaveCity);
if (favClearBtn) favClearBtn.addEventListener('click', handleClearFavorites);
if (themeSelect) themeSelect.addEventListener('change', handleThemeChange);

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

errorRetryBtn.addEventListener('click', () => {
  if (lastQuery) {
    fetchWeather(lastQuery);
  } else {
    resetToWelcome();
    cityInput.focus();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  renderFavorites();
  cityInput.focus();
});
