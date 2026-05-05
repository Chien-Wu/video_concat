"""
Split alexander.png into two aligned, transparent-background frames.

Strategy:
1. Find each figure's horizontal center via bounding-box of non-white pixels
   in the top 40% of each half (face zone).
2. Crop both halves at the same width with face dead-center.
3. Pixel-level refine: brute-force (dx, dy) translation on the OPEN frame
   that minimizes pixel-diff vs CLOSED, ignoring the mouth region.
4. Flood-fill white from the four corners only (so interior whites like the
   toga survive), with alpha graded by whiteness for clean halo edges.
5. Body-stabilize: composite OPEN's head onto CLOSED's body with a feathered
   seam — eliminates body shake (the artist drew the two bodies with subtly
   different shapes that no rigid alignment can fix).
"""
from PIL import Image
from collections import deque
import numpy as np
import sys

import os
_HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(_HERE, "assets", "alexander.png")
OUT_CLOSED = os.path.join(_HERE, "assets", "alexander_closed.png")
OUT_OPEN = os.path.join(_HERE, "assets", "alexander_open.png")

WHITE_THRESHOLD = 235  # px considered "white" if R,G,B all >= this
FACE_ZONE_TOP_FRAC = 0.0
FACE_ZONE_BOTTOM_FRAC = 0.40  # top 40% of image is "face zone"

# Background-removal tuning
VISIT_FUZZ = 55      # min(R,G,B) >= 255-VISIT_FUZZ → pixel can be reached by flood-fill
ALPHA_FULL = 215     # min(R,G,B) <= ALPHA_FULL → keep fully opaque (it's figure content)
ALPHA_ZERO = 252     # min(R,G,B) >= ALPHA_ZERO → fully transparent (it's clean background)

# Body-stabilization tuning
# Below this fraction of the crop height, both frames must use CLOSED's pixels.
# 0.62 lands just below the chin/neck, before the shoulders — chosen to keep
# the open mouth + jaw movement visible while removing body shake entirely.
BODY_SPLIT_FRAC = 0.62
BODY_FADE_PX = 40    # feathered seam height, prevents visible discontinuity


def is_whitish(px, threshold=WHITE_THRESHOLD):
    if len(px) == 4 and px[3] == 0:
        return True
    return px[0] >= threshold and px[1] >= threshold and px[2] >= threshold


def find_face_x_center(img, x_start, x_end):
    """Return horizontal center of non-white pixels in the face zone."""
    w, h = img.size
    px = img.load()
    y0 = int(h * FACE_ZONE_TOP_FRAC)
    y1 = int(h * FACE_ZONE_BOTTOM_FRAC)

    min_x, max_x = x_end, x_start
    for y in range(y0, y1):
        for x in range(x_start, x_end):
            if not is_whitish(px[x, y]):
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
    if min_x > max_x:
        return (x_start + x_end) // 2
    return (min_x + max_x) // 2


def floodfill_corners_to_transparent(img):
    """Two-pass background removal:
      1) Flood-fill from corners through any pixel with min(R,G,B) >= 255-VISIT_FUZZ.
         This identifies the background region INCLUDING anti-aliased halos.
      2) For each visited pixel, set alpha based on how white it is:
           - min(R,G,B) >= ALPHA_ZERO → fully transparent
           - min(R,G,B) <= ALPHA_FULL → fully opaque (figure content the flood leaked into)
           - in between → linear ramp (smoothly feathered halo)

    Preserves interior whites like the toga because flood-fill can't reach them.
    """
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    visited = [[False] * h for _ in range(w)]

    def can_visit(x, y):
        r, g, b, a = px[x, y]
        if a == 0:
            return True
        return min(r, g, b) >= 255 - VISIT_FUZZ

    queue = deque()
    for cx, cy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if can_visit(cx, cy):
            queue.append((cx, cy))
            visited[cx][cy] = True

    while queue:
        x, y = queue.popleft()
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                if can_visit(nx, ny):
                    visited[nx][ny] = True
                    queue.append((nx, ny))

    span = ALPHA_ZERO - ALPHA_FULL
    for y in range(h):
        for x in range(w):
            if not visited[x][y]:
                continue
            r, g, b, a = px[x, y]
            m = min(r, g, b)
            if m >= ALPHA_ZERO:
                new_a = 0
            elif m <= ALPHA_FULL:
                new_a = a  # keep original (figure pixel reached by leak)
            else:
                # linear: m=ALPHA_FULL → 255, m=ALPHA_ZERO → 0
                new_a = int(255 * (ALPHA_ZERO - m) / span)
            px[x, y] = (r, g, b, new_a)
    return img


def find_best_offset(closed_img, open_img, search=24, mouth_box=None):
    """Find (dx, dy) to add to open_img's source position so it best matches
    closed_img, ignoring the mouth region. Returns (dx, dy) where positive dx
    means open_img should be sampled from the right of its current position.

    Uses sum of absolute differences over RGB, in a mask that excludes the
    mouth box. Brute-force search; numpy-vectorized so it's a few seconds.
    """
    a = np.asarray(closed_img.convert("RGB"), dtype=np.int16)
    b = np.asarray(open_img.convert("RGB"), dtype=np.int16)
    h, w, _ = a.shape

    # Mask: True = use this pixel for matching
    mask = np.ones((h, w), dtype=bool)
    if mouth_box is not None:
        x0, y0, x1, y1 = mouth_box
        mask[y0:y1, x0:x1] = False

    best = (None, None, np.inf)
    inner_h = h - 2 * search
    inner_w = w - 2 * search
    a_center = a[search:search + inner_h, search:search + inner_w]
    m_center = mask[search:search + inner_h, search:search + inner_w]
    n = m_center.sum()

    for dy in range(-search, search + 1):
        for dx in range(-search, search + 1):
            # Take a window from b shifted by (dx, dy) relative to center
            y0 = search + dy
            x0 = search + dx
            b_window = b[y0:y0 + inner_h, x0:x0 + inner_w]
            diff = np.abs(a_center - b_window).sum(axis=2)  # per-pixel sum of channels
            score = (diff * m_center).sum() / max(1, n)
            if score < best[2]:
                best = (dx, dy, score)
    return best[0], best[1], best[2]


