---
title: "Membangun Layanan gRPC Kelas Produksi dengan Go"
description: "Panduan komprehensif untuk merancang, mengimplementasikan, dan mengoperasikan layanan gRPC kelas produksi di Go — desain protocol buffer, interceptor, streaming, penanganan error, deadline, keamanan, health check, dan pengujian."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Membangun Layanan gRPC Kelas Produksi dengan Go

## Pendahuluan

gRPC adalah framework RPC open-source berperforma tinggi yang dibangun di atas HTTP/2 dan Protocol Buffers. Berbeda dengan REST yang memodelkan sumber daya dan mengandalkan payload JSON, gRPC hadir dengan kontrak antarmuka yang ketat (file `proto`), pesan yang bertipe kuat, streaming dua arah, serta pembuatan kode otomatis untuk klien maupun server. Untuk komunikasi antar-layanan internal, gRPC biasanya memberikan latensi 5-10x lebih rendah dan ukuran payload jauh lebih kecil dibandingkan JSON melalui HTTP/1.1.

Panduan ini membahas semua yang dibutuhkan untuk membangun layanan gRPC di Go yang siap produksi: merancang skema protocol buffer yang mudah berevolusi, memilih model streaming yang tepat, memasang interceptor untuk logging, recovery, dan autentikasi, menangani error dengan kode status kanonik, menegakkan deadline, mengamankan transport dengan TLS, menyediakan health check dan reflection, serta menguji seluruh tumpukan secara lokal. Panduan ini mengasumsikan Anda sudah nyaman dengan Go dan pernah membangun setidaknya satu layanan HTTP sebelumnya.

## Praktik Terbaik

### 1. Rancang Skema Protobuf agar Mudah Berevolusi dalam Jangka Panjang

File `.proto` adalah sebuah kontrak: begitu klien di-deploy menggunakannya, mengubahnya secara sembarangan akan merusak klien tersebut. Perlakukan nomor field sebagai identitas permanen — jangan pernah memakai ulang nomor setelah sebuah field dihapus.

- **Tambahkan field, jangan pernah menghapus atau mengubah fungsinya.** Field baru bersifat kompatibel mundur; menghapus field yang masih dikirim klien menyebabkan kehilangan data. Jika sebuah field sudah usang, tandai dengan `reserved`.
- **Jaga nomor field tetap stabil.** Format wire menggunakan nomor, bukan nama. Mengganti nama field aman, menomori ulang tidak.
- **Cadangkan field yang dihapus secara eksplisit** agar tidak ada yang secara tidak sengaja memakai ulang nomor atau nama:

```proto
message Order {
  reserved 4, 9;
  reserved "legacy_tax_rate";
  string id = 1;
  string customer_id = 2;
  repeated OrderItem items = 3;
  // nomor field 4 telah dihapus
}

message OrderItem {
  string sku = 1;
  int32 quantity = 2;
}
```

- **Utamakan pesan kecil dan fokus daripada satu pesan raksasa.** Pesan kecil lebih mudah dievolusi, di-cache, dan dipahami.
- **Gunakan `enum` dengan nilai nol yang berarti "tidak ditentukan"** (`UNKNOWN = 0`), sehingga nilai yang hilang bersifat eksplisit, bukan terpetakan secara diam-diam ke opsi nyata.
- **Versi layanan, bukan pesan.** Ketika perubahan yang memutus kompatibilitas tidak dapat dihindari, definisikan paket `v2` (`my.package.v2`) dan jalankan kedua versi berdampingan selama migrasi, alih-alih mengubah kontrak yang sudah ada.

### 2. Pilih Model RPC yang Tepat untuk Kebutuhan

gRPC mendukung empat jenis RPC; memilih jenis yang salah membuat API sulit digunakan dan lebih rumit dioperasikan.

| Jenis RPC | Arah | Paling Cocok Untuk |
|-----------|------|--------------------|
| Unary | request → satu respons | request/reply klasik: CRUD, pencarian, mutasi |
| Server streaming | request → aliran respons | feed, paginasi, ekor log, pembaruan langsung |
| Client streaming | aliran request → satu respons | unggahan, agregasi batch, masukan klien berdurasi panjang |
| Bidirectional streaming | aliran dua arah | chat real-time, telemetri, protokol interaktif |

