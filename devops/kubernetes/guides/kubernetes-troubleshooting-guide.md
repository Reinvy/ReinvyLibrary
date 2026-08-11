---
title: "Kubernetes Troubleshooting Guide"
description: "A practical guide covering systematic troubleshooting of Kubernetes cluster and application issues — including pod crashes, node failures, networking problems, resource constraints, persistent volume issues, and debugging strategies for common failure scenarios."
category: "devops"
technology: "kubernetes"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Kubernetes Troubleshooting Guide

## Introduction

Kubernetes is a complex distributed system where failures can originate from any layer — the application container, the Pod runtime, the node operating system, the control plane, or the underlying network infrastructure. When something goes wrong, the distributed nature of Kubernetes means that symptoms often appear far from the root cause. This guide provides a systematic, repeatable methodology for diagnosing and resolving common Kubernetes failures, from application-level crashes to cluster-wide control plane issues. Whether you are debugging a single CrashLoopBackOff or investigating a cluster-wide DNS outage, the techniques and tools covered here will help you identify root causes faster and reduce mean time to recovery (MTTR).

## Best Practices

### Systematic Troubleshooting Methodology

Adopt a layered debugging approach — start from the most specific resource (the Pod) and work outward to the cluster infrastructure:

```text
1. Pod/Container — logs, events, describe
2. Service/Endpoint — DNS resolution, connectivity
3. Node — kubelet, system resources, kubelet logs
4. Control Plane — API server, scheduler, controller manager, etcd
5. Infrastructure — CNI, CSI, cloud provider, underlying network
```

Always check resource events first (`kubectl describe` and `kubectl get events`). Events contain the most actionable diagnostic information and are frequently missed by new operators.

### Pod-Level Troubleshooting

**CrashLoopBackOff**: The container starts and repeatedly exits. Check the following in order:

1. Inspect the container exit code via `kubectl describe pod <pod>` — exit code 137 (SIGKILL) indicates OOM termination; exit code 139 (SIGSEGV) indicates a segmentation fault; exit code 1 or 127 usually indicates application misconfiguration.
2. View recent logs from the last attempt: `kubectl logs --previous <pod> -c <container>`.
3. Check resource limits — the container may be hitting its memory limit (OOMKilled).
4. Verify ConfigMap and Secret references — missing or misnamed references prevent the container from starting.
5. Validate readiness and liveness probe configuration — overly aggressive probes can restart containers before they finish initialization.

**ImagePullBackOff / ErrImagePull**: The kubelet cannot pull the container image.

1. Verify the image name and tag exist in the registry: `kubectl describe pod <pod>` shows the exact image being pulled.
2. Check image pull secrets: `kubectl get secrets` and verify `imagePullSecrets` in the Pod spec.
3. Confirm the node has network access to the container registry.
4. Check the registry rate limits — Docker Hub and other public registries impose pull rate limits.

**OOMKilled / RunContainerError**: The container was terminated for exceeding its memory limit.

1. Increase memory limits temporarily to confirm the issue is OOM-related.
2. Analyze memory usage patterns with `kubectl top pod <pod>`.
3. Consider setting memory requests equal to limits (Guaranteed QoS) for critical containers.
4. Profile memory leaks in the application code rather than indefinitely raising limits.

**Pending Pod**: The Pod cannot be scheduled onto a node.

1. Run `kubectl describe pod <pod>` and look for events with reason `FailedScheduling` or `UnexpectedAdmissionError`.
2. Check for insufficient resources (CPU, memory, ephemeral storage) across available nodes.
3. Verify taints and tolerations — if the node has a taint, the Pod must have a matching toleration.
4. Check node selector and affinity rules — conflicting constraints can make a Pod unschedulable.
5. Verify that a PersistentVolumeClaim (PVC) referenced by the Pod is bound (not stuck in Pending).

### Node-Level Troubleshooting

**Node NotReady**: The kubelet on the node has stopped reporting heartbeats to the control plane.

1. SSH into the node and check the kubelet status: `systemctl status kubelet`.
2. View kubelet logs: `journalctl -u kubelet -n 100 --no-pager`.
3. Check disk pressure: `df -h` and verify the node has sufficient free disk space.
4. Check memory pressure: `free -m` and verify the node has available memory.
5. Verify the container runtime (containerd, CRI-O, Docker) is running: `systemctl status containerd`.
6. Check the CNI plugin status — a failed CNI plugin can prevent the kubelet from marking the node Ready.

**Disk Pressure**: The node's available disk space has fallen below the `eviction-hard` threshold.

