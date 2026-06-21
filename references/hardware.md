# Hardware — the actual phone + headset

The physical devices these experiments run on. Specs here feed the stereo / lens-centering
math (`lensShift`, IPD); see `../CLAUDE.md` → "Tuning: eye distance" for how they're used.

## Phones

The screen, sensors, and compute. Used in **landscape** in the headset, so the screen's long
edge is horizontal and is split into two eye halves. Per-eye width and `lensShift` differ by
phone, so anything tuned on one phone needs a re-check on the other.

### iPhone 17 Pro (primary)

Known specs (Apple / GSMArena):

- **Display:** 6.3″ LTPO Super Retina XDR OLED, 120 Hz ProMotion
- **Resolution:** 2622 × 1206 px, **460 ppi**
- **CSS viewport:** ~402 × 874 pt at **devicePixelRatio 3** (so 1206 × 2622 device px)
- **Body:** 150.0 × 71.9 × ~8.75 mm

Derived numbers for the stereo math (landscape orientation):

- **Physical screen size:** long edge 2622 px ÷ 460 ppi ≈ **144.8 mm** wide; short edge
  1206 px ÷ 460 ppi ≈ **66.6 mm** tall.
- **Per eye:** each half is 1311 px ≈ **72.4 mm** wide.
- **`lensShift` scale:** `lensShift` is in CSS px. At DPR 3, the saved default `30` ≈ 90 device
  px ≈ **5.0 mm** of inward shift per eye. (Average human IPD ≈ 63 mm → ~31.5 mm half-IPD,
  which is what the shift is pulling each eye's image toward.)

### iPhone 12 mini

Smaller alternative phone. At 5.4″ it sits comfortably **inside** the BASHKAN 4.7–6.2″ range
(unlike the 17 Pro), but the narrower screen means a different per-eye width and `lensShift`.

Known specs (Apple / GSMArena):

- **Display:** 5.4″ Super Retina XDR OLED
- **Resolution:** 2340 × 1080 px, **476 ppi**
- **CSS viewport:** 360 × 780 pt at **devicePixelRatio 3** (so 1080 × 2340 device px)
- **Body:** 131.5 × 64.2 × 7.4 mm

Derived numbers (landscape):

- **Physical screen size:** long edge 2340 px ÷ 476 ppi ≈ **124.9 mm** wide; short edge
  1080 px ÷ 476 ppi ≈ **57.6 mm** tall.
- **Per eye:** each half is 1170 px ≈ **62.4 mm** wide — about 10 mm narrower per eye than the
  17 Pro, so expect to re-tune `lensShift` rather than reuse the 30 default.

## Headset: BASHKAN 3D VR Headset

A plastic slide-in viewer (lenses + strap), not literal cardboard. The phone is the whole
system; this is optics + a head mount.

Known specs (Amazon listing, model B06XBYCQ2M):

- **Phone size support:** smartphones **4.7″–6.2″**. Note: the iPhone 17 Pro is **6.3″**, a hair
  over the stated max — the body (71.9 mm wide) still seats in the clamp, but it's at/over the
  upper limit, so expect the lenses to sit near the edge of their usable range.
- **Phone retention:** spring-loaded front cover / clamp; drop the phone into the front tray and
  a buckle holds it.
- **Audio:** built-in stereo headphones.
- **Fit:** adjustable head strap (over-the-top + around), foam face cushioning.
- **Input:** has a clicker lever that taps the screen at a fixed point (see `../CLAUDE.md` →
  "Input model — the clicker").

To measure (not published; measure on the physical unit if the tuning needs them):

- Lens diameter and lens-to-lens center spacing (drives the real target for `lensShift`).
- Lens-to-screen distance / focal length.
- Field of view.
- Whether the lens spacing is adjustable on this unit.

## Sources

- [iPhone 17 Pro — Technical Specifications (Apple)](https://www.apple.com/iphone-17-pro/specs/)
- [Apple iPhone 17 Pro — Full specifications (GSMArena)](https://www.gsmarena.com/apple_iphone_17_pro-14049.php)
- [BASHKAN 3D VR Headset (Amazon, B06XBYCQ2M)](https://www.amazon.com/BASHKAN-Headset-Headphones-Adjustable-Smartphones/dp/B06XBYCQ2M)
