#!/usr/bin/env python3
"""Inspect the actual APK, not source settings. Usage: python3 scripts/check-android-16k.py app.apk"""
import json,struct,sys,zipfile
from pathlib import Path
apk=Path(sys.argv[1]);report=[]
with zipfile.ZipFile(apk) as archive, apk.open('rb') as file:
 for info in archive.infolist():
  name=info.filename
  if not name.startswith(('lib/arm64-v8a/','lib/x86_64/')) or not name.endswith('.so'):continue
  data=archive.read(info)
  if data[:6] != b'\x7fELF\x02\x01':raise ValueError('Expected little endian ELF64: '+name)
  phoff=struct.unpack_from('<Q',data,32)[0];size,count=struct.unpack_from('<HH',data,54)
  segments=[struct.unpack_from('<IIQQQQQQ',data,phoff+i*size) for i in range(count)]
  loads=[s for s in segments if s[0]==1];relros=[s for s in segments if s[0]==0x6474e552]
  # An unrounded RELRO is safe when it ends its own LOAD segment and rounding
  # cannot protect writable bytes in a subsequent LOAD (Android NDK layout).
  def relro_ok(s):
   end=s[3]+s[6]
   if end%16384==0:return True
   own=any(l[3]==s[3] and l[3]+l[6]<=end for l in loads)
   rounded=(end+16383)//16384*16384
   return own and not any(l[3]<rounded and l[3]+l[6]>end and l[3]!=s[3] for l in loads)
  file.seek(info.header_offset);header=file.read(30);filename_len,extra_len=struct.unpack_from('<HH',header,26)
  offset=info.header_offset+30+filename_len+extra_len
  report.append({'library':name,'load16k':all(s[7]>=16384 and s[2]%16384==s[3]%16384 for s in loads),'zip16k':info.compress_type!=zipfile.ZIP_STORED or offset%16384==0,'relro16k':all(relro_ok(s) for s in relros)})
print(json.dumps({'apk':str(apk),'libraries':len(report),'checks':report},indent=2))
if not report or any(not all(r[k] for k in ('load16k','zip16k','relro16k')) for r in report):sys.exit(1)
