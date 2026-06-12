function createSurvey() {
  var form = FormApp.create('생명과학 수업 설문조사');
  form.setCollectEmail(false);
  form.setShowLinkToRespondAgain(false);
  form.setShuffleQuestions(false);

  // 1. 수업 전반
  form.addSectionHeaderItem()
    .setTitle('수업 전반');

  form.addScaleItem()
    .setTitle('수업 내용이 얼마나 잘 이해되었나요?')
    .setBounds(1, 5)
    .setLabels('전혀 이해되지 않았다', '매우 잘 이해되었다')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('수업 진행 속도는 어떠했나요?')
    .setChoiceValues(['너무 빠르다', '약간 빠르다', '적당하다', '약간 느리다', '너무 느리다'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('수업에서 가장 좋았던 점은 무엇인가요?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('수업에서 아쉬웠던 점이나 개선됐으면 하는 점은 무엇인가요?')
    .setRequired(false);

  // 2. 학습지
  form.addSectionHeaderItem()
    .setTitle('학습지');

  form.addScaleItem()
    .setTitle('학습지가 내용을 이해하는 데 얼마나 도움이 되었나요?')
    .setBounds(1, 5)
    .setLabels('전혀 도움이 안 됐다', '매우 도움이 됐다')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('학습지의 분량은 어떠했나요?')
    .setChoiceValues(['너무 많다', '약간 많다', '적당하다', '약간 적다', '너무 적다'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('학습지에 대해 개선됐으면 하는 점이 있다면 적어주세요.')
    .setRequired(false);

  // 3. 앞으로 원하는 수업
  form.addSectionHeaderItem()
    .setTitle('앞으로 원하는 수업');

  form.addCheckboxItem()
    .setTitle('어떤 방식의 수업을 원하나요? (복수 선택 가능)')
    .setChoiceValues(['선생님 강의 위주', '학습지 중심 자기주도 학습', '영상 시청 후 토론', '모둠 활동', '실험 및 탐구 활동', '퀴즈 및 게임 활용'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('앞으로의 수업에 바라는 점을 자유롭게 적어주세요.')
    .setRequired(false);

  var url = form.getPublishedUrl();
  Logger.log('설문 링크: ' + url);
}
