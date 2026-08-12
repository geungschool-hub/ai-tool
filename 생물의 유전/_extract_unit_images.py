"""
생물의 유전 교과서 — 단원별 내장 이미지 추출 + 캡션 매핑
=========================================================
사용법:
  python _extract_unit_images.py <단원키>       # 예: 1-1
  python _extract_unit_images.py all            # 전체 소단원

- 원본(학생용) PDF에서 추출하되, 파일명에 '책 쪽번호'를 그대로 새긴다 (p012_img1_885x821.png)
- 내장 이미지 근처의 캡션 텍스트(그림 Ⅰ-3 …)를 찾아 매니페스트(_manifest.txt)에 기록
- 80px 미만(아이콘·장식)은 건너뜀. 같은 xref가 여러 번 나오면 첫 등장만 저장하고 재등장은 기록만.
"""
import sys, os, re
import fitz

SRC = os.path.join(os.path.dirname(__file__), "고_생물의유전(이준규)_교과서_2쇄.pdf")
OUT_ROOT = os.path.join(os.path.dirname(__file__), "교과서_이미지")

UNITS = {
    "1-1": ("1-1_유전의기본원리", 12, 19),
    "1-2": ("1-2_사람의유전", 20, 29),
    "1-3": ("1-3_사람의유전병", 30, 37),
    "1-4": ("1-4_유전물질과유전체의구성", 38, 45),
    "1-5": ("1-5_DNA복제", 46, 49),
    "2-1": ("2-1_중심원리와유전정보의해독", 60, 69),
    "2-2": ("2-2_유전자발현조절", 70, 77),
    "2-3": ("2-3_세포분화와발생", 78, 85),
    "3-1": ("3-1_생명공학기술의발달", 96, 101),
    "3-2": ("3-2_생명공학기술의활용", 102, 115),
    "3-3": ("3-3_생명공학기술의발달과사회적책임", 116, 121),
}

CAP_RE = re.compile(r"(그림\s*[ⅠⅡⅢI]+\s*-\s*\d+[^\n]{0,60}|표\s*[ⅠⅡⅢI]+\s*-\s*\d+[^\n]{0,60})")


def caption_near(page, rect):
    """이미지 배치 사각형 주변(아래 우선)의 캡션/텍스트 한 줄."""
    W = page.rect.width
    below = fitz.Rect(0, rect.y1 - 6, W, min(rect.y1 + 46, page.rect.height))
    around = fitz.Rect(0, max(rect.y0 - 30, 0), W, min(rect.y1 + 60, page.rect.height))
    for zone in (below, around):
        t = page.get_text(clip=zone)
        m = CAP_RE.search(t)
        if m:
            return " ".join(m.group(0).split())
    t = " ".join(page.get_text(clip=below).split())
    return t[:60] if t else ""


def extract_unit(key, seen):
    name, a, b = UNITS[key]
    outdir = os.path.join(OUT_ROOT, name)
    os.makedirs(outdir, exist_ok=True)
    doc = fitz.open(SRC)
    lines = [f"# {name} (책 p.{a}~{b})"]
    n_saved = 0
    for pno in range(a, b + 1):
        page = doc[pno - 1]
        for idx, info in enumerate(page.get_images(full=True), start=1):
            xref = info[0]
            try:
                base = doc.extract_image(xref)
            except Exception:
                continue
            iw, ih = base["width"], base["height"]
            if iw < 80 or ih < 80:
                continue
            rects = page.get_image_rects(xref)
            cap = caption_near(page, rects[0]) if rects else ""
            if xref in seen:
                lines.append(f"p{pno:03d} (재등장) -> {seen[xref]} | {cap}")
                continue
            fname = f"p{pno:03d}_img{idx}_{iw}x{ih}.{base['ext']}"
            with open(os.path.join(outdir, fname), "wb") as f:
                f.write(base["image"])
            seen[xref] = fname
            n_saved += 1
            lines.append(f"{fname} | {cap}")
    doc.close()
    manifest = os.path.join(outdir, "_manifest.txt")
    with open(manifest, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"[{name}] 저장 {n_saved}개")
    for ln in lines[1:]:
        print("  " + ln)
    return n_saved


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    keys = list(UNITS) if arg == "all" else [arg]
    seen = {}
    total = 0
    for k in keys:
        total += extract_unit(k, seen)
    print(f"\n총 저장 {total}개 -> {OUT_ROOT}")
