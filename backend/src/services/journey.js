'use strict';
/* Journey templates — reusable, data-driven. 12 categories. Stored in DB by seed. */
const { v4: uuid } = require('uuid');

const CATEGORIES = [
  { slug: 'tenancy', name_en: 'Tenancy & Security Deposit', name_hi: 'किरायेदारी और सुरक्षा जमा', name_mr: 'भाडेकरार आणि सुरक्षा ठेव', authority: 'Rent Authority / Civil Court', description: 'Deposit recovery, eviction defence, repairs.' },
  { slug: 'employment', name_en: 'Employment & Salary', name_hi: 'रोजगार और वेतन', name_mr: 'रोजगार आणि पगार', authority: 'Labour Commissioner / Labour Court', description: 'Unpaid salary, termination, workplace dues.' },
  { slug: 'consumer', name_en: 'Consumer Dispute', name_hi: 'उपभोक्ता विवाद', name_mr: 'ग्राहक तक्रार', authority: 'District Consumer Commission', description: 'Defective goods, deficient services, refunds.' },
  { slug: 'family', name_en: 'Family Dispute', name_hi: 'पारिवारिक विवाद', name_mr: 'कौटुंबिक वाद', authority: 'Family Court', description: 'Maintenance, custody, separation guidance.' },
  { slug: 'cybercrime', name_en: 'Cyber Fraud', name_hi: 'साइबर धोखाधड़ी', name_mr: 'सायबर फसवणूक', authority: 'Cyber Cell / 1930 Helpline', description: 'Online scams, UPI fraud, phishing. Act fast.' },
  { slug: 'domestic-violence', name_en: 'Domestic Violence', name_hi: 'घरेलू हिंसा', name_mr: 'घरगुती हिंसा', authority: 'Protection Officer / Magistrate', description: 'Safety-first support and protection steps.' },
  { slug: 'financial-fraud', name_en: 'Financial Fraud', name_hi: 'वित्तीय धोखाधड़ी', name_mr: 'आर्थिक फसवणूक', authority: 'Police / Economic Offences Wing', description: 'Loan fraud, chit funds, impersonation.' },
  { slug: 'property', name_en: 'Property Dispute', name_hi: 'संपत्ति विवाद', name_mr: 'मालमत्ता वाद', authority: 'Civil Court / Revenue Authority', description: 'Title, boundaries, possession, records.' },
  { slug: 'contract', name_en: 'Contract Dispute', name_hi: 'अनुबंध विवाद', name_mr: 'करार वाद', authority: 'Civil Court / Arbitration', description: 'Breach, non-payment, service agreements.' },
  { slug: 'motor-accident', name_en: 'Motor Accident Claim', name_hi: 'मोटर दुर्घटना दावा', name_mr: 'मोटार अपघात दावा', authority: 'Motor Accident Claims Tribunal', description: 'Compensation, medical records, FIR.' },
  { slug: 'civil', name_en: 'General Civil Matter', name_hi: 'सामान्य दीवानी मामला', name_mr: 'सामान्य दिवाणी प्रकरण', authority: 'Civil Court', description: 'Recovery, injunction, declaration.' },
  { slug: 'criminal', name_en: 'Criminal Complaint', name_hi: 'आपराधिक शिकायत', name_mr: 'फौजदारी तक्रार', authority: 'Police Station / Magistrate', description: 'FIR, evidence preservation, witness details.' },
];

