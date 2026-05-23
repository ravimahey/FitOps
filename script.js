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
      if (lastWeek !== thisWeek || lastYear !== thisYear) {
        return [0, 0, 0, 0, 0, 0, 0];
      }
    }
    saveToStorage(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr);
  } else {
    saveToStorage(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr);
  }

  const stored = loadFromStorage(STORAGE_KEYS.WEEKLY_DATA, null);
  return stored !== null ? stored : [0, 0, 0, 0, 0, 0, 0];
}

// ============================================================
// STATE MANAGEMENT
// ============================================================
const savedGoalMinutes = loadFromStorage(STORAGE_KEYS.GOAL_MINUTES, 10);
const savedWeekly = resetWeeklyIfNewWeek();

const state = {
  isRunning: false,
  isPaused: false,
  isResting: false,
  totalSeconds: 0,
  elapsedSeconds: 0,
  /** Timestamp (ms) when the current running segment started */
  segmentStartTimestamp: 0,
  /** Accumulated seconds before the current segment */
  accumulatedSeconds: 0,
  goalMinutes: savedGoalMinutes,
  goalSeconds: savedGoalMinutes * 60,
  timerInterval: null,
  restInterval: null,
  restSeconds: 30,

  // Analytics
  calories: 0,
  steps: 0,
  heartRate: 72,
  totalDistance: 0,
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
  loadingScreen: $('loadingScreen'),
  timerDisplay: $('timerDisplay'),
  timerStatus: $('timerStatus'),
  timerRing: $('timerRing'),
  pulseRing: $('pulseRing'),
  goalChips: document.querySelectorAll('.goal-chip'),
  goalPercent: $('goalPercent'),
  goalProgressFill: $('goalProgressFill'),
  btnStart: $('btnStart'),
  btnStop: $('btnStop'),
  btnRest: $('btnRest'),
  btnResume: $('btnResume'),
  btnFinishRest: $('btnFinishRest'),
  caloriesValue: $('caloriesValue'),
  stepsValue: $('stepsValue'),
  heartRateValue: $('heartRateValue'),
  paceValue: $('paceValue'),
  restOverlay: $('restOverlay'),
  restCountdown: $('restCountdown'),
  restProgressFill: $('restProgressFill'),
  minuteNotif: $('minuteNotif'),
  notifTime: $('notifTime'),
  navItems: document.querySelectorAll('.nav-item'),
  pages: document.querySelectorAll('.page'),
  weeklyChart: $('weeklyChart'),
};

// ============================================================
// SVG GRADIENT (Progress Ring)
// ============================================================
function injectTimerGradient() {
  const svg = document.querySelector('.timer-ring-svg');
  if (!svg) return;

  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.prepend(defs);
  }
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

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const CIRCUMFERENCE = 2 * Math.PI * 88;

function updateTimerRing(progress) {
  const offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
  els.timerRing.style.strokeDashoffset = offset;
}

function updateTimerDisplay() {
  els.timerDisplay.textContent = formatTime(state.elapsedSeconds);
}

function updateGoalProgress() {
  const progress = state.elapsedSeconds / state.goalSeconds;
  const percent = Math.min(100, Math.round(progress * 100));
  els.goalPercent.textContent = `${percent}%`;
  els.goalProgressFill.style.width = `${percent}%`;
  updateTimerRing(Math.min(1, progress));
}

function updateAnalytics() {
  state.calories = Math.round(state.elapsedSeconds * 0.12);
  els.caloriesValue.textContent = state.calories;

  state.steps = Math.round(state.elapsedSeconds * 1.6);
  els.stepsValue.textContent = state.steps;

  if (state.isRunning && state.elapsedSeconds > 0) {
    const base = 120;
    const variance = Math.sin(state.elapsedSeconds * 0.1) * 8;
    state.heartRate = Math.round(base + variance);
    els.heartRateValue.textContent = state.heartRate;
  }

  if (state.elapsedSeconds > 0) {
    const distanceKm = state.elapsedSeconds * 0.002;
    if (distanceKm > 0) {
      const paceSecondsPerKm = state.elapsedSeconds / distanceKm;
      state.paceMinutes = Math.floor(paceSecondsPerKm / 60);
      state.paceSeconds = Math.round(paceSecondsPerKm % 60);
      els.paceValue.textContent = `${state.paceMinutes}'${String(state.paceSeconds).padStart(2, '0')}"`;
    }
  }
}

