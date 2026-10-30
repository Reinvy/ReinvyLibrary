---
title: "Silabus Rekayasa Keamanan Kubernetes"
description: "Kurikulum lanjutan 12 minggu yang komprehensif bagi security engineer, tim platform, dan SRE yang mengamankan Kubernetes produksi — pemodelan ancaman pada permukaan serangan cluster, autentikasi API server dan internal RBAC, kontrol admission dan policy as code, manajemen secret serta enkripsi etcd, isolasi workload, segmentasi jaringan dengan eBPF, verifikasi supply chain, deteksi ancaman runtime, hardening node, isolasi multi-tenant, audit kepatuhan, forensik cluster, dan capstone zero-trust."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Keamanan Kubernetes

## Ringkasan

Silabus lanjutan 12 minggu ini ditujukan bagi security engineer, platform engineer, dan SRE yang sudah menjalankan Kubernetes di produksi dan kini bertanggung jawab mempertahankannya. Kurikulum Kubernetes pada umumnya mengajarkan cara men-deploy workload; kursus ini mengajarkan cara membongkarnya, membatasinya, dan membuktikan bahwa cluster berperilaku sesuai harapan auditor. Kubernetes membawa default yang permisif di banyak titik — akses API anonim, service account yang terikat cluster-admin, jaringan pod yang terbuka lebar, image yang bisa berubah — dan setiap default tersebut merupakan jalur serangan di lingkungan nyata.

Kurikulum mengikuti model berlapis yang sama dengan yang dipakai penyerang. Minggu 1–3 membangun perimeter control plane: pemodelan ancaman cluster, hardening autentikasi dan otorisasi, serta penegakan keputusan pada tahap admission sehingga workload tidak aman tidak pernah berjalan. Minggu 4–7 mencakup bidang workload dan data: perlindungan secret serta enkripsi etcd, primitif isolasi tingkat pod, segmentasi jaringan dengan NetworkPolicy dan identitas berbasis eBPF, serta verifikasi supply chain dari sumber hingga container yang berjalan. Minggu 8–11 beralih ke deteksi dan operasi: deteksi ancaman runtime dengan eBPF dan mesin aturan bergaya Falco, hardening node dan kubelet terhadap benchmark CIS, rekayasa isolasi multi-tenant untuk cluster bersama, serta audit kepatuhan dan respons insiden dengan forensik cluster secara langsung. Minggu 12 adalah capstone ketika peserta merancang dan mempertahankan platform zero-trust terhadap latihan red team.

Setiap modul berbasis lab. Peserta bekerja dengan perkakas nyata — autentikasi berbasis OIDC, agregasi RBAC dan kebijakan audit, Pod Security Admission serta kebijakan Kyverno atau Gatekeeper, enkripsi etcd berbasis KMS, External Secrets dan Vault CSI, profil seccomp dan AppArmor, kebijakan jaringan dan identitas Cilium, verifikasi admission dengan cosign dan Sigstore, aturan deteksi Tetragon atau Falco, serta eksekusi hardening kube-bench — dan setiap lab diakhiri dengan upaya serangan yang harus gagal karena kontrol yang diterapkan peserta, bukan karena kebetulan.

## Kurikulum

### Modul 1: Pemodelan Ancaman pada Permukaan Serangan Kubernetes (Minggu 1)

- **Mengapa keamanan Kubernetes gagal di praktik nyata**
  - Model 4C: cloud, cluster, container, code — dan di mana tanggung jawab benar-benar berpindah
  - Pola pelanggaran umum: kubelet terekspos, service account dengan hak berlebih, image `latest` yang bisa berubah, dashboard tanpa autentikasi
  - Batas tanggung jawab bersama pada layanan terkelola (EKS, GKE, AKS) dibandingkan cluster yang dikelola sendiri
- **Memetakan permukaan serangan**
  - Endpoint control plane: API server, etcd, scheduler, controller manager, dan risiko eksposurnya
  - Permukaan tingkat node: port read-only dan read-write kubelet, socket container runtime, mount hostPath
  - Permukaan di dalam cluster: proyeksi token service account, admission webhook, CRD, dan hak istimewa operator
- **Pemodelan ancaman terstruktur**
  - Menyusun attack tree untuk tujuan representatif (eksfiltrasi data, crypto-mining, pergerakan lateral, persistence)
  - STRIDE yang diterapkan pada konstruksi Kubernetes; batas kepercayaan antar namespace, node, dan tenant
  - Mengubah model ancaman menjadi backlog kontrol yang dipetakan ke bagian CIS Benchmark
