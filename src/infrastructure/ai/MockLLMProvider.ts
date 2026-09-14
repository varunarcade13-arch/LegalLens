import { DocumentAnalysisProps, ExtractedFact } from '../../core/domain/DocumentAnalysis';
import { ImportantClauseProps, ClauseCategory, ConcernLevel } from '../../core/domain/ImportantClause';
import { AttentionFindingProps } from '../../core/domain/AttentionFinding';
import { ComparisonProps, ClauseDifference } from '../../core/domain/Comparison';
import { StructuredAnswer, Citation } from '../../core/domain/ChatMessage';
import { LegalBriefingProps } from '../../core/domain/LegalBriefing';
import { DocumentChunk } from '../../core/domain/DocumentChunk';
import { ILLMProvider } from '../../core/ports';

export class MockLLMProvider implements ILLMProvider {
  public readonly name: string = 'MockLLMProvider';

  public async generateAnalysis(
    documentTitle: string,
    documentText: string,
    chunks: DocumentChunk[]
  ): Promise<Omit<DocumentAnalysisProps, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>> {
    const textLower = documentText.toLowerCase();
    const docType = this.detectDocumentType(textLower, documentTitle);
    const parties = this.extractParties(documentText, docType);
    const effectiveDate = this.extractEffectiveDate(documentText);
    const expirationDate = this.extractExpirationDate(documentText);
    const jurisdiction = this.extractJurisdiction(documentText);

    const clauses = this.detectClauses(documentText, chunks);
    const findings = this.detectFindings(documentText, clauses, chunks);
    const extractedFacts = this.extractVerbatimFacts(documentText, chunks, effectiveDate, jurisdiction);

    const highLevelSummary = `This is a legally binding ${docType} between ${parties.join(' and ')}. It establishes rights, operational obligations, financial commitments, and risk allocations under ${jurisdiction || 'applicable state law'}.`;

    const plainLanguageSummary = this.buildPlainLanguageSummary(docType, clauses, documentText);

    return {
      documentType: docType,
      partiesInvolved: parties,
      effectiveDate,
      expirationDate,
      jurisdiction,
      highLevelSummary,
      plainLanguageSummary,
      extractedFacts,
      clauses: clauses as any,
      findings: findings as any,
    };
  }

