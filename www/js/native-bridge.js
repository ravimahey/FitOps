/**
 * NexaFit - Capacitor Native Bridge
 * Connects the PWA fitness app with native mobile capabilities.
 * Handles status bar, keyboard, splash screen, push notifications,
 * and offline detection for Android & iOS.
 */
(function () {
  'use strict';

  // ============================================================
  // CAPACITOR LOADING CHECK
  // ============================================================
  function isNative() {
    return typeof window !== 'undefined' && 
           typeof window.Capacitor !== 'undefined' && 
           typeof window.Capacitor.isNativePlatform === 'function' &&
           window.Capacitor.isNativePlatform();
  }

  function isAndroid() {
    return isNative() && window.Capacitor.getPlatform() === 'android';
  }

  function isIOS() {
    return isNative() && window.Capacitor.getPlatform() === 'ios';
  }

  // ============================================================
  // STATUS BAR
  // ============================================================
  function setupStatusBar() {
    if (!isNative() || !window.Capacitor.Plugins.StatusBar) return;
    
    const { StatusBar } = window.Capacitor.Plugins;
    
    try {
      if (isIOS()) {
        StatusBar.setStyle({ style: 'DARK' });
        StatusBar.setBackgroundColor({ color: '#0C0C0E' });
      } else if (isAndroid()) {
        StatusBar.setStyle({ style: 'DARK' });
        StatusBar.setBackgroundColor({ color: '#0C0C0E' });
      }
    } catch (e) {
      console.warn('StatusBar plugin error:', e);
    }
  }

  // ============================================================
  // KEYBOARD HANDLING
  // ============================================================
  function setupKeyboard() {
    if (!isNative() || !window.Capacitor.Plugins.Keyboard) return;
    
    const { Keyboard } = window.Capacitor.Plugins;
    
    try {
      Keyboard.setScrollExcessLines({ value: 0 });
      
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open');
      });
      
      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
      });
    } catch (e) {
      console.warn('Keyboard plugin error:', e);
    }
  }

  // ============================================================
  // SPLASH SCREEN
  // ============================================================
  function hideSplashScreen() {
    if (!isNative() || !window.Capacitor.Plugins.SplashScreen) return;
    
    const { SplashScreen } = window.Capacitor.Plugins;
    
    try {
      setTimeout(() => {
        SplashScreen.hide({ fadeOutDuration: 500 });
      }, 500);
    } catch (e) {
      console.warn('SplashScreen plugin error:', e);
    }
  }

  // ============================================================
  // PUSH NOTIFICATIONS
  // ============================================================
  function setupPushNotifications() {
    if (!isNative() || !window.Capacitor.Plugins.PushNotifications) return;
    
    const { PushNotifications } = window.Capacitor.Plugins;
    
    try {
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      });

      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration token:', token.value);
        // Store token for server-side push notification integration
        try {
          localStorage.setItem('nexafit_push_token', token.value);
        } catch (_) {}
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration error:', err.error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received:', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed:', notification);
      });
    } catch (e) {
      console.warn('PushNotifications plugin error:', e);
    }
  }

  // ============================================================
  // OFFLINE / ONLINE DETECTION
  // ============================================================
  function setupNetworkDetection() {
    const handleOnline = () => {
      document.body.classList.remove('app-offline');
      const banner = document.getElementById('offlineBanner');
      if (banner) banner.remove();
    };

    const handleOffline = () => {
      document.body.classList.add('app-offline');
      if (!document.getElementById('offlineBanner')) {
        const banner = document.createElement('div');
        banner.id = 'offlineBanner';
        banner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: #FF6959;
          color: white;
          text-align: center;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          backdrop-filter: blur(12px);
        `;
        banner.textContent = '📡 No internet connection — some features may be limited';
        document.body.appendChild(banner);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      handleOffline();
    }
  }

  // ============================================================
  // APP STATE SAFE AREA HANDLING
  // ============================================================
  function setupSafeArea() {
    // CSS custom property for safe-area is already applied in HTML
    document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');
    document.documentElement.style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)');
  }

  // ============================================================
  // HAPTIC VIBRATION (Capacitor Native)
  // ============================================================
  function setupHaptics() {
    // Expose a native haptic method if Haptics plugin is available
    if (isNative() && window.Capacitor.Plugins.Haptics) {
      window.__nexafitHaptic = () => {
        try {
          window.Capacitor.Plugins.Haptics.vibrate({ duration: 100 });
        } catch (_) {}
      };
      window.__nexafitHapticDouble = () => {
        try {
          window.Capacitor.Plugins.Haptics.vibrate({ duration: 100 });
          setTimeout(() => {
            window.Capacitor.Plugins.Haptics.vibrate({ duration: 100 });
          }, 150);
        } catch (_) {}
      };
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  function initNativeBridge() {
    if (typeof window === 'undefined') return;
    
    // Mark as Capacitor app for CSS targeting
    if (isNative()) {
      document.documentElement.classList.add('capacitor-native');
      if (isAndroid()) document.documentElement.classList.add('capacitor-android');
      if (isIOS()) document.documentElement.classList.add('capacitor-ios');
    }

    setupSafeArea();
    setupStatusBar();
    setupKeyboard();
    setupNetworkDetection();
    setupPushNotifications();
    setupHaptics();
    
    // Hide splash screen after a short delay
    hideSplashScreen();
    
    console.log('🔌 NexaFit Native Bridge initialized');
    console.log(`📱 Platform: ${isNative() ? window.Capacitor.getPlatform() : 'web'}`);
  }

  // Wait for Capacitor to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNativeBridge);
  } else {
    initNativeBridge();
  }

  // Also listen for Capacitor 'deviceready' style event
  document.addEventListener('capacitorReady', () => {
    // Re-init in case Capacitor wasn't ready on first load
    initNativeBridge();
  });

})();