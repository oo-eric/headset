# Karaoke — Heads-Up Lyrics

Sing-along for the slide-in phone headset: a **head-locked lyric panel** that sweeps
word-by-word with a backing track, floating in front of you while a dim, head-tracked
world (grid + a few slow semis) drifts behind it. Stereo split-screen, look around by
turning your head. Built on the same stereo / head-tracking / iOS-entry foundation as
`hello-world`.

## What you drop in

Two things make it a real song instead of the placeholder demo:

1. **`karaoke/track.mp3`** — the **no-vocals backing track** (instrumental). This is what
   plays and what the lyric sync clocks against. Until it exists, the scene falls back to
   a wall clock so the lyric sweep still previews (against silence).
2. **Real timed lyrics in `lyrics.js`** — `lyrics.js` is **generated**, not hand-authored
   (see below). Until you regenerate it, the placeholder `LYRICS` array runs the demo.

That's the same input trio the `karaoke` video skill uses — instrumental for playback,
vocal/full mix for _timing only_, lyrics for the words.

## Generating `lyrics.js` (timing)

Reuse the `karaoke` skill's timing engine rather than re-aligning by hand — it runs
WhisperX on the vocal mix and reconciles those timings onto the canonical `lyrics.md`
(WhisperX mishears words; we keep its _timings_, not its text). Then convert its JSON to
this experiment's `lyrics.js`:

```bash
# 1. WhisperX + reconcile -> reconciled per-word timings JSON (in the oo-band monorepo)
.claude/skills/karaoke/scripts/make_karaoke.sh \
  --instrumental <vocal-or-full-mix>.wav \   # WhisperX times this (any path; not heard here)
  --vocal        <vocal-or-full-mix>.wav \
  --lyrics       songs/<slug>/lyrics.md \
  --out          /tmp/_ignore.mp4 \
  --workdir      /tmp/ktmp --ass-only \
  --json-out     /tmp/ktmp/timings.json

# 2. Convert -> karaoke/lyrics.js  (commit the result; headset stays self-contained)
node headset/karaoke/scripts/build_lyrics.mjs /tmp/ktmp/timings.json

# 3. Drop the no-vocals instrumental in as headset/karaoke/track.mp3
```

`--json-out` is a flag this project added to the skill's `build_ass.py`; it threads
through `make_karaoke.sh` since that forwards unknown flags. `--ass-only` skips the video
render — we only want the timings.

## Run it

From the repo root (shared Vite project):

```bash
yarn install   # first time only
yarn dev       # HTTPS on the LAN — open the Network URL on the phone
```

Then open `/karaoke/` on the phone (e.g. `https://<lan-ip>:8443/karaoke/`), accept the
self-signed cert once, **tap once** to start, allow motion, and drop the phone in the
headset. The single tap grants motion access _and_ starts the audio (iOS gates both
behind a user gesture).

Desktop preview: open `/karaoke/` and **click once** to start; drag to look around. With
no `track.mp3`, the lyric sweep runs on the fallback clock.

## How it works (the new parts vs. hello-world)

- **HUD** — lyrics are rasterized into a 2D `<canvas>`, shown on a `PlaneGeometry`
  parented to the camera so it's head-locked and renders in _both_ stereo eyes (per the
  root `CLAUDE.md` rule: in-headset UI must be objects in the 3D scene, not HTML overlays).
  The canvas only repaints when the line or sung-word count changes, not every frame.
- **Clock** — `audio.currentTime` is the master clock when the track is playing; a
  `performance.now()` wall clock is the fallback when it isn't.
- **Sync** — each frame maps the current time to `(line, sungWordCount)`; already-sung
  words render in the accent red, upcoming words in white, with the prev/next lines dimmed
  above and below.

## Notes / limits

- **Lens centering** (`lensShift`) and the Three.js pin are inherited from the project —
  see the root `CLAUDE.md`.
- **No pause/seek UI yet.** It plays straight through from the entry tap. A clicker-driven
  pause/restart (gaze + tap) is the obvious next step if you want it.
- **Long lyric lines** auto-shrink to fit the panel width; they don't wrap. Keep lines to
  natural phrase length (as in the catalog `lyrics.md` files) and they read cleanly.