Kesalahan umum adalah menggunakan bidirectional streaming padahal server streaming sudah cukup — aliran bidi memperumit siklus hidup koneksi dan logika penagihan hanya untuk manfaat yang marginal. Mulailah dengan unary, tambahkan server streaming ketika klien membutuhkan rangkaian hasil, dan simpan bidi untuk kasus yang benar-benar interaktif.

### 3. Pusatkan Perhatian Lintas-Isu dalam Interceptor

Interceptor adalah middleware milik gRPC. Autentikasi, logging, recovery dari panik, rate limiting, tracing, dan metrik semuanya berada di interceptor, bukan tersebar di seluruh handler. `grpc-go` menyediakan interceptor unary dan stream yang membungkus setiap panggilan.

- **Rangkaikan interceptor sesuai urutan ketergantungan:** recovery paling luar, lalu logging, lalu auth, kemudian filter khusus bisnis.
- **Jaga interceptor tetap cepat:** interceptor berjalan pada setiap request, jadi hindari pekerjaan mahal (query basis data, panggilan jarak jauh) di dalamnya.
- **Gunakan `grpc_middleware.ChainUnaryServer`** dari `github.com/grpc-ecosystem/go-grpc-middleware` agar komposisinya mudah dibaca:

```go
server := grpc.NewServer(
    grpc.ChainUnaryServer(
        recoveryUnaryInterceptor(),
        loggingUnaryInterceptor(),
        authUnaryInterceptor(),
    ),
    grpc.ChainStreamServer(
        recoveryStreamInterceptor(),
        authStreamInterceptor(),
    ),
)
```

- **Jangan biarkan handler panik:** satu handler yang panik bisa merobohkan seluruh proses. Interceptor recovery mengubah panik menjadi error `codes.Internal`.

### 4. Gunakan Kode Status gRPC Kanonik untuk Error

gRPC mendefinisikan serangkaian kode status tetap (`google.rpc.Code`). Memetakan setiap kegagalan ke kode yang paling mendekati membuat klien seragam dan debugging lintas layanan dapat diprediksi.

| Kode | Gunakan Untuk |
|------|---------------|
| `InvalidArgument` | payload request tidak valid |
| `NotFound` | entitas yang diminta tidak ada |
| `AlreadyExists` | entitas tidak dapat dibuat karena sudah ada |
| `PermissionDenied` | pemanggil terautentikasi tetapi tidak berwenang |
| `Unauthenticated` | kredensial hilang atau tidak valid |
| `DeadlineExceeded` | server menyerah sebelum selesai |
| `ResourceExhausted` | kuota atau rate limit terlampaui |
| `FailedPrecondition` | kondisi sistem mencegah operasi saat ini |
| `Internal` | bug server yang tidak terduga |

- **Kembalikan error melalui `status.Error(codes.X, "pesan")`, jangan pernah `fmt.Errorf` polos** — error telanjang muncul sebagai `codes.Unknown` dan kehilangan makna.
- **Lampirkan detail terstruktur** dengan `status.New(...).WithDetails(...)` dan `google.golang.org/genproto/googleapis/rpc/errdetails` untuk penanganan klien yang kaya (misalnya `BadRequest` untuk pelanggaran field).
- **Saat menjembatani ke REST** (grpc-gateway), gateway memetakan kode gRPC ke status HTTP secara otomatis — pemetaan kode yang konsisten memberi Anda semantik HTTP yang konsisten secara gratis.

### 5. Selalu Tetapkan Deadline dan Sebarkan Context

RPC tanpa batas waktu adalah insiden produksi yang menunggu terjadi: downstream yang lambat dapat menumpuk goroutine hingga proses mati. Setiap panggilan klien harus membawa deadline, dan setiap server harus menghormati context yang masuk.

- **Tetapkan `grpc.WithTimeout` atau `context.WithTimeout` pada klien** untuk setiap panggilan; pilih nilai yang diturunkan dari SLO Anda (misalnya 2 detik untuk p99 800ms).
- **Server: periksa `ctx.Err()` sebelum pekerjaan mahal dan di dalam perulangan panjang**, kembalikan `codes.DeadlineExceeded` atau `codes.Canceled` sesuai kondisi.
- **Sebarkan context ke semua panggilan downstream** — query basis data, panggilan HTTP, dan panggilan gRPC bertingkat harus menerima `ctx`, atau deadline berhenti berlaku secara diam-diam di batas pertama.
- **Jangan gunakan `context.Background()` di dalam handler** kecuali saat startup/shutdown.

