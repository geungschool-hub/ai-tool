# 현장체험학습 세특앱 (FieldNote) — 운영·백업·재활용 한 벌

> 2026-08-18 통합: 「FieldNote 백업 노트」 + 「FieldNote 재활용 가이드」 두 노트를 합친 것이다.
> 같은 앱을 다루면서 「지금 상태」와 「다시 쓰는 법」이 갈라져 있어 한쪽만 읽으면 판단이 어긋났다.

## 지금 상태 한 줄
**2026년 운영은 끝났고(160명 전원 세특 확정·백업 완료), Supabase는 일시정지 상태로 그냥 둔다**(2026-08-12 결정).
정본 데이터는 DB가 아니라 **USB의 백업 JSON**이다. 프로젝트가 삭제돼도 감수하기로 했다.

---

## 1. 무엇인가
`수업자료/fieldtrip_worksheet/fieldnote/` 의 Next.js 앱.
현장체험학습(2026-05-28) 설문 9문항 → Claude로 세특 초안 생성 → 교사 검토·확정 → 엑셀 내보내기 → NEIS.
PRD는 `fieldtrip_worksheet/PRD_체험학습세특생성앱.md`.

- **Next.js 16.2.6 + React 19.2.4 + Supabase(Postgres) + Anthropic SDK + xlsx.** Vercel 배포 전제.
- ⚠️ 이 Next.js는 **학습데이터와 다른 버전**이다 → 코드 만지기 전에 `node_modules/next/dist/docs/`의 AGENTS.md·문서를 먼저 읽을 것.
- **데이터는 로컬이 아니라 원격 DB**에 있었다(학습지류의 PC localStorage와 다르다).
- 접속 정보: `fieldnote/.env.local`. 이 파일 없으면 백업도 불가능하다.
- 배포 주소: `https://fieldtrip-hyehwa.vercel.app` (Vercel 프로젝트는 남아 있으나 DB가 죽어 데이터 로드 실패).
  ※`hyehwa-fieldtrip.vercel.app`(404)은 옛/오타 주소다.

## 2. ★데이터 파기 정책 (2026-06-08 확정 — 절대 준수)
- **운영자가 명시적으로 지시할 때만 삭제한다.** 자동 파기·cron·기간 만료 삭제 일절 금지.
- 기존 PRD F-015(2026-06-28 자동 파기)는 이 지시로 **취소**했다(PRD에 취소 표기 완료).

## 3. 백업 방법
```
# fieldnote 폴더에서
node scripts/backup-survey.mjs            # → ..\backups\fieldnote_backup_<날짜_시각>.json
node scripts/backup-survey.mjs <경로>     # 출력 경로 지정 가능
```
- 12개 테이블을 JSON 하나로 덤프: tracks, visit_sites, sect_templates, survey_questions, students,
  survey_answers, survey_submissions, sect_drafts, sect_finals, regen_counts, token_logs, audit_logs.
- **`users`·`teachers`(계정)는 제외** — 학생 데이터가 아니다. 완전 복원 시 계정은 seed로 재구성.
- 백업 파일에는 **실제 개인정보(이름·학번 180명 + 서술형 답변)** 가 들어 있다 → 안전 위치 보관, 개인 PC 방치 금지.
- ⚠️ **복원(restore) 스크립트는 없다.** 백업 JSON을 새 프로젝트에 넣으려면 새로 짜야 한다.

## 4. 최종 데이터 현황 (2026-06-18 백업 기준)
`backups/fieldnote_backup_2026-06-18_1640.json` (2.7MB)
students 180 / survey_answers 1133 / survey_submissions 158 / sect_drafts 266 /
**sect_finals 160(전부 confirmed_at 有)** / regen_counts 160 / token_logs 280 / audit_logs 553

- **상태 분류(180명)**: 확정본 160 + 미등록(이름 null) 12 + 등록했으나 무응답 8
  → **참여한 학생 160명 전원 세특 확정 완료.** 등록 168명 중 160명(95%).
- **무결성**: 확정본·초안 빈 본문 0건. 확정본 92~1097바이트(평균 752).
  이상치는 오류가 아니다 — 92B는 답변이 적어 교사가 짧게 확정한 것.
- 이름 null 12명은 **한 번도 로그인(이름 기입)하지 않은 학생**이다(pin_hash 없음·답변/제출/초안/확정 전무).
  데이터 이상이 아니다. (6/8 메모의 "13명"은 12명이 정확하다.)
