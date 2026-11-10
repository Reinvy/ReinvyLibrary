---
title: "Kotlin Android Security Engineering Syllabus"
description: "A 10-week advanced curriculum for engineering secure Android apps in Kotlin — threat modeling against MASVS, Keystore-backed cryptography, transport and pinning strategy, OAuth with PKCE and biometric-bound sessions, Play Integrity and anti-tampering, component and IPC hardening, signing-key custody and supply-chain verification, privacy engineering, and a threat-driven security testing practice."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Kotlin Android Security Engineering Syllabus

## Overview

This 10-week advanced syllabus treats Android security as an engineering discipline that spans the whole product lifecycle, not as a checklist applied before release. Where the Android Security Hardening Cheatsheet supplies ready-to-paste snippets, this curriculum builds the reasoning that tells you which snippet is correct for a given threat: how to model what an attacker actually wants from your app, how keys are generated, protected, rotated, and destroyed, how sessions are bound to a device and a human, how the app proves its own integrity to a backend, and how the release pipeline keeps signing keys and dependencies trustworthy.

Each week pairs a threat model with a hands-on lab using production tooling — Android Keystore and StrongBox, Network Security Config, OkHttp, Custom Tabs with PKCE, BiometricPrompt with a crypto object, the Play Integrity API, R8, MobSF, Frida, and Gradle dependency verification. The course assumes learners already build Android apps with Kotlin and Compose fluently and are comfortable with coroutines, Gradle, and basic HTTP auth. It closes with a capstone security review of a real application: threat model, findings, remediations, and evidence that each remediation holds under attack.

## Curriculum

### Week 1: Threat Modeling and the Android Attack Surface

- **What security engineering means on mobile**: the attacker's position, why "the server is safe" is not a mobile threat model, and the difference between a vulnerability and a design flaw
- **Asset inventory and data classification**: identifying credentials, tokens, personal data, payment flows, and proprietary logic, then classifying each by sensitivity and blast radius
- **Threat modeling in practice**: STRIDE applied to an Android app, data-flow diagrams that include the device, the backend, and third-party SDKs, trust boundaries at the app sandbox edge
- **Reference standards**: OWASP MASVS categories (storage, crypto, auth, network, platform interaction, code quality, resilience, privacy) and how MASVS-L1/L2/R map to app risk tiers
- **Regulatory context**: GDPR and Indonesia's UU PDP obligations, data minimization, retention limits, and what "consent" must actually record
- **Practice**: Produce a one-page threat model for a sample banking-adjacent app — assets, entry points, trust boundaries, top five threats ranked by likelihood and impact, and the MASVS control each maps to

### Week 2: Cryptography and Data at Rest

- **Android Keystore fundamentals**: key generation inside the TEE or StrongBox, key aliases, purposes and padding, why exported key material defeats the point
- **Key hierarchy design**: a master key in the Keystore wrapping data-encryption keys, per-record keys, key versioning, and rotation without re-encrypting everything
- **Choosing primitives correctly**: AES-GCM with unique nonces, why ECB and static IVs are catastrophic, authenticated encryption versus separate MAC, and when to use HMAC for integrity only
- **Key access policies**: `setUserAuthenticationRequired`, auth validity duration, invalidation on biometric enrollment, and handling `KeyPermanentlyInvalidatedException`
- **Structured storage**: EncryptedSharedPreferences for small secrets, SQLCipher-backed Room for databases, streaming encryption for files, and the cost of decrypting large blobs on the main thread
- **Failure modes**: backup and device-transfer leakage, `allowBackup`, exported databases, logs that capture decrypted payloads, and crash reporters that upload memory
- **Practice**: Build a small Kotlin module that stores a refresh token and a local database behind a Keystore-wrapped DEK, then attack your own build by pulling the app's data directory from a rooted emulator

### Week 3: Transport Security and Pinning Strategy

- **TLS as a floor, not a feature**: TLS 1.2 minimum, cipher suites on modern Android, and why cleartext must be structurally impossible rather than conventionally avoided
- **Network Security Config**: `cleartextTrafficPermitted="false"`, per-domain pins, debug-overrides for local development, and trusting user CAs only in debug builds
- **Pinning mechanics**: certificate pinning versus public-key pinning, pin expiry and backup pins, the operational cost of pin rotation, and what happens when a pin set is wrong
- **Pinning implementations**: OkHttp `CertificatePinner`, network security config pins, and the trade-off between pinning depth and release agility
- **Server-side hardening that pairs with pinning**: short-lived tokens, mutual TLS for high-value APIs, integrity headers, and replay protection
- **Anti-patterns**: trusting all certificates in release, disabling hostname verification, pinning to a leaf certificate that rotates every 90 days, and shipping a pin you cannot rotate remotely
- **Practice**: Configure a Network Security Config with a backup pin and a debug override, verify with a proxy that a misconfigured build fails closed, and write the runbook for an emergency pin rotation

### Week 4: Authentication, Sessions, and Biometric Binding

