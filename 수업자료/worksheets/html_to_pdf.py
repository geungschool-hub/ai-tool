"""
HTML → PDF 일괄 변환 스크립트 (Playwright 기반)
- 헤더/푸터(날짜·제목) 없음
- 여백 0 (CSS 패딩만 적용)
- 배경색·이미지 인쇄 적용
- Google Fonts 로드 대기

사용법:
  python html_to_pdf.py                        # 학습지 폴더 내 모든 HTML 변환
  python html_to_pdf.py 파일1.html              # 특정 파일만
  python html_to_pdf.py 파일1.html 파일2.html   # 여러 파일 지정
"""

import os
import sys
import glob
from playwright.sync_api import sync_playwright

def html_to_pdf(page, html_path, output_dir):
    abs_html = os.path.abspath(html_path)
    basename = os.path.splitext(os.path.basename(html_path))[0]
    pdf_path = os.path.join(output_dir, basename + ".pdf")

    url = "file:///" + abs_html.replace("\\", "/")

    page.goto(url, wait_until="networkidle", timeout=30000)

    page.pdf(
        path=pdf_path,
        format="A4",
        print_background=True,
        display_header_footer=False,
        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
    )
    return pdf_path

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))

    if len(sys.argv) > 1:
        targets = []
        for arg in sys.argv[1:]:
            path = arg if os.path.isabs(arg) else os.path.join(script_dir, arg)
            targets.append(path)
    else:
        targets = [
            f for f in glob.glob(os.path.join(script_dir, "*.html"))
            if "_template" not in os.path.basename(f)
        ]

    if not targets:
        print("[오류] 변환할 HTML 파일이 없습니다.")
        sys.exit(1)

    output_dir = os.path.join(script_dir, "pdf_output")
    os.makedirs(output_dir, exist_ok=True)
    print(f"[출력 폴더] {output_dir}\n")

    ok, fail = [], []

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()

        for html_path in targets:
            name = os.path.basename(html_path)
            if not os.path.exists(html_path):
                print(f"  [스킵] {name} — 파일 없음")
                fail.append(name)
                continue
            print(f"  변환 중: {name} ...", end=" ", flush=True)
            try:
                result = html_to_pdf(page, html_path, output_dir)
                print(f"완료 → {os.path.basename(result)}")
                ok.append(name)
            except Exception as e:
                print(f"실패 ({e})")
                fail.append(name)

        browser.close()

    print(f"\n완료 {len(ok)}개 / 실패 {len(fail)}개")
    if fail:
        print("실패 목록:", ", ".join(fail))

if __name__ == "__main__":
    main()