- **Lab Praktik**: Memodelkan ancaman pada cluster aplikasi tiga lapis, mengidentifikasi minimal sepuluh jalur serangan konkret beserta bukti dari perkakas (kube-bench, kube-hunter, Trivy), dan menghasilkan backlog kontrol yang berprioritas

### Modul 2: Autentikasi, Otorisasi, dan API Server (Minggu 2)

- **Pendalaman autentikasi**
  - Rantai autentikasi: sertifikat klien, token statis (dan mengapa harus dihapus), integrasi OIDC dan IAM cloud
  - Token service account: token lama berbasis secret dibanding token terproyeksi terikat dengan audience dan masa berlaku
  - Penekanan akses anonim, flag API server, dan penghapusan pola port tidak aman
- **Internal otorisasi**
  - Objek RBAC dan evaluasinya: Role, ClusterRole, binding, agregasi, serta model gabungan izin
  - Node authorizer, webhook authorizer, dan urutan keputusan otorisasi
  - Primitif eskalasi hak istimewa: `escalate`, `bind`, `impersonate`, `create pods/exec`, dan kemampuan membaca secret
- **Audit dan higiene identitas**
  - Tingkat dan tahap kebijakan audit; apa yang perlu dicatat tanpa tenggelam dalam kebisingan
  - Mendeteksi pemberian berisiko: verb wildcard, binding cluster-admin, penggunaan service account default
  - Impersonation untuk debugging tanpa membagikan kredensial
- **Lab Praktik**: Mengganti kredensial statis dengan grup OIDC, menyusun RBAC least-privilege untuk cluster tiga tim, dan membuktikan bahwa aksi yang sebelumnya hanya bisa dilakukan cluster-admin kini menghasilkan forbidden yang terlacak di log audit

### Modul 3: Kontrol Admission dan Policy as Code (Minggu 3)

- **Pipeline admission**
  - Alur permintaan: autentikasi → otorisasi → mutating admission → validating admission → etcd
  - Plugin admission bawaan, risiko konfigurasi webhook, dan trade-off failure policy
  - ValidatingAdmissionPolicy dengan CEL: kebijakan in-process tanpa webhook
- **Pod Security Admission**
  - Profil privileged, baseline, dan restricted; label namespace serta penyematan versi
  - Jalur migrasi dari PodSecurityPolicy yang sudah deprecated, termasuk kerusakan umum yang muncul
  - Pengecualian (exemption), dan mengapa exemption tingkat namespace berubah menjadi lubang permanen
- **Mesin kebijakan di produksi**
  - Kyverno dibanding OPA Gatekeeper: DSL dibanding Rego, mutasi dibanding validasi, audit dibanding enforce
  - Pengujian kebijakan, CI kebijakan, dan pengiriman kebijakan lewat GitOps dengan deteksi drift
  - Guardrail yang tidak menghambat respons insiden: namespace break-glass dan alur kerja pengecualian
- **Lab Praktik**: Menegakkan Pod Security Admission restricted di seluruh cluster, menambahkan kebijakan Kyverno atau Gatekeeper untuk provenance image dan batas resource wajib, lalu mencoba men-deploy pod privileged dengan hostPath dan menunjukkan penolakan beserta laporan pelanggaran yang bisa ditinjau

### Modul 4: Manajemen Secret dan Perlindungan Data (Minggu 4)

- **Dari mana secret bocor**
  - Base64 bukan enkripsi: secret di etcd, variabel environment, layer image, dan log CI
  - Jalur eksfiltrasi umum: `kubectl get secrets`, exec ke pod, volume yang ter-mount, dan pipeline backup
- **Enkripsi saat disimpan**
  - EncryptionConfiguration dan penyedia KMS untuk envelope encryption data etcd
  - Rotasi kunci, penulisan ulang secret yang ada, dan verifikasi ciphertext di etcd
  - Backup: melindungi snapshot etcd sebagai artefak paling bernilai di dalam cluster
- **Penyimpanan secret eksternal**
  - Pola External Secrets Operator dan driver Vault CSI; sinkronisasi dibanding mount
  - Kredensial berumur pendek: kredensial database dinamis, workload identity, dan akses tanpa secret
  - Strategi rotasi dan pengurangan blast radius ketika secret benar-benar bocor
