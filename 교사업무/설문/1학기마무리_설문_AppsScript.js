/**
 * 1학기 마무리 설문 자동 생성 스크립트 (Google Apps Script)
 * ─────────────────────────────────────────────────────────
 * 사용법
 *  1) 구글 드라이브 → 새로 만들기 → Google Sheets(스프레드시트)
 *  2) 상단 메뉴: 확장 프로그램 → Apps Script
 *  3) 기존 코드(function myFunction(){}) 전체 삭제
 *  4) 이 파일을 '메모장'으로 열어 전체 복사 → 붙여넣기 (채팅에서 직접 복사 금지: 따옴표 깨짐)
 *  5) 저장(Ctrl+S)
 *  6) 상단 함수 목록에 'START_makeBothForms' 하나만 보임 → ▶ 실행 → 권한 승인
 *  7) 하단 '실행 로그(Execution log)' 맨 아래 요약 박스에 두 설문 URL이 출력됨
 *
 * ※ 두 설문 만드는 함수를 하나로 합쳐서, 실수로 한 개만 실행되는 일이 없게 했습니다.
 * ※ 만들어진 설문은 구글 드라이브 '최근 항목'에도 자동 저장됩니다.
 */

function START_makeBothForms() {
  var results = [];
  var errors = [];

  // ── 설문 1: 생명과학 수업 & 기말고사 (독립 실행: 실패해도 설문 2는 계속) ──
  try {
    results.push(buildClassFeedbackForm());
  } catch (e) {
    errors.push('설문 1(생명과학 수업/기말) 생성 실패 → ' + (e && e.message ? e.message : e));
  }

  // ── 설문 2: 1학기 마무리 주제발표 참여 조사 (독립 실행) ──
  try {
    results.push(buildPresentationForm());
  } catch (e) {
    errors.push('설문 2(주제발표) 생성 실패 → ' + (e && e.message ? e.message : e));
  }

  // ── 최종 요약 (실행 로그 맨 아래에서 확인) ──
  Logger.log('');
  Logger.log('===================================================');
  Logger.log('  생성 성공: ' + results.length + '개 / 실패: ' + errors.length + '개');
  Logger.log('  (성공한 설문은 구글 드라이브 최근 항목에도 저장됩니다)');
  Logger.log('===================================================');
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    Logger.log('');
    Logger.log('[' + (i + 1) + '] ' + r.title);
    Logger.log('   학생에게 줄 링크(응답용): ' + r.publishedUrl);
    Logger.log('   내가 수정할 링크(편집용): ' + r.editUrl);
  }
  if (errors.length > 0) {
    Logger.log('');
    Logger.log('----- 오류 메시지 (이 내용을 복사해서 알려주세요) -----');
    for (var j = 0; j < errors.length; j++) {
      Logger.log('  ! ' + errors[j]);
    }
  }
  Logger.log('===================================================');

  return { ok: results, errors: errors };

  /* ========================================================
   * 설문 1: 생명과학 수업 & 기말고사 돌아보기 (익명)
   * ====================================================== */
  function buildClassFeedbackForm() {
    var form = FormApp.create('생명과학 수업 & 기말고사 돌아보기');
    form.setDescription(
      '한 학기 동안 생명과학 수업 정말 고생 많았어요!\n' +
      '더 좋은 수업을 만들기 위해 여러분의 솔직한 생각을 듣고 싶어요.\n' +
      '이 설문은 익명이에요. 편하게 답해 주세요. (약 3~4분)'
    );
    form.setCollectEmail(false);
    form.setProgressBar(true);

    // A. 수업 전반
    form.addSectionHeaderItem().setTitle('1. 수업 전반');

    form.addScaleItem()
      .setTitle('한 학기 생명과학 수업은 전반적으로 어땠나요?')
      .setBounds(1, 5)
      .setLabels('많이 아쉬웠어요', '정말 좋았어요')
      .setRequired(true);

    form.addMultipleChoiceItem()
      .setTitle('수업 진도(속도)는 어땠나요?')
      .setChoiceValues(['너무 빨랐다', '조금 빨랐다', '딱 적당했다', '조금 느렸다', '너무 느렸다'])
      .setRequired(true);

    form.addMultipleChoiceItem()
      .setTitle('수업 내용의 난이도는 어땠나요?')
      .setChoiceValues(['매우 어려웠다', '어려웠다', '적당했다', '쉬웠다', '매우 쉬웠다'])
      .setRequired(true);

    // B. 학습지·활동
    form.addSectionHeaderItem().setTitle('2. 학습지와 활동');

    form.addScaleItem()
      .setTitle('학습지가 공부에 도움이 되었나요?')
      .setBounds(1, 5)
      .setLabels('별로 안 됐어요', '많이 됐어요')
      .setRequired(true);

    form.addCheckboxItem()
      .setTitle('공부에 도움이 되었거나 기억에 남는 활동을 모두 골라 주세요.')
      .setChoiceValues([
        '학습지 빈칸 채우기',
        '복습 퀴즈',
        '혈액형 판정 수행평가',
        '진화 논설문 수행평가',
        '인터랙티브 웹 활동',
        '선생님 설명·판서'
      ])
      .setRequired(false);

    form.addCheckboxItem()
      .setTitle('가장 흥미로웠던 단원을 골라 주세요. (여러 개 선택 가능)')
      .setChoiceValues([
        '생명 시스템의 구성 (물질대사·기관계·생태계)',
        '항상성과 몸의 조절 (신경·내분비·면역)',
        '생명의 연속성과 다양성 (유전·진화·생물 분류)'
      ])
      .setRequired(false);

    form.addCheckboxItem()
      .setTitle('가장 어려웠던 단원을 골라 주세요. (여러 개 선택 가능)')
      .setChoiceValues([
        '생명 시스템의 구성 (물질대사·기관계·생태계)',
        '항상성과 몸의 조절 (신경·내분비·면역)',
        '생명의 연속성과 다양성 (유전·진화·생물 분류)'
      ])
      .setRequired(false);

    // C. 기말고사
    form.addSectionHeaderItem().setTitle('3. 기말고사 돌아보기');

    form.addMultipleChoiceItem()
      .setTitle('기말고사 난이도는 어땠나요?')
      .setChoiceValues(['매우 어려웠다', '어려웠다', '적당했다', '쉬웠다', '매우 쉬웠다'])
      .setRequired(true);

    form.addMultipleChoiceItem()
      .setTitle('시험 범위와 분량은 어땠나요?')
      .setChoiceValues(['너무 많았다', '조금 많았다', '적당했다', '조금 적었다'])
      .setRequired(true);

    form.addScaleItem()
      .setTitle('시험 문제가 수업·학습지에서 다룬 내용과 잘 연결되었나요?')
      .setBounds(1, 5)
      .setLabels('연결이 약했어요', '아주 잘 연결됐어요')
      .setRequired(true);

    form.addMultipleChoiceItem()
      .setTitle('기말고사 준비는 어떻게 했나요?')
      .setChoiceValues([
        '거의 준비하지 못했다',
        '시험 직전에 벼락치기했다',
        '며칠 전부터 준비했다',
        '평소에 꾸준히 준비했다'
      ])
      .setRequired(false);

    form.addParagraphTextItem()
      .setTitle('다음 시험(문제·범위·안내 등)과 관련해 선생님께 바라는 점이 있다면 적어 주세요.')
      .setRequired(false);

    // D. 마무리 자유 서술
    form.addSectionHeaderItem().setTitle('4. 마무리 한마디');

    form.addParagraphTextItem()
      .setTitle('수업에서 좋았던 점을 자유롭게 적어 주세요.')
      .setRequired(false);

    form.addParagraphTextItem()
      .setTitle('이건 좀 개선됐으면 좋겠다 하는 점을 적어 주세요.')
      .setRequired(false);

    form.addParagraphTextItem()
      .setTitle('선생님께 하고 싶은 말이 있다면 편하게 적어 주세요. (선택)')
      .setRequired(false);

    return collectUrls('생명과학 수업 & 기말고사 돌아보기', form);
  }

  /* ========================================================
   * 설문 2: 1학기 마무리 주제발표 참여 조사 (학번/이름)
   * ====================================================== */
  function buildPresentationForm() {
    var form = FormApp.create('1학기 마무리 주제발표 참여 조사');
    form.setDescription(
      '1학기를 마무리하며 진행할 주제발표 참여 여부를 조사해요.\n' +
      '누가 참여하는지 확인해야 해서 학번과 이름을 적어 주세요.\n' +
      '부담 갖지 말고 솔직하게 답하면 됩니다. (약 2분)'
    );
    form.setCollectEmail(false);
    form.setProgressBar(true);

    form.addTextItem()
      .setTitle('학번 (예: 20701)')
      .setRequired(true);

    form.addTextItem()
      .setTitle('이름')
      .setRequired(true);

    form.addMultipleChoiceItem()
      .setTitle('주제발표에 참여하시겠어요?')
      .setChoiceValues([
        '참여할래요',
        '아직 고민 중이에요',
        '이번에는 참여하지 않을래요'
      ])
      .setRequired(true);

    form.addMultipleChoiceItem()
      .setTitle('참여한다면 발표 형태는 어떤 게 좋나요?')
      .setChoiceValues([
        '혼자(개인) 발표',
        '짝 또는 소그룹 발표',
        '상관없어요'
      ])
      .setRequired(false);

    form.addCheckboxItem()
      .setTitle('관심 있는 주제 분야를 골라 주세요. (여러 개 선택 가능)')
      .setChoiceValues([
        '생명과학 관련 주제',
        '환경·시사 이슈',
        '진로·직업 탐색',
        '취미·특기 소개',
        '자유 주제'
      ])
      .setRequired(false);

    form.addParagraphTextItem()
      .setTitle('발표하고 싶은 주제나 아이디어가 이미 있다면 적어 주세요. (선택)')
      .setRequired(false);

    form.addParagraphTextItem()
      .setTitle('궁금한 점이나 선생님께 요청할 것이 있으면 적어 주세요. (선택)')
      .setRequired(false);

    return collectUrls('1학기 마무리 주제발표 참여 조사', form);
  }

  /* URL 수집
   *  - 편집 URL은 getEditUrl() 호출에 의존하지 않고 폼 ID로 직접 조립한다.
   *    (getEditUrl()이 권한/폼 버전 문제로 실패해도 편집 링크는 항상 출력됨)
   *  - 응답 URL만 getPublishedUrl()로 받고, 혹시 실패하면 편집화면 [보내기]로 안내. */
  function collectUrls(title, form) {
    var id = form.getId();
    var editUrl = 'https://docs.google.com/forms/d/' + id + '/edit';
    var publishedUrl = '(응답용 링크 실패 - 위 편집 링크를 열어 [보내기] 버튼으로 받으세요)';
    try { publishedUrl = form.getPublishedUrl(); } catch (e) {}
    return { title: title, id: id, publishedUrl: publishedUrl, editUrl: editUrl };
  }
}
