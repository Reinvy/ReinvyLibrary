---
title: "Panduan Troubleshooting Kubernetes"
description: "Panduan praktis untuk troubleshooting sistematis pada masalah cluster dan aplikasi Kubernetes — termasuk crash pod, kegagalan node, masalah jaringan, keterbatasan sumber daya, masalah persistent volume, dan strategi debugging untuk skenario kegagalan umum."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Troubleshooting Kubernetes

## Pendahuluan

Kubernetes adalah sistem terdistribusi yang kompleks di mana kegagalan dapat berasal dari lapisan mana pun — kontainer aplikasi, runtime Pod, sistem operasi node, control plane, atau infrastruktur jaringan yang mendasarinya. Ketika terjadi kesalahan, sifat terdistribusi dari Kubernetes menyebabkan gejala sering muncul jauh dari akar penyebabnya. Panduan ini menyediakan metodologi sistematis dan dapat diulang untuk mendiagnosis dan menyelesaikan kegagalan Kubernetes yang umum, mulai dari crash tingkat aplikasi hingga masalah control plane di seluruh cluster. Baik Anda men-debug satu CrashLoopBackOff atau menyelidiki kegagalan DNS di seluruh cluster, teknik dan alat yang dibahas di sini akan membantu Anda mengidentifikasi akar penyebab lebih cepat dan mengurangi mean time to recovery (MTTR).

## Praktik Terbaik

### Metodologi Troubleshooting Sistematis

Gunakan pendekatan debugging berlapis — mulai dari resource yang paling spesifik (Pod) dan bekerja ke luar menuju infrastruktur cluster:

```text
1. Pod/Kontainer — log, events, describe
2. Service/Endpoint — resolusi DNS, konektivitas
3. Node — kubelet, sumber daya sistem, log kubelet
4. Control Plane — API server, scheduler, controller manager, etcd
5. Infrastruktur — CNI, CSI, cloud provider, jaringan yang mendasari
```

Selalu periksa events resource terlebih dahulu (`kubectl describe` dan `kubectl get events`). Events berisi informasi diagnostik yang paling dapat ditindaklanjuti dan sering terlewatkan oleh operator baru.

### Troubleshooting Tingkat Pod

**CrashLoopBackOff**: Kontainer dimulai dan berulang kali keluar. Periksa hal berikut secara berurutan:

1. Periksa kode keluar kontainer melalui `kubectl describe pod <pod>` — kode keluar 137 (SIGKILL) menunjukkan terminasi OOM; kode keluar 139 (SIGSEGV) menunjukkan segmentation fault; kode keluar 1 atau 127 biasanya menunjukkan miskonfigurasi aplikasi.
2. Lihat log terbaru dari percobaan terakhir: `kubectl logs --previous <pod> -c <container>`.
3. Periksa batas resource — kontainer mungkin mencapai batas memorinya (OOMKilled).
4. Verifikasi referensi ConfigMap dan Secret — referensi yang hilang atau salah nama mencegah kontainer untuk memulai.
5. Validasi konfigurasi readiness dan liveness probe — probe yang terlalu agresif dapat me-restart kontainer sebelum menyelesaikan inisialisasi.

**ImagePullBackOff / ErrImagePull**: Kubelet tidak dapat menarik image kontainer.

1. Verifikasi nama image dan tag ada di registry: `kubectl describe pod <pod>` menunjukkan image persis yang ditarik.
2. Periksa image pull secrets: `kubectl get secrets` dan verifikasi `imagePullSecrets` di spesifikasi Pod.
3. Konfirmasi node memiliki akses jaringan ke container registry.
4. Periksa batas rate registry — Docker Hub dan registry publik lainnya memberlakukan batas pull rate.

**OOMKilled / RunContainerError**: Kontainer dihentikan karena melampaui batas memorinya.

1. Tingkatkan batas memory sementara untuk mengonfirmasi masalah terkait OOM.
2. Analisis pola penggunaan memori dengan `kubectl top pod <pod>`.
3. Pertimbangkan untuk menyetel memory requests sama dengan limits (QoS Guaranteed) untuk kontainer kritis.
4. Profil kebocoran memori pada kode aplikasi daripada menaikkan batas tanpa batas.

**Pending Pod**: Pod tidak dapat dijadwalkan ke node.

