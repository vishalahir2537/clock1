/* =====================================================================
 * CHRONOHUB COMPREHENSIVE CONTROLLER
 * ===================================================================== */

// ---------------------------------------------------------------------
// 1. STATE MANAGEMENT
// ---------------------------------------------------------------------
const state = {
  currentPage: 'home',
  clock: {
    is24Hour: false,
    showSeconds: true,
    blinkColons: true,
    theme: 'cyan',
    isFullscreen: false
  },
  worldClock: {
    cities: [
      { name: 'New York', country: 'USA', tz: 'America/New_York' },
      { name: 'London', country: 'United Kingdom', tz: 'Europe/London' },
      { name: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
      { name: 'New Delhi', country: 'India', tz: 'Asia/Kolkata' },
      { name: 'Sydney', country: 'Australia', tz: 'Australia/Sydney' },
      { name: 'Dubai', country: 'UAE', tz: 'Asia/Dubai' },
      { name: 'Paris', country: 'France', tz: 'Europe/Paris' }
    ]
  },
  stopwatch: {
    startTime: 0,
    elapsedTime: 0,
    timerInterval: null,
    isRunning: false,
    laps: []
  },
  timer: {
    totalSeconds: 0,
    remainingSeconds: 0,
    timerInterval: null,
    isRunning: false
  },
  calendar: {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDateStr: null,
    notes: {}
  }
};

// Safe LocalStorage Loading
try {
  const savedNotes = localStorage.getItem('chronohub_calendar_notes');
  if (savedNotes) {
    state.calendar.notes = JSON.parse(savedNotes);
  }
} catch (e) {
  console.warn('LocalStorage error:', e);
}

// ---------------------------------------------------------------------
// 2. WEB AUDIO SYNTHESIZER
// ---------------------------------------------------------------------
const AudioService = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playChime(type = 'alarm') {
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'alarm') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.15);
        osc.frequency.setValueAtTime(1174.66, now + 0.3);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.start(now);
        osc.stop(now + 0.95);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (err) {
      console.warn('Web Audio warning:', err);
    }
  }
};

// ---------------------------------------------------------------------
// 3. TOAST NOTIFICATIONS
// ---------------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  
  const bgColors = {
    info: 'bg-indigo-600 text-white',
    success: 'bg-emerald-600 text-white',
    warn: 'bg-amber-600 text-white',
    rose: 'bg-rose-600 text-white'
  };

  toast.className = `px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg ${bgColors[type] || bgColors.info} flex items-center gap-2 transform transition-all duration-300 opacity-0 translate-y-2 pointer-events-auto`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info text-xs"></i> <span>${message}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('opacity-0', 'translate-y-2'), 20);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---------------------------------------------------------------------
// 4. NAVIGATION & VIEW SWITCHING
// ---------------------------------------------------------------------
function navTo(pageId) {
  state.currentPage = pageId;

  document.querySelectorAll('.page-view').forEach(view => view.classList.add('hidden'));

  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('data-nav') === pageId) {
      btn.classList.add('text-white', 'bg-indigo-600/30', 'font-semibold');
      btn.classList.remove('text-slate-300');
    } else {
      btn.classList.remove('text-white', 'bg-indigo-600/30', 'font-semibold');
      btn.classList.add('text-slate-300');
    }
  });

  if (pageId === 'world-clock') renderWorldClocks();
  if (pageId === 'calendar') renderCalendar();
}

function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('hidden');
}

