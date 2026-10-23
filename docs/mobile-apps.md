# Shipping RouteDiscover to the App Store and Google Play

RouteDiscover is a web app. The native apps are thin [Capacitor](https://capacitorjs.com/) shells that load https://routediscover.com, so every web release reaches phones immediately and there is one codebase to maintain. The configuration lives in `capacitor.config.ts`.

## One-time setup

1. Deploy the web app to https://routediscover.com first (the shell loads it).
2. On a Mac with Xcode: `npx cap add ios`. With Android Studio: `npx cap add android`. Each creates a native project folder (`ios/`, `android/`) that you commit.
3. `npm run cap:sync` copies config and plugins into the native projects. Re-run after editing `capacitor.config.ts` or installing a Capacitor plugin.
4. Icons: use `public/brand/icon-512.png` (and the 1254px source logo) with Xcode's asset catalog and Android Studio's Image Asset tool. Splash background is the brand navy.

## Permissions to declare

- **Location** (used for "Use my location", "what's ahead of me", Superchargers near me). iOS: add `NSLocationWhenInUseUsageDescription` in `ios/App/App/Info.plist`, e.g. "RouteDiscover uses your location to show stops, chargers and hotels along your drive." Android: `ACCESS_FINE_LOCATION` in `AndroidManifest.xml` (Capacitor's Geolocation plugin adds it).

## Store listing requirements the app already meets

- Account deletion inside the app (Account → Delete my account) — required by both stores.
- Privacy Policy and Terms at https://routediscover.com/privacy and /terms (link them in App Store Connect and Play Console).
- Support contact: the support email set under Owner → Pricing & app.
- Payments: passes and business plans are sold on the website via Stripe. If you offer them **inside** the native app, Apple and Google require their in-app purchase systems for digital goods; keeping purchases on the website (and not linking to checkout from inside the iOS app) avoids that. Decide before submitting.

## After the apps are listed

Paste the App Store and Google Play URLs into Owner → Pricing & app. The landing page badges switch from "Coming soon" to live links, and badge clicks are counted on the dashboard. Store download numbers come from App Store Connect and Play Console; they can be connected under Integrations → Custom APIs.

## Local testing

`CAP_SERVER_URL=http://<your-computer-ip>:3000 npm run cap:sync` points the shell at a dev server on your network (set `cleartext: true` temporarily for plain HTTP on Android).