1. Jalankan `kubectl describe pod <pod>` dan cari events dengan alasan `FailedScheduling` atau `UnexpectedAdmissionError`.
2. Periksa resource yang tidak mencukupi (CPU, memory, penyimpanan ephemeral) di semua node yang tersedia.
3. Verifikasi taints dan tolerations — jika node memiliki taint, Pod harus memiliki toleration yang cocok.
4. Periksa node selector dan aturan affinity — batasan yang bertentangan dapat membuat Pod tidak dapat dijadwalkan.
5. Verifikasi bahwa PersistentVolumeClaim (PVC) yang direferensikan oleh Pod sudah terikat (tidak stuck di Pending).

### Troubleshooting Tingkat Node

**Node NotReady**: Kubelet di node berhenti melaporkan heartbeat ke control plane.

1. SSH ke node dan periksa status kubelet: `systemctl status kubelet`.
2. Lihat log kubelet: `journalctl -u kubelet -n 100 --no-pager`.
3. Periksa tekanan disk: `df -h` dan verifikasi node memiliki ruang disk kosong yang cukup.
4. Periksa tekanan memori: `free -m` dan verifikasi node memiliki memori yang tersedia.
5. Verifikasi container runtime (containerd, CRI-O, Docker) berjalan: `systemctl status containerd`.
6. Periksa status plugin CNI — plugin CNI yang gagal dapat mencegah kubelet menandai node sebagai Ready.

**Disk Pressure**: Ruang disk yang tersedia di node turun di bawah ambang batas `eviction-hard`.

1. Identifikasi penggunaan ruang disk: `df -h` dan `du -sh /var/lib/* | sort -rh`.
2. Periksa image kontainer yang tidak digunakan: `crictl images` atau `nerdctl images`.
3. Hapus image yang tidak digunakan: `crictl rmi --prune`.
4. Identifikasi dan bersihkan file log besar di `/var/log/`.
5. Tingkatkan ambang batas eviction di konfigurasi kubelet jika perlu, atau tambah penyimpanan node.

**Memory Pressure**: Memori yang tersedia di node turun di bawah ambang batas eviction.

1. Identifikasi proses yang haus memori: `top -o %MEM` atau `ps aux --sort=-%mem`.
2. Periksa memori yang dicadangkan sistem versus memori yang diminta kontainer.
3. Cari Pod yang melampaui batas memorinya — Pod ini mungkin telah di-evict.
4. Periksa `kubectl describe node <node>` untuk kondisi `MemoryPressure`.
5. Pertimbangkan untuk menambah node worker atau mendistribusikan ulang workload.

### Troubleshooting Jaringan

**Gagal Resolusi DNS**: Pod tidak dapat menyelesaikan nama service atau domain eksternal.

1. Verifikasi Pod CoreDNS berjalan: `kubectl get pods -n kube-system -l k8s-app=kube-dns`.
2. Periksa log CoreDNS: `kubectl logs -n kube-system -l k8s-app=kube-dns`.
3. Uji DNS dari dalam Pod: `kubectl exec -it <pod> -- nslookup kubernetes.default`.
4. Periksa ConfigMap CoreDNS untuk server DNS upstream kustom atau stub domain.
5. Verifikasi bahwa network policy tidak memblokir lalu lintas DNS (port 53 UDP/TCP ke Pod CoreDNS).
6. Periksa `/etc/resolv.conf` node — CoreDNS meneruskan ke server DNS upstream yang dikonfigurasi di node.

**Masalah Konektivitas Service**: Service tidak dapat dijangkau dari Pod lain atau dari luar cluster.

1. Verifikasi keberadaan endpoint: `kubectl get endpoints <service>` — jika endpoint kosong, label selector tidak cocok dengan Pod mana pun.
2. Periksa `targetPort` Service cocok dengan `containerPort` kontainer.
3. Uji konektivitas langsung ke IP Pod melewati Service: `kubectl run tmp --rm -it --image=busybox -- wget -O- <pod-ip>:<port>`.
4. Verifikasi kube-proxy berjalan di node: `kubectl get pods -n kube-system -l k8s-app=kube-proxy`.
5. Periksa aturan iptables di node: `iptables -t nat -L KUBE-SERVICES` — kube-proxy mengelola aturan ini.
6. Untuk service NodePort, verifikasi firewall node mengizinkan lalu lintas pada rentang NodePort (30000-32767).

**Blokir Network Policy**: Lalu lintas yang seharusnya diizinkan secara diam-diam dijatuhkan.

