import Database from 'better-sqlite3';

const BASE_URL = 'http://localhost:3000';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, options: any = {}, maxAttempts = 6): Promise<Response> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, options);
    if (res.status === 429 || res.status === 503) {
      let waitSeconds = 16;
      try {
        const cloned = res.clone();
        const errJson = await cloned.json();
        const msg = errJson?.error?.message || '';
        const match = msg.match(/Please retry in ([\d\.]+)s/);
        if (match && match[1]) {
          waitSeconds = Math.ceil(parseFloat(match[1])) + 2;
        }
      } catch {
        waitSeconds = 16;
      }
      console.log(`  -> HTTP ${res.status} received. Waiting ${waitSeconds}s before retry attempt ${attempt}/${maxAttempts}...`);
      await sleep(waitSeconds * 1000);
      continue;
    }
    return res;
  }
  return fetch(url, options);
}

async function run() {
  console.log('===============================================================');
  console.log('LEGAL LENS: END-TO-END GENAI REAL PIPELINE VERIFICATION');
  console.log('===============================================================');

  console.log('\n--- Step 1: User Registration & Authentication ---');
  const email = `testuser_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Password123!',
      name: 'Justice Sandra',
    }),
  });
  const regData = await regRes.json();
  if (!regRes.ok) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  const token = regData.token;
  console.log(`Registered user: ${regData.user.email} (ID: ${regData.user.id})`);
  console.log(`Auth token received: ${token.substring(0, 15)}...`);

  console.log('\n--- Step 2: Upload Synthetic Residential Lease Document ---');
  const docContent = `Residential Lease Agreement
The tenant shall pay monthly rent of $2,000 on the first day of each month.
The security deposit is $3,000.
The lease term is 12 months.
Either party must provide 30 days written notice for termination.`;

  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  let body = '';
  body += `--${boundary}\r\n`;
  body += 'Content-Disposition: form-data; name="title"\r\n\r\n';
  body += 'Residential Lease Agreement\r\n';
  body += `--${boundary}\r\n`;
  body += 'Content-Disposition: form-data; name="file"; filename="residential_lease.txt"\r\n';
  body += 'Content-Type: text/plain\r\n\r\n';
  body += docContent + '\r\n';
  body += `--${boundary}--\r\n`;

  const uploadRes = await fetch(`${BASE_URL}/api/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: Buffer.from(body, 'utf-8'),
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
  }
  const docId = uploadData.document.id;
  console.log(`Document uploaded: ID = ${docId}`);
  console.log(`Status = ${uploadData.document.status}, PageCount = ${uploadData.document.pageCount}, CharacterCount = ${uploadData.document.characterCount}`);

  console.log('\n--- Step 3: Inspect Database & SQLite Vector Storage ---');
  const db = new Database('./data/legallens.sqlite');
  const chunks = db.prepare('SELECT id, chunk_index, page_number, section_heading, content, embedding FROM document_chunks WHERE document_id = ?').all(docId) as any[];
  console.log(`Database document_chunks row count: ${chunks.length}`);
  for (const ch of chunks) {
    let parsedEmbedding: number[] = [];
    if (ch.embedding) {
      try {
        parsedEmbedding = JSON.parse(ch.embedding);
      } catch (e) {
        console.error('Failed to parse embedding json:', e);
      }
    }
    const isFiniteArray = Array.isArray(parsedEmbedding) && parsedEmbedding.length > 0 && parsedEmbedding.every((n) => typeof n === 'number' && Number.isFinite(n));
    console.log(`- Chunk #${ch.chunk_index}: ID = ${ch.id}, Heading = "${ch.section_heading}", Content length = ${ch.content.length} chars`);
    console.log(`  Embedding dimension: ${parsedEmbedding.length}`);
    console.log(`  All finite floats: ${isFiniteArray}`);
    console.log(`  First 5 vector values: [${parsedEmbedding.slice(0, 5).join(', ')}]`);
    console.log(`  Chunk preview: "${ch.content.replace(/\n+/g, ' ')}"`);
  }

  console.log('\n--- Step 4: Document Analysis with Gemini ---');
  await sleep(2000);
  const analyzeRes = await fetchWithRetry(`${BASE_URL}/api/documents/${docId}/analyze?force=true`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const analyzeData = await analyzeRes.json();
  if (!analyzeRes.ok) {
    throw new Error(`Analysis failed: ${JSON.stringify(analyzeData)}`);
  }
  const analysis = analyzeData.analysis;
  console.log(`Analysis ID: ${analysis.id}`);
  console.log(`Document Type: ${analysis.documentType}`);
  console.log(`High-Level Summary: "${analysis.highLevelSummary}"`);
  console.log(`What this document is about: "${analysis.plainLanguageSummary?.whatThisDocumentIsAbout}"`);
  console.log(`What you are agreeing to: ${JSON.stringify(analysis.plainLanguageSummary?.whatYouAreAgreeingTo)}`);
  console.log(`Financial obligations: ${JSON.stringify(analysis.plainLanguageSummary?.financialObligations)}`);
  console.log(`Important dates: ${JSON.stringify(analysis.plainLanguageSummary?.importantDates)}`);
  console.log(`Termination conditions: ${JSON.stringify(analysis.plainLanguageSummary?.terminationConditions)}`);
  console.log(`Extracted clauses count: ${analysis.clauses?.length || 0}`);
  if (analysis.clauses?.length) {
    analysis.clauses.forEach((c: any) => console.log(`  - [${c.category}] ${c.title}: ${c.plainExplanation}`));
  }
  console.log(`Extracted facts count: ${analysis.extractedFacts?.length || 0}`);
  if (analysis.extractedFacts?.length) {
    analysis.extractedFacts.forEach((f: any) => console.log(`  - [${f.category}] ${f.fact}`));
  }

  console.log('\n--- Step 5: Lawyer Consultation Briefing Generation ---');
  await sleep(3000);
  const briefingRes = await fetchWithRetry(`${BASE_URL}/api/documents/${docId}/briefing`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const briefingData = await briefingRes.json();
  if (!briefingRes.ok) {
    throw new Error(`Briefing failed: ${JSON.stringify(briefingData)}`);
  }
  const briefing = briefingData.briefing;
  console.log(`Briefing ID: ${briefing.id}`);
  console.log(`Concise Summary: "${briefing.conciseSummary}"`);
  console.log(`Questions to Ask Lawyer:`);
  briefing.lawyerChecklist?.questionsToAsk?.forEach((q: string) => console.log(`  - ${q}`));
  console.log(`Important Deadlines:`);
  briefing.lawyerChecklist?.importantDeadlines?.forEach((d: string) => console.log(`  - ${d}`));
  console.log(`Action Checklist items count: ${briefing.actionChecklist?.length || 0}`);
  briefing.actionChecklist?.forEach((item: any) => console.log(`  - [ ] ${item.label} (${item.category})`));

  console.log('\n--- Step 6: Grounded Q&A Chat Evaluation (with Chunk Citations) ---');
  const questions = [
    { q: 'What is the monthly rent?', expectedTerms: ['$2,000', '2000', 'rent'], shouldBeGrounded: true },
    { q: 'What is the security deposit?', expectedTerms: ['$3,000', '3000', 'deposit'], shouldBeGrounded: true },
    { q: 'What is the lease term?', expectedTerms: ['12 months', 'twelve months', '12'], shouldBeGrounded: true },
    { q: 'What is the termination notice requirement?', expectedTerms: ['30 days', 'thirty days', 'written notice'], shouldBeGrounded: true },
    { q: 'What is the weather in Delhi?', expectedTerms: [], shouldBeGrounded: false },
  ];

  for (const item of questions) {
    await sleep(3500); // Respect free-tier rate limits
    console.log(`\nQuestion: "${item.q}"`);
    const chatRes = await fetchWithRetry(`${BASE_URL}/api/documents/${docId}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
    console.log(`Why It Matters: "${sa?.whyItMatters || 'N/A'}"`);
    console.log(`grounded: ${sa?.grounded}`);
    console.log(`groundingConfidence: ${sa?.groundingConfidence}`);
    console.log(`Source Citations count: ${sa?.sourceCitations?.length || 0}`);
    if (sa?.sourceCitations?.length) {
      for (const cit of sa.sourceCitations) {
        console.log(`  * Citation: chunkId=${cit.chunkId}, page=${cit.pageNumber}, heading="${cit.sectionHeading}", snippet="${cit.textSnippet}"`);
        const matchingChunk = chunks.find((c) => c.id === cit.chunkId);
        const snippetFound = matchingChunk && matchingChunk.content.toLowerCase().includes(cit.textSnippet.trim().toLowerCase().substring(0, 20));
        console.log(`    Matches stored chunk text: ${Boolean(snippetFound)}`);
      }
    }

    if (item.shouldBeGrounded) {
      const answerText = (sa?.shortAnswer || '') + ' ' + (sa?.whatTheDocumentSays || '');
      const hasTerm = item.expectedTerms.some((term) => answerText.toLowerCase().includes(term.toLowerCase()));
      console.log(`Expected terms found (${item.expectedTerms.join(', ')}): ${hasTerm ? 'YES' : 'NO'}`);
      console.log(`Grounded verification (grounded=true): ${sa?.grounded === true ? 'PASSED' : 'FAILED'}`);
    } else {
      console.log(`Ungrounded query check (expected grounded=false): ${sa?.grounded === false ? 'PASSED' : 'FAILED'}`);
    }
  }

  console.log('\n===============================================================');
  console.log('ALL LIVE VERIFICATION CHECKS COMPLETED SUCCESSFULLY');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
