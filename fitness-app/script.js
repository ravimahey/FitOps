/* ============================================================
   FitOps - Premium Fitness Tracking Dashboard
   Full JavaScript Application Logic
   ============================================================ */

// ============================================================
// LOCAL STORAGE KEYS
// ============================================================
const STORAGE_KEYS = {
  WEEKLY_DATA: 'fitops_weekly_data',
  GOAL_MINUTES: 'fitops_goal_minutes',
  LAST_ACTIVE_DATE: 'fitops_last_active_date',
  TIMER_STATE: 'fitops_timer_state',
};

// ============================================================
// PERSISTENCE HELPERS
// ============================================================
function loadFromStorage(key, defaultValue) {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

/** Reset weekly data if a new week has started */
function resetWeeklyIfNewWeek() {
  const lastActive = loadFromStorage(STORAGE_KEYS.LAST_ACTIVE_DATE, null);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (lastActive !== todayStr) {
    // Check if the last active date was in a different ISO week
    const lastDate = lastActive ? new Date(lastActive + 'T00:00:00') : null;
    if (lastDate) {
      const getWeekNumber = (d) => {
        const temp = new Date(d.valueOf());
        const dayNum = (d.getDay() + 6) % 7;
        temp.setDate(temp.getDate() - dayNum + 3);
        const firstThursday = temp.valueOf();
        temp.setMonth(0, 1);
        if (temp.getDay() !== 4) {
          temp.setMonth(0, 1 + ((4 - temp.getDay()) + 7) % 7);
        }
        return 1 + Math.ceil((firstThursday - temp) / 604800000);
      };
      const lastWeek = getWeekNumber(lastDate);
      const thisWeek = getWeekNumber(today);
      const lastYear = lastDate.getFullYear();
      const thisYear = today.getFullYear();

      // New week — reset weekly data
      if (lastWeek !== thisWeek || lastYear !== thisYear) {
        return [0, 0, 0, 0, 0, 0, 0];
      }
    }
    // Update last active date
    saveToStorage(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr);
  } else {
    // Same day — ensure date is stored
    saveToStorage(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr);
  }

  // Return stored or fresh data
  const stored = loadFromStorage(STORAGE_KEYS.WEEKLY_DATA, null);
  return stored !== null ? stored : [0, 0, 0, 0, 0, 0, 0];
}

// ============================================================
// STATE MANAGEMENT
// ============================================================
const savedGoalMinutes = loadFromStorage(STORAGE_KEYS.GOAL_MINUTES, 10);
const savedWeekly = resetWeeklyIfNewWeek();

const state = {
  // Timer state
  isRunning: false,
  isPaused: false,
  isResting: false,
  totalSeconds: 0,
  elapsedSeconds: 0,
  goalMinutes: savedGoalMinutes,
  goalSeconds: savedGoalMinutes * 60,
  timerInterval: null,
  restInterval: null,
  restSeconds: 30,

  // Analytics
  calories: 0,
  steps: 0,
  heartRate: 72,
  totalDistance: 0,   // meters
  paceMinutes: 0,
  paceSeconds: 0,

  // Minute tracking
  minuteCount: 0,
  lastMinuteMark: 0,

  // Weekly data (persisted)
  weeklyData: savedWeekly,

  // Chart instance
  chartInstance: null,
};

// ============================================================
// DOM REFERENCES
// ============================================================
const $ = (id) => document.getElementById(id);
const els = {
  // Loading
  loadingScreen: $('loadingScreen'),

  // Timer
  timerDisplay: $('timerDisplay'),
  timerStatus: $('timerStatus'),
  timerRing: $('timerRing'),
  pulseRing: $('pulseRing'),

  // Goal
  goalChips: document.querySelectorAll('.goal-chip'),
  goalPercent: $('goalPercent'),
  goalProgressFill: $('goalProgressFill'),

  // Buttons
  btnStart: $('btnStart'),
  btnStop: $('btnStop'),
  btnRest: $('btnRest'),
  btnResume: $('btnResume'),
  btnFinishRest: $('btnFinishRest'),

  // Analytics
  caloriesValue: $('caloriesValue'),
  stepsValue: $('stepsValue'),
  heartRateValue: $('heartRateValue'),
  paceValue: $('paceValue'),

  // Rest
  restOverlay: $('restOverlay'),
  restCountdown: $('restCountdown'),
  restProgressFill: $('restProgressFill'),

  // Notification
  minuteNotif: $('minuteNotif'),
  notifTime: $('notifTime'),

  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  pages: document.querySelectorAll('.page'),

  // Chart
  weeklyChart: $('weeklyChart'),
};

// ============================================================
// SVG GRADIENT (Progress Ring)
// ============================================================
function injectTimerGradient() {
  const svg = document.querySelector('.timer-ring-svg');
  if (!svg) return;

  // Check if defs already exist
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.prepend(defs);
  }

  // Check if gradient already exists
  if (defs.querySelector('#timerGradient')) return;

  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.id = 'timerGradient';
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '100%');

  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#FF6959');

  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', getComputedStyle(document.documentElement).getPropertyValue('--primary-light').trim() || '#FF8A7A');

  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
}