1. Daftar semua NetworkPolicy di namespace: `kubectl get networkpolicies -n <namespace>`.
2. Gunakan `kubectl describe networkpolicy <policy>` untuk mengonfirmasi podSelector dan policyTypes.
3. Ingat perilaku default: jika ada NetworkPolicy yang memilih Pod, semua lalu lintas yang tidak diizinkan secara eksplisit akan ditolak (default-deny).
4. Gunakan `kubectl run tmp --rm -it --image=nicolaka/netshoot` untuk debugging jaringan dari dalam cluster.

**Ingress Tidak Berfungsi**: Lalu lintas eksternal tidak mencapai aplikasi.

1. Periksa resource Ingress: `kubectl describe ingress <ingress>` — verifikasi host dan service backend.
2. Verifikasi Ingress controller berjalan: `kubectl get pods -n ingress-nginx` (atau namespace yang sesuai untuk controller Anda).
3. Periksa log Ingress controller untuk kesalahan routing.
4. Verifikasi resolusi DNS untuk hostname Ingress mengarah ke IP LoadBalancer atau node port Ingress controller.
5. Periksa validitas sertifikat TLS jika menggunakan HTTPS — sertifikat kedaluwarsa atau self-signed menyebabkan kesalahan browser.
6. Untuk cloud LoadBalancer, verifikasi path health check mengembalikan respons 200 OK.

### Troubleshooting Penyimpanan

**PVC Pending**: PersistentVolumeClaim tidak terikat ke PersistentVolume.

1. Periksa status PVC: `kubectl describe pvc <pvc>` — cari `waiting for first consumer` (jika menggunakan mode binding `WaitForFirstConsumer`) atau `no persistent volumes available`.
2. Verifikasi bahwa PV dengan storage class, access mode, dan kapasitas yang cocok tersedia: `kubectl get pv`.
3. Periksa StorageClass ada dan memiliki provisioner yang dikonfigurasi: `kubectl get storageclass`.
4. Untuk provisioning dinamis, verifikasi driver CSI terinstal dan berjalan.
5. Periksa status node untuk disk pressure jika menggunakan volume lokal.

**Pod Stuck di ContainerCreating dengan Error Mount Volume**:

1. Jalankan `kubectl describe pod <pod>` dan cari events terkait volume.
2. Verifikasi PVC yang direferensikan ada dan terikat.
3. Periksa bahwa Pod driver CSI sehat: `kubectl get pods -n kube-system | grep csi`.
4. Konfirmasi node memiliki binary driver CSI yang diperlukan.
5. Untuk volume ReadWriteMany, verifikasi volume mendukung akses multi-node.

**Miskonfigurasi ReadOnlyMany / ReadWriteOnce**:

1. Verifikasi access mode PVC sesuai dengan kebutuhan aplikasi — Pod tidak dapat me-mount volume `ReadWriteOnce` di beberapa node secara bersamaan.
2. Jika StatefulSet memiliki beberapa replika, pastikan setiap replika me-mount PVC sendiri atau gunakan volume `ReadWriteMany`.
3. Periksa bahwa access mode PV tidak berubah setelah pembuatan — access mode bersifat immutable.

### Troubleshooting Control Plane

**API Server Tidak Dapat Dijangkau**: Perintah `kubectl` gagal dengan pesan connection refused atau timeout.

1. Periksa proses API server: di node control plane, jalankan `systemctl status kube-apiserver`.
2. Lihat log API server: `journalctl -u kube-apiserver -n 100 --no-pager`.
3. Verifikasi kesehatan etcd: `etcdctl endpoint health --cluster` — cluster etcd yang gagal akan menonaktifkan API server.
4. Periksa kedaluwarsa sertifikat TLS: `openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -dates`.
5. Verifikasi bahwa API server dapat mencapai etcd: `etcdctl endpoint status --cluster --write-out=table`.
6. Periksa resource API server yang habis — kinerja etcd menurun ketika jumlah objek melebihi batas yang direkomendasikan (10.000 objek per namespace default).

**Scheduler Tidak Menjadwalkan Pod**:

1. Verifikasi scheduler berjalan: `kubectl get pods -n kube-system -l component=kube-scheduler`.
2. Periksa log scheduler untuk kesalahan: `kubectl logs -n kube-system -l component=kube-scheduler`.
3. Konfirmasi leader election scheduler berfungsi — hanya satu instance scheduler yang harus aktif.
4. Periksa kekurangan resource di semua node: `kubectl describe nodes | grep -A 5 "Allocated resources"`.
5. Verifikasi bahwa tidak ada PriorityClass atau Pod Disruption Budget yang memblokir penjadwalan.
6. Jika menggunakan konfigurasi scheduler kustom, validasi kebijakan scheduler dan konfigurasi plugin.