- **OAuth 2.0 and OIDC on Android**: authorization code flow with PKCE, why the implicit flow is dead, Custom Tabs over embedded WebViews, and redirect URI verification with App Links
- **Token lifecycle**: access versus refresh tokens, storage boundaries, refresh rotation and reuse detection, revocation on logout, and multi-device session inventory
- **Biometric binding**: BiometricPrompt with a `CryptoObject`, binding a key to a successful authentication, and distinguishing convenience unlock from step-up authorization for sensitive actions
- **Step-up authentication**: re-authentication rules for payments, profile changes, and key export, and how to design them without destroying the experience
- **Session hygiene**: idle and absolute timeouts, background-to-foreground revalidation, screenshot and recents protection with `FLAG_SECURE`, and clipboard restrictions for secrets
- **Account recovery as an attack path**: SMS OTP weaknesses, SIM swap, device-change flows, and why recovery deserves the same rigor as login
- **Practice**: Implement PKCE login through Custom Tabs with a Keystore-protected refresh token, gate a payment confirmation behind a biometric-bound key, and demonstrate that a stolen token file cannot be replayed after logout

### Week 5: App Integrity, Anti-Tampering, and Resilience

- **What integrity attestation can and cannot prove**: the Play Integrity API verdicts, request nonces, server-side verification, and the limits of client-side trust
- **Signature verification**: reading the signing certificate at runtime, detecting repackaged builds, and the futility of pure client-side checks versus server-verified attestation
- **Root and emulator detection**: practical signals, false positives on custom ROMs, and treating detection as a risk signal that escalates server-side controls rather than a hard block
- **Obfuscation and shrinking**: R8 configuration that preserves reflection and serialization, class and resource renaming, removing debug logging in release, and verifying the shrinker did not break security-critical paths
- **Reverse-engineering resistance**: what Frida, objection, and static decompilation can recover from an unprotected build, and which defenses actually raise the cost
- **Fail-safe design**: degradation paths when attestation fails, graceful feature gating, and never leaking the specific reason a check failed
- **Practice**: Add Play Integrity verification to a login endpoint, run your release build through MobSF and a Frida hook script, document what an attacker recovered, and harden the highest-value finding

### Week 6: Components, IPC, and WebView Hardening

- **The exported component problem**: `android:exported` defaults, intent filters that silently expose activities, and a manifest audit routine
- **Deep links and App Links**: verified App Links with asset links, unverified custom schemes as an attack surface, parameter injection, and open-redirect chains
- **Content providers and file sharing**: `FileProvider` path configuration, grant flags, `ClipData` leakage, and avoiding `MODE_WORLD_READABLE`-style mistakes
- **Broadcasts and PendingIntents**: implicit broadcast exposure, mutable versus immutable `PendingIntent` flags, and intent redirection where a malicious app supplies the target
- **Task and activity hijacking**: task affinity, `singleTask` pitfalls, and defending sensitive screens against overlay and tapjacking
- **WebView security**: JavaScript bridge exposure, `addJavascriptInterface` risk, file access settings, origin checks before loading URLs, and safe rendering of untrusted HTML
- **Practice**: Audit a sample app's manifest and WebView usage, exploit one exported component from a second app, then fix it and prove the exploit no longer works

### Week 7: Secrets, Signing Keys, and Supply-Chain Integrity

- **Secret hygiene**: eliminating credentials from source and `BuildConfig`, environment injection in CI, and why obfuscation is not secret protection
- **Signing key custody**: upload key versus app signing key, Play App Signing, key storage in a hardware token or managed secret store, and the recovery plan for a lost key
- **CI/CD hardening**: scoped tokens, protected branches, reproducible release builds, artifact signing, and audit trails for who shipped what
- **Dependency trust**: Gradle dependency verification with checksums, dependency locking, repository content filtering, and reviewing transitive additions before they ship
- **Third-party SDK risk**: what analytics and ad SDKs actually collect, data-processing agreements, SDK removal plans, and detecting phantom network calls
- **SBOM and provenance**: generating a software bill of materials for an Android artifact, tracking native libraries, and responding when a transitive dependency is compromised
- **Practice**: Turn on Gradle dependency verification and locking for a real project, rotate a leaked key pattern out of history, and produce an SBOM for the release APK

### Week 8: Privacy Engineering and Data Minimization

- **Permissions as a data contract**: runtime permission flow, granular media permissions, approximate versus precise location, and the cost of over-asking
- **Identifiers and tracking**: advertising ID policy, resettability, alternatives to device fingerprints, and what analytics events quietly become personal data
- **Logging and telemetry hygiene**: structured logging with redaction, disabling verbose logs in release, scrubbing crash reports, and preventing PII in analytics properties
- **Screen and clipboard exposure**: `FLAG_SECURE`, recents thumbnail suppression, autofill and keyboard risks, clipboard access restrictions on modern Android
- **Backup and transfer**: `dataExtractionRules`, excluding sensitive data from cloud backup and device-to-device transfer, and testing the restore path
- **Data lifecycle**: retention enforcement, deletion on account closure, local cache expiry, and proving deletion to an auditor
- **Practice**: Classify every analytics event in a sample app, remove or pseudonymize the personal fields, and verify with a network capture that nothing sensitive leaves the device

