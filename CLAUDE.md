# 수업자료 제작 프로젝트

## 사용자 정보
- 직업: 고등학교 교사 (2학년 담임)
- 담당 수업: 생명과학 (일반선택, 2학년, 한 학기)
- 부서 업무: 학생맞춤통합지원, 위탁교육과정, 학력평가

## 2022 개정 과학과 교육과정 과목 구조

| 구분 | 과목 |
|------|------|
| 공통과목 | 통합과학1, 통합과학2, 과학탐구실험1, 과학탐구실험2 |
| 일반선택 | 생명과학 |
| 진로선택 | 세포와 물질대사, 생물의 유전 |

### 생명과학 (일반선택) 성취기준 요약
- 참고 파일: `2022 science curriculum_utf8.txt` (폴더 내 존재, UTF-8 인코딩)
- 생명과학 섹션 시작: 2563번째 줄

| 영역 | 성취기준 코드 | 주요 내용 |
|------|--------------|-----------|
| 생명 시스템의 구성 | 12생과01-01 ~ 07 | 생명과학의 이해, 생명의 구성 단계, 물질대사, 기관계, 생태계, 개체군, 군집 |
| 항상성과 몸의 조절 | 12생과02-01 ~ 07 | 뉴런, 전도와 시냅스 전달, 신경계, 내분비계, 항상성, 면역, 백신 |
| 생명의 연속성과 다양성 | 12생과03-01 ~ 05 | 염색체·DNA·유전자, 생식세포 형성, 진화, 생물 분류 체계, 계통수 |

---

## 학습지 HTML 양식

폴더에 두 가지 디자인 계열이 있으며, **신규 제작 시 양식 B(파랑 계열)를 기본으로 사용**한다.

### 양식 A — 틸/초록 계열 (구형, 단순)
대표 파일: `worksheets/01_신경세포_구조와기능_학습지.html`
- 단일 HTML, `@page` CSS로 A4 인쇄, 외부 폰트 없음, 단일 페이지
- 색상 토큰: `--deep:#276e68 --main:#3d9890 --soft:#5aada8 --tint:#e5f4f2 --pale:#f2faf9`
- 빈칸 `.blank`: 인라인 블록, 배경 #e8f5f3, bottom border 1.5px #276e68

### 양식 B — 파랑/초록 계열 (신형, 다중 페이지) ← 기본 사용
대표 파일: `worksheets/신경신호의전달_학습지_v2.html`, `worksheets/사람의신경계_학습지.html`

#### 구조
- `body` 배경 #d0d0d0 (용지 배경 연출)
- **`.page` div** = A4 (210mm × 297mm, box-shadow)
- 여러 `.page`를 세로 나열 → 다중 페이지
- 외부 폰트: Noto Sans KR (Google Fonts)

#### 색상 토큰
```css
--blue-pastel: #C5E3F7
--green-pastel: #C3E9CC
--blue-dark:   #1255A0
--green-dark:  #2A7A38
--red-accent:  #C0392B
--amber:       #E67E22
--text-main:   #1A1A1A
--text-light:  #555
--line:        #BBBBBB
```

#### 페이지 레이아웃
```
.page
  ├── .page-header  (과목명 + breadcrumb | 학번 + 이름)
  ├── .page-content (섹션들)
  └── .page-footer  (.page-badge — 페이지 번호/구분)
```

#### 헤더
- 좌: `.subject` (13pt, bold, blue-dark) + `.breadcrumb` (7.5pt, 단원 경로)
- 우: 학번/이름 (`.uline` — 90px 밑줄)
- 하단: 2.5px blue-dark 구분선

#### 주요 컴포넌트
- **섹션 제목** `.section-title`: left border 4px blue-dark, 배경 blue-pastel; `.green` 변형 있음
- **빈칸**: `.b`(72px) `.b.sm`(50px) `.b.lg`(108px) `.b.xl`(136px) `.b.xs`(32px) — bottom border 1.8px
- **정보 박스** `.info-box`: 테두리 #BBBBBB, 배경 #FAFAFA, line-height 2.1~2.3
- **표** `.data-table`: thead 배경 blue-pastel (`.g`는 green-pastel), 테두리 #BBBBBB
- **흐름도** `.flow-chart` / `.flow-box` / `.flow-arrow`: flex, blue-dark 색상
- **인라인 SVG**: 번호 원형(fill blue/green-dark), `<image>` 태그로 외부 이미지 참조 가능

#### 인쇄 CSS
```css
@media print {
  body { background:none; padding:0; gap:0; }
  .page { box-shadow:none; page-break-after:always; -webkit-print-color-adjust:exact; }
  .page:last-child { page-break-after:avoid; }
}
```