  public async generateComparison(
    docA: { title: string; text: string },
    docB: { title: string; text: string }
  ): Promise<
    Omit<
      ComparisonProps,
      'id' | 'userId' | 'documentAId' | 'documentBId' | 'documentATitle' | 'documentBTitle' | 'createdAt'
    >
  > {
    const textALower = docA.text.toLowerCase();
    const textBLower = docB.text.toLowerCase();

    const addedClauses: ClauseDifference[] = [];
    const removedClauses: ClauseDifference[] = [];
    const modifiedClauses: ClauseDifference[] = [];
    const changedObligations: ClauseDifference[] = [];
    const changedFinancialTerms: ClauseDifference[] = [];
    const changedDates: ClauseDifference[] = [];
    const changedTermination: ClauseDifference[] = [];
    const changedLiability: ClauseDifference[] = [];
    const changedDisputeResolution: ClauseDifference[] = [];

    // Liability check
    const hasAIndemnity = textALower.includes('indemnif') || textALower.includes('liability');
    const hasBIndemnity = textBLower.includes('indemnif') || textBLower.includes('liability');
    if (hasAIndemnity && hasBIndemnity) {
      changedLiability.push({
        category: 'Liability Limitation',
        documentA: 'Contains original liability limitation provisions.',
        documentB: 'Contains revised liability threshold and indemnification scope.',
        difference: 'Document B alters the cap on aggregate damages or indemnification triggers.',
        whyItMatters: 'Altering liability caps directly affects your financial exposure in the event of a breach or claim.',
        impactLevel: 'significant',
      });
    }

    // Termination check
    const hasATerm = textALower.includes('terminat') || textALower.includes('notice');
    const hasBTerm = textBLower.includes('terminat') || textBLower.includes('notice');
    if (hasATerm && hasBTerm) {
      changedTermination.push({
        category: 'Notice & Termination Period',
        documentA: 'Notice period specifies earlier termination terms.',
        documentB: 'Notice period specifies revised cancellation requirements.',
        difference: 'The required notice duration or cure period differs between versions.',
        whyItMatters: 'A shorter cure period or stricter notice mechanism gives less time to correct perceived defaults.',
        impactLevel: 'moderate',
      });
    }

    // Payment / Financial check
    const hasAPay = textALower.includes('fee') || textALower.includes('payment') || textALower.includes('rent') || textALower.includes('$');
    const hasBPay = textBLower.includes('fee') || textBLower.includes('payment') || textBLower.includes('rent') || textBLower.includes('$');
    if (hasAPay && hasBPay) {
      changedFinancialTerms.push({
        category: 'Financial Considerations',
        documentA: 'Original compensation or payment schedule.',
        documentB: 'Updated fee schedule, payment frequency, or late charge terms.',
        difference: 'Payment milestones, fee amounts, or penalty charges have been updated.',
        whyItMatters: 'Financial modifications impact total cost, cash flow timing, and late payment penalties.',
        impactLevel: 'significant',
      });
    }

    // Added / Removed clauses
    if (!textALower.includes('arbitration') && textBLower.includes('arbitration')) {
      addedClauses.push({
        category: 'Dispute Resolution',
        documentA: 'Standard court litigation permitted.',
        documentB: 'Mandatory binding arbitration clause added.',
        difference: 'Document B requires binding private arbitration rather than public judicial recourse.',
        whyItMatters: 'Mandatory arbitration waives your right to a jury trial and may limit appeal opportunities.',
        impactLevel: 'significant',
      });
      changedDisputeResolution.push(addedClauses[addedClauses.length - 1]);
    } else if (textALower.includes('arbitration') && !textBLower.includes('arbitration')) {
      removedClauses.push({
        category: 'Dispute Resolution',
        documentA: 'Mandatory binding arbitration clause present.',
        documentB: 'Arbitration clause removed.',
        difference: 'Document B removes mandatory private arbitration.',
        whyItMatters: 'Disputes will be resolved in courts of competent jurisdiction rather than through an arbitrator.',
        impactLevel: 'moderate',
      });
    }

    // Non-compete / restrictive covenant
    if (!textALower.includes('non-compete') && textBLower.includes('non-compete')) {
      addedClauses.push({
        category: 'Restrictive Covenants',
        documentA: 'No post-termination non-compete obligation.',
        documentB: 'Includes post-termination non-competition restriction.',
        difference: 'A restrictive covenant preventing competitive activity has been introduced.',
        whyItMatters: 'This restriction may limit your ability to work for competing businesses or start a similar venture.',
        impactLevel: 'significant',
      });
    }

    if (modifiedClauses.length === 0 && changedLiability.length === 0 && addedClauses.length === 0) {
      modifiedClauses.push({
        category: 'Terms & Conditions',
        documentA: `Baseline text from ${docA.title}.`,
        documentB: `Updated provisions in ${docB.title}.`,
        difference: 'Subtle phrasing modifications detected across operational covenants and definitions.',
        whyItMatters: 'Clarifications in contract definitions can adjust the scope of performance duties.',
        impactLevel: 'low',
      });
    }

    const executiveSummary = `Comparison between "${docA.title}" and "${docB.title}" reveals key structural changes. Major areas of distinction include updates to operational commitments, termination/cancellation terms, and risk allocation provisions. Review these changes carefully before agreeing to updated terms.`;

    return {
      executiveSummary,
      addedClauses,
      removedClauses,
      modifiedClauses,
      changedObligations,
      changedFinancialTerms,
      changedDates,
      changedTermination,
      changedLiability,
      changedDisputeResolution,
    };
  }

