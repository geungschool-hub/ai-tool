import re
from _hwp_extract import extract

def test1_region(txt):
    a=re.search(r'TEST\s*1', txt); b=re.search(r'TEST\s*2', txt)
    s=a.start() if a else 0; e=b.start() if b else len(txt)
    return txt[s:e]

JUNK=re.compile(r'워드마스터|TEST\s*\d|이름|난이도|보기|반의어|빈칸|다음.*(쓰시오|고르시오|골라|쓰고|쓰시|고르)|^DAY\s*\d')

def parse_seg(seg, lo, hi):
    """번호 라인 시작 → 다음 번호까지의 글자/한글 라인들을 병합(머리글/지시문 제외)"""
    res={}; cur=None
    for s in seg.split('\n'):
        s=s.strip()
        if not s: continue
        if re.fullmatch(r'\d{1,3}', s):
            v=int(s); cur=v if lo<=v<=hi else None
        elif cur is not None and re.search(r'[A-Za-z가-힣]', s) and not JUNK.search(s):
            res[cur]=(res.get(cur,'')+' '+s).strip()
    return res

def two_blocks(txt):
    """TEST1 안에서 [a~b] 마커 2개로 블록 분리 → (segA,(loA,hiA)),(segB,(loB,hiB))"""
    t=test1_region(txt)
    marks=[(m.start(),m.end(),int(m.group(1)),int(m.group(2)))
           for m in re.finditer(r'\[(\d+)\s*~\s*(\d+)\]', t)]
    if len(marks)<2: return None
    (s1,e1,lo1,hi1),(s2,e2,lo2,hi2)=marks[0],marks[1]
    return (t[e1:s2],(lo1,hi1)),(t[e2:],(lo2,hi2))

def day_words(munje_path, jeongdap_path):
    mb=two_blocks(extract(munje_path)); jb=two_blocks(extract(jeongdap_path))
    if not mb or not jb: return []
    (mA,(lo1,hi1)),(mB,(lo2,hi2))=mb
    (jA,_),(jB,_)=jb
    m1=parse_seg(mA,lo1,hi1); j1=parse_seg(jA,lo1,hi1)   # blockA: 문제=영어, 정답=한글
    m2=parse_seg(mB,lo2,hi2); j2=parse_seg(jB,lo2,hi2)   # blockB: 문제=한글, 정답=영어
    words=[]
    for n in range(lo1,hi1+1):
        if m1.get(n) or j1.get(n): words.append((n,m1.get(n,''),j1.get(n,'')))
    for n in range(lo2,hi2+1):
        if j2.get(n) or m2.get(n): words.append((n,j2.get(n,''),m2.get(n,'')))
    return words