#### 이미지 오버레이 패턴
```html
<!-- .img-wrap: relative 컨테이너 / .overlay: absolute SVG (viewBox = 원본 픽셀 크기) -->
<div class="img-wrap">
  <img src="pdf_images/파일명.png" style="width:100%">
  <svg class="overlay" viewBox="0 0 885 821" xmlns="http://www.w3.org/2000/svg">
    <!-- origin dot → callout line → numbered circle -->
    <circle cx="260" cy="310" r="6" fill="#1255A0" stroke="white" stroke-width="2"/>
    <line x1="260" y1="310" x2="88" y2="152" stroke="#1255A0" stroke-width="2" stroke-dasharray="5,3"/>
    <circle cx="72" cy="136" r="20" fill="#1255A0"/>
    <text x="72" y="143" text-anchor="middle" font-size="20" fill="white" font-weight="bold">①</text>
  </svg>
</div>
```

#### 정답지 변환 규칙
- 빈칸 `<span class="b ..."></span>` → `<span class="ans">정답텍스트</span>`
- `.ans` CSS: `color:#C0392B; font-weight:700; border-bottom:1.8px solid #C0392B; display:inline-block; padding:0 3px;`
- 헤더 border-bottom 색: blue-dark → red-accent
- 학번/이름 영역 → `【 정 답 지 】` 배지 (red border, red text)
- subject 라벨: "생명과학 — 정답지"

---

## 템플릿 및 유틸리티 파일

| 파일 | 설명 |
|------|------|
| `worksheets/_template.html` | 양식 B 순수 빈 템플릿. 수정 위치 `<!-- ◀ -->` 표시. 섹션 제목 4색 변형, 2페이지·SVG 영역 주석 처리 |
| `worksheets/extract_pdf_images.py` | PyMuPDF 기반 PDF 이미지 추출 스크립트 |

### PDF 이미지 활용 루틴
교과서 이미지를 직접 활용하는 것이 SVG 직접 제작보다 효율적. PDF가 제공될 때마다 실행.

```bash
# Run inside the worksheets folder
python extract_pdf_images.py <PDF경로> pdf_images_<단원명>
```

출력된 파일명 목록으로 어떤 이미지가 있는지 파악한 후, 아래 3가지 패턴 중 선택:
- **패턴 1**: 이미지 단독 + `.img-caption` 캡션
- **패턴 2**: 이미지 위에 SVG 번호 레이블 오버레이 (`.img-wrap` + `.overlay`)
- **패턴 3**: 이미지 + 옆에 빈칸 채우기 (2열 flex)

---

## 완성된 학습지 목록

### 파일명 규칙 (2-3부터 적용)
- 형식: `소단원번호_제목_학습지.html` (예: `2-3_내분비계와항상성유지_학습지.html`)
- **쪽번호는 전체 학습지 통합 기준으로 연속 부여**

| 파일 | 내용 | 쪽 | 상태 |
|------|------|----|------|
| `worksheets/신경신호의전달_학습지_v2.html` | 2-1 신경신호의 전달 — 학생용 | 1~2 | 완성 |
| `worksheets/신경신호의전달_정답지_v2.html` | 2-1 신경신호의 전달 — 정답지 | 1~2 | 완성 |
| `worksheets/사람의신경계_학습지.html` | 2-2 사람의 신경계 — 학생용 | 3~4 | 완성 |
| `worksheets/사람의신경계_정답지.html` | 2-2 사람의 신경계 — 정답지 | 3~4 | 완성 |
| `worksheets/2-3_내분비계와항상성유지_학습지.html` | 2-3 내분비계와 항상성 유지 — 학생용 | 5~6 | 완성 |
| `worksheets/2-3_내분비계와항상성유지_정답지.html` | 2-3 내분비계와 항상성 유지 — 정답지 | 5~6 | 완성 |

### 신경신호의전달 v2 구성 메모
- **Page 1 A섹션**: 뉴런 구조 3-box flow + Na⁺/K⁺ 분포 박스 + 막전위 용어
- **Page 1 B섹션**: 4단계 활동전위 박스 + 이온채널 상태 표 + SVG 그래프 + 실무율
- **Page 2 C섹션**: 민말이집(`p05_img5`) + 말이집(`p07_img2`) 이미지 + 오버레이 + 비교표
- **Page 2 D섹션**: 시냅스 이미지(`p07_img1`, 885×821px) + 오버레이(①②③④) + 전달 과정 5단계
- 이미지 폴더: `worksheets/pdf_images_신경신호/`

