# -*- coding: utf-8 -*-
"""
고난도 문제풀이 학습지 빌드 — 문항 이미지(스크린샷) → A4 양면 1장짜리 단일 HTML

사용법 (학습지 폴더에서):
    python _고난도문제풀이_빌드.py [문항이미지폴더]
    → 1단원_고난도문제풀이_학습지.html 생성 (이미지는 base64 로 내장, 외부 파일 없음)

하는 일
  1. 이미지마다 흰 여백을 잘라내고, 맨 위의 책 문항번호(파란 큰 숫자 + ▸코드)가 있으면 그 띠도 잘라낸다
  2. 맨 아래 선택지 줄의 ① 원 지름(px)을 재서 — 스크린샷마다 확대율이 달라도 —
     모든 문항이 같은 글자 크기로 인쇄되도록 표시 폭(mm)을 정한다
  3. PAGES 배치대로 2단 레이아웃 HTML 을 쓴다. 문항 아래 남는 세로 공간은 전부 풀이 칸이 된다

문항을 바꾸려면 PROBLEMS · PAGES 두 표만 고치고 다시 돌린다.
"""
import base64, io, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "고난도 문제풀이 학습지용 문항 이미지")
OUT = os.path.join(HERE, "1단원_고난도문제풀이_학습지.html")

# ① 원 지름의 인쇄 크기(mm). 수능완성 원본이 약 3.0mm → 0.74 배 = 2.22mm (A4 에 2쪽 모아찍기 정도의 크기)
CIRCLE_MM = 3.0 * 0.74

# 문항 — (표시 순서대로) 파일명, 출처 표기
PROBLEMS = [
    dict(id=1, file="생1 수능완성 88쪽 3번.png",   src="수능완성 생명과학Ⅰ 88쪽 3번"),
    dict(id=2, file="생1 수능완성 91쪽 11번.png",  src="수능완성 생명과학Ⅰ 91쪽 10번"),   # 파일명은 11번, 그림엔 10
    dict(id=3, file="생1 수능완성 86쪽 12번.png",  src="수능완성 생명과학Ⅰ 86쪽 11번"),   # 파일명은 12번, 그림엔 11
    dict(id=4, file="생1 수능완성 84쪽 7번.png",   src="수능완성 생명과학Ⅰ 84쪽 7번"),
    dict(id=5, file="생2 수능완성 49쪽 7번.png",   src="수능완성 생명과학Ⅱ 49쪽 7번"),
    dict(id=6, file="쪽생2 수능완성 52쪽 3번.png", src="수능완성 생명과학Ⅱ 52쪽 3번"),
    dict(id=7, file="생2 수능완성 55쪽 10번.png",  src="수능완성 생명과학Ⅱ 55쪽 10번"),
]

# 배치 — 쪽마다 [왼쪽 단, 오른쪽 단], 단마다 위→아래 문항 id. 단 폭은 그 단에서 가장 넓은 문항에 맞춘다
PAGES = [
    dict(title="사람의 유전과 유전병 (1~3)", cols=[[1, 2], [3]]),
    dict(title="사람의 유전병 · DNA의 구조와 복제 (4~7)", cols=[[4, 5], [6, 7]]),
]

PAGE_W, PAGE_H = 210, 297
PAD_T, PAD_R, PAD_B, PAD_L = 7, 9, 6, 9
HEADER_MM, FOOTER_MM = 16, 8            # 헤더·푸터가 차지하는 세로(대략)
COL_GAP_MM, PROB_GAP_MM = 4, 3
PROB_HEAD_MM = 5.5                      # 문항 번호 줄
CONTENT_W = PAGE_W - PAD_L - PAD_R      # 192
CONTENT_H = PAGE_H - PAD_T - PAD_B - HEADER_MM - FOOTER_MM   # 260


def load_flat(path):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    return bg.convert("RGB")


def bands(mask_rows, gap=3):
    """ink 가 있는 행들을 gap 이하 간격으로 묶어 (y0, y1) 띠 목록으로"""
    ys = np.where(mask_rows)[0]
    if len(ys) == 0:
        return []
    out, s, p = [], ys[0], ys[0]
    for y in ys[1:]:
        if y - p > gap:
            out.append((s, p)); s = y
        p = y
    out.append((s, p))
    return out


