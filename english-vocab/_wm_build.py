import re, json, glob, os
import _wm_parse as P
from _hwp_extract import extract

# regex 허용형으로 보강
def test1_region(txt):
    a=re.search(r'TEST\s*1', txt); b=re.search(r'TEST\s*2', txt)
    s=a.start() if a else 0; e=b.start() if b else len(txt)
    return txt[s:e]
P.test1_region=test1_region

D="워드마스터 고등 BASIC_문제,정답/워드마스터 고등 BASIC_문제,정답"
hoes=sorted({int(re.search(r'_(\d+)회',os.path.basename(f)).group(1))
             for f in glob.glob(f"{D}/*.hwp")})
stats=[]; merged={}  # en_lower -> {en,ko,day}
for h in hoes:
    mp=f"{D}/워드마스터 고등 BASIC_{h}회 문제.hwp"
    jp=f"{D}/워드마스터 고등 BASIC_{h}회 정답.hwp"
    if not(os.path.exists(mp) and os.path.exists(jp)):
        stats.append((h,'MISSING',0,0)); continue
    try:
        ws=P.day_words(mp,jp)
    except Exception as e:
        stats.append((h,f'ERR:{e}',0,0)); continue
    raw=len(ws); newc=0
    for n,en,ko in ws:
        en=en.strip().strip(',').strip(); ko=ko.strip()
        if not en or not re.match(r'^[A-Za-z]',en): continue
        # "refuse, reject" 같이 둘이면 첫 단어를 표제어로
        key=re.split(r'[,/]|또는',en)[0].strip().lower()
        if not key: continue
        if key not in merged:
            merged[key]={'en':re.split(r'[,/]|또는',en)[0].strip(),'ko':ko,'day':h}; newc+=1
    stats.append((h,'OK',raw,newc))

# id 부여(day, 등장순)
words=[]
for i,(k,v) in enumerate(merged.items(),1):
    words.append({'id':i,'en':v['en'],'ko':v['ko'],'day':v['day']})
json.dump(words, open('basic_words.json','w',encoding='utf-8'), ensure_ascii=False, indent=0)

rep=["회 | 상태 | 원시쌍 | 신규고유"]
for h,st,raw,nc in stats: rep.append(f"{h:>2} | {st:<6} | {raw:>3} | {nc:>3}")
rep.append(f"\n총 고유단어: {len(words)} | 처리 회: {sum(1 for s in stats if s[1]=='OK')}/{len(stats)}")
open('_wm_stats.txt','w',encoding='utf-8').write('\n'.join(rep))
print(f"DONE: {len(words)} unique words, {len(hoes)} 회")
