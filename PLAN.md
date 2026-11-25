# FocusForge Pomodoro – Plan

## Goal

A no-framework Pomodoro web app: 25-minute work block, 5-minute break, pause / resume / reset, circular progress visual, a sound on every transition, and a session counter that survives a page reload. No build step.

## Files and responsibilities

### `index.html` – structure
- Heading, mode tabs (Work / Break / Long break)
- SVG progress ring (track circle + progress circle) with the time and status text inside
- Controls: Start/Pause, Reset, Skip
- Session counter with progress dots and a **clear** link
- Lofi button and `<audio>` element
- Inline SVG for the kitten, the pup and the side decorations

### `style.css` – look and animation
- Colour tokens on `:root`; accent colour changes per mode via `body[data-mode]`
- Ring progress through `stroke-dasharray` / `stroke-dashoffset`
- Animations: walking, hopping, blinking, tail wag, music bop, speech bubbles, floating decorations
- `prefers-reduced-motion` turns the motion off

### `app.js` – behaviour

**Timer state:** `mode`, `remaining`, `endsAt` (timestamp while running), `sessions`

| Function | Job |
|---|---|
| `loadSessions()` / `saveSessions()` | Read and write the counter in `localStorage` (`focusforge.sessions`) |
| `secondsLeft()` | Time left, computed from `endsAt` so it stays accurate in background tabs |
| `format(sec)` | Seconds → `MM:SS` |
| `render()` / `renderStatic()` | Update the time, ring and title / buttons, tabs and dots |
| `start()` / `pause()` / `reset()` | Timer controls |
| `setMode(mode)` | Switch phase and load its duration |
| `nextMode()` | Work → break (long break every 4th session) → work |
| `advance(completed)` | End or skip a phase: count it, chime, notify, auto-start the next one |
| `onTick()` | Runs 4× a second; advances when time is up |
| `unlockAudio()` / `chime()` | Web Audio set-up after the first click; the transition sound |
| `notify()` | Desktop notification if the tab is hidden |

**Friends:** `walkTo`, `move`, `wander`, `greet`, `pet`, `say`, `react`, `hop`, `popHeart`, `critterFrame` (the animation loop)

**Music:** `toggleMusic`, `fadeTo`, `setMusicButton`, `saveMusicTime` (resumes where you left off)

## Build order (each step tested in the browser)

1. **Countdown:** 25:00 counting down in `MM:SS`. Test: Start shows 24:59, 24:58…
2. **Pause / resume / reset:** Test: pause holds the time, resume continues from it, reset returns to 25:00.
3. **Auto-switch:** work ↔ break at 00:00. Test with `?fast` so phases last seconds.
4. **Progress ring:** Test: the ring empties as time runs and refills on a phase change.
5. **Sound:** chime on each transition, after the first click unlocks audio. Test with `?fast`.
6. **Saved counter:** Test: set `focusforge.sessions` to 3 in the console, reload, and the counter shows 3.
7. **Extras:** long break, skip, keyboard shortcuts, tab-title countdown, theme, friends, decorations, lofi music.
