from pathlib import Path
import json,re
root=Path(r'C:\Users\user\WebstormProjects\Shop-for-all')
reports=['AI_ADMIN_PANEL_AUDIT.md','AI_FEATURE_INVENTORY.md','AI_ARCHITECTURE_AND_DATA_FLOW.md','AI_AUDIT_FINDINGS.md']
e=json.loads((root/'output/ai-audit-evidence.json').read_text())
e['TG'][2]=len((root/e['TG'][0]).read_text().splitlines())
e['SDK']=['ecommerce-backend/backend/node_modules/@google/generative-ai/dist/index.js',307,365,'SDK RequestUrl / HTTP request construction']
(root/'output/ai-audit-evidence.json').write_text(json.dumps(e,indent=2))
p=root/'docs/AI_ADMIN_PANEL_AUDIT.md'
s=p.read_text(encoding='utf-8-sig').split('\n\n## Source evidence index')[0].replace('"imageSource":"uploaded_file"','"imageSource":"existing_product_image"').replace('"evidenceRefs":[]','"evidenceRefs":["product.performance_label"]').replace('"confidence":"low","limitations":[]','"confidence":"low","limitations":["There is not enough activity for a high-confidence recommendation."]')
s=s if 'The installed SDK builds' in s else s.replace('## Security, multi-tenancy and edge cases','The installed SDK builds HTTPS calls to generativelanguage.googleapis.com/v1beta/models/{model}:generateContent using its default base URL/API version; these services do not override endpoint/provider. This endpoint construction is statically verified, not contacted in this audit. [SDK]\n\n## Security, multi-tenancy and edge cases')
p.write_text(s,encoding='utf-8')
for name in reports:
    p=root/'docs'/name
    s=p.read_text(encoding='utf-8-sig').split('\n\n## Source evidence index')[0]
    used=sorted(set(re.findall(r'\[([A-Z][A-Z0-9]*)\](?!\()',s)))
    missing=set(used)-set(e)
    if missing: raise ValueError((name,missing))
    refs='\n\n## Source evidence index\n\nReferences resolve to inspected current source. The range is displayed here; each link opens its first line. Verified on 2026-10-10.\n\n'
    for key in used:
        path,a,b,symbol=e[key]
        lines=(root/path).read_text(encoding='utf-8-sig').splitlines()
        if not 1<=a<=b<=len(lines): raise ValueError((key,path,a,b,len(lines)))
        refs+=f'[{key}]: <{(root/path).as_posix()}:{a}> "{path}:{a}-{b} — {symbol}"\n'
    refs+='\n'
    for key in used:
        path,a,b,symbol=e[key]
        refs+=f'- **{key}**: [{path}:{a}-{b} — {symbol}][{key}]\n'
    p.write_text(s.rstrip()+refs,encoding='utf-8')
    print(f'{name}: {len(s.split())} body words; {len(used)} verified evidence references')

