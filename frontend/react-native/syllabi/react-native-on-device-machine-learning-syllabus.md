---
title: "React Native On-Device Machine Learning Syllabus"
description: "A comprehensive 12-week advanced curriculum for React Native developers who want to build privacy-preserving mobile AI features with on-device inference — covering TensorFlow Lite, MediaPipe, Core ML, NNAPI and GPU/NPU delegates, model conversion and quantization, computer vision, on-device NLP, edge generative AI with LLMs and RAG, inference performance engineering, and model update pipelines."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# React Native On-Device Machine Learning Syllabus

## Overview

This 12-week advanced syllabus is designed for React Native developers who already ship production apps and want to add machine learning features that run entirely on the user's device. While the standard React Native curriculum focuses on components, navigation, state management, and device APIs, this course builds a complete on-device ML engineering skill set: choosing between TensorFlow Lite, MediaPipe, Core ML, and ONNX Runtime; converting and quantizing models so they fit a mobile memory budget; driving inference from the JavaScript thread without janking the UI; wiring native delegates (GPU, NNAPI, Core ML, NPU) for speed; building computer vision features such as image classification, object detection, and segmentation; on-device NLP with embeddings and translation; edge generative AI with quantized LLMs and local retrieval-augmented generation; and shipping models safely through bundled assets, OTA updates, and privacy-preserving data pipelines.

Each module pairs conceptual depth with hands-on labs that require running inference on real simulators and devices, profiling CPU/GPU/NPU usage, measuring cold-start and frame-budget impact, and evaluating model quality before shipping. The course culminates in a capstone project where learners design and build a privacy-first React Native app with at least two on-device ML features — one computer vision and one language-based — with quantized models, a measurable inference budget, a graceful fallback strategy, and a versioned model update pipeline.

By the end of this course, learners will be able to select the right inference runtime and delegate for a given task, convert and quantize models from PyTorch/JAX/Keras for mobile deployment, bridge native inference into React Native without blocking the UI thread, profile and optimize inference latency, memory, and energy usage, implement robust on-device vision and NLP features, integrate quantized LLMs with local RAG, and ship model updates safely across app releases.

## Curriculum

### Module 1: On-Device ML Foundations (Week 1)

- **Why on-device inference**
  - Privacy and data minimization: sensitive data never leaves the device
  - Latency and offline availability: no network dependency for inference
  - Cost: zero per-inference server spend and no API rate limits
  - Trade-offs versus cloud APIs: model size, update friction, device fragmentation
- **The mobile ML landscape**
  - TensorFlow Lite, MediaPipe Tasks, Core ML, ONNX Runtime, ML Kit
  - Where each runtime fits: framework-agnostic conversion, OS-accelerated paths, turnkey task APIs
  - Apple Silicon (ANE) versus Android GPU/NPU/DSP delegates
- **Model lifecycle on mobile**
  - Training happens in the cloud; inference happens on the edge
  - Typical pipeline: train → convert → quantize → validate → bundle → ship → update
- **Hands-on Lab**: Install TensorFlow Lite bindings in a React Native app, bundle a tiny image classifier, and run a first inference on iOS Simulator and Android Emulator

### Module 2: TensorFlow Lite in React Native (Week 2)

- **The tflite-react-native ecosystem**
  - Package options: `tflite-react-native`, `react-native-fast-tflite`, and native module wrappers
  - FlatBuffers model format and why `.tflite` files are not raw weights
  - Bundling models with Metro: asset extensions, `metro.config.js` resolver config
- **Interpreter basics**
  - Loading a model from bundled assets versus the file system
  - Input/output tensor shapes, dtypes, and normalization contracts
  - Running inference: synchronous vs. async interpreter modes
- **The threading problem**
  - Why inference on the JavaScript thread freezes the UI
  - Moving work to native worker threads with `InteractionManager` and native dispatch
- **Hands-on Lab**: Build a reusable `useTFLite` hook that loads a model, warms it up, and runs inference off the JS thread

### Module 3: MediaPipe Tasks and Turnkey Vision APIs (Week 3)

- **MediaPipe Tasks overview**
  - Task-based APIs: image classification, object detection, face landmarks, pose landmarking, hand landmarking, image segmentation
  - When a task API beats a raw interpreter: built-in preprocessing, postprocessing, and visualization helpers
- **Integrating MediaPipe with React Native**
  - `@mediapipe/tasks-vision` with WebAssembly versus native MediaPipe bindings
  - Camera pipeline: feeding `CameraRoll` images or live `react-native-vision-camera` frames
  - Result types: classifications, detections, landmarks, and normalized coordinates
- **Real-time constraints**
  - Frame skipping and processing every Nth frame
  - Downscaling input frames to model input size
  - Overlay rendering with Skia or SVG views
