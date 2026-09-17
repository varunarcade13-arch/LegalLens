import Database from 'better-sqlite3';

const BASE_URL = 'http://localhost:3000';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('--- Targeted Grounded Chat Verification (Paced) ---');

  // Register user
  const email = `testuser_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!', name: 'Justice Sandra' }),
  });
  const { token } = await regRes.json();

  // Upload document
  const docContent = `Residential Lease Agreement
The tenant shall pay monthly rent of $2,000 on the first day of each month.
The security deposit is $3,000.
The lease term is 12 months.
Either party must provide 30 days written notice for termination.`;

  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  let body = '';
  body += `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nResidential Lease Agreement\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="lease.txt"\r\nContent-Type: text/plain\r\n\r\n${docContent}\r\n--${boundary}--\r\n`;

  const uploadRes = await fetch(`${BASE_URL}/api/documents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: Buffer.from(body, 'utf-8'),
  });
  const { document: doc } = await uploadRes.json();
  console.log(`Document uploaded: ID = ${doc.id}`);

  const db = new Database('./data/legallens.sqlite');
  const chunks = db.prepare('SELECT id, content FROM document_chunks WHERE document_id = ?').all(doc.id) as any[];

  const questions = [
    { q: 'What is the lease term?', expected: ['12 months', 'twelve months', '12'], grounded: true },
    { q: 'What is the termination notice requirement?', expected: ['30 days', 'thirty days', 'written notice'], grounded: true },
    { q: 'What is the weather in Delhi?', expected: [], grounded: false },
  ];

  for (const item of questions) {
    console.log(`\nWaiting 15s to respect Gemini free-tier RPM limit...`);
    await sleep(15000);

    console.log(`Question: "${item.q}"`);
    const chatRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/chat`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: item.q }),
    });
    const chatData = await chatRes.json();
    if (!chatRes.ok) {
      console.error(`Chat failed for "${item.q}":`, chatData);
      continue;
    }
    const msg = chatData.message;
    const sa = msg.structuredAnswer;
    console.log(`Short Answer: "${sa?.shortAnswer || msg.content}"`);
    console.log(`What Document Says: "${sa?.whatTheDocumentSays || 'N/A'}"`);
    console.log(`grounded: ${sa?.grounded}`);
    console.log(`groundingConfidence: ${sa?.groundingConfidence}`);
    console.log(`Source Citations count: ${sa?.sourceCitations?.length || 0}`);
    if (sa?.sourceCitations?.length) {
      for (const cit of sa.sourceCitations) {
        console.log(`  * Citation: chunkId=${cit.chunkId}, page=${cit.pageNumber}, snippet="${cit.textSnippet}"`);
        const matchingChunk = chunks.find((c) => c.id === cit.chunkId);
        const snippetFound = matchingChunk && matchingChunk.content.toLowerCase().includes(cit.textSnippet.trim().toLowerCase().substring(0, 20));
        console.log(`    Matches stored chunk text: ${Boolean(snippetFound)}`);
      }
    }

    if (item.grounded) {
      const answerText = (sa?.shortAnswer || '') + ' ' + (sa?.whatTheDocumentSays || '');
      const hasTerm = item.expected.some((term) => answerText.toLowerCase().includes(term.toLowerCase()));
      console.log(`Expected terms found (${item.expected.join(', ')}): ${hasTerm ? 'YES' : 'NO'}`);
      console.log(`Grounded verification (grounded=true): ${sa?.grounded === true ? 'PASSED' : 'FAILED'}`);
    } else {
      console.log(`Ungrounded query check (expected grounded=false): ${sa?.grounded === false ? 'PASSED' : 'FAILED'}`);
    }
  }

  console.log('\n--- TARGETED CHAT VERIFICATION COMPLETED ---');
}

run().catch(console.error);
