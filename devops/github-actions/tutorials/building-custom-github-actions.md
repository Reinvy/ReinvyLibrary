---
title: "Building Custom GitHub Actions"
description: "A comprehensive tutorial on creating reusable GitHub Actions using composite, JavaScript, and Docker container approaches, with testing and publishing workflows."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building Custom GitHub Actions

## Summary

GitHub Actions workflows become exponentially more powerful when you create your own reusable actions. This tutorial teaches you how to build, test, and publish custom GitHub Actions in three flavors: composite actions that orchestrate multiple steps, JavaScript actions backed by Node.js, and Docker container actions for consistent runtime environments. You will end with a complete custom action published to the GitHub Marketplace.

## Target Audience

- DevOps engineers and developers who regularly write GitHub Actions workflows and want to create reusable components.
- Intermediate level — familiarity with GitHub Actions workflow syntax (jobs, steps, triggers) is assumed.
- Prior experience with shell scripting, Node.js, or Docker is helpful depending on which action type you build.

## Prerequisites

- A GitHub account and a repository with GitHub Actions enabled.
- Basic understanding of GitHub Actions workflows (jobs, steps, `on` triggers).
- For JavaScript actions: Node.js 16+ and npm installed locally.
- For Docker container actions: Docker Desktop or Docker Engine installed locally.
- For composite actions: comfortable with shell scripting and YAML.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Understand the three types of custom GitHub Actions and when to use each.
- Create a composite action that wraps multiple workflow steps into a single reusable unit.
- Build a JavaScript action with Node.js using the `@actions/core` toolkit.
- Package a Docker container action for language-agnostic, reproducible execution.
- Handle inputs, outputs, and errors properly in all action types.
- Test custom actions locally with `act` (the GitHub Actions runner emulator).
- Version and publish an action to the GitHub Marketplace.

## Context and Motivation

### Why Build Custom Actions?

Out-of-the-box actions from the Marketplace cover common tasks (checkout, setup-node, cache), but your project inevitably develops unique automation patterns. Instead of copy-pasting the same five-step sequence across dozens of workflows, you extract it into a reusable action. Benefits include:

- **DRY workflows**: A single `uses:` line replaces a repetitive block of steps.
- **Encapsulation**: Complex logic, error handling, and edge cases live in one maintained place.
- **Versioning**: Consumers pin to `@v1`, `@v2`, and you ship upgrades independently.
- **Community sharing**: Public actions benefit the entire GitHub ecosystem.

### Action Types Overview

| Type | Runtime | Best For |
|------|---------|----------|
| **Composite** | Shell commands + GitHub Actions steps | Wrapping multi-step sequences, installing tools, conditional orchestration |
| **JavaScript** | Node.js (runner-hosted) | Logic-heavy actions: API calls, file processing, complex conditionals |
| **Docker Container** | Custom Docker image | Language-agnostic execution, reproducible environment, tools unavailable on the runner |

## Core Content

### 1. Anatomy of a Custom Action

Every GitHub Action is defined by an `action.yml` file (or `action.yaml`) in the root of its repository (or a subdirectory). The metadata file declares:

```yaml
name: 'My Action'
description: 'What this action does'
author: 'Your Name'
branding:
  icon: 'activity'
  color: 'blue'
inputs:
  my-input:
    description: 'An input parameter'
    required: true
    default: 'default-value'
outputs:
  my-output:
    description: 'An output value'
runs:
  using: 'composite'  # or 'node20' or 'docker'
  # ... type-specific configuration
```

All three action types share this top-level structure. The `runs` block differentiates them.

### 2. Composite Actions

Composite actions let you combine multiple `run` steps and other actions into a single reusable unit. They are the simplest type to create and require no build tooling.

#### Composite Action Directory Structure

```text
my-composite-action/
├── action.yml
└── README.md
```

#### Example: A Composite Action for Linting

Create `action.yml`:

