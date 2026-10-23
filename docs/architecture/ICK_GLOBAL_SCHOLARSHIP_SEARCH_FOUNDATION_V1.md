ICK OPPORTUNITIES

GLOBAL SCHOLARSHIP SEARCH FOUNDATION

Phase 3B.3C — Architecture Specification V1.0

Parent Brand: ICK Technologies
Product: ICK Opportunities
Status: ARCHITECTURE DESIGN ONLY
Date: 2026-10-23
Target Branch: "feat/ick-global-scholarship-search-foundation"

---

1. PROJECT VISION

Develop ICK Opportunities into a secure, reliable, internationally accessible scholarship discovery platform.

The platform should progressively help students discover universities, academic programmes, scholarship opportunities, and official application information from different countries.

The long-term objective is global coverage, including universities with Islamic institutional identities and Islamic Studies programmes.

Global coverage is an objective, not a claim of current completeness.

2. CURRENT FOUNDATION

The existing application includes:

- A public scholarship discovery interface.
- A Scholarship Navigator.
- A university directory containing eight editorial starter institutions.
- University profile pages and institutional source links.
- An existing opportunities database and administrative review infrastructure.

The current directory is a limited static collection.

The new university registry database architecture and SQL drafts are planning artifacts. Their deployment and operational status must be independently verified.

3. CORE ARCHITECTURAL PRINCIPLES

A. Separate institutions from scholarships

A university record represents an institution.

A scholarship programme represents a funding opportunity.

An application cycle represents a specific period during which applications may be accepted.

An institution's existence must never be presented as proof that a scholarship is currently available.

B. Evidence-first publication

Scholarship claims must be supported by authoritative sources.

Publication requires verified information appropriate to each claim, including:

- Official provider or programme identity.
- Relevant scholarship or funding details.
- Application eligibility.
- Current application cycle.
- Official application destination.
- Deadline, where applicable.

Unknown information must remain explicitly unknown.

C. Global inclusion

The discovery model should support institutions and scholarships internationally.

No institution should be classified as Islamic solely because it is located in a Muslim-majority country.

Institutional identity and academic programme classifications require appropriate evidence.

D. Security by design

Public access must expose approved information only.

Draft, rejected, expired, or unreviewed information must not be presented as currently verified opportunities.

Administrative publication decisions must be enforced by backend authorization and database security controls, not merely by frontend filtering.

4. PROPOSED SEARCH CAPABILITIES

The future search engine should support:

Institution discovery

- University name and alternative names.
- Country and city.
- Institutional category.
- Arabic and Latin-script name matching.
- Official institutional profile.

Scholarship discovery

- Scholarship or programme name.
- Funding organization.
- Destination country.
- Academic level.
- Field of study.
- Funding type.
- Application availability.
- Official application deadline.

Future eligibility discovery

- Applicant nationality.
- Academic qualifications.
- Language requirements.
- Programme-specific restrictions.

Filters must not be advertised as reliable until the corresponding information has been implemented and validated.

5. PROPOSED DATA MODEL

The architecture should distinguish these entities:

1. "universities" — institutional identity and publication status.
2. "university_aliases" — alternative names and multilingual search.
3. "university_evidence" — evidence supporting institutional claims.
4. "university_classifications" — reviewed institutional categories.
5. "academic_programmes" — academic study offerings.
6. "scholarship_programmes" — stable scholarship identities.
7. "scholarship_cycles" — application rounds and their current status.
8. "scholarship_eligibility_rules" — structured eligibility information.
9. "scholarship_evidence" — sources supporting scholarship claims.

These are conceptual entities, not authorization to create database tables.

The first four are already specified in the university registry design documents.

Later entities require separate schema review and staged implementation.

Existing "opportunities", user profiles, authentication, tracking, and recommendation systems must remain compatible.

Avoid creating duplicate scholarship records when a controlled relationship with existing opportunities is sufficient.

6. SEARCH ENGINE STRATEGY

Start with PostgreSQL-based search before introducing expensive external infrastructure.

Recommended progression:

Stage 1: Search existing reviewed institutional and opportunity records.

Stage 2: Add server-side pagination, indexed search, normalized aliases, and structured filters.

Stage 3: Introduce reviewed scholarship programme and application-cycle data.

Stage 4: Add multilingual search improvements and transparent recommendation ranking.

Stage 5: Evaluate external search services or AI-assisted discovery only when scale, data quality, and measured performance justify them.

Search results must distinguish institutional information from currently verified scholarship application opportunities.

7. DATA QUALITY AND SAFETY

The system must include safeguards against:

- Duplicate institutions and scholarship listings.
- Fabricated deadlines.
- Outdated application information.
- Misleading fully-funded claims.
- Unverified eligibility requirements.
- Unofficial application links being represented as authoritative.
- Unauthorized publication.
- Exposure of private user information.

Each published scholarship should have a traceable review history.

Automated discovery may propose candidates but must not independently publish unverified claims.

8. USER EXPERIENCE REQUIREMENTS

The platform should provide:

- Mobile-first responsive design.
- Clear search navigation.
- Accessible form controls.
- Understandable filters.
- Descriptive empty states.
- Transparent verification labels.
- Direct official-source links.
- English-first architecture with support for Hausa, Arabic, and additional languages over time.

Unknown scholarship availability must not be presented as an active application.

9. IMPLEMENTATION GATES

Gate 1 — Architecture Review

Review the existing university registry proposal and this search architecture for consistency.

Gate 2 — Database Identification

Verify the authoritative Lovable-managed production database and confirm the application deployment environment.

Gate 3 — Isolated Staging

Establish a genuinely isolated test database.

A GitHub branch or Vercel preview alone is not database isolation.

Gate 4 — Security Assessment

Review existing database grants, row-level security policies, publication permissions, and audit requirements.

Gate 5 — Controlled Implementation

Implement and test changes incrementally on staging.

Gate 6 — Founder Approval

Production migrations, bulk imports, and public publication require explicit authorization after review.

10. NON-GOALS FOR THIS PHASE

This phase does not authorize:

- Production SQL execution.
- Database migrations.
- Automatic publication of scholarships.
- Bulk ingestion of universities.
- Modifications to authentication or user roles.
- Changes to live application data.
- Expensive external services.
- Deployment of unfinished search features.

11. DEFINITION OF DONE

Phase 3B.3C architecture work will be ready for review when:

- Search requirements are documented.
- Entity relationships are consistent with the university registry design.
- Current functionality and proposed functionality are clearly distinguished.
- Security and verification requirements are documented.
- Database deployment prerequisites are identified.
- Implementation stages and rollback expectations are defined.
- Founder approval requirements are recorded.

Final principle:

ICK Opportunities must prioritize trustworthy, verifiable scholarship information over inflated directory size, unsupported availability claims, or premature automation.
