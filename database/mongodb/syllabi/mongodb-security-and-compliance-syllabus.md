---
title: "MongoDB Security and Compliance Syllabus"
description: "A comprehensive 12-week advanced curriculum for database administrators, platform engineers, and security architects covering MongoDB security and regulatory compliance — threat modeling, authentication and authorization internals, transport and network hardening, encryption at rest and in use with CSFLE and Queryable Encryption, auditing and security telemetry, key management, data governance frameworks such as GDPR, HIPAA, PCI DSS and SOC 2, multi-tenant isolation, incident response, and compliance evidence automation."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# MongoDB Security and Compliance Syllabus

## Overview

This 12-week advanced syllabus is designed for database administrators, platform engineers, security architects, and compliance owners who already operate MongoDB in production and now need to defend it and prove that defense to auditors. Where the general MongoDB advanced syllabus devotes a single module to security architecture, this course treats security and compliance as the entire discipline: how MongoDB actually enforces identity, how authorization decisions are evaluated at the privilege level, how data is protected on the wire and on disk, how encryption keys are governed, how security events become auditable evidence, and how a database platform maps onto the regulatory frameworks that organizations are contractually obliged to satisfy.

The curriculum is built around the reality that MongoDB security failures are rarely exotic exploits. They are enabled deployments, over-privileged application users, shared credentials in environment variables, unencrypted backups, unaudited administrative access, and collections holding personal data that no one classified. Each module therefore pairs the mechanism — SCRAM, x.509, LDAP, Kerberos, RBAC, TLS, KMIP, CSFLE, Queryable Encryption, audit filters — with the control objective it satisfies and the evidence an auditor expects to see. Labs run against real deployments: replica sets with internal authentication, Atlas projects with database users and network peering, `mongosh` sessions exercising privilege boundaries, and logging pipelines that turn audit entries into queryable telemetry.

Compliance is treated as an engineering output rather than an afterthought. Learners work through GDPR data subject rights implemented on real collections, PCI DSS cardholder data scoping, HIPAA access-control and audit requirements, and SOC 2 control evidence collection, then automate the collection of that evidence so it survives the next release. The course culminates in a capstone in which learners harden a deliberately weak MongoDB deployment end to end, document every control with its mapping to a framework, and defend the design in a review that simulates an external audit.

By the end of this course, learners will be able to model threats against a MongoDB deployment, design an authentication strategy across internal and external identity providers, build least-privilege role hierarchies down to collection and field level, harden transport and network exposure, implement encryption at rest and field-level encryption with governed keys, operate an audit pipeline that produces defensible evidence, map MongoDB controls onto common regulatory frameworks, isolate tenants safely on shared clusters, run a database security incident response, and automate continuous compliance verification.

## Curriculum

### Module 1: Security Foundations and Threat Modeling for MongoDB (Week 1)

- **The MongoDB attack surface**
  - Default deployments and the unauthenticated-access failure mode
  - Exposed ports, bind IP configuration, and internet-reachable instances
  - Application-layer injection risk: operator injection through untrusted query objects
  - Supply chain exposure: drivers, BI connectors, and Ops Manager agents

- **Threat modeling the data tier**
  - STRIDE applied to a document database: spoofing, tampering, repudiation, disclosure, denial of service, elevation
  - Data flow diagrams that include replica set members, arbiters, and backup targets
  - Trust boundaries: application to driver, driver to mongod, mongod to key server
  - Prioritizing threats by data classification rather than by novelty

- **Data classification as a prerequisite**
  - Identifying PII, PHI, and cardholder data inside flexible documents
  - Field-level inventory: nested documents, arrays of records, embedded history
  - Tagging collections and fields for downstream policy enforcement
  - Classification drift as schemas evolve without governance

- **Security baseline and hardening checklist**
  - Authorization enabled, no localhost exception in production
  - Internal authentication between replica set and shard members
  - Administrative access paths restricted and logged
  - Version currency: unsupported releases as a control failure

### Module 2: Authentication Architecture (Week 2)

- **SCRAM and internal authentication**
  - SCRAM-SHA-256 credential storage and per-user salts
  - Keyfile authentication for cluster members and its operational limits
  - x.509 internal authentication with a dedicated cluster CA
  - Rotating internal credentials without cluster downtime

- **External identity integration**
  - LDAP authorization and authentication: `userToDNMapping`, group resolution
  - Kerberos and Active Directory integration for enterprise environments
  - OIDC and workload identity patterns for Atlas and modern platform stacks
  - Choosing between external identity and database-native users

- **Client certificate authentication**
  - x.509 client certificates and subject-to-user mapping
  - Certificate lifecycle: issuance, renewal, revocation, and CRL behaviour
  - Mutual TLS as both authentication and transport control
  - Common misconfigurations: `allowConnectionsWithoutCertificates` in production