1. Identify disk space usage: `df -h` and `du -sh /var/lib/* | sort -rh`.
2. Check for unused container images: `crictl images` or `nerdctl images`.
3. Remove unused images: `crictl rmi --prune` or `kubelet-garbage-collect`.
4. Identify and clean large log files under `/var/log/`.
5. Increase the eviction threshold in kubelet configuration if necessary, or add more node storage.

**Memory Pressure**: The node's available memory has fallen below the eviction threshold.

1. Identify memory-hungry processes: `top -o %MEM` or `ps aux --sort=-%mem`.
2. Check system reserved memory versus container-requested memory.
3. Look for Pods exceeding their memory limits — these may have been evicted.
4. Inspect `kubectl describe node <node>` for the `MemoryPressure` condition.
5. Consider adding more worker nodes or redistributing workloads.

### Network Troubleshooting

**DNS Resolution Failures**: Pods cannot resolve service names or external domains.

1. Verify the CoreDNS Pods are running: `kubectl get pods -n kube-system -l k8s-app=kube-dns`.
2. Check CoreDNS logs: `kubectl logs -n kube-system -l k8s-app=kube-dns`.
3. Test DNS from inside a Pod: `kubectl exec -it <pod> -- nslookup kubernetes.default`.
4. Check CoreDNS ConfigMap for custom upstream DNS servers or stub domains.
5. Verify that network policies do not block DNS traffic (port 53 UDP/TCP to CoreDNS Pods).
6. Check the nodes' `/etc/resolv.conf` — CoreDNS forwards to the upstream DNS servers configured on the node.

**Service Connectivity Issues**: A Service is not reachable from other Pods or from outside the cluster.

1. Verify endpoint existence: `kubectl get endpoints <service>` — if endpoints are empty, the selector labels do not match any Pods.
2. Check the Service's `targetPort` matches the container's `containerPort`.
3. Test connectivity directly to the Pod IP bypassing the Service: `kubectl run tmp --rm -it --image=busybox -- wget -O- <pod-ip>:<port>`.
4. Verify kube-proxy is running on nodes: `kubectl get pods -n kube-system -l k8s-app=kube-proxy`.
5. Check iptables rules on a node: `iptables -t nat -L KUBE-SERVICES` — kube-proxy manages these rules.
6. For NodePort services, verify the node's firewall allows traffic on the NodePort range (30000-32767).

**Network Policy Blocks**: Traffic that should be allowed is being silently dropped.

1. List all NetworkPolicies in the namespace: `kubectl get networkpolicies -n <namespace>`.
2. Use `kubectl describe networkpolicy <policy>` to confirm podSelector and policyTypes.
3. Remember the default behavior: if any NetworkPolicy selects a Pod, all traffic not explicitly allowed is denied (default-deny).
4. Use `kubectl run tmp --rm -it --image=nicolaka/netshoot` for network debugging from inside the cluster.

**Ingress Not Working**: External traffic does not reach the application.

1. Check the Ingress resource: `kubectl describe ingress <ingress>` — verify the host and service backend.
2. Verify the Ingress controller is running: `kubectl get pods -n ingress-nginx` (or the appropriate namespace for your controller).
3. Check Ingress controller logs for routing errors.
4. Verify DNS resolution for the Ingress hostname points to the Ingress controller's LoadBalancer IP or node port.
5. Check TLS certificate validity if using HTTPS — expired or self-signed certificates cause browser errors.
6. For cloud LoadBalancers, verify the health check path returns a 200 OK response.

### Storage Troubleshooting

**PVC Pending**: A PersistentVolumeClaim is not binding to a PersistentVolume.

1. Check the PVC status: `kubectl describe pvc <pvc>` — look for `waiting for first consumer` (if using `WaitForFirstConsumer` binding mode) or `no persistent volumes available`.
2. Verify that a PV with matching storage class, access mode, and sufficient capacity exists: `kubectl get pv`.
3. Check the StorageClass exists and has a provisioner configured: `kubectl get storageclass`.
4. For dynamic provisioning, verify the CSI driver is installed and running.
5. Check node status for disk pressure if using local volumes.

**Pod Stuck on ContainerCreating with Volume Mount Errors**:

1. Run `kubectl describe pod <pod>` and look for volume-related events.
2. Verify the referenced PVC exists and is bound.
3. Check that the CSI driver Pods are healthy: `kubectl get pods -n kube-system | grep csi`.
4. Confirm the node has the required CSI driver binary installed.
5. For ReadWriteMany volumes, verify the volume supports multi-node access.