- **Lab Praktik**: Mengaktifkan enkripsi etcd berbasis KMS dan memverifikasi ciphertext di disk, memindahkan secret hard-coded ke External Secrets dengan kebijakan rotasi 24 jam, dan membuktikan bahwa membaca secret dari pod yang telah dikompromikan kini hanya menghasilkan token berumur pendek

### Modul 5: Isolasi Workload dan Hardening Tingkat Pod (Minggu 5)

- **Primitif isolasi container**
  - Namespace, cgroups v2, capability, dan apa yang sebenarnya dibagi container dengan host
  - Esensi `securityContext`: `runAsNonRoot`, `readOnlyRootFilesystem`, capability yang di-drop, `allowPrivilegeEscalation`
  - Runtime class: runc, gVisor, Kata Containers — kekuatan isolasi dibanding kinerja
- **Mandatory access control**
  - Profil seccomp: RuntimeDefault, profil kustom dari syscall yang teramati, dan distribusi profil OCI
  - Penegakan AppArmor dan SELinux di Kubernetes; pengikatan profil per pod
  - User namespace dan kematangannya saat ini di cluster produksi
- **Rekayasa pembatasan**
  - Mencegah pemicu container escape: mode privileged, hostPID, hostNetwork, hostPath, dan socket docker
  - Batas resource sebagai kontrol keamanan: fork bomb, kehabisan memori, dan DoS akibat noisy neighbor
  - Ephemeral container untuk debugging yang aman tanpa melemahkan profil workload itu sendiri
- **Lab Praktik**: Mengambil deployment privileged lalu mengeraskannya ke profil restricted dengan profil seccomp dan AppArmor kustom, kemudian menjalankan teknik container escape terhadap kedua versi dan mendokumentasikan perbedaan hasilnya

### Modul 6: Keamanan Jaringan dan Segmentasi (Minggu 6)

- **Permukaan serangan jaringan Kubernetes**
  - Jaringan pod default yang allow-all, CIDR cluster yang datar, dan ekonomi pergerakan lateral
  - Permukaan terekspos: service LoadBalancer, NodePort, ingress controller, dan API server itu sendiri
  - DNS sebagai kanal eksfiltrasi dan penemuan
- **Penegakan kebijakan**
  - Semantik NetworkPolicy: default-deny, selector namespace, aturan egress, dan perbedaan dukungan CNI
  - Kebijakan berbasis identitas Cilium, kebijakan L7 dengan Cilium Network Policy, dan observabilitas datapath eBPF
  - Peluncuran kebijakan tanpa gangguan: mode audit, flow log, dan penegakan bertahap
- **Kepercayaan antar layanan**
  - mTLS dengan service mesh atau identitas berbasis SPIFFE; penerbitan dan rotasi sertifikat
  - Kontrol egress: kebijakan sadar-DNS, allowlist, dan pola proxy untuk dependensi eksternal
  - Hardening ingress: konfigurasi TLS, penempatan WAF, dan rate limiting sebagai kontrol ketersediaan
- **Lab Praktik**: Menerapkan default-deny untuk ingress dan egress, hanya mengizinkan graf dependensi aplikasi yang sebenarnya, lalu mencoba DNS tunneling dan akses lintas namespace dari pod yang dikompromikan dan menunjukkan keduanya terblokir beserta bukti flow

### Modul 7: Keamanan Supply Chain dan Kepercayaan Image (Minggu 7)

- **Dari sumber hingga container berjalan**
  - Integritas build: build yang reproducible, base image yang dipin, dan multi-stage build yang tidak mengirim toolchain
  - Pemindaian kerentanan di CI dan di dalam cluster (Trivy Operator) dengan gerbang severity yang realistis dipenuhi tim
  - Pembuatan SBOM (SPDX, CycloneDX) dan pemeliharaan inventaris untuk respons insiden
- **Penandatanganan dan provenance**
  - Sigstore: penandatanganan keyless cosign, sertifikat Fulcio, dan log transparansi Rekor
  - Tingkat provenance SLSA dan penyimpanan atestasi; memverifikasi apa yang sebenarnya membangun image
  - Verifikasi saat admission: policy-controller atau aturan Kyverno yang menolak image tak bertanda tangan atau tak terverifikasi