- **Credential lifecycle management**
  - Per-application users instead of shared administrative accounts
  - Password rotation automation and connection-string propagation
  - Eliminating credentials from source control, images, and logs
  - Break-glass accounts: existence, custody, and use review

### Module 3: Authorization and Least Privilege (Week 3)

- **How MongoDB evaluates privileges**
  - Actions and resources: the two halves of every privilege
  - Database and collection scoping, including `anyResource` risks
  - Privilege union across inherited roles, and why the union is the real grant
  - Deny semantics and the absence of an explicit deny rule

- **Built-in roles and their hazards**
  - `readWriteAnyDatabase`, `dbAdminAnyDatabase`, `root`, and `clusterAdmin`
  - When `read` is enough and when `readWrite` is a compliance finding
  - `clusterMonitor` versus `clusterManager` versus `hostManager`
  - Auditing role grants: finding the roles nobody remembers assigning

- **Custom roles and field-level controls**
  - Built-in plus custom role composition per service
  - Restricting writes to specific fields with a projection-style resource document
  - Granting `find` on a collection while withholding specific fields
  - Testing field-level restrictions from the client, not from mongosh as admin

- **Authorization governance**
  - Role-per-service pattern and the blast radius of a compromised credential
  - Periodic access review: exporting grants and reconciling against owners
  - Separation of duties between deploy, operate, and audit identities
  - Privilege creep detection after incident-driven hotfixes

### Module 4: Network and Transport Hardening (Week 4)

- **TLS configuration and enforcement**
  - Enabling TLS with a private CA and correct hostname verification
  - Forcing TLS and disabling weak protocol versions and cipher suites
  - Mutual TLS for client connections and its operational cost
  - Certificate rotation without dropping replication traffic

- **Network exposure control**
  - `bindIp`, port selection, and why security through obscurity is not a control
  - Private networking: VPC peering, PrivateLink, and dedicated cluster endpoints
  - IP access lists and their limits as an authentication mechanism
  - Bastion and jump-host patterns for administrative access

- **Segmentation and zero trust**
  - Placing replica set members on restricted subnets
  - Distinct network paths for application, replication, and backup traffic
  - Egress controls for cross-region replication
  - Firewall rules as code with drift detection

- **Denial-of-service and abuse resistance**
  - Query shape attacks: unbounded regex, deep nesting, expensive aggregations
  - Resource limits and operation timeouts as protective controls
  - Connection storm handling and pool sizing
  - Rate limiting at the application boundary rather than the database

### Module 5: Encryption at Rest and Key Management (Week 5)

- **Storage-level encryption**
  - WiredTiger encryption at rest and the KMIP key provider model
  - Master key versus data keys and their different rotation semantics
  - Encrypting backups, snapshots, and exported dumps
  - Cloud provider volume encryption as a complement, not a substitute

- **Key management architecture**
  - KMIP servers, cloud KMS, and local keyfile trade-offs
  - Key custody: who can decrypt, under what conditions, with what logging
  - Key rotation runbooks and verification that old keys are retired
  - Disaster recovery when the key server is unavailable

- **Field-level encryption rationale**
  - Why storage encryption does not protect against an over-privileged application user
  - Choosing between client-side field level encryption and Queryable Encryption
  - Deterministic versus random encryption and the query consequences
  - Indexing encrypted fields: supported query types and their limits

- **Encryption governance**
  - Documenting the data key hierarchy for auditors
  - Proving encryption is enforced, not merely configured
  - Testing that plaintext never reaches logs, backups, or telemetry
  - Cryptographic agility: planning for algorithm and provider migration

### Module 6: Client-Side Field Level Encryption and Queryable Encryption (Week 6)

- **CSFLE implementation**
  - Explicit encryption with the driver: encrypt, decrypt, and bypass paths
  - Automatic encryption with a JSON schema and encrypted fields map
  - Key vault collections, data key creation, and key alt names
  - Supporting equality queries on deterministically encrypted fields

- **Queryable Encryption**
  - Encrypted indexes and the query types they support
  - Client-side encryption of the index alongside the document field
  - Metadata collections and their access-control requirements
  - Migration paths between CSFLE and Queryable Encryption

- **Application integration**
  - Driver configuration, key provider credentials, and IAM scope
  - Handling encryption in background jobs, ETL, and analytics exports
  - Search and aggregation behaviour over encrypted fields
  - Failure modes: missing keys, schema mismatch, partial encryption

- **Verification and audit**
  - Proving documents are ciphertext at rest with direct storage inspection
  - Testing privilege boundaries so administrators cannot read plaintext
  - Key access logging as compliance evidence
  - Performance measurement of encrypted field operations

