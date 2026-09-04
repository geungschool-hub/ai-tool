# 업무 관리 도구 PRD — `task_management/`

> 2026-09-03 확정안(초안 3편 → 심사 3 → 종합 → 반박 검증 1회 반영). 노션 DB 1개를 대체한다. 단일 HTML + Firebase RTDB(전용 프로젝트) + Node 스크립트 1개.
> 예시의 「○○ 회의 자료」류는 전부 가공이다(이 문서는 PUBLIC 레포에 커밋된다).

---

## 0. 결정 표

| 결정 사항 | 선택 | 대안 | 근거 |
|---|---|---|---|
| 백엔드 | **Firebase RTDB, 전용 프로젝트**(이름은 §9-6) | Supabase · Firestore · 기존 프로젝트 · localStorage | Supabase 무료는 1주 미사용 시 정지(방학에 죽는다). Firestore는 REST 타입 래핑. 기존 프로젝트에 섞으면 규칙 배포 한 번이 학생 앱 규칙을 덮는다(gongju7-vocab README 2026-07-25). localStorage·허브 vault는 폰·Claude 접근 불가 |
| 프로젝트 생성 실패 시 | `my-tasks-e28cb` 재사용 | — | 계정에 이미 7개. 그 프로젝트는 RTDB만 있고 다른 앱 없음 |
| 브라우저 인증 | **이메일/비밀번호**, 교사 계정 T + 봇 계정 B. 가입 끔 | 구글 로그인 · 비밀 경로 키 | 1p1t가 github.io에서 같은 방식으로 돈다. 구글은 iOS Safari 리다이렉트 제약. 경로 키는 기기별 폐기·회전 시 데이터 이동이 없다 |
| Claude 자율 쓰기 | **봇 B**(REST + idToken). 규칙이 쓸 수 있는 자리를 좁힌다 | 소유자 CLI OAuth 전권 | 봇 경로는 **서버(규칙)** 가 막는다. 소유자 CLI 경로는 같은 PC에 OAuth가 살아 있어 규칙이 무관 → **규약 + `.claude/settings.json` deny**(§5.1)로 막는다 |
| 교사가 시킨 쓰기(`apply`·`import`) | **전역 firebase CLI**(15.29.0, PC 프로필 OAuth) | 봇에 권한 확대 | 교사 말 한마디로 교사 필드를 쓰는 건 교사 계정이 한다. 봇 규칙은 그대로 좁게 |
| 비밀의 위치 | **PC 홈 `%USERPROFILE%\.config\taskboard\bot.json`** + CLI configstore | USB gitignore 파일 | USB·레포·대화창 비밀 0건. 새 PC는 `firebase login` 1회 + 봇 비번 1회 |
| 호스팅 | **Firebase Hosting**(같은 프로젝트) | GitHub Pages 별도 레포 | 정본=배포본 한 벌. index.html no-cache. Pages는 2벌(claude-guide 선례) |
| 파서 정본 | `index.html`의 `/*PARSE-START*/…/*PARSE-END*/`를 CLI·검사가 읽는다 | 파서 파일 분리 | `_test_가계도분석.js`가 HTML을 vm으로 읽는 방식 재사용. 앱과 CLI 해석이 어긋날 길 없음 |
| 체크·기록 저장 | `checks/<cid>` 객체, `log/<push>` append-only | 배열 | RTDB 배열은 통째로 덮인다. 폰과 Claude가 동시에 찍어도 합쳐지게 |
| 작업노트 경계 | 상태·마감·체크 = 도구 / 교과 내용 = `_재개지점.md` / `ref`로 잇는다 | 노트 안 `tm` 블록 거울 | 거울은 status·mirror 두 상태원을 만든다. `### N.` 구조가 이미 있어 그것에 건다 |
| 검토 반영 | 검토 항목마다 `patch`, 폰 [반영]과 터미널 "1 3 반영"이 같은 결과 | md 덩어리 | 폰에서 한 번 탭으로 닫혀야 요구 ④가 돈다 |
| 빠른 입력 | 제목 + `@ # ! ~ + // >id` 토큰, 공백 뒤에만 인식, 실패 없음 | 자연어 | 규칙 기반이 3초·오인식 없음 |
| 노션 이사 | `import`(CLI 소유자 경로) dry-run → `--write`, 당일 컷오버 | 재타이핑 | 25개라 둘 다 된다. 병행 기간은 두지 않는다 |
| 오프라인 | 읽기 캐시. 쓰기는 생성·상태 변경만 outbox(M6) | 서비스워커 | todo-geung이 sw.js를 썼다. 캐시 사고를 만들지 않는다 |
| 백업 | `backup`이 USB `_backup/`과 PC 홈 두 곳에 | PC 자동백업 의존 | 자동백업 스크립트는 E:만 복사하고 이 USB는 F:라 6주째 헛돈다 |
| 진입점 | 루트 CLAUDE.md 불변. `_재개지점.md` 머리에 `pull` 한 줄 | CLAUDE.md 0번 추가 | 「진입점은 3개뿐」 규칙 유지 |
| 완료의 뜻 | 교과 항목은 체크 4틀(제작·검사·배포·허브 카드). 배포·허브는 md5 확인한 세션의 Claude만 찍음 | 상태 하나 | 지난 어긋남(노션 완료·README 미배포)은 「완료」의 뜻이 달랐던 것 |
| Claude의 done | **봇 B가 `status:done`만 쓸 수 있게 규칙을 연다. 단 교사가 「완료」라고 말한 뒤에만**(규약, 2026-09-03 교사 결정) | 체크만 찍고 done은 교사가 | 교사가 말로 시킨 것을 그 자리에서 닫으려면 봇 경로가 필요. 규칙은 done 외의 값을 막는다 |
| 이름 | 프로젝트 `geung-taskboard` · 앱 「업무판」 · `https://geung-taskboard.web.app` | my-tasks-e28cb 재사용 | 2026-09-03 교사 선택 |

---