### 사람의신경계 구성 메모
- **Page 1 A섹션**: 신경계 구성 계층도 + `p07_img1`(뇌+척수 측면도) 이미지
- **Page 1 B섹션**: 뇌 시상단면 `p03_img3`(372×363px) + SVG 오버레이(①대뇌 ②사이뇌 ③소뇌 ④⑤⑥뇌줄기) + 기능 표
- **Page 2 C섹션**: 척수 구조 `p05_img1`(650×443px) 이미지 + 빈칸레이블(①겉질/백색질 ②속질/회색질 ③후근 ④전근) + 척수반사 흐름도·비교표
- **Page 2 D섹션**: 신경절 위치·뉴런 길이 비교 SVG 다이어그램(체성/교감/부교감 3행) + 비교표
  - 교감: 신경절 척추 근처 → 이전짧음/이후긺, ACh→노르에피네프린
  - 부교감: 신경절 효과기 근처 → 이전긺/이후짧음, ACh→ACh
- **Page 2 E섹션**: 길항작용 표(6기관) + 핵심정리·예외 info-box
- 이미지 폴더: `worksheets/pdf_images_신경계/` (2-2. 사람의 신경계.pdf 에서 추출)

---

## 작업 원칙

### 언어
- 기본 소통 언어: 한국어
- 수업자료 내 용어: 한국 교육과정 기준 용어 사용 (필요시 영문 병기)

### 자료 형식
- 특정 형식을 고정하지 않고 요청 시 용도에 맞는 형식으로 제작
- (예: 인쇄용 PDF 구성, 인터랙티브 HTML, 학습지, 시험 문항 등)

---

## 제작 노하우

### CSS — 색상 변형 클래스 누락 주의
- `.section-title.amber`, `th.r`, `th.y` 등은 개별 파일 CSS에 없으면 기본 파란색으로 fallback됨
- 새 색상 변형 사용 시 `<style>` 블록에 반드시 함께 추가

```css
.section-title.amber { border-left-color:var(--amber); background:#FDE9C9; }
.data-table th.r { background:#F7C5C5; }   /* 붉은 계열 */
.data-table th.y { background:#FDE9C9; }   /* 노란 계열 */
```

### CSS — 섹션 색계열 통일
- 섹션 제목 배경색 = 표 헤더 배경색 값으로 맞출 것
- 중요 행 강조 테두리(imp 클래스)도 해당 섹션 색계열에 맞게 설정

### CSS — 표 셀 정렬
- 모든 td: `text-align:center` + `vertical-align:middle` 필수
- `vertical-align:top` 사용 금지 (`.data-table.detail td` 포함)
- `td.left` 클래스 사용 금지

### CSS — 셀 텍스트 줄바꿈 방지
- 소량만 다음 줄로 넘어갈 경우, 해당 셀에만 인라인 `style="font-size:Xpt"` 적용
- 표 전체 font-size를 줄이지 말 것

### 2022 개정 교육과정 용어 변경

| 구 용어 | 신 용어 |
|--------|--------|
| 티록신 | 타이록신 |
| 글리코젠 | 글라이코젠 |
| 표적 기관 | 표적 세포 |

### 과학적 정확성 체크포인트
- **골격근 떨림(전율)**: 자율신경이 아닌 **체성신경** 지배 → 자율신경 행에 포함 금지
- **뇌하수체 후엽 호르몬(ADH, 옥시토신)**: 시상하부에서 합성, 후엽에서 분비 → 명시 필요
- 호르몬 분비 기관과 합성 기관이 다른 경우 학습지에 별도 표기

### 빈칸 설계 원칙
- 중요도에 따라 선택적으로 뚫기 — 모든 내용을 빈칸으로 만들 필요 없음
- 빈칸 크기는 정답 길이에 맞게 (xs: 32px / sm: 50px / lg: 108px)
- 학생이 굳이 적을 필요 없는 자명한 내용은 미리 채워두기
- 중요 약어(TRH, TSH, ADH 등)는 빈칸으로 강조 가능

### 표 구성 원칙
- 동일 기관이 여러 행일 경우 `rowspan`으로 합치기
- 중요 행 강조: `.imp`(단일행) / `.imp-s`+`.imp-e`(다중행 그룹) 클래스 활용
- 표 헤더 색상으로 열의 성격 구분 (예: 상승/자극=붉은 계열, 하강/억제=기본)

## 인터랙티브 웹 활동 핵심 규칙
- 단일 `.html` 파일로 완결 (외부 파일 없음)
- 태블릿 터치 지원 (iOS Safari / Android Chrome)
- 버튼 영역 최소 44×44px, 폰트 최소 16px
- "다시 하기" 버튼 필수
- 점수 또는 진행 상황 화면에 표시

## 메모 / 진행 중인 작업
- 신경계 단원(12생과02)부터 내용 복잡도 및 암기량 증가 → 학생용 학습 정리자료 보강 필요
- 12생과02-02 (신경신호의 전달) 학습지+정답지 완성
- 12생과02-03 (사람의 신경계) 학습지+정답지 완성 (2026-04-10)
- 12생과02-04·05 내분비계와 항상성 유지 학습지+정답지 완성 (2026-04-12)
- 다음 작업 후보: 2-4 면역 학습지 (12생과02-06)