  public async answerGroundedQuestion(
    question: string,
    contextChunks: DocumentChunk[]
  ): Promise<StructuredAnswer> {
    const qLower = question.toLowerCase();

    // Check if question is asking something completely absent
    const keywords = qLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    const relevantChunks = contextChunks.filter((c) => {
      const fullText = `${c.content} ${c.sectionHeading || ''}`.toLowerCase();
      return keywords.some((kw) => {
        const stem = kw.length > 4 ? kw.substring(0, 4) : kw;
        return fullText.includes(kw) || fullText.includes(stem);
      });
    });

    if (relevantChunks.length === 0) {
      return {
        shortAnswer: "I couldn't find enough information in the document to answer that confidently.",
        whatTheDocumentSays: 'The uploaded document does not appear to contain explicit clauses or terms addressing this specific query.',
        whyItMatters: 'Important legal rights and responsibilities should be explicitly defined in writing rather than assumed.',
        sourceCitations: [],
        questionsForLawyer: [
          'Is this matter addressed by background statutory law in our jurisdiction?',
          'Should we request a written amendment or addendum clarifying this term?',
        ],
        grounded: false,
      };
    }

    const topChunk = relevantChunks[0];
    const citations: Citation[] = relevantChunks.slice(0, 3).map((c) => ({
      chunkId: c.id,
      pageNumber: c.pageNumber,
      sectionHeading: c.sectionHeading,
      textSnippet: c.content.length > 180 ? c.content.substring(0, 180) + '...' : c.content,
    }));

    let shortAnswer = '';
    let whatTheDocumentSays = '';
    let whyItMatters = '';
    const questionsForLawyer: string[] = [];

    if (qLower.includes('terminat') || qLower.includes('cancel') || qLower.includes('end')) {
      shortAnswer = 'The agreement allows termination under specific written notice periods or upon material breach.';
      whatTheDocumentSays = topChunk.content.substring(0, 260) + '...';
      whyItMatters = 'Missing formal notice deadlines or failing to cure defaults within the window can result in immediate termination or financial liability.';
      questionsForLawyer.push(
        'What specific notice method (e.g., registered mail, email) is required to effectively terminate?',
        'Are there any surviving obligations (e.g. confidentiality, non-compete) that persist after termination?'
      );
    } else if (qLower.includes('pay') || qLower.includes('fee') || qLower.includes('cost') || qLower.includes('rent') || qLower.includes('money')) {
      shortAnswer = 'The document specifies defined payment amounts, payment intervals, and conditions for adjustments or late fees.';
      whatTheDocumentSays = topChunk.content.substring(0, 260) + '...';
      whyItMatters = 'Understanding exact payment timing and potential penalty rates avoids dispute and unintentional default.';
      questionsForLawyer.push(
        'Can fees or charges be modified unilaterally during the term?',
        'What recourse or grace period is provided if a payment is inadvertently delayed?'
      );
    } else if (qLower.includes('intellectual property') || qLower.includes('ip') || qLower.includes('copyright') || qLower.includes('patent') || qLower.includes('owns')) {
      shortAnswer = 'The agreement includes provisions assigning rights in work products and safeguarding proprietary materials.';
      whatTheDocumentSays = topChunk.content.substring(0, 260) + '...';
      whyItMatters = 'Broad IP assignment clauses may cover inventions or ideas created outside normal business activities unless explicitly carved out.';
      questionsForLawyer.push(
        'Are pre-existing inventions and third-party open-source assets adequately protected from automatic assignment?',
        'Does the company retain ownership of custom work developed during this engagement?'
      );
    } else if (qLower.includes('renew') || qLower.includes('auto') || qLower.includes('extension')) {
      shortAnswer = 'The agreement contains terms governing renewal, which may include automatic extensions unless written notice of cancellation is delivered.';
      whatTheDocumentSays = topChunk.content.substring(0, 260) + '...';
      whyItMatters = 'Automatic renewal provisions can lock you into future terms and fees if the opt-out window is missed.';
      questionsForLawyer.push(
        'How many days prior to the renewal date must notice of non-renewal be delivered?',
        'Can pricing or terms change upon automatic renewal?'
      );
    } else if (qLower.includes('liab') || qLower.includes('indemn') || qLower.includes('damage') || qLower.includes('sue')) {
      shortAnswer = 'The document allocates risk through liability limitation and indemnification clauses.';
      whatTheDocumentSays = topChunk.content.substring(0, 260) + '...';
      whyItMatters = 'Uncapped indemnification or one-sided liability limitations can leave you exposed to significant third-party claims.';
      questionsForLawyer.push(
        'Is the liability limitation mutual, or does it disproportionately favor one party?',
        'Are there customary carve-outs (e.g. gross negligence, IP infringement) from the liability cap?'
      );
    } else {
      shortAnswer = `Based on the document context in ${topChunk.sectionHeading}, the contract addresses this matter through established guidelines.`;
      whatTheDocumentSays = topChunk.content.substring(0, 260) + '...';
      whyItMatters = 'This provision establishes contractual rights and responsibilities that govern party interactions.';
      questionsForLawyer.push(
        'How does this clause align with customary commercial standards in our jurisdiction?',
        'Are there any ambiguities that should be clarified prior to formal signing?'
      );
    }

    return {
      shortAnswer,
      whatTheDocumentSays,
      whyItMatters,
      sourceCitations: citations,
      questionsForLawyer,
      grounded: true,
    };
  }