## 1. 목표 / 비목표

**목표** — 폰·PC 어디서든 3초 안에 적히고, 아침에 한 화면으로 오늘이 보이고, Claude 세션이 같은 데이터를 읽어 「지남·방치·어긋남·쪼개기」를 되돌려 준다.

**비목표**
- 다중 사용자·공유·권한
- 캘린더·칸반 보기, 관계 속성, 첨부
- 푸시 알림. 오늘 화면이 알림이다
- 시:분 일정. 마감은 날짜, 「5교시 후」는 메모
- 노션 양방향 동기화. 이사는 한 번
- 작업노트 자유 서술을 코드로 파싱. 노트는 Claude가 읽는다
- 학생 데이터. 세특 재료는 `세특_재료지도.md`가 정본
- Claude가 교사 판단(제목·상태·마감·중요도·메모)을 스스로 바꾸는 것. 규칙이 막는다(§6)

**앞선 실패** — 같은 용도의 도구를 두 번 만들고 버렸다(`my-tasks` 2026-04 RTDB · `todo-geung` 2026-05 localStorage+sw). 이번 도구를 계속 만들지의 관문은 **M3 끝: 폰과 Claude 읽기가 둘 다 되는가**. 왜 버렸는지는 §9-1.

---

## 2. 사용자 시나리오

**S1 아침, 교무실 PC** — 즐겨찾기 → 오늘 화면. 「지남 1 · 오늘 2 · 이번 주 5」. 메일에 공문 하나 → 입력창 `감독 배정표 회신 @목 !` 엔터. 커서는 그대로. 다음 것을 적는다.

**S2 수업 사이, 복도, 폰** — "다음 주 화요일 협의회 자료". 홈 화면 아이콘 → 하단 입력창 `협의회 자료 @담주화 +안건 +장소` → 저장. 3초. 이름은 적지 않는다 — 역할명으로(§9-5).

**S3 Claude 세션 시작, PC** — "중간고사 문항 이어서". Claude는 `_재개지점.md` → `node task_management/_cli.js pull`. 3줄 이하: 「보드 「중간고사 문항」 9/25 마감인데 동교과 검토 체크가 없다. 넣을까요?」 → "응" → `note`가 아니라 `apply`. 세션 끝에 배포를 md5로 확인하고 `check <id> 배포`를 찍고 재개지점을 갱신한다.

**S4 일요일 저녁 PC → 월요일 출근길 폰** — "검토해 줘" → Claude가 `review-data` + 노트 대조 → 10줄(§5.2) + `review-write`. "1·3 반영" → `apply`. 월요일 폰 검토 탭에 나머지 2건이 [반영][무시]로 남아 있다.

**S5 시험 2주 전** — 「중간고사 문항 @9/25」만 있다. 검토가 역산 체크(자체 검토·동교과·최종·인쇄 의뢰)를 `split`으로 제안. 시험 주간엔 행정이 겹치므로 미루기 단추에 「시험 뒤」.

**S6 버릴 때** — 설정 → 「MD 복사」. 열린 항목·완료 항목이 마크다운 표로 나온다. 노션이든 옵시디언이든 그대로 붙는다.

---

## 3. 데이터 모델

루트 노드 `tm/` 하나. 키 이름은 축약하지 않는다. 날짜 `YYYY-MM-DD`(KST), 시각 epoch ms.

```jsonc
tm/
  meta: { "schema": 1, "reviewReq": false, "lastReview": "2026-09-07", "cutoverAt": null,
          "lastArea": "admin",        // 전체 탭에서 마지막에 쓴 영역
          "exam": null }              // { "start": "2026-09-25", "end": "2026-10-02" } | null — 미루기 「시험 뒤」

  tasks/<id>: {                        // id = yymmdd + base36 3자 (예 "260903k3x"). 화면·대화에선 "k3x"
    "title": "감독 배정표 회신",
    "status": "todo",                  // todo | doing | done | dropped
    "area": "admin",                   // admin 행정 · event 행사 · class 교과
    "priority": 2,                     // 1 높음 · 2 보통 · 3 낮음
    "due": "2026-09-05",               // 없으면 키 자체가 없다
    "checks": {                        // 체크포인트. 객체 — 필드 경로 update 로 합쳐진다
      "c1": { "text": "NEIS 추출", "done": true,  "by": "me",     "ts": 1757000000000, "order": 1 },
      "c2": { "text": "배포",      "done": false, "by": null,     "ts": null,          "order": 2 }
    },
    "memo": "5교시 후",
    "ref": "작업노트/_재개지점.md#2",   // 교과 항목만. 재개지점 「### N.」 번호
    "createdBy": "me",                 // me | notion | claude
    "ok": true,                        // createdBy:claude 는 false 로 태어난다. 교사 ✓ → true
    "createdAt": 1757000000000, "updatedAt": 1757000000000, "doneAt": null, "deletedAt": null,
    "claude": { "text": "동교과 검토 체크가 없다", "ts": 1757000000000, "seen": false }   // Claude 한마디, 한 칸
  }

  log/<push>: { "task": "260903k3x", "field": "status", "from": "todo", "to": "doing",
                "by": "me", "via": "app|cli|bot", "ts": 1757000000000 }          // append-only

  reviews/<push>: {                    // push 키 — 같은 날 두 번 검토해도 덮이지 않는다
    "date": "2026-09-07", "ts": 1757000000000, "req": "session|weekly|phone", "seen": false,
    "head": "항목 23 · 지남 2 · 이번 주 5 · 방치 4",
    "items": {
      "1": { "kind": "overdue",  "task": "260903k3x", "text": "9/4 지났다. 오늘로?",
             "patch": { "due": "2026-09-08" }, "state": "open" },                  // open | applied | dismissed
      "2": { "kind": "split",    "task": "…", "text": "자체 검토 9/18 · 동교과 9/22",
             "patch": { "checks+": [ {"text":"자체 검토 9/18"}, {"text":"동교과 9/22"} ] }, "state": "open" },
      "3": { "kind": "conflict", "task": "…", "text": "보드 done · 재개지점 🔴", "patch": { "status": "todo" }, "state": "open" },
      "4": { "kind": "propose",  "task": null, "text": "1-3 심화 세트",
             "patch": { "new": { "title": "1-3 심화 세트", "area": "class", "ref": "작업노트/_재개지점.md#3" } }, "state": "open" }
    }
  }
```

