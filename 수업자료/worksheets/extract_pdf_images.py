"""
PDF 이미지 추출 스크립트
========================
사용법:
  python extract_pdf_images.py <PDF파일경로> [출력폴더명]

예시:
  python extract_pdf_images.py 교과서.pdf pdf_images

기능:
  1. PDF 각 페이지를 고해상도 PNG로 렌더링 (페이지 전체 이미지)
  2. PDF에 내장된 이미지를 개별 추출
  3. 추출 결과 목록을 출력 → HTML에서 참조할 경로 확인용
"""

import sys
import os
import fitz  # PyMuPDF


def extract(pdf_path: str, out_dir: str = "pdf_images", dpi: int = 150):
    os.makedirs(out_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    total_pages = len(doc)

    print(f"\n{'='*55}")
    print(f"  PDF: {os.path.basename(pdf_path)}  ({total_pages}페이지)")
    print(f"  출력: {os.path.abspath(out_dir)}")
    print(f"{'='*55}\n")

    page_files = []   # 페이지 렌더링 결과
    img_files  = []   # 내장 이미지 추출 결과

    zoom = dpi / 72
    mat  = fitz.Matrix(zoom, zoom)

    for page_num in range(total_pages):
        page = doc[page_num]
        pn   = page_num + 1

        # ── 1. 페이지 전체 렌더링 ─────────────────────
        pix  = page.get_pixmap(matrix=mat, alpha=False)
        w, h = pix.width, pix.height
        fname = f"p{pn:02d}_page_{w}x{h}.png"
        fpath = os.path.join(out_dir, fname)
        pix.save(fpath)
        page_files.append(fname)
        print(f"  [페이지 {pn:02d}] {fname}")

        # ── 2. 내장 이미지 추출 ───────────────────────
        img_list = page.get_images(full=True)
        for img_idx, img_info in enumerate(img_list, start=1):
            xref = img_info[0]
            try:
                base_img = doc.extract_image(xref)
                ext      = base_img["ext"]          # png / jpeg 등
                iw       = base_img["width"]
                ih       = base_img["height"]
                img_data = base_img["image"]

                # 너무 작은 이미지(아이콘·배경 등)는 건너뜀
                if iw < 80 or ih < 80:
                    continue

                ifname = f"p{pn:02d}_img{img_idx}_{iw}x{ih}.{ext}"
                ifpath = os.path.join(out_dir, ifname)
                with open(ifpath, "wb") as f:
                    f.write(img_data)
                img_files.append(ifname)
                print(f"    └─ 내장이미지 {img_idx}: {ifname}")
            except Exception:
                pass

    doc.close()

    # ── 결과 요약 ─────────────────────────────────────
    print(f"\n{'─'*55}")
    print(f"  페이지 렌더링: {len(page_files)}개")
    print(f"  내장 이미지:   {len(img_files)}개")
    print(f"\n  HTML에서 사용할 때:")
    print(f"  <img src=\"{out_dir}/파일명.png\" ...>")
    print(f"  또는 SVG <image href=\"{out_dir}/파일명.png\" .../>")
    print(f"{'─'*55}\n")

    return page_files, img_files


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python extract_pdf_images.py <PDF경로> [출력폴더명]")
        sys.exit(1)

    pdf_path = sys.argv[1]
    out_dir  = sys.argv[2] if len(sys.argv) >= 3 else "pdf_images"

    if not os.path.exists(pdf_path):
        print(f"오류: 파일을 찾을 수 없습니다 - {pdf_path}")
        sys.exit(1)

    extract(pdf_path, out_dir)
