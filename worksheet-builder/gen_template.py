# -*- coding: utf-8 -*-
import zipfile

CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/webSettings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'

RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'

DOCRELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings" Target="webSettings.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>'

SETTINGS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="709"/><w:characterSpacingControl w:val="doNotCompress"/></w:settings>'

WEBSETTINGS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:webSettings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:optimizeForBrowser/></w:webSettings>'

FONTTABLE = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="Nanum Gothic"><w:charset w:val="EUC-KR"/><w:family w:val="swiss"/></w:font><w:font w:name="Malgun Gothic"><w:charset w:val="EUC-KR"/><w:family w:val="swiss"/></w:font></w:fonts>'

# 스타일 이름에 한국어 직접 삽입 (ASCII styleId는 그대로 유지)
SN_BLUE  = "섹션제목-파랑"  # 섹션제목-파랑
SN_GREEN = "섹션제목-초록"  # 섹션제목-초록
SN_AMBER = "섹션제목-주황"  # 섹션제목-주황
SN_RED   = "섹션제목-빨강"  # 섹션제목-빨강
SN_BODY  = "본문"                            # 본문
SN_INFO  = "정보박스"               # 정보박스
SN_FILL  = "빈칸텍스트"         # 빈칸텍스트

STYLES = (
'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
'<w:docDefaults>'
'<w:rPrDefault><w:rPr>'
'<w:rFonts w:ascii="Nanum Gothic" w:eastAsia="Nanum Gothic" w:hAnsi="Nanum Gothic" w:cs="Nanum Gothic"/>'
'<w:sz w:val="20"/><w:szCs w:val="20"/>'
'<w:lang w:val="ko-KR" w:eastAsia="ko-KR"/>'
'</w:rPr></w:rPrDefault>'
'<w:pPrDefault><w:pPr><w:spacing w:line="432" w:lineRule="auto"/></w:pPr></w:pPrDefault>'
'</w:docDefaults>'

'<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'

'<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/>'
'<w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>'

'<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/>'
'<w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>'

f'<w:style w:type="paragraph" w:styleId="SectionBlue"><w:name w:val="{SN_BLUE}"/><w:basedOn w:val="Normal"/><w:qFormat/>'
'<w:pPr><w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="1255A0"/></w:pBdr>'
'<w:shd w:val="clear" w:color="auto" w:fill="C5E3F7"/>'
'<w:spacing w:before="160" w:after="80" w:line="336" w:lineRule="auto"/><w:ind w:left="140"/></w:pPr>'
'<w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>'

f'<w:style w:type="paragraph" w:styleId="SectionGreen"><w:name w:val="{SN_GREEN}"/><w:basedOn w:val="Normal"/><w:qFormat/>'
'<w:pPr><w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="2A7A38"/></w:pBdr>'
'<w:shd w:val="clear" w:color="auto" w:fill="C3E9CC"/>'
'<w:spacing w:before="160" w:after="80" w:line="336" w:lineRule="auto"/><w:ind w:left="140"/></w:pPr>'
'<w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>'

f'<w:style w:type="paragraph" w:styleId="SectionAmber"><w:name w:val="{SN_AMBER}"/><w:basedOn w:val="Normal"/><w:qFormat/>'
'<w:pPr><w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="E67E22"/></w:pBdr>'
'<w:shd w:val="clear" w:color="auto" w:fill="FDE9C9"/>'
'<w:spacing w:before="160" w:after="80" w:line="336" w:lineRule="auto"/><w:ind w:left="140"/></w:pPr>'
'<w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>'

f'<w:style w:type="paragraph" w:styleId="SectionRed"><w:name w:val="{SN_RED}"/><w:basedOn w:val="Normal"/><w:qFormat/>'
'<w:pPr><w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="C0392B"/></w:pBdr>'
'<w:shd w:val="clear" w:color="auto" w:fill="F7C5C5"/>'
'<w:spacing w:before="160" w:after="80" w:line="336" w:lineRule="auto"/><w:ind w:left="140"/></w:pPr>'
'<w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>'

f'<w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="{SN_BODY}"/><w:basedOn w:val="Normal"/>'
'<w:pPr><w:spacing w:before="40" w:after="120" w:line="456" w:lineRule="auto"/></w:pPr>'
'<w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'

f'<w:style w:type="paragraph" w:styleId="InfoBox"><w:name w:val="{SN_INFO}"/><w:basedOn w:val="Normal"/>'
'<w:pPr><w:pBdr>'
'<w:top w:val="single" w:sz="6" w:space="6" w:color="BBBBBB"/>'
'<w:left w:val="single" w:sz="6" w:space="10" w:color="BBBBBB"/>'
'<w:bottom w:val="single" w:sz="6" w:space="6" w:color="BBBBBB"/>'
'<w:right w:val="single" w:sz="6" w:space="10" w:color="BBBBBB"/>'
'</w:pBdr>'
'<w:shd w:val="clear" w:color="auto" w:fill="FAFAFA"/>'
'<w:spacing w:before="80" w:after="160" w:line="504" w:lineRule="auto"/>'
'<w:ind w:left="100" w:right="100"/></w:pPr>'
'<w:rPr><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>'

f'<w:style w:type="paragraph" w:styleId="BlankFill"><w:name w:val="{SN_FILL}"/><w:basedOn w:val="Normal"/>'
'<w:pPr><w:spacing w:before="40" w:after="120" w:line="528" w:lineRule="auto"/></w:pPr>'
'<w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'

'</w:styles>'
)