**kind** — `overdue` 지남 · `soon` 3일 내 todo · `stale` 14일 무변경 · `nodue` 높음인데 마감 없음 · `split` 마감 7일 내 체크 0 · `tidy` 혼잣말 체크를 메모로 · `conflict` 보드↔재개지점 · `propose` 노트엔 있고 보드엔 없음. 앞 여섯은 `review-data`가 계산, 뒤 둘은 Claude가 노트를 읽고 쓴다.

**노션 → 도구**

| 노션 | 도구 | 처리 |
|---|---|---|
| 업무(제목+아이콘) | `title` | 아이콘은 CSV에 없다. 버림 |
| 상태 대기/진행/완료 | `status` todo/doing/done | `dropped` 신설 — 노션엔 「안 하기로 함」이 없어 완료로 뭉개졌다. **완료 항목도 전부 옮긴다**(이력, `doneAt`=Last edited time) |
| 마감일 | `due` | 날짜만 |
| 영역 | `area` | 그대로 |
| 업무유형 | — | 버림. 영역과 1:1 |
| 중요도 | `priority` 1/2/3 | 비면 2 |
| 체크포인트 | `checks` | 전부 `done:false`(완료 항목은 true). 혼잣말은 첫 검토의 `tidy`가 메모로 |
| 관련 기록 | — | 버림. 비어 있음 |
| 본문 | `memo` | |
| 보기 3종 | 오늘/전체/검토 | 캘린더·칸반 버림 |

**Claude 것과 사람 것** — 세 겹.
1. 규칙: 봇 B는 `claude`·`checks/*`(by:claude)·새 항목(`createdBy:claude, ok:false`)·`reviews/`(새 키만)·`meta.lastReview`만 쓴다. `title status due priority memo`는 서버가 막는다.
2. 필드: `createdBy`, `checks/*/by`, `log/*/via`.
3. 화면: Claude 것에만 🤖. `ok:false`는 제안 띠에만 보이고 교사 ✓ 전엔 목록에 없다.

---

## 4. 화면

폰: 하단 탭 3개(오늘·전체·검토) + 하단 고정 입력창. PC: 상단 입력창. 행 48px, 글자 16px+, 단추 44px+. 범례·안내문 없음.

### 4.1 오늘(기본)
위에서 아래로, **비어 있는 묶음은 안 그린다**: 🤖 제안·검토 띠(미확인 있을 때 1줄) → 지남 → 오늘 → 진행 중 → 이번 주 → 날짜 없음·높음.
행 = `[상태점] 제목  D-n  ☑2/4  k3x` + 왼쪽 영역 색 띠. 상태점 탭 = todo→doing→done 순환. 제목 탭 = 상세 시트. 14일 무변경은 흐리게. 묶음 안 정렬: priority → due → updatedAt.

### 4.2 입력창
- 열면 포커스. 저장 후 포커스 유지. 낙관적 렌더. 5초 되돌리기 토스트.
- **타이핑 중엔 목록이 그 글자로 걸러진다**(중복 방지·검색 겸용). 엔터가 생성.
- 엔터 전에 파싱 결과가 칩으로 보인다(마감·영역·중요도·체크 n).
- 칩 한 줄: `오늘 내일 이번주 다음주 📅 | 행 사 교 | !`. 문법 대신 탭도 된다.
- 새 항목의 영역 = 현재 탭. 「전체」면 마지막에 쓴 영역.

**문법** — 제목 뒤, 순서 무관, 토큰은 **앞에 공백이 있을 때만** 인식. 안 걸리면 전부 제목(실패 없음).

| 토큰 | 뜻 | 예 |
|---|---|---|
| `@` | 마감 | `@오늘 @내일 @모레 @금`(지났으면 다음 주) `@담주화 @9/25 @0925 @+3 @없음` |
| `!` / `~` | 높음 / 낮음 | 없으면 보통 |
| `#행 #사 #교` | 영역 | `#교`는 체크 4틀(제작·검사·배포·허브 카드) 자동 |
| `+` | 체크(여러 개) | `+NEIS 추출 +표 +결재` |
| `//` | 메모(끝까지) | `// 5교시 후` |
| `>id` | 기존 항목 수정 | `>k3x @9/19` `>k3x 완료` `>k3x +결재` |

```
학력평가 결과 보고 @9/12 ! +NEIS 추출 +표 +결재   → 09-12 · 높음 · 현재 탭 영역 · 체크 3
위탁 교육생 면담 @내일 // 5교시 후                → 내일 · 메모
1-3 심화 세트 #교                                → 교과 · 체크 제작·검사·배포·허브 카드
>k3x @담주월                                     → k3x 마감 변경
```

파서는 순수 함수 `parse(line, defaultArea, today, tasks)`. `_test_taskboard.js`가 회귀 검사.

### 4.3 상세 시트
제목 인라인 · 상태 4단추 · 영역 · 중요도 · 날짜 + 미루기 4단추(내일·이번 주 금·다음 주 월·**시험 뒤** = 시험 종료 다음 월요일) · 체크(+추가) · 메모 · ref · 🤖 한마디(확인) · 기록(접힘) · 버리기(dropped) · 휴지통(deletedAt).

### 4.4 전체
상태별 그룹(대기·진행·완료 접힘·버림·휴지통 접힘), 영역 칩. 검색은 입력창이 겸한다.

### 4.5 검토
최신 검토 = `head` 1줄 + 항목마다 `[반영] [무시]`. 「검토 요청」 단추(`meta.reviewReq=true`). 지난 검토 접힘.

