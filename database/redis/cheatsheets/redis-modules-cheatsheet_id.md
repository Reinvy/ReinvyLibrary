---
title: "Cheatsheet Modul Redis dan Redis Stack"
description: "Referensi cepat komprehensif untuk modul Redis Stack — indeks dan kueri teks lengkap RediSearch, penyimpanan dokumen RedisJSON dan JSONPath, retensi serta agregasi RedisTimeSeries, struktur probabilistik RedisBloom, dan kueri Cypher RedisGraph (legacy)."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Modul Redis dan Redis Stack

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Memuat modul saat runtime | `MODULE LOAD /path/to/module.so` | Memuat modul dinamis ke dalam server Redis yang berjalan |
| Menampilkan daftar modul | `MODULE LIST` | Menampilkan modul yang dimuat beserta versinya |
| Membuat indeks RediSearch pada hash | `FT.CREATE idx ON HASH PREFIX 1 product: SCHEMA name TEXT price NUMERIC` | Membangun indeks sekunder pada key hash yang sudah ada |
| Membuat indeks RediSearch pada JSON | `FT.CREATE idx ON JSON PREFIX 1 product: SCHEMA $.name AS name TEXT` | Mengindeks field yang diekstrak dengan JSONPath dari dokumen RedisJSON |
| Mencari pada indeks | `FT.SEARCH idx "@name:widget" LIMIT 0 10` | Kueri teks lengkap dengan penargetan field dan paging |
| Agregasi hasil pencarian | `FT.AGGREGATE idx "*" GROUPBY 1 @category REDUCE COUNT 0 AS n` | Mengelompokkan dan mereduksi data yang terindeks |
| Menyimpan dokumen JSON | `JSON.SET user:1 $ '{"name":"Alice","age":30}'` | Membuat atau mengganti dokumen JSON pada sebuah path |
| Membaca nilai JSONPath | `JSON.GET user:1 $.name` | Mengambil nilai dengan ekspresi JSONPath |
| Menambahkan ke array JSON | `JSON.ARRAPPEND user:1 $.tags "redis"` | Menyorong elemen ke array di dalam dokumen |
| Membuat deret waktu | `TS.CREATE temp:room1 RETENTION 86400000 LABELS room room1` | Mendefinisikan deret dengan jendela retensi dan label |
| Menambahkan sampel | `TS.ADD temp:room1 1617972841000 21.5` | Menyisipkan sampel `(timestamp, nilai)` |
| Kueri rentang dengan downsampling | `TS.RANGE temp:room1 1617972841000 1617972901000 AGGREGATION avg 60000` | Mengkueri sampel yang dikelompokkan dalam rata-rata 60 detik |
| Membuat Bloom filter | `BF.RESERVE seen:url 0.01 1000000` | Mengalokasikan filter dengan error rate dan kapasitas |
| Uji keanggotaan massal | `BF.MEXISTS seen:url "https://a.example" "https://b.example"` | Menguji beberapa item dalam satu panggilan |
| Melacak aliran top-K | `TOPK.ADD trending:items "item-42"` | Menyisipkan item ke dalam sketsa Top-K |
| Menjalankan kueri Cypher | `GRAPH.QUERY social "MATCH (p:Person) RETURN p.name"` | Menjalankan kueri graf pada modul RedisGraph (legacy) |

## Perintah Umum

### RediSearch — Manajemen Indeks

```text
FT.CREATE idx ON HASH PREFIX 1 product: SCHEMA \
  name TEXT WEIGHT 5.0 SORTABLE \
  price NUMERIC SORTABLE \
  tags TAG SEPARATOR ","

FT.CREATE idx ON JSON PREFIX 1 product: SCHEMA \
  $.name AS name TEXT \
  $.price AS price NUMERIC \
  $.tags[*] AS tags TAG
```

