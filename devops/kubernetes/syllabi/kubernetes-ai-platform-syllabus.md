---
title: "Kubernetes AI Platform Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for Kubernetes platform engineers building production AI infrastructure — GPU scheduling and device plugins, Kueue quota management, Kubeflow and the Training Operator, Ray on Kubernetes, KServe and LLM inference serving, high-performance storage and networking for distributed training, ML CI/CD and model registries, GPU observability, cost optimization, and a multi-tenant AI platform capstone."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Kubernetes AI Platform Engineering Syllabus

## Overview

This 12-week advanced syllabus is designed for Kubernetes operators, SREs, and platform engineers who already operate clusters in production and now need to run AI and machine learning workloads on them at scale. Where a general Kubernetes curriculum teaches how to run web services, this course is about the workloads that break the normal rules: distributed training jobs that need whole GPUs and ultra-low-latency interconnects, inference services that must autoscale from zero on a critical path, and data pipelines that move terabytes between object storage and fast filesystems.

The curriculum is organized in three phases. Weeks 1–4 build the foundation of an AI-ready cluster: GPU hardware and device plugins, specialized scheduling and Kueue-driven quota management, workload types for training and fine-tuning, and autoscaling for bursty, GPU-bound workloads. Weeks 5–8 assemble the AI software stack: Kubeflow and its training operators, the Ray distributed runtime, model serving with KServe and LLM inference engines, and the storage layer that keeps datasets, checkpoints, and model weights flowing. Weeks 9–12 cover the platform engineering discipline around the workloads: high-performance networking for distributed training, ML CI/CD and model lifecycle management, GPU observability and cost optimization, and a capstone where learners design and build a multi-tenant AI platform for a fictional ML team.

Each module pairs deep conceptual grounding with hands-on labs that require deploying real tooling — installing the NVIDIA device plugin, configuring Kueue quotas, running a distributed PyTorch training job, serving a model with KServe and vLLM, and wiring GPU dashboards. By the end of this course, learners will be able to design a production-ready AI platform on Kubernetes, schedule and quota GPU workloads safely, run distributed training and serve inference at scale, and operate the platform with meaningful GPU utilization, reliability, and cost visibility.

## Curriculum

### Module 1: AI Workload Characteristics and GPU Hardware on Kubernetes (Week 1)

- **Why Kubernetes for AI/ML**
  - Workload taxonomy: training, fine-tuning, inference, data preprocessing, and how each stresses the cluster differently
  - The shift from CPU-bound microservices to accelerator-bound batch and serving workloads
  - What changes operationally: long-running jobs, spot interruption tolerance, multi-GPU affinity, huge artifacts
- **GPU and accelerator hardware**
  - NVIDIA GPUs (A100/H100/L40S/consumer cards), AMD Instinct, and cloud TPUs: capabilities and trade-offs
  - GPU memory profiles, NVLink/NVSwitch topologies, and how they shape pod scheduling
  - Choosing GPU node shapes: dedicated GPU node pools vs. mixed nodes
- **Exposing accelerators to pods**
  - Extended resources and the device plugin framework (`nvidia.com/gpu`, AMD, and Intel plugins)
  - NVIDIA Device Plugin deployment, plugin daemonset lifecycle, and health checks
  - GPU node labeling, taints, and tolerations for workload segregation
- **Hands-on Lab**: Install the NVIDIA device plugin on a GPU node, label and taint the node pool, and schedule a CUDA test pod that allocates a specific number of GPUs

### Module 2: GPU Sharing, Partitioning, and Scheduling Deep Dive (Week 2)

- **Scheduling GPU workloads**
  - How kube-scheduler binds extended resources; resource counting and overcommit risks
  - Node affinity, taints, and tolerations for GPU pools; node selector pitfalls with mixed CPU/GPU nodes
  - Scheduling topologies that respect GPU-to-GPU interconnect (NVLink domains) and NUMA
- **GPU sharing and partitioning**
  - NVIDIA MIG: compute instance and memory slice profiles, MIG on A100/H100
  - Time-slicing, vGPU, and MPS (Multi-Process Service) for oversubscription
  - GPU sharing vendors and the fairness/cost trade-offs of each approach
- **Advanced placement for training**
  - Gang scheduling problems: pods of a distributed job must start together or not at all
  - Volcano, Koordinator, and other batch/gang scheduling engines
  - Preemption and priority classes for AI workloads
