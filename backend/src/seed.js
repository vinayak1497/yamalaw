'use strict';
/* YamaLaw seed — split for production safety.
   - Reference data (categories, journey templates, legal-aid rules/providers,
     research library) is required for the app to function and is inserted
     whenever the tables are empty — in EVERY environment, including Supabase.
   - Demo data (users, cases, journeys, FIRs) is inserted only when DEMO_MODE
     is on and no users exist yet. A real deployment with DEMO_MODE=false and
     real users never gets demo records, and reboots never duplicate. */
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const config = require('./config');
const { db, row, run } = require('./db');
const { CATEGORIES, stagesFor, requirementsFor } = require('./services/journey');

async function count(t) { return (await row(`SELECT COUNT(*) c FROM ${t}`)).c; }

async function ensureReference() {
  if ((await count('legal_categories')) === 0) {
    for (const c of CATEGORIES) {
      const id = uuid();
      await run('INSERT INTO legal_categories (id,slug,name_en,name_hi,name_mr,description,authority,is_demo) VALUES (?,?,?,?,?,?,?,1)', id, c.slug, c.name_en, c.name_hi, c.name_mr, c.description, c.authority);
      const tid = uuid();
      await run('INSERT INTO journey_templates (id,category_id,version,title,is_demo) VALUES (?,?,?,?,1)', tid, id, 1, `${c.name_en} — guided journey`);
      for (const [i, s] of stagesFor(c.slug).entries()) {
        const sid = uuid();
        await run('INSERT INTO journey_template_stages (id,template_id,position,title,explanation,actor,deadline_days) VALUES (?,?,?,?,?,?,?)', sid, tid, i, s.title, s.explanation, s.actor, s.deadline_days);
        for (const [j, t] of s.tasks.entries()) {
          await run('INSERT INTO journey_template_tasks (id,stage_id,position,title,kind,required,document_key) VALUES (?,?,?,?,?,?,?)', uuid(), sid, j, t.title, t.kind, t.required ? 1 : 0, t.document_key || '');
        }
      }
    }
    console.log('Seed: reference categories + journey templates inserted.');
  }
  if ((await count('legal_aid_providers')) === 0) {
    await run('INSERT INTO legal_aid_providers (id,name,kind,state,district,contact,address,languages,focus_areas,is_demo) VALUES (?,?,?,?,?,?,?,?,?,1)',
      uuid(), 'District Legal Services Authority, Pune', 'DLSA', 'Maharashtra', 'Pune', '020-2612 3456', 'District Court Complex, Shivajinagar, Pune', 'en,hi,mr', 'all');
    await run('INSERT INTO legal_aid_providers (id,name,kind,state,district,contact,address,languages,focus_areas,is_demo) VALUES (?,?,?,?,?,?,?,?,?,1)',
      uuid(), 'Majlis Legal Centre (Women Support)', 'NGO', 'Maharashtra', 'Mumbai', '022-2666 2345', 'Andheri East, Mumbai', 'en,hi,mr', 'domestic-violence,family');
    await run('INSERT INTO legal_aid_providers (id,name,kind,state,district,contact,address,languages,focus_areas,is_demo) VALUES (?,?,?,?,?,?,?,?,?,1)',
      uuid(), 'Cyber Mitra Helpdesk', 'HELPLINE', 'all', 'all', '1930', 'cybercrime.gov.in', 'en,hi', 'cybercrime,financial-fraud');
    await run('INSERT INTO legal_aid_rules (id,name,description,max_income,categories,states,is_demo) VALUES (?,?,?,?,?,?,1)',
      uuid(), 'NALSA income guideline (demo)', 'Demo rule mirroring NALSA income-based eligibility. Confirm with DLSA.', 300000, 'all', 'all');
    await run('INSERT INTO legal_aid_rules (id,name,description,max_income,categories,states,is_demo) VALUES (?,?,?,?,?,?,1)',
      uuid(), 'Women / senior-citizen priority (demo)', 'Demo rule: women, seniors and persons with disability prioritised.', 500000, 'domestic-violence,family,civil', 'all');
    console.log('Seed: legal-aid reference data inserted.');
  }
  if ((await count('research_documents')) === 0) {
    const research = [
      { title: 'Security deposit refunds — tenant rights overview', court: 'Legal information summary', doc_date: '2024-05-01', citation: 'YamaLaw-LIB-TEN-001', summary: 'Explains typical deposit clauses, demand notices and consumer/civil remedies at a general level.', content: 'A tenant who has paid a refundable security deposit can first raise a written demand... Keep rent receipts, agreement and bank transfers. A legal notice usually precedes filing before the Rent Authority or civil court. Limitation and local rent-control rules vary — consult a lawyer.', tags: 'tenancy,deposit,rent' },
      { title: 'Delayed salary: remedies before labour authorities', court: 'Legal information summary', doc_date: '2024-08-15', citation: 'YamaLaw-LIB-EMP-002', summary: 'Outlines demand letters, Shops & Establishments complaints and Labour Commissioner process.', content: 'Unpaid salary claims typically begin with a written demand to the employer... Preserve offer letters, attendance and bank statements. The Labour Commissioner or Shops & Establishments inspector may conciliate; larger claims go to the Labour Court.', tags: 'employment,salary,wages' },
      { title: 'Cyber fraud response: 1930 and evidence preservation', court: 'Advisory summary', doc_date: '2025-01-10', citation: 'YamaLaw-LIB-CYB-003', summary: 'Immediate steps after UPI/OTP fraud: helpline, portal complaint, bank lien.', content: 'Call 1930 immediately, then file at cybercrime.gov.in... Note UTR numbers, screenshots and call records. Inform the bank to attempt a lien. Do not delete chats — they are evidence.', tags: 'cybercrime,fraud,upi' },
      { title: 'Consumer complaints: defects and deficiency in service', court: 'Legal information summary', doc_date: '2023-11-20', citation: 'YamaLaw-LIB-CON-004', summary: 'When to approach the District Consumer Commission with bills and warranty.', content: 'Keep invoices, warranty cards and service records... A legal notice to the seller is customary before filing. Jurisdiction depends on consideration value under the Consumer Protection Act 2019.', tags: 'consumer,refund' },
      { title: 'Domestic violence: protection and support pathways', court: 'Support guide', doc_date: '2024-12-01', citation: 'YamaLaw-LIB-DV-005', summary: 'Safety planning, Protection Officers and residence/monetary reliefs — general information.', content: 'Safety comes first: helplines 181/112... Protection Officers and DLSA can assist with applications for protection, residence and monetary relief under the 2005 Act. NGOs listed in Legal Aid can help.', tags: 'domestic-violence,family' },
    ];
    for (const r of research) {
      await run('INSERT INTO research_documents (id,title,court,doc_date,citation,summary,content,tags,source,is_demo) VALUES (?,?,?,?,?,?,?,?,?,1)', uuid(), r.title, r.court, r.doc_date, r.citation, r.summary, r.content, r.tags, 'YamaLaw Legal Library (demo)');
    }
    console.log('Seed: research library inserted.');
  }
}

