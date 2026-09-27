---
title: "Swift On-Device Machine Learning Syllabus"
description: "12-week advanced curriculum for building production iOS apps with Core ML, Create ML, the Vision framework, and Apple Neural Engine optimization."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Swift On-Device Machine Learning Syllabus

## Overview

This 12-week syllabus trains developers to ship production iOS applications powered by on-device machine learning. It covers the complete model lifecycle — data collection and labeling, training with Create ML, conversion and optimization with coremltools, integration through the Core ML runtime and the Vision/Natural Language frameworks, performance engineering against the CPU/GPU/Neural Engine, privacy-preserving personalization, and safe model-update release practices.

The course is deliberately end-to-end: every module pairs a concept with hands-on model work, and the capstone requires shipping a real, App Store–ready app whose ML models run entirely on the device. By the end, learners understand not only how to call a model, but how to choose model formats, measure inference quality, squeeze latency out of the ANE, and update models in the field without breaking privacy or user experience.

Prerequisites: solid Swift and SwiftUI experience (equivalent to the iOS Development and Advanced SwiftUI syllabi), familiarity with Xcode tooling, and basic understanding of what a machine-learning model is. No prior model-training experience is required — training is done through Apple's high-level tools, with the *ml* math kept at the conceptual level.

## Curriculum

### Module 1: On-Device ML Landscape and Core ML Foundations (Week 1)
- **The case for on-device ML**
  - Privacy (no data leaves the device), latency, offline availability, cost per inference
  - Trade-offs versus server-side ML: model size, update velocity, compute budget
- **Core ML model formats and the model container**
  - `.mlmodel` (Xcode 14 and earlier) vs `.mlmodelc` compiled models
  - MLModel, MLModelConfiguration, MLModelDescription, feature names and types
- **Loading and running a first model**
  - Synchronous inference vs async prediction with `MLModel.prediction(from:)` and `MLModel.predictions(from:)`
  - MLFeatureValue, multi-array and image input handling
- **What runs where**
  - computeUnits (.all, .cpuOnly, .cpuAndGPU, .cpuAndNeuralEngine)
  - session-per-SwiftUI-view antipatterns and model caching

### Module 2: Data Preparation and Create ML Training (Week 2)
- **Data collection and labeling pipelines**
  - Structuring classification/regression datasets, train/test/validation splits
  - Labeling tools: Create ML UI vs Create ML framework (MLImageClassifier, MLSoundClassifier, MLWordTagger, MLRegressor, MLRecommender, MLActivityClassifier)
- **Training a first classifier**
  - `MLImageClassifier(trainingData:validationData:)`, evaluation metrics, confusion matrix reading
  - Overfitting signals: accuracy gaps between training and validation
- **Data hygiene**
  - Class balance, augmentation basics, label noise, held-out test discipline
  - Dataset size rules of thumb per model type

### Module 3: Model Conversion and Optimization with coremltools (Week 3)
- **Conversion fundamentals**
  - Converting PyTorch/TensorFlow checkpoints: torchscript/onnx paths, `.convert()` and unified conversion API
  - Model outputs: probability distributions, feature vectors, embeddings
- **Size reduction techniques**
  - Weight quantization (int8, int16) and accuracy impact measurement
  - Pruning and palettization (ML Program), minimum deployment target constraints
- **The ML Program format**
  - Flexible shape support, `flexibleShapeRange`, grouped tensor support
  - Previewing converted models in Xcode and validating with `coremltools.models.MLModel`

### Module 4: Integrating Models into SwiftUI Apps (Week 4)
- **Architecture for ML-powered features**
  - Model service layer, dependency injection, asynchronous inference patterns
  - Loading multiple models; model registry and lazy-loading strategies
- **SwiftUI integration**
  - Progress/state handling during inference, cancellable tasks with Task groups
  - Displaying predictions, confidence, and explanations (XGBoost feature importance, SHAP-style attribution where supported)
- **Error handling and fallbacks**
  - Model not supported on device (availability checks), degraded-mode UX
  - Feature flags to disable ML features gracefully

### Module 5: Computer Vision with the Vision Framework (Week 5)
- **Vision framework integration**
  - VNCoreMLRequest, VNImageRequestHandler, observation types (VNClassificationObservation, VNDetectedObjectObservation)
  - Orientation handling and cropping for accurate inference
- **Real-world vision tasks**
  - Object detection with built-in models (VNDetectRectangles, VNDetectHumanRectangles, VNDetectFaceRectangles)
  - Text recognition (VNRecognizeTextRequest) and barcode/QR scanning
  - Image classification and saliency (VNSaliencyImageObservation)
- **Performance patterns**
  - Reusing request handlers, streaming analysis from the camera, throttling frames

### Module 6: Natural Language and Audio with the Natural Language and SoundAnalysis Frameworks (Week 6)
- **Natural Language framework**
  - NLLanguageRecognizer, NLTokenizer, NLTagger, NLModel for custom NLP
  - Sentiment analysis, embeddings (NLEmbedding), and semantic search on device