| Perintah | Kegunaan |
|----------|----------|
| `FT.CREATE index [ON HASH\|JSON] [PREFIX n prefix ...] [FILTER expr] SCHEMA ...` | Membuat indeks; `HASH` menargetkan hash, `JSON` menargetkan dokumen RedisJSON |
| `FT.DROPINDEX index [DD]` | Menghapus indeks; `DD` sekaligus menghapus dokumen pendukungnya |
| `FT.INFO index` | Memeriksa definisi indeks, tipe field, dan jumlah dokumen |
| `FT._LIST` | Menampilkan semua indeks dalam server |
| `FT.ALIASADD alias index` | Menambah alias agar aplikasi tidak pernah meng-hard-code nama indeks |
| `FT.ALIASDEL alias` | Menghapus alias |
| `FT.ALIASUPDATE alias index` | Mengarahkan alias ke indeks lain (penggantian reindex atomik) |
| `FT.SYNUPDATE index id_grup term ...` | Memelihara grup sinonim yang dipakai saat ekspansi kueri |
| `FT.SPELLCHECK index kueri` | Memberi saran koreksi untuk istilah yang salah ketik |
| `FT.DICTADD dict term ...` | Menyemai kamus kustom untuk saran spell-check |
| `FT.EXPLAIN index kueri` | Menampilkan rencana eksekusi sebuah kueri |
| `FT.PROFILE index SEARCH QUERY kueri` | Menprofil kueri dan mengembalikan penghitung per operasi |
| `FT.CONFIG GET nama` | Membaca pengaturan runtime RediSearch (misalnya `timeout`) |
| `FT.CONFIG SET nama nilai` | Mengubah pengaturan runtime tanpa restart server |

### RediSearch — Kueri

```text
# Kueri istilah
FT.SEARCH idx "widget"

# Penargetan field
FT.SEARCH idx "@name:widget"

# Rentang numerik (kurung siku inklusif, kurung biasa eksklusif)
FT.SEARCH idx "price:[10 100]"
FT.SEARCH idx "price:(10 100]"

# Pencocokan tag (pipe = OR di dalam kueri tag)
FT.SEARCH idx "@tags:{electronics|home}"

# Pencocokan prefiks dan fuzzy
FT.SEARCH idx "@name:wid*"
FT.SEARCH idx "%wodget%"          # fuzzy Levenshtein, jarak default 2

# Logika boolean: AND implisit, -field mengecualikan, | adalah OR
FT.SEARCH idx "widget -defective"
FT.SEARCH idx "widget|gadget"

# Filter geo: radius di sekitar titik lon,lat
FT.SEARCH idx "@location:[106.8 -6.2 10 km]"

# Hasil berperingkat dengan field sortable
FT.SEARCH idx "@price:[0 50]" SORTBY price DESC LIMIT 0 10
```

```text
# Sintaks lengkap FT.SEARCH
FT.SEARCH index kueri [NOCONTENT] [VERBATIM] [NOSTOPWORDS] \
  [WITHSCORES] [WITHPAYLOADS] [SORTBY field [ASC|DESC]] \
  [LIMIT offset num] [PARAMS n nama nilai ...] \
  [DIALECT dialect] [TIMEOUT ms]
```

Pipeline agregasi mengubah data terindeks menjadi statistik berkelompok tanpa mengirim dokumen ke klien:

```text
FT.AGGREGATE idx "*" \
  FILTER "@price > 10" \
  GROUPBY 1 @category \
    REDUCE AVG 1 @price AS avg_price \
    REDUCE COUNT 0 AS items \
  SORTBY 2 @avg_price DESC \
  LIMIT 0 20
```

| Bagian | Kegunaan |
|--------|----------|
| `GROUPBY n field ...` | Mempartisi baris berdasarkan satu atau lebih field |
| `REDUCE func n arg ... AS alias` | Mengagregasi tiap grup (`COUNT`, `SUM`, `AVG`, `MAX`, `MIN`, `QUANTILE`, `STDDEV`, `TOLIST`, `COUNT_DISTINCT`, `RANDOM_SAMPLE`) |
| `SORTBY n @field [ASC\|DESC] ...` | Mengurutkan baris hasil |
| `APPLY expr AS alias` | Menghitung kolom baru per baris |
| `FILTER expr` | Menahan baris yang cocok dengan predikat |
| `CURSOR COUNT n MAXIDLE ms` | Melakukan paging hasil besar; lanjutkan dengan `FT.CURSOR READ index cursor` |

Pencarian kemiripan vektor (Redis 6.2+ dengan tipe field `VECTOR`) memberi peringkat dokumen berdasarkan jarak ke embedding:

```text
FT.CREATE vec_idx ON HASH PREFIX 1 doc: SCHEMA \
  text TEXT \
  embedding VECTOR FLAT 6 TYPE FLOAT32 DIM 384 DISTANCE_METRIC COSINE

FT.SEARCH vec_idx "(*)=>[KNN 5 @embedding $vec AS score]" \
  PARAMS 2 vec "\x00\x01..." DIALECT 2 SORTBY score
```

### RedisJSON — Operasi Inti