// ============================================================
// LOADING SCREEN
// ============================================================
function hideLoadingScreen() {
  setTimeout(() => {
    els.loadingScreen.classList.add('hidden');
  }, 2000);
}

// ============================================================
// TIMER FUNCTIONS
// ============================================================

/** Format seconds to MM:SS */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Get the circumference for the progress ring (r=88 -> 2*PI*88 ≈ 553.1) */
const CIRCUMFERENCE = 2 * Math.PI * 88; // ~553.1

/** Update the circular progress ring */
function updateTimerRing(progress) {
  const offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
  els.timerRing.style.strokeDashoffset = offset;
}

/** Update timer display */
function updateTimerDisplay() {
  els.timerDisplay.textContent = formatTime(state.elapsedSeconds);
}

/** Update goal progress */
function updateGoalProgress() {
  const progress = state.elapsedSeconds / state.goalSeconds;
  const percent = Math.min(100, Math.round(progress * 100));
  els.goalPercent.textContent = `${percent}%`;
  els.goalProgressFill.style.width = `${percent}%`;
  updateTimerRing(Math.min(1, progress));
}

/** Update analytics in real time */
function updateAnalytics() {
  // Calories: ~0.12 per second (moderate running)
  state.calories = Math.round(state.elapsedSeconds * 0.12);
  els.caloriesValue.textContent = state.calories;

  // Steps: ~1.6 per second (approx 3 steps per 2 seconds)
  state.steps = Math.round(state.elapsedSeconds * 1.6);
  els.stepsValue.textContent = state.steps;

  // Heart Rate: simulate realistic variance
  if (state.isRunning && state.elapsedSeconds > 0) {
    const base = 120;
    const variance = Math.sin(state.elapsedSeconds * 0.1) * 8;
    state.heartRate = Math.round(base + variance);
    els.heartRateValue.textContent = state.heartRate;
  }

  // Avg Pace: based on distance covered (assuming ~2m/s)
  if (state.elapsedSeconds > 0) {
    const distanceKm = state.elapsedSeconds * 0.002; // 2m/s -> 0.002km/s
    if (distanceKm > 0) {
      const paceSecondsPerKm = state.elapsedSeconds / distanceKm;
      state.paceMinutes = Math.floor(paceSecondsPerKm / 60);
      state.paceSeconds = Math.round(paceSecondsPerKm % 60);
      els.paceValue.textContent = `${state.paceMinutes}'${String(state.paceSeconds).padStart(2, '0')}"`;
    }
  }
}

/** Check for 1-minute milestones */
function checkMinuteMilestone() {
  const currentMinute = Math.floor(state.elapsedSeconds / 60);
  if (currentMinute > state.minuteCount && currentMinute >= 1) {
    state.minuteCount = currentMinute;
    state.lastMinuteMark = state.elapsedSeconds;
    showMinuteNotification();
    playBeepSound();
  }
}

/** Toggle pulse ring animation */
function setPulseRing(active) {
  els.pulseRing.classList.toggle('active', active);
}

// ============================================================
// MAIN TIMER LOOP
// ============================================================
function saveTimerState() {
  saveToStorage(STORAGE_KEYS.TIMER_STATE, {
    elapsedSeconds: state.elapsedSeconds,
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    minuteCount: state.minuteCount,
    lastMinuteMark: state.lastMinuteMark,
    goalMinutes: state.goalMinutes,
    timestamp: Date.now(),
  });
}

function clearTimerState() {
  localStorage.removeItem(STORAGE_KEYS.TIMER_STATE);
}

function tick() {
  state.elapsedSeconds++;
  updateTimerDisplay();
  updateGoalProgress();
  updateAnalytics();
  checkMinuteMilestone();

  // Persist timer state every second
  saveTimerState();

  // Check if goal reached
  if (state.elapsedSeconds >= state.goalSeconds) {
    stopTimer();
    els.timerStatus.textContent = 'Goal Reached! 🎉';
    els.timerDisplay.textContent = formatTime(state.goalSeconds);
    playCompleteSound();
    showMinuteNotification(); // Show completion notification
  }
}

