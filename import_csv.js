const fs = require('fs');
const xlsx = require('xlsx');

// Read env without dotenv
const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const LEGAL_CATEGORIES = [
  'Constitutional Law',
  'Criminal Law',
  'Civil Law',
  'Evidence Law',
  'Court Procedures',
  'Case Law',
  'Judicial Ethics',
  'Statutory Interpretation',
  'Legal Reasoning',
];

function classifyCategory(questionText) {
  const t = (questionText || '').toLowerCase();
  if (/constitution|fundamental right|amendment|federal|parliament|sovereign/.test(t)) return 'Constitutional Law';
  if (/criminal|bail|fir|mens rea|actus|murder|theft|arrest|police|offense|offence|ipc|punish|accused|prosecution|sentence|jail|prison|robbery|fraud|forgery|perjury|warrant|custody/.test(t)) return 'Criminal Law';
  if (/evidence|witness|hearsay|proof|confession|testimony|exhibit/.test(t)) return 'Evidence Law';
  if (/contract|offer|acceptance|consideration|breach|agreement|promise|tort|negligence|damages|liability|plaintiff|defendant|civil|injunction|suit|compensation|defamation|libel|slander|copyright|patent|trademark|intellectual property/.test(t)) return 'Civil Law';
  if (/appeal|court|jurisdiction|trial|procedure|hearing|petition|writ|summons|plead|judge|lawyer|advocate|bar|bench|litigation|adr|mediation|arbitration|legal notice/.test(t)) return 'Court Procedures';
  if (/ethic|impartial|bias|recusal|integrity|conduct/.test(t)) return 'Judicial Ethics';
  if (/precedent|case law|ratio|obiter|stare decisis|judgment|judgement|holding/.test(t)) return 'Case Law';
  if (/statute|interpret|legislation|act of|section|provision|bill/.test(t)) return 'Statutory Interpretation';
  if (/reason|logic|analogy|syllogism|inference/.test(t)) return 'Legal Reasoning';
  return null;
}

async function importData() {
  console.log('Reading Excel file...');
  const workbook = xlsx.readFile('100_Unique_Law_Questions_Answers.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet);

  console.log(`Found ${rows.length} questions in Excel.`);

  let fallbackIdx = 0;
  const formattedQuestions = rows.map((row) => {
    const question_text = row['Question'];
    const existing_answer = row['Answer'];
    const reference = row['Reference'] || row['reference'] || null;
    let category = classifyCategory(question_text);
    // Placeholders / uncategorized rows: rotate through real legal categories
    if (!category) {
      category = LEGAL_CATEGORIES[fallbackIdx % LEGAL_CATEGORIES.length];
      fallbackIdx++;
    }
    return {
      question_text,
      existing_answer,
      reference,
      category,
      status: 'available',
    };
  }).filter(q => q.question_text && q.existing_answer);

  const catCounts = {};
  formattedQuestions.forEach(q => { catCounts[q.category] = (catCounts[q.category] || 0) + 1; });
  console.log('Category distribution:', catCounts);
  console.log(`Formatted ${formattedQuestions.length} valid questions.`);

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  console.log('Clearing old questions (if any)...');
  const delRes = await fetch(`${supabaseUrl}/rest/v1/questions?id=gt.0`, {
    method: 'DELETE',
    headers
  });
  if (!delRes.ok) {
    console.error('Failed to clear old questions:', await delRes.text());
  }

  console.log('Uploading new questions to Supabase...');
  const res = await fetch(`${supabaseUrl}/rest/v1/questions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(formattedQuestions)
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Error importing questions:', err);
    process.exit(1);
  }

  console.log(`✅ Successfully imported ${formattedQuestions.length} legal questions with categories into Supabase!`);
}

importData();