- **Hardening registry dan artefak**
  - Autentikasi registry privat, image pull secret, dan pencegahan pull dari registry yang tidak disetujui
  - Menghapus tag yang bisa berubah: pinning digest dan aturan admission yang mewajibkan digest
  - Merespons CVE upstream: menemukan workload terdampak dari data SBOM dan provenance
- **Lab Praktik**: Menandatangani image secara keyless dengan cosign, melampirkan SBOM dan atestasi provenance, menegakkan verifikasi tanda tangan saat admission, lalu mencoba men-deploy image tak bertanda tangan dan image bertag `latest` dan menunjukkan keduanya ditolak dengan pesan kesalahan yang bisa ditindaklanjuti

### Modul 8: Keamanan Runtime dan Deteksi Ancaman (Minggu 8)

- **Arsitektur deteksi**
  - Mengapa log audit saja tidak cukup; visibilitas tingkat kernel dengan eBPF (Tetragon, Cilium) dan mesin aturan Falco
  - Sumber sinyal: eksekusi proses, akses file, koneksi jaringan, anomali syscall, peristiwa audit Kubernetes
  - Pipeline deteksi: agen → perutean alert → pengayaan dengan konteks Kubernetes → triase
- **Menulis deteksi yang bertahan lama**
  - Aturan bersinyal tinggi: shell di dalam container, `curl` tak terduga ke host eksternal, nama proses crypto-mining, lonjakan pembacaan secret
  - Menyetel false positive tanpa mematikan kontrol; pengecualian yang dibatasi per namespace dan image
  - Memetakan deteksi ke MITRE ATT&CK for Containers
- **Otomasi respons**
  - Pola karantina: isolasi jaringan lewat kebijakan, cordon dan drain, serta trade-off penghapusan pod
  - Respons otomatis dengan remediasi berbasis admission atau operator, serta pengaman agar otomasi tidak lepas kendali
  - Ekonomi kelelahan alert: anggaran volume alert dan desain eskalasi
- **Lab Praktik**: Men-deploy stack deteksi runtime, menulis tiga aturan kustom, menjalankan rangkaian simulasi pasca-eksploitasi (reverse shell, pembacaan kredensial, callback eksternal), dan menunjukkan alert dengan konteks Kubernetes lengkap beserta aksi karantina otomatis

### Modul 9: Hardening Node, Kubelet, dan Control Plane (Minggu 9)

- **Hardening berbasis benchmark**
  - Struktur CIS Kubernetes Benchmark; menjalankan kube-bench dan menafsirkan hasilnya secara jujur
  - Kendala layanan terkelola: kontrol mana yang bisa dan tidak bisa diterapkan
  - Kepatuhan berkelanjutan: pemindaian terjadwal, deteksi drift, dan kepemilikan remediasi
- **Keamanan kubelet dan node**
  - Flag kubelet yang penting: auth anonim, mode otorisasi, port read-only, dan rotasi sertifikat
  - Pilihan sistem operasi node: image minimal yang immutable (Bottlerocket, Talos), irama patch, dan kebijakan SSH hanya untuk break-glass
  - Perlindungan filesystem host dan socket runtime; mencegah mount hostPath dan socket lewat kebijakan
- **Perlindungan control plane**
  - Siklus hidup sertifikat: rotasi CA, sertifikat serving kubelet, dan pemantauan masa berlaku
  - Hardening etcd: TLS peer, autentikasi klien, isolasi jaringan, enkripsi snapshot, dan latihan restore
  - Eksposur API server: endpoint privat, jaringan terotorisasi, dan pemisahan lalu lintas administratif dari lalu lintas workload
- **Lab Praktik**: Menjalankan kube-bench pada sebuah node, memperbaiki minimal lima kontrol yang gagal, mengeraskan konfigurasi kubelet, memverifikasi rotasi sertifikat, dan memulihkan cluster dari snapshot etcd terenkripsi

### Modul 10: Multi-Tenancy dan Rekayasa Isolasi (Minggu 10)

- **Model tenancy**
  - Soft multi-tenancy dengan namespace, kuota, dan kebijakan dibanding isolasi keras dengan node pool khusus atau virtual cluster
  - Biaya, beban operasional, dan blast radius tiap model; desain hibrida untuk tingkat kepercayaan campuran
  - Di mana batas tenancy bocor: resource tingkat cluster, CRD, API teragregasi, dan admission webhook