// ---------------------------------------------------------------------
// 5. DIGITAL CLOCK MODULE
// ---------------------------------------------------------------------
function updateClock() {
  const now = new Date();

  const navLive = document.getElementById('navLiveClock');
  if (navLive) navLive.innerText = now.toTimeString().split(' ')[0];

  const heroTime = document.getElementById('heroTime');
  const heroDate = document.getElementById('heroDate');
  if (heroTime) {
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    heroTime.innerText = `${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`;
  }
  if (heroDate) {
    heroDate.innerText = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  let hours = now.getHours();
  let period = '';
  if (!state.clock.is24Hour) {
    period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
  }
  
  const minutesStr = String(now.getMinutes()).padStart(2, '0');
  const secondsStr = String(now.getSeconds()).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');

  const elHours = document.getElementById('clockHours');
  const elMinutes = document.getElementById('clockMinutes');
  const elSeconds = document.getElementById('clockSeconds');
  const elPeriod = document.getElementById('clockPeriod');
  const elDay = document.getElementById('clockDayBadge');
  const elDate = document.getElementById('clockDateBadge');
  const elTz = document.getElementById('clockTimezoneBadge');

  if (elHours) elHours.innerText = hoursStr;
  if (elMinutes) elMinutes.innerText = minutesStr;
  if (elSeconds) elSeconds.innerText = secondsStr;
  if (elPeriod) elPeriod.innerText = state.clock.is24Hour ? '' : period;

  if (elDay) elDay.innerText = now.toLocaleDateString(undefined, { weekday: 'long' });
  if (elDate) elDate.innerText = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  if (elTz) {
    try {
      elTz.innerText = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    } catch (e) {
      elTz.innerText = 'Local Time';
    }
  }

  const colon1 = document.getElementById('clockColon1');
  const colon2 = document.getElementById('clockColon2');
  if (colon1 && colon2) {
    if (state.clock.blinkColons) {
      colon1.style.opacity = now.getSeconds() % 2 === 0 ? '1' : '0.2';
      colon2.style.opacity = now.getSeconds() % 2 === 0 ? '1' : '0.2';
    } else {
      colon1.style.opacity = '1';
      colon2.style.opacity = '1';
    }
  }

  const dayProgressPercent = document.getElementById('dayProgressPercent');
  const dayProgressBar = document.getElementById('dayProgressBar');
  if (dayProgressPercent && dayProgressBar) {
    const totalSecInDay = 86400;
    const currentSec = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const pct = ((currentSec / totalSecInDay) * 100).toFixed(1);
    dayProgressPercent.innerText = `${pct}%`;
    dayProgressBar.style.width = `${pct}%`;
  }
}

function toggleClockFormat() {
  state.clock.is24Hour = !state.clock.is24Hour;
  document.getElementById('clockFormatLabel').innerText = state.clock.is24Hour ? '24-Hour' : '12-Hour';
  updateClock();
}

function toggleSecondsDisplay() {
  state.clock.showSeconds = !state.clock.showSeconds;
  const secWrapper = document.getElementById('clockSecondsWrapper');
  const secLabel = document.getElementById('clockSecondsLabel');
  
  if (state.clock.showSeconds) {
    secWrapper.style.display = 'flex';
    secLabel.innerText = 'ON';
  } else {
    secWrapper.style.display = 'none';
    secLabel.innerText = 'OFF';
  }
}

function toggleBlinkingColons() {
  state.clock.blinkColons = !state.clock.blinkColons;
  document.getElementById('clockBlinkLabel').innerText = state.clock.blinkColons ? 'ON' : 'OFF';
}

function setClockTheme(themeKey) {
  state.clock.theme = themeKey;
  const hours = document.getElementById('clockHours');
  const mins = document.getElementById('clockMinutes');
  const secs = document.getElementById('clockSeconds');
  const c1 = document.getElementById('clockColon1');
  const c2 = document.getElementById('clockColon2');
  const aura = document.getElementById('clockAura');

  const themeMap = {
    cyan: { textClass: 'text-cyan-400', aura: 'bg-cyan-500/10' },
    indigo: { textClass: 'text-indigo-400', aura: 'bg-indigo-500/15' },
    emerald: { textClass: 'text-emerald-400', aura: 'bg-emerald-500/15' },
    rose: { textClass: 'text-rose-400', aura: 'bg-rose-500/15' },
    amber: { textClass: 'text-amber-400', aura: 'bg-amber-500/15' }
  };

  const selected = themeMap[themeKey] || themeMap.cyan;

  [hours, mins, secs, c1, c2].forEach(el => {
    el.className = el.className.replace(/text-[a-z]+-[0-9]+/g, selected.textClass);
  });
  aura.className = `absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl pointer-events-none transition-colors ${selected.aura}`;
  showToast(`Theme changed to ${themeKey.toUpperCase()}`, 'info');
}

function toggleFullscreenClock() {
  const container = document.getElementById('digitalClockContainer');
  const exitBtn = document.getElementById('exitFsBtn');
  state.clock.isFullscreen = !state.clock.isFullscreen;

  if (state.clock.isFullscreen) {
    container.classList.add('is-fullscreen');
    exitBtn.classList.remove('hidden');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } else {
    container.classList.remove('is-fullscreen');
    exitBtn.classList.add('hidden');
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.clock.isFullscreen) {
    toggleFullscreenClock();
  }
});

