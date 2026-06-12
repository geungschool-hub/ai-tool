import olefile, zlib, struct, sys, io

def extract(path):
    ole = olefile.OleFileIO(path)
    fh = ole.openstream('FileHeader').read()
    compressed = bool(fh[36] & 1)
    # collect section streams
    secs = []
    for entry in ole.listdir():
        if len(entry)==2 and entry[0]=='BodyText' and entry[1].startswith('Section'):
            secs.append(entry)
    secs.sort(key=lambda e: int(e[1][7:]))
    out=[]
    for sec in secs:
        data = ole.openstream(sec).read()
        if compressed:
            data = zlib.decompress(data, -15)
        i=0; n=len(data)
        while i+4<=n:
            header = struct.unpack_from('<I', data, i)[0]; i+=4
            tag = header & 0x3ff
            size = (header>>20) & 0xfff
            if size==0xfff:
                size = struct.unpack_from('<I', data, i)[0]; i+=4
            chunk = data[i:i+size]; i+=size
            if tag==67:  # PARA_TEXT, UTF-16LE
                txt = chunk.decode('utf-16-le', 'ignore')
                # strip HWP inline control chars (0x00-0x1f except common)
                clean=''.join(ch for ch in txt if ord(ch)>=32 or ch in '\n\t')
                out.append(clean)
    ole.close()
    return '\n'.join(out)

if __name__=='__main__':
    src=sys.argv[1]; dst=sys.argv[2]
    txt=extract(src)
    open(dst,'w',encoding='utf-8').write(txt)
    print('lines:', txt.count(chr(10))+1, '| chars:', len(txt))