**Masalah etcd**:

1. Periksa kesehatan cluster etcd: `etcdctl endpoint health --cluster` — semua anggota harus melaporkan `healthy`.
2. Verifikasi daftar anggota etcd: `etcdctl member list --write-out=table` — konfirmasi semua anggota terhubung.
3. Periksa kinerja disk etcd — etcd sensitif terhadap latensi write disk. Sebagian besar operasi etcd selesai dalam 10ms.
4. Monitor ukuran basis data etcd: `etcdctl endpoint status --write-out=table` — ukuran basis data maksimum default adalah 2 GB (8 GB di v3.5+).
5. Compact dan defrag basis data etcd: `etcdctl compact <revision>` diikuti dengan `etcdctl defrag`.
6. Verifikasi konektivitas jaringan antar anggota etcd — latensi harus di bawah 10ms antar anggota.

**Kedaluwarsa Sertifikat**:

1. Periksa tanggal kedaluwarsa sertifikat: `kubeadm certs check-expiration` (jika menggunakan kubeadm).
2. Perbarui sertifikat: `kubeadm certs renew all` diikuti dengan me-restart komponen control plane.
3. Monitor kedaluwarsa sertifikat di stack observability Anda — sertifikat kubelet dan API server biasanya berlaku selama satu tahun.
4. Pertimbangkan menggunakan API `CertificateSigningRequest` (CSR) untuk rotasi sertifikat kubelet otomatis.

## Langkah Implementasi

### Langkah 1: Kumpulkan Informasi Diagnostik Awal

1. Jalankan `kubectl get events --all-namespaces --sort-by='.lastTimestamp'` untuk melihat semua events cluster yang diurutkan berdasarkan waktu.
1. Identifikasi resource yang bermasalah: `kubectl get pods --all-namespaces | grep -E '(CrashLoop|Error|Pending|Init:)'`.
1. Periksa kesehatan node: `kubectl get nodes` dan `kubectl describe nodes | grep -E "(Conditions|Allocated resources)"`.
1. Kumpulkan konteks cluster: `kubectl cluster-info` dan `kubectl version`.
1. Simpan output diagnostik ke file untuk analisis:
   ```bash
   kubectl get all --all-namespaces -o wide > /tmp/k8s-all-resources.txt
   kubectl get events --all-namespaces > /tmp/k8s-events.txt
   kubectl describe nodes > /tmp/k8s-nodes.txt
   ```

### Langkah 2: Diagnosa Masalah Tingkat Aplikasi

1. Untuk setiap Pod yang gagal, jalankan `kubectl describe pod <pod> -n <namespace>` dan catat bagian `Conditions` dan `Events`.
1. Lihat log kontainer: `kubectl logs <pod> -c <container> -n <namespace> --tail=100`.
1. Jika Pod dalam status CrashLoopBackOff, gunakan `kubectl logs --previous <pod> -c <container> -n <namespace>` untuk melihat log dari kontainer yang terakhir dihentikan.
1. Uji endpoint kesehatan aplikasi dari dalam cluster:
   ```bash
   kubectl run debug --rm -it --image=curlimages/curl -- sh
   curl http://<service-name>.<namespace>.svc.cluster.local:<port>/health
   ```
1. Periksa bahwa ConfigMap dan Secret ter-mount dengan benar:
   ```bash
   kubectl exec -it <pod> -- cat /path/to/mounted/config
   kubectl exec -it <pod> -- env | grep <NAMA_SECRET>
   ```

### Langkah 3: Diagnosa Masalah Service dan Jaringan

1. Verifikasi endpoint terisi: `kubectl get endpoints <service> -n <namespace>`.
1. Uji resolusi DNS dari dalam Pod:
   ```bash
   kubectl run dns-test --rm -it --image=busybox:1.28 -- nslookup <service-name>
   ```
1. Uji konektivitas langsung antar Pod:
   ```bash
   kubectl run net-test --rm -it --image=nicolaka/netshoot -- bash
   curl -v http://<ip-pod-target>:<port>
   ```
1. Periksa CoreDNS sehat: `kubectl get pods -n kube-system -l k8s-app=kube-dns`.
1. Tinjau log CoreDNS untuk kegagalan resolusi DNS:
   ```bash
   kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
   ```
