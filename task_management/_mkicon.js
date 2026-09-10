/* 업무판 아이콘 생성기 — task_management/_mkicon.js · 의존성 0 (Node 의 zlib 만)
 *
 *   node _mkicon.js web [바탕화면용.ico]
 *
 * 먹빛 둥근 네모 + 체크 세 줄(맨 줄만 파랑). 4×4 초과표본으로 가장자리를 부드럽게 한다.
 * 모양을 바꾸려면 아래 ROWS·BOX·INK 를 고치고 다시 찍어 web/ 을 덮은 뒤 hosting 을 배포한다.
 * .ico 는 PNG 를 그대로 담는 꼴(Vista 이상) — 16·32·48·64·128·256 여섯 벌.
 * 만든 파일은 web/ 에 들어가고 manifest.webmanifest 가 그것을 가리킨다.
 * ★크기를 바꾸면 manifest 의 sizes 도 함께 고칠 것 — 검사 [20] 이 PNG 머리와 대조한다. */
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');

/* ── PNG ── */
let CRC = null;
function crcTable(){ if (CRC) return CRC; CRC = new Int32Array(256);
  for (let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320 ^ (c>>>1) : c>>>1; CRC[n]=c; } return CRC; }
function crc32(buf){ const t=crcTable(); let c=0xFFFFFFFF;
  for (let i=0;i<buf.length;i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c>>>8); return (c ^ 0xFFFFFFFF)>>>0; }
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type,'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba){
  const raw = Buffer.alloc((w*4+1)*h);
  for (let y=0;y<h;y++){ raw[y*(w*4+1)] = 0; rgba.copy(raw, y*(w*4+1)+1, y*w*4, (y+1)*w*4); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level:9})), chunk('IEND', Buffer.alloc(0))]);
}

/* ── 그리기 (1000 단위 좌표계에서 재고 실제 크기로 줄인다) ── */
const S = 1000;
function rr(x,y,w,h,r){ return p => {                       // 둥근 네모 안쪽인가
  const dx = Math.max(x - p.x, 0, p.x - (x+w) ), dy = Math.max(y - p.y, 0, p.y - (y+h));
  const ix = Math.min(Math.max(p.x, x+r), x+w-r), iy = Math.min(Math.max(p.y, y+r), y+h-r);
  if (dx>0||dy>0) return false;
  return Math.hypot(p.x-ix, p.y-iy) <= r + 1e-9;
}; }
function seg(x1,y1,x2,y2,t){ return p => {                  // 굵은 선분
  const vx=x2-x1, vy=y2-y1, L2=vx*vx+vy*vy;
  let s = L2 ? ((p.x-x1)*vx + (p.y-y1)*vy)/L2 : 0; s = Math.max(0, Math.min(1, s));
  return Math.hypot(p.x-(x1+s*vx), p.y-(y1+s*vy)) <= t/2;
}; }
function ring(x,y,w,h,r,t){ const out = rr(x,y,w,h,r), inn = rr(x+t,y+t,w-2*t,h-2*t,Math.max(r-t,0));
  return p => out(p) && !inn(p); }

const INK   = [0x2C,0x2A,0x27];   // 바탕 — 노션 먹빛보다 살짝 짙게
const PAPER = [0xFF,0xFF,0xFF];
const BLUE  = [0x23,0x83,0xE2];
const MUTE  = [0xFF,0xFF,0xFF,0.62];

// 체크 세 줄: [체크칸, 막대]. 맨 위 줄은 파랑으로 채워 ✓ 가 들어간다.
const ROWS = [280, 500, 720];
const BOX = 132, BX = 190, BARX = 388, BARW = 424, BARH = 62;
const shapes = [];
ROWS.forEach((cy, i) => {
  const by = cy - BOX/2;
  if (i === 0) {
    shapes.push([rr(BX, by, BOX, BOX, 30), BLUE]);
    shapes.push([seg(BX+34, cy+4, BX+58, cy+34, 26), PAPER]);
    shapes.push([seg(BX+56, cy+34, BX+100, cy-30, 26), PAPER]);
    shapes.push([rr(BARX, cy-BARH/2, BARW, BARH, BARH/2), PAPER]);
  } else {
    shapes.push([ring(BX, by, BOX, BOX, 30, 22), i === 1 ? PAPER : MUTE]);
    shapes.push([rr(BARX, cy-BARH/2, i === 1 ? BARW : BARW*0.72, BARH, BARH/2), i === 1 ? PAPER : MUTE]);
  }
});
const BG = rr(0, 0, S, S, 224);

function render(size, maskable){
  const buf = Buffer.alloc(size*size*4);
  const N = 4, inv = 1/(N*N);
  // maskable 판은 안전영역(80%) 안에 들어가게 줄이고 바탕을 꽉 채운다
  const k = maskable ? 0.78 : 1, off = (1-k)/2*S;
  for (let y=0;y<size;y++) for (let x=0;x<size;x++){
    let acc = [0,0,0,0];
    for (let sy=0;sy<N;sy++) for (let sx=0;sx<N;sx++){
      const p = { x:(x+(sx+0.5)/N)/size*S, y:(y+(sy+0.5)/N)/size*S };
      let col = null, a = 0;
      if (maskable || BG(p)) { col = INK; a = 1; }
      const q = { x:(p.x-off)/k, y:(p.y-off)/k };
      for (const [inside, c] of shapes) if (inside(q)) { col = c; a = c.length > 3 ? c[3] : 1; }
      if (col){ acc[0]+=col[0]*a; acc[1]+=col[1]*a; acc[2]+=col[2]*a; acc[3]+=255*a;
                if (a<1 && col!==INK){ acc[0]+=INK[0]*(1-a); acc[1]+=INK[1]*(1-a); acc[2]+=INK[2]*(1-a); acc[3]+=255*(1-a); } }
    }
    const i=(y*size+x)*4;
    buf[i]=Math.round(acc[0]*inv); buf[i+1]=Math.round(acc[1]*inv); buf[i+2]=Math.round(acc[2]*inv); buf[i+3]=Math.round(acc[3]*inv);
  }
  return png(size, size, buf);
}

/* ── ICO (PNG 를 그대로 담는다 — Vista 이상) ── */
function ico(list){
  const dir = Buffer.alloc(6); dir.writeUInt16LE(0,0); dir.writeUInt16LE(1,2); dir.writeUInt16LE(list.length,4);
  const entries = []; let off = 6 + 16*list.length;
  for (const [size, data] of list){
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; e[1] = size >= 256 ? 0 : size;
    e[2]=0; e[3]=0; e.writeUInt16LE(1,4); e.writeUInt16LE(32,6);
    e.writeUInt32LE(data.length,8); e.writeUInt32LE(off,12);
    entries.push(e); off += data.length;
  }
  return Buffer.concat([dir, ...entries, ...list.map(l => l[1])]);
}

const out = process.argv[2];
const mk = (n, f, m) => { const b = render(f, m); fs.writeFileSync(path.join(out, n), b); console.log(n, b.length); return b; };
mk('icon-192.png', 192);
mk('icon-512.png', 512);
mk('icon-maskable-512.png', 512, true);
mk('apple-touch-icon.png', 180);
mk('favicon-32.png', 32);
const icoPath = process.argv[3];
if (icoPath) {
  const list = [16,32,48,64,128,256].map(s => [s, render(s)]);
  fs.writeFileSync(icoPath, ico(list));
  console.log('ico', fs.statSync(icoPath).size);
}
