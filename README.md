# DHA – Android app

Offline nursing exam practice: 1,591 questions bundled inside the app (no server, no internet, no MongoDB needed on the phone).
Mock tests of 5/10/20/30/40/50 random questions, green = right, red = wrong, "Congratulations!" + score at the end.

## Build the APK (one time setup)

Install: **Node.js 18+**, **Android Studio** (it includes the Android SDK and Java).

```
npm install
npx cap add android
npm run icons          # makes the DHA launcher icon + splash screen
npx cap sync android
npx cap open android   # opens Android Studio
```

In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
The file is created at `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to your phone and install it (allow "install unknown apps").

To test on a connected phone or emulator instead: press the green Run button.

## For Google Play
**Build > Generate Signed Bundle / APK > Android App Bundle**, create a keystore (keep it safe), and upload the .aab in Play Console.

## Updating questions
Edit `www/questions.json` (same format), then run `npx cap sync android` and rebuild.
