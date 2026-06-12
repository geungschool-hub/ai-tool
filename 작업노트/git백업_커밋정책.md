# ai-tool 저장소 git 백업·커밋 정책

> 작성: 2026-06-12 (2주치 미커밋 작업 일괄 백업하면서 정리)

## 기본 구조
- `E:\AI tool` 전체 = git 저장소 `geungschool-hub/ai-tool` (**PUBLIC** — 주의!)
- 용도: **코드 버전 이력·백업**. Firebase/GitHub Pages **배포와는 별개 경로** (배포는 `npx firebase-tools deploy`가 파일을 직접 업로드 → 커밋 없이도 앱은 최신으로 돈다).
- 즉 "앱이 잘 돌아간다" ≠ "코드가 백업되어 있다". **커밋이 밀리면 버전 이력이 없어 되돌리기 불가** → 작업 묶음이 끝날 때마다 커밋·푸시할 것.

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