### 4.6 설정
로그아웃 · JSON 복사 · MD 복사 · 동기화 시각 · 빌드 스탬프(`v2026-09-03a`) · 시험 기간 입력(미루기 단추용).

---

## 5. Claude 연동

### 5.1 경로 — `task_management/_cli.js` (Node 24, 의존성 0)

두 자격, 용도 고정.

| 자격 | 어디에 | 무엇을 |
|---|---|---|
| **봇 B** — 이메일/비번 → idToken(1h) → REST `?auth=` | `%USERPROFILE%\.config\taskboard\bot.json` | Claude가 스스로 하는 모든 쓰기·읽기 |
| **소유자 CLI** — 전역 `firebase` 15.29.0, PC 프로필 OAuth | `~/.config/configstore/firebase-tools.json` | `apply`(교사가 "반영"이라 한 뒤) · `import` · `restore` |

| 명령 | 자격 | 하는 일 |
|---|---|---|
| `setup` | — | 봇 이메일·비번을 터미널에서 받아 홈 폴더에 저장. **교사가 자기 터미널에서** 한 번 |
| `pull [--json]` | B | 전체 덤프. 기본은 표(id·status·priority·due·area·title·☑x/y·무변경 일수) |
| `add "<문법>"` | B | 앱과 같은 파서. `createdBy:claude, ok:false` |
| `note <id> "…"` | B | `claude.text` |
| `check <id> <이름> [--undo]` | B | `checks/<cid>` `done`·`by:claude` |
| `done <id>` | B | `status:done`·`doneAt`·`log`. **교사가 「완료」라고 한 뒤에만**(규약). 규칙은 B의 status 쓰기를 done 값에만 연다 |
| `review-data` | B | overdue·soon·stale·nodue·split·tidy 후보 JSON |
| `review-write <json>` | B | `reviews/` 새 키 |
| `apply <review> [n…\|all]` | CLI | patch 적용, `state:applied`, `log via:cli` |
| `check-note` | B + 파일 | 교과 항목 ↔ `_재개지점.md` `### N.` 3분류(§5.4) |
| `backup` | B | `_backup/<시각>.json` + `%USERPROFILE%\taskboard-backup\` 두 곳 |
| `import <csv> [--write]` | CLI | 노션 이사(§7) |
| `restore <file> [--yes]` | CLI | 라이브와 diff 출력 → `--yes` |

- 파서는 `index.html` 마커 사이를 `vm`으로 읽는다. 정본 하나.
- CLI는 **비밀·URL을 출력하지 않는다**(오류에도). 대화창에 키를 붙이지 않는다. Claude Code가 홈 폴더 파일을 읽을 수는 있다 — 이건 규약이다. 서버가 막는 건 봇 규칙(§6).
- **소유자 CLI 경로는 규칙이 못 막는다** — 이 PC엔 `firebase` OAuth가 살아 있어 Claude Code가 `firebase database:set`을 치면 규칙과 무관하게 써진다. 그래서 `.claude/settings.json` `permissions.deny`에 `Bash(firebase database:*)`·`Bash(firebase deploy*)`를 넣는다. `_cli.js apply/import/restore`가 안에서 부르는 자식 프로세스는 이 deny에 안 걸리므로, 그 셋은 **교사가 「반영」이라 한 뒤에만** 돌린다(규약). 규칙·호스팅 배포는 교사가 자기 터미널에서.
- `_cli.js`는 `apiKey`·`databaseURL`을 `web/index.html`의 `/*CONFIG-START*/…/*CONFIG-END*/` 마커에서 읽는다(공개 전제 값). 따로 적어 두는 곳 없음.
- 쓰기 명령(`apply import restore`)은 실행 전 `backup`을 부른다. 스크립트에 `remove` 명령은 없다.
- 함정: 학교망 TLS → `NODE_TLS_REJECT_UNAUTHORIZED=0`(기존 시드 스크립트와 같음). Bash 도구에서 `firebase database:… /경로`는 MSYS가 경로를 바꾼다 → `MSYS_NO_PATHCONV=1` 또는 PowerShell. **`database:set/update/push`는 비대화형에서 `-f --project <p>` 필수**(없으면 확인 프롬프트에서 죽는다 — 영단어장 노트 16행 선례). RTDB 리전이 us-central1이 아니면 `--instance <id>-default-rtdb`.
- 봇 로그인이 안 되는 PC: `pull --from _backup/latest.json` 읽기 전용. 출력에 스냅샷 시각.
- 병행 세션: 봇 명령은 새 키·필드 경로 update만 쓴다. `apply restore import`는 덮어쓰기 — 동시에 돌리지 않는다.

### 5.2 검토 의식

| 언제 | 무엇 | 되돌려 주는 형태 |
|---|---|---|
| **모든 세션 시작** | `pull` 한 번. 말하는 조건 셋 — 지남이 있다 · `reviewReq` · 지금 하려는 교과 일이 보드와 어긋난다. 마지막 검토 3일 초과면 아래 검토를 함께 | **3줄 이하.** 없으면 말하지 않는다 |
| **"검토"라 하면** | `pull` + `review-data` + `check-note` + 노트 대조 → kind·text·patch | ≤10줄 + `review-write` |
| **폰 「검토 요청」** | 다음 세션 시작이 위 검토를 수행 | 폰 검토 탭 |
| **교과 세션 끝** | 배포 md5 확인 → `check 배포`·`check 허브 카드` → 재개지점 갱신 → `check-note` | 말 없이 |

```
검토 09-07 · 항목 23 · 지남 2 · 이번 주 5 · 방치 4
1 [지남]   ○○ 회신 k3x — 9/4 지났다. 오늘로? 버릴까?
2 [쪼개기] 중간고사 문항 m2p — 자체 검토 9/18 · 동교과 9/22 체크
3 [어긋남] 1-3 심화 세트 q8a — 보드 done · 재개지점 🔴. todo로?
4 [방치]   △△ r1d (34일) — 날짜를 주거나 버리기
번호로 반영.
```
검토 문장은 kind + 한 줄. 근거를 늘어놓지 않는다. 항목 내용을 작업노트·커밋 메시지에 옮겨 적지 않는다.

### 5.3 Claude가 교사 필드에 닿는 경우
1. `apply` — 교사가 반영하라고 한 뒤. 소유자 CLI.
2. 교과 항목 **체크** — 그 세션에서 Claude가 직접 끝냈고 배포는 md5까지 확인했을 때. 봇, `by:claude`.
3. `add` — `ok:false`로만.
4. `done <id>` — **교사가 「k3x 완료」처럼 말한 뒤에만.** 스스로 판단해 닫지 않는다. 규칙이 done 외의 status 값을 막는다.

### 5.4 작업노트와의 경계

| 무엇 | 정본 | 다른 쪽 |
|---|---|---|
| 상태·마감·중요도·체크(모든 영역) | **도구** | 재개지점의 ✅/🔴는 유지하되 교과 세션 끝에 Claude가 도구에 맞춘다 |
| 교과·앱 일의 내용(파일·남은 판단·함정·명령) | **`_재개지점.md`** | 도구는 제목 + 체크 + `ref`(`### N.` 번호)만 |
| 행정·행사 일, 동료, 내부 사안 | **도구만** | 작업노트·CLAUDE.md·커밋 메시지에 **절대 없다**(PUBLIC) |
| Claude 검토 | `reviews/` | 재개지점에 복제하지 않는다 |
| 노트 목록 | `작업노트/README.md` | 새 노트 `작업노트/업무관리도구.md` 한 줄 등록 |

