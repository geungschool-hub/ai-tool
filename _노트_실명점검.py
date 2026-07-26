# -*- coding: utf-8 -*-
"""작업노트에 학생 실명·학번이 들어갔는지 검사한다 — 커밋 전에 돌릴 것.

    python _노트_실명점검.py

★이 저장소는 PUBLIC 이다. 노트에 실명이 들어가면 그대로 인터넷에 공개된다.
  실제로 2026-07-26 에 `20615이미소` 같은 예시가 노트에 박혀 푸시된 적이 있다(사후 제거).
  명단 정본은 gitignore 된 폴더에 있으므로 이 검사는 **로컬에서만** 의미가 있다.

종료코드 0 = 깨끗 / 1 = 발견(커밋하지 말 것)
"""
import json, sys, re, glob, os, subprocess

sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
ROSTER = os.path.join(BASE, '생기부_통합', '자료', '생기부_반명단_병합_20260709.json')

# 학생 아닌 것으로 확인된 번호(교사 관리자 계정 등) · 형식 설명용 예시
ALLOW_ID = {'20700', '20105', '20615'}


def load_names():
    if not os.path.exists(ROSTER):
        print('⚠ 명단 정본이 없다(%s) — 실명 대조는 건너뛰고 학번만 본다.' % ROSTER)
        return set()
    r = json.loads(open(ROSTER, encoding='utf-8').read())
    out = set()
    for c in (r.get('classes') or r).values():
        for s in (c.get('students') or {}).values():
            n = re.sub(r'\(.*?\)', '', s.get('name') or '').strip()
            if len(n) >= 2:
                out.add(n)
    return out


def main():
    names = load_names()
    # ★git 이 추적하는 파일만 본다. gitignore 된 문서(인수인계 메모 등)는 공개되지 않으므로
    #   검사 대상이 아니다 — 여기에 실명이 있어도 유출이 아니다.
    r = subprocess.run(['git', 'ls-files', '-z'], cwd=BASE, capture_output=True)
    tracked = [x for x in r.stdout.decode('utf-8').split('\0') if x.endswith(('.md', '.txt'))]
    files = [os.path.join(BASE, x) for x in tracked]
    hits = []
    for f in files:
        try:
            t = open(f, encoding='utf-8').read()
        except Exception:
            continue
        rel = os.path.relpath(f, BASE)
        for i, line in enumerate(t.split('\n'), 1):
            for n in sorted(names):
                if n in line:
                    hits.append((rel, i, '실명 ' + n, line.strip()))
            # ★URL·URL인코딩 문자열 안의 숫자는 상품코드 등이다 → 오탐
            in_url = ('http' in line) or ('%' in line and re.search(r'%[0-9A-F]{2}', line))
            for m in re.finditer(r'(?<!\d)20[0-7]\d{2}(?!\d)', line):
                if m.group(0) not in ALLOW_ID and not in_url:
                    hits.append((rel, i, '학번 ' + m.group(0), line.strip()))

    print('추적 문서 %d개 · 명단 %d명 대조' % (len(files), len(names)))
    if not hits:
        print('\n✅ 실명·학번 0건 — 커밋해도 된다.')
        return 0
    print('\n✗ %d건 발견 — 커밋 전에 지울 것' % len(hits))
    for rel, i, w, line in hits:
        print('\n  %s:%d  [%s]' % (rel, i, w))
        print('     %s' % line[:140])
    print('\n고치는 법: 이름은 빼고 **인원수와 경로만** 쓴다.')
    print('  예) "공동 제출 2쌍(도○○·허○○)"  ✗')
    print('      "공동 제출 2쌍(누구인지는 <gitignore된 파일 경로>)"  ○')
    return 1


if __name__ == '__main__':
    sys.exit(main())