**ReadOnlyMany / ReadWriteOnce Misconfiguration**:

1. Verify the PVC access mode matches the application requirement — a Pod cannot mount a `ReadWriteOnce` volume on multiple nodes simultaneously.
2. If a StatefulSet has multiple replicas, ensure each replica mounts its own PVC or use a `ReadWriteMany` volume.
3. Check that the PV access mode has not been changed after creation — access modes are immutable.

### Control Plane Troubleshooting

**API Server Unreachable**: `kubectl` commands fail with connection refused or timeout errors.

1. Check the API server process: on the control plane node, run `systemctl status kube-apiserver`.
2. View API server logs: `journalctl -u kube-apiserver -n 100 --no-pager`.
3. Verify etcd health: `etcdctl endpoint health --cluster` — a failing etcd cluster brings down the API server.
4. Check TLS certificate expiration: `openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -dates`.
5. Verify that the API server can reach etcd: `etcdctl endpoint status --cluster --write-out=table`.
6. Check for exhausted API server resources — `etcd` performance degrades when the number of objects exceeds recommended limits (10,000 objects per namespace default).

**Scheduler Not Scheduling Pods**:

1. Verify the scheduler is running: `kubectl get pods -n kube-system -l component=kube-scheduler`.
2. Check scheduler logs for errors: `kubectl logs -n kube-system -l component=kube-scheduler`.
3. Confirm the scheduler leader election is functioning — only one scheduler instance should be active.
4. Check for resource shortages across all nodes: `kubectl describe nodes | grep -A 5 "Allocated resources"`.
5. Verify that no PriorityClass or Pod Disruption Budget is blocking scheduling.
6. If using a custom scheduler configuration, validate the scheduler policy and plugin configuration.

**etcd Issues**:

1. Check etcd cluster health: `etcdctl endpoint health --cluster` — all members should report `healthy`.
2. Verify etcd member list: `etcdctl member list --write-out=table` — confirm all members are connected.
3. Check etcd disk performance — etcd is sensitive to disk write latency. Most etcd operations complete within 10ms.
4. Monitor etcd database size: `etcdctl endpoint status --write-out=table` — the default maximum database size is 2 GB (8 GB in v3.5+).
5. Compact and defragment etcd database: `etcdctl compact <revision>` followed by `etcdctl defrag`.
6. Verify network connectivity between etcd members — latency should be under 10ms between members.

**Certificate Expiration**:

1. Check certificate expiration dates: `kubeadm certs check-expiration` (if using kubeadm).
2. Renew certificates: `kubeadm certs renew all` followed by restarting control plane components.
3. Monitor certificate expiry in your observability stack — kubelet and API server certificates are typically valid for one year.
4. Consider using the `CertificateSigningRequest` (CSR) API for automatic kubelet certificate rotation.

## Implementation Steps

### Step 1: Gather Initial Diagnostic Information

1. Run `kubectl get events --all-namespaces --sort-by='.lastTimestamp'` to view all cluster events ordered by time.
1. Identify problematic resources: `kubectl get pods --all-namespaces | grep -E '(CrashLoop|Error|Pending|Init:)'`.
1. Check node health: `kubectl get nodes` and `kubectl describe nodes | grep -E "(Conditions|Allocated resources)"`.
1. Collect cluster context: `kubectl cluster-info` and `kubectl version`.
1. Save diagnostic output to files for analysis:
   ```bash
   kubectl get all --all-namespaces -o wide > /tmp/k8s-all-resources.txt
   kubectl get events --all-namespaces > /tmp/k8s-events.txt
   kubectl describe nodes > /tmp/k8s-nodes.txt
   ```

### Step 2: Diagnose Application-Level Issues

1. For each failing Pod, run `kubectl describe pod <pod> -n <namespace>` and note the `Conditions` and `Events` sections.
1. View container logs: `kubectl logs <pod> -c <container> -n <namespace> --tail=100`.
1. If the Pod is CrashLoopBackOff, use `kubectl logs --previous <pod> -c <container> -n <namespace>` to see logs from the last terminated container.
1. Test application health endpoints from inside the cluster:
   ```bash
   kubectl run debug --rm -it --image=curlimages/curl -- sh
   curl http://<service-name>.<namespace>.svc.cluster.local:<port>/health
   ```
1. Check that ConfigMaps and Secrets are correctly mounted:
   ```bash
   kubectl exec -it <pod> -- cat /path/to/mounted/config
   kubectl exec -it <pod> -- env | grep <SECRET_NAME>
   ```