`check-note`가 셋을 뱉는다: **도구에만** / **재개지점에만**(`### N.`이 있는데 `ref`로 가리키는 항목이 없음) / **충돌**(도구 done ↔ 재개지점 🔴 · 재개지점 ✅·취소선 ↔ 도구 미완료 · done인데 배포 체크 비어 있음). 어느 쪽도 자동으로 이기지 않는다 — `conflict`로 올려 교사가 고른다.

`_재개지점.md` 머리 한 줄: `행정·행사 할 일은 도구에 → node task_management/_cli.js pull`. 루트 CLAUDE.md는 손대지 않는다.

---

## 6. 저장소 · 인증 · 배포

**인증 설정(콘솔, 교사가 5분)** — 이메일/비밀번호 켜기 → 사용자 T·B 생성 → 가입 끔 → 이메일 열거 보호 켬 → 익명 인증 끔. 비밀번호 12자 이상, 어디에도 적지 않는다. 폰 분실 = T 비밀번호 변경(1시간 안에 그 폰이 끊긴다) — **단 그 폰의 localStorage 스냅샷은 남는다.** 그래서 스냅샷은 `memo`를 빼고 24시간 지나면 앱이 지운다(아래). 봇 유출 = B 비밀번호 변경.

**규칙 초안** `task_management/database.rules.json` (`T_UID`·`B_UID`는 콘솔 값. 비밀 아님)

```json
{ "rules": {
  ".read": false, ".write": false,
  "tm": {
    ".read": "auth != null && (auth.uid === 'T_UID' || auth.uid === 'B_UID')",
    "meta": {
      ".write": "auth != null && auth.uid === 'T_UID'",
      "lastReview": { ".write": "auth != null && auth.uid === 'B_UID'" },
      "reviewReq":  { ".write": "auth != null && (auth.uid === 'T_UID' || (auth.uid === 'B_UID' && newData.val() === false))" }
    },
    "tasks": { "$id": {
      ".write": "auth != null && (auth.uid === 'T_UID' || (auth.uid === 'B_UID' && !data.exists() && newData.child('createdBy').val() === 'claude' && newData.child('ok').val() === false && newData.child('status').val() === 'todo'))",
      ".validate": "newData.hasChildren(['title','status','area','priority','createdBy','createdAt'])",
      "title":    { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 200" },
      "status":   { ".write": "auth != null && auth.uid === 'B_UID' && data.exists() && newData.val() === 'done'",
                    ".validate": "newData.val() === 'todo' || newData.val() === 'doing' || newData.val() === 'done' || newData.val() === 'dropped'" },
      "doneAt":   { ".write": "auth != null && auth.uid === 'B_UID' && data.parent().child('status').exists()" },
      "updatedAt":{ ".write": "auth != null && auth.uid === 'B_UID' && data.parent().child('status').exists()" },
      "area":     { ".validate": "newData.val() === 'admin' || newData.val() === 'event' || newData.val() === 'class'" },
      "priority": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 3" },
      "due":      { ".validate": "newData.val().matches(/^\\d{4}-\\d{2}-\\d{2}$/)" },
      "createdBy":{ ".validate": "newData.val() === 'me' || newData.val() === 'notion' || newData.val() === 'claude'" },
      "claude":   { ".write": "auth != null && auth.uid === 'B_UID'" },
      "checks": { "$cid": {
        ".write": "auth != null && auth.uid === 'B_UID' && newData.child('by').val() === 'claude' && (!data.exists() || newData.child('text').val() === data.child('text').val())"
      } }
    } },
    "log": { "$id": { ".write": "auth != null && !data.exists() && (auth.uid === 'T_UID' || (auth.uid === 'B_UID' && newData.child('by').val() === 'claude' && newData.child('via').val() === 'bot'))" } },
    "reviews": { "$id": { ".write": "auth != null && (auth.uid === 'T_UID' || (auth.uid === 'B_UID' && !data.exists()))" } }
  }
} }
```