### 6. Amankan Setiap Layanan dengan TLS dan Autentikasi

gRPC tanpa enkripsi hanya dapat diterima di dalam jaringan privat tepercaya — dan bahkan di sana, pertahanan berlapis mengatakan gunakan TLS.

- **Selalu layani dengan kredensial TLS** (`credentials.NewServerTLSFromFile`); layanan internal dapat memakai mTLS sehingga kedua sisi saling mengautentikasi.
- **Autentikasi di lapisan interceptor.** Pola paling umum adalah JWT (atau token layanan) yang dibawa dalam `metadata` dan divalidasi secara terpusat.
- **Otorisasi per RPC, bukan global.** Setelah autentikasi, periksa peran pemanggil terhadap metode spesifik yang dipanggil.
- **Jangan pernah mencatat kredensial atau token**; redaksi metadata `authorization` di dalam interceptor logging.

### 7. Sertakan Health Check dan Reflection

Kubernetes dan orkestrator lain membutuhkan probe liveness dan readiness; gRPC memiliki protokol health check standar melalui layanan `grpc.health.v1.Health`.

- **Daftarkan `health.NewServer()` dari `google.golang.org/grpc/health`** dan atur status ke `SERVING` hanya setelah dependensi (DB, cache) siap.
- **Arahkan `grpcHealthProbe` Kubernetes ke sana** alih-alih meretas endpoint HTTP.
- **Aktifkan server reflection (`reflection.Register`)** di lingkungan development/staging sehingga `grpcurl` dan alat seperti Postman dapat menemukan layanan tanpa file proto. Di lingkungan produksi yang dikunci ketat, nonaktifkan.

### 8. Rencanakan Load Balancing dan Manajemen Koneksi

Satu koneksi gRPC memultipleks banyak RPC bersamaan melalui HTTP/2, sehingga manajemen koneksi berbeda dari REST.

- **Gunakan ulang satu koneksi klien per endpoint layanan** — `NewClient` aman untuk penggunaan bersamaan; membuat koneksi per request adalah anti-pola klasik.
- **Gunakan resolver `dns` untuk load balancing sisi klien** (`grpc.WithDefaultServiceConfig("{\"loadBalancingPolicy\":\"round_robin\"}")`) atau tempatkan service mesh / penyeimbang L7 (Envoy, Nginx) di depan pod server.
- **Konfigurasikan keepalive** (`keepalive.ClientParameters`) sehingga koneksi idle terdeteksi dan dibangun ulang sebelum proxy diam-diam memutuskannya.
- **Atur `MaxRecvMsgSize`/`MaxSendMsgSize` secara sengaja** — nilai bawaan cukup untuk sebagian besar layanan; menaikkannya untuk memindahkan payload raksasa menyembunyikan masalah desain, menurunkannya melindungi memori.

## Langkah Implementasi

Kita akan membangun layanan prakiraan cuaca: RPC unary `GetForecast` plus RPC server-streaming `StreamForecastAlerts`, lengkap dengan interceptor, TLS, health check, dan klien uji. Semua perintah mengasumsikan Go 1.22+.

### Langkah 1: Siapkan Proyek dan Definisikan Proto

Buat modul dan pasang alat pembangkit kode:

```bash
mkdir weather-service && cd weather-service
go mod init example.com/weather
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

Definisikan kontrak di `proto/weather/v1/weather.proto`:

```proto
syntax = "proto3";

package weather.v1;

option go_package = "example.com/weather/gen/weatherv1";

service WeatherService {
  rpc GetForecast(GetForecastRequest) returns (Forecast);
  rpc StreamForecastAlerts(StreamForecastAlertsRequest) returns (stream ForecastAlert);
}

message GetForecastRequest {
  string city = 1;
  string units = 2; // "metric" atau "imperial", bawaan "metric"
}

message Forecast {
  string city = 1;
  double temperature_c = 2;
  double feels_like_c = 3;
  int32 humidity_percent = 4;
  string condition = 5; // "sunny", "cloudy", "rain", ...
  int64 updated_at = 6; // detik unix
}