### Step 3: Diagnose Service and Network Issues

1. Verify endpoints are populated: `kubectl get endpoints <service> -n <namespace>`.
1. Test DNS resolution from inside a Pod:
   ```bash
   kubectl run dns-test --rm -it --image=busybox:1.28 -- nslookup <service-name>
   ```
1. Test direct connectivity between Pods:
   ```bash
   kubectl run net-test --rm -it --image=nicolaka/netshoot -- bash
   curl -v http://<target-pod-ip>:<port>
   ```
1. Check CoreDNS is healthy: `kubectl get pods -n kube-system -l k8s-app=kube-dns`.
1. Review CoreDNS logs for DNS resolution failures:
   ```bash
   kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
   ```
1. Verify kube-proxy is running on each node: `kubectl get pods -n kube-system -l k8s-app=kube-proxy`.
1. Check network policies in the namespace:
   ```bash
   kubectl get networkpolicies -n <namespace>
   kubectl describe networkpolicy <policy> -n <namespace>
   ```

### Step 4: Diagnose Node-Level Issues

1. Identify unhealthy nodes: `kubectl get nodes | grep -v Ready`.
1. For each unhealthy node, SSH in and check the kubelet:
   ```bash
   systemctl status kubelet
   journalctl -u kubelet -n 200 --no-pager
   ```
1. Check system resources on the node:
   ```bash
   df -h            # disk usage
   free -m          # memory usage
   top -o %CPU      # CPU usage
   ```
1. Verify the container runtime is healthy:
   ```bash
   crictl ps            # list running containers (containerd)
   crictl info          # container runtime info
   systemctl status containerd
   ```
1. Check CNI plugin status — look for `cni` configuration files in `/etc/cni/net.d/`.
1. Drain and cordon a problematic node to migrate workloads:
   ```bash
   kubectl cordon <node>
   kubectl drain <node> --ignore-daemonsets --delete-emptydir-data
   ```

### Step 5: Diagnose Control Plane Issues

1. Check control plane Pod health: `kubectl get pods -n kube-system`.
1. Verify API server reachability:
   ```bash
   curl -k https://localhost:6443/healthz
   kubectl get --raw=/healthz
   ```
1. Check etcd cluster health from a control plane node:
   ```bash
   ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
     --cacert=/etc/kubernetes/pki/etcd/ca.crt \
     --cert=/etc/kubernetes/pki/etcd/server.crt \
     --key=/etc/kubernetes/pki/etcd/server.key \
     endpoint health
   ```
1. Verify scheduler and controller manager are functioning:
   ```bash
   kubectl get leases -n kube-system  # leader election status
   kubectl logs -n kube-system -l component=kube-scheduler --tail=20
   kubectl logs -n kube-system -l component=kube-controller-manager --tail=20
   ```
1. Check certificate expiration dates:
   ```bash
   kubeadm certs check-expiration  # kubeadm-managed clusters
   ```
1. Check API server audit logs for authentication or authorization failures:
   ```bash
   grep "Forbidden\|Unauthorized" /var/log/kubernetes/audit.log | tail -20
   ```

### Step 6: Build a Reusable Debugging Container

For persistent debugging work, deploy a debugging Pod with network tools installed:

```bash
kubectl run debug --image=nicolaka/netshoot --restart=Never -- sleep infinity
```

Common commands from the netshoot container:

```text
curl, wget, dig, nslookup, nmap, tcpdump, iperf, netstat,
ss, ip, ifconfig, traceroute, mtr, ping, htop, strace
```

For storage debugging, attach a debug container to a running Pod using ephemeral containers (Kubernetes v1.23+):

```bash
kubectl debug <pod> -n <namespace> --image=nicolaka/netshoot --target=<container>
```

This injects a sidecar container into the Pod's network namespace, allowing you to debug network issues without restarting the application.

### Step 7: Establish a Post-Mortem Process

After resolving the incident, document the following in your team's runbook:

1. What was the symptom (user-facing impact)?
1. What was the root cause?
1. How was the issue detected (alert, manual report)?
1. What was the resolution (command sequence, configuration change)?
1. What monitoring or alerting gaps allowed the issue to escalate?
1. What preventative measures can be implemented (automated tests, policy enforcement, chaos engineering)?

Maintain a shared troubleshooting runbook in your GitOps repository with documented resolution steps for each recurring failure pattern. Over time, this becomes your team's most valuable operational asset.