- **Hands-on Lab**: Enable MIG or time-slicing on a GPU node, allocate two pods to one physical GPU, and demonstrate the isolation and throughput impact of each mode

### Module 3: Kueue and Quota Management for AI Workloads (Week 3)

- **The queueing problem in ML platforms**
  - Why fair-share matters: interactive notebooks vs. batch training vs. latency-critical inference
  - Admission chain integration: Kueue as an admission webhook for workload queuing
- **Kueue internals**
  - Workload, ClusterQueue, and LocalQueue objects; the admission and quota borrowing model
  - ResourceFlavor for heterogeneous resources (GPU models, spot vs. on-demand)
  - Quota borrowing, cohort sharing, and priority-based preemption
- **Integrating Kueue with training operators**
  - Kueue's built-in integrations: Job, PyTorchJob, RayJob, and plain pods
  - MultiKueue for workload distribution across clusters
  - Observing queue state: kubectl kueue, events, and dashboard metrics
- **Hands-on Lab**: Define ClusterQueues and LocalQueues for a two-team cluster, submit training jobs through Kueue, and observe admission, borrowing, and preemption behavior

### Module 4: Training Workloads and the Kubeflow Training Operator (Week 4)

- **Kubernetes-native training primitives**
  - Native Jobs, CronJobs, and the batch API; restart and backoff policies for training
  - Pod templates for training: shared memory, hugepages, init containers for dataset staging
  - Checkpointing from a scheduling perspective: why preemptible GPUs need frequent checkpoints
- **The Kubeflow Training Operator**
  - PyTorchJob, TFJob, MPIJob, and XGBoostJob CRDs
  - Master/worker topologies exported per framework; rendezvous and world-size handling
  - Failure handling: restarts, backoff limits, and pod scheduling policies (gang scheduling)
- **Fine-tuning and custom workloads**
  - When to use plain Jobs vs. the Training Operator vs. Ray
  - Interactive workloads: Jupyter and VS Code notebooks in dedicated namespaces
  - Job observability: training metrics, logs, and tensorboard exposure
- **Hands-on Lab**: Run a distributed PyTorchJob with two worker replicas, scale it up, inject a pod failure, and verify the operator's restart behavior and checkpoint recovery

### Module 5: Ray on Kubernetes (Week 5)

- **The Ray architecture**
  - Ray head, workers, and the distributed scheduler; tasks, actors, and object store
  - Why teams choose Ray for training, hyperparameter tuning, and serving on one runtime
- **KubeRay operator**
  - RayCluster CRD: head group and worker group templates, autoscaling configuration
  - RayJob: job submission, status tracking, and cluster cleanup
  - Ray Serve deployment onto Kubernetes: deployment graphs and HTTP ingress
- **Ray and Kueue integration**
  - Suspending and resuming RayJobs with Kueue quotas
  - Placement group and gang-scheduling semantics inside Ray on Kubernetes
  - Scaling policies: Ray autoscaler vs. Kubernetes node autoscaler vs. Karpenter
- **Hands-on Lab**: Deploy the KubeRay operator, run a RayCluster with autoscaling worker groups, submit a distributed hyperparameter tuning job, and observe cluster scale-up and scale-down

### Module 6: Model Serving with KServe and LLM Inference Engines (Week 6)

- **Serving architecture patterns**
  - Online vs. batch inference; the v1 predict and v2 (KServe gRPC/HTTP) inference protocols
  - Serverless-style serving: scale-to-zero, request-based autoscaling, and cold-start trade-offs
  - Model loading strategies: pre-loaded, lazy loading, and model-mesh style multi-model serving
- **KServe in depth**
  - InferenceService CRD: predictor, transformer, and explainer components
  - Autoscaling with KPA and Knative integration; canary rollouts and traffic splitting
  - Serving runtimes: SKLearnServer, TorchServe, Triton Inference Server, and custom runtimes
- **LLM inference engines**
  - vLLM, TensorRT-LLM, and Text Generation Inference (TGI) on Kubernetes
  - Continuous batching, KV-cache management, and tensor-parallel placement across GPUs
  - GPU-aware autoscaling and queueing for LLM endpoints under load
- **Hands-on Lab**: Deploy an InferenceService serving an LLM with vLLM, configure scale-to-zero and canary rollout, and load-test the endpoint while watching GPU utilization

