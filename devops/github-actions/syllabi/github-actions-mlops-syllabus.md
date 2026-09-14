---
title: "GitHub Actions MLOps Syllabus"
description: "A comprehensive 12-week advanced curriculum for ML engineers and DevOps practitioners covering the full machine learning lifecycle orchestrated with GitHub Actions: CI for ML code and data validation, dataset versioning with DVC and artifact pipelines, GPU-enabled training pipelines with matrix sweeps, experiment tracking with MLflow and Weights & Biases, model registries and staged promotion, offline evaluation and regression gates, batch and online model deployment with canary releases, drift monitoring and automated retraining, feature pipelines and feature stores, and security, governance, and compliance for ML workflows."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# GitHub Actions MLOps Syllabus

## Overview

This 12-week advanced syllabus teaches ML engineers, data scientists, and DevOps practitioners how to operate the complete machine learning lifecycle on GitHub Actions. The course treats Actions as an orchestration and control plane for MLOps: a single, event-driven platform where data pipelines, training jobs, experiment tracking, model registries, deployment, and monitoring all run as auditable, reproducible workflows. Learners move beyond the classic "notebook to production" gap and build the automation layer that makes model delivery fast, repeatable, and safe.

The curriculum assumes working knowledge of Python, git, and basic GitHub Actions usage. Each week pairs technical foundations with hands-on labs in a real repository: validating data in CI, versioning datasets with DVC, sweeping hyperparameters on self-hosted GPU runners, recording runs to MLflow, gating merges on offline evaluation, deploying models with canary strategies, and closing the loop with drift-triggered automated retraining. The course culminates in a capstone project: a complete MLOps platform, from raw data ingestion to monitored production inference, built entirely on GitHub Actions.

By the end of this course, learners will be able to design reproducible training pipelines, enforce model quality gates in CI, integrate experiment tracking and model registries, deploy batch and online serving workloads safely, monitor models in production, and automate retraining — all expressed as versioned workflows that any team member can review, audit, and rerun.

## Curriculum

### Week 1: MLOps Fundamentals and the Actions Orchestration Layer

- **What MLOps is and why it exists**
  - The model lifecycle: data → training → evaluation → deployment → monitoring → retraining
  - The four pillars: reproducibility, CI/CD, governance, and observability
  - Common failure modes: notebook drift, manual retraining, unmonitored degradation
- **GitHub Actions as an MLOps control plane**
  - Event-driven triggers that map to lifecycle events: push, pull_request, schedule, workflow_dispatch
  - Matrix jobs for parallel sweeps, artifacts for model transfer, caches for datasets and dependencies
  - Environments with protection rules as model promotion gates
  - Reusable workflows as a golden-pipeline library for ML teams
- **Repository layout for ML projects**
  - Monorepo pattern: `data/`, `features/`, `models/`, `training/`, `deploy/`, `.github/workflows/`
  - Splitting experiment code from production pipeline code
  - CODEOWNERS to require review of workflow and model changes
- **Hands-on Lab**: Scaffold an ML monorepo with workflow skeletons for CI, training, and deployment

### Week 2: CI for Machine Learning Code

- **Static analysis and code quality gates**
  - Linting and formatting with ruff and black; type checking with mypy and pyright
  - Enforcing style on Python, notebooks, and SQL feature definitions
  - Pre-commit hooks executed in CI for consistent local and remote checks
- **Unit testing model code**
  - Testing data transforms, feature builders, and preprocessing as pure functions
  - Testing model wrappers with synthetic fixtures and golden outputs
  - Coverage thresholds and failure-first design
- **Notebook CI**
  - Notebook linting with nbqa, execution with papermill, and diff review strategies
  - Converting notebooks to scripts for production paths
- **Data validation in CI**
  - Schema checks with pandera and Great Expectations
  - Constraint suites: ranges, cardinality, missing-value rates, distribution checks
- **Dependency management and caching**
  - Lockfiles with uv, poetry, or pip-tools; caching dependency trees across runs
  - Vulnerability scanning of Python packages in every push
- **Hands-on Lab**: Build a CI workflow that runs lint, type checks, unit tests, and a Great Expectations suite, failing the build on any violation

### Week 3: Data Versioning and Artifact Pipelines

- **Dataset versioning strategies**
  - DVC pipelines with `.dvc` pointers, hash-based caching, and remote storage
  - lakeFS for branching large datasets; Hugging Face datasets for public corpora; Git LFS for small assets
  - Tracking provenance: dataset version → commit SHA → workflow run
- **Artifacts, caches, and object storage**
  - When GitHub artifacts fit (small outputs) vs when to use S3, GCS, or Azure Blob (large datasets)
  - Cache warm-up jobs to keep training data hot across runs
  - Retention policies and storage cost control
- **Scheduled data pipelines**
  - Cron-driven ingestion workflows that pull new data and refresh versioned snapshots
  - Conditional triggers: only retrain when the data hash changes