```yaml
name: 'Lint and Format Checker'
description: 'Runs ESLint and Prettier checks on a Node.js project'
author: 'Your Org'
branding:
  icon: 'check-circle'
  color: 'green'
inputs:
  working-directory:
    description: 'Directory containing the project'
    required: false
    default: '.'
runs:
  using: 'composite'
  steps:
    - name: Install Dependencies
      shell: bash
      run: |
        cd ${{ inputs.working-directory }}
        npm ci

    - name: Run ESLint
      shell: bash
      run: |
        cd ${{ inputs.working-directory }}
        npx eslint .

    - name: Run Prettier Check
      shell: bash
      run: |
        cd ${{ inputs.working-directory }}
        npx prettier --check .
```

Use it in a workflow:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: ./.github/actions/lint-checker
        with:
          working-directory: './packages/web-app'
```

#### Composite Action Best Practices

- **Always specify `shell:`** — composite steps default to no shell, so omit it only for `uses:` steps.
- **Pass inputs explicitly** — composite actions do not implicitly inherit workflow-level inputs.
- **Use `${{ inputs.* }}`** — composite actions reference inputs differently than JavaScript/Docker actions.
- **Keep steps focused** — each step should have a single responsibility.

### 3. JavaScript Actions

JavaScript actions run as Node.js scripts on the hosted runner. They have access to the `@actions/core` and `@actions/github` packages for interacting with the workflow context.

#### JavaScript Action Directory Structure

```text
my-js-action/
├── action.yml
├── package.json
├── index.js
└── README.md
```

#### Setup

Initialize a Node.js project and install the toolkit:

```bash
npm init -y
npm install @actions/core @actions/github
```

#### Example: A Label Sorter Action

`action.yml`:

```yaml
name: 'Issue Label Sorter'
description: 'Validates and sorts issue labels against a predefined list'
author: 'Your Org'
branding:
  icon: 'tag'
  color: 'blue'
inputs:
  github-token:
    description: 'GitHub token for API access'
    required: true
  allowed-labels:
    description: 'Comma-separated list of allowed labels'
    required: false
    default: 'bug,enhancement,documentation,question'
outputs:
  valid:
    description: 'Whether all labels are valid (true/false)'
runs:
  using: 'node20'
  main: 'index.js'