- **Hands-on Lab**: Build a pose-landmark overlay app that tracks a person in a live camera feed and draws the skeleton in real time

### Module 4: Core ML Integration on iOS (Week 4)

- **The Core ML pipeline**
  - Why Core ML matters: Apple Neural Engine acceleration on modern iPhones
  - `.mlmodel` and `.mlpackage` formats, model provenance through Xcode
  - Converting `.tflite`/ONNX models to Core ML with `coremltools`
- **Core ML from React Native**
  - Writing a Swift native module that wraps `MLModel` and `MLModelPrediction`
  - Passing `MLMultiArray` inputs and decoding outputs
  - Controls: `MLPredictionOptions` (CPU/GPU/ANE policy), completion handler dispatch to JS
- **ANE versus CPU/GPU**
  - `computeUnits` policies and when to restrict execution
  - Power versus latency trade-offs on sustained inference
- **Hands-on Lab**: Write a Swift wrapper for a Core ML image classifier, call it from JS, and confirm ANE acceleration with Instruments

### Module 5: Android Acceleration with NNAPI and GPU Delegates (Week 5)

- **Android inference backends**
  - NNAPI (Neural Networks API) and vendor HALs: GPU, DSP, NPU
  - TFLite GPU delegate and XNNPACK CPU backend
  - Choosing a delegate at runtime based on device capabilities
- **Heterogeneous execution**
  - Partial delegation: ops that the GPU delegate cannot run fall back to CPU
  - Benchmarking delegates: `tflite_benchmark_model` and in-app timing
- **React Native Android specifics**
  - Kotlin native module wrapping `Interpreter` with `Delegate.NNAPI`/`Delegate.GPU`
  - Avoiding ANRs: background executor, `BlockingQueue` handoff, and JS promise resolution
- **Hands-on Lab**: Profile the same model with CPU, GPU, and NNAPI delegates on two Android devices and document the latency/accuracy/energy trade-offs

### Module 6: Model Conversion and Optimization (Week 6)

- **Conversion fundamentals**
  - TensorFlow SavedModel/Keras → TFLite with the converter
  - PyTorch → ONNX → TFLite/Core ML: the cross-framework bridge
  - JAX/Hugging Face pipelines and `optimum` for export
- **Quantization deep dive**
  - Post-training quantization: dynamic range, float16, and int8
  - Full integer quantization with a representative dataset and calibration
  - Quantization-aware training and why it preserves accuracy on edge hardware
- **Model surgery**
  - Pruning and distillation for mobile-size models
  - Sparse models and block-sparsity on NNAPI
  - Measuring the size/accuracy/latency triangle
- **Hands-on Lab**: Take a 200MB PyTorch model, convert it through four optimization stages, and record size, accuracy delta, and inference latency at each step

### Module 7: Computer Vision Applications (Week 7)

- **Image classification and fine-grained recognition**
  - EfficientNet/MobileNet families and input preprocessing (mean/std normalization)
  - Top-k decoding and confidence thresholds
- **Object detection**
  - SSD, EfficientDet-Lite, YOLO variants: anchor boxes, NMS postprocessing in JS
  - Drawing bounding boxes with correct coordinate mapping (model vs. view space)
- **Image segmentation**
  - DeepLab/selfie models: per-pixel class masks
  - Mask postprocessing: alpha compositing, background replacement
- **Camera integration patterns**
  - `react-native-vision-camera` frame processors, barcode/QR hooks, and AR overlays
- **Hands-on Lab**: Build an object detector that highlights detected items in a live camera feed with a Skia overlay and adjustable confidence threshold

### Module 8: On-Device NLP (Week 8)

- **Text models on mobile**
  - MobileBERT, DistilBERT, and tiny transformers for classification and QA
  - Tokenization on device: WordPiece/SentencePiece tokenizer ports in JS and native
  - Sequence length limits and truncation strategies
- **Embeddings and semantic search**
  - Sentence encoders for local embeddings (e.g., universal sentence encoder-lite)
  - Embedding storage with SQLite/MMKV and cosine-similarity search
  - Local semantic search over notes, email, or chat history
- **Speech and translation**
  - On-device speech-to-text engines and whisper-tiny variants
  - Machine translation models and language detection on the edge
- **Hands-on Lab**: Build a local semantic search feature that embeds user notes on-device and returns relevant results without any network call

### Module 9: Edge Generative AI and Local RAG (Week 9)

- **LLMs on-device: what is realistic**
  - Quantized small LLMs (1B–8B at 4-bit/8-bit) and their memory footprints
  - llama.cpp/GGUF-style runtimes in React Native via native modules
  - Token-generation speed expectations and interactive UX patterns