### Module 7: Auditing and Security Telemetry (Week 7)

- **The MongoDB audit subsystem**
  - Enabling auditing at startup and the immutability requirement
  - Audit filters: restricting to authentication, DDL, and privileged actions
  - Log destination options and their tamper-resistance characteristics
  - Performance and storage cost of comprehensive auditing

- **What to audit and why**
  - Authentication successes and failures, including source addresses
  - Role and user management: `createUser`, `grantRolesToUser`, `dropUser`
  - Schema and index changes as configuration drift evidence
  - Data export and bulk-read operations as exfiltration signals

- **Turning audit logs into telemetry**
  - Shipping audit output to a SIEM or log platform without loss
  - Parsing and normalizing audit documents into searchable fields
  - Alerting rules for impossible-travel logins and privilege escalation
  - Retention windows aligned with regulatory minimums

- **Detection engineering**
  - Baseline query shapes and detect anomalous collection access
  - Detect slow-and-low exfiltration through paginated reads
  - Correlate application identity with deployment events
  - False-positive management and alert fatigue control

### Module 8: Data Governance and Regulatory Frameworks (Week 8)

- **Mapping MongoDB controls to frameworks**
  - GDPR: lawful basis, data minimization, storage limitation, subject rights
  - HIPAA: access control, audit controls, integrity, transmission security
  - PCI DSS: cardholder data environment scoping and key management requirements
  - SOC 2: security, availability, and confidentiality criteria evidence

- **Implementing subject rights on real collections**
  - Discovery: locating all documents referencing one data subject
  - Erasure with referential integrity and immutable audit trails
  - Export in a portable format without exposing unrelated tenants
  - Retention enforcement through TTL indexes and archival tiers

- **Data residency and cross-border transfer**
  - Region-pinned clusters and replication topology constraints
  - Backup location as a residency surface often overlooked
  - Analytics copies and their jurisdictional exposure
  - Documenting transfer mechanisms for auditors

- **Policy as code**
  - Expressing retention, classification, and residency rules in version control
  - Automated checks that fail a release on policy violation
  - Change control for schema and index modifications on regulated data
  - Governance metrics reported alongside engineering metrics

### Module 9: Multi-Tenancy and Isolation (Week 9)

- **Tenancy models in MongoDB**
  - Database-per-tenant, collection-per-tenant, and shared-collection with tenant keys
  - Cost, operational complexity, and isolation strength of each model
  - Noisy-neighbour risk in shared collections and how to bound it
  - Choosing a model from a compliance requirement rather than a preference

- **Enforcing tenant boundaries**
  - Query-level tenant filters and the cost of one missing predicate
  - Field-level access controls and per-tenant views
  - Preventing cross-tenant leakage in aggregation pipelines and `$lookup`
  - Testing isolation adversarially, not just functionally

- **Administrative isolation**
  - Who can read across tenants, and whether that is acceptable to the regulator
  - Encrypting per tenant with distinct data keys
  - Audit trails that attribute actions to a tenant as well as a user
  - Offboarding a tenant completely: data, keys, backups, and logs

- **Shared-cluster risk management**
  - Resource quotas and per-tenant connection budgets
  - Index proliferation and its cross-tenant performance impact
  - Schema evolution in shared collections without breaking neighbours
  - Incident containment when one tenant is compromised

### Module 10: Secure Operations and Incident Response (Week 10)

- **Operational security hygiene**
  - Patch and upgrade cadence for MongoDB and its drivers
  - Change management for security-relevant configuration
  - Backup encryption, restore testing, and access to restore capability
  - Least-privilege CI/CD identities that deploy without administering

- **Detection and triage**
  - Building a database security runbook with severity definitions
  - Evidence preservation: snapshots, audit extracts, and log integrity
  - Distinguishing application bugs from intrusion during triage
  - Communication paths between database, security, and legal teams

- **Containment and recovery**
  - Credential revocation and session termination under pressure
  - Isolating a compromised replica set member without data loss
  - Restoring from encrypted backups while preserving audit continuity
  - Post-incident key rotation when exposure cannot be ruled out

- **Post-incident engineering**
  - Root cause analysis focused on the control that failed
  - Converting findings into automated regression checks
  - Regulatory notification timelines and what evidence they require
  - Tabletop exercises against realistic MongoDB attack scenarios

### Module 11: Continuous Compliance Automation (Week 11)

- **Infrastructure and configuration as code**
  - Declaring security settings in Terraform, Atlas APIs, or Kubernetes operators
  - Preventing drift with reconciliation and periodic audits
  - Peer review requirements for security-relevant changes
  - Environment parity: dev must not be the only hardened environment

