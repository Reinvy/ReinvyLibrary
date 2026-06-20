# Contributing to ReinvyLibrary

First off, thank you for considering contributing to **ReinvyLibrary**! This project is a curated, community-driven collection of educational tech materials.

This repository is designed to be highly structured and machine-readable, making it easy for both **human developers** and **Agentic AIs** to read, generate, and maintain content.

---

## Code of Conduct

By participating in this project, you are expected to uphold a respectful, collaborative, and constructive standard of communication.

---

## Contribution Workflow

1. **Fork the repository** to your own GitHub account.
2. **Create a new branch** (`git checkout -b feature/your-new-content`).
3. **Add your files** matching the directory, naming, and formatting standards below.
4. **Validate your changes** locally:
   ```bash
   npm install
   npm run validate
   npm run lint
   ```
5. **Commit your changes** with a clear description (`git commit -m 'feat: add docker tutorial'`).
6. **Push to the branch** (`git push origin feature/your-new-content`).
7. **Open a Pull Request** using the provided PR template.

---

## Repository Taxonomy

Files must be organized using **Topic-First Organization**. The directory layout is structured as follows:

```plaintext
<category>/<technology>/<plural-content-type>/
```

### Whitelisted Categories and Technologies

Only the following values are allowed in directory paths and YAML frontmatter:

- **Categories**: `backend`, `frontend`, `mobile`, `devops`, `database`
- **Technologies**: `expressjs`, `elysiajs`, `nextjs`, `react-native`, `flutter`, `golang`, `laravel`, `docker`, `pm2`, `redis`, `mongodb`, `postgres`, `swift`, `kotlin`, `kubernetes`, `nestjs`, `vuejs`, `github-actions`

### Plural Content Types
- `tutorials` (for step-by-step programming materials)
- `syllabi` (for curriculum outlines)
- `cheatsheets` (for quick syntax references)
- `guides` (for architectural and best practice guidelines)

*Example Target Path*: `backend/expressjs/tutorials/api-versioning-strategies.md`

---

## File Naming Convention

Filenames must adhere strictly to the following rules:

1. Use **kebab-case** only (lowercase letters, numbers, and hyphens; no spaces).
2. Base English files end with `.md` (e.g., `rate-limiting-techniques.md`).
3. Indonesian translations end with `_id.md` (e.g., `rate-limiting-techniques_id.md`).
4. Keep filenames consistent between the English base and its Indonesian translation.

---

## YAML Frontmatter Specification

Every content markdown file must start with a YAML frontmatter block containing the following fields:

```yaml
---
title: "The Title of the Material"
description: "A short 1-2 sentence description of the content for index tables"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---
```

### Fields Description
- **title**: The title of the lesson (string).
- **description**: A concise summary (string, max 160 chars).
- **category**: Must match one of the allowed categories.
- **technology**: Must match one of the allowed technologies.
- **difficulty**: Must be either `beginner`, `intermediate`, or `advanced`.
- **type**: Must be either `tutorial`, `syllabus`, `cheatsheet`, or `guide`.
- **locale**: Must be `en` for English files, or `id` for Indonesian files.

---

## Content Templates

You can use the templates defined in the `.github/templates/` directory as blueprints:

- [Tutorial Template](.github/templates/tutorial-template.md) / [Tutorial Template (ID)](.github/templates/tutorial-template_id.md)
- [Syllabus Template](.github/templates/syllabus-template.md) / [Syllabus Template (ID)](.github/templates/syllabus-template_id.md)
- [Cheat Sheet Template](.github/templates/cheatsheet-template.md) / [Cheat Sheet Template (ID)](.github/templates/cheatsheet-template_id.md)
- [Guide Template](.github/templates/guide-template.md) / [Guide Template (ID)](.github/templates/guide-template_id.md)

---

## Instructions for Agentic AIs

If you are an **Agentic AI** or **coding assistant** hired to generate content for this repository:

1. **Read the Schema**: Read the rules above and the whitelisted categories/technologies.
2. **Retrieve Templates**: Load the appropriate template from `.github/templates/` based on the requested file type and language.
3. **Format Frontmatter**: Inject correct and complete YAML frontmatter at the top of the file. Ensure `locale` matches the file suffix (`_id.md` -> `id`, `.md` -> `en`).
4. **Standardize Headings**: Ensure header languages match the locale (e.g. use English headings like `## Summary` for `en`, and Indonesian headings like `## Ringkasan Singkat` for `id`).
5. **Run Verification**: After generating a file, always run `npm run validate` and `npm run lint` in the workspace to audit your work and fix any violations.
