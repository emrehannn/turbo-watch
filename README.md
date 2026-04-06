# Turbo Watch

Turbo Watch is a browser extension for controlling HTML5 video playback speed and volume boost on a per-tab basis.

## Features

- Playback speed control from **0.1x** to **10.0x**
- Volume boost control from **100%** (default) to **600%**
- Tab-scoped overrides with sensible defaults
- Works with dynamic pages that add or replace videos
- Cross-browser build outputs for Chromium and Firefox

## Browser support matrix

| Browser | Manifest | Status |
| --- | --- | --- |
| Chromium (latest stable) | MV3 + service worker | Supported |
| Firefox ESR (115+) | MV2 + background scripts | Supported via Firefox build |
| Firefox latest stable | MV2 + background scripts | Supported via Firefox build |

## Install (development)

### Chromium

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select:
   - `/home/runner/work/turbo-watch/turbo-watch/dist/chromium`

### Firefox

1. Run `npm run build`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**.
4. Select:
   - `/home/runner/work/turbo-watch/turbo-watch/dist/firefox/manifest.json`

## Build, lint, test

- `npm run lint` - syntax/config checks and remote-dependency guardrails
- `npm run build` - generates Chromium + Firefox extension folders in `dist/`
- `npm run test` - smoke tests for generated artifacts/manifests
- `npm run verify` - runs lint + build + test

## Architecture summary

- Popup UI sends typed runtime messages to background
- Background resolves active tab state and forwards apply/get-state messages to the content script
- Content script owns video playback-rate control and Web Audio `GainNode` volume boost
- Settings are stored in `storage.local` with defaults + optional per-tab overrides

## Permissions and security notes

- Remote UI dependencies are not used at runtime
- Extension messaging validates Turbo Watch message source/type
- Volume boost can amplify loud audio significantly; use with caution to protect hearing

## Manual verification matrix

- [ ] Speed slider applies 0.1x–10x values on pages with a single video
- [ ] Volume slider applies 100%–600% boost on pages with audible media
- [ ] Multiple video elements get consistent speed/boost updates
- [ ] Dynamic pages (video inserted after load) receive speed/boost state
- [ ] Tab switching preserves per-tab overrides
- [ ] Reset button restores tab defaults (1.0x / 100%)
- [ ] Popup shows clear status when no HTML5 video exists on the page
- [ ] Chromium artifact loads unpacked from `dist/chromium`
- [ ] Firefox artifact loads temporarily from `dist/firefox/manifest.json`

## Release checklist

- [ ] Run `npm run verify`
- [ ] Manually validate Chromium and Firefox artifacts
- [ ] Bump version in `manifest.base.json` and `package.json`
- [ ] Rebuild artifacts and confirm generated manifests
- [ ] Package and publish browser-specific builds

## License

This project is licensed under the MIT License.