def crop_problem(im):
    """여백 제거 + 책 문항번호 띠 제거. 잘라낸 이미지를 돌려준다"""
    a = np.array(im)
    gray = a.mean(axis=2)
    ink = gray < 235
    # 잡점(외따로 찍힌 점)을 무시하려고 열/행마다 최소 잉크 픽셀 수를 요구한다
    cols = np.where(ink.sum(axis=0) >= 5)[0]
    rows = np.where(ink.sum(axis=1) >= 3)[0]
    x0, x1, y0, y1 = cols.min(), cols.max() + 1, rows.min(), rows.max() + 1

    # 맨 위 띠가 '색깔 있는 큰 숫자'(책 문항번호)면 잘라낸다
    sat = a.max(axis=2).astype(int) - a.min(axis=2).astype(int)   # 채도 비슷한 값
    colored = (sat > 60) & ink
    top_bands = bands(ink.sum(axis=1) >= 3)
    if top_bands:
        b0, b1 = top_bands[0]
        if b1 < 60 and colored[b0:b1 + 1].sum() > 30:
            y0 = top_bands[1][0] if len(top_bands) > 1 else b1 + 1

    pad = 4
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def circle_px(im):
    """맨 아래 선택지 줄의 첫 덩어리(①)의 폭 — 글자 크기의 대용"""
    ink = np.array(im).mean(axis=2) < 200
    rowink = ink.sum(axis=1) >= 2
    last = bands(rowink, gap=4)[-1]
    band = ink[last[0]:last[1] + 1]
    xs = np.where(band.any(axis=0))[0]
    s = e = xs[0]
    colany = band.any(axis=0)
    while e + 1 < len(colany) and colany[e + 1]:
        e += 1
    return e - s + 1


def to_b64(im):
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


# ── 1. 이미지 처리 ────────────────────────────────────────────────
byid = {}
for p in PROBLEMS:
    path = os.path.join(IMG_DIR, p["file"])
    im = crop_problem(load_flat(path))
    c = circle_px(im)
    mm_per_px = CIRCLE_MM / c
    p.update(img=im, circle=c, w_mm=im.width * mm_per_px, h_mm=im.height * mm_per_px, b64=to_b64(im))
    byid[p["id"]] = p
    print(f"[{p['id']}] {p['file']:30s} crop={im.width}x{im.height}px  ①={c}px  → {p['w_mm']:.1f}×{p['h_mm']:.1f}mm")

# ── 2. 배치 검산 ──────────────────────────────────────────────────
ok = True
for pi, pg in enumerate(PAGES, 1):
    widths = [max(byid[i]["w_mm"] for i in col) for col in pg["cols"]]
    total_w = sum(widths) + COL_GAP_MM * (len(widths) - 1)
    print(f"\n쪽 {pi}: 단 폭 {[f'{w:.1f}' for w in widths]} 합 {total_w:.1f}mm / {CONTENT_W}mm")
    if total_w > CONTENT_W:
        print("   ★ 가로가 넘친다 — CIRCLE_MM 을 줄이거나 배치를 바꿀 것"); ok = False
    for ci, col in enumerate(pg["cols"]):
        used = sum(byid[i]["h_mm"] + PROB_HEAD_MM for i in col) + PROB_GAP_MM * (len(col) - 1)
        spare = CONTENT_H - used
        print(f"   {'왼' if ci == 0 else '오른'}쪽 단 {col}: 문항 {used:.0f}mm → 풀이 칸 합 {spare:.0f}mm (문항당 {spare / len(col):.0f}mm)")
        if spare < 10 * len(col):
            print("   ★ 세로가 부족하다 — CIRCLE_MM 을 줄이거나 배치를 바꿀 것"); ok = False
    pg["widths"] = widths
if not ok:
    sys.exit("배치가 맞지 않아 HTML 을 쓰지 않았다.")

