# 영단어장 앱 — 2026-06-15 본격 시작 & "어제의 TOP3" 팝업

배포: https://gongju7-vocab.web.app (Firebase `gongju7-vocab`, 관리자 `/admin.html`, 관리자 학번 20700)
폴더: `E:\AI tool\english-vocab\` · 상세 이력은 PC 메모리 `project_english_vocab.md` 참조(이 노트는 USB 동반 요약).

## 2026-06-15 본격 시작 — 부분 리셋(계정 보존)
사용자 결정: **학생 계정·정보는 모두 그대로 두고, 점수·단어 진도·날짜 진도만 1일차로** 초기화(점수·랭킹도 0 = 깨끗한 시작). 6/11 노트의 '전체 초기화'와 다름.

실행한 DB 변경(`npx firebase-tools`, `MSYS_NO_PATHCONV=1`, `-f`, HOME=/c/Users/USER):
- `vocab/students` 18명 전체교체 — **보존**: studentId·name·nickname·pinHash·level·createdAt / **0화**: c·g·k·cb·sp·streak·lastStudyDay·week=1 / **제거**: wk\*·wkSeason·ansTotal·ansCorrect·gradPassed
- `vocab/progress`=null, `vocab/cheers`=null, `vocab/classGoal/count`=0(전 830), `vocab/seasons`=이미 null
- `vocab/config.startDate` = **2026-06-15** (오늘=DAY1)
- 검증: 18명 점수0·잔존필드0·식별정보 보존 확인

주의:
- **plus**(능률VOCA): levelCfg openWeekdays=[1,3,5] → 월요일=DAY1만 열림.
- **basic**(워드마스터, 이미 시드됨): levelCfg 없어 전역폴백(period방식) → DAY1~3 한 번에 열림. basic도 월수금으로 맞추려면 `vocab/config/levelCfg/basic`={openWeekdays:[1,3,5],newPerDay:20,reviewPerDay:7} 설정 필요(준비파일 `english-vocab/_db_backup/levelcfg_basic_2026-06-11.json`). **사용자 요청 없어 미설정.**

## 신규 기능 — "어제의 1~3등" 칭찬 팝업
매일 첫 접속 시 1회, 지난 학습일 같은레벨 TOP3 닉네임+점수를 👑🥈🥉 모달로 축하.
- **데이터**: 학생레코드에 `daySeason`(YYYY-MM-DD)·`dPts`(그날 5종점수 합) 추가 + 신규 경로 **`vocab/daily/{날짜}/{레벨}/{학생}={nick,pts}`**. finishSession에서 본인 그날 누계를 매 세션 set(관리자·테스트계정 제외). 주간 seasons의 일 단위 버전.
- **표시**: enterApp→`maybeShowDailyTop3()`. localStorage `vocab_dailyTop3Seen_{accountId}`로 하루1회. `vocab/daily` 읽어 오늘 이전+내레벨 데이터 있는 가장 최근 날짜의 top3(어제면 '어제', 아니면 'M월D일(요일)'). 데이터 없으면 미표시. 관리자(20700)는 팝업 제외.
- **규칙**: `database.rules.json`에 `daily`(auth!=null) 추가 → `deploy --only hosting,database`.
- 변경 파일: `index.html`, `database.rules.json`. node --check 통과·배포 완료. **git 미커밋**(요청 시).
- 첫 팝업은 **내일** 표시(오늘 학생 학습으로 daily 데이터가 쌓여야 함). 오늘은 데이터 없어 조용히 넘어감.

## 2026-06-16 버그수정 — 하루 새 단어 상한(진도 무한 진행 차단)
증상: 학생이 하루 20개만 하는 게 아니라 열린 DAY 안에서 새 단어를 무한정 진행 가능.
원인: `buildToday()`의 새 단어 = "prog에 없는 단어 20개"라 세션 끝나면 그 20개가 prog 등록 → 다시 시작하면 다음 20개… 하루 단위 상한 부재. (plus DAY1 ~45단어, basic은 DAY1~3 동시개방이라 더 심함)
수정(`index.html`):
- `schedule()`: 새 단어 첫 등장 시 `prog[id].intro = D`(학습 일차) 기록.
- `buildToday()`: 오늘(D) `intro===D`인 단어 수를 세어 `newPerDay - introToday`만큼만 새 단어 개방. 복습은 기존대로 due·reviewPerDay 제한.
- 안전성: 기존 intro 없는 prog는 이미 학습분이라 새로 안 나옴. INTERVALS[1]=1이라 오답도 due 내일 → 같은 날 복습 재등장 없음.
- node --check 통과 → `deploy --only hosting` 완료. **git 미커밋**(index.html엔 TOP3팝업+이 수정이 함께 미커밋 상태).

## 2026-06-16 골자 변경 — 무제한 연습 + "하루 첫 시도만 랭킹"
아침의 '하루 새 단어 차단'은 폐기(연습 막는 건 비교육적). 대신:
- **첫 시도(graded)만** 점수·진도(SRS)·시즌(wk)·일별(dPts/daily)·공동목표 반영. `gradedToday()=state.lastStudyDay===todayIndex()`.
- 이후 시작은 **연습 모드**: `buildPractice()`(이미 열린 단어 무작위) 드릴, **점수·진도 불변**(schedule 호출 안 함). 결과/퀴즈 피드백에서 점수 숫자 미표시.
- 새 단어 페이싱은 첫 시도에서만 newPerDay 도입돼 자연 유지. buildToday/schedule은 원복(intro 필드 제거).
- 두 번째 시작 누르면 **복습 칭찬 모달**(`practiceModal`, localStorage `vocab_practiceIntro_{acct}_{day}`로 하루1회).
- 변경: `index.html`만. 배포·커밋 완료.

## 2026-06-16 관리자 점수보정 기능(admin.html)
학생 행 [점수보정] 버튼→모달(5점수+정답수/푼수 편집). 변경분을 wk*·daily에도 동일 반영. 이력 `vocab/scoreLog`(규칙 추가). **이 작업 PC는 학교망이 RTDB '쓰기'를 막음**(읽기·호스팅·규칙배포는 됨) → 데이터 직접수정 불가, 보정은 **교사 기기에서 admin.html로**. 양수빈(20711·basic·닉'와') 어제 6회시행 1418점 → 1세션값 248점(c190/k10/cb18/sp30, 정답률19/20)으로 보정 예정(미적용).

## 운영 메모
- 학교망 TLS로 이 PC 실테스트 불가 → 선생님 기기 확인. iOS는 캐시 공격적 → PWA 완전 종료 후 재실행 안내.
- 단어 시드/규칙 등 DB 변경 명령·함정은 메모리 `feedback_firebase_deploy_npx`·`project_english_vocab.md` 참조.