1. Verifikasi kube-proxy berjalan di setiap node: `kubectl get pods -n kube-system -l k8s-app=kube-proxy`.
1. Periksa network policy di namespace:
   ```bash
   kubectl get networkpolicies -n <namespace>
   kubectl describe networkpolicy <policy> -n <namespace>
   ```

### Langkah 4: Diagnosa Masalah Tingkat Node

1. Identifikasi node yang tidak sehat: `kubectl get nodes | grep -v Ready`.
1. Untuk setiap node yang tidak sehat, SSH masuk dan periksa kubelet:
   ```bash
   systemctl status kubelet
   journalctl -u kubelet -n 200 --no-pager
   ```
1. Periksa sumber daya sistem di node:
   ```bash
   df -h            # penggunaan disk
   free -m          # penggunaan memori
   top -o %CPU      # penggunaan CPU
   ```
1. Verifikasi container runtime sehat:
   ```bash
   crictl ps            # daftar kontainer yang berjalan (containerd)
   crictl info          # informasi container runtime
   systemctl status containerd
   ```
1. Periksa status plugin CNI — cari file konfigurasi `cni` di `/etc/cni/net.d/`.
1. Drain dan cordon node yang bermasalah untuk memindahkan workload:
   ```bash
   kubectl cordon <node>
   kubectl drain <node> --ignore-daemonsets --delete-emptydir-data
   ```

### Langkah 5: Diagnosa Masalah Control Plane

1. Periksa kesehatan Pod control plane: `kubectl get pods -n kube-system`.
1. Verifikasi jangkauan API server:
   ```bash
   curl -k https://localhost:6443/healthz
   kubectl get --raw=/healthz
   ```
1. Periksa kesehatan cluster etcd dari node control plane:
   ```bash
   ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
     --cacert=/etc/kubernetes/pki/etcd/ca.crt \
     --cert=/etc/kubernetes/pki/etcd/server.crt \
     --key=/etc/kubernetes/pki/etcd/server.key \
     endpoint health
   ```
1. Verifikasi scheduler dan controller manager berfungsi:
   ```bash
   kubectl get leases -n kube-system  # status leader election
   kubectl logs -n kube-system -l component=kube-scheduler --tail=20
   kubectl logs -n kube-system -l component=kube-controller-manager --tail=20
   ```
1. Periksa tanggal kedaluwarsa sertifikat:
   ```bash
   kubeadm certs check-expiration  # cluster yang dikelola kubeadm
   ```
1. Periksa log audit API server untuk kegagalan autentikasi atau otorisasi:
   ```bash
   grep "Forbidden\|Unauthorized" /var/log/kubernetes/audit.log | tail -20
   ```

### Langkah 6: Bangun Kontainer Debug yang Dapat Digunakan Kembali

Untuk pekerjaan debugging yang persisten, deploy Pod debugging dengan alat jaringan yang terinstal:

```bash
kubectl run debug --image=nicolaka/netshoot --restart=Never -- sleep infinity
```

Perintah umum dari kontainer netshoot:

```text
curl, wget, dig, nslookup, nmap, tcpdump, iperf, netstat,
ss, ip, ifconfig, traceroute, mtr, ping, htop, strace
```

Untuk debugging penyimpanan, lampirkan kontainer debug ke Pod yang berjalan menggunakan ephemeral containers (Kubernetes v1.23+):

```bash
kubectl debug <pod> -n <namespace> --image=nicolaka/netshoot --target=<container>
```

Ini menyuntikkan kontainer sidecar ke dalam network namespace Pod, memungkinkan Anda men-debug masalah jaringan tanpa me-restart aplikasi.

### Langkah 7: Bangun Proses Post-Mortem

Setelah menyelesaikan insiden, dokumentasikan hal berikut di runbook tim Anda:

1. Apa gejalanya (dampak yang dirasakan pengguna)?
1. Apa akar penyebabnya?
1. Bagaimana masalah terdeteksi (alert, laporan manual)?
1. Apa solusinya (urutan perintah, perubahan konfigurasi)?
1. Celah monitoring atau alerting apa yang memungkinkan masalah meningkat?
1. Tindakan pencegahan apa yang dapat diimplementasikan (tes otomatis, penegakan kebijakan, chaos engineering)?

Pertahankan runbook troubleshooting bersama di repositori GitOps Anda dengan langkah resolusi yang terdokumentasi untuk setiap pola kegagalan yang berulang. Seiring waktu, ini menjadi aset operasional paling berharga tim Anda.