- `tm` 상위에 `.write`를 두지 않는다 — 상위 허용은 하위에서 못 거둔다.
- 봇이 손대는 자리마다 **덮어쓰기 방향을 규칙이 막는다**: 교사 체크는 `text` 불변(done·by·ts만), `log`는 봇이 `by:claude·via:bot`로만, `reviewReq`는 T가 켜고 B는 끄기만(`review-write` 성공 시 `reviewReq:false`·`lastReview`를 한 update로), 봇 생성 항목은 `status:todo`로만 태어난다. 봇의 `status` 쓰기는 **이미 있는 항목에 `done` 값만**(+`doneAt`·`updatedAt`).
- 규칙 정본은 로컬 파일 하나. 콘솔에서 고치지 않는다. 배포는 항상 `firebase deploy --only database --project <p>` / `--only hosting`. 이 폴더의 `.firebaserc`만 이 프로젝트를 가리킨다.
- `index.html`에 들어가는 것: `firebaseConfig`(공개 전제 값) + `T_UID`. 방어는 규칙이다.

**앱 → 백엔드** — Firebase compat SDK(CDN, 판 고정), `persistence: local`, 웹소켓 실시간. 온라인 쓰기는 항상 필드 경로 `update()`. 부팅 시 localStorage 스냅샷을 먼저 그리고 구독으로 갈아 끼운다. 스냅샷엔 `memo`를 넣지 않고 저장 시각을 붙여 **24시간 지나면 버린다**. 연결 끊기면 「읽기 전용 · 마지막 동기화 hh:mm」. 로그아웃 시 캐시 삭제.

**호스팅** — 같은 프로젝트 Firebase Hosting → `https://<프로젝트>.web.app`. `firebase.json`: `public: web`, `index.html` `Cache-Control: no-cache`. 서비스워커 없음. 설정 화면 빌드 스탬프.

**폰** — **Android**(2026-09-03 확정). Chrome 홈 화면 추가: data: URI manifest(⚠ 확인 필요 — `start_url` 절대 URL·192px 아이콘 필요, 실기기 미확인), 안 되면 북마크. iOS는 안 본다. 단일 파일 유지.

**폴더**
```
task_management/
  web/index.html          앱 (커밋)
  _cli.js  _test_taskboard.js  database.rules.json  firebase.json  .firebaserc  README.md   (커밋)
  _backup/  _import/      ★.gitignore 를 폴더 만들기 전에. git check-ignore -v 로 확인
```
`README.md`·주석·커밋 메시지에 실제 항목을 예로 쓰지 않는다. 커밋 전 `_노트_실명점검.py`.

**백업·복원** — `backup`은 검토마다 + 쓰기 명령 전. USB `_backup/` + PC 홈 두 곳, 30개 순환. 삭제는 `deletedAt` 소프트 삭제. `restore`는 diff 후 `--yes`.

---

## 7. 노션에서 이사 오는 절차

1. 노션 DB에 **Last edited time** 속성 추가. 「전체」 보기에서 필터 전부 해제(내보내기는 현재 보기를 따른다).
2. ⋯ → Export → Markdown & CSV, 하위 페이지 끔 → `task_management/_import/notion.csv`. 엑셀로 열지 않는다(BOM).
3. `node _cli.js import _import/notion.csv` (dry-run) → 행마다 `id · area · status · due · 체크 수 · 버린 열`. 날짜 파싱 실패·빈 상태·빈 영역은 붉게. 노션 날짜는 `September 12, 2026` 꼴도 온다.
4. 틀린 건 CSV에서 고치고 3 반복.
5. `--write` → `createdBy:notion`, `meta.cutoverAt`. 직전 `backup`.
6. 폰에서 영역별·상태별 건수 대조.
7. 노션 DB 잠금 + 이름 뒤 「(이전됨 2026-09-xx)」. 삭제하지 않는다.
8. 교과 항목은 `check-note`로 `### N.`과 짝짓는다. 짝이 없으면 「노트에 없음」으로 남긴다 — 임의로 짝짓지 않는다.
9. 개인허브 「할 일 관리」 카드가 무엇을 가리키는지 교사가 확인(vault라 코드로 못 본다) → 새 URL로 교체(배점계산기 노트 절차).

이사는 하루. 두 곳을 같이 쓰는 기간은 두지 않는다. 25개라 재타이핑(10분)으로 가도 된다 — 그 경우 3~5를 건너뛴다.

---

## 8. 마일스톤

| 단계 | 만드는 것 | 완료 조건 | 이 단계에서 할 수 있게 되는 것 |
|---|---|---|---|
| **M1 판** ✅ 2026-09-04 | `web/index.html` localStorage 모드 · 파서 · 오늘/전체 · 상세 시트 · 상태점 순환 · JSON/MD 복사 · `_test_taskboard.js` | 문법 예시 전부 회귀 검사 통과 · PC 브라우저에서 25개 입력·상태 변경이 된다 | PC에서 당장 쓴다. 노션 병행 |
| **M2 동기화·이사** | `.gitignore` 선행 → 프로젝트 · Auth(T) · 규칙 · Hosting 배포 · SDK 연결 · 스냅샷 캐시 · 빌드 스탬프 · `_cli.js import/backup`(CLI 경로) · 노션 컷오버 | 폰 로그인 후 재실행에도 유지 · 폰과 PC가 같은 목록 · 건수 대조 일치 · 노션 잠금 · `git check-ignore` 확인 | 폰에서 본다. 노션 끝 |
| **M3 Claude 읽기·쓰기** | 봇 B · 규칙 B 절 · `setup/pull/add/note/check` · 재개지점 머리 한 줄 · 세션 시작 3줄 규칙 · `작업노트/업무관리도구.md` | 새 세션이 `pull`을 돌리고 지남이 있을 때만 말한다 · 봇으로 `title` 쓰기·교사 체크 `text` 덮어쓰기·`reviewReq` 켜기가 규칙에 막힌다 · `.claude/settings.json`에 `Bash(firebase database:*)` deny · USB에 비밀 0건 | 세션 시작에 Claude가 판을 본다. **★계속 만들지의 관문** |
| **M4 검토 왕복** | `review-data/review-write/apply` · 검토 탭 [반영][무시] · 제안 띠(`ok:false`) · 폰 「검토 요청」 · `reviewReq` | 터미널 "1 3 반영"과 폰 [반영]이 같은 상태를 만든다 · 무시는 변화 없음 | 주간 검토가 돈다 |
| **M5 노트 연결** | `#교` 4틀 · `ref` · `check-note` 3분류 · 세션 끝 절차 · 첫 정합 검사 | 도구 done·재개지점 🔴를 만들면 `conflict`로 잡힌다 · 배포 체크는 Claude 세션이 찍는다 | 두 벌이 안 어긋난다 |
| **M6 다듬기** | 미루기 4단추(시험 뒤) · 방치 흐림 · 휴지통·되살리기 · 5초 되돌리기 · outbox(생성·상태만) · `restore` 실전 1회 · 3개월 뒤 안 쓴 화면·필드 제거 | 비행기 모드에서 적은 것이 재연결 후 도착 · 스냅샷에서 복원 통과 | 손에 익는다. 앱이 바뀌어도 데이터가 산다 |