// ---------------------------------------------------------------------
// 6. WORLD CLOCK MODULE (DYNAMIC ACCURATE TIMEZONES)
// ---------------------------------------------------------------------
function renderWorldClocks() {
  const grid = document.getElementById('worldCitiesGrid');
  if (!grid) return;

  const now = new Date();
  grid.innerHTML = '';

  state.worldClock.cities.forEach((city, index) => {
    try {
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: city.tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: !state.clock.is24Hour
      });

      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: city.tz,
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      const cityTimeStr = timeFormatter.format(now);
      const cityDateStr = dateFormatter.format(now);

      const localEpoch = now.getTime();
      const targetStr = now.toLocaleString('en-US', { timeZone: city.tz });
      const targetEpoch = new Date(targetStr).getTime();
      const diffHours = Math.round((targetEpoch - localEpoch) / (1000 * 60 * 60));

      let diffLabel = 'Same time as local';
      if (diffHours > 0) diffLabel = `${diffHours}h ahead of you`;
      else if (diffHours < 0) diffLabel = `${Math.abs(diffHours)}h behind you`;

      const card = document.createElement('div');
      card.className = 'relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-md group';
      card.innerHTML = `
        <div class="flex items-start justify-between mb-3">
          <div>
            <h4 class="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">${city.name}</h4>
            <p class="text-xs text-slate-400 font-medium">${city.country} • <span class="text-slate-500 font-mono">${city.tz}</span></p>
          </div>
          <button onclick="removeWorldCity(${index})" class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-all text-xs" title="Remove City">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>

        <div class="my-3">
          <div class="text-3xl font-mono font-extrabold text-cyan-300">${cityTimeStr}</div>
          <div class="text-xs text-slate-400 mt-1 font-medium">${cityDateStr}</div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span class="inline-flex items-center gap-1.5">
            <i class="fa-solid fa-clock-rotate-left text-slate-500"></i> ${diffLabel}
          </span>
          <span class="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-cyan-400">LIVE</span>
        </div>
      `;
      grid.appendChild(card);
    } catch (err) {
      console.error('Error rendering timezone for', city.name, err);
    }
  });
}

function addSelectedCity() {
  const select = document.getElementById('worldCitySelect');
  const val = select.value;
  if (!val) {
    showToast('Please select a city from the list', 'warn');
    return;
  }
  const [tz, name, country] = val.split('|');

  const exists = state.worldClock.cities.some(c => c.tz === tz);
  if (exists) {
    showToast(`${name} is already in your list`, 'info');
    return;
  }

  state.worldClock.cities.push({ name, country, tz });
  renderWorldClocks();
  showToast(`Added ${name} to World Clock`, 'success');
  select.value = '';
}

function removeWorldCity(index) {
  const removed = state.worldClock.cities.splice(index, 1);
  renderWorldClocks();
  if (removed.length > 0) showToast(`Removed ${removed[0].name}`, 'info');
}

// ---------------------------------------------------------------------
// 7. PRECISION STOPWATCH MODULE (WITH ACCURATE LAP RECORDING)
// ---------------------------------------------------------------------
function formatStopwatchTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const millis = Math.floor((ms % 1000) / 10);

  return {
    m: String(minutes).padStart(2, '0'),
    s: String(seconds).padStart(2, '0'),
    ms: String(millis).padStart(2, '0')
  };
}