- **Kontrol isolasi**
  - ResourceQuota dan LimitRange sebagai kontrol ketersediaan; mencegah DoS berbasis kuota
  - Lingkup RBAC per tenant, termasuk mencegah tenant membuat role berhak istimewa
  - Isolasi jaringan per tenant, dan visibilitas lintas tenant melalui backend observabilitas bersama
- **Siklus hidup tenant dan self-service**
  - Penyediaan tenant dengan GitOps dan set kebijakan yang dihasilkan; checklist onboarding
  - Jejak audit per tenant, chargeback, dan pengumpulan bukti untuk audit tenant
  - Offboarding: mencabut kredensial, menghapus data, dan membuktikan penghapusan
- **Lab Praktik**: Membangun cluster tiga tenant dengan satu tenant tak tepercaya yang diisolasi pada node pool khusus, mencoba serangan lintas tenant (eskalasi RBAC, jangkauan jaringan, penyalahgunaan webhook), dan mendokumentasikan setiap jalur yang terblokir beserta kontrol yang menegakkannya

### Modul 11: Kepatuhan, Audit, dan Forensik Cluster (Minggu 11)

- **Rekayasa kepatuhan**
  - Memetakan kontrol ke framework: CIS, SOC 2, PCI DSS, HIPAA, dan tumpang tindih tanggung jawab bersama
  - Otomasi bukti: laporan kebijakan, log audit, inventaris SBOM, dan tinjauan akses
  - Pemantauan kontrol berkelanjutan dan mode kegagalan snapshot audit sekali jalan
- **Audit dan observabilitas untuk keamanan**
  - Merancang kebijakan audit yang menangkap kegagalan autentikasi, perubahan RBAC, akses secret, dan sesi exec
  - Mengirim log audit ke backend immutable; retensi dan ketahanan terhadap manipulasi
  - Mengorelasikan peristiwa cluster dengan log cloud dan penyedia identitas selama investigasi
- **Respons insiden dan forensik**
  - Struktur runbook: deteksi, pembatasan lingkup, penahanan, pemberantasan, pemulihan, dan tinjauan pasca-insiden
  - Forensik langsung di container: menangkap pohon proses, memori, diff filesystem, dan status jaringan sebelum penghapusan
  - Menjaga bukti sambil menghentikan serangan; legal hold dan dasar rantai kustodi
- **Lab Praktik**: Menerapkan kebijakan audit yang menangkap kelas peristiwa wajib, mensimulasikan pod yang dikompromikan, dan menjalankan runbook insiden secara lengkap — mengumpulkan bukti, menahan beban kerja, mengidentifikasi vektor akses awal dari log, dan menghasilkan laporan pasca-insiden tertulis

### Modul 12: Desain Platform Zero-Trust dan Capstone Red Team (Minggu 12)

- **Merancang platform yang bisa dipertahankan**
  - Arsitektur referensi: control plane terkeraskan, supply chain terverifikasi, guardrail kebijakan, segmentasi, deteksi, dan respons
  - Desain mengutamakan identitas: workload identity, kredensial berumur pendek, dan least privilege sebagai default, bukan hasil tinjauan
  - Mendokumentasikan risiko residual dan pengecualian yang diterima beserta pemilik dan tanggal kedaluwarsanya
- **Membuktikan bahwa itu berhasil**
  - Desain latihan purple team: skenario serangan, kriteria keberhasilan, dan pengukuran cakupan deteksi
  - Metrik yang penting: mean time to detect, tingkat pelanggaran kebijakan, persentase workload bertanda tangan, eksposur kritis yang belum ditambal
  - Mengomunikasikan postur keamanan kepada pimpinan teknis tanpa melebih-lebihkan cakupan
- **Capstone**
  - Membangun dan mempertahankan cluster multi-tenant zero-trust terhadap rangkaian skenario serangan terskrip
  - Deliverable: arsitektur, model ancaman, set kebijakan, aturan deteksi, runbook insiden, dan laporan cakupan yang menunjukkan serangan mana yang terblokir, terdeteksi, atau terlewat
- **Lab Praktik**: Menjalankan skenario red team terhadap platform sendiri, menilai setiap upaya sebagai terblokir, terdeteksi, atau berhasil, memperbaiki celah yang ditemukan pada sesi yang sama, dan mempresentasikan laporan cakupan akhir

