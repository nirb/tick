# Skill: PWA Onboarding & Client Push Registration

## Purpose & Scope
Guides client-side PWA installation, browser capability detection, iOS Safari standalone verification, and user permission gating for the Push API.

## Architectural Rules

### 1. iOS Detection & Standalone Mode Check
- iOS Safari (16.4+) only supports the Web Push API if the app is launched as an installed PWA from the Home Screen.
- Detect iOS:
  ```javascript
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;