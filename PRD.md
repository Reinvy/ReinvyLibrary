# Product Requirements Document (PRD) - ReinvyLibrary

## 1. Executive Summary

**ReinvyLibrary** is an open-source, curated collection of markdown-based educational materials created by Reinvy. It serves developers, educators, and self-learners by providing high-quality tutorials, syllabi, cheat sheets, and practical guides. This document outlines the strategic direction, current state, and future roadmap of the repository to ensure its growth, maintainability, and community involvement.

---

## 2. Vision and Goals

### Vision

To be the go-to, community-driven hub for accessible, well-structured, and high-quality programming and technology resources, available in both English and Indonesian, and optimized for automated agents (AI) and human developers.

### Goals

- **Accessibility:** Ensure content is easy to read, navigate, and understand for users of all skill levels.
- **Structure:** Provide logically organized syllabi and tutorials for progressive learning.
- **Community:** Build a collaborative environment where contributors can easily suggest, edit, and add valuable content.
- **Bilingual Support:** Maintain parity between English and Indonesian content to serve a wider audience.
- **Machine Readability:** Establish metadata schemas (YAML frontmatter) and structural verification scripts so Agentic AIs can autonomously consume and produce valid content.

---

## 3. Target Audience

1. **Developers (Beginner to Advanced):** Looking for quick cheat sheets, practical guides, or new languages/frameworks to learn.
2. **Educators:** Seeking structured course materials and syllabi to integrate into their teaching curriculums.
3. **Learners/Students:** Needing a clear, structured path from foundational concepts to advanced application in technology.
4. **Agentic AIs & Assistants:** Autonomous coding assistants needing standard blueprints to generate compatible educational materials.

---

## 4. Features & Content

### 4.1. Current Content Offerings

- **Tutorials:** Step-by-step guides on programming languages and tools.
- **Syllabi:** Comprehensive course outlines.
- **Guides:** Best practices and practical implementations.
- **Cheat Sheets:** Quick references for commands and syntax.

### 4.2. Core Refactoring (Completed)

To elevate the repository while aligning with its core purpose, we have implemented:
- **Topic-First Organization:** Reorganized flat folders into structured categories (e.g., `backend/express-js/tutorials/`).
- **YAML Frontmatter Metadata:** Mandated structured frontmatter for all markdown content files.
- **Content Templates:** Added formal templates for all 4 types in `.github/templates/`.
- **Automated Validation Script (`validate-content.js`):** Checks filenames, folder locations, and metadata whitelists.
- **GitHub Actions Workflow:** Verifies content formatting and metadata consistency on every pull request.
- **Dynamic Indexing:** Dynamic index generation in READMEs to prevent link breakages.

---

## 5. Success Metrics

- **Growth:** Increase in repository stars, forks, and clones.
- **Engagement:** Number of active contributors (human and AI) and merged Pull Requests.
- **Quality:** Decrease in outdated content reports (via Issues) and positive feedback from the community.
- **Compliance:** 100% build pass rate on automatic syntax and taxonomy verification.

---

## 6. Roadmap

- **Phase 1 (Completed):** Establish PRD, standardized READMEs, and directory layout. Reorganize and migrate all existing materials to the new Topic-First structure.
- **Phase 2 (Completed):** Implement content templates, YAML frontmatter schemas, automated Node.js validation scripts, and GitHub Actions PR workflow.
- **Phase 3 (Short-term):** Add new categories (e.g., Frontend, Database) and double the current bilingual tutorials coverage.
- **Phase 4 (Medium-term):** Introduce interactive/practice markdown files containing code challenges.
- **Phase 5 (Long-term):** Provide a static-site renderer (like Docusaurus) to serve these markdown files as a modern documentation website.

---

## 7. Maintenance & Governance

- **Review Process:** All Pull Requests will be reviewed by repository maintainers (Reinvy) for accuracy, formatting, and relevance. The PR check will automatically fail if the validation script or markdownlint fails.
- **Formatting Standard:** All documents must use standard Markdown, adhere to the established folder taxonomy, contain valid frontmatter, and be lint-free.