```

`index.js`:

```javascript
const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const allowedRaw = core.getInput('allowed-labels');
    const token = core.getInput('github-token');
    const allowed = allowedRaw.split(',').map(l => l.trim().toLowerCase());

    const context = github.context;
    const octokit = github.getOctokit(token);

    // Get labels from the issue or PR
    const labels = context.payload.issue?.labels
      || context.payload.pull_request?.labels
      || [];

    if (labels.length === 0) {
      core.setOutput('valid', 'true');
      core.info('No labels to validate — skipping.');
      return;
    }

    const invalidLabels = labels.filter(
      l => !allowed.includes(l.name.toLowerCase())
    );

    if (invalidLabels.length > 0) {
      core.setFailed(
        `Invalid labels found: ${invalidLabels.map(l => l.name).join(', ')}`
      );
      core.setOutput('valid', 'false');
      return;
    }

    core.setOutput('valid', 'true');
    core.info('All labels are valid.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```

#### Inputs, Outputs, and Core Utilities

The `@actions/core` package provides essential functions:

```javascript
const core = require('@actions/core');

// Reading inputs
const name = core.getInput('name', { required: true });
const config = core.getInput('config-file');
const debugMode = core.getBooleanInput('debug');

// Setting outputs
core.setOutput('report-path', '/tmp/report.json');
core.setOutput('summary', 'Build completed successfully.');

// Logging with levels
core.debug('Detailed debug information');
core.info('Normal informational message');
core.warning('Warning message', { title: 'Deprecation' });
core.error('Error message');

// Failing the action
core.setFailed('Build failed: tests did not pass');

// Grouping log lines
core.startGroup('Install Dependencies');
console.log('npm install output...');
core.endGroup();

// Exporting variables for subsequent steps
core.exportVariable('MY_VAR', 'value');
core.setSecret('my-secret-value');  // Masks in logs
```

#### Accessing GitHub Context

The `@actions/github` package gives you the full event payload:

```javascript
const github = require('@actions/github');

// Current context
console.log(github.context.action);       // e.g., 'opened'
console.log(github.context.eventName);    // e.g., 'issues'
console.log(github.context.sha);          // commit SHA
console.log(github.context.ref);          // 'refs/heads/main'
console.log(github.context.actor);        // username of the triggering user

// Octokit client (authenticated)
const octokit = github.getOctokit(token);
const { data: issue } = await octokit.rest.issues.get({
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  issue_number: 42
});
```

### 4. Docker Container Actions

Docker container actions run inside a custom Docker image. Use them when your action needs specific system dependencies, a particular language runtime, or must behave identically on any runner OS.

#### Docker Action Directory Structure

```text
my-docker-action/
├── action.yml
├── Dockerfile
├── entrypoint.sh
└── README.md
```

#### Example: A Terraform Lint Action

`Dockerfile`:

```dockerfile
FROM alpine:3.19

RUN apk add --no-cache terraform-doc

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

`entrypoint.sh`:

```bash
#!/bin/sh
set -e

# Validate required input
if [ -z "$INPUT_DIRECTORY" ]; then
  echo "Error: directory input is required"
  exit 1
fi

cd "$INPUT_DIRECTORY"

echo "Running terraform fmt check..."
terraform fmt -check -recursive .
echo "Terraform formatting check passed."
```

`action.yml`:

```yaml
name: 'Terraform Format Checker'
description: 'Checks Terraform file formatting using a consistent Alpine runtime'
author: 'Your Org'
branding:
  icon: 'terminal'
  color: 'purple'
inputs:
  directory:
    description: 'Directory containing Terraform files'
    required: true
    default: '.'
runs:
  using: 'docker'
  image: 'Dockerfile'
  env:
    INPUT_DIRECTORY: ${{ inputs.directory }}
```

#### Docker Action Architecture

| Component | Purpose |
|-----------|---------|
| `Dockerfile` | Defines the environment. Pin base image versions for reproducibility. |
| `entrypoint.sh` | The script that runs when the container starts. Must handle inputs via environment variables. |
| `action.yml` `image:` field | Can reference `Dockerfile` (local build), a registry URL, or a Docker Hub image. |

**Key differences from composite and JavaScript actions:**

- Inputs are passed as **environment variables** prefixed with `INPUT_` (e.g., `directory` becomes `INPUT_DIRECTORY`).
- The entrypoint must handle `INPUT_` variable expansion — it is not automatic.
- Container actions run on Linux runners only (macOS and Windows runners cannot execute Docker containers).

### 5. Testing Custom Actions Locally

The `act` tool runs GitHub Actions workflows locally using Docker:

```bash
# Install act
curl -fsSL https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Test a workflow that uses your custom action
act -j lint --reuse

# With a specific event payload
act issue_opened -e .github/issue-event.json

# Using a specific GitHub token (token is often required for API access)
act -s GITHUB_TOKEN="ghp_xxxx"
```

For JavaScript actions specifically, you can also write unit tests:

```bash
npm install --save-dev jest
```

```javascript
// index.test.js
const core = require('@actions/core');

jest.mock('@actions/core');
jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'test', repo: 'test' },
    payload: { issue: { labels: [{ name: 'bug' }] } }
  },
  getOctokit: jest.fn()
}));

describe('Label Sorter Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes when labels are valid', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'allowed-labels') return 'bug,enhancement,docs';
      if (name === 'github-token') return 'fake-token';
    });

    await require('./index');

    expect(core.setOutput).toHaveBeenCalledWith('valid', 'true');
  });

  it('fails when labels are invalid', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'allowed-labels') return 'bug,enhancement';
      if (name === 'github-token') return 'fake-token';
    });

    await require('./index');

    expect(core.setFailed).toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('valid', 'false');
  });
});
```

### 6. Versioning and Publishing

#### Semantic Versioning with Tags

GitHub Actions recognizes three tag formats for version pinning:

```bash
# Create a release
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0

