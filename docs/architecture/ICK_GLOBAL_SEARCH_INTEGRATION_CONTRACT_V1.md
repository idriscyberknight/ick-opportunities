ICK OPPORTUNITIES

GLOBAL SEARCH INTEGRATION CONTRACT V1.0

Phase: 3B.3D
Date: 2026-10-23
Status: DESIGN ONLY — NOT IMPLEMENTED

1. Objective

Define how the existing ICK Opportunities scholarship discovery system will integrate with the proposed Global University Registry.

The integration must support international growth while preserving existing authentication, administration, user profiles, saved opportunities, and application tracking.

2. Existing Systems

The current university directory uses a static editorial collection.

The existing opportunities database stores scholarships, jobs, internships, and grants.

These systems must remain distinguishable until an approved, database-backed integration has been implemented and tested.

3. Search Categories

The proposed global search interface will support three result categories:

Universities: Institutional identity, location, classifications, official website, and reviewed evidence.

Scholarships: Reviewed funding opportunities, eligibility information, application destinations, and verified application cycles when available.

All results: A combined search view with universities and scholarships presented in clearly separated result groups.

4. Search Parameters

The proposed search API should support:

- Keyword.
- Result category.
- Destination country.
- Institution classification.
- Academic level, where verified data exists.
- Funding type, where verified data exists.
- Application status, where verified data exists.
- Pagination.

The initial implementation should use server-side filtering and indexed PostgreSQL queries.

5. Data Relationships

Universities must have stable identifiers.

Scholarship programmes must also have stable identifiers.

A scholarship programme may be associated with multiple institutions.

A university may participate in multiple scholarship programmes.

The relationship between institutions and scholarship programmes should therefore support many-to-many associations.

Existing opportunity records must not be duplicated simply to establish these associations.

Any relationship to the existing "opportunities" table requires a separately reviewed design.

6. Publication and Security

Public search must return only records approved for public visibility.

Institutional verification must not be interpreted as confirmation of an open scholarship.

Scholarship publication must be supported by reviewed evidence and current application-cycle information.

Database authorization must enforce public visibility independently of frontend filters.

Ordinary authenticated users must not receive administrative access through search endpoints.

7. Search Quality

The implementation should support:

- Case-insensitive searching.
- Reviewed institutional aliases.
- Arabic and Latin-script names.
- Duplicate detection.
- Deterministic initial ranking.
- Clear empty-result messages.
- Accessible mobile search.
- Safe pagination.

Search ranking must not fabricate eligibility or scholarship availability.

8. Integration Sequence

Stage A: Review the existing opportunity publication security rules.

Stage B: Verify the authoritative database and establish isolated staging.

Stage C: Test the university registry schema and access controls on staging.

Stage D: Build a reviewed, database-backed university search interface.

Stage E: Design scholarship programme and application-cycle relationships.

Stage F: Integrate approved scholarship results with institutional profiles.

Stage G: Introduce advanced international filters after data quality and security testing.

9. Deployment Restrictions

This document does not authorize:

- Production database migrations.
- Public release of unverified records.
- Changes to existing opportunity data.
- Automatic scholarship publication.
- Bulk university imports.
- Changes to user authentication or permissions.

10. Acceptance Criteria

The integration design is ready for implementation planning when:

- Existing and proposed systems are clearly distinguished.
- Institution-to-scholarship relationships are defined.
- Search inputs and outputs are documented.
- Security boundaries are identified.
- Staging requirements are confirmed.
- Compatibility with existing functionality is addressed.
- The Founder approves the next implementation stage.

Principle: Global scale must be built on trustworthy data, verifiable sources, secure access, and controlled implementation.
