# 🏗️ Building NexaFit Installable Apps (No Android Studio / Xcode Needed)

## 📱 Android APK (Free — Build via GitHub Actions)

### Step 1: Push to GitHub

Create a GitHub account if you don't have one, then:

```bash
cd "c:\Users\ravi7\OneDrive\Desktop\FitOps"

# Initialize git
git init
git checkout -b main

# Add all files
git add .
git commit -m "🎉 NexaFit v1.0.0 — Initial release"

# Create repo on GitHub first, then link it
# Go to https://github.com/new → create "nexafit" (public)
git remote add origin https://github.com/YOUR_USERNAME/nexafit.git
git push -u origin main
```

### Step 2: GitHub Builds the APK Automatically

Once pushed, go to:  
`https://github.com/YOUR_USERNAME/nexafit/actions`

You'll see a workflow called **"Build Android APK"** running. Wait 3-5 minutes.

### Step 3: Download the APK

1. Click on the completed workflow run
2. Scroll down to **Artifacts**
3. Click **nexafit-android-debug** to download the APK
4. Transfer the APK to your Android phone (email, Google Drive, USB, etc.)
5. Open the APK on your phone → tap **Install**

### Step 4: Install on Android

1. On your Android phone, open the downloaded APK file
2. If prompted, enable **"Install from unknown sources"** in Settings
3. Tap **Install**
4. Open NexaFit from your app drawer

> **Note:** The APK is built fresh every time you push code to GitHub.  
> Every future update: just `git push` → wait 3 min → download new APK.

---

## 📱 iOS IPA (iPhone — 3 Options)

### Option A: PWABuilder (Free, No Mac Needed)

1. Go to https://pwabuilder.com
2. Click **"Start"**
3. Choose **"Upload your PWA"**
4. Zip the `www/` folder and upload:
   ```bash
   # Zip the www folder
   cd "c:\Users\ravi7\OneDrive\Desktop\FitOps"
   Compress-Archive -Path www/* -DestinationPath nexafit-pwa.zip
   ```
5. Click **"Package for Stores"**
6. Select **iOS** → Download the iOS wrapper
7. Install using the provided instructions

### Option B: AltStore (Free Side Loading)

1. Install **AltStore** on your iPhone and computer: https://altstore.io
2. Use **Xcode** or a cloud service to build the IPA
3. Transfer IPA to phone via AltStore

### Option C: TestFlight (Free, Requires a Mac)

If you have access to a Mac temporarily:
1. Clone the repo on the Mac
2. `npm install && npx cap add ios && npx cap sync`
3. `npx cap open ios`
4. Archive the app in Xcode
5. Upload to TestFlight
6. Install on iPhone via TestFlight app

---

## 🔄 Quick Update Workflow

Once set up on GitHub:

```bash
# Make changes to your code
# Then deploy new version:
git add .
git commit -m "Updated feature"
git push

# Wait 3 minutes
# Download new APK from GitHub Actions
# Install over existing app (data is preserved)
```

---

## 📋 Requirements Summary

| Platform | Tool Needed | Cost |
|----------|------------|------|
| **Android APK** | GitHub account (free) | ✅ Free |
| **iPhone IPA** | PWABuilder.com | ✅ Free |
| **App Store** | Apple Developer account | $99/year |
| **Play Store** | Google Developer account | $25 one-time |

For testing on your personal phone, **GitHub Actions + APK download** is completely free and works perfectly.