function checkMinuteMilestone() {
  const currentMinute = Math.floor(state.elapsedSeconds / 60);
  if (currentMinute > state.minuteCount && currentMinute >= 1) {
    state.minuteCount = currentMinute;
    state.lastMinuteMark = state.elapsedSeconds;
    showMinuteNotification();
    playBeepSound();
    vibrateMinuteMilestone();
  }
}

function setPulseRing(active) {
  els.pulseRing.classList.toggle('active', active);
}

// ============================================================
// REAL-TIME ELAPSED CALCULATION
// ============================================================
/**
 * Recalculate elapsedSeconds from the accumulated base + wall-clock time.
 * This ensures the timer advances correctly even after iPhone lock,
 * since setInterval freezes but Date.now() advances.
 */
function recalcElapsed() {
  if (state.isRunning && !state.isPaused && state.segmentStartTimestamp > 0) {
    const now = Date.now();
    const elapsedThisSegment = Math.floor((now - state.segmentStartTimestamp) / 1000);
    state.elapsedSeconds = state.accumulatedSeconds + elapsedThisSegment;
  }
}

// ============================================================
// TIMER PERSISTENCE
// ============================================================
function saveTimerState() {
  recalcElapsed();

  // Floor to goal limit
  if (state.elapsedSeconds >= state.goalSeconds) {
    state.elapsedSeconds = state.goalSeconds;
  }

  saveToStorage(STORAGE_KEYS.TIMER_STATE, {
    elapsedSeconds: state.elapsedSeconds,
    accumulatedSeconds: state.accumulatedSeconds,
    segmentStartTimestamp: state.segmentStartTimestamp,
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
  state.segmentStartTimestamp = 0;
  state.accumulatedSeconds = 0;
}

// ============================================================
// MAIN TIMER LOOP
// ============================================================
function tick() {
  // Recalculate elapsed from real wall-clock time
  recalcElapsed();

  // Cap to goal
  if (state.elapsedSeconds >= state.goalSeconds) {
    state.elapsedSeconds = state.goalSeconds;
  }

  updateTimerDisplay();
  updateGoalProgress();
  updateAnalytics();
  checkMinuteMilestone();

  // Persist timer state every tick
  saveTimerState();

  // Check if goal reached
  if (state.elapsedSeconds >= state.goalSeconds) {
    stopTimer();
    els.timerStatus.textContent = 'Goal Reached! 🎉';
    els.timerDisplay.textContent = formatTime(state.goalSeconds);
    playCompleteSound();
    showMinuteNotification();
  }
}

function startTimer() {
  if (state.isRunning || state.isResting) return;

  // Initialize AudioContext on user gesture (required by iOS)
  initAudioOnUserInteraction();

  state.isRunning = true;
  state.isPaused = false;
  state.minuteCount = Math.floor(state.elapsedSeconds / 60);
  state.lastMinuteMark = state.minuteCount * 60;

  // Record the start of this running segment
  state.segmentStartTimestamp = Date.now();
  state.accumulatedSeconds = state.elapsedSeconds;

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

  if (state.elapsedSeconds === 0) {
    state.totalSeconds = 0;
    state.calories = 0;
    state.steps = 0;
    state.heartRate = 72;
    els.heartRateValue.textContent = '72';
    els.paceValue.textContent = "--'--\"";
  }

  state.timerInterval = setInterval(tick, 1000);
}

function pauseTimer() {
  if (!state.isRunning || state.isPaused) return;

  // Freeze the accumulated time
  recalcElapsed();
  state.accumulatedSeconds = state.elapsedSeconds;
  state.segmentStartTimestamp = 0;

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
  saveTimerState();
}

function resumeTimer() {
  if (!state.isPaused) return;

  // Start a new segment
  state.segmentStartTimestamp = Date.now();
  state.accumulatedSeconds = state.elapsedSeconds;
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

  recalcElapsed();

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

  const finalElapsed = state.elapsedSeconds;

  state.elapsedSeconds = 0;
  state.accumulatedSeconds = 0;
  state.segmentStartTimestamp = 0;
  state.minuteCount = 0;
  state.calories = 0;
  state.steps = 0;
  state.heartRate = 72;
  state.paceMinutes = 0;
  state.paceSeconds = 0;
  updateTimerDisplay();
  updateGoalProgress();
  updateAnalytics();

  const sessionMinutes = Math.round(finalElapsed / 60);
  if (sessionMinutes > 0) {
    saveSessionToWeekly(sessionMinutes);
  }

  clearTimerState();

  playCompleteSound();
  vibrateSessionComplete();
  showFinishNotification();
}

// ============================================================
// REST MODE
// ============================================================
function enterRestMode() {
  if (!state.isRunning || state.isResting) return;

  // Freeze accumulated time
  recalcElapsed();
  state.accumulatedSeconds = state.elapsedSeconds;
  state.segmentStartTimestamp = 0;

  state.isResting = true;
  state.restSeconds = 30;
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  setPulseRing(false);

  els.restOverlay.classList.add('active');
  els.restCountdown.textContent = formatTime(state.restSeconds);
  els.restProgressFill.style.width = '0%';
  saveTimerState();

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

  // Resume — start a new segment
  state.isPaused = false;
  state.segmentStartTimestamp = Date.now();
  state.accumulatedSeconds = state.elapsedSeconds;

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
// VIBRATION SYSTEM (cross-platform)
// ============================================================
/**
 * Trigger vibration/haptic feedback.
 * 
 * Android: Uses navigator.vibrate() - works on all Android browsers.
 * iPhone Safari 13+: navigator.vibrate() is available.
 * iPhone Chrome: navigator.vibrate() is NOT available (WKWebView limitation).
 *   - Fallback: plays a very short, sharp audio click transient that
 *     feels like a vibration/tap to the user.
 */
function vibrateDevice(pattern) {
  // Android / iPhone Safari 13+: native Vibration API
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
      return;
    } catch (_) {}
  }

  // iPhone Chrome (WKWebView): no navigator.vibrate
  // Play a sharp audio "click" that feels like haptic feedback
  if (audioCtx && audioCtx.state === 'running') {
    try {
      const now = audioCtx.currentTime;
      const duration = typeof pattern === 'number' ? pattern / 1000 : 0.15;
      
      // Create a very short, sharp click using a high-frequency oscillator
      // with rapid attack/decay - feels like a tap
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'square'; // Square wave = sharper, more percussive
      osc.frequency.value = 200;
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + Math.min(duration, 0.12));
      osc.start(now);
      osc.stop(now + Math.min(duration, 0.12) + 0.01);
    } catch (_) {}
  }
}

