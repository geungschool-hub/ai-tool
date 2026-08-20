# ai-tool 저장소 git 백업·커밋 정책

> 작성: 2026-06-12 (2주치 미커밋 작업 일괄 백업하면서 정리)

## 기본 구조
- `E:\AI tool` 전체 = git 저장소 `geungschool-hub/ai-tool` (**PUBLIC** — 주의!)
- 용도: **코드 버전 이력·백업**. Firebase/GitHub Pages **배포와는 별개 경로** (배포는 `npx firebase-tools deploy`가 파일을 직접 업로드 → 커밋 없이도 앱은 최신으로 돈다).
- 즉 "앱이 잘 돌아간다" ≠ "코드가 백업되어 있다". **커밋이 밀리면 버전 이력이 없어 되돌리기 불가** → 작업 묶음이 끝날 때마다 커밋·푸시할 것.

## ★GitHub Pages는 master 루트를 그대로 서비스한다 — 배포 폴더를 옮기면 라이브 URL이 깨진다
- 이 저장소의 Pages 설정 = **`master` 브랜치 `/` (legacy build)**. Firebase 배포 앱과 달리
  **github.io/ai-tool/... 주소로 쓰는 앱은 「커밋 = 배포」**다.
- **실제 사고(2026-08-11 발견)**: 2026-07-25 최상위 정리 커밋(`bb37a7b`)이 26개 폴더를 카테고리로 옮기며
  github.io 주소 앱들이 전부 404가 됐다. 출결 모바일 앱(폰 설치 PWA)은 루트로 원위치해 복구(`0ca193e`).
- **폴더를 옮기기 전에 그 폴더가 github.io 주소로 쓰이는지 먼저 확인할 것.**
  학급 허브가 링크하는 `class seat change`(자리뽑기)·`수강신청점검`도 루트로 원위치해 복구(`a9145bf`).
  ※2026-08-12: 자리뽑기는 **학급 허브 카드에서 제거**했지만 앱은 계속 쓰인다 — 짧은 주소
  `geungschool-class-hub/seat.html`(리다이렉트)이 루트의 `class seat change/`를 가리키므로 **폴더를 옮기면 안 된다.**
  `1person1task`(배포 중단)는 **사용자 결정으로 `학생앱/`에 그대로 둔다**(옛 주소 404 용인, 2026-08-11).
  `early-bird`도 같은 날 404 용인으로 뒀었으나 **개학하며 전자칠판에서 실제 404 확인 → 2026-08-12 루트로 원위치 복구**(.gitignore 명렬표 경로 동반 수정).
  ★폴더를 루트로 되돌리면 **.gitignore의 카테고리 경로 규칙이 안 맞아 학생 데이터 파일이 노출된다** — 경로 규칙을 함께 고칠 것(실제로 이번에 걸렸다).
- 출결 앱 데이터는 기기 localStorage(origin 단위) 저장이라 **주소만 살리면 데이터도 그대로 돌아온다**(이번에 확인).

## ★별도 레포(GitHub Pages 앱)에 배포한 뒤 「반영됐는지」 확인하는 법
> 2026-08-13~18에 pedigree-sim·gene-sim·dna-sim·protein-sim·허브 3곳에서 **같은 함정을 반복해서 밟았다.**
> 재개지점에 흩어져 있던 것을 2026-08-18에 여기로 모았다.

1. **바이트 수로 비교하지 말 것.** git이 CRLF→LF로 정규화해 올리므로 로컬과 라이브가 **줄 수만큼 항상 어긋난다**
   (예: 로컬 122,052B ↔ 라이브 119,699B = 2,353줄 차이). 정상이다.
   → `tr -d '\r'` 로 양쪽을 정규화한 뒤 md5 대조할 것.
2. **push 직후 1회차 curl은 옛 판을 준다.** Pages 반영에 20초~수 분 걸린다.
   한 번 보고 "반영 안 됨"이라 판단하지 말 것 — 실제로 두 번 오판했다.
3. ★**이 PC(학교망)에서 curl은 `--ssl-no-revoke` 필수.** OCSP 폐기검사가 막혀 있어 빼면
   **HTTP 000·0바이트로 조용히 실패**해 역시 "반영 안 됨"으로 오판하게 된다.
4. **허브류는 push까지가 배포다.** push를 안 한 채 세션이 끝나 "배포에 QR이 없다" 문의가 온 적이 있다.
5. `gh repo create --source .` 는 **로컬 브랜치 이름을 그대로 올린다**(dna-sim이 `master`로 올라가 정리했다).
   새 레포는 `git init -b main` 으로 시작할 것.
6. 로컬에서 화면을 눈으로 볼 때 **`file://`은 차단된다** → `python -m http.server 8765` 로 띄울 것.
7. 커밋 메시지에 여러 줄을 넣을 때 **Bash 도구에서 PowerShell here-string(`@'…'@`)을 쓰면 안 된다**
   — 메시지 첫 줄에 `@`가 박힌다(2026-08-18 실제로 amend). heredoc + `git commit -F -` 를 쓸 것.

## ★학생 수업 자료는 「배포 + 허브 등록」까지가 완성 (2026-08-18 지시)
> "애들 수업 자료는 무조건 허브에도 올리고 배포도 해야돼. 그래야 애들 수업 때 쓸 수 있단 말이야."

**로컬 HTML은 학생이 못 연다.** 학생은 태블릿·폰으로 허브에서 찾아 들어가므로,
만들었다고 끝이 아니라 **① 별도 레포 push → ② Pages 활성화 → ③ 허브 카드 등록·push** 까지 해야 수업에 쓸 수 있다.
★**배포 ≠ ai-tool 커밋.** ai-tool 저장소 커밋은 여전히 요청 시에만 한다. 둘을 묶어 미루지 말 것.