- **Local retrieval-augmented generation**
  - Chunking knowledge bases and embedding them on-device
  - Retrieval: vector search over local embeddings, then prompt assembly
  - Grounding constraints: context window management and answer citation
- **Hybrid edge/cloud strategies**
  - Running small models locally for privacy-critical requests
  - Escalating to cloud APIs for complex generation with consent
- **Hands-on Lab**: Run a quantized small LLM with a local RAG pipeline that answers questions from a bundled knowledge base, fully offline

### Module 10: Inference Performance Engineering (Week 10)

- **Latency budgets**
  - Defining inference SLOs: cold start, warm inference, p95 frame impact
  - Startup strategies: model preload, warmup inference, lazy delegate init
- **Memory engineering**
  - Model memory mapping (`mmap`) versus loading into heap
  - Tensor buffer reuse and avoiding per-frame allocations
  - Peak-memory profiling with Xcode Instruments and Android Studio Profiler
- **Power and thermals**
  - Sustained inference versus bursts: ANE/DSP throttle behavior
  - Battery impact measurement and adaptive quality (drop fps, lower resolution)
- **Bridging overhead**
  - Minimizing JS↔native copies for large tensors (shared memory, object reuse)
  - Batching and coalescing predictions
- **Hands-on Lab**: Profile an app end-to-end and reduce p95 inference latency by at least 40 percent without changing the model

### Module 11: Model Delivery, Updates, and Privacy (Week 11)

- **Bundling and download strategies**
  - Shipping small models inside the app bundle
  - OTA model updates: signed downloads, atomic swap, and version pinning
  - A/B testing models and staged rollout of new model versions
- **Model validation before release**
  - Golden-image test sets and per-class accuracy gates
  - Drift detection between model versions on the same device cohort
- **Privacy and security**
  - Threat modeling: model extraction, adversarial inputs, data exfiltration
  - Secure inference contexts, keychain-protected artifacts, and integrity checks
  - Privacy regulations: GDPR/local-processing benefits and disclosure requirements
- **Hands-on Lab**: Implement a signed OTA model update flow with rollback and evaluate a new model version against a golden test set before rollout

### Module 12: Capstone Project (Week 12)

- **Project brief**
  - Design and build a privacy-first React Native app with at least two on-device ML features: one computer vision feature and one language-based feature
  - Example directions: an assistive camera app that reads scenes aloud, a local health journal with semantic search and lifestyle insights, or an offline translation and visual search companion
- **Engineering requirements**
  - Models converted and quantized to run within a documented memory budget
  - Inference fully off the JS thread with measured p95 frame impact under 16 ms
  - A signed, versioned model update pipeline with rollback
  - Graceful degradation when hardware acceleration is unavailable
- **Deliverables**
  - Source repository, model provenance and optimization report, benchmark results, and a short demo run on both iOS and Android

## Final Project

Learners build a production-grade, privacy-first React Native application that combines an on-device computer vision feature with an on-device language feature. The project integrates at least two inference runtimes or delegates, ships quantized models with a documented optimization chain (conversion → quantization → validation), keeps all inference off the JavaScript thread with a measurable 16 ms frame-impact budget, and includes a signed OTA model update pipeline with rollback. The final submission must include a model provenance report (training source, conversion steps, accuracy deltas), a performance benchmark comparing delegates and devices, and a live demonstration on both iOS and Android hardware.

## Assessment Criteria

- **Assignments**: Weekly hands-on labs are graded on working inference on device, correct runtime/delegate selection, and documented performance measurements (latency, memory, energy).
- **Model Optimization Portfolio**: Mid-course conversion and quantization exercises are assessed on the size/accuracy/latency trade-off report and the reproducibility of the optimization chain.
- **Final Project**: Evaluated on the quality and reliability of the two ML features, the measured inference budget (p95 frame impact under 16 ms, cold start under a documented target), the robustness of the OTA update and rollback flow, privacy safeguards, and the clarity of the engineering documentation.
- **Code Quality**: Native module code must be thread-safe, allocation-conscious, and free of leaks; JS integration must degrade gracefully when delegates or models are unavailable.

## References

- TensorFlow Lite documentation (developer.android.com)
- MediaPipe Tasks guide (ai.google.dev/edge/mediapipe)
- Core ML and coremltools documentation (developer.apple.com)
- ONNX Runtime mobile documentation (onnxruntime.ai)
- react-native-fast-tflite and tflite-react-native package documentation
- llama.cpp project and GGUF format documentation
- Apple's "Machine Learning at Apple" and Android NNAPI reference pages
- O'Reilly "AI at the Edge" and practical on-device ML course materials
