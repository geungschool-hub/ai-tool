# 현장체험학습 세특앱 (FieldNote) — 백업·운영 노트

`E:\AI tool\fieldtrip_worksheet\fieldnote\` 의 Next.js 앱. 현장체험학습(2026-05-28) 설문 9문항 → Claude로 세특 초안 생성 → 교사 검토·확정 → 엑셀 내보내기 → NEIS. PRD는 `fieldtrip_worksheet\PRD_체험학습세특생성앱.md`.

## 스택 / 데이터 위치 (중요)
- **Next.js 16.2.6 + React 19.2.4 + Supabase(Postgres) + Anthropic SDK + xlsx.** Vercel 배포 전제.
- ⚠️ `node_modules/next/dist/docs/` 의 AGENTS.md 경고: 이 Next.js는 학습데이터와 다른 버전 → **코드 작성 전 해당 docs 먼저 읽을 것.**
- **실제 데이터는 전부 Supabase DB에 있음** (로컬 HTML/JSON 아님). 학습지류와 달리 PC localStorage가 아니라 원격 DB.
- 접속 정보: `fieldnote\.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). 이 파일 없으면 백업 불가.

## 백업 방법 (이게 핵심)
```
# fieldnote 폴더에서
node scripts/backup-survey.mjs            # → ..\backups\fieldnote_backup_<날짜_시각>.json
node scripts/backup-survey.mjs <경로>     # 출력 경로 지정 가능
```
- 12개 테이블 전체를 1개 JSON으로 덤프: tracks, visit_sites, sect_templates, survey_questions, students, survey_answers, survey_submissions, sect_drafts, sect_finals, regen_counts, token_logs, audit_logs.
- **`users`·`teachers`(계정 테이블)는 제외** — 학생 데이터 아님. 완전 복원 시 계정은 seed로 재구성.
- 백업 파일에는 **실제 학생 개인정보(이름·학번 180명 + 서술형 답변)** 포함 → 안전 위치 보관, 개인 PC 방치 금지. 단일 사본 위험 → 다른 매체에 2차 사본 권장.
- 복원 스크립트는 **아직 없음** (백업만 존재). 필요 시 작성 예정.

## 데이터 파기 정책 (2026-06-08 확정 — 절대 준수)
- **운영자가 명시적으로 지시할 때만 삭제.** 자동 파기·cron·기간 만료 삭제 일절 금지.
- 기존 PRD F-015(2026-06-28 자동 파기)는 이 지시로 **취소**(PRD에 취소 표기 완료).

## 2026-06-18 백업·현황 점검 (사실상 완료 상태)
- 백업 파일: `backups/fieldnote_backup_2026-06-18_1640.json` (2.7MB). counts: students 180 / survey_answers 1133 / survey_submissions 158 / sect_drafts 266 / **sect_finals 160(전부 confirmed_at有)** / regen_counts 160 / token_logs 280 / audit_logs 553.
- **상태 분류(180명)**: 확정본 160 + 미등록(이름null) 12 + 등록했으나 무응답 8 = 180.
  - 즉 **참여(등록+응답)한 학생 160명 전원 세특 확정 완료.** 등록 168명 중 160명 확정(95%).
- **무결성**: 확정본 빈 본문 0 / 초안 빈 본문 0. 확정본 바이트 92~1097(평균 752). 이상치는 데이터 오류 아님 — 92B(20103 강혜민, 답변 적어 교사가 짧게 확정), 900B 초과 5건(20526·20406·20718·20410·20505, 교사가 길게 작성). NEIS 입력 시 길이만 교사가 조정하면 됨.
- **이전 미해결 항목 해소**:
  - 이름 null 12명(20104,20115,20201,20211,20224,20315,20320,20323,20602,20620,20621,20725) = **데이터 이상 아님, 단순 미참여 확정.** 전원 pin_hash 없음·답변/제출/초안/확정 전무 → 한 번도 로그인(이름 기입) 안 한 학생. (6/8 메모의 "13명"은 12명이 정확.)
  - 등록했으나 무응답 8명: 20112 박채빈·20125 황지영·20218 전혜린·20402 강한주·20414 양서현·20501 강에스더·20617 이태연·20705 김채원 (pin_hash有=로그인은 함, 설문 답변만 0건).
- 백업 사본 4개 누적(6/1·6/8·6/17·6/18). **개인정보 포함 → USB 외 2차 매체 사본 권장.**

## (구) 2026-06-08 백업 시점 데이터 현황
- 학생 180명 / 설문 답변 1,123건, 160명 응답 / 초안 127명분 / 확정본 109명분. 본문 정상·무결성 통과. (이후 6/18 기준 확정본 160으로 진행 완료.)