HDR = (
'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
'<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
'<w:p><w:pPr><w:pStyle w:val="Header"/><w:tabs><w:tab w:val="right" w:pos="10318"/></w:tabs></w:pPr>'
'<w:r><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="1255A0"/></w:rPr>'
'<w:t>생명과학</w:t></w:r>'   # 생명과학
'<w:r><w:tab/></w:r>'
'<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="555555"/></w:rPr>'
'<w:t xml:space="preserve">학번 </w:t></w:r>'   # 학번
'<w:r><w:rPr><w:u w:val="single"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>'
'<w:t xml:space="preserve">              </w:t></w:r>'
'<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="555555"/></w:rPr>'
'<w:t xml:space="preserve">  이름 </w:t></w:r>'   # 이름
'<w:r><w:rPr><w:u w:val="single"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>'
'<w:t xml:space="preserve">              </w:t></w:r>'
'</w:p>'
'<w:p><w:pPr><w:pStyle w:val="Header"/>'
'<w:pBdr><w:bottom w:val="single" w:sz="20" w:space="4" w:color="1255A0"/></w:pBdr>'
'<w:spacing w:before="0" w:after="80"/></w:pPr>'
'<w:r><w:rPr><w:sz w:val="15"/><w:szCs w:val="15"/><w:color w:val="555555"/></w:rPr>'
'<w:t>II. 항상성과 머의 조절 &gt; 2-n 소단원명</w:t></w:r>'
'</w:p>'
'</w:hdr>'
)

FTR = (
'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
'<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
'<w:p><w:pPr><w:pStyle w:val="Footer"/><w:spacing w:before="80" w:after="0"/></w:pPr>'
'<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="555555"/></w:rPr>'
'<w:t xml:space="preserve">&#8212; </w:t></w:r>'
'<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="555555"/></w:rPr>'
'<w:fldChar w:fldCharType="begin"/></w:r>'
'<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="555555"/></w:rPr>'
'<w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
'<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="555555"/></w:rPr>'
'<w:fldChar w:fldCharType="separate"/></w:r>'
'<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="555555"/></w:rPr>'
'<w:t>1</w:t></w:r>'
'<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="555555"/></w:rPr>'
'<w:fldChar w:fldCharType="end"/></w:r>'
'<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="555555"/></w:rPr>'
'<w:t xml:space="preserve"> &#8212;</w:t></w:r>'
'</w:p>'
'</w:ftr>'
)

def tbl_row(cells, is_header=False, bg='C5E3F7'):
    rows = '<w:tr>'
    for cell in cells:
        tc_pr = f'<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="{bg}"/></w:tcPr>' if is_header else ''
        bold = '<w:b/>' if is_header else ''
        rows += (
            f'<w:tc>{tc_pr}'
            '<w:p><w:pPr><w:jc w:val="center"/>'
            '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>'
            f'<w:r><w:rPr>{bold}<w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>'
            f'<w:t xml:space="preserve">{cell}</w:t></w:r></w:p></w:tc>'
        )
    rows += '</w:tr>'
    return rows

TBL_PROPS = (
    '<w:tblPr><w:tblW w:w="0" w:type="auto"/>'
    '<w:tblBorders>'
    '<w:top w:val="single" w:sz="4" w:color="BBBBBB"/>'
    '<w:left w:val="single" w:sz="4" w:color="BBBBBB"/>'
    '<w:bottom w:val="single" w:sz="4" w:color="BBBBBB"/>'
    '<w:right w:val="single" w:sz="4" w:color="BBBBBB"/>'
    '<w:insideH w:val="single" w:sz="4" w:color="BBBBBB"/>'
    '<w:insideV w:val="single" w:sz="4" w:color="BBBBBB"/>'
    '</w:tblBorders>'
    '<w:tblCellMar>'
    '<w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>'
    '<w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>'
    '</w:tblCellMar></w:tblPr>'
)