def main():
    src = Image.open(SRC).convert("RGB")
    W, H = src.size
    print(f"source: {W}x{H}")

    half = W // 2  # boundary between left and right figure

    face_x_L = find_face_x_center(src, 0, half)
    face_x_R = find_face_x_center(src, half, W)
    print(f"face center L = {face_x_L} (offset from center {face_x_L - half//2:+d})")
    print(f"face center R = {face_x_R} (offset from right center {face_x_R - (half + half//2):+d})")

    # max crop width such that both crops fit within their halves with face centered
    max_w_L = 2 * min(face_x_L, half - face_x_L)
    max_w_R = 2 * min(face_x_R - half, W - face_x_R)
    crop_w = min(max_w_L, max_w_R, H)  # also cap at image height for square crop
    # Leave slack for translation refinement
    SEARCH = 24
    crop_w = crop_w - 2 * SEARCH
    crop_h = crop_w  # square

    print(f"crop size = {crop_w}x{crop_h} (after reserving {SEARCH}px slack for refinement)")

    lx0 = face_x_L - crop_w // 2
    rx0 = face_x_R - crop_w // 2
    y0 = 0
    y1 = crop_h

    left_crop = src.crop((lx0, y0, lx0 + crop_w, y1))
    right_crop_init = src.crop((rx0, y0, rx0 + crop_w, y1))

    # Pixel-level refinement: find (dx, dy) for the OPEN frame, ignoring the mouth.
    # Mouth region: roughly y in [42%, 60%] of height, x in [35%, 65%] of width.
    mh0 = int(crop_h * 0.42)
    mh1 = int(crop_h * 0.60)
    mw0 = int(crop_w * 0.35)
    mw1 = int(crop_w * 0.65)
    mouth_box = (mw0, mh0, mw1, mh1)

    # We need the same-sized region to compare. Re-crop both with extra search slack.
    left_padded = src.crop((lx0 - SEARCH, y0, lx0 + crop_w + SEARCH, y1 + 2 * SEARCH))
    right_padded = src.crop((rx0 - SEARCH, y0, rx0 + crop_w + SEARCH, y1 + 2 * SEARCH))

    dx, dy, score = find_best_offset(left_padded, right_padded, search=SEARCH, mouth_box=(
        mouth_box[0] + SEARCH, mouth_box[1] + SEARCH, mouth_box[2] + SEARCH, mouth_box[3] + SEARCH
    ))
    print(f"refined offset for OPEN: dx={dx}, dy={dy}, mean diff={score:.2f}")

    # Apply offset to OPEN's source position (positive dx means sample further right)
    rx0_refined = rx0 + dx
    ry0_refined = y0 + dy
    right_crop = src.crop((rx0_refined, ry0_refined, rx0_refined + crop_w, ry0_refined + crop_h))

    print(f"left  crop x: [{lx0}, {lx0 + crop_w})  y: [0, {crop_h})")
    print(f"right crop x: [{rx0_refined}, {rx0_refined + crop_w})  y: [{ry0_refined}, {ry0_refined + crop_h})")

    left_t = floodfill_corners_to_transparent(left_crop)
    right_t = floodfill_corners_to_transparent(right_crop)

    # Body-stabilize OPEN: replace its body with CLOSED's body, feathered seam.
    right_t = composite_stable_body(right_t, left_t, crop_h)

    left_t.save(OUT_CLOSED)
    right_t.save(OUT_OPEN)
    print(f"saved: {OUT_CLOSED}")
    print(f"saved: {OUT_OPEN}")


def composite_stable_body(open_img, closed_img, crop_h):
    """Replace open_img's body (below split line) with closed_img's body,
    blending across a fade band. Preserves the open mouth on the head."""
    o = np.asarray(open_img.convert("RGBA"), dtype=np.float32)
    c = np.asarray(closed_img.convert("RGBA"), dtype=np.float32)
    h = o.shape[0]
    split_y = int(crop_h * BODY_SPLIT_FRAC)
    fade = BODY_FADE_PX
    fade_top = max(0, split_y - fade // 2)
    fade_bot = min(h, split_y + fade // 2)
    print(f"body split y={split_y}, fade [{fade_top}, {fade_bot}]")

    out = o.copy()
    if fade_bot > fade_top:
        ys = np.arange(fade_top, fade_bot, dtype=np.float32).reshape(-1, 1, 1)
        alpha = (ys - fade_top) / max(1, fade_bot - fade_top)
        out[fade_top:fade_bot] = o[fade_top:fade_bot] * (1 - alpha) + c[fade_top:fade_bot] * alpha
    out[fade_bot:] = c[fade_bot:]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), mode="RGBA")


if __name__ == "__main__":
    main()