function stagesFor(slug) {
  const common = [
    { title: 'Understand the problem', explanation: 'Confirm what happened, when, and who is involved. Plain-language summary.', actor: 'CITIZEN', deadline_days: 2, tasks: [
      { title: 'Write down what happened in your own words', kind: 'info', required: 1 },
      { title: 'Confirm dates, amounts and people involved', kind: 'info', required: 1 },
    ]},
    { title: 'Collect documents', explanation: 'Gather the papers this kind of matter usually needs.', actor: 'CITIZEN', deadline_days: 7, tasks: [
      { title: 'Upload identity proof', kind: 'document', required: 1, document_key: 'identity' },
      { title: 'Upload supporting documents', kind: 'document', required: 1, document_key: 'supporting' },
    ]},
    { title: 'Preserve evidence', explanation: 'Save messages, photos, receipts before they are lost.', actor: 'CITIZEN', deadline_days: 5, tasks: [
      { title: 'Upload evidence files', kind: 'evidence', required: 1 },
      { title: 'Note witnesses if any', kind: 'info', required: 0 },
    ]},
    { title: 'Prepare the next legal step', explanation: 'Draft the notice or application that usually comes next.', actor: 'LAWYER', deadline_days: 7, tasks: [
      { title: 'Prepare legal notice / application draft', kind: 'draft', required: 1 },
      { title: 'Review with assigned lawyer', kind: 'review', required: 1 },
    ]},
    { title: 'File / escalate', explanation: 'Submit to the right authority and track the reference number.', actor: 'LAWYER', deadline_days: 14, tasks: [
      { title: 'File with the authority', kind: 'filing', required: 1 },
      { title: 'Record reference / acknowledgement', kind: 'info', required: 1 },
    ]},
  ];
  if (slug === 'cybercrime') {
    return [
      { title: 'Act immediately', explanation: 'Call 1930 and report on cybercrime.gov.in. Time matters for freezing funds.', actor: 'CITIZEN', deadline_days: 1, tasks: [
        { title: 'Call 1930 cyber helpline', kind: 'action', required: 1 },
        { title: 'File complaint on cybercrime.gov.in', kind: 'filing', required: 1 },
      ]},
      ...common.slice(1),
    ];
  }
  if (slug === 'domestic-violence') {
    return [
      { title: 'Safety first', explanation: 'If you are in danger now, contact 112 / 181. You can ask a trusted person for help.', actor: 'CITIZEN', deadline_days: 0, tasks: [
        { title: 'Reach a safe place / helpline 181', kind: 'action', required: 1 },
        { title: 'Contact Protection Officer or support organisation', kind: 'action', required: 0 },
      ]},
      ...common,
    ];
  }
  return common;
}

function requirementsFor(slug) {
  const base = [
    { kind: 'document', label: 'Identity proof (Aadhaar / voter ID / passport)', document_key: 'identity' },
    { kind: 'information', label: 'Basic facts: dates, amounts, people involved', document_key: '' },
  ];
  const map = {
    tenancy: [
      { kind: 'document', label: 'Rental agreement', document_key: 'rental_agreement' },
      { kind: 'document', label: 'Payment proof (rent / deposit)', document_key: 'payment_proof' },
      { kind: 'evidence', label: 'Communication with landlord', document_key: 'communication' },
      { kind: 'prerequisite', label: 'Legal notice sent', document_key: 'legal_notice' },
    ],
    employment: [
      { kind: 'document', label: 'Employment contract / offer letter', document_key: 'employment_contract' },
      { kind: 'document', label: 'Salary slips / bank statements', document_key: 'salary_proof' },
      { kind: 'evidence', label: 'Communication with employer', document_key: 'communication' },
      { kind: 'prerequisite', label: 'Demand letter sent', document_key: 'legal_notice' },
    ],
    cybercrime: [
      { kind: 'evidence', label: 'Transaction records / UTR numbers', document_key: 'transaction' },
      { kind: 'evidence', label: 'Screenshots / chat records', document_key: 'communication' },
      { kind: 'document', label: 'Bank statement', document_key: 'bank_statement' },
      { kind: 'prerequisite', label: '1930 / cybercrime.gov.in complaint reference', document_key: 'cyber_ref' },
    ],
  };
  return [...base, ...(map[slug] || [{ kind: 'document', label: 'Supporting documents', document_key: 'supporting' }])];
}

/** Very small keyword classifier — deterministic, works with AI disabled. */
function classify(text) {
  const t = (text || '').toLowerCase();
  const rules = [
    ['tenancy', ['landlord', 'rent', 'deposit', 'tenant', 'evict', 'flat', 'house owner', 'kiraya', 'makaan']],
    ['employment', ['salary', 'employer', 'job', 'terminat', 'wages', 'offer letter', 'pf', 'vetan']],
    ['cybercrime', ['upi', 'otp', 'scam', 'online fraud', 'phishing', 'kyc', 'fake link', 'telegram task']],
    ['domestic-violence', ['husband beat', 'domestic violence', 'dowry', 'hit me', 'marital abuse']],
    ['consumer', ['refund', 'defective', 'warranty', 'seller', 'product', 'flipkart', 'amazon']],
    ['motor-accident', ['accident', 'vehicle', 'insurance', 'mact', 'hit and run']],
    ['property', ['land', 'plot', 'title', 'boundary', 'possession', '7/12', 'satbara']],
    ['family', ['divorce', 'custody', 'maintenance', 'alimony', 'marriage']],
    ['financial-fraud', ['loan fraud', 'chit fund', 'investment fraud', 'ponzi']],
    ['contract', ['contract', 'agreement breach', 'invoice unpaid', 'vendor']],
    ['criminal', ['threat', 'assault', 'theft', 'fir', 'cheating 420', 'stolen']],
  ];
  for (const [slug, keys] of rules) if (keys.some((k) => t.includes(k))) return slug;
  return 'civil';
}

module.exports = { CATEGORIES, stagesFor, requirementsFor, classify };
