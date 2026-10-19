from pathlib import Path
root=Path(r'C:\Users\user\WebstormProjects\Shop-for-all')
for name in ['AI_ADMIN_PANEL_AUDIT.md','AI_FEATURE_INVENTORY.md']:
 p=root/'docs'/name
 s=p.read_text(encoding='utf-8').split('\n\n## Source evidence index')[0]
 if 'â' in s:
  s=s.encode('cp1252').decode('utf-8')
 p.write_text(s,encoding='utf-8')
p=root/'output/refine-ai-audit.py'
s=p.read_text(encoding='utf-8').replace('p.read_text()',"p.read_text(encoding='utf-8')")
p.write_text(s,encoding='utf-8')
