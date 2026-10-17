# Diwali Prank Box

A lightweight, responsive, browser-based Diwali prank playground built with HTML, CSS, vanilla JavaScript and Vite. Designed for mobile-first sharing and offline-friendly play.

## Features
- Five self-contained prank modes: Fake Patakha, Rocket Panic, Surprise Box, Glitch Party and Tiny Jump Surprise.
- CSS animations, canvas-free confetti, synthesized Web Audio sound effects and optional vibration.
- Sound toggle, replay, share sheet/link copy, keyboard Escape support and reduced-motion preference.
- PWA manifest, custom SVG icon and service-worker caching.
- No account, backend, tracking, third-party runtime assets or recording.

## Local development

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Safety
All effects are visual/audio simulations inside the page. No actual fireworks, fake OS alerts, device damage, camera/microphone access or reaction recording. Sound can be disabled.

## Deployment
Vercel builds this project using `npm run build` and publishes the `dist` directory.
