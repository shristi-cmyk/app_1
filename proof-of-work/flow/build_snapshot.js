// Step "build_snapshot" of the viaSocket flow "Proof of Work · pipeline sync".
// Input : rows of the "Shristi" tab and of MSG91 "Partner Master".
// Output: counts + partner names only. Notes / amounts / emails / URLs are never copied.
const T = (v) => String(v == null ? '' : v).trim();
const isTrue = (v) => T(v).toUpperCase() === 'TRUE';
const bump = (o, k) => { const key = T(k) || '(blank)'; o[key] = (o[key] || 0) + 1; };

const pipeRows = (context?.res?.read_pipeline_tab?.data || []).filter((r) => T(r.partner));
const pipeline = { total: pipeRows.length, byStage: {}, byStatus: {}, byType: {}, partners: [] };
pipeRows.forEach((r) => {
  bump(pipeline.byStage, r.Stage); bump(pipeline.byStatus, r.Status); bump(pipeline.byType, r.Type);
  pipeline.partners.push({ name: T(r.partner), type: T(r.Type), source: T(r['Source / Team']), stage: T(r.Stage), status: T(r.Status), last: T(r['Last Activity ']) || T(r['Last Activity']), next: T(r['Next Follow Up']) });
});

const all = (context?.res?.read_partner_master?.data || []).filter((r) => T(r.Organisation));
const mine = all.filter((r) => T(r.Owner).toLowerCase().includes('shristi'));
const rows = mine.length ? mine : all;
const out = { orgs: rows.length, byOrgStage: {}, emailsSent: 0, orgsEmailed: 0, linkedinConnects: 0, linkedinAccepted: 0, linkedinDMs: 0, replied: 0, meetings: 0, mouSent: 0, mouSigned: 0, engaged: [] };
rows.forEach((r) => {
  bump(out.byOrgStage, r['Org Stage']);
  const e = ['Email 1 sent', 'Email 2 sent', 'Email 3 sent', 'Email 4 sent', 'Email 5 sent'].filter((k) => isTrue(r[k])).length;
  out.emailsSent += e; if (e) out.orgsEmailed += 1;
  if (isTrue(r['LinkedIn connect sent'])) out.linkedinConnects += 1;
  if (isTrue(r['LinkedIn accepted'])) out.linkedinAccepted += 1;
  out.linkedinDMs += (isTrue(r['LinkedIn DM 1 sent']) ? 1 : 0) + (isTrue(r['LinkedIn DM 2 sent']) ? 1 : 0);
  const replied = isTrue(r.Replied) || !!T(r['Reply date']);
  const meeting = isTrue(r['Meeting booked (Calendly)']) || !!T(r['Meeting date']);
  if (replied) out.replied += 1; if (meeting) out.meetings += 1;
  if (T(r['MoU sent date'])) out.mouSent += 1; if (T(r['MoU signed date'])) out.mouSigned += 1;
  if (replied || meeting || T(r['MoU sent date'])) out.engaged.push({ name: T(r.Organisation), type: T(r.Type), stage: T(r['Org Stage']), last: T(r['Last touch date']) });
});
out.engaged = out.engaged.slice(0, 30);

const snapshot = { generatedAt: new Date().toISOString(), pipeline, outreach: out };
console.log(`**Snapshot** ${pipeline.total} pipeline partners, ${out.orgs} outreach orgs, ${out.replied} replies, ${out.meetings} meetings`);
return snapshot;