## Proyek Akhir

Peserta membangun dan mempertahankan platform Kubernetes yang aman dan siap produksi, lalu membuktikan posturnya dengan bukti terukur, bukan klaim konfigurasi.

Platform harus mencakup: control plane terkeraskan dengan autentikasi berbasis OIDC, RBAC least-privilege, dan akses API non-anonim; enkripsi etcd berbasis KMS dengan restore yang sudah diuji; guardrail admission wajib (Pod Security Admission restricted ditambah policy-as-code untuk provenance image, batas resource, dan akses host yang dilarang); secret yang dieksternalisasi dengan rotasi otomatis; kebijakan jaringan default-deny dengan graf izin eksplisit dan kontrol egress; supply chain terverifikasi yang hanya menjalankan image bertanda tangan dan terpin digest; deteksi runtime dengan minimal lima aturan yang sudah disetel dan satu aksi penahanan otomatis; bukti remediasi kube-bench; serta model isolasi tiga tenant dengan satu tenant tak tepercaya.

Deliverable penentunya adalah laporan cakupan dari latihan capstone: rangkaian skenario serangan terskrip — penyalahgunaan token service account yang terekspos, upaya pod privileged, container escape, pergerakan lateral, deployment image tak bertanda tangan, eksfiltrasi secret, DNS tunneling — masing-masing dinilai sebagai terblokir, terdeteksi, atau berhasil, dengan menyebutkan kontrol yang menegakkan atau aturan deteksi yang menangkapnya. Setiap serangan yang berhasil harus memiliki remediasi terdokumentasi yang sudah masuk ke platform sebelum proyek dinyatakan diterima.

## Kriteria Penilaian

- **Tugas**: Lab praktik mingguan dari Modul 1–11, dikumpulkan sebagai manifest, berkas kebijakan, aturan deteksi, dan tulisan bukti singkat. Dinilai berdasarkan apakah kontrol benar-benar menegakkan perilaku yang dimaksud saat ada upaya serangan, serta kejelasan bukti yang dihasilkan.
- **Kuis Modul**: Kuis singkat setelah setiap fase (setelah Minggu 3, 7, dan 11) yang mencakup pipeline admission, evaluasi RBAC dan primitif eskalasi, secret dan enkripsi etcd, semantik kebijakan jaringan, verifikasi supply chain, dan prosedur respons insiden.
- **Proyek Akhir**: Dievaluasi berdasarkan cakupan dan ketepatan kontrol berlapis, kualitas model isolasi saat menghadapi serangan lintas tenant, kualitas sinyal deteksi (true positive yang dipertahankan, tingkat false positive yang didokumentasikan), kesiapan respons insiden, serta kejujuran dan ketelitian laporan cakupan. Platform dinyatakan lulus jika setiap serangan terskrip terblokir atau terdeteksi dengan bukti yang dikutip, dan celah yang tersisa didokumentasikan secara eksplisit beserta rencana remediasi. Platform yang hanya bergantung pada satu lapis kontrol, atau melaporkan cakupan yang tidak bisa dibuktikan, tidak lulus.

## Referensi

- Dokumentasi Kubernetes — Authentication, Authorization, Admission Control, Pod Security Standards, Network Policies, Encryption at Rest
- NSA/CISA Kubernetes Hardening Guide — panduan kontrol untuk lapisan cluster, node, dan workload
- CIS Kubernetes Benchmark dan kube-bench — struktur benchmark dan penilaian otomatis
- Dokumentasi Kyverno dan OPA Gatekeeper — penulisan kebijakan, pengujian, dan pola penegakan
- ValidatingAdmissionPolicy (CEL) — dokumentasi Kubernetes tentang kebijakan admission in-process
- External Secrets Operator dan HashiCorp Vault CSI Provider — sinkronisasi secret dan kredensial berumur pendek
- Dokumentasi Cilium — kebijakan berbasis identitas, datapath eBPF, dan kebijakan jaringan L7
- Sigstore, cosign, dan SLSA — penandatanganan image, log transparansi, dan provenance build
- Dokumentasi Falco dan Tetragon — aturan deteksi ancaman runtime dan observabilitas berbasis eBPF
- MITRE ATT&CK for Containers — taktik penyerang yang dipetakan ke telemetri Kubernetes
- Bottlerocket dan Talos — sistem operasi node minimal yang immutable
