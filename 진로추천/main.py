# -*- coding: utf-8 -*-
"""
진로·학과 매칭 상담 챗봇 (CLI) — 환경 계열 MVP
=================================================

추천 로직 의사코드 (RAG 구조)
-----------------------------
1) questions.yaml 순서대로 8문항을 한 번에 하나씩 물어 응답을 모은다.
2) 응답을 키워드로 변환한다.
     gained_keywords = q1·q2·q4·q5·q6 옵션의 태그 모음
     weak_keywords   = q3(약한 과목)
     region          = q7,  grade_band = q8
3) 트랙 점수 = Σ(gained_keywords ∩ track.keywords)        # 키워드 교집합
              − 2 × |weak_keywords ∩ track.keywords|       # 약한 과목 감점
   (동점이면 majors.yaml 등재 순서로 안정 정렬)
4) 상위 2개 트랙을 고른다.
5) grade_band 로 universities 의 어느 칸(top/mid_high/mid)을 보여줄지 정한다.
     '모름' → 세 칸 모두. 해당 칸이 비면 인접 칸으로 보완.
6) 뽑힌 '2개 트랙의 데이터만' 들고 결과를 출력한다.
     · ANTHROPIC_API_KEY 가 있으면 → LLM 이 그 데이터만으로 설명을 다듬음(자유 생성 금지)
     · 없으면 → 결정론적 템플릿으로 출력(완전 무료, 기본값)
7) 더 좁히기 위한 후속 질문 2~3개를 제시한다.

데이터에 없는 학과·대학은 절대 만들지 않는다(majors.yaml 가 유일한 출처).
"""

import os
import sys

# Windows 기본 콘솔(cp949)에서 '—' 등 한글 외 문자 출력 시 UnicodeEncodeError 방지
for _stream in (sys.stdout, sys.stdin):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import yaml
except ImportError:
    print("PyYAML 이 필요해요.  →  pip install pyyaml")
    sys.exit(1)

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")

# LLM 이 설명을 다듬을 때 쓰는 system 프롬프트(자유 생성 금지·데이터 안에서만).
SYSTEM_PROMPT = """너는 한국 고등학생을 위한 진로·학과 매칭 상담사다.

[행동 원칙]
- 학생이 답한 키워드를 근거로만 추천한다. 추측·과장 금지.
- 학과명·대학명은 반드시 제공된 데이터 안에서만 골라 쓴다. 새로 만들지 않는다.
- 같은 '환경'이라도 소속 단과대(공대/자연대/농생대/사회대)에 따라 배우는 내용이
  다르다는 점을 항상 함께 설명한다.
- 성적 정보가 없으면 성적대별 후보를 모두 보여준다.
- '정답'을 단정하지 않고 2개 트랙을 비교형으로 제시한다. 부드러운 존댓말, 권유형 표현.
- "반드시 ~해야 한다", "무조건 의대/SKY" 같은 가치판단 금지.
"""