| Perintah | Kegunaan |
|----------|----------|
| `JSON.SET key path nilai [NX\|XX]` | Menyimpan nilai; `NX` hanya menyisipkan jika belum ada, `XX` hanya jika sudah ada |
| `JSON.GET key [path ...]` | Mengambil nilai berdasarkan path (beberapa path diperbolehkan) |
| `JSON.MGET key [key ...] path` | Mengambil path yang sama dari beberapa key sekaligus |
| `JSON.DEL key [path]` | Menghapus seluruh dokumen atau subpohon |
| `JSON.FORGET key path` | Alias `JSON.DEL` yang dibatasi ke satu path |
| `JSON.TYPE key [path]` | Melaporkan tipe JSON pada sebuah path |
| `JSON.NUMINCRBY key path angka` | Menambah (atau mengurangi dengan angka negatif) nilai numerik |
| `JSON.NUMMULTBY key path angka` | Mengalikan nilai numerik |
| `JSON.STRAPPEND key path string` | Menggabungkan string ke nilai string |
| `JSON.STRLEN key path` | Panjang nilai string |
| `JSON.ARRAPPEND key path nilai [nilai ...]` | Menambahkan nilai ke array |
| `JSON.ARRINSERT key path indeks nilai [nilai ...]` | Menyisipkan nilai pada indeks array tertentu |
| `JSON.ARRINDEX key path nilai [start [stop]]` | Mencari elemen pertama yang cocok di array |
| `JSON.ARRTRIM key path start stop` | Memangkas array ke rentang |
| `JSON.ARRPOP key [path [indeks]]` | Menghapus dan mengembalikan elemen (default elemen terakhir) |
| `JSON.ARRLEN key path` | Panjang array |
| `JSON.OBJKEYS key path` | Key dari sebuah objek |
| `JSON.OBJLEN key path` | Jumlah anggota objek |
| `JSON.TOGGLE key path` | Membalik nilai boolean |
| `JSON.RESP key [path]` | Mengonversi JSON menjadi balasan RESP Redis |
| `JSON.DEBUG FIELDS key path` | Ukuran nilai pada path dalam byte |

```text
# Output dengan format yang rapi
JSON.GET user:1 INDENT "  " NEWLINE "\n" SPACE " " $.name $.age
```

### RedisJSON — Ekspresi JSONPath

```text
$               akar dokumen
$.name          field turunan "name"
$.address.city  field bersarang
$..price        pencarian rekursif: setiap "price" pada kedalaman berapa pun
$.items[*]      setiap elemen array "items"
$.items[0]      elemen pertama; $.items[-1] elemen terakhir
$.items[1:3]    irisan array
$.tags[?(@.urgent == true)]    ekspresi filter pada elemen array
```

Hanya path `$.` yang mendukung filter dan irisan; sintaks path `.` lama mencocokkan satu key yang tepat dan lebih cepat untuk tujuan tersebut.

### RedisTimeSeries — Manajemen Deret

```text
TS.CREATE temp:room1 \
  RETENTION 86400000 \               # simpan sampel 24 jam
  ENCODING COMPRESSED \              # atau UNCOMPRESSED
  DUPLICATE_POLICY LAST \            # BLOCK | FIRST | LAST | MIN | MAX | SUM
  LABELS room room1 sensor ds18b20   # label bebas untuk filtering
```

| Perintah | Kegunaan |
|----------|----------|
| `TS.CREATE key [RETENTION ms] [ENCODING mode] [CHUNK_SIZE byte] [DUPLICATE_POLICY kebijakan] [IGNORE nilai] [DECAY] [LABELS label nilai ...]` | Membuat deret dengan retensi, kebijakan kompaksi, dan label |
| `TS.ALTER key [RETENTION ms] [LABELS label nilai ...] [DUPLICATE_POLICY kebijakan]` | Mengubah pengaturan deret yang sudah ada |
| `TS.ADD key timestamp nilai [RETENTION ms] [ON_DUPLICATE kebijakan] [LABELS ...]` | Menambahkan sampel; timestamp `*` berarti "sekarang" |
| `TS.INCRBY key nilai [TIMESTAMP ts] [RETENTION ms] ...` | Menambah deret penghitung (juga `TS.DECRBY`) |
| `TS.DEL key timestamp_awal timestamp_akhir` | Menghapus rentang waktu sampel |
| `TS.INFO key` | Retensi, label, jumlah chunk, dan penggunaan memori |
| `TS.QUERYINDEX label=nilai ...` | Mengembalikan key semua deret yang cocok dengan filter label |

### RedisTimeSeries — Kueri dan Agregasi

```text
TS.RANGE temp:room1 1617972841000 1617972901000 \
  FILTER_BY_VALUE 18 30 \
  AGGREGATION avg 60000 \
  ALIGN 1617972840000
```

