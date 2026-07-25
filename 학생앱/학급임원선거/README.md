# 학급 임원 선거 투표 앱

학급회장·부회장 선거용 실시간 투표/개표 앱. 상세 노트 = `작업노트/학급임원선거_투표앱.md`

- `index.html` — 학생용 투표소 (핸드폰). 학번 확인 → 기표 → 투표함 투입. **후보가 1명이면 자동 찬반 투표.**
- `admin.html` — 교사용 개표 현황판 (전자칠판). 선거 개설 → 실시간 투표함·QR → 개표(한 표씩 「正」자 집계) → 당선 발표.

## 정본·배포

- **정본 = 이 폴더.** 수정하면 `E:\AI tool\긍스쿨 허브\class-vote\`(배포 레포)에 복사 후 push해야 라이브 반영.
- 배포: https://geungschool-hub.github.io/class-vote/ (+ `admin.html`)
- 백엔드: gongju7-vocab RTDB `vote/` 공개경로 (규칙 정본 `시험목표제출/database.rules.json`)

Claude AI로 이 앱을 제작함 by 고은표
