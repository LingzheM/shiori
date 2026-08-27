#!/usr/bin/env python3
"""Convert a clean Japanese .ja.txt into a TTS-friendly .tts.txt for
ElevenLabs / OpenAI TTS (neural engines that rely on punctuation, not SSML).

Deterministic rules only — no guessing, no rewriting of wording. The source
.ja.txt is never modified; output is written alongside as <name>.tts.txt.

Usage:
    python prep_tts.py <input.ja.txt>            # writes <input>.tts.txt
    python prep_tts.py <input.ja.txt> --report   # also print what changed

What it does:
  1. Section breaks ＊ ＊ ＊ (any spacing) -> a blank-line gap = long pause.
  2. Emphasis brackets 〈 〉《 》 -> removed (kept the text inside).
  3. Kanji-numeral YEARS  一八八〇年 -> 1880年  (fixes digit-by-digit misreads).
  4. Dashes ―― / — / --  -> 、 inside a clause, 。 at sentence-ish boundaries.
  5. Full-width space inside a line collapsed to nothing (TTS reads it as pause).
  6. Trims trailing spaces; normalises 3+ blank lines to exactly 2.

It deliberately does NOT touch: proper nouns, katakana, quantity+unit numbers
(六フィート, 八分の一マイル), or sentence structure — those need judgement and
are handled in a second model pass, not here.
"""
import re
import sys

KAN = "〇一二三四五六七八九"
KAN2ARABIC = {c: str(i) for i, c in enumerate(KAN)}


def kanji_year_to_arabic(text: str) -> str:
    """Convert a run of kanji digits immediately followed by 年 to arabic.
    一八八〇年 -> 1880年.  Only touches the digit-run + 年 pattern, so
    counting numbers like 十数人 or 六百ポンド are left alone."""
    def repl(m):
        digits = "".join(KAN2ARABIC[c] for c in m.group(1))
        return digits + "年"
    # 3-4 kanji digits (covers years) directly before 年
    return re.sub(rf"([{KAN}]{{3,4}})年", repl, text)


def fix_dashes(line: str) -> str:
    r"""Replace ―― / — runs. Heuristic: if what follows the dash starts a new
    grammatical unit ending the sentence soon, a 。 fits; otherwise 、.
    We keep it simple and safe: a dash run becomes 、 (a natural pause) unless
    it sits right before end-of-line, where it becomes 。."""
    line = re.sub(r"[―—]{1,}\s*$", "。", line)      # trailing dash -> 。
    line = re.sub(r"[―—]{1,}", "、", line)           # internal dash -> 、
    line = re.sub(r"-{2,}", "、", line)               # ascii -- -> 、
    return line


def is_heading(line: str, index: int) -> bool:
    """判断是否章节标题：靠前几行、较短、无句末标点、且像标题。
    例：'第四章　尾を追って' / '4' / '尾を追って'。"""
    s = line.strip()
    if not s or index > 3:
        return False
    if len(s) > 30:
        return False
    if s[-1] in "。？！、":
        return False
    # 含"第X章/話/節"或纯数字或极短行，视为标题
    if re.search(r"第[〇一二三四五六七八九十百\d]+[章話節]", s):
        return True
    if re.fullmatch(r"[\d〇一二三四五六七八九十]+", s):
        return True
    if len(s) <= 20:
        return True
    return False


def process(text: str):
    changes = []
    lines = text.replace("\r\n", "\n").split("\n")
    out = []
    for idx, ln in enumerate(lines):
        original = ln
        # 章节标题：保留原文，但确保其后是双空行（长停顿），不参与破折号等替换
        if is_heading(ln, idx):
            out.append(ln.strip())
            out.append("")  # 标题后强制空行，合并阶段成为较长停顿
            if ln.strip() != original:
                changes.append(("heading", original, ln.strip()))
            continue
        # section marker line -> becomes an empty line (blank-line pause)
        if re.fullmatch(r"[＊*\s]+", ln) and "＊" in ln or re.fullmatch(r"\s*[*＊]\s*[*＊]\s*[*＊]\s*", ln):
            out.append("")
            changes.append(("section-break", original, "(blank line)"))
            continue
        ln = ln.replace("〈", "").replace("〉", "").replace("《", "").replace("》", "")
        ln = kanji_year_to_arabic(ln)
        ln = fix_dashes(ln)
        ln = ln.replace("\u3000", "")   # full-width space inside a line
        ln = ln.rstrip()
        if ln != original:
            changes.append(("edit", original, ln))
        out.append(ln)

    joined = "\n".join(out)
    joined = re.sub(r"\n{3,}", "\n\n", joined)   # cap blank runs at 2
    return joined.strip() + "\n", changes


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    report = "--report" in sys.argv
    if len(args) != 1:
        print(__doc__)
        return 2
    src = args[0]
    with open(src, encoding="utf-8") as f:
        text = f.read()
    result, changes = process(text)
    dst = re.sub(r"\.ja\.txt$", "", src)
    dst = re.sub(r"\.txt$", "", dst) + ".tts.txt"
    with open(dst, "w", encoding="utf-8") as f:
        f.write(result)
    print(f"wrote {dst}  ({len(changes)} lines changed)")
    if report:
        for kind, a, b in changes:
            print(f"  [{kind}] {a!r} -> {b!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
