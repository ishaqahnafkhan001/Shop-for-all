from pathlib import Path
import json
root=Path(r'C:\Users\user\WebstormProjects\Shop-for-all')
p=root/'output/ai-audit-evidence.json'; e=json.loads(p.read_text(encoding='utf-8'))
e['PNOTES']=['ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx',1059,1070,'extra notes field helper text']
p.write_text(json.dumps(e,indent=2))
for name in ['AI_ADMIN_PANEL_AUDIT.md','AI_AUDIT_FINDINGS.md']:
 p=root/'docs'/name; s=p.read_text(encoding='utf-8').split('\n\n## Source evidence index')[0]
 if name=='AI_ADMIN_PANEL_AUDIT.md':
  s=s.replace('## Usage, cost and persistence','The AddProduct extra-notes help mentions internal product context, while Product.comments is customer-facing and buildContext sends those comments to Gemini. This ambiguity can encourage submission of private merchant notes; no actual private note was observed. Clarify the public-content contract before relying on prompt wording to prevent disclosure. [PNOTES] [PM] [PCTX]\n\n## Usage, cost and persistence')
 else:
  s=s.replace('| F-011 | Aggregate analytics free text can still contain private information | Medium | Medium | Potential privacy risk | AI-004 |','| F-011 | Unstructured analytics/merchant text can contain private information | Medium | Medium | Potential privacy risk | AI-001/004 |')
  s=s.replace('**Medium / Medium confidence. AI-004.** Files: growthController.getRelevantSearchTermsForProduct/getTopBuyerLocations, adInsightAIService.buildGeminiPrompt.', '**Medium / Medium confidence. AI-001/004.** Files: Growth analytics/prompt, AddProduct notes help, product buildContext and Product model.')
  s=s.replace('Remediation: redact/drop identifying free text before prompt construction;', 'Additional product risk: AddProduct describes extra notes as suitable for internal context, but Product.comments is customer-facing and buildContext passes comments to Gemini. If the merchant follows the internal-note hint, private notes could enter the provider context. No actual private note was observed. [PNOTES] [PM] [PCTX]\n\nRemediation: clarify public-only notes and reject known private fields; redact/drop identifying free text before prompt construction;')
 p.write_text(s,encoding='utf-8')