function updateStopwatchDisplay() {
  const currentElapsed = state.stopwatch.elapsedTime + (state.stopwatch.isRunning ? (Date.now() - state.stopwatch.startTime) : 0);
  const formatted = formatStopwatchTime(currentElapsed);

  const elMin = document.getElementById('swMinutes');
  const elSec = document.getElementById('swSeconds');
  const elMs = document.getElementById('swMillis');

  if (elMin) elMin.innerText = formatted.m;
  if (elSec) elSec.innerText = formatted.s;
  if (elMs) elMs.innerText = formatted.ms;
}

function startStopwatch() {
  if (state.stopwatch.isRunning) return;
  AudioService.playChime('click');

  state.stopwatch.isRunning = true;
  state.stopwatch.startTime = Date.now();
  
  state.stopwatch.timerInterval = setInterval(updateStopwatchDisplay, 10);

  const startBtn = document.getElementById('swStartBtn');
  const pauseBtn = document.getElementById('swPauseBtn');
  const lapBtn = document.getElementById('swLapBtn');

  if (startBtn) startBtn.classList.add('hidden');
  if (pauseBtn) pauseBtn.classList.remove('hidden');
  if (lapBtn) {
    lapBtn.disabled = false;
    lapBtn.removeAttribute('disabled');
  }
}

function pauseStopwatch() {
  if (!state.stopwatch.isRunning) return;
  AudioService.playChime('click');

  clearInterval(state.stopwatch.timerInterval);
  state.stopwatch.elapsedTime += (Date.now() - state.stopwatch.startTime);
  state.stopwatch.isRunning = false;

  const startBtn = document.getElementById('swStartBtn');
  const pauseBtn = document.getElementById('swPauseBtn');
  const lapBtn = document.getElementById('swLapBtn');

  if (startBtn) startBtn.classList.remove('hidden');
  if (pauseBtn) pauseBtn.classList.add('hidden');
  if (lapBtn) {
    lapBtn.disabled = true;
    lapBtn.setAttribute('disabled', 'true');
  }
}

function resetStopwatch() {
  AudioService.playChime('click');
  clearInterval(state.stopwatch.timerInterval);
  state.stopwatch.isRunning = false;
  state.stopwatch.elapsedTime = 0;
  state.stopwatch.startTime = 0;
  state.stopwatch.laps = [];

  updateStopwatchDisplay();
  renderLapsTable();

  const startBtn = document.getElementById('swStartBtn');
  const pauseBtn = document.getElementById('swPauseBtn');
  const lapBtn = document.getElementById('swLapBtn');

  if (startBtn) startBtn.classList.remove('hidden');
  if (pauseBtn) pauseBtn.classList.add('hidden');
  if (lapBtn) {
    lapBtn.disabled = true;
    lapBtn.setAttribute('disabled', 'true');
  }
}

function recordLap() {
  if (!state.stopwatch.isRunning) return;
  AudioService.playChime('click');

  const totalMs = state.stopwatch.elapsedTime + (Date.now() - state.stopwatch.startTime);
  const prevTotalMs = state.stopwatch.laps.length > 0 ? state.stopwatch.laps[0].totalMs : 0;
  const splitMs = totalMs - prevTotalMs;

  const lapData = {
    lapIndex: state.stopwatch.laps.length + 1,
    splitMs: splitMs,
    totalMs: totalMs
  };

  state.stopwatch.laps.unshift(lapData);
  renderLapsTable();
}