function vibrateMinuteMilestone() {
  vibrateDevice(100);
}

function vibrateSessionComplete() {
  // Two short bursts
  if (navigator.vibrate) {
    try {
      navigator.vibrate([100, 80, 100]);
      return;
    } catch (_) {}
  }
  // iPhone fallback: two sharp clicks
  if (audioCtx && audioCtx.state === 'running') {
    try {
      const now = audioCtx.currentTime;
      // First click
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'square';
      osc1.frequency.value = 200;
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.start(now);
      osc1.stop(now + 0.11);
      
      // Second click
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'square';
      osc2.frequency.value = 200;
      gain2.gain.setValueAtTime(0.12, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.29);
    } catch (_) {}
  }
}

// ============================================================
// SOUND SYSTEM (iOS-compatible)
// ============================================================
// Pre-unlocked HTML Audio elements (reliable on iOS Chrome/Safari
// once they've been triggered during a user gesture)
let beepAudio = null;
let completeAudio = null;

let audioCtx = null;
let audioKeepAliveInterval = null;

function ensureAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return false;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return !!audioCtx;
}

/**
 * Keep the AudioContext alive on iOS by playing silent buffers periodically.
 */
function startAudioKeepAlive() {
  if (audioKeepAliveInterval) return;
  audioKeepAliveInterval = setInterval(() => {
    if (audioCtx && audioCtx.state === 'running') {
      try {
        const source = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, 1, 44100);
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
      } catch (_) {}
    }
  }, 500);
}