- **Automated control verification**
  - Scripted checks for authorization, TLS, auditing, and encryption state
  - Continuous assertion that no user holds `root` outside break-glass
  - Backup encryption verification on a schedule
  - Converting each control into a test that fails loudly

- **Evidence collection pipelines**
  - Scheduled exports of role inventories, audit summaries, and key rotation records
  - Timestamped, immutable storage for audit evidence
  - Mapping evidence artifacts to framework control identifiers
  - Auditor-friendly packages generated on demand rather than assembled under duress

- **Metrics and reporting**
  - Security posture dashboards: coverage of controls, open findings, mean time to remediate
  - Privilege and credential age as leading indicators
  - Reporting that engineering teams can act on
  - Review cadence with compliance and risk stakeholders

### Module 12: Capstone Project — Hardening and Auditing a MongoDB Platform (Week 12)

- **Project scope**
  - Take a deliberately weak MongoDB deployment and bring it to an auditable baseline
  - Choose the domain: a healthcare records service, a payments platform, or a multi-tenant SaaS
  - Deliverable: hardened deployment, control matrix, evidence pipeline, and audit defence

- **Required deliverables**
  - Threat model with data classification and prioritized risks
  - Authentication design covering internal auth and one external identity provider
  - Least-privilege role set per service, verified from the client side
  - TLS enforcement and network exposure documentation
  - Encryption at rest plus field-level encryption for classified fields
  - Audit configuration with filters, shipping, and at least three detection rules
  - Control matrix mapping every implemented control to GDPR, HIPAA, PCI DSS, or SOC 2
  - Automated evidence collection that regenerates the audit package on demand

- **Evaluation focus**
  - Whether privilege boundaries survive adversarial testing by a peer
  - Correctness of the control-to-framework mapping and its evidence
  - Operational realism: rotation, recovery, and incident runbooks that actually run
  - Absence of plaintext leakage into logs, backups, and telemetry
  - Quality of the audit defence under questioning

## Final Project

The final project is a full security and compliance hardening of a MongoDB platform, completed across the last three weeks of the course. Learners receive a weak deployment — authentication disabled, shared administrative credentials, unencrypted backups, no auditing, personal data indistinguishable from application logs — and must bring it to a defensible baseline without breaking the application that depends on it. The work covers a written threat model and data classification, an authentication and authorization redesign with per-service least-privilege roles, transport and network hardening, encryption at rest with governed keys plus field-level encryption for classified fields, an audit pipeline with detection rules, and a control matrix that maps each measure to a regulatory framework with the evidence an auditor would request. Learners then defend the design in a review where a peer plays the auditor, and must demonstrate that their evidence pipeline regenerates the complete audit package from scratch.

## Assessment Criteria

- **Assignments**: Eleven hands-on labs (Weeks 1-11) evaluated on correctness, adversarial verification of the control, and whether the control is automated rather than merely documented. Weekly quizzes cover privilege evaluation, encryption semantics, and framework mapping.
- **Final Project**: Evaluated on the completeness of the control matrix, survivability of privilege boundaries under peer attack, correctness of encryption and key governance, quality of audit evidence, and the clarity of the audit defence.
- **Participation**: Adversarial review of one peer's hardened deployment, with findings classified by severity and mapped to the control that failed.

## References

- MongoDB Documentation: Security — https://www.mongodb.com/docs/manual/security/
- MongoDB Documentation: Authentication — https://www.mongodb.com/docs/manual/core/authentication/
- MongoDB Documentation: Role-Based Access Control — https://www.mongodb.com/docs/manual/core/authorization/
- MongoDB Documentation: TLS/SSL Configuration — https://www.mongodb.com/docs/manual/tutorial/configure-ssl/
- MongoDB Documentation: Encryption at Rest — https://www.mongodb.com/docs/manual/core/security-encryption-at-rest/
- MongoDB Documentation: Client-Side Field Level Encryption — https://www.mongodb.com/docs/manual/core/csfle/
- MongoDB Documentation: Queryable Encryption — https://www.mongodb.com/docs/manual/core/queryable-encryption/
- MongoDB Documentation: Auditing — https://www.mongodb.com/docs/manual/core/auditing/
- MongoDB Documentation: Multi-Tenancy Best Practices — https://www.mongodb.com/docs/atlas/build-multi-tenant-application/
- OWASP: NoSQL Security and Injection Prevention — https://cheatsheetseries.owasp.org/cheatsheets/NoSQL_Security_Cheat_Sheet.html
- NIST SP 800-53 Security and Privacy Controls — https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- MongoDB University: Security Courses — https://learn.mongodb.com/