message StreamForecastAlertsRequest {
  string city = 1;
}

message ForecastAlert {
  string severity = 1; // "advisory", "warning", "critical"
  string message = 2;
}
```

Hasilkan kode ke `gen/`:

```bash
mkdir -p gen
protoc --go_out=. --go_opt=paths=source_relative \
  --go-grpc_out=. --go-grpc_opt=paths=source_relative \
  proto/weather/v1/weather.proto
```

Struktur direktori yang dihasilkan terlihat seperti:

```text
weather-service/
├── proto/weather/v1/weather.proto
├── gen/weatherv1/
│   ├── weather.pb.go
│   └── weather_grpc.pb.go
├── go.mod
└── main.go
```

### Langkah 2: Implementasikan Server

Buat `server/server.go` dengan struct yang menyematkan `UnimplementedWeatherServiceServer` hasil generate — ini membuat layanan Anda siap masa depan: RPC baru yang ditambahkan ke proto akan mendapat stub `Unimplemented` bawaan alih-alih merusak build.

```go
package server

import (
    "context"
    "time"

    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    weatherv1 "example.com/weather/gen/weatherv1"
)

type WeatherServer struct {
    weatherv1.UnimplementedWeatherServiceServer
}

func (s *WeatherServer) GetForecast(
    ctx context.Context,
    req *weatherv1.GetForecastRequest,
) (*weatherv1.Forecast, error) {
    if req.GetCity() == "" {
        return nil, status.Error(codes.InvalidArgument, "city wajib diisi")
    }
    return &weatherv1.Forecast{
        City:            req.GetCity(),
        TemperatureC:    24.5,
        FeelsLikeC:      26.0,
        HumidityPercent: 62,
        Condition:       "sunny",
        UpdatedAt:       time.Now().Unix(),
    }, nil
}
```

### Langkah 3: Rangkaikan Interceptor Logging dan Recovery

Tambahkan paket middleware dan implementasikan interceptor logging terstruktur yang mencatat metode, durasi, dan kode, plus interceptor recovery:

```go
package middleware

import (
    "context"
    "log/slog"
    "runtime/debug"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

func LoggingUnaryInterceptor(logger *slog.Logger) grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req any,
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (any, error) {
        start := time.Now()
        resp, err := handler(ctx, req)
        logger.Info("rpc",
            "method", info.FullMethod,
            "duration_ms", time.Since(start).Milliseconds(),
            "code", status.Code(err).String(),
        )
        return resp, err
    }
}

func RecoveryUnaryInterceptor() grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req any,
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (resp any, err error) {
        defer func() {
            if r := recover(); r != nil {
                debug.PrintStack()
                err = status.Errorf(codes.Internal, "panic: %v", r)
            }
        }()
        return handler(ctx, req)
    }
}
```

Rangkaikan saat membangun server di `main.go`:

```go
server := grpc.NewServer(
    grpc.ChainUnaryServer(
        middleware.RecoveryUnaryInterceptor(),
        middleware.LoggingUnaryInterceptor(logger),
    ),
)
```

### Langkah 4: Tambahkan Autentikasi JWT dengan Interceptor Auth

Interceptor auth membaca token bearer `authorization` dari metadata yang masuk, memvalidasinya, dan menyimpan identitas pemanggil di dalam context:

```go
package middleware

import (
    "context"
    "strings"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/metadata"
    "google.golang.org/grpc/status"
)

type ctxKey string

const CallerKey ctxKey = "caller"