### Module 7: Kubeflow Platform and MLOps Tooling (Week 7)

- **Kubeflow as an integrated platform**
  - Central Dashboard, multi-user profiles, and namespace provisioning
  - Notebook servers: image selection, GPU allocation, and idle shutdown
- **Pipelines and orchestration**
  - Kubeflow Pipelines and KFP SDK: components, pipelines, and run scheduling
  - Argo Workflows as an alternative DAG engine on Kubernetes
  - Event-driven orchestration: Kafka and KEDA triggers for ML pipelines
- **Katib for hyperparameter tuning**
  - Experiment, trial, and suggestion CRDs; search algorithms (Bayesian, random, grid)
  - Early stopping and resource budgets for tuning experiments
- **Hands-on Lab**: Stand up Kubeflow on a cluster (or the essential operators alone), create a multi-user profile, and run a two-step pipeline with a Katib tuning trial on a GPU

### Module 8: Storage for AI Workloads (Week 8)

- **The AI data lifecycle**
  - Dataset staging, model artifacts, checkpoints, and logs: different durability and speed needs
  - Object storage as the system of record (S3, MinIO, GCS) and the POSIX gap
- **Filesystems and CSI drivers**
  - ReadWriteMany for distributed training: NFS, JuiceFS, CephFS, and parallel filesystems (Lustre, GPFS)
  - CSI drivers, storage classes, and dynamic provisioning for ML data
  - Local NVMe and ephemeral volumes for hot checkpoints; cache layers on top of object storage
- **Checkpointing and model artifacts**
  - Direct-to-object-store checkpointing vs. PVC-based checkpoints
  - Model registry patterns: storing weights, metadata, and lineage (MLflow, Hugging Face)
  - Data transfer patterns: init containers, sidecars, and explicit sync jobs
- **Hands-on Lab**: Provision a ReadWriteMany storage class, mount it into a distributed training job, implement checkpointing to object storage, and measure dataset staging time

### Module 9: High-Performance Networking for Distributed Training (Week 9)

- **The networking demands of AI**
  - AllReduce and NCCL traffic patterns; why east-west bandwidth dominates training
  - RDMA, InfiniBand, and RoCE: when Kubernetes needs to expose them to pods
  - The problems with default CNI for multi-GPU training (head-of-line blocking, congestion)
- **Topology-aware scheduling and networking**
  - Network topology plugins (NVIDIA Topology-Aware Scheduling) and node pool placement
  - HostNetwork pods for NCCL, shared-memory and pinned CPU considerations
  - Egress patterns: pulling datasets from object storage without saturating the network
- **Network policy and isolation for ML namespaces**
  - Restricting egress, securing model servers, and multi-tenant network segmentation
  - Service mesh trade-offs for high-bandwidth training traffic (avoid proxies on the data plane)
- **Hands-on Lab**: Run a multi-node NCCL benchmark (e.g., nccl-tests) with and without topology-aware scheduling, and measure the impact of hostNetwork and pinned placement on AllReduce throughput

### Module 10: ML CI/CD and Model Lifecycle Management (Week 10)

- **CI/CD for machine learning**
  - Building images for training and serving: CUDA base images, multi-stage builds, and reproducibility
  - CI pipelines that trigger training, evaluation, and promotion gates (Argo CD, GitHub Actions, GitLab CI)
  - Training drift: when CI validates code but not data or model behavior
- **Model registries and versioning**
  - MLflow, Hugging Face Hub, and S3-based registries: experiments, runs, and model versions
  - Lineage: linking dataset version → training run → model artifact → deployed serving revision
  - Deployment strategies: canary, shadow, A/B across InferenceServices; automated rollback
- **GitOps for the ML platform**
  - Managing operators, ClusterQueues, storage classes, and InferenceServices as declarative config
  - Promotion between dev/staging/production clusters with Argo CD
  - Secrets and model credentials: external secrets, KMS integration, and image pull secrets
- **Hands-on Lab**: Build a training image in CI, register the resulting model in MLflow, promote it through a GitOps pipeline to a KServe InferenceService, and execute a canary rollout

### Module 11: GPU Observability, Reliability, and Cost Optimization (Week 11)

- **Observing GPU workloads**
  - DCGM (DCGM-Exporter), Prometheus, and Grafana dashboards: utilization, memory, temperature, power
  - Job and queue metrics: Kueue demand/admission, pod events, and throughput per training run
  - Logging and tracing for distributed jobs: correlating rank-0..N logs, OpenTelemetry for pipelines