- **Lineage and reproducibility**
  - Manifests recording input hashes, code version, and parameters for every run
  - Reproducing any historical run from its manifest
- **Hands-on Lab**: Implement a DVC pipeline in Actions that downloads raw data, validates it, and pushes versioned snapshots to S3 with cache restore

### Week 4: Training Pipelines on CI Runners

- **GitHub-hosted vs self-hosted runners for training**
  - Hosted runner limits: CPU-only, memory caps, 6-hour job timeout
  - Choosing self-hosted runners for GPU workloads: custom labels, dedicated capacity
  - Autoscaling runner fleets with ephemeral instances and spot pricing
- **Hyperparameter sweeps with matrix strategies**
  - Encoding parameter grids as matrix dimensions
  - Parallel job execution, concurrency limits, and cost-aware sweep sizing
  - Collecting per-run artifacts for comparison
- **Distributed training**
  - Launching torchrun, Horovod, or Ray Train jobs from Actions
  - Multi-job coordination: training shards as fan-out jobs, aggregation as fan-in
  - Synchronizing results through artifacts or shared object storage
- **Reliability and cost controls**
  - Timeouts, retries, and failure notification
  - Concurrency groups with `cancel-in-progress` to stop stale training runs
  - Budgets: capping sweep size, using spot instances, scheduling training off-peak
- **Hands-on Lab**: Run a matrix-based hyperparameter sweep on self-hosted GPU runners and aggregate results into a comparison artifact

### Week 5: Experiment Tracking Integration

- **Tracking platforms and workflow integration**
  - MLflow Tracking, Weights & Biases, Neptune, and Comet from CI
  - Injecting context: run ID, commit SHA, branch, and parameters as tags
  - Auto-logging frameworks and explicit metric logging
- **From CI runs to comparable experiments**
  - Naming and tagging conventions so every CI training run is a first-class experiment
  - Comparing sweep results by metric; selecting champions by threshold
  - Model selection automation: writing the best run id to an artifact for downstream steps
- **Reporting back to the developer loop**
  - Posting metric tables and comparison charts as pull request comments
  - Slack or email notifications on training completion and regressions
- **Hands-on Lab**: Track a sweep to MLflow and post the top three runs as a formatted table in the pull request comment

### Week 6: Model Registry and Version Management

- **Registry architectures**
  - MLflow Model Registry: versions, stages, and transitions
  - OCI registries (GHCR, ECR, ACR) for serving-ready model images
  - Serialization formats: pickle, ONNX, and framework-native formats
- **Provenance and auditability**
  - Linking every registered version to its commit SHA, workflow run, and data manifest
  - Model cards: intended use, training data, metrics, limitations, and fairness notes
- **Promotion workflows**
  - Environments with required reviewers as approval gates (staging → production)
  - Staging new versions, running smoke tests, and promoting on green
  - Automated rollback to the previous champion version
- **Hands-on Lab**: Register the best sweep run to the registry and promote it through a staging environment with reviewer approval

### Week 7: Model Evaluation and Testing

- **Offline evaluation**
  - Evaluation against golden test sets and holdout data
  - Regression testing: comparing new candidates against the current champion
  - Metric suites: accuracy, precision/recall, calibration, latency-cost proxies
- **Quality gates in CI**
  - Blocking merges when evaluation metrics degrade beyond thresholds
  - Commenting evaluation reports on pull requests
  - Failure-first: requiring tests and evals to pass before training promotion
- **Drift and robustness pre-checks**
  - Data drift detection on incoming data before retraining
  - Adversarial, edge-case, and out-of-distribution test sets
  - Bias and fairness evaluation on protected attributes
  - Security checks for ML models: evasion and prompt-injection probes for LLMs
- **Hands-on Lab**: Create an evaluation workflow that blocks a pull request when offline metrics regress and posts a human-readable report

### Week 8: Model Deployment: Batch and Online Serving

- **Batch inference pipelines**
  - Scheduled scoring workflows over new data partitions
  - Parallel batch jobs with matrix or fan-out patterns; writing scored outputs to storage
- **Online serving**
  - Building serving images with FastAPI, Triton, TensorFlow Serving, or TorchServe
  - Publishing images to GHCR and deploying to cloud targets (SageMaker, Vertex AI, AKS, Lambda)
  - Deploying infrastructure as code from Actions: Terraform, Bicep, or CDK invocation
- **Safe release strategies**
  - Blue/green deployment with traffic switching
  - Canary releases with incremental traffic and automated rollback on error-rate spikes
  - Environment protection rules for production deploy approvals
- **Hands-on Lab**: Deploy a FastAPI model image with a canary strategy and an automated rollback trigger

### Week 9: Model Monitoring and Automated Retraining