```
git init -b main                     # ★--source . 는 로컬 브랜치 이름을 그대로 올린다
gh repo create <이름>-sim --public --source . --push
gh api -X POST repos/geungschool-hub/<이름>-sim/pages -f "source[branch]=main" -f "source[path]=/"
# 과학허브 index.html 의 CONTENTS 배열에 카드 추가 → 허브도 push
```

## ★미완성 잠금 — 배포는 하되 학생이 미완성본을 보지 못하게 (2026-08-18 지시)
"내가 완성 수준이라고 판단하기 전에는 들어갔을 때 관리자 비밀번호를 입력하도록."

**관리자 비밀번호 = `7856`** (교사 지정).

⚠ **이것은 잠금이지 보안이 아니다.** 앱이 PUBLIC 레포에 있으므로 소스를 보면 비밀번호가 그대로 보인다.
막는 대상은 **「학생이 미완성본을 우연히 여는 것」**이지, 소스를 뒤지는 학생이 아니다. 그 목적에는 충분하다.

**구조 (새 활동에 그대로 복제할 것)**
1. `<head>`에 짧은 스크립트를 둔다 — **본문보다 먼저 돌아야 잠긴 화면이 깜빡이지 않는다.**
   ```js
   var DRAFT_MODE = true;                 /* ◀ 완성되면 false 로 바꿔 재배포 */
   var DRAFT_PASS = '7856';
   var DRAFT_KEY  = '<앱이름>_draft_ok';
   try { if (!DRAFT_MODE || localStorage.getItem(DRAFT_KEY) === 'y')
           document.documentElement.className += ' unlocked'; }
   catch (e) { if (!DRAFT_MODE) document.documentElement.className += ' unlocked'; }
   ```
2. CSS로 **기본을 잠김(fail-closed)** 으로 둔다. JS가 죽어도 본문이 드러나지 않는다.
   ```css
   html:not(.unlocked) body > .wrap{display:none;}
   html:not(.unlocked) #draftGate{display:flex;}
   #draftGate{display:none; position:fixed; inset:0; z-index:9999;}
   ```
3. 맞으면 `localStorage[DRAFT_KEY]='y'` 로 **그 기기를 기억**한다 — 교사가 매번 입력하지 않아도 된다.
4. ★**잠금 열쇠와 학습 저장 키를 다른 키로** 둔다. 「처음부터 다시 하기」가 잠금을 풀어 버리면 안 된다.
5. 완성되면 **`DRAFT_MODE = false` 한 줄만 바꿔 재배포**한다. 그 순간부터 학생이 들어올 수 있다.

첫 적용 = `nondisj-sim`(염색체 비분리, 2026-08-18). 회귀 테스트는 `_test_염색체비분리.js` **[9-3] 미완성 잠금** 절을 복제할 것.

## .gitignore 정책 (PUBLIC 저장소라 필수)
`git add -A` 전에 아래가 .gitignore로 차단되는지 확인. 새 폴더/파일이 이 범주면 **먼저 .gitignore에 추가**:

1. **학생 개인정보**: 명렬표·학생명단 xlsx/pdf, 출결현황, `attendance_backup_*.json`, 혈액형판정/fieldnote 백업 json, `english-vocab/_db_backup/`
2. **저작권 자료**: 교과서 PDF(`quiz activity/*.pdf`), 능률VOCA·워드마스터 원본 폴더와 추출물(`_dump_*.txt`, `_wm_*.txt`, `basic_words.json`, `plus_words.json`)
3. **중첩 git 저장소**: `긍스쿨 허브/`(허브 2개), `fieldtrip_worksheet/fieldnote/`(자체 .git + `.env.local` 시크릿)
4. **의도적 미추적**: `GWASE'TEUK/`(배포본은 별도 저장소), `Claude_인수인계_통합메모리.md`(내부 운영 문서)
5. **잡파일**: `__pycache__/`, `*.bak`, `*.lnk`, `.firebase/`(배포 캐시)

## 복원 시 주의 (git만으로 안 되는 것)
- **english-vocab 단어 데이터**(`basic_words.json`, `plus_words.json`)는 저작권상 git 미추적.
  실본 위치: ① Firebase RTDB(`vocab/levels/{id}/words`) ② USB 원본 ③ `C:\USB-E-backup`(10분 주기 자동백업)
- 학생 데이터 백업 json들도 동일 — git에는 없고 USB/PC백업에만 있음.

## 커밋 관례
- 메시지: 한국어 한 줄 요약 (예: `영단어 암기 앱(english-vocab) 추가: 기간제 개방·2단계 레벨…`)
- 작업 묶음(앱/프로젝트)별로 커밋 분리. 마지막 일괄 백업: 2026-06-12 (커밋 6개, `5fcacfc`~`3e33278`)

## ★커밋 전 실명 점검 (2026-07-26 신설)

노트에 학생 실명·학번이 들어가 **PUBLIC 저장소로 푸시된 일이 실제로 있었다**(당일 발견·제거).
사람 눈으로는 놓친다 — 반드시 도구로 본다.

```
python _노트_실명점검.py      → 종료코드 0 이면 커밋 가능
```

- 추적되는 `.md`·`.txt` 전부를 **명단 정본 170명**과 대조하고 `20xxx` 학번꼴도 잡는다.
- gitignore된 문서(인수인계 메모 등)는 검사하지 않는다 — 공개되지 않으므로 대상이 아니다.
- 오탐 제외: URL·URL인코딩 안의 숫자, 교사 관리자 번호(`ALLOW_ID`), 형식 설명용 예시.
- **걸리면 이름을 지우고 "인원수 + gitignore된 경로"로 바꿔 쓴다.**