function renderLapsTable() {
  const tbody = document.getElementById('lapsTableBody');
  const badge = document.getElementById('lapCountBadge');
  if (badge) badge.innerText = state.stopwatch.laps.length;

  if (!tbody) return;

  if (state.stopwatch.laps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-slate-500 font-sans">No lap intervals recorded yet. Press "Lap" while running to track splits.</td></tr>`;
    return;
  }

  let minSplit = Infinity;
  let maxSplit = -Infinity;

  if (state.stopwatch.laps.length > 1) {
    state.stopwatch.laps.forEach(l => {
      if (l.splitMs < minSplit) minSplit = l.splitMs;
      if (l.splitMs > maxSplit) maxSplit = l.splitMs;
    });
  }

  tbody.innerHTML = state.stopwatch.laps.map(lap => {
    const splitF = formatStopwatchTime(lap.splitMs);
    const totalF = formatStopwatchTime(lap.totalMs);

    let remark = `<span class="text-slate-500">-</span>`;
    let rowClass = 'hover:bg-slate-800/40';

    if (state.stopwatch.laps.length > 1) {
      if (lap.splitMs === minSplit) {
        remark = `<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-sans font-semibold text-[10px]">FASTEST</span>`;
        rowClass = 'bg-emerald-950/20 hover:bg-emerald-900/30';
      } else if (lap.splitMs === maxSplit) {
        remark = `<span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-sans font-semibold text-[10px]">SLOWEST</span>`;
        rowClass = 'bg-rose-950/20 hover:bg-rose-900/30';
      }
    }

    return `
      <tr class="${rowClass} transition-colors">
        <td class="py-2.5 px-4 font-bold text-slate-200">#${String(lap.lapIndex).padStart(2, '0')}</td>
        <td class="py-2.5 px-4 text-emerald-400">${splitF.m}:${splitF.s}.${splitF.ms}</td>
        <td class="py-2.5 px-4 text-slate-300">${totalF.m}:${totalF.s}.${totalF.ms}</td>
        <td class="py-2.5 px-4 text-right">${remark}</td>
      </tr>
    `;
  }).join('');
}

function clearLapsList() {
  state.stopwatch.laps = [];
  renderLapsTable();
  showToast('Laps cleared', 'info');
}