async function ensureDemo() {
  if (!config.DEMO_MODE) { console.log('Seed: DEMO_MODE off — skipping demo users/cases.'); return; }
  if ((await count('users')) > 0) { console.log('Seed: users exist — skipping demo data.'); return; }
  console.log('Seeding YamaLaw demo data…');
  const hash = await bcrypt.hash('YamaLaw123', 10);
  const mk = async (email, name, role, extra = {}) => {
    const id = uuid();
    await run('INSERT INTO users (id,email,password_hash,full_name,role,phone,language,is_demo) VALUES (?,?,?,?,?,?,?,1)', id, email, hash, name, role, extra.phone || '', extra.language || 'en');
    return id;
  };
  const meera = await mk('meera.citizen@yamalaw.demo', 'Meera Deshpande', 'CITIZEN', { phone: '98220 11223' });
  const rahul = await mk('rahul.citizen@yamalaw.demo', 'Rahul Sharma', 'CITIZEN', { phone: '98110 44332' });
  const fatima = await mk('fatima.citizen@yamalaw.demo', 'Fatima Sheikh', 'CITIZEN');
  const arjun = await mk('arjun.lawyer@yamalaw.demo', 'Adv. Arjun Nair', 'LAWYER');
  const priya = await mk('priya.lawyer@yamalaw.demo', 'Adv. Priya Kulkarni', 'LAWYER');
  const kavitha = await mk('kavitha.judge@yamalaw.demo', 'Judge Kavitha Rao', 'JUDGE');
  const vikram = await mk('vikram.police@yamalaw.demo', 'PSI Vikram Patil', 'POLICE');
  await mk('admin@yamalaw.demo', 'YamaLaw Admin', 'ADMIN');
  await run('INSERT INTO citizen_profiles (user_id,state,district,annual_income,category,address) VALUES (?,?,?,?,?,?)', meera, 'Maharashtra', 'Pune', 280000, 'General', 'Kothrud, Pune');
  await run('INSERT INTO citizen_profiles (user_id,state,district,annual_income,category,address) VALUES (?,?,?,?,?,?)', rahul, 'Uttar Pradesh', 'Lucknow', 180000, 'OBC', 'Gomti Nagar, Lucknow');
  await run('INSERT INTO citizen_profiles (user_id,state,district,annual_income,category,address) VALUES (?,?,?,?,?,?)', fatima, 'Maharashtra', 'Mumbai', 150000, 'Minority', 'Kurla, Mumbai');
  await run('INSERT INTO lawyer_profiles (user_id,bar_id,specialization,experience_years,languages,available) VALUES (?,?,?,?,?,?)', arjun, 'MH/12345/2015', 'Tenancy, Consumer', 9, 'en,hi,mr', 1);
  await run('INSERT INTO lawyer_profiles (user_id,bar_id,specialization,experience_years,languages,available) VALUES (?,?,?,?,?,?)', priya, 'MH/23456/2018', 'Employment, Cyber', 6, 'en,hi,mr', 1);
  await run('INSERT INTO judge_profiles (user_id,court_name,designation) VALUES (?,?,?)', kavitha, 'District Court Pune', 'Civil Judge');
  await run('INSERT INTO police_profiles (user_id,station_name,badge_id,jurisdiction) VALUES (?,?,?,?)', vikram, 'Kothrud Police Station', 'PSI-4421', 'Pune City');

  // Demo case 1 — tenancy (rich journey)
  const catTen = await row('SELECT * FROM legal_categories WHERE slug=?', 'tenancy');
  const issueId = uuid();
  await run('INSERT INTO legal_issues (id,citizen_id,title,description,category_id,status,is_demo) VALUES (?,?,?,?,?,?,1)', issueId, meera, 'Landlord has not returned ₹50,000 security deposit', 'Vacated flat in Kothrud in August. Landlord cites painting charges but gave no bills despite repeated requests on phone and WhatsApp.', catTen.id, 'OPEN');
  const caseId = uuid();
  await run('INSERT INTO cases (id,case_number,issue_id,citizen_id,lawyer_id,title,category_id,stage,status,jurisdiction,facts,is_demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)',
    caseId, 'YL-2026-1042', issueId, meera, arjun, 'Security deposit recovery — Kothrud flat', catTen.id, 'EVIDENCE', 'OPEN', 'Rent Authority / Civil Court, Pune', 'Tenancy 2023-2025, deposit Rs 50,000, vacated 10 Aug 2026, written demand pending.');
  const jid = uuid();
  const tpl = await row('SELECT * FROM journey_templates WHERE category_id=?', catTen.id);
  await run('INSERT INTO legal_journeys (id,case_id,issue_id,template_id,current_stage_position,status) VALUES (?,?,?,?,?,?)', jid, caseId, issueId, tpl.id, 0, 'ACTIVE');
  for (const [i, s] of stagesFor('tenancy').entries()) {
    const sid = uuid();
    await run('INSERT INTO journey_stages (id,journey_id,position,title,explanation,actor,deadline_days,status) VALUES (?,?,?,?,?,?,?,?)', sid, jid, i, s.title, s.explanation, s.actor, s.deadline_days, i < 2 ? 'DONE' : i === 2 ? 'IN_PROGRESS' : 'PENDING');
    for (const [j, t] of s.tasks.entries()) {
      await run('INSERT INTO journey_tasks (id,stage_id,position,title,kind,required,document_key,status) VALUES (?,?,?,?,?,?,?,?)', uuid(), sid, j, t.title, t.kind, t.required ? 1 : 0, t.document_key || '', i < 2 ? 'DONE' : 'PENDING');
    }
  }
  for (const r of requirementsFor('tenancy')) {
    await run('INSERT INTO journey_requirements (id,journey_id,kind,label,document_key,status) VALUES (?,?,?,?,?,?)', uuid(), jid, r.kind, r.label, r.document_key || '', ['identity', 'rental_agreement'].includes(r.document_key) ? 'DONE' : 'MISSING');
  }
  const mkTask = async (title, due, status, assignee) => run('INSERT INTO case_tasks (id,case_id,title,due_date,priority,status,assignee_id) VALUES (?,?,?,?,?,?,?)', uuid(), caseId, title, due, 'HIGH', status, assignee);
  await mkTask('Upload payment proof (deposit transfer)', '2026-10-10', 'PENDING', meera);
  await mkTask('Prepare legal notice to landlord', '2026-10-12', 'PENDING', arjun);
  await mkTask('Confirm jurisdiction (Pune Rent Authority)', '2026-10-08', 'DONE', arjun);
  await run('INSERT INTO hearings (id,case_id,title,scheduled_at,venue,mode,status,notes,is_demo) VALUES (?,?,?,?,?,?,?,?,1)', uuid(), caseId, 'Mediation session — deposit dispute', '2026-10-15', 'DLSA Mediation Centre, Pune', 'PHYSICAL', 'SCHEDULED', 'Bring originals and bank statement.');
  await run('INSERT INTO case_notes (id,case_id,author_id,body,visibility) VALUES (?,?,?,?,?)', uuid(), caseId, arjun, 'Client vacated on 10 Aug. Agreement copy on file. Awaiting payment proof + chat export before drafting notice.', 'TEAM');
  await run('INSERT INTO messages (id,case_id,sender_id,body) VALUES (?,?,?,?)', uuid(), caseId, meera, 'Sir, I found the NEFT reference for the deposit. Uploading today.');
  await run('INSERT INTO messages (id,case_id,sender_id,body) VALUES (?,?,?,?)', uuid(), caseId, arjun, 'Good — please also export the WhatsApp chat as PDF. I will draft the notice this week.');
  await run('INSERT INTO audit_events (id,case_id,issue_id,actor_id,event_type,detail) VALUES (?,?,?,?,?,?)', uuid(), caseId, issueId, meera, 'CASE_CREATED', 'Security deposit matter opened');
  await run('INSERT INTO audit_events (id,case_id,actor_id,event_type,detail) VALUES (?,?,?,?,?)', uuid(), caseId, arjun, 'LAWYER_ASSIGNED', 'Adv. Arjun Nair assigned');
  await run('INSERT INTO notifications (id,user_id,kind,title,body,case_id) VALUES (?,?,?,?,?,?)', uuid(), meera, 'TASK_DUE', 'YamaLaw: upload payment proof', 'Due 10 Oct for your deposit matter.', caseId);

  // Demo case 2 — employment
  const catEmp = await row('SELECT * FROM legal_categories WHERE slug=?', 'employment');
  const issue2 = uuid();
  await run('INSERT INTO legal_issues (id,citizen_id,title,description,category_id,status,is_demo) VALUES (?,?,?,?,?,?,1)', issue2, rahul, 'Employer has not paid 2 months salary', 'Worked as delivery supervisor. Salary for August and September pending total Rs 64,000. HR not responding.', catEmp.id, 'OPEN');
  const case2 = uuid();
  await run('INSERT INTO cases (id,case_number,issue_id,citizen_id,title,category_id,stage,status,jurisdiction,facts,is_demo) VALUES (?,?,?,?,?,?,?,?,?,?,1)', case2, 'YL-2026-1043', issue2, rahul, 'Salary recovery — logistics firm', catEmp.id, 'INTAKE', 'OPEN', 'Labour Commissioner, Lucknow', 'Two months salary pending.');

  // Demo case 3 — cyber (police workflow + FIR)
  const catCyb = await row('SELECT * FROM legal_categories WHERE slug=?', 'cybercrime');
  const issue3 = uuid();
  await run('INSERT INTO legal_issues (id,citizen_id,title,description,category_id,status,is_demo) VALUES (?,?,?,?,?,?,1)', issue3, fatima, 'Lost Rs 28,500 in an online task scam', 'Telegram task scam. Transferred via UPI. Have UTR numbers and chats. Called 1930.', catCyb.id, 'OPEN');
  const case3 = uuid();
  await run('INSERT INTO cases (id,case_number,issue_id,citizen_id,title,category_id,stage,status,jurisdiction,facts,is_demo) VALUES (?,?,?,?,?,?,?,?,?,?,1)', case3, 'YL-2026-1044', issue3, fatima, 'UPI task-scam fraud', catCyb.id, 'AUTHORITY', 'OPEN', 'Cyber Cell, Mumbai', 'UPI fraud, 1930 reference obtained.');
  await run('INSERT INTO firs (id,fir_number,case_id,complainant_id,station_name,incident_date,place,description,sections,status,is_demo) VALUES (?,?,?,?,?,?,?,?,?,?,1)',
    uuid(), 'FIR/2026/8814', case3, fatima, 'Kurla Police Station', '2026-10-02', 'Online', 'Complainant induced via Telegram task scam to transfer Rs 28,500 over 3 UPI transactions. UTRs preserved.', 'Sec 318 BNS + Sec 66D IT Act (as applicable)', 'FILED');

  console.log('Seed complete. Demo password for all demo users: YamaLaw123');
}

async function main() {
  if (process.argv.includes('--force')) {
    for (const t of ['case_research_links', 'research_notes', 'research_bookmarks', 'notifications', 'audit_events', 'hearing_participants', 'hearings', 'case_tasks', 'evidence_access_log', 'evidence', 'document_versions', 'documents', 'journey_requirements', 'journey_tasks', 'journey_stages', 'legal_journeys', 'case_parties', 'case_notes', 'messages', 'firs', 'legal_aid_applications', 'cases', 'legal_issues', 'journey_template_tasks', 'journey_template_stages', 'journey_templates', 'legal_categories', 'research_documents', 'legal_aid_rules', 'legal_aid_providers', 'citizen_profiles', 'lawyer_profiles', 'judge_profiles', 'police_profiles', 'users']) {
      try { await db.exec(`DELETE FROM ${t};`); } catch {}
    }
  }
  await ensureReference();
  await ensureDemo();
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = main;