func AuthUnaryInterceptor(validateToken func(string) (string, error)) grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req any,
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (any, error) {
        md, ok := metadata.FromIncomingContext(ctx)
        if !ok {
            return nil, status.Error(codes.Unauthenticated, "metadata tidak ada")
        }
        auth := md.Get("authorization")
        if len(auth) == 0 || !strings.HasPrefix(auth[0], "Bearer ") {
            return nil, status.Error(codes.Unauthenticated, "token bearer tidak ada")
        }
        caller, err := validateToken(strings.TrimPrefix(auth[0], "Bearer "))
        if err != nil {
            return nil, status.Error(codes.Unauthenticated, "token tidak valid")
        }
        ctx = context.WithValue(ctx, CallerKey, caller)
        return handler(ctx, req)
    }
}
```

Handler kemudian membaca pemanggil dari context dan membuat keputusan otorisasi per RPC:

```go
caller, _ := ctx.Value(middleware.CallerKey).(string)
if caller != "ops-team" {
    return nil, status.Error(codes.PermissionDenied, "hanya ops yang boleh streaming alert")
}
```

### Langkah 5: Implementasikan RPC Server-Streaming

RPC streaming mengirim beberapa pesan melalui stream `WeatherService_StreamForecastAlertsServer` hasil generate. Selalu periksa context di antara pengiriman agar klien yang membatalkan segera membebaskan sumber daya server:

```go
func (s *WeatherServer) StreamForecastAlerts(
    req *weatherv1.StreamForecastAlertsRequest,
    stream weatherv1.WeatherService_StreamForecastAlertsServer,
) error {
    alerts := []weatherv1.ForecastAlert{
        {Severity: "advisory", Message: "Indeks UV tinggi saat tengah hari"},
        {Severity: "warning", Message: "Angin kencang hingga 60 km/jam"},
    }
    for _, alert := range alerts {
        if err := stream.Context().Err(); err != nil {
            return status.FromContextError(err).Err()
        }
        if err := stream.Send(&alert); err != nil {
            return err
        }
    }
    return nil
}
```

### Langkah 6: Tangani Error dan Deadline dengan Baik

Di sisi server, selalu periksa apakah context yang masuk sudah selesai sebelum memulai pekerjaan mahal dan secara berkala di dalam perulangan:

```go
func (s *WeatherServer) GetForecast(
    ctx context.Context,
    req *weatherv1.GetForecastRequest,
) (*weatherv1.Forecast, error) {
    if err := ctx.Err(); err != nil {
        return nil, status.FromContextError(err).Err()
    }
    // ... ambil dari cache / downstream ...
    select {
    case <-ctx.Done():
        return nil, status.FromContextError(ctx.Err()).Err()
    case forecast := <-fetched:
        return forecast, nil
    }
}
```

Lampirkan detail error yang kaya untuk kegagalan validasi tingkat field:

```go
import (
    "google.golang.org/genproto/googleapis/rpc/errdetails"
    "google.golang.org/grpc/status"
)

st := status.New(codes.InvalidArgument, "validasi gagal")
for field, problem := range problems {
    st, _ = st.WithDetails(&errdetails.BadRequest_FieldViolation{
        Field:       field,
        Description: problem,
    })
}
return nil, st.Err()
```

### Langkah 7: Aktifkan TLS, Health Check, dan Reflection

Rangkaikan opsi kelas produksi ke dalam server di `main.go`:

```go
package main

import (
    "log/slog"
    "net"
    "os"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials"
    "google.golang.org/grpc/health"
    healthpb "google.golang.org/grpc/health/grpc_health_v1"
    "google.golang.org/grpc/reflection"

    "example.com/weather/gen/weatherv1"
    "example.com/weather/middleware"
    "example.com/weather/server"
)

func main() {
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        slog.Error("listen gagal", "err", err)
        os.Exit(1)
    }

    creds, err := credentials.NewServerTLSFromFile("certs/server.crt", "certs/server.key")
    if err != nil {
        slog.Error("tls gagal", "err", err)
        os.Exit(1)
    }

    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    grpcServer := grpc.NewServer(
        grpc.Creds(creds),
        grpc.ChainUnaryServer(
            middleware.RecoveryUnaryInterceptor(),
            middleware.LoggingUnaryInterceptor(logger),
        ),
    )

    weatherv1.RegisterWeatherServiceServer(grpcServer, &server.WeatherServer{})

    healthServer := health.NewServer()
    healthServer.SetServingStatus("weather.v1.WeatherService", healthpb.HealthCheckResponse_SERVING)
    healthpb.RegisterHealthServer(grpcServer, healthServer)

    reflection.Register(grpcServer)

    slog.Info("melayani gRPC di :50051")
    grpcServer.Serve(lis)
}
```

### Langkah 8: Bangun Klien dengan Deadline dan Retry

Klien produksi menggunakan ulang satu koneksi, mengirim kredensial, menetapkan deadline, dan melakukan retry hanya pada panggilan idempoten:

```go
package main

import (
    "context"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    weatherv1 "example.com/weather/gen/weatherv1"
)