def para(style, text):
    return f'<w:p><w:pPr><w:pStyle w:val="{style}"/></w:pPr><w:r><w:t>{text}</w:t></w:r></w:p>'

DOC = (
'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
'<w:document'
' xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
'<w:body>'

+ para('SectionBlue', 'A. 섹션 제목 — 파랑')

+ '<w:p><w:pPr><w:pStyle w:val="BodyText"/></w:pPr>'
'<w:r><w:t xml:space="preserve">본문 단락입니다. 여기에 내용을 입력하세요. </w:t></w:r>'
'<w:r><w:rPr><w:b/></w:rPr><w:t>굵은 글씨</w:t></w:r>'
'<w:r><w:t xml:space="preserve">와 </w:t></w:r>'
'<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>밑줄</w:t></w:r>'
'<w:r><w:t xml:space="preserve">을 함께 쓸 수 있습니다.</w:t></w:r>'
'</w:p>'

+ '<w:p><w:pPr><w:pStyle w:val="InfoBox"/></w:pPr>'
'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">핵심 정리  </w:t></w:r>'
'<w:r><w:t>정보 박스: 테두리와 배경색이 있는 영역입니다.</w:t></w:r>'
'</w:p>'

+ para('SectionGreen', 'B. 섹션 제목 — 초록 (빈칸 예시)')

+ '<w:p><w:pPr><w:pStyle w:val="BlankFill"/></w:pPr>'
'<w:r><w:t xml:space="preserve">뉴런의 세포체에서 뾻어 나온 짧은 돌기를 </w:t></w:r>'
'<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">          </w:t></w:r>'
'<w:r><w:t xml:space="preserve">라 하고, 긴 돌기를 </w:t></w:r>'
'<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">          </w:t></w:r>'
'<w:r><w:t>라 한다.</w:t></w:r>'
'</w:p>'

+ para('SectionAmber', 'C. 섹션 제목 — 주황 (표 예시)')

+ '<w:tbl>' + TBL_PROPS
+ tbl_row(['구분', '특징 1', '특징 2'], is_header=True, bg='C5E3F7')
+ tbl_row(['항목 1', ' ', ' '])
+ tbl_row(['항목 2', ' ', ' '])
+ '</w:tbl>'

+ para('SectionRed', 'D. 섹션 제목 — 빨강')
+ para('BodyText', '내용을 입력하세요.')

+ '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>'

+ '<w:sectPr>'
'<w:headerReference w:type="default" r:id="rId5"/>'
'<w:footerReference w:type="default" r:id="rId6"/>'
'<w:pgSz w:w="11906" w:h="16838"/>'
'<w:pgMar w:top="1134" w:right="794" w:bottom="850" w:left="794" w:header="567" w:footer="454" w:gutter="0"/>'
'</w:sectPr>'
'</w:body></w:document>'
)

out_path = r'E:\AI tool\worksheet-builder\양식B_학습지_템플릿.docx'
with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml',           CT.encode('utf-8'))
    z.writestr('_rels/.rels',                   RELS.encode('utf-8'))
    z.writestr('word/_rels/document.xml.rels',  DOCRELS.encode('utf-8'))
    z.writestr('word/settings.xml',             SETTINGS.encode('utf-8'))
    z.writestr('word/webSettings.xml',          WEBSETTINGS.encode('utf-8'))
    z.writestr('word/fontTable.xml',            FONTTABLE.encode('utf-8'))
    z.writestr('word/styles.xml',               STYLES.encode('utf-8'))
    z.writestr('word/header1.xml',              HDR.encode('utf-8'))
    z.writestr('word/footer1.xml',              FTR.encode('utf-8'))
    z.writestr('word/document.xml',             DOC.encode('utf-8'))

print('생성 완료:', out_path)

import xml.etree.ElementTree as ET
with zipfile.ZipFile(out_path, 'r') as z:
    ok = True
    for name in z.namelist():
        try:
            ET.fromstring(z.read(name).decode('utf-8'))
        except Exception as e:
            print(f'[XML 오류] {name}: {e}')
            ok = False
    if ok:
        print('XML 검증: 전체 OK')
