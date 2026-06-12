# HWP(.hwp) 텍스트 추출법

교사가 주는 `.hwp` 파일은 보통 **한글 5.0 = OLE 복합문서**(시그니처 `D0CF11E0A1B11AE1`).

```python
import olefile, zlib, struct   # pip install olefile (기본 미설치)
ole = olefile.OleFileIO('파일.hwp')
fh = ole.openstream('FileHeader').read()
compressed = bool(fh[36] & 1)                       # 36바이트 플래그 bit0
data = ole.openstream(['BodyText', 'Section0']).read()
if compressed:
    data = zlib.decompress(data, -15)               # raw deflate(-15), zlib 헤더 없음
# HWP 레코드: header=uint32, tag=header&0x3ff, size=(header>>20)&0xfff
# size==0xfff면 다음 uint32가 실제 크기. tag 67(PARA_TEXT)이 본문, UTF-16LE.
```

## 중요 — 콘솔 한글 깨짐
Windows PowerShell/Bash 콘솔은 cp949라 추출 한글을 그냥 print하면 `����`로 깨짐(데이터는 정상). 반드시 **UTF-8 파일로 써서 Read 도구로 확인**할 것:
```python
open('_dump.txt', 'w', encoding='utf-8').write(text)   # Read로 확인 후 삭제
```

빠른 미리보기는 `PrvText` 스트림(UTF-16LE)도 있으나 분량 제한·표 구조만 대략. 정확한 전체 내용은 BodyText 파싱이 확실.