- ★누가 해당되는지는 **백업 JSON에서 조회**한다 — 이 노트에는 실명·학번을 적지 않는다.
- 백업 사본 4개 누적(6/1·6/8·6/17·6/18).
- (구) 6/8 시점: 확정본 109명분 → 6/18에 160명으로 마무리됐다.

## 5. 왜 정지 상태인가 (2026-08-12 진단)
- 증상: 페이지는 200으로 뜨는데 데이터가 전부 실패 — `/api/tracks/public` → "계열 목록을 불러올 수 없습니다."
- 원인: Supabase 프로젝트 호스트의 **DNS가 사라졌다**(구글 DNS에서도 NXDOMAIN).
  **무료 플랜은 약 1주 미사용 시 자동 일시정지**되고, 정지되면 호스트가 DNS에서 내려간다. 마지막 사용이 6/18이라 6월 말쯤 정지됐다.
- 되살리는 법: supabase.com 대시보드 로그인 → 해당 프로젝트 → **Restore(재개)**. 몇 분 걸리고 교사 계정으로만 가능.
- ⚠️ 정지 후 **약 90일이면 무료 프로젝트는 삭제될 수 있다**(9월 말쯤).
- **결정(2026-08-12): 살리지 않는다.** 세특 작업이 6/18에 끝났고 데이터 정본은 USB 백업이므로 삭제도 감수한다.

## 6. 다시 쓰려면 (새 학년도 기준)

### 재료가 어디에 (전부 USB · 전부 gitignore — ★USB가 유일 사본)
| 재료 | 위치 |
|---|---|
| 앱 소스 전체 (Next.js 16) | `수업자료/fieldtrip_worksheet/fieldnote/` |
| **DB 스키마 + 설문 9문항 원문 + 세특 3문단 템플릿** | `fieldnote/supabase/migrations/001_initial.sql` (문항 192행~, 템플릿 207행~) |
| 테스트 시드(가짜 학생 5명) | `migrations/002_seed_students.sql` |
| 명렬 사전등록 방식(이름 nullable·첫 로그인 시 기입) | `migrations/003_roster.sql` |
| 2026년 운영 데이터 최종 백업(12테이블·개인정보 포함) | `수업자료/fieldtrip_worksheet/backups/fieldnote_backup_2026-06-18_1640.json` (계열 12·체험처 12·문항 9도 이 안에) |
| 학생 안내문·QR·교사 안내·PRD | `수업자료/fieldtrip_worksheet/` 루트 |

`node_modules/`(621MB)는 지워도 된다 — `package-lock.json`으로 `npm install` 하면 복원된다.

### 순서
1. **새 Supabase 프로젝트** 생성 → SQL Editor에서 `001_initial.sql` → `003_roster.sql` 순서로 실행(002는 로컬 테스트용, 생략 가능).
2. **그 해에 맞게 수정**: 설문 문항(001의 insert), 계열(tracks)·체험처(visit_sites)·세특 템플릿.
   2026년 값은 백업 JSON의 `data.tracks / data.visit_sites / data.sect_templates` 참고.
3. **학생 명렬 삽입** — 실명이 들어가므로 SQL은 **gitignore된 데이터 폴더에서** 만들 것.
4. `fieldnote/.env.local` 채우기 — **옛 키는 프로젝트 소멸과 함께 무효, 전부 새로 발급.** 필요한 키:
   `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` ·
   `ANTHROPIC_API_KEY` · `ANTHROPIC_MODEL` · `JWT_SECRET` · `TEACHER_PASSWORD` · `ADMIN_PASSWORD` ·
   `DAILY_TOKEN_LIMIT` · `MAX_REGEN_PER_STUDENT`
5. `npm install` → `npm run dev` 로컬 확인 → Vercel 배포(기존 프로젝트에 env만 갈아끼우면 주소 유지) + 같은 환경변수를 Vercel에도 등록.
6. 설문 기간 설정은 `src/lib/survey-period.ts` 확인.

## 7. 함정 (겪은 것)
- **무료 Supabase는 ~1주 미사용 시 자동 일시정지**(DNS까지 내려감) → 운영 기간에만 살리고, 운영 중엔 주 1회 이상 접속.
  끝나면 백업 받고 그냥 잠들게 두면 된다.
- **Next.js 16은 학습데이터와 다른 버전** — 코드 만지기 전에 문서부터.
- **복원 스크립트가 없다** — 백업만 있고 되돌리는 길은 아직 없다.
- **백업·소스 모두 USB 단일 사본** — 재활용할 생각이면 다른 매체에 2차 사본을 떠 둘 것.