function startTimer() {
  if (state.isRunning || state.isResting) return;

  state.isRunning = true;
  state.isPaused = false;
  state.minuteCount = 0;
  state.lastMinuteMark = 0;

  // Update UI
  els.timerStatus.textContent = 'Keep Running';
  els.btnStart.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
    <span>Pause</span>
  `;
  els.btnStart.classList.add('paused');
  els.btnStop.disabled = false;
  els.btnRest.disabled = false;
  setPulseRing(true);

  // If resuming from pause, don't reset elapsed
  if (state.elapsedSeconds === 0) {
    state.totalSeconds = 0;
    state.calories = 0;
    state.steps = 0;
    state.heartRate = 72;
    els.heartRateValue.textContent = '72';
    els.paceValue.textContent = "--'--\"";
  }

  // Start interval
  state.timerInterval = setInterval(tick, 1000);
}

function pauseTimer() {
  if (!state.isRunning || state.isPaused) return;

  state.isPaused = true;
  clearInterval(state.timerInterval);
  state.timerInterval = null;

  els.timerStatus.textContent = 'Paused';
  els.btnStart.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
    <span>Resume</span>
  `;
  setPulseRing(false);
}

function resumeTimer() {
  if (!state.isPaused) return;

  state.isPaused = false;
  els.timerStatus.textContent = 'Keep Running';
  els.btnStart.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
    <span>Pause</span>
  `;
  setPulseRing(true);

  state.timerInterval = setInterval(tick, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  clearInterval(state.restInterval);
  state.timerInterval = null;
  state.restInterval = null;
  state.isRunning = false;
  state.isPaused = false;
  state.isResting = false;

  els.timerStatus.textContent = 'Ready';
  els.timerDisplay.textContent = '00:00';
  els.btnStart.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
    <span>Start</span>
  `;
  els.btnStart.classList.remove('paused');
  els.btnStop.disabled = true;
  els.btnRest.disabled = true;
  setPulseRing(false);
  els.restOverlay.classList.remove('active');

  // Reset state
  state.elapsedSeconds = 0;
  state.minuteCount = 0;
  state.calories = 0;
  state.steps = 0;
  state.heartRate = 72;
  state.paceMinutes = 0;
  state.paceSeconds = 0;
  updateTimerDisplay();
  updateGoalProgress();
  updateAnalytics();

  // Save session to weekly data
  saveSessionToWeekly();

  // Clear persisted timer state
  clearTimerState();

  // Play completion sound & show notification
  playCompleteSound();
  showFinishNotification();
}

// ============================================================
// REST MODE
// ============================================================
function enterRestMode() {
  if (!state.isRunning || state.isResting) return;

  state.isResting = true;
  state.restSeconds = 30;
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  setPulseRing(false);

  els.restOverlay.classList.add('active');
  els.restCountdown.textContent = formatTime(state.restSeconds);
  els.restProgressFill.style.width = '0%';

  state.restInterval = setInterval(() => {
    state.restSeconds--;
    els.restCountdown.textContent = formatTime(Math.max(0, state.restSeconds));

    const progress = (30 - state.restSeconds) / 30;
    els.restProgressFill.style.width = `${Math.min(100, progress * 100)}%`;

    if (state.restSeconds <= 0) {
      clearInterval(state.restInterval);
      state.restInterval = null;
      exitRestMode();
    }
  }, 1000);
}