function exportLapsData() {
  if (state.stopwatch.laps.length === 0) {
    showToast('No laps to export', 'warn');
    return;
  }
  let csv = 'Lap,Split,Total\n';
  state.stopwatch.laps.slice().reverse().forEach(l => {
    const s = formatStopwatchTime(l.splitMs);
    const t = formatStopwatchTime(l.totalMs);
    csv += `${l.lapIndex},${s.m}:${s.s}.${s.ms},${t.m}:${t.s}.${t.ms}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ChronoHub_Laps_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Laps exported successfully as CSV', 'success');
}

// ---------------------------------------------------------------------
// 8. COUNTDOWN TIMER MODULE (LIVE SYNCED MANUAL INPUTS)
// ---------------------------------------------------------------------
function syncTimerFromInputs() {
  if (state.timer.isRunning) return;
  const h = parseInt(document.getElementById('inputTimerHours').value) || 0;
  const m = parseInt(document.getElementById('inputTimerMinutes').value) || 0;
  const s = parseInt(document.getElementById('inputTimerSeconds').value) || 0;
  const total = (h * 3600) + (m * 60) + s;

  state.timer.totalSeconds = total;
  state.timer.remainingSeconds = total;
  updateTimerUI();
}

['inputTimerHours', 'inputTimerMinutes', 'inputTimerSeconds'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', syncTimerFromInputs);
});

function updateTimerUI() {
  const hours = Math.floor(state.timer.remainingSeconds / 3600);
  const minutes = Math.floor((state.timer.remainingSeconds % 3600) / 60);
  const seconds = state.timer.remainingSeconds % 60;

  document.getElementById('timerDisplay').innerText = 
    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const ring = document.getElementById('timerProgressRing');
  const circumference = 276.46;
  if (state.timer.totalSeconds > 0) {
    const ratio = state.timer.remainingSeconds / state.timer.totalSeconds;
    ring.style.strokeDashoffset = circumference * (1 - ratio);
  } else {
    ring.style.strokeDashoffset = 0;
  }
}

function setTimerPreset(seconds) {
  if (state.timer.isRunning) pauseTimer();
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  document.getElementById('inputTimerHours').value = h;
  document.getElementById('inputTimerMinutes').value = m;
  document.getElementById('inputTimerSeconds').value = s;

  state.timer.totalSeconds = seconds;
  state.timer.remainingSeconds = seconds;
  document.getElementById('timerStatusLabel').innerText = 'Ready';
  updateTimerUI();
}

function startTimer() {
  if (state.timer.isRunning) return;

  const h = parseInt(document.getElementById('inputTimerHours').value) || 0;
  const m = parseInt(document.getElementById('inputTimerMinutes').value) || 0;
  const s = parseInt(document.getElementById('inputTimerSeconds').value) || 0;
  const calcSec = (h * 3600) + (m * 60) + s;

  if (calcSec <= 0) {
    showToast('Please enter hours, minutes, or seconds first', 'warn');
    return;
  }

  if (state.timer.remainingSeconds <= 0 || state.timer.remainingSeconds !== calcSec) {
    state.timer.totalSeconds = calcSec;
    state.timer.remainingSeconds = calcSec;
  }

  AudioService.playChime('click');
  state.timer.isRunning = true;
  document.getElementById('timerStatusLabel').innerText = 'Running';
  document.getElementById('timerStartBtn').classList.add('hidden');
  document.getElementById('timerPauseBtn').classList.remove('hidden');

  state.timer.timerInterval = setInterval(() => {
    if (state.timer.remainingSeconds > 0) {
      state.timer.remainingSeconds--;
      updateTimerUI();
    } else {
      clearInterval(state.timer.timerInterval);
      state.timer.isRunning = false;
      document.getElementById('timerStatusLabel').innerText = 'Time Up!';
      document.getElementById('timerStartBtn').classList.remove('hidden');
      document.getElementById('timerPauseBtn').classList.add('hidden');
      
      AudioService.playChime('alarm');
      showToast('Timer Finished!', 'rose');
    }
  }, 1000);

  updateTimerUI();
}

function pauseTimer() {
  if (!state.timer.isRunning) return;
  AudioService.playChime('click');

  clearInterval(state.timer.timerInterval);
  state.timer.isRunning = false;

  document.getElementById('timerStatusLabel').innerText = 'Paused';
  document.getElementById('timerStartBtn').classList.remove('hidden');
  document.getElementById('timerPauseBtn').classList.add('hidden');
}

function resetTimer() {
  AudioService.playChime('click');
  clearInterval(state.timer.timerInterval);
  state.timer.isRunning = false;

  document.getElementById('inputTimerHours').value = 0;
  document.getElementById('inputTimerMinutes').value = 0;
  document.getElementById('inputTimerSeconds').value = 0;

  state.timer.totalSeconds = 0;
  state.timer.remainingSeconds = 0;

  document.getElementById('timerStatusLabel').innerText = 'Set Time';
  document.getElementById('timerStartBtn').classList.remove('hidden');
  document.getElementById('timerPauseBtn').classList.add('hidden');

  updateTimerUI();
}

// ---------------------------------------------------------------------
// 9. CALENDAR & PERSISTENT NOTES MODULE
// ---------------------------------------------------------------------
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function changeCalendarMonth(delta) {
  state.calendar.currentMonth += delta;
  if (state.calendar.currentMonth < 0) {
    state.calendar.currentMonth = 11;
    state.calendar.currentYear--;
  } else if (state.calendar.currentMonth > 11) {
    state.calendar.currentMonth = 0;
    state.calendar.currentYear++;
  }
  renderCalendar();
}

function jumpToCalendarToday() {
  const today = new Date();
  state.calendar.currentMonth = today.getMonth();
  state.calendar.currentYear = today.getFullYear();
  selectCalendarDate(today.getFullYear(), today.getMonth(), today.getDate());
  renderCalendar();
}

function renderCalendar() {
  const year = state.calendar.currentYear;
  const month = state.calendar.currentMonth;

  document.getElementById('calendarMonthYear').innerText = `${MONTH_NAMES[month]} ${year}`;

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = document.getElementById('calendarDaysGrid');
  grid.innerHTML = '';

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  for (let i = 0; i < firstDayOfMonth; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'h-12 sm:h-14 rounded-xl bg-slate-900/20 border border-transparent';
    grid.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = isCurrentMonth && today.getDate() === day;
    const isSelected = state.calendar.selectedDateStr === dateKey;
    const hasNotes = state.calendar.notes[dateKey] && state.calendar.notes[dateKey].length > 0;

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.onclick = () => selectCalendarDate(year, month, day);

    let cellClasses = 'h-12 sm:h-14 rounded-xl flex flex-col items-center justify-center relative font-mono text-xs sm:text-sm transition-all border ';

    if (isSelected) {
      cellClasses += 'bg-indigo-600 text-white font-bold border-indigo-400 shadow-md shadow-indigo-600/30 scale-105';
    } else if (isToday) {
      cellClasses += 'bg-slate-800 text-indigo-400 font-bold border-indigo-500/60 hover:bg-slate-700';
    } else {
      cellClasses += 'bg-slate-900/50 text-slate-300 hover:bg-slate-800/80 border-slate-800';
    }

    cell.className = cellClasses;
    cell.innerHTML = `
      <span>${day}</span>
      ${hasNotes ? `<span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-rose-400'} mt-1"></span>` : ''}
    `;

    grid.appendChild(cell);
  }

  if (!state.calendar.selectedDateStr) {
    selectCalendarDate(today.getFullYear(), today.getMonth(), today.getDate());
  }
}

function selectCalendarDate(year, month, day) {
  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  state.calendar.selectedDateStr = dateKey;

  const dateObj = new Date(year, month, day);
  document.getElementById('selectedDateHeader').innerText = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  document.getElementById('selectedDateBadge').innerText = dateKey;

  renderSelectedDateNotes();
  renderCalendar();
}

function renderSelectedDateNotes() {
  const container = document.getElementById('dateNotesContainer');
  const dateKey = state.calendar.selectedDateStr;
  const notes = state.calendar.notes[dateKey] || [];

  if (notes.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-slate-500 text-xs">
        <i class="fa-regular fa-clipboard text-xl mb-2 text-slate-600 block"></i>
        No reminders scheduled for this date.
      </div>
    `;
    return;
  }

  container.innerHTML = notes.map((note, idx) => `
    <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-2 text-xs">
      <div class="flex items-start gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></span>
        <span class="text-slate-200 leading-relaxed">${escapeHtml(note)}</span>
      </div>
      <button onclick="deleteNote(${idx})" class="text-slate-500 hover:text-rose-400 p-1 transition-colors" title="Delete Note">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

function saveNoteForSelectedDate() {
  const input = document.getElementById('newNoteInput');
  const text = input.value.trim();
  if (!text) {
    showToast('Please type a reminder note before adding', 'warn');
    return;
  }

  const dateKey = state.calendar.selectedDateStr;
  if (!state.calendar.notes[dateKey]) state.calendar.notes[dateKey] = [];

  state.calendar.notes[dateKey].push(text);
  input.value = '';

  try {
    localStorage.setItem('chronohub_calendar_notes', JSON.stringify(state.calendar.notes));
  } catch (e) {}

  AudioService.playChime('click');
  renderSelectedDateNotes();
  renderCalendar();
  showToast('Reminder saved', 'success');
}

function deleteNote(index) {
  const dateKey = state.calendar.selectedDateStr;
  if (state.calendar.notes[dateKey]) {
    state.calendar.notes[dateKey].splice(index, 1);
    if (state.calendar.notes[dateKey].length === 0) {
      delete state.calendar.notes[dateKey];
    }
    try {
      localStorage.setItem('chronohub_calendar_notes', JSON.stringify(state.calendar.notes));
    } catch (e) {}
    
    renderSelectedDateNotes();
    renderCalendar();
    showToast('Reminder deleted', 'info');
  }
}

function escapeHtml(string) {
  const div = document.createElement('div');
  div.innerText = string;
  return div.innerHTML;
}

// ---------------------------------------------------------------------
// 10. APP INITIALIZATION
// ---------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(() => {
    updateClock();
    if (state.currentPage === 'world-clock') {
      renderWorldClocks();
    }
  }, 1000);

  updateTimerUI();
  jumpToCalendarToday();
  renderWorldClocks();

  navTo('home');
});