- **Audio and sensor ML**
  - SNAudioFileAnalyzer and SNClassifySoundRequest for sound classification
  - On-device speech recognition (SFSpeechRecognizer) and combining audio ML with Core ML models
  - Sensor pipelines: accelerometer/gyroscope feature extraction for activity recognition
- **Privacy considerations for data-collecting features**
  - Microphone/camera permissions, on-device processing guarantees, data minimization

### Module 7: On-Device Personalization and Update Loops (Week 7)
- **Personalization strategies**
  - User-specific threshold tuning, per-user fine-tuning with small on-device datasets
  - `MLUpdateTask` and on-device model updates with training data
- **Update management**
  - Downloading model updates over the network, atomic swaps, rolling back on quality regression
  - Versioning models and coordinating with app versions
- **Evaluation in production**
  - Online metrics: inference quality sampling, logging predictions with user consent
  - Detecting drift in input distributions and triggering re-training

### Module 8: Performance Engineering on CPU, GPU, and Neural Engine (Week 8)
- **Profiling inference**
  - Core ML Instruments template, per-layer breakdowns, `MLModelConfiguration` tuning
  - Latency budgets: frame-driven UI, batch inference, and caching strategies
- **Compute unit routing**
  - When the ANE wins vs GPU vs CPU, memory pressure, thermal throttling
  - Mixed precision and integer-only inference paths
- **Battery and thermal impact**
  - Sustained-load testing, power profiling, reducing inference frequency with change-detection

### Module 9: Privacy-Preserving and Production-Grade ML (Week 9)
- **Privacy engineering**
  - Differential privacy concepts, federated learning concepts (Apple's private federated learning)
  - Data minimization, on-device-only guarantees, App Privacy labels for ML features
- **Security**
  - Model integrity, avoiding model theft via obfuscation trade-offs, input validation against adversarial examples
- **Quality assurance**
  - Golden-image test suites, automated accuracy regression gates in CI, snapshotting model outputs

### Module 10: Generative ML on Device and Emerging Frameworks (Week 10)
- **On-device transformers and LLMs**
  - Core ML support for transformer architectures, small language models, tokenizer handling
  - Memory budget analysis for large models, mmap loading, and streaming generation
- **Stable Diffusion and media generation**
  - Core ML Stable Diffusion pipeline, latent-space generation, control over compute budget
- **Choosing models responsibly**
  - Hallucination risk, safety filters, capability limits of small on-device models

### Module 11: Deployment, A/B Testing, and Operations (Week 11)
- **App Store integration**
  - Bundling models, download-after-install patterns, app thinning and size budgets
  - Background model downloads with BGTaskScheduler or BackgroundAssets
- **Experimentation**
  - A/B testing ML features, staged rollouts, killer-metric definition for ML features
- **Operational monitoring**
  - Remote metrics (opt-in), crash and memory monitoring for inference, alerting on quality-SLO breaches

### Module 12: Capstone — Production On-Device ML App (Week 12)
- **Build a complete app** combining at least two model types (e.g., image classification plus NLP or sound classification)
- **Requirements**
  - Trained or converted models with documented accuracy, optimized for size and latency
  - UX with graceful degradation on unsupported devices, offline-first behavior
  - Privacy: no raw user data leaves the device; update pipeline with rollback
- **Deliverables**: app, model cards (accuracy, size, latency), performance report, and release plan

## Final Project

Learners ship a production-ready iOS app whose ML features run entirely on-device. The app must integrate at least two model types (examples: an image classifier built with Create ML plus a Vision text-recognition flow; a sound classifier with on-device NLP fallback), include a documented optimization pass (quantization or pruning with before/after size and accuracy measurements), and implement an over-the-air model update mechanism with rollback. A model card and a short performance report covering inference latency, memory, and battery impact on at least two physical devices must accompany the submission.

## Assessment Criteria

- **Assignments (40%)**: one short quiz per module plus weekly hands-on labs — training a model, converting a checkpoint, profiling an inference path, building a Vision pipeline. Labs are graded on correctness, documentation quality, and measured results (accuracy, size, latency).
- **Final Project (50%)**: evaluated on technical depth (model selection and optimization choices), production readiness (error handling, privacy, update pipeline), user experience (degraded-mode UX, offline behavior), and the quality of the model card and performance report.
- **Peer Review (10%)**: each learner reviews one classmate's project using the assessment rubric, checking model documentation, privacy claims, and measurement reproducibility.

## References

- Apple Developer Documentation — Core ML: https://developer.apple.com/documentation/coreml
- Apple Developer Documentation — Create ML: https://developer.apple.com/documentation/createml
- Apple Developer Documentation — Vision: https://developer.apple.com/documentation/vision
- Apple Developer Documentation — Natural Language: https://developer.apple.com/documentation/naturallanguage
- Apple Developer Documentation — SoundAnalysis: https://developer.apple.com/documentation/soundanalysis
- Apple Machine Learning Research: https://machinelearning.apple.com
- coremltools documentation: https://coremltools.readme.io
- WWDC videos — "Core ML", "Vision", "Natural Language", "Create ML" sessions and the Core ML session on on-device LLMs
- "On-Device Machine Learning" sample code and model garden: https://developer.apple.com/machine-learning/models