  public async generateBriefing(
    documentTitle: string,
    analysis: any
  ): Promise<Omit<LegalBriefingProps, 'id' | 'userId' | 'documentId' | 'documentTitle' | 'createdAt' | 'updatedAt'>> {
    const questionsToAsk = [
      'Are the liability caps and indemnification obligations proportionate and mutual?',
      'What are the legal consequences and notice requirements if I need to terminate this agreement early?',
      'Does the governing law or dispute resolution venue create an unfair disadvantage?',
      'Are restrictive covenants (e.g. non-compete, IP assignment) enforceable as written under local law?',
    ];

    const documentsToBring = [
      `Complete copy of the signed or draft agreement ("${documentTitle}")`,
      'All written correspondence, email discussions, and side letters regarding negotiated terms',
      'Prior version of the agreement or comparable commercial contracts, if applicable',
      'Relevant financial records or invoices tied to this transaction',
    ];

    const importantDeadlines = [
      analysis.effectiveDate ? `Effective Date: ${analysis.effectiveDate}` : 'Effective date upon mutual signature',
      analysis.expirationDate ? `Expiration/Renewal Deadline: ${analysis.expirationDate}` : '30-day notice requirement prior to term end',
      'Invoice payment terms: Net 30 days from date of receipt',
    ];

    const keyConcerns = (analysis.findings || []).map((f: any) => `${f.finding} (${f.whyItMatters})`);
    if (keyConcerns.length === 0) {
      keyConcerns.push('Standard commercial terms require routine legal review.');
    }

    const clarificationAreas = [
      'Scope of confidentiality and duration of post-termination restrictions',
      'Circumstances justifying immediate termination for cause',
      'Ownership of derivative works and intellectual property improvements',
    ];

    const actionChecklist = [
      { id: 'act_1', label: 'Review termination and notice provisions with legal counsel', category: 'Termination', completed: false },
      { id: 'act_2', label: 'Confirm payment schedule and fee escalation triggers', category: 'Financial', completed: false },
      { id: 'act_3', label: 'Verify mutual indemnification and liability cap ceilings', category: 'Liability', completed: false },
      { id: 'act_4', label: 'Check auto-renewal deadlines and set calendar alerts', category: 'Renewal', completed: false },
      { id: 'act_5', label: 'Ensure IP ownership exclusions are explicitly scheduled', category: 'Intellectual Property', completed: false },
    ];

    const conciseSummary = `This executive briefing synthesizes the key legal commitments, risk indicators, and preparation points for "${documentTitle}". It organizes critical questions to take to a licensed attorney to ensure your commercial and personal interests are protected.`;

    return {
      conciseSummary,
      lawyerChecklist: {
        questionsToAsk,
        documentsToBring,
        importantDeadlines,
        keyConcerns,
        clarificationAreas,
      },
      actionChecklist,
    };
  }

