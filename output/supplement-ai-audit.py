from pathlib import Path
import json
root=Path(r'C:\Users\user\WebstormProjects\Shop-for-all')
p=root/'output/ai-audit-evidence.json'
e=json.loads(p.read_text())
extra={
 'BILLUSAGE':('ecommerce-backend/backend/services/billing/subscriptionUsageService.js',6,65,'getSubscriptionUsage / toLegacyUsageShape'),
 'WARN':('ecommerce-backend/backend/services/billing/subscriptionWarningService.js',16,89,'getCurrentUsageWarnings / evaluateUsageWarnings'),
 'MODEL':('ecommerce-backend/backend/.env',7,7,'GEMINI_MODEL; only non-secret model value reported')
}
for k,(path,a,b,symbol) in extra.items():
 b=min(b,len((root/path).read_text().splitlines())); e[k]=[path,a,b,symbol]
p.write_text(json.dumps(e,indent=2),encoding='utf-8')
p=root/'docs/AI_ADMIN_PANEL_AUDIT.md'
s=p.read_text().split('\n\n## Source evidence index')[0]
s=s.replace('its provider availability/access is unverified. |','its provider availability/access is unverified. [MODEL] |')
s=s.replace('A new feature can reuse policy, but currently copies transport/parser/error handling.', 'A new feature can reuse policy, but currently copies transport/parser/error handling.')
s=s.replace('## Provisional quality scores','Subscription usage exposes this weekly metric through billing and a legacy auth shape. Usage warnings calculate thresholds, deduplicate warning records and emit quota events; they also use completed usage rather than pending reservations. This supports entitlement UI/notifications, not provider token/cost reporting. [BILLUSAGE] [WARN]\n\n## Provisional quality scores')
p.write_text(s,encoding='utf-8')
p=root/'docs/AI_FEATURE_INVENTORY.md'
s=p.read_text().split('\n\n## Source evidence index')[0]
s=s.replace('credentials are redacted.', 'credentials are redacted. [MODEL]')
p.write_text(s,encoding='utf-8')