# Update the major version tag to point to this release
git tag -f v1 v1.0.0
git push origin v1 --force
```

Users pin to `@v1` to receive patch updates automatically while avoiding breaking changes.

#### Publishing to GitHub Marketplace

1. Ensure your action has a `README.md` with clear documentation.
2. Go to your repository's **Releases** page and create a new release.
3. GitHub automatically detects `action.yml` and offers to **Publish this Action to the Marketplace**.
4. Add a `LICENSE` file (MIT, Apache-2.0, etc.) — the Marketplace requires one.

**Best practices for Marketplace actions:**

- Include a `README.md` with usage examples, input/output tables, and a workflow snippet.
- Set `branding.icon` and `branding.color` in `action.yml` for Marketplace display.
- Follow semantic versioning rigorously.
- Test across multiple runner OSes if applicable.

## Code Examples

### Complete Composite Action: Setup and Cache Tool

`action.yml`:

```yaml
name: 'Setup and Cache Tool'
description: 'Installs a CLI tool and caches it across workflow runs'
author: 'Your Org'
branding:
  icon: 'package'
  color: 'orange'
inputs:
  tool-name:
    description: 'Name of the tool to install'
    required: true
  install-script:
    description: 'Shell command to install the tool'
    required: true
  cache-path:
    description: 'Path to cache (typically the install directory)'
    required: true
runs:
  using: 'composite'
  steps:
    - name: Restore Cached Tool
      id: cache
      uses: actions/cache@v4
      with:
        path: ${{ inputs.cache-path }}
        key: ${{ runner.os }}-${{ inputs.tool-name }}-${{ hashFiles('**/lockfiles') }}

    - name: Install Tool
      if: steps.cache.outputs.cache-hit != 'true'
      shell: bash
      run: ${{ inputs.install-script }}

    - name: Verify Installation
      shell: bash
      run: ${{ inputs.tool-name }} --version
```

### Complete JavaScript Action: PR Commenter

`action.yml`:

```yaml
name: 'PR Commenter'
description: 'Posts a formatted comment on pull requests with build summary information'
author: 'Your Org'
branding:
  icon: 'message-square'
  color: 'gray'
inputs:
  github-token:
    description: 'GitHub token'
    required: true
  message:
    description: 'Message to post as a comment'
    required: true
runs:
  using: 'node20'
  main: 'index.js'
```

`index.js`:

```javascript
const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const message = core.getInput('message');
    const token = core.getInput('github-token');
    const octokit = github.getOctokit(token);
    const context = github.context;

    if (!context.payload.pull_request) {
      core.warning('Not a pull request event — skipping comment.');
      return;
    }

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body: `## Build Summary\n\n${message}\n\n---\n*Posted by PR Commenter action*`
    });

    core.info('Comment posted successfully.');
  } catch (error) {
    core.setFailed(`Failed to post comment: ${error.message}`);
  }
}

run();
```

## Key Insights

- **Composite actions are the simplest to create and maintain** — use them as your default. Only reach for JavaScript or Docker when you need conditionals, loops, or specific runtime dependencies.
- **Always pin action versions with major tags** — users pin `@v1` for stability. Use `git tag -f v1 v1.0.1` to push patch updates without breaking consumers.
- **Handle inputs explicitly** — JavaScript actions use `core.getInput()`, composite actions use `${{ inputs.* }}`, and Docker actions read `INPUT_*` environment variables. Do not mix patterns.
- **Test locally before pushing** — `act` catches shell quoting errors, missing inputs, and permission issues that would otherwise waste CI minutes in a debugging loop.
- **Docker actions are Linux-only** — the GitHub Actions Docker executor is only supported on `ubuntu-*` runners. If your consumers use macOS or Windows runners, use composite or JavaScript actions instead.
- **Keep `action.yml` self-documenting** — thorough `description` fields and explicit `required` flags make your action easier for others (and future you) to use correctly.

## Next Steps

- Learn advanced workflow orchestration patterns in the [GitHub Actions CI/CD Best Practices Guide](../guides/github-actions-cicd-best-practices-guide.md).
- Explore reusable workflows for calling entire workflow files from other repositories.
- Try the [12-week GitHub Actions DevOps Syllabus](../syllabi/github-actions-devops-syllabus.md) for a structured learning path.
- Browse the [workflow structure quick reference](../cheatsheets/github-actions-cheatsheet.md) for syntax reminders.

## Conclusion

Custom GitHub Actions transform your CI/CD workflows from repetitive copy-paste into modular, versioned, and shareable automation components. You now know how to build all three action types — composite, JavaScript, and Docker container — and how to test, version, and publish them. Start by identifying a pattern in your own workflows that repeats across multiple repositories, extract it into a composite action, and iterate from there.
