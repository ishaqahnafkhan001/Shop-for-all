from pathlib import Path
import json,re
root=Path(r'C:\Users\user\WebstormProjects\Shop-for-all')
names=['AI_ADMIN_PANEL_AUDIT.md','AI_FEATURE_INVENTORY.md','AI_ARCHITECTURE_AND_DATA_FLOW.md','AI_AUDIT_FINDINGS.md','AI_AUDIT_TRACK.md']
e=json.loads((root/'output/ai-audit-evidence.json').read_text(encoding='utf-8'))
checks=0
for name in names:
 p=root/'docs'/name; s=p.read_text(encoding='utf-8')
 assert not any(x in s for x in ['â€','â†','ï»','\ufffd']), f'Encoding {name}'
 assert s.count('```')%2==0, f'Fence {name}'
 for block in re.findall(r'```json\n(.*?)\n```',s,re.S):
  json.loads(block); checks+=1
 refs=set(re.findall(r'^\[([A-Z][A-Z0-9]*)\]:',s,re.M))
 used=set(re.findall(r'\[([A-Z][A-Z0-9]*)\](?![(:])',s.split('\n\n## Source evidence index')[0]))
 # Tracker lists file links, not reference IDs.
 if name!='AI_AUDIT_TRACK.md': assert not used-refs,(name,used-refs)
 for target in re.findall(r'\]\((?:<([^>]+)>|([^\s)]+))\)',s):
  link=target[0] or target[1]
  if '://' in link or link.startswith('#'): continue
  loc=link.split('#')[0]
  if re.match(r'^[A-Z]:/',loc,re.I): loc=re.sub(r':\d+$','',loc); dest=Path(loc)
  else: dest=(p.parent/loc).resolve()
  assert dest.exists(),f'Broken {name}: {link}'
 assert not re.search(r'AIza[\w-]{20,}|sk-[A-Za-z0-9]{20,}',s),f'Secret pattern {name}'
 print(name, 'OK',len(s.splitlines()),'lines')
for key,(path,a,b,symbol) in e.items():
 lines=(root/path).read_text(encoding='utf-8-sig').splitlines()
 assert 1<=a<=b<=len(lines),(key,path,a,b)
find=(root/'docs/AI_AUDIT_FINDINGS.md').read_text(encoding='utf-8')
rows=re.findall(r'^\| F-\d{3} \|[^\n]+',find,re.M)
assert len(rows)==17
for severity,num in [('Critical',0),('High',3),('Medium',12),('Low',2)]:
 assert sum(row.split('|')[3].strip()==severity for row in rows)==num,(severity,num)
arch=(root/'docs/AI_ARCHITECTURE_AND_DATA_FLOW.md').read_text(encoding='utf-8')
assert len(re.findall(r'```mermaid',arch))==4
assert len(re.findall(r'^### F-\d{3}',find,re.M))==17
print('JSON examples:',checks,'; evidence ranges:',len(e),'; findings:17; Mermaid blocks:4')