function stopAudioKeepAlive() {
  if (audioKeepAliveInterval) {
    clearInterval(audioKeepAliveInterval);
    audioKeepAliveInterval = null;
  }
}

/**
 * Initialize AudioContext and pre-unlock HTML Audio elements.
 * MUST be called from a user gesture handler (Start button click).
 */
function initAudioOnUserInteraction() {
  // Initialize AudioContext
  const ready = ensureAudioContext();
  if (ready && audioCtx) {
    try {
      const silentSource = audioCtx.createBufferSource();
      const silentBuffer = audioCtx.createBuffer(1, 1, 44100);
      silentSource.buffer = silentBuffer;
      silentSource.connect(audioCtx.destination);
      silentSource.start(0);
    } catch (_) {}
    
    // Start keepalive to prevent iOS from suspending the AudioContext
    startAudioKeepAlive();
  }

  // Pre-load and unlock HTML Audio elements for iOS Chrome/Safari.
  // Once unlocked during a user gesture, Audio.play() works from timers.
  if (!beepAudio) {
    beepAudio = new Audio('assets/sounds/s4.mp3');
    beepAudio.volume = 0.3;
    beepAudio.load();
    beepAudio.play().then(() => {
      beepAudio.pause();
      beepAudio.currentTime = 0;
    }).catch(() => {
      // Don't null out - element may work on subsequent plays
    });
  }

  if (!completeAudio) {
    completeAudio = new Audio('assets/sounds/complete.mp3');
    completeAudio.volume = 0.5;
    completeAudio.load();
    completeAudio.play().then(() => {
      completeAudio.pause();
      completeAudio.currentTime = 0;
    }).catch(() => {});
  }
}

/**
 * Play beep using pre-unlocked HTML Audio element.
 */
