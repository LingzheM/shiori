#!/usr/bin/env python3
"""Check alignment between the English source and the Japanese translation.

Two levels of checking:
1. Paragraph count — must match exactly (a "paragraph" is a block of
   non-empty lines separated by one or more blank lines).
2. Per-paragraph length ratio (ja_chars / en_chars) — paragraphs whose
   ratio deviates strongly from the chapter median are flagged as WARN,
   which usually means a sentence was dropped (ratio too low) or content
   was added (ratio too high). WARNs are heuristic: re-read those
   paragraphs and confirm manually.

Usage:
    python check_alignment.py <source.txt> <translation.ja.txt>

Exit codes:
    0  paragraph counts match (WARNs, if any, are printed but non-fatal)
    1  paragraph counts differ
    2  usage error
"""
import re
import statistics
import sys

# Paragraphs shorter than this (in EN chars) are skipped in ratio stats:
# headings, one-line quotes etc. produce noisy ratios.
MIN_EN_CHARS_FOR_RATIO = 80
# Flag thresholds relative to the median ratio.
LOW_FACTOR = 0.6   # possible omission
HIGH_FACTOR = 1.7  # possible addition


def read_paragraphs(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        text = f.read().replace("\r\n", "\n")
    return [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2

    src_path, dst_path = sys.argv[1], sys.argv[2]
    src = read_paragraphs(src_path)
    dst = read_paragraphs(dst_path)

    print(f"source paragraphs:      {len(src)}  ({src_path})")
    print(f"translation paragraphs: {len(dst)}  ({dst_path})")

    if len(src) != len(dst):
        print("MISMATCH: paragraph counts differ — check for merged or missing paragraphs.")
        return 1

    print("OK: paragraph counts match.")

    # --- Level 2: per-paragraph length-ratio outliers ---
    ratios = []  # (index, ratio, en_len, ja_len)
    for i, (en, ja) in enumerate(zip(src, dst), start=1):
        en_len = len(re.sub(r"\s", "", en))
        ja_len = len(re.sub(r"\s", "", ja))
        if en_len == 0:
            continue
        ratios.append((i, ja_len / en_len, en_len, ja_len))

    eligible = [r for r in ratios if r[2] >= MIN_EN_CHARS_FOR_RATIO]
    if len(eligible) < 5:
        print("(ratio check skipped: too few sizable paragraphs)")
        return 0

    median = statistics.median(r[1] for r in eligible)
    print(f"median ja/en length ratio: {median:.2f}")

    warns = 0
    for i, ratio, en_len, ja_len in eligible:
        if ratio < median * LOW_FACTOR:
            print(f"WARN para {i}: ratio {ratio:.2f} is unusually LOW "
                  f"(en {en_len} ch -> ja {ja_len} ch) — possible missing sentence(s).")
            warns += 1
        elif ratio > median * HIGH_FACTOR:
            print(f"WARN para {i}: ratio {ratio:.2f} is unusually HIGH "
                  f"(en {en_len} ch -> ja {ja_len} ch) — possible added content.")
            warns += 1

    if warns == 0:
        print("OK: no length-ratio outliers.")
    else:
        print(f"{warns} paragraph(s) flagged — re-read them against the source to confirm.")
    return 0


if __name__ == "__main__":
    sys.exit(main())