| Opsi | Kegunaan |
|------|----------|
| `AGGREGATION func ms_bucket` | Menurunkan sampel menjadi bucket tetap dengan `avg`, `sum`, `min`, `max`, `range`, `count`, `first`, `last`, `std.p`, `std.s`, `var.p`, `var.s`, `twa` |
| `BUCKETTIMESTAMP bt` | Memberi label tiap bucket dengan timestamp `-` awal, `+` akhir, atau `~` tengah |
| `EMPTY` | Memunculkan bucket tanpa sampel (nilai null) |
| `FILTER_BY_TS ts ...` | Mengembalikan hanya timestamp tertentu |
| `FILTER_BY_VALUE min max` | Mengembalikan sampel dalam rentang nilai |
| `COUNT n` | Membatasi jumlah sampel |
| `ALIGN nilai` | Menyelaraskan batas bucket ke timestamp, `-`, atau `+` |
| `LATEST` | Menyertakan sampel terbaru meskipun di luar rentang |

Kueri multi-deret memilih berdasarkan label dan menggabungkan lintas key:

```text
TS.MRANGE 1617972841000 1617972901000 \
  FILTER room=room1 area=front \
  GROUPBY room REDUCE avg \
  WITHLABELS
```

```text
TS.MGET FILTER room=room1   # sampel terbaru setiap deret yang cocok

TS.QUERYINDEX area=front    # key deret yang cocok
```

Aturan kompaksi terus-menerus menurunkan sampel deret sumber ke deret tujuan:

```text
TS.CREATERULE temp:room1 temp:room1:hourly AGGREGATION avg 3600000
TS.DELETERULE temp:room1 temp:room1:hourly
```

### RedisBloom — Struktur Probabilistik

Bloom filter menjawab "apakah ini pernah dilihat?" dengan tingkat false-positive yang dapat diatur dan memori yang hampir konstan:

```text
BF.RESERVE seen:url 0.01 1000000        # error rate 1%, ~1M item yang diperkirakan
BF.ADD seen:url "https://a.example"
BF.MADD seen:url "https://b.example" "https://c.example"
BF.EXISTS seen:url "https://a.example"   # (integer) 1
BF.MEXISTS seen:url "https://x.example" "https://y.example"
BF.INFO seen:url                         # kapasitas, ukuran, filter, item
```

| Perintah Bloom | Kegunaan |
|----------------|----------|
| `BF.RESERVE key error_rate kapasitas [EXPANSION n] [NONSCALING]` | Mengalokasikan filter terlebih dahulu |
| `BF.ADD key item` / `BF.MADD key item ...` | Menambahkan satu atau banyak item |
| `BF.EXISTS key item` / `BF.MEXISTS key item ...` | Uji keanggotaan (1 = mungkin ada, 0 = pasti tidak ada) |
| `BF.INSERT key CAPACITY cap ERROR rate items ... [NOCREATE]` | Menambahkan item, membuat filter sesuai kebutuhan |
| `BF.SCANDUMP key iter` / `BF.LOADCHUNK key iter data` | Cadangkan dan pulihkan filter antar server |
| `BF.INFO key` | Ukuran filter, jumlah elemen, dan error rate |

Cuckoo filter menambahkan penghapusan pada konsep yang sama, dan `CF.COUNT` melaporkan perkiraan multiplisitas:

```text
CF.RESERVE seen:ip 1000000
CF.ADDNX seen:ip "203.0.113.7"     # tambah hanya jika belum terhitung
CF.COUNT seen:ip "203.0.113.7"
CF.DEL seen:ip "203.0.113.7"       # aman: menghapus tepat satu kemunculan
```

Count-Min Sketch memperkirakan frekuensi aliran berkardinalitas tinggi:

```text
CMS.INITBYPROB clicks 0.001 0.001   # probabilitas error dan batas error
CMS.INCRBY clicks "page:/home" 1 "page:/checkout" 2
CMS.QUERY clicks "page:/home"       # perkiraan jumlah
CMS.MERGE totals clicks pageviews WEIGHTS 1 1
```

Top-K menyimpan item paling sering beserta perkiraan jumlahnya:

```text
TOPK.RESERVE trending:items 5
TOPK.ADD trending:items "item-42"
TOPK.INCRBY trending:items "item-7" 3
TOPK.QUERY trending:items "item-42"
TOPK.LIST trending:items
TOPK.INFO trending:items
```

### RedisGraph — Kueri Cypher (Modul Legacy)