### Week 9: Threat-Driven Security Testing

- **Static analysis in the build**: Android Lint security checks, `semgrep` rules for Kotlin and Gradle, detekt security rulesets, and failing the build rather than filing a ticket
- **Binary and manifest analysis**: MobSF scans, `apktool` decoding, `apkanalyzer`, and diffing a release build against a debug build to find leaked configuration
- **Dynamic analysis**: Frida instrumentation, objection scripts, proxy interception with mitmproxy, and why a pinning bypass on a rooted device does not mean the app is broken
- **Security invariants as tests**: instrumentation tests that assert cleartext is blocked, exported components are absent, and secrets are not in `BuildConfig`
- **Attack-driven test planning**: deriving test cases from the week 1 threat model, prioritizing by exploitability, and regression testing fixed findings
- **Bug bounty readiness**: scope definition, reproduction-quality reports, triage SLAs, and turning external findings into permanent tests
- **Practice**: Run a full static plus dynamic pass on a sample app, produce a findings register with severities and proofs of concept, and convert the top three findings into automated tests

### Week 10: Secure SDLC, Monitoring, and Incident Response

- **Security in the development workflow**: security champions, design review gates for auth and crypto changes, threat model updates as part of feature work
- **Release gates**: MASVS checklist sign-off, dependency and secret scans in CI, penetration test cadence, and what blocks a release versus what ships with a tracked risk
- **Runtime monitoring**: attestation failure telemetry, anomalous auth patterns, pinning failure alerts, and rate-limit signals that indicate automated abuse
- **Vulnerability response**: patch SLAs by severity, coordinating with the Play Store review timeline, forced-update mechanisms, and communicating risk to users
- **Incident response**: breach playbooks for a leaked signing key, a compromised SDK, and a stolen token database, including detection, containment, and disclosure obligations
- **Security culture**: post-incident reviews without blame, secure defaults in shared libraries, and keeping documentation of key ownership current
- **Practice**: Write a release security gate document and a breach playbook for the capstone app, then run a tabletop exercise against the signing-key compromise scenario

## Final Project

Learners choose a real Android application — their own, an open-source project, or a provided reference app — and perform a complete security engineering engagement. The deliverable is a security review package containing: a threat model with assets, trust boundaries, and ranked threats mapped to MASVS controls; a findings register with severity, proof of concept, and remediation for each issue; implemented fixes for the highest-risk findings across storage, transport, authentication, IPC, and integrity; evidence that each fix holds (a capture, a test, or a failing exploit that now fails differently); and a secure software development checklist adopted by the team, including dependency verification, secret scanning, release gates, and a breach playbook.

The engagement must be threat-driven rather than tool-driven: every finding traces back to a modeled threat, and every remediation states which threat it reduces and what residual risk remains. Learners present the review as they would to an engineering lead, defending severity calls, quantifying the cost of each fix against the risk it removes, and identifying at least one risk they consciously accepted with a documented rationale.

## Assessment Criteria

- **Assignments**: Weekly labs are graded on whether the threat was demonstrated concretely, whether the remediation actually addresses the root cause rather than the symptom, and whether the evidence proves the fix (a capture, a passing test, or a failed exploit attempt). Quizzes cover Keystore key policy semantics, pinning and rotation trade-offs, PKCE flow correctness, attestation verification, and manifest export rules.
- **Final Project**: Evaluated on the rigor of the threat model, the accuracy of severity ratings, the completeness of remediation across at least four MASVS categories, the quality of the evidence package, and the realism of the release gates and incident playbook. Findings without reproducible proof, or fixes that only work on a rooted test device, are penalized.
- **Professional judgment**: Credit is given for correctly identifying what the platform cannot protect against, for refusing client-side trust where server verification is required, and for documenting accepted risks explicitly rather than silently.

## References

- [OWASP Mobile Application Security Verification Standard](https://mas.owasp.org/MASVS/)
- [OWASP Mobile Application Security Testing Guide](https://mas.owasp.org/MASTG/)
- [Android security best practices](https://developer.android.com/privacy-and-security/security-best-practices)
- [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)
- [Network Security Configuration](https://developer.android.com/privacy-and-security/security-config)
- [Biometric authentication guidance](https://developer.android.com/identity/sign-in/biometric-auth)
- [Play Integrity API](https://developer.android.com/google/play/integrity)
- [App Links verification](https://developer.android.com/training/app-links/verify-android-applinks)
- [R8 shrinking and obfuscation](https://developer.android.com/build/shrink-code)
- [Gradle dependency verification](https://docs.gradle.org/current/userguide/dependency_verification.html)
- [Android privacy best practices](https://developer.android.com/privacy-and-security/privacy-best-practices)
- [OWASP Mobile Security Testing Guide tools](https://mas.owasp.org/MASTG/Tools/)