M1·M2 각 반나절~하루. M3 이후는 각 반나절. 배포는 M2에서 먼저 하고 고쳐 재배포한다.

---

## 9. 열린 질문 — 교사만 답할 수 있는 것

1. **`my-tasks`(4월)·`todo-geung`(5월)을 왜 버리고 노션으로 갔는가.** 이번에 달라야 할 한 가지.
2. ~~노션 **완료 항목**도 옮기는가~~ → **완료도 전부**(2026-09-03).
3. ~~**폰 기종**~~ → **Android**(2026-09-03).
4. ~~**`status`를 Claude가 done으로 바꿔도 되는가**~~ → **된다. 단 교사가 말할 때만**(2026-09-03). 규칙은 B의 status 쓰기를 done 값에만 연다(§6).
5. 항목에 **동료 이름을 계속 쓸 것인가.** 쓰면 검토 표·Claude 답변으로 흐른다. 역할명(「부장」「담당자」)으로 쓸지.
6. ~~**이름**~~ → **`geung-taskboard` · 「업무판」**(2026-09-03). 허브 카드에 올릴지, 개인허브의 옛 「할 일 관리」 카드를 바꿀지는 미정.
7. **「이번 주」가 두 뜻이다** — 토큰 `@이번주` = 이번 주 금요일 / 오늘 화면의 「이번 주」 묶음 = 오늘+1~+7일. 묶음을 7일 창으로 둘지 「이번 주 금까지」로 맞출지.
8. **주 시작 요일** — 지금은 월요일 가정(일요일에 `@다음주`·`@담주월` = 내일). 맞는가.
9. 옛 도구 둘(레포 `my-tasks`·`todo-geung`, 프로젝트 `my-tasks-e28cb`)을 **보관하는가 지우는가**(`my-tasks-e28cb`는 6-대안이므로 프로젝트 생성이 끝날 때까지 두는 게 안전).
---

## 10. 진행 기록

### M1 ✅ 2026-09-04
- `web/index.html`(741행 · 단일 파일 · 외부 의존 0) · `_test_taskboard.js`(15절 · **633단언 · 0 실패**)
- 마커 4쌍 `CONFIG` / `PARSE` / `GROUP` / `STORE`. localStorage 는 STORE 블록 안에서만 — M2 에서 이 블록만 갈아 끼운다.
- 검증 3갈래(검사·변이 / 브라우저 실측 / PRD 대조)에서 지적 **32건** → 전부 반영. 특히
  - 오늘 탭 새 항목이 `meta.lastArea` 를 따라가 **교과 4틀이 조용히 붙던 것** → 오늘 탭 기본 `admin`, 4틀은 `#교` 를 직접 쳤을 때만
  - `>id` 수정이 **앱 계층에서 무시돼도 검사가 통과**하던 구멍 → 절 [15] 앱 실행(DOM·localStorage 스텁) 신설
  - `parse`·`groupToday` 가 인자 `today` 를 버리고 실제 시계를 써도 통과하던 구멍 → 금지어에 `Date.now`·`new Date()`·`globalThis` 추가 + 다른 기준일 단언
  - STORE 가 **검사에서 한 번도 실행되지 않던 것** → 절 [14] STORE 실행(null=삭제·중첩 경로·구독 알림)
  - 📅 로 고른 날짜가 `@M/D` 로 들어가 **연도를 잃던 것** → `@YYYY-MM-DD` 그대로
  - 토스트가 미리보기 칩을 덮음 · 시트를 다시 그릴 때 스크롤·`details` 가 튐 · 칩 44px 미만 · 구분선이 회색 덩어리
- **변이 14종 전부 FAIL 확인**(공백 규칙 · 담주 · 4틀 · 빈 묶음 · 정렬 · `>id` 앱 분기 · 메모 · `@없음` · parse 시계 · STORE null · `ok:false` · 4틀 탭 오염 · groupToday 시계 · taskList 키 우선).
- ⚠ **브라우저 실측은 iframe 측정으로만 했다** — 크롬 확장이 이 세션에서 끊겨 실기기 확인 미완. 실제 안드로이드 키보드·한글 IME 조합 엔터·safe-area 는 M2 배포 후 폰에서 볼 것.

### M2 (2026-09-04) — 동기화까지 올라갔다. 남은 것은 노션 이사

**라이브** https://geung-taskboard.web.app · 프로젝트 `geung-taskboard` · RTDB `asia-southeast1`
- 인증 이메일/비밀번호 · 사용자 **T**(교사) `xmj4YN…` · **B**(봇) `ts8Vl…`. 비밀번호는 교사만 안다.
- 규칙·호스팅 배포 완료. 라이브 md5 = 로컬. **무인증 읽기 401** 확인.
- `index.html` — STORE 블록은 그대로 두고 `tmSync` 가 붙으면 원격 모드가 된다(검사 [14] 를 안 깨려고).
  스냅샷 캐시는 `tm.snap` 에 **memo 를 빼고 24시간** 만. 로그아웃하면 `tm`·`tm.snap` 둘 다 지운다.
