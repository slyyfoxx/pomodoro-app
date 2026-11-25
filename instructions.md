# FocusForge Pomodoro – Instructions

A no-framework Pomodoro timer with a kitten and a pup who keep you company.

**Live site:** https://slyyfoxx.github.io/pomodoro-app/

## Run it

- **Online:** open the live site link above.
- **Locally:** open the folder in VS Code, right-click `index.html` → **Open with Live Server**. No install or build step.

## Use it

| Action | Button | Key |
|---|---|---|
| Start / pause / resume | Start | `Space` |
| Reset the current phase | Reset | `R` |
| Skip to the next phase | Skip | `S` |
| Lofi music on / off | ♫ Lofi | `M` |
| Pick a phase | Work / Break / Long break tabs | |
| Reset the session counter | **clear**, then **sure?** | |

- Work is 25 minutes, a break is 5 minutes, and every 4th work session is followed by a 15-minute long break.
- A chime plays when a phase ends, and the next phase starts on its own.
- The completed-session counter is saved in the browser (`localStorage`), so it survives a page reload.
- The page title shows the countdown, so you can see it from another tab.

## The friends

- They wander along the bottom of the page and sometimes visit each other.
- **Click anywhere:** both walk there and greet each other with a hop and a heart.
- **Click on one of them:** pet it.
- They react to the timer with speech bubbles, the pup chases the kitten during breaks, and they bop along when the music is on.

## Testing tips

- Add `?fast` to the URL (e.g. `index.html?fast`) to make each phase last seconds instead of minutes.
- To test the counter: open DevTools (`F12`) → Console, run `localStorage.setItem("focusforge.sessions", "3")`, then refresh. The counter shows 3.

## Files

| File | What it holds |
|---|---|
| `index.html` | Page structure, the kitten and pup drawings, side decorations |
| `style.css` | Pink and white theme, progress ring, animations |
| `app.js` | Timer logic, sounds, saved counter, the friends, music player |
| `lofi.mp3` | Background lofi track (64 kbps mono) |
| `PLAN.md` | How the app is organised and the order it was built in |