RedisGraph memasuki mode pemeliharaan pada 2024 — deployment baru sebaiknya menggunakan FalkorDB (fork komunitas) atau graph store khusus. Perintah berikut tetap berjalan di server dengan modul yang dimuat.

```text
GRAPH.QUERY social "CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})"
GRAPH.QUERY social "MATCH (p:Person)-[:KNOWS]->(f) RETURN p.name, f.name"
GRAPH.RO_QUERY social "MATCH (p:Person) RETURN count(p)"
GRAPH.PROFILE social "MATCH (p:Person) RETURN p.name"
GRAPH.EXPLAIN social "MATCH (p:Person) RETURN p.name"
GRAPH.SLOWLOG social
GRAPH.DELETE social
```

## Potongan Kode

### Setup Redis Stack dan Pemuatan Modul

```bash
# Redis Stack menggabungkan RediSearch, RedisJSON, RedisTimeSeries, dan RedisBloom
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest

# Redis mentah: muat modul dari redis.conf atau baris perintah
redis-server --loadmodule /opt/redis-modules/redisearch.so \
             --loadmodule /opt/redis-modules/rejson.so

# Atau muat saat runtime di dalam redis-cli
MODULE LOAD /opt/redis-modules/redistimeseries.so
MODULE LIST
```

### RediSearch dengan Python (redis-py)

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Indeks hash dengan prefiks "product:" — name full-text, price numerik
r.ft("idx:product").create_index(
    (redis.commands.search.field.TextField("name", weight=5.0),
     redis.commands.search.field.NumericField("price")),
    prefix=["product:"],
)

r.hset("product:1", mapping={"name": "wireless mouse", "price": 25})

# Kueri dengan penargetan field dan rentang numerik
res = r.ft("idx:product").search('@name:wireless @price:[10 40]')
print(res.total)  # 1

# Agregasi: rata-rata harga per kategori
agg = r.ft("idx:product").aggregate(
    "*",
    ["FILTER", "@price > 0",
     "GROUPBY", "1", "@category",
     "REDUCE", "AVG", "1", "@price", "AS", "avg_price"])
print(agg.rows)
```

### RedisJSON dengan Node.js (node-redis)

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

await client.json.set('user:1', '$', { name: 'Alice', age: 30, tags: ['writer'] });
await client.json.arrAppend('user:1', '$.tags', 'redis');

console.log(await client.json.get('user:1', { path: '$.name' }));  // "Alice"
console.log(await client.json.numIncrBy('user:1', '$.age', 1));    // 31

// Indeks dokumen JSON dengan skema berbasis JSONPath
await client.ft.create(
  'idx:user',
  { '$.name': { type: 'TEXT', AS: 'name' } },
  { ON: 'JSON', PREFIX: 'user:' },
);

const hits = await client.ft.search('idx:user', '@name:Alice');
console.log(hits.total);
```

### RedisTimeSeries dengan Python

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

r.ts().create("temp:room1",
              retention_msecs=86_400_000,
              labels={"room": "room1", "area": "front"})

now = int(time.time() * 1000)
r.ts().add("temp:room1", now, 21.5)
r.ts().add("temp:room1", now + 60_000, 22.1)

# Rata-rata 60 detik selama 10 menit terakhir
rows = r.ts().range(
    "temp:room1", now - 600_000, now,
    aggregation="avg", bucket_size_msec=60_000)
print(rows)

# Kompaksi berkelanjutan ke deret per-jam
r.ts().create("temp:room1:hourly", retention_msecs=604_800_000)
r.ts().createrule("temp:room1", "temp:room1:hourly",
                  aggregation="avg", bucket_size_msec=3_600_000)

# Nilai terbaru setiap deret dengan label room=room1
print(r.ts().mget(["room=room1"]))
```

### RedisBloom dengan Python

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Bloom filter: deteksi duplikat cepat untuk aliran ID pesanan
r.bf().reserve("seen_orders", 0.01, 1_000_000)
r.bf().add("seen_orders", "order-1234")
print(r.bf().exists("seen_orders", "order-1234"))   # 1
print(r.bf().exists("seen_orders", "order-9999"))   # 0

# Top-K: permukaan produk yang sedang tren
r.topk().reserve("trending", 5)
r.topk().add("trending", "product-a", "product-b")
print(r.topk().list("trending"))

# Count-Min Sketch: perkiraan jumlah penayangan
r.cms().initbyprob("views", 0.001, 0.001)
r.cms().incrby("views", "video-99", 42)
print(r.cms().query("views", "video-99"))
```
