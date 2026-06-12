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

## 2026-06-08 백업 시점 데이터 현황 (검증 결과)
- 학생 180명 / 설문 답변 1,123건(본문有), 160명 응답 / 세특 초안 127명분(179행, 재생성버전 포함) / 확정본 109명분.
- 답변·초안·확정본 모두 **본문 텍스트 정상**(빈 껍데기 0건). 백업 JSON 무결성 검증 통과.
- 미완료는 백업 누락이 아니라 **DB 자체에 아직 없음**: 초안 없는 학생 53명(설문 미응답 20 + 답변했으나 미생성 33), 확정본 109/180(61%).

## 점검 필요 (미해결)
- **이름이 null인 학생 13명**(학번만 있음: 20104, 20115, 20201, 20211, 20224, 20315, 20320, 20323, 20602, 20620, 20621, 20725 등). 명렬표 시드 후 미기입/데이터 이상 → DB 점검 필요.
- "마무리 단계" 인식 대비 확정본 61% → 미확정 71명 실제 진행상태 확인 권장.