function playBeepHTML() {
  if (!beepAudio) return false;
  try {
    beepAudio.currentTime = 0;
    const p = beepAudio.play();
    if (p && p.catch) p.catch(() => {});
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Play complete sound using pre-unlocked HTML Audio element.
 */
function playCompleteHTML() {
  if (!completeAudio) return false;
  try {
    completeAudio.currentTime = 0;
    const p = completeAudio.play();
    if (p && p.catch) p.catch(() => {});
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Play a short synthesized beep using Web Audio oscillators.
 */
function playSynthesizedBeep(frequency, duration, volume) {
  const ctxReady = ensureAudioContext();
  if (!ctxReady || !audioCtx) return false;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start(0);
    osc.stop(audioCtx.currentTime + duration);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Play a short melody (two-tone chime) for session complete.
 */
function playSynthesizedComplete() {
  const ctxReady = ensureAudioContext();
  if (!ctxReady || !audioCtx) return false;

  try {
    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.type = 'sine';
    osc1.frequency.value = 587.33;
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = 'sine';
    osc2.frequency.value = 880;
    gain2.gain.setValueAtTime(0.3, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);

    return true;
  } catch (_) {
    return false;
  }
}

function playMP3(url) {
  const ctxReady = ensureAudioContext();
  
  if (ctxReady && audioCtx) {
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(buffer => audioCtx.decodeAudioData(buffer))
      .then(audioBuffer => {
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start(0);
      })
      .catch(() => {
        try {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'sine';
          osc.frequency.value = 660;
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
          osc.start(0);
          osc.stop(audioCtx.currentTime + 0.3);
        } catch (_) {}
      });
  } else {
    try {
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (_) {}
  }
}

function playBeepSound() {
  // 1. Pre-unlocked HTML Audio element (most reliable on iOS Chrome)
  if (playBeepHTML()) return;
  // 2. Synthesized oscillator beep (backup for Android / desktop)
  if (playSynthesizedBeep(880, 0.2, 0.3)) return;
  // 3. MP3 fetch/decode (last resort)
  playMP3('assets/sounds/s4.mp3');
}

function playCompleteSound() {
  if (playCompleteHTML()) return;
  if (playSynthesizedComplete()) return;
  playMP3('assets/sounds/complete.mp3');
}

// ============================================================
// FINISH NOTIFICATION
// ============================================================
function showFinishNotification() {
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
function saveSessionToWeekly(sessionMinutes) {
  const today = new Date().getDay();
  const idx = today === 0 ? 6 : today - 1;
  state.weeklyData[idx] += sessionMinutes;

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
      animation: { duration: 800, easing: 'easeOutQuart' },
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
          ticks: { color: '#A3A386', font: { size: 11, weight: '500' }, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(163, 163, 134, 0.12)', drawBorder: false },
          ticks: { color: '#A3A386', font: { size: 11 }, stepSize: 10 },
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
      if (state.isRunning) return;

      els.goalChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      state.goalMinutes = parseInt(chip.dataset.minutes, 10);
      state.goalSeconds = state.goalMinutes * 60;
      state.elapsedSeconds = 0;

      saveToStorage(STORAGE_KEYS.GOAL_MINUTES, state.goalMinutes);

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
      els.navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');

      const pageName = item.dataset.page;
      if (pageName !== 'dashboard') {
        showPagePlaceholder(pageName);
      }
    });
  });
}

function showPagePlaceholder(pageName) {
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

  els.btnStop.addEventListener('click', stopTimer);
  els.btnRest.addEventListener('click', enterRestMode);
  els.btnResume.addEventListener('click', exitRestMode);
  els.btnFinishRest.addEventListener('click', finishFromRest);
}

// ============================================================
// RESTORE TIMER FROM LOCALSTORAGE (after page refresh)
// ============================================================
function restoreTimerState() {
  const saved = loadFromStorage(STORAGE_KEYS.TIMER_STATE, null);
  if (!saved) return;

  state.elapsedSeconds = saved.elapsedSeconds || 0;
  state.accumulatedSeconds = saved.accumulatedSeconds || 0;
  state.segmentStartTimestamp = saved.segmentStartTimestamp || 0;
  state.minuteCount = saved.minuteCount || 0;
  state.lastMinuteMark = saved.lastMinuteMark || 0;

  // Restore goal
  if (saved.goalMinutes && saved.goalMinutes !== state.goalMinutes) {
    state.goalMinutes = saved.goalMinutes;
    state.goalSeconds = state.goalMinutes * 60;
  }

  const wasRunning = saved.isRunning === true && saved.isPaused === false;

  if (wasRunning && state.elapsedSeconds > 0 && state.elapsedSeconds < state.goalSeconds) {
    // Timer was running — account for the gap since last save
    const now = Date.now();
    const then = saved.timestamp || now;
    const gapSeconds = Math.max(0, Math.floor((now - then) / 1000));

    // Advance accumulated time by the gap (capped to 10 min)
    const cappedGap = Math.min(gapSeconds, 600);
    state.accumulatedSeconds = Math.min(
      state.elapsedSeconds + cappedGap,
      state.goalSeconds
    );
    // Reset segment start so recalcElapsed doesn't double-count
    state.segmentStartTimestamp = now;
    state.elapsedSeconds = state.accumulatedSeconds;

    // Check if goal was reached during gap
    if (state.elapsedSeconds >= state.goalSeconds) {
      clearTimerState();
      state.elapsedSeconds = 0;
      state.accumulatedSeconds = 0;
      state.minuteCount = 0;
      state.calories = 0;
      state.steps = 0;
      updateTimerDisplay();
      updateGoalProgress();
      updateAnalytics();
      return;
    }

    // Auto-restart the timer
    state.isRunning = true;
    state.isPaused = false;

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

    state.timerInterval = setInterval(tick, 1000);
  } else if (saved.isPaused === true && state.elapsedSeconds > 0) {
    // Was paused — just show elapsed
    state.isPaused = true;
    state.segmentStartTimestamp = 0;

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
  injectTimerGradient();
  initGoalChips();
  initNavigation();
  initEventListeners();
  initChart();

  updateTimerDisplay();
  updateGoalProgress();
  updateAnalytics();

  restoreTimerState();

  hideLoadingScreen();

  console.log('🏃 FitOps Running Tracker initialized');
}

document.addEventListener('DOMContentLoaded', initApp);
document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');