- `_cli.js` — `backup` · `import <csv> [--write]` · `restore <file> [--yes]`(소유자 CLI 경로).
- 검사 **660**(`_test_taskboard.js`, 절 [16] 신설) + **76**(`_test_cli.js`) · 0 실패.
  변이 M1 14종 · M2 10종 · CLI 9종 전부 FAIL 확인.
- 라이브 왕복을 실제로 한 번 돌렸다: backup → import --write(8개) → 두 번 넣기 차단 → restore diff → restore --yes → 라이브 비움.

**밟은 함정 넷** (다음에 또 만난다)
| | |
|---|---|
| node 24 + 윈도 | `.cmd` 직접 실행 금지(EINVAL) → `firebase.js` 를 `node` 로 부른다 |
| firebase CLI + 윈도 | **STDIN 을 안 받는다** → 보낼 JSON 은 임시 파일에 써서 infile 로 |
| `database:set/update` | `-f` 없으면 확인 프롬프트에서 죽는다 · 리전이 달라 `--instance` 필요 |
| Bash 도구 heredoc | `\\` 를 `\` 로 삼킨다(두 겹이 한 겹이 된다) — 정규식·JSON 을 heredoc 으로 쓰지 말 것(규칙 JSON·`_cli.js` 에서 두 번 밟았다) |

**고친 진짜 버그** — `fromRemote`/`read` 가 `Object.assign(fresh(), d)` 라 **RTDB 의 `meta` 에 칸이 하나라도 없으면 기본값이 통째로 날아갔다.** 칸별 병합(`merge()`)으로. 검사 [16] 이 잡았다.

### M2-b (2026-09-04) — 화면을 노션으로

교사 지시: 「원래 내 노션의 UI도 깔끔하게 가져가 줬으면」 · 「노션 감성도 넣어 줘. 너가 만들어 주는 UI가 은근 맘에 안 들어」
→ 새 감성을 만드는 게 아니라 **노션의 디자인 시스템을 그대로 옮긴다**(브리프가 방향을 못박은 경우다).

| 무엇 | 어떻게 |
|---|---|
| 색 | 글자 = 노션의 먹빛 **#37352F**(순검정 금지) · 선 `rgba(55,53,47,.09)` · 파랑 #2383E2 는 단추와 초점에만 |
| 태그 | 노션 라이트 팔레트 9색(배경·글자 짝). 영역 = 행정 주황 / 행사 빨강 / 교과 파랑. 중요도 = 높음 빨강 / 낮음 회색. **보통은 태그를 안 붙인다**(기본값이라 군더더기) |
| 글꼴 | 한 벌(시스템 스택 — 노션이 쓰는 그것). 외부 폰트 없음 |
| 밀도 | ★**폰 16px / PC 14px·열 머리 12px.** 노션 표는 촘촘한데 폰은 그러면 못 읽는다 → 검사도 폰/PC 를 갈라 잰다 |
| 보기 | **오늘 · 전체 · 상태 보드 · 캘린더 · 검토** 5개. 노션에 있던 셋(전체·보드·캘린더)에 「오늘」을 더했다 |
| 표 | PC 에서 6열 grid(업무·상태·마감일·영역·중요도·체크포인트) + 붙박이 열 머리 + 상태별 접히는 그룹. 폰에서는 두 줄짜리 목록으로 무너진다 |
| 아이콘 | 항목마다 이모지 한 칸(`icon`). 시트에서 눌러 고른다(교사 결정: 자동으로 붙이지 않는다). 노션 CSV 엔 아이콘이 없어 이사 뒤엔 빈 칸으로 시작 |

- 검증된 네 블록(`PARSE`·`GROUP`·`STORE`·`SYNC`)은 **한 글자도 안 건드리고** 화면 계층만 다시 썼다.
- 검사 **746**(절 [17] 노션 화면 신설) + 76 · 0 실패. 변이 10종 전부 FAIL.
- 다시 쓰다가 흘린 동작 7가지를 검사가 도로 잡아 줬다 — 생성 log 가 `create` 인 것 · 미루기 날짜 정렬·중복 제거 · 체크의 `data-ck` · 시트의 `ref` 입력 · 시험 기간 두 칸 함께 읽기 · MD 표 두 벌 · 검토 단추가 붙박이 요소여야 하는 것.
- ★**검사 도구 자체의 구멍 하나**: 「PC 분기」를 `indexOf` 로 잘라 쓰면 `@media (min-width:768px)` → `9999px` 로 바꾼 변이를 못 잡는다. 중괄호를 세어 **그 조건의 블록만** 모으는 `pcBlocks()` 로 고쳤다.

🔴 **남은 것**
1. 교사가 폰에서 로그인 확인(안드로이드 · 홈 화면 추가)
2. 노션 CSV 내보내기 → `_cli.js import` → 건수 대조 → 노션 잠금
3. ⚠ **규칙 검증 미완** — 봇 토큰을 못 만들어(서비스 계정 `signJwt` 권한 없음) T·B 권한을 실제로 두드리지 못했다. **M3 에서 봇 비밀번호가 생기면** `scratchpad/rules_probe.mjs` 를 그대로 돌린다(무인증 401 만 확인된 상태).

### (지난 기록) M2 준비 (2026-09-04)
- Firebase 프로젝트 **`geung-taskboard`** 생성 완료. RTDB `https://geung-taskboard-default-rtdb.asia-southeast1.firebasedatabase.app` (ACTIVE).
- 웹앱 등록 · `database.rules.json`(T·B 2계정, done 권한 반영) · `firebase.json` 작성 완료.
- 🔴 **남은 것 — 교사가 콘솔에서 1분**: 이메일/비밀번호 로그인 켜기. REST 로 켜려니 `BILLING_NOT_ENABLED`(Identity Platform 경로) 가 난다. 콘솔에서는 무료로 켜진다.
  https://console.firebase.google.com/project/geung-taskboard/authentication/providers
  그다음 사용자 T(교사)·B(봇) 생성 · 가입 끄기 · 이메일 열거 보호.