# ── 3. HTML ───────────────────────────────────────────────────────
CSS = f"""
:root{{
  --blue-pastel:#C5E3F7; --green-pastel:#C3E9CC;
  --blue-dark:#1255A0;   --green-dark:#2A7A38;
  --red-accent:#C0392B;  --amber:#E67E22;
  --text-main:#1A1A1A;   --text-light:#555;
  --line:#BBBBBB;        --white:#ffffff;
}}
*{{margin:0;padding:0;box-sizing:border-box;}}
body{{font-family:'Noto Sans KR',sans-serif;font-size:10pt;color:var(--text-main);
     background:#d0d0d0;display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px;}}
.page{{width:{PAGE_W}mm;height:{PAGE_H}mm;background:var(--white);box-shadow:0 2px 14px rgba(0,0,0,.18);
      display:flex;flex-direction:column;padding:{PAD_T}mm {PAD_R}mm {PAD_B}mm {PAD_L}mm;overflow:hidden;}}

.page-header{{display:flex;justify-content:space-between;align-items:flex-end;
             padding-bottom:5px;border-bottom:2.5px solid var(--blue-dark);margin-bottom:3mm;flex-shrink:0;}}
.header-left .subject{{font-size:13pt;font-weight:700;color:var(--blue-dark);}}
.header-left .breadcrumb{{font-size:7.5pt;color:var(--text-light);margin-top:2px;white-space:nowrap;}}
.header-right{{display:flex;gap:14px;flex-shrink:0;white-space:nowrap;}}
.input-field{{font-size:9pt;display:flex;align-items:center;gap:5px;}}
.input-field .uline{{display:inline-block;width:74px;height:15px;border-bottom:1.5px solid var(--text-main);}}

.page-footer{{display:flex;justify-content:center;align-items:center;padding-top:4px;
             border-top:1px solid var(--line);flex-shrink:0;margin-top:2.5mm;}}
.page-badge{{background:var(--blue-pastel);color:var(--blue-dark);font-size:8.5pt;
            font-weight:700;padding:2px 14px;border-radius:12px;}}

.page-content{{flex:1;min-height:0;display:flex;gap:{COL_GAP_MM}mm;}}
.col{{display:flex;flex-direction:column;gap:{PROB_GAP_MM}mm;min-height:0;}}
.col.grow{{flex:1;min-width:0;}}

/* 문항 = 번호 줄 + 문항 이미지 + 풀이 칸(남는 세로를 모두 차지) */
.prob{{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;}}
.prob-head{{display:flex;align-items:center;gap:6px;height:{PROB_HEAD_MM}mm;flex-shrink:0;}}
.prob-head .num{{display:inline-flex;align-items:center;justify-content:center;
                width:5mm;height:5mm;border-radius:50%;background:var(--blue-dark);color:#fff;
                font-size:8.5pt;font-weight:700;line-height:1;}}
.prob-head .src{{font-size:7pt;color:var(--text-light);}}
.prob img{{display:block;flex-shrink:0;max-width:100%;}}
.notes{{flex:1;min-height:8mm;margin-top:1.5mm;border:1px solid #DDD;border-radius:3px;position:relative;
       background-color:#fff;
       background-image:radial-gradient(circle,#CFCFCF 0.3mm,transparent 0.36mm);
       background-size:5mm 5mm;background-position:2.5mm 2.5mm;}}
.notes .tag{{position:absolute;top:1mm;left:2mm;font-size:6.5pt;color:#AAA;letter-spacing:1px;}}

@page{{size:A4;margin:0;}}
@media print{{
  body{{background:none;padding:0;gap:0;}}
  .page{{box-shadow:none;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  .page:last-child{{page-break-after:avoid;}}
}}
"""


def prob_html(p, col_w):
    w = min(p["w_mm"], col_w)
    return f"""
      <div class="prob">
        <div class="prob-head"><span class="num">{p['id']}</span><span class="src">{p['src']}</span></div>
        <img src="data:image/png;base64,{p['b64']}" style="width:{w:.1f}mm" alt="문항 {p['id']}">
        <div class="notes"><span class="tag">풀이</span></div>
      </div>"""


pages_html = []
n = len(PAGES)
for pi, pg in enumerate(PAGES, 1):
    cols_html = []
    for ci, col in enumerate(pg["cols"]):
        last = ci == len(pg["cols"]) - 1
        w = pg["widths"][ci]
        if last:   # 마지막 단은 남는 가로를 모두 차지
            w = CONTENT_W - sum(pg["widths"][:-1]) - COL_GAP_MM * (len(pg["cols"]) - 1)
            style = 'class="col grow"'
        else:
            style = f'class="col" style="width:{w:.1f}mm;flex-shrink:0"'
        cols_html.append(f'    <div {style}>' + "".join(prob_html(byid[i], w) for i in col) + "\n    </div>")
    pages_html.append(f"""
<!-- ══════════════ PAGE {pi} ══════════════ -->
<div class="page">
  <div class="page-header">
    <div class="header-left">
      <div class="subject">생물의 유전</div>
      <div class="breadcrumb">Ⅰ. 유전자와 유전물질 › 고난도 문제풀이 — {pg['title']}</div>
    </div>
    <div class="header-right">
      <div class="input-field">학번<span class="uline"></span></div>
      <div class="input-field">이름<span class="uline"></span></div>
    </div>
  </div>
  <div class="page-content">
{chr(10).join(cols_html)}
  </div>
  <div class="page-footer"><div class="page-badge">Ⅰ단원 고난도 문제풀이 · {pi} / {n}</div></div>
</div>""")

html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>고난도 문제풀이 학습지 — 생물의 유전 Ⅰ단원</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
<!-- 이 파일은 _고난도문제풀이_빌드.py 가 만든다. 문항을 바꾸려면 스크립트의 PROBLEMS·PAGES 를 고치고 다시 돌릴 것 -->
{"".join(pages_html)}
</body>
</html>
"""
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
print(f"\n→ {OUT}  ({os.path.getsize(OUT) / 1024:.0f} KB)")