  private detectDocumentType(textLower: string, title: string): string {
    const combined = (title + ' ' + textLower).toLowerCase();
    if (combined.includes('employment') || combined.includes('employee') || combined.includes('offer letter')) {
      return 'Employment Agreement';
    }
    if (combined.includes('lease') || combined.includes('tenant') || combined.includes('landlord') || combined.includes('rental')) {
      return 'Residential / Commercial Lease Agreement';
    }
    if (combined.includes('saas') || combined.includes('software-as-a-service') || combined.includes('subscription')) {
      return 'SaaS Subscription Agreement';
    }
    if (combined.includes('vendor') || combined.includes('master services') || combined.includes('msa') || combined.includes('consulting')) {
      return 'Vendor Master Services Agreement';
    }
    if (combined.includes('non-disclosure') || combined.includes('nda') || combined.includes('confidentiality')) {
      return 'Mutual Non-Disclosure Agreement';
    }
    return 'Commercial Legal Contract';
  }

  private extractParties(text: string, _docType: string): string[] {
    const partyMatch = text.match(/(?:between|by and between)\s+([A-Z][\w\s.,]+?)(?:,\s*an?\s*[\w\s]+)?\s+(?:and|&)\s+([A-Z][\w\s.,]+?)(?:\s*\(|\s*,|\s*\.)/i);
    if (partyMatch && partyMatch[1] && partyMatch[2]) {
      return [partyMatch[1].trim(), partyMatch[2].trim()];
    }
    return ['First Party (Provider / Employer / Landlord)', 'Second Party (Recipient / Employee / Tenant)'];
  }

  private extractEffectiveDate(text: string): string | null {
    const match = text.match(/(?:effective\s+as\s+of|dated\s+as\s+of|entered\s+into\s+on)\s+([A-Za-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i);
    return match ? match[1] : null;
  }

  private extractExpirationDate(text: string): string | null {
    const match = text.match(/(?:expire\s+on|terminate\s+on|term\s+shall\s+end\s+on)\s+([A-Za-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i);
    return match ? match[1] : null;
  }

  private extractJurisdiction(text: string): string | null {
    const match = text.match(/(?:governed\s+by\s+the\s+laws\s+of|laws\s+of\s+the\s+State\s+of)\s+([A-Z][a-zA-Z\s]{2,20})/i);
    return match ? match[1].trim() : null;
  }

  private detectClauses(text: string, chunks: DocumentChunk[]): Partial<ImportantClauseProps>[] {
    const clauses: Partial<ImportantClauseProps>[] = [];
    const textLower = text.toLowerCase();

    // 1. Indemnification / Liability
    if (textLower.includes('indemnif') || textLower.includes('hold harmless')) {
      const chunk = chunks.find((c) => c.content.toLowerCase().includes('indemnif')) || chunks[0];
      clauses.push({
        category: 'indemnification' as ClauseCategory,
        title: 'Indemnification & Defense Obligation',
        plainExplanation: 'You may have to cover certain financial losses, legal costs, or claims brought against the other party.',
        whyItMatters: 'Uncapped or broad indemnification clauses shift third-party lawsuit costs onto you, which can represent substantial financial liability.',
        concernLevel: 'high_attention' as ConcernLevel,
        originalText: chunk ? chunk.content.substring(0, 300) : 'The party shall indemnify and defend...',
        pageNumber: chunk ? chunk.pageNumber : 1,
        sectionHeading: chunk ? chunk.sectionHeading : 'Indemnification',
      });
    }

    // 2. Limitation of Liability
    if (textLower.includes('limitation of liability') || textLower.includes('consequential damages')) {
      const chunk = chunks.find((c) => c.content.toLowerCase().includes('liability')) || chunks[0];
      clauses.push({
        category: 'liability' as ClauseCategory,
        title: 'Limitation of Liability & Damage Caps',
        plainExplanation: 'Limits the maximum monetary amount either party can recover if things go wrong.',
        whyItMatters: 'Caps generally exclude indirect or punitive damages and can limit your financial recovery even if the other party breaches.',
        concernLevel: 'review_carefully' as ConcernLevel,
        originalText: chunk ? chunk.content.substring(0, 300) : 'In no event shall aggregate liability exceed...',
        pageNumber: chunk ? chunk.pageNumber : 1,
        sectionHeading: chunk ? chunk.sectionHeading : 'Limitation of Liability',
      });
    }

    // 3. Termination
    if (textLower.includes('terminat') || textLower.includes('notice')) {
      const chunk = chunks.find((c) => c.content.toLowerCase().includes('terminat')) || chunks[0];
      clauses.push({
        category: 'termination' as ClauseCategory,
        title: 'Termination for Convenience & Cause',
        plainExplanation: 'Explains how and when the contract can be canceled, and how many days written notice is required.',
        whyItMatters: 'Understanding notice windows prevents unexpected breach claims and ensures you have enough time to transition or cure defects.',
        concernLevel: 'review_carefully' as ConcernLevel,
        originalText: chunk ? chunk.content.substring(0, 300) : 'Either party may terminate upon 30 days notice...',
        pageNumber: chunk ? chunk.pageNumber : 1,
        sectionHeading: chunk ? chunk.sectionHeading : 'Termination',
      });
    }

    // 4. Intellectual Property
    if (textLower.includes('intellectual property') || textLower.includes('proprietary rights') || textLower.includes('work for hire')) {
      const chunk = chunks.find((c) => c.content.toLowerCase().includes('intellectual property') || c.content.toLowerCase().includes('proprietary')) || chunks[0];
      clauses.push({
        category: 'intellectual_property' as ClauseCategory,
        title: 'Intellectual Property & Ownership',
        plainExplanation: 'Specifies who retains ownership of copyrights, patents, designs, inventions, and created work products.',
        whyItMatters: 'Ensure you do not inadvertently transfer pre-existing rights or personal intellectual property to the other party.',
        concernLevel: 'review_carefully' as ConcernLevel,
        originalText: chunk ? chunk.content.substring(0, 300) : 'All right, title and interest in work product shall vest...',
        pageNumber: chunk ? chunk.pageNumber : 1,
        sectionHeading: chunk ? chunk.sectionHeading : 'Intellectual Property',
      });
    }

    // 5. Non-Compete / Restrictive Covenants
    if (textLower.includes('non-compete') || textLower.includes('non-solicitation') || textLower.includes('restrictive covenant')) {
      const chunk = chunks.find((c) => c.content.toLowerCase().includes('non-compete') || c.content.toLowerCase().includes('non-solicit')) || chunks[0];
      clauses.push({
        category: 'non_compete' as ClauseCategory,
        title: 'Non-Compete & Non-Solicitation Restraints',
        plainExplanation: 'Restricts your ability to engage in competing business activities or solicit employees/clients after departure.',
        whyItMatters: 'Restrictive covenants can impact future employment and business ventures. Enforceability varies significantly by jurisdiction.',
        concernLevel: 'high_attention' as ConcernLevel,
        originalText: chunk ? chunk.content.substring(0, 300) : 'Recipient agrees not to engage in competing business for 12 months...',
        pageNumber: chunk ? chunk.pageNumber : 1,
        sectionHeading: chunk ? chunk.sectionHeading : 'Restrictive Covenants',
      });
    }

    // 6. Dispute Resolution & Arbitration
    if (textLower.includes('arbitration') || textLower.includes('dispute resolution')) {
      const chunk = chunks.find((c) => c.content.toLowerCase().includes('arbitration') || c.content.toLowerCase().includes('dispute')) || chunks[0];
      clauses.push({
        category: 'arbitration' as ClauseCategory,
        title: 'Mandatory Binding Arbitration',
        plainExplanation: 'Requires legal disagreements to be handled by a private arbitrator rather than in a court with a jury.',
        whyItMatters: 'Arbitration is often confidential and limits traditional court appeals, class action participation, and broad discovery.',
        concernLevel: 'review_carefully' as ConcernLevel,
        originalText: chunk ? chunk.content.substring(0, 300) : 'Any dispute arising under this Agreement shall be resolved through arbitration...',
        pageNumber: chunk ? chunk.pageNumber : 1,
        sectionHeading: chunk ? chunk.sectionHeading : 'Dispute Resolution',
      });
    }

    // 7. Payment Obligations
    if (textLower.includes('payment') || textLower.includes('compensation') || textLower.includes('fees') || textLower.includes('rent')) {
      const chunk = chunks.find((c) => c.content.toLowerCase().includes('payment') || c.content.toLowerCase().includes('fee') || c.content.toLowerCase().includes('rent')) || chunks[0];
      clauses.push({
        category: 'payment_obligations' as ClauseCategory,
        title: 'Financial & Payment Commitments',
        plainExplanation: 'Defines fee amounts, due dates, billing procedures, and penalties for late payments.',
        whyItMatters: 'Clear payment schedules prevent interest penalties, service suspension, or claims of contract breach.',
        concernLevel: 'informational' as ConcernLevel,
        originalText: chunk ? chunk.content.substring(0, 300) : 'Payment terms are Net 30 from invoice receipt...',
        pageNumber: chunk ? chunk.pageNumber : 1,
        sectionHeading: chunk ? chunk.sectionHeading : 'Payment Terms',
      });
    }

    // 8. Confidentiality
    if (textLower.includes('confidential') || textLower.includes('non-disclosure')) {
      const chunk = chunks.find((c) => c.content.toLowerCase().includes('confidential')) || chunks[0];
      clauses.push({
        category: 'confidentiality' as ClauseCategory,
        title: 'Confidentiality & Non-Disclosure',
        plainExplanation: 'Outlines obligations to keep trade secrets, business metrics, and private disclosures confidential.',
        whyItMatters: 'Breach of confidentiality terms can lead to emergency injunctive relief and damages.',
        concernLevel: 'informational' as ConcernLevel,
        originalText: chunk ? chunk.content.substring(0, 300) : 'Each party agrees to maintain confidentiality of proprietary data...',
        pageNumber: chunk ? chunk.pageNumber : 1,
        sectionHeading: chunk ? chunk.sectionHeading : 'Confidentiality',
      });
    }

    // Fallback if sparse document
    if (clauses.length === 0) {
      const chunk = chunks[0];
      clauses.push({
        category: 'other' as ClauseCategory,
        title: 'General Contractual Provisions',
        plainExplanation: 'Standard contractual rights and obligations governing the parties.',
        whyItMatters: 'Formal agreements define enforceable duties between signatories.',
        concernLevel: 'informational' as ConcernLevel,
        originalText: chunk ? chunk.content.substring(0, 300) : text.substring(0, 300),
        pageNumber: 1,
        sectionHeading: 'General',
      });
    }

    return clauses;
  }

  private detectFindings(
    _text: string,
    clauses: Partial<ImportantClauseProps>[],
    chunks: DocumentChunk[]
  ): Partial<AttentionFindingProps>[] {
    const findings: Partial<AttentionFindingProps>[] = [];

    // High attention items
    const highClauses = clauses.filter((c) => c.concernLevel === 'high_attention');
    for (const c of highClauses) {
      findings.push({
        category: 'high_attention' as ConcernLevel,
        finding: `Broad commitment identified in ${c.title}`,
        whyItMatters: c.whyItMatters || 'May expose you to outsized liabilities or restrictions.',
        sourceReference: `Page ${c.pageNumber || 1}, ${c.sectionHeading || 'Clause Section'}`,
        pageNumber: c.pageNumber || 1,
        sectionHeading: c.sectionHeading || 'Important Clause',
        questionsToConsider: [
          'Can the scope of this obligation be capped or made strictly mutual?',
          'Does this provision align with common commercial practices in this state?',
        ],
        suggestedProfessionalFollowUp: 'Request your attorney review this clause to negotiate mutual protections and monetary limits.',
      });
    }

    // Review carefully items
    const reviewClauses = clauses.filter((c) => c.concernLevel === 'review_carefully');
    for (const c of reviewClauses) {
      findings.push({
        category: 'review_carefully' as ConcernLevel,
        finding: `Notice and procedural guidelines in ${c.title}`,
        whyItMatters: c.whyItMatters || 'Requires careful compliance to avoid forfeiting rights.',
        sourceReference: `Page ${c.pageNumber || 1}, ${c.sectionHeading || 'Section'}`,
        pageNumber: c.pageNumber || 1,
        sectionHeading: c.sectionHeading || 'Section',
        questionsToConsider: [
          'Are the timeline windows realistic for regular operations?',
          'What are the exact cure periods before default can be triggered?',
        ],
        suggestedProfessionalFollowUp: 'Verify with counsel that notice provisions and cure windows provide adequate operational breathing room.',
      });
    }

    // Informational findings
    if (findings.length === 0) {
      const chunk = chunks[0];
      findings.push({
        category: 'informational' as ConcernLevel,
        finding: 'Routine commercial terms identified without disproportionate risk triggers.',
        whyItMatters: 'Standard terms clarify expectations but remain legally binding.',
        sourceReference: `Page ${chunk ? chunk.pageNumber : 1}, General Provisions`,
        pageNumber: chunk ? chunk.pageNumber : 1,
        sectionHeading: 'General Provisions',
        questionsToConsider: ['Do both parties agree on the deliverable specifications?'],
        suggestedProfessionalFollowUp: 'Consult a legal professional if you have any questions before signing.',
      });
    }

    return findings;
  }

  private extractVerbatimFacts(
    text: string,
    chunks: DocumentChunk[],
    effectiveDate: string | null,
    jurisdiction: string | null
  ): ExtractedFact[] {
    const facts: ExtractedFact[] = [];
    const firstChunk = chunks[0] || { pageNumber: 1, content: text };

    if (effectiveDate) {
      facts.push({
        category: 'Effective Date',
        fact: `Contract takes effect on ${effectiveDate}`,
        verbatimExcerpt: `Dated as of ${effectiveDate}`,
        pageNumber: firstChunk.pageNumber,
      });
    }

    if (jurisdiction) {
      facts.push({
        category: 'Governing Law',
        fact: `Governed by the laws of ${jurisdiction}`,
        verbatimExcerpt: `laws of the State of ${jurisdiction}`,
        pageNumber: chunks.length > 0 ? chunks[chunks.length - 1].pageNumber : 1,
      });
    }

    facts.push({
      category: 'Document Scope',
      fact: `Document spans approximately ${Math.max(1, Math.ceil(text.length / 2500))} page(s) and ${text.length} characters.`,
      verbatimExcerpt: text.substring(0, 120) + '...',
      pageNumber: 1,
    });

    return facts;
  }

  private buildPlainLanguageSummary(
    docType: string,
    _clauses: Partial<ImportantClauseProps>[],
    _text: string
  ): any {
    return {
      whatThisDocumentIsAbout: `This agreement establishes formal legal parameters for a ${docType}, delineating performance duties, intellectual property allocation, and dispute procedures.`,
      whatYouAreAgreeingTo: [
        'Perform the services or covenants described in the agreement in accordance with agreed schedules.',
        'Maintain the confidentiality of non-public proprietary disclosures.',
        'Accept specified limitation of liability terms and dispute mechanisms.',
      ],
      whatTheOtherPartyIsAgreeingTo: [
        'Compensate or perform according to the negotiated fee and delivery structure.',
        'Provide necessary cooperation, documentation, and access to complete contractual duties.',
        'Respect your stated proprietary rights and licensing limits.',
      ],
      yourKeyResponsibilities: [
        'Deliver required notices in writing within the required notice windows.',
        'Ensure deliverables adhere to stated quality standards and specifications.',
        'Comply with relevant state and federal regulatory guidelines.',
      ],
      yourRights: [
        'Right to receive agreed compensation or performance upon completion.',
        'Right to cure defaults within the designated cure period before termination.',
        'Right to terminate the contract in accordance with the termination clause.',
      ],
      importantDates: [
        'Effective date upon signature or stated execution date.',
        'Notice deadlines: Typically 30 days prior to contract termination or renewal.',
        'Payment terms: Invoices payable within designated calendar window.',
      ],
      financialObligations: [
        'Specified fee payments, deposits, or hourly rates.',
        'Potential late payment charges or interest fees if deadlines are missed.',
        'Taxes or regulatory fees allocated between signatories.',
      ],
      terminationConditions: [
        'Termination for cause upon material breach following written notice.',
        'Termination for convenience if written notice is delivered within the designated timeframe.',
        'Immediate termination for bankruptcy or insolvency events.',
      ],
    };
  }
}
