# gongju7-vocab — RTDB 보안 규칙 (공유 문서 · 앱 4개)

## ★먼저 알 것

**Realtime Database 규칙은 앱별이 아니라 데이터베이스별로 딱 하나다.**
`gongju7-vocab` RTDB 하나에 앱 4개가 얹혀 있어서, 이 파일 하나가 넷 모두를 지배한다.

| 경로 | 쓰는 앱 | 현재 규칙 |
|---|---|---|
| `vocab/*` | 영단어장 (english-vocab) | `auth != null` |
| `vote` | 학급임원선거 (class-vote) | `.read: true` + 쓰기 제약 |
| `reportPlans` | 보고서 가이드 (report-guide) | `false` (2026-07-25 폐쇄) |
| `examGoals` | 구 exam-goal | `false` (앱 종료) |

경로별로 독립 적용되므로 `vote`가 열려 있어도 `vocab/*`은 안전하다.
**한 앱 때문에 다른 앱이 위험해지지는 않는다.** 위험한 건 아래 '덮어쓰기' 쪽이다.

---

## ★진짜 위험 — 불완전한 파일로 배포하면 남의 규칙이 사라진다

배포는 **규칙 문서 전체를 통째로 교체**한다. 일부만 든 파일로 배포하면 나머지는 **삭제**되고,
규칙이 없는 경로는 기본 거부라 그 앱이 죽는다.

실제로 있었던 일 (2026-07-25):
- 전체 규칙의 유일한 로컬 정본이 `시험목표제출/` 안에 있었는데 그 앱을 종료하며 폴더를 지울 뻔했다.
- `english-vocab/firebase.json` 은 **`vocab` 블록만 든 파일**을 가리키고 있었다.
  → 단어장에서 `firebase deploy` 한 번이면 **`vote` 규칙이 사라져 투표 앱이 죽는 상태**였다.

**조치**: 규칙을 이 폴더로 독립시키고, `english-vocab/firebase.json` 에서 `database` 키를 제거했다.
→ **이제 규칙을 배포할 수 있는 곳은 여기 하나뿐이다.** 단어장을 배포해도 규칙은 건드려지지 않는다.

---

## 배포 절차 (반드시 이 순서)

### 1. 라이브와 대조 — 건너뛰지 말 것

콘솔에서 규칙을 직접 고쳤다면 이 파일이 뒤처져 있다. 그대로 배포하면 **콘솔 수정이 조용히 되돌아간다.**

1. [콘솔 규칙 탭](https://console.firebase.google.com/project/gongju7-vocab/database/gongju7-vocab-default-rtdb/rules) 에서 내용 전체 복사
2. 이 폴더에 `live.json` 으로 저장
3. ```
   node compare_live.js
   ```
   - `✅ 로컬 == 라이브` → 2단계로
   - `★ 차이 N건` → 어느 쪽이 맞는지 판단 후 맞추고 다시 대조

`live.json` 은 gitignore 대상이 아니지만 임시 파일이니 확인 후 지울 것.

### 2. 배포

```
cd "E:\AI tool\_firebase\gongju7-vocab"
npx -y firebase-tools deploy --only database
```

`--only database` 를 반드시 붙인다(이 폴더엔 hosting이 없지만 습관을 들일 것).

### 3. 실제로 먹었는지 확인

```
curl -s -o /dev/null -w "%{http_code}\n" "https://gongju7-vocab-default-rtdb.asia-southeast1.firebasedatabase.app/reportPlans.json?shallow=true"
```
`401` = 닫힘 / `200` = 열림. `vocab/config` 는 `401`, `vote` 는 `200` 이 정상이다.

---

## 규칙을 고칠 때

- **닫을 때**는 `.read`/`.write` 를 `false` 로. `auth != null` 로 되돌리지 말 것 —
  학교망이 익명 인증을 막아서 학생 앱들이 무인증 구조로 만들어졌다(`작업노트/기말목표점수_제출앱.md` 참고).
  제대로 고치려면 인증 방식부터 다시 설계해야 한다.
- 한 경로만 손대더라도 **파일 전체가 배포된다**는 걸 잊지 말 것.
- 고친 뒤에는 커밋할 것. 이 파일이 유일한 로컬 정본이다.

## 다른 프로젝트

| 프로젝트 | 규칙 배포 위치 | 비고 |
|---|---|---|
| `person1task` | `1person1task/` | 단일 앱 전용 |
| `hyehwa-course-check` | `수강신청점검/` | 단일 앱이지만 `firebase.json` 에 `database`+`hosting` 이 함께 있음 — 같은 덮어쓰기 위험이 있으니 배포 시 `--only hosting` 을 붙일 것 |

앱마다 프로젝트를 나누면 이 공유 문제가 근본적으로 사라진다.
RTDB 데이터 이전 + 클라이언트 설정 변경이 필요해서 지금 할 일은 아니고, 다음 학기 준비 때 후보.