function exitRestMode() {
  clearInterval(state.restInterval);
  state.restInterval = null;
  state.isResting = false;

  els.restOverlay.classList.remove('active');

  // Resume the timer
  state.isPaused = false;
  els.timerStatus.textContent = 'Keep Running';
  els.btnStart.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
    <span>Pause</span>
  `;
  setPulseRing(true);
  state.timerInterval = setInterval(tick, 1000);
}

function finishFromRest() {
  clearInterval(state.restInterval);
  state.restInterval = null;
  els.restOverlay.classList.remove('active');
  stopTimer();
}

// ============================================================
// ONE-MINUTE NOTIFICATION
// ============================================================
function showMinuteNotification() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  els.notifTime.textContent = timeStr;
  els.minuteNotif.classList.add('active');

  setTimeout(() => {
    els.minuteNotif.classList.remove('active');
  }, 3000);
}

// ============================================================
// SOUND SYSTEM (HTML Audio with MP3 files)
// ============================================================

/** 
 * Play an mp3 sound from the assets/sounds directory.
 * @param {string} filename - The mp3 filename (e.g. 's4.mp3' or 'complete.mp3')
 */
function playSound(filename) {
  try {
    const audio = new Audio(`assets/sounds/${filename}`);
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Silently fail if audio can't play (autoplay policy, etc.)
    });
  } catch (e) {
    // Silently fail if audio not available
    console.log('Sound not available:', filename);
  }
}

/** Play the 1-minute milestone sound */
function playBeepSound() {
  playSound('s4.mp3');
}

/** Play the session complete / goal reached sound */
function playCompleteSound() {
  playSound('complete.mp3');
}

// ============================================================
// FINISH NOTIFICATION
// ============================================================
function showFinishNotification() {
  // Show a brief finish card
  const finishNotif = document.createElement('div');
  finishNotif.className = 'minute-notification active';
  finishNotif.style.top = '50%';
  finishNotif.style.transform = 'translateX(-50%) translateY(-50%)';
  finishNotif.style.maxWidth = '300px';
  finishNotif.innerHTML = `
    <div class="notif-card" style="flex-direction:column; text-align:center; padding:24px;">
      <div style="width:48px;height:48px;color:var(--primary);margin-bottom:8px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <span style="font-size:18px;font-weight:700;">Session Complete!</span>
      <span style="font-size:13px;color:var(--text-muted);">Great work today!</span>
    </div>
  `;
  document.body.appendChild(finishNotif);

  setTimeout(() => {
    finishNotif.remove();
  }, 2500);
}

// ============================================================
// WEEKLY DATA & CHART
// ============================================================
function saveSessionToWeekly() {
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const idx = today === 0 ? 6 : today - 1; // Convert to Mon=0..Sun=6
  // Each session adds roughly the number of minutes run
  const sessionMinutes = Math.round(state.elapsedSeconds / 60);
  state.weeklyData[idx] += sessionMinutes;

  // Persist weekly data & last active date
  saveToStorage(STORAGE_KEYS.WEEKLY_DATA, state.weeklyData);
  saveToStorage(STORAGE_KEYS.LAST_ACTIVE_DATE, new Date().toISOString().slice(0, 10));

  updateChart();
}

function initChart() {
  const ctx = els.weeklyChart.getContext('2d');

  state.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Minutes',
        data: state.weeklyData,
        backgroundColor: [
          'rgba(255, 105, 89, 0.7)',
          'rgba(255, 105, 89, 0.7)',
          'rgba(255, 105, 89, 0.7)',
          'rgba(255, 105, 89, 0.7)',
          'rgba(255, 105, 89, 0.7)',
          'rgba(255, 105, 89, 0.55)',
          'rgba(255, 105, 89, 0.4)',
        ],
        borderColor: '#FF6959',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(26, 24, 24, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          cornerRadius: 10,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: (ctx) => `${ctx.raw} min`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#A3A386',
            font: { size: 11, weight: '500' },
            maxRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(163, 163, 134, 0.12)',
            drawBorder: false,
          },
          ticks: {
            color: '#A3A386',
            font: { size: 11 },
            stepSize: 10,
          },
        },
      },
    },
  });
}

function updateChart() {
  if (state.chartInstance) {
    state.chartInstance.data.datasets[0].data = state.weeklyData;
    state.chartInstance.update('none');
  }
}

// ============================================================
// GOAL CHIPS
// ============================================================
function initGoalChips() {
  // Restore active chip from saved preference
  els.goalChips.forEach((chip) => {
    const mins = parseInt(chip.dataset.minutes, 10);
    if (mins === state.goalMinutes) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  els.goalChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (state.isRunning) return; // Can't change goal mid-run

      // Update active state
      els.goalChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      // Update goal
      state.goalMinutes = parseInt(chip.dataset.minutes, 10);
      state.goalSeconds = state.goalMinutes * 60;
      state.elapsedSeconds = 0;

      // Persist goal preference
      saveToStorage(STORAGE_KEYS.GOAL_MINUTES, state.goalMinutes);

      // Reset display
      updateTimerDisplay();
      updateGoalProgress();
      els.timerStatus.textContent = 'Ready';
    });
  });
}

// ============================================================
// BOTTOM NAVIGATION
// ============================================================
function initNavigation() {
  els.navItems.forEach((item) => {
    item.addEventListener('click', () => {
      // Update nav active
      els.navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');

      // We only have one page (dashboard) in this implementation,
      // but we simulate page switching for the nav
      const pageName = item.dataset.page;
      // For now, we just animate a brief interaction
      if (pageName === 'dashboard') {
        // Already showing dashboard
      } else {
        // Show a small placeholder for other pages
        showPagePlaceholder(pageName);
      }
    });
  });
}

function showPagePlaceholder(pageName) {
  // Toast-like placeholder
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(26, 24, 24, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 100px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    backdrop-filter: blur(12px);
    animation: toastAnim 0.3s ease;
    pointer-events: none;
  `;
  toast.textContent = `🏃 ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page coming soon!`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function initEventListeners() {
  // Start / Pause / Resume toggle
  els.btnStart.addEventListener('click', () => {
    if (state.isResting) return;

    if (!state.isRunning) {
      startTimer();
    } else if (state.isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  });

  // Stop
  els.btnStop.addEventListener('click', stopTimer);

  // Rest
  els.btnRest.addEventListener('click', enterRestMode);

  // Resume from rest
  els.btnResume.addEventListener('click', exitRestMode);

  // Finish from rest
  els.btnFinishRest.addEventListener('click', finishFromRest);
}

// ============================================================
// RESTORE TIMER FROM LOCALSTORAGE (after page refresh)
// ============================================================
function restoreTimerState() {
  const saved = loadFromStorage(STORAGE_KEYS.TIMER_STATE, null);
  if (!saved) return;

  const elapsed = saved.elapsedSeconds || 0;
  const wasRunning = saved.isRunning === true;
  const wasPaused = saved.isPaused === true;

  // Restore elapsed seconds
  state.elapsedSeconds = elapsed;
  state.minuteCount = saved.minuteCount || 0;
  state.lastMinuteMark = saved.lastMinuteMark || 0;

  // Restore goal if it changed
  if (saved.goalMinutes && saved.goalMinutes !== state.goalMinutes) {
    state.goalMinutes = saved.goalMinutes;
    state.goalSeconds = state.goalMinutes * 60;
  }

  // Calculate time gap since last save
  const now = Date.now();
  const then = saved.timestamp || now;
  const gapSeconds = Math.max(0, Math.floor((now - then) / 1000));

  // If it was running, add the gap time and auto-restart
  if (wasRunning && !wasPaused && elapsed > 0) {
    // Cap gap to prevent absurd jumps (max 10 minutes)
    const cappedGap = Math.min(gapSeconds, 600);
    state.elapsedSeconds = Math.min(elapsed + cappedGap, state.goalSeconds);

    // Check if goal was reached during gap
    if (state.elapsedSeconds >= state.goalSeconds) {
      // Goal reached during gap - reset to fresh state
      clearTimerState();
      state.elapsedSeconds = 0;
      state.minuteCount = 0;
      state.calories = 0;
      state.steps = 0;
      updateTimerDisplay();
      updateGoalProgress();
      updateAnalytics();
      return;
    }

    // Auto-start the timer as if it was never stopped
    state.isRunning = true;
    state.isPaused = false;

    // Update UI to running state
    els.timerStatus.textContent = 'Keep Running';
    els.btnStart.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </svg>
      <span>Pause</span>
    `;
    els.btnStart.classList.add('paused');
    els.btnStop.disabled = false;
    els.btnRest.disabled = false;
    setPulseRing(true);

    // Start the interval
    state.timerInterval = setInterval(tick, 1000);

  } else if (wasPaused && elapsed > 0) {
    // Was paused — just show the elapsed time, don't restart
    state.isPaused = true;

    els.timerStatus.textContent = 'Paused';
    els.btnStart.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      <span>Resume</span>
    `;
  }

  // Update displays
  updateTimerDisplay();
  updateGoalProgress();

  // Recalculate analytics based on restored time
  state.calories = Math.round(state.elapsedSeconds * 0.12);
  state.steps = Math.round(state.elapsedSeconds * 1.6);
  if (state.elapsedSeconds > 0) {
    const distanceKm = state.elapsedSeconds * 0.002;
    const paceSecondsPerKm = state.elapsedSeconds / distanceKm;
    state.paceMinutes = Math.floor(paceSecondsPerKm / 60);
    state.paceSeconds = Math.round(paceSecondsPerKm % 60);
    els.paceValue.textContent = `${state.paceMinutes}'${String(state.paceSeconds).padStart(2, '0')}"`;
  }
  els.caloriesValue.textContent = state.calories;
  els.stepsValue.textContent = state.steps;
}

// ============================================================
// APP INITIALIZATION
// ============================================================
function initApp() {
  // Inject SVG gradient
  injectTimerGradient();

  // Initialize components
  initGoalChips();
  initNavigation();
  initEventListeners();

  // Initialize chart
  initChart();

  // Set initial display
  updateTimerDisplay();
  updateGoalProgress();
  updateAnalytics();

  // Restore any saved timer state (after page refresh)
  restoreTimerState();

  // Hide loading screen after a delay
  hideLoadingScreen();

  // Log
  console.log('🏃 FitOps Running Tracker initialized');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Also handle iOS safe areas
document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');