func main() {
    creds, _ := credentials.NewClientTLSFromFile("certs/ca.crt", "weather.internal")
    conn, err := grpc.NewClient("dns:///weather.internal:50051",
        grpc.WithTransportCredentials(creds),
        grpc.WithDefaultServiceConfig(`{"loadBalancingPolicy":"round_robin"}`),
    )
    if err != nil {
        panic(err)
    }
    defer conn.Close()

    client := weatherv1.NewWeatherServiceClient(conn)
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    forecast, err := client.GetForecast(ctx, &weatherv1.GetForecastRequest{
        City:  "Jakarta",
        Units: "metric",
    })
    if err != nil {
        // Periksa kode kanonik alih-alih mencocokkan teks pesan.
        if status.Code(err) == codes.DeadlineExceeded {
            panic("layanan prakiraan cuaca kehabisan waktu")
        }
        panic(err)
    }
    _ = forecast
}
```

Untuk RPC idempoten, interceptor retry (`grpc_retry` dari ekosistem go-grpc-middleware) dengan anggaran kecil (misalnya 3 percobaan, backoff 300ms) menyerap kegagalan jaringan sementara tanpa memperbesar beban.

### Langkah 9: Uji Secara Lokal dengan bufconn dan grpcurl

Gunakan `bufconn` untuk pengujian in-process yang cepat dengan melatih seluruh tumpukan gRPC tanpa membuka soket:

```go
package server_test

import (
    "context"
    "net"
    "testing"

    "google.golang.org/grpc"
    "google.golang.org/grpc/test/bufconn"
    "google.golang.org/grpc/credentials/insecure"

    weatherv1 "example.com/weather/gen/weatherv1"
    "example.com/weather/server"
)

func TestGetForecast(t *testing.T) {
    lis := bufconn.Listen(1024 * 1024)
    srv := grpc.NewServer(grpc.Creds(insecure.NewCredentials()))
    weatherv1.RegisterWeatherServiceServer(srv, &server.WeatherServer{})
    go srv.Serve(lis)
    defer srv.Stop()

    dialer := func(context.Context, string) (net.Conn, error) { return lis.Dial() }
    conn, err := grpc.NewClient("passthrough:///bufnet",
        grpc.WithContextDialer(dialer),
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        t.Fatal(err)
    }
    defer conn.Close()

    client := weatherv1.NewWeatherServiceClient(conn)
    resp, err := client.GetForecast(context.Background(),
        &weatherv1.GetForecastRequest{City: "Jakarta"})
    if err != nil {
        t.Fatalf("GetForecast gagal: %v", err)
    }
    if resp.GetCity() != "Jakarta" {
        t.Fatalf("kota tidak sesuai: %s", resp.GetCity())
    }
}
```

Ketika reflection aktif, periksa layanan yang berjalan dengan `grpcurl` (gunakan `-insecure` untuk pengujian lokal dengan TLS):

```bash
grpcurl -insecure localhost:50051 list
grpcurl -insecure -d '{"city": "Jakarta"}' \
  localhost:50051 weather.v1.WeatherService/GetForecast
```

### Langkah 10: Kontainerisasi dan Deploy

Dockerfile multi-stage menjaga citra runtime tetap kecil:

```dockerfile
FROM golang:1.24 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/weather ./cmd/weather

FROM gcr.io/distroless/static-debian12
COPY --from=build /bin/weather /bin/weather
COPY certs /certs
EXPOSE 50051
ENTRYPOINT ["/bin/weather"]
```

Deployment Kubernetes minimal menghubungkan probe health gRPC standar ke liveness dan readiness:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: weather
spec:
  replicas: 3
  selector:
    matchLabels:
      app: weather
  template:
    metadata:
      labels:
        app: weather
    spec:
      containers:
        - name: weather
          image: registry.example.com/weather:1.0.0
          ports:
            - containerPort: 50051
          readinessProbe:
            grpc:
              port: 50051
              service: weather.v1.WeatherService
            initialDelaySeconds: 5
          livenessProbe:
            grpc:
              port: 50051
              service: ""
            initialDelaySeconds: 15
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

Terakhir, ekspor metrik Prometheus (melalui `go-grpc-prometheus` atau OpenTelemetry) dan histogram latensi per metode, sehingga dasbor SLO yang sama dengan layanan REST juga mencakup lalu lintas gRPC Anda.