# ───────────────────────── 데이터 로드 ─────────────────────────
def load_yaml(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return yaml.safe_load(f)


# ───────────────────────── 질문 진행 ─────────────────────────
def ask_single(q):
    print("\n" + q["prompt"])
    opts = q["options"]
    for i, o in enumerate(opts, 1):
        print(f"  {i}. {o['label']}")
    while True:
        raw = input("번호 입력 > ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(opts):
            return opts[int(raw) - 1]
        print("  목록에 있는 번호로 골라주세요.")


def ask_multi(q):
    n = q.get("select", 2)
    print(f"\n{q['prompt']}  (숫자 {n}개를 띄어쓰기로, 예: 3 4)")
    opts = q["options"]
    for i, o in enumerate(opts, 1):
        print(f"  {i}. {o['label']}")
    while True:
        parts = input("번호들 입력 > ").strip().split()
        idx = [int(p) for p in parts if p.isdigit()]
        idx = [i for i in idx if 1 <= i <= len(opts)]
        if len(set(idx)) == n:
            return [opts[i - 1] for i in sorted(set(idx))]
        print(f"  서로 다른 번호 {n}개를 골라주세요.")


def ask_free(q):
    print("\n" + q["prompt"])
    text = input("> ").strip()
    tags = []
    for kw, mapped in (q.get("keyword_map") or {}).items():
        if kw in text:
            tags.extend(mapped)
    return text, tags


def run_questions(questions):
    """질문을 모두 진행하고 (gained_keywords, weak_keywords, region, grade_band, issue_text) 반환."""
    gained, weak = [], []
    region, grade = "무관", "모름"
    issue_text = ""

    for q in sorted(questions["questions"], key=lambda x: x["order"]):
        t = q["type"]
        if t == "single":
            chosen = ask_single(q)
            if "value" in chosen:                       # q7 지역 / q8 등급
                if q["id"] == "q7_region":
                    region = chosen["value"]
                elif q["id"] == "q8_grade":
                    grade = chosen["value"]
            else:
                (weak if q["id"] == "q3_weak_subject" else gained).extend(chosen.get("tags", []))
        elif t == "multi":
            for o in ask_multi(q):
                gained.extend(o.get("tags", []))
        elif t == "free":
            issue_text, tags = ask_free(q)
            gained.extend(tags)

    return gained, weak, region, grade, issue_text


# ───────────────────────── 추천 로직 ─────────────────────────
def score_tracks(tracks, gained, weak):
    scored = []
    for t in tracks:
        kws = set(t.get("keywords", []))
        plus = sum(1 for k in gained if k in kws)
        minus = 2 * sum(1 for k in weak if k in kws)
        scored.append((plus - minus, t))
    # 점수 내림차순, 동점은 원래 순서 유지(안정 정렬)
    order = {id(t): i for i, (_, t) in enumerate(scored)}
    scored.sort(key=lambda s: (-s[0], order[id(s[1])]))
    return scored


def pick_universities(track, grade):
    """grade_band 에 맞는 대학 목록 반환. '모름'이면 세 칸 모두, 빈 칸은 인접으로 보완."""
    unis = track["universities"]
    tiers = ["top", "mid_high", "mid"]
    if grade in tiers:
        picked = {grade: unis.get(grade, [])}
        if not picked[grade]:                            # 비면 인접 칸 보완
            for adj in tiers:
                if unis.get(adj):
                    picked = {adj: unis[adj]}
                    break
        return picked
    return {tier: unis.get(tier, []) for tier in tiers}   # 모름 → 전부


def make_followups(a, b):
    """더 좁히기 위한 후속 질문 2~3개(두 트랙을 비교)."""
    return [
        f"'{a['name']}'와 '{b['name']}', 두 분야의 실제 직업인을 만난다면 어느 쪽 이야기가 더 듣고 싶어요?",
        "이 일을 '직접 손·기술로 다루는 것'과 '사람·글·기획으로 푸는 것' 중 뭐가 더 끌려요?",
        "대학원까지 공부할 생각이 있어요, 아니면 학부 졸업 후 바로 일하고 싶어요?",
    ]


# ───────────────────────── 출력(템플릿) ─────────────────────────
TIER_LABEL = {"top": "상위권", "mid_high": "중상위권", "mid": "중위권"}


def fmt_uni(u):
    return f"{u['name']} {u['major']} ({u['college']})"


def render_track_block(track, grade):
    lines = [f"\n[ {track['name']} ]  · 소속 단과대: {track['college']}",
             f"  {track['one_liner']}",
             f"  · 대표 학과: {', '.join(track['majors'][:5])}",
             "  · 추천 대학:"]
    for tier, unis in pick_universities(track, grade).items():
        if not unis:
            continue
        names = "; ".join(fmt_uni(u) for u in unis)
        lines.append(f"      - {TIER_LABEL[tier]}: {names}")
    lines.append(f"  · 졸업 후 진로 예시: {', '.join(track['careers'][:3])}")
    return "\n".join(lines)


def render_template(a, b, grade, region):
    out = ["\n" + "=" * 56,
           "너의 응답을 보고 어울리는 트랙 2가지를 골랐어요.",
           f"  · 트랙 A: {a['name']} — {a['one_liner']}",
           f"  · 트랙 B: {b['name']} — {b['one_liner']}",
           "\n같은 '환경'이라도 소속 단과대에 따라 배우는 내용이 많이 달라요:",
           render_track_block(a, grade),
           render_track_block(b, grade)]
    if region == "지방거점":
        out.append("\n(지방 거점도시를 원했으니, 위 목록 중 국립대 쪽을 먼저 살펴봐도 좋아요.)")
    out.append("\n더 좁혀보기 위해 이런 것도 생각해볼래요?")
    for i, f in enumerate(make_followups(a, b), 1):
        out.append(f"  {i}. {f}")
    return "\n".join(out)


# ───────────────────────── 출력(LLM, 선택) ─────────────────────────
def render_llm(a, b, grade, region, issue_text):
    """ANTHROPIC_API_KEY 가 있을 때만. 뽑힌 2개 트랙 데이터만 넘겨 설명을 다듬음."""
    try:
        import anthropic
    except ImportError:
        return None
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None

    model = os.environ.get("MAJORS_MODEL", "claude-opus-4-8")
    payload = {
        "grade_band": grade, "region": region, "issue_text": issue_text,
        "tracks": [
            {k: t[k] for k in ("name", "college", "one_liner", "majors",
                               "universities", "careers")}
            for t in (a, b)
        ],
    }
    user = (
        "아래는 한 학생의 응답으로 선정된 트랙 2개와 그 데이터입니다. "
        "이 데이터 '안에서만' 골라, [추천 출력 포맷](트랙 2개 비교 → 트랙별 상세"
        "(대표 학과/추천 대학 성적대별/소속 단과대/진로 예시) → 후속 질문 2~3개)"
        "에 맞춰 친근한 존댓말로 정리해 주세요. 데이터에 없는 학과·대학은 쓰지 마세요.\n\n"
        + yaml.safe_dump(payload, allow_unicode=True, sort_keys=False)
    )
    try:
        client = anthropic.Anthropic()
        resp = client.messages.create(
            model=model,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(b.text for b in resp.content if b.type == "text")
    except Exception as e:                                # 실패하면 템플릿으로 폴백
        print(f"(LLM 호출 실패 — 무료 템플릿으로 보여줄게요: {e})")
        return None


# ───────────────────────── 메인 ─────────────────────────
def main():
    majors = load_yaml("majors.yaml")
    questions = load_yaml("questions.yaml")

    print(questions["meta"].get("intro", ""))
    gained, weak, region, grade, issue_text = run_questions(questions)

    scored = score_tracks(majors["tracks"], gained, weak)
    a, b = scored[0][1], scored[1][1]

    result = render_llm(a, b, grade, region, issue_text)
    if result is None:
        result = render_template(a, b, grade, region)
    print(result)

    print("\n" + "-" * 56)
    print("※ 추천 대학·학과는 2026년 기준 실제 데이터예요. 모집요강은 꼭 직접 확인해요.")
    print("Claude AI로 이 앱을 제작함 by 고은표")


if __name__ == "__main__":
    main()
