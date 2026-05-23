# 🏃 NexaFit — Next-Gen Fitness Tracking

**Ignite Your Potential**

NexaFit is a premium, dark-mode fitness tracking application built with vanilla HTML, CSS, and JavaScript, wrapped with **Capacitor** for native Android & iOS deployment. Track your runs, monitor progress, and crush your goals with an elegant, intuitive interface.

![NexaFit](https://img.shields.io/badge/NexaFit-v1.0.0-FF6959?style=flat-square)
![Capacitor](https://img.shields.io/badge/Capacitor-7.0-119EFF?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## ✨ Features

- **Smart Run Timer** — Real-time progress tracking with circular SVG ring
- **Goal-Based Training** — 10/20/30/40 minute session targets
- **Live Analytics** — Calories, steps, heart rate, pace tracking
- **Weekly Progress** — Bar chart visualization of weekly activity
- **Rest Timer** — Built-in 30-second rest between intervals
- **Audio Feedback** — Per-minute beeps + completion chime (iPhone/Android)
- **Haptic Vibration** — Tactile feedback at milestones (all platforms)
- **Offline Mode** — Works without internet; data stored locally
- **Premium Dark Mode** — Glassmorphism design, dark-first aesthetic
- **No Account Required** — Your data stays on your device

---

## 📱 Project Structure

```
nexafit/
├── index.html              # Main application HTML
├── style.css               # Premium dark-mode styles
├── script.js               # Application logic + sound/vibration
├── capacitor.config.json   # Capacitor configuration
├── package.json            # Dependencies + scripts
├── BRANDING.md             # Full brand guidelines
├── README.md               # This file
├── .gitignore
├── assets/
│   ├── icons/              # App icons for Android & iOS
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── sounds/             # Audio assets
│       ├── s4.mp3          # Per-minute beep sound
│       └── complete.mp3    # Session complete chime
├── js/
│   └── native-bridge.js    # Capacitor native plugins bridge
├── android/                # Android project (generated)
└── ios/                    # iOS project (generated)
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | ≥ 18 | [nodejs.org](https://nodejs.org) |
| **npm** | ≥ 9 | Included with Node.js |
| **Android Studio** | Hedgehog+ | [developer.android.com/studio](https://developer.android.com/studio) |
| **Xcode** | 15+ (macOS only) | [developer.apple.com/xcode](https://developer.apple.com/xcode) |
| **CocoaPods** | Latest (iOS only) | `sudo gem install cocoapods` |
| **Java JDK** | 17 (Android only) | Included in Android Studio |
| **Git** | ≥ 2.0 | [git-scm.com](https://git-scm.com) |

---

### 📦 1. Install Dependencies

```bash
npm install
```

### ⚡ 2. Initialize Capacitor

```bash
npx cap init NexaFit com.nexafit.app --web-dir .
```

### 📱 3. Add Native Platforms

**Android:**
```bash
npx cap add android
```

**iOS (macOS only):**
```bash
npx cap add ios
```

### 🔄 4. Sync Web Code to Native

```bash
npx cap sync
```

### ▶️ 5. Run the App

**Open Android Studio:**
```bash
npx cap open android
```
Then click **Run** ▶️ in Android Studio.

**Open Xcode (macOS only):**
```bash
npx cap open ios
```
Select a simulator or connected device, then click **Run** ▶️.

---

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run cap:init` | Initialize Capacitor project |
| `npm run cap:add:android` | Add Android platform |
| `npm run cap:add:ios` | Add iOS platform |
| `npm run cap:sync` | Sync web code to native projects |
| `npm run cap:open:android` | Open project in Android Studio |
| `npm run cap:open:ios` | Open project in Xcode |
| `npm run cap:build:android` | Sync + open Android Studio |
| `npm run cap:build:ios` | Sync + open Xcode |
| `npm run cap:run:android` | Run on connected Android device |
| `npm run cap:run:ios` | Run on connected iOS device |
| `npm run cap:copy` | Copy web assets to native projects |
| `npm run cap:update` | Update Capacitor plugins |

---

## 🏗️ Building for Production

### Android (Google Play Store)

```bash
# 1. Sync latest web changes
npx cap sync

# 2. Open Android Studio
npx cap open android

# 3. In Android Studio:
#    - Build → Generate Signed Bundle / APK
#    - Select "Android App Bundle" for Play Store
#    - Create or select a keystore
#    - Select "release" build variant
#    - Build generates .aab file
```

**Build output location:** `android/app/build/outputs/bundle/release/app-release.aab`

### iOS (Apple App Store)

```bash
# 1. Sync latest web changes
npx cap sync

# 2. Open Xcode
npx cap open ios

# 3. In Xcode:
#    - Select "Product → Archive" from menu
#    - Wait for archive to complete
#    - In Organizer window, click "Distribute App"
#    - Select "App Store Connect" → Upload
```

**Note:** iOS builds require a Mac with Xcode and an Apple Developer account ($99/year).

---

## 🧪 Development Workflow

### Web Development (Hot Reload)

For quick frontend iteration, serve `index.html` locally:

```bash
# Using Python
python3 -m http.server 3000

# Or using Node.js live-server
npx live-server --port=3000

# Open in browser
open http://localhost:3000
```

### Testing on Device (Capacitor Live Reload)

```bash
# Serve web app with live reload
npx cap run android --livereload
npx cap run ios --livereload
```

---

## 🔧 Configuration

### Capacitor Settings (`capacitor.config.json`)

| Key | Default | Description |
|-----|---------|-------------|
| `appId` | `com.nexafit.app` | Unique app identifier |
| `appName` | `NexaFit` | Display name on device |
| `webDir` | `.` | Root directory for web assets |
| `SplashScreen.backgroundColor` | `#0C0C0E` | Splash background color |
| `StatusBar.style` | `DARK` | Status bar theme |
| `PushNotifications.presentationOptions` | `badge,sound,alert` | Notification behavior |

### Android: `android/app/build.gradle`
- `minSdkVersion`: 24 (Android 7.0+)
- `targetSdkVersion`: 34 (Android 14)
- `compileSdkVersion`: 34

### iOS: `ios/App/Podfile`
- `platform :ios`: 15.0 minimum

---

## 🎨 Branding

See [**BRANDING.md**](./BRANDING.md) for complete brand guidelines including:
- Color palette (Nexa Coral, Dark Surface, etc.)
- Typography (SF Pro, type scale)
- App icon and splash screen concepts
- Store listing description
- Design principles and motion guidelines

---

## 🔋 Platform Support

| Feature | Android | iOS | Web |
|---------|---------|-----|-----|
| Timer & Analytics | ✅ | ✅ | ✅ |
| Audio Beeps | ✅ | ✅ | ✅ |
| Haptic Vibration | ✅ | ✅ | ❌ |
| Offline Mode | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ❌ |
| Status Bar Styling | ✅ | ✅ | ❌ |
| Keyboard Handling | ✅ | ✅ | ❌ |
| App Store Ready | ✅ | ✅ | ❌ |

---

## 🛠️ Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| `npx cap add android` fails | Install JDK 17 and set `JAVA_HOME` environment variable |
| iOS build fails in Xcode | `cd ios/App && pod install && cd ../..` |
| Splash screen not showing | Check `capacitor.config.json` → SplashScreen settings |
| Audio not playing on iOS | Ensure Silent Mode is OFF on iPhone side switch |
| Vibration not working on iPhone Chrome | Chrome for iOS doesn't support Vibration API — uses audio click fallback |
| Blank white screen on device | Run `npx cap copy` to refresh native assets |

### Android Environment Setup
```bash
# Set Java home (adjust path for your system)
export JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
export ANDROID_HOME="C:\Users\ravi7\AppData\Local\Android\Sdk"
# Add to PATH
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### iOS Environment Setup (macOS only)
```bash
sudo gem install cocoapods
xcode-select --install
```

---

## 📈 Future Scaling Recommendations

1. **Service Worker**: Add offline caching via a service worker for full PWA support
2. **HealthKit / Google Fit**: Integrate with platform health APIs via custom Capacitor plugins
3. **GPS Tracking**: Add real-time run route tracking with `@capacitor/geolocation`
4. **Cloud Sync**: Add optional account and server-side data sync
5. **Dark Mode Toggle**: Add user-configurable theme (light/dark/system)
6. **Progressive Enhancement**: Add skeleton loading states for slower connections
7. **Analytics**: Integrate Firebase / Mixpanel for usage analytics
8. **CI/CD**: Set up GitHub Actions for automated Android/iOS builds
9. **Localization**: Support multiple languages via i18n
10. **Widget Support**: Add iOS widgets and Android home screen widgets

---

## 📄 License

MIT © 2026 NexaFit

---

<p align="center">
  Made with ❤️ by NexaFit Team
</p>