- **Monitoring signals**
  - Data drift, concept drift, and prediction drift
  - Tools: Evidently, whylogs, and Prometheus metrics from serving endpoints
  - Dashboards and alert routing to Slack or PagerDuty
- **Scheduled monitoring workflows**
  - Cron jobs that compute drift statistics and compare them to thresholds
  - Alerting on threshold breaches with runnable links to retraining workflows
- **The automated retraining loop**
  - Drift alert → retraining workflow → offline evaluation → promotion PR
  - Human-in-the-loop approval for auto-promoted models
  - Feedback pipelines collecting production predictions and labels for the next training set
- **Hands-on Lab**: Wire a drift alert to an automated retraining workflow that produces a model PR for reviewer approval

### Week 10: Feature Pipelines and Feature Stores

- **Feature engineering as pipelines**
  - Scheduled batch jobs that transform raw data into feature values
  - Backfilling historical features with point-in-time correctness
- **Feature stores**
  - Feast, Tecton, and cloud feature stores: offline/materialized and online serving views
  - Online/offline consistency and training-serving skew prevention
- **Feature validation and versioning**
  - CI checks on new feature definitions: schema, null rates, and distribution shifts
  - Versioning features and the training datasets built from them
- **Hands-on Lab**: Build a scheduled feature pipeline that updates a Feast feature store and validates the new features in CI

### Week 11: Security, Governance, and Compliance for ML Workflows

- **Secrets and cloud access**
  - OIDC federation for short-lived cloud credentials instead of long-lived keys
  - Scoping permissions: minimal trust policies for training, S3, and registry access
  - Secret scanning and required reviewers for workflow changes
- **Data privacy and access control**
  - PII redaction in pipelines, artifact access control, and private dataset repositories
  - Data retention and deletion policies as automated jobs
- **Model governance**
  - Registries and model cards as the audit trail for every promoted model
  - Approval chains for staging and production transitions
  - Compliance reporting from workflow run logs and retention settings
- **Supply chain security for ML dependencies**
  - SBOM generation, dependency auditing (pip-audit, trivy), and SLSA attestations
  - Pinning action versions to commit SHAs
- **Cost governance**
  - Budget alerts on Actions spend, runner quotas, and sweep-size caps
- **Hands-on Lab**: Replace static cloud keys with OIDC auth for a training job and add a policy check that blocks over-permissioned deployments

### Week 12: Capstone — End-to-End MLOps Platform with GitHub Actions

- **Capstone scope**: build a complete MLOps platform on GitHub Actions for a real dataset
  - Repository layout with reusable workflows and a golden pipeline library
  - CI quality gates: lint, type checks, tests, and data validation
  - Reproducible training with data versioning, experiment tracking, and a registry
  - Staged deployment with canary release and environment approvals
  - Monitoring with drift-triggered automated retraining and human approval
- **Deliverables**
  - Working workflows in a reviewed repository
  - Architecture document explaining the lifecycle and failure-handling design
  - Live demo showing a full model promotion from push to production with a simulated drift event
- **Presentation and peer review**
  - Each learner presents their platform and defends design decisions
  - Peer feedback on workflow quality, security, and operational maturity

## Final Project

Learners design and implement **an end-to-end MLOps platform built on GitHub Actions** for a real dataset of their choice (tabular, image, text, or time series). The platform must take a raw dataset and deliver a monitored model in production entirely through automated workflows: CI gates that validate code and data, versioned datasets restored from remote storage, reproducible training with run-level experiment tracking, a versioned model registry with provenance, staged promotion through approving environments, canary deployment of a serving image, and drift monitoring wired to an automated retraining pipeline with human approval. The project must include a written architecture document and a live demonstration covering at least one full promotion cycle plus one simulated drift event that triggers retraining.

## Assessment Criteria

- **Assignments**: Weekly hands-on labs (40%) graded on workflow correctness, reproducibility of results, and adherence to quality gates. A week-6 design checkpoint (10%) documents the proposed platform architecture before the capstone.
- **Final Project**: Evaluated on completeness of the automation lifecycle (30%), model quality and evaluation rigor (10%), security and governance practices (5%), and the clarity of the architecture document and demo (5%).
- **Passing bar**: A functional end-to-end pipeline that runs without manual steps, gates every promotion on passing evaluation, and demonstrably retrains on a simulated drift event.

## References

- GitHub Actions official documentation — workflows, reusable workflows, environments, artifacts, caches, and OIDC
- Google Cloud Architecture Center — "MLOps: Continuous delivery and automation pipelines in machine learning" whitepaper
- DVC documentation — data versioning and pipeline reproducibility
- MLflow documentation — tracking, model registry, and project APIs
- Evidently AI documentation — drift detection and model monitoring
- Great Expectations and pandera documentation — data validation
- Feast documentation — feature store design and online/offline consistency
- Made With ML and MLOps courses for applied MLOps patterns and case studies