- **Reliability patterns**
  - Spot and preemptible GPU nodes: interruption handling, checkpoint cadence, and requeueing
  - Node failures and GPU ECC errors: detection, drains, and automated repair
  - Chaos experiments for the ML platform: losing a worker mid-training and verifying recovery
- **Cost optimization**
  - Right-sizing GPU nodes vs. utilization targets; bin-packing training and serving workloads
  - Spot mix, node consolidation with Karpenter, and idle notebook shutdown
  - Chargeback and showback: allocating GPU cost to teams via Kueue quota accounting
- **Hands-on Lab**: Deploy DCGM-Exporter with a GPU dashboard, run a spot-interruption drill with a checkpointed training job, and produce a per-team cost report from cluster metrics

### Module 12: Multi-Tenant AI Platform Design and Capstone (Week 12)

- **Designing a production AI platform**
  - Reference architecture: GPU node pools, Kueue, training operators, serving layer, and storage
  - Multi-tenant isolation: namespaces, ResourceQuotas, network policies, and RBAC for ML teams
  - Security for AI: image signing, SBOMs, GPU node hardening, and model provenance
- **Scaling the platform**
  - Federated multi-cluster with MultiKueue; capacity planning across regions and GPU models
  - Onboarding new teams: self-service cluster access, quota requests, and support workflows
- **Capstone project**
  - Design and build a multi-tenant AI platform serving two fictional teams (research and production)
  - End-to-end: cluster configuration, Kueue quotas, a PyTorchJob or RayJob pipeline, a KServe endpoint, GitOps promotion, GPU dashboards, and a cost report
- **Hands-on Lab**: Implement the capstone platform from scratch in a sandbox cluster, then present the architecture, run the full training-to-serving path, and document operating procedures

## Final Project

Learners design and build a complete multi-tenant AI platform on Kubernetes, then operate it end to end. The platform must support two distinct teams: a research team that runs interactive notebooks and distributed training experiments, and a production team that runs scheduled fine-tuning jobs and latency-sensitive model serving.

The deliverable is a working reference platform with: GPU node pools configured with taints, tolerations, and a sharing mode; Kueue ClusterQueues and LocalQueues with borrowing and preemption policies; a distributed training path (PyTorchJob or RayJob) that checkpoints to object storage and survives a node interruption; a KServe InferenceService (or vLLM deployment) with scale-to-zero and a canary rollout; a GitOps-managed operator and configuration layer; a GPU observability stack with dashboards and per-team cost reporting; and documentation of the architecture, runbooks, and quota policies. The platform must be reproducible from declarative configuration, and the learner must demonstrate a full training-to-serving workflow along with a reliability drill (worker failure or spot interruption).

## Assessment Criteria

- **Assignments**: Weekly hands-on labs from Modules 1–11, submitted as reproducible manifests and short write-ups. Graded on correctness of scheduling and quota configuration, successful execution of training and serving workloads, and clear explanation of failure behavior.
- **Module Quizzes**: Short quizzes after each phase (after Weeks 4, 8, and 11) covering GPU scheduling, Kueue quota mechanics, serving protocols, and networking fundamentals.
- **Final Project**: Evaluated on platform completeness (all required components present and working), multi-tenant isolation quality (quota enforcement, network policy, RBAC), production readiness (checkpointing, autoscaling, observability, cost reporting), and documentation quality. A platform that serves production inference while a research training job is running, survives a node interruption, and demonstrates measurable GPU utilization and cost attribution passes.

## References

- Kubernetes Documentation — Scheduling, Taints and Tolerations, Extended Resources and Device Plugins
- Kueue Documentation — ClusterQueue, LocalQueue, ResourceFlavor, MultiKueue
- Kubeflow Documentation — Training Operator, Pipelines, Katib, Central Dashboard
- KubeRay Documentation — RayCluster, RayJob, Ray Serve on Kubernetes
- KServe Documentation — InferenceService, v1/v2 protocols, autoscaling and canary rollouts
- NVIDIA Device Plugin and DCGM-Exporter — GPU scheduling, MIG, and observability
- vLLM and TensorRT-LLM — LLM inference engines and continuous batching
- Argo CD and Argo Workflows — GitOps and pipeline orchestration
- MLflow and Hugging Face Hub — experiment tracking and model registries
