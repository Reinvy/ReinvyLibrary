---
title: "Silabus Geospasial PostgreSQL"
description: "Kurikulum khusus 12 minggu untuk membangun aplikasi berbasis lokasi dan platform analitik spasial di atas PostgreSQL dengan PostGIS — tipe dan indeks spasial, sistem koordinat, geocoding, analisis raster dan medan, routing, vector tiles, serta arsitektur geospasial produksi."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Geospasial PostgreSQL

## Ringkasan

Lokasi ada di mana-mana — layanan ride-hailing, logistik, analitik ritel, pemantauan lingkungan, perencanaan kota, dan aplikasi pemetaan semuanya bergantung pada penyimpanan, kueri, dan visualisasi data spasial. PostgreSQL, dengan ekstensi PostGIS, adalah database spasial open-source paling matang yang ada: ia membawa seluruh kekuatan SQL, integritas transaksional, dan ekosistem ekstensi yang kaya ke pemrosesan geometri dan geografi, serta mampu melayani segala kebutuhan mulai dari API GeoJSON hingga peta vector-tile global.

Kurikulum khusus 12 minggu ini mengajarkan peserta cara merancang, membangun, dan mengoperasikan platform geospasial kelas produksi di atas PostgreSQL. Asumsinya adalah pemahaman dasar PostgreSQL yang solid, dengan fokus pada sisi spasial dari stack: memodelkan tipe geometry dan geography, mengindeks dengan GiST, mengekspresikan relasi spasial dengan SQL, bekerja lintas sistem referensi koordinat, menyerap dataset dunia nyata seperti OpenStreetMap, menganalisis data raster dan elevasi, menghitung rute dengan pgRouting, serta menyajikan peta melalui vector tiles. Kurikulum ini sengaja berbeda dari kursus database umum — setiap minggu membangun menuju capstone, sebuah platform location-intelligence dengan arsitektur dan runbook operasional yang terdokumentasi.

## Kurikulum

### Minggu 1: Fundamental Data Spasial dan Setup PostGIS
- **Lanskap data spasial**
  - Titik, garis, dan poligon sebagai tipe data kelas satu
  - Model data vektor vs raster
  - GeoJSON, WKT/WKB, dan Shapefile sebagai format pertukaran
- **Memasang dan mengonfigurasi PostGIS**
  - Mengaktifkan ekstensi dan memeriksa versi
  - Pembuatan database spasial dan template database
  - Parameter konfigurasi PostGIS (memori, parallel workers)

### Minggu 2: Tipe Geometry dan Geography
- **Sistem tipe geometry**
  - Point, LineString, Polygon, Multi\* dan GeometryCollection
  - Dimensi Z dan M, serta kapan menggunakannya
  - Representasi Well-Known Text dan Well-Known Binary
- **Geometry vs geography**
  - Komputasi planar (Euclidean) vs bola (geodetik)
  - Trade-off akurasi dan performa
  - Memilih tipe yang tepat untuk sebuah workload

### Minggu 3: Indeks Spasial dan Performa Kueri
- **Cara kerja indeks GiST**
  - Aproksimasi bounding box dan alternatif SP-GiST
  - Predikat spasial terindeks vs non-terindeks
  - Rencana `EXPLAIN` untuk kueri spasial
- **Strategi pengindeksan untuk workload nyata**
  - Mengindeks hanya kolom yang dipakai pada filter
  - Covering index dan data spasial ter-cluster
  - Tunables: fill factor, operator classes, dan maintenance

### Minggu 4: Relasi dan Predikat Spasial
- **Predikat spasial fundamental**
  - `ST_Intersects`, `ST_Contains`, `ST_Within`, `ST_DWithin`
  - Dimensionally Extended 9-Intersection Model (DE-9IM)
  - `ST_Relate` dan matriks relasi kustom
- **Kueri jarak dan kedekatan**
  - `ST_Distance` dan `ST_DWithin` untuk geofencing
  - Pencarian nearest-neighbor dengan `ORDER BY geom <-> point`
  - Pola akselerasi indeks KNN

### Minggu 5: Operasi dan Analisis Spasial Lanjutan
- **Konstruksi dan transformasi geometri**
  - Buffer, convex hull, dan bentuk hasil generasi
  - `ST_Union`, `ST_Collect`, dan pola dissolve
  - Clipping dengan `ST_Intersection` dan `ST_Difference`
- **Kualitas geometri dan simplifikasi**
  - `ST_IsValid` dan perbaikan validitas
  - `ST_Simplify` dan simplifikasi sadar-topologi
  - Snap tolerance dan reduksi presisi

### Minggu 6: Sistem Referensi Koordinat dan Proyeksi
- **Memahami CRS dan SRID**
  - Sistem koordinat geografis vs terproyeksi
  - Kode EPSG: WGS84 (4326), Web Mercator (3857), zona UTM
  - Menyimpan dan mengonversi dengan `ST_SRID` dan `ST_Transform`
- **Keputusan proyeksi di produksi**
  - Kapan Web Mercator dapat diterima dan kapan tidak
  - Distorsi luas dan jarak antar proyeksi
  - Menangani data dari sumber campuran dengan SRID berbeda

### Minggu 7: Geocoding dan Ingestion Data Lokasi
- **Geocoding dan reverse geocoding**
  - Geocoder PostGIS dan normalisasi alamat
  - Parsing alamat jalan dengan `normalize_address`
  - Membangun layanan geocoding di atas fungsi SQL
- **Menyerap dataset dunia nyata**
  - Ekstraksi OpenStreetMap dengan `osm2pgsql` dan `osm2pgsql-flex`
  - Memuat Shapefile dan GeoJSON dengan GDAL/OGR (`ogr2ogr`)
  - Pemeriksaan kualitas: duplikat, geometri null, dan koordinat di luar rentang

### Minggu 8: Data Raster dan Analisis Medan
- **Tipe raster dan raster algebra**
  - Memuat raster GeoTIFF dan memeriksa band
  - Resampling, clipping, dan reproyeksi raster
  - `ST_MapAlgebra` untuk komputasi level piksel
- **Analisis elevasi dan medan**
  - Slope, aspect, dan hillshade dari model elevasi
  - `ST_Clip` dan `ST_Reclass` untuk ekstraksi area
  - Menggabungkan analisis raster dan vektor dalam satu kueri

### Minggu 9: Routing dan Analisis Jaringan dengan pgRouting
- **Memodelkan jaringan jalan sebagai graf**
  - Menyiapkan tabel edge yang bersih secara topologi
  - Ikhtisar keluarga fungsi `pgr_*`
  - Dijkstra, A\*, dan contraction hierarchies
- **Aplikasi routing praktis**
  - Kueri shortest-path dan driving-distance
  - Isochrone dan analisis service-area
  - Turn restrictions, biaya, dan bobot pada edge

### Minggu 10: Vector Tiles dan Integrasi Peta Web
- **Menghasilkan vector tiles dari SQL**
  - `ST_AsMVT` dan spesifikasi tile MVT
  - Centerline, geometri tergeneralisasi, dan tile clipping
  - Strategi caching dan penyajian tile
- **Membangun stack peta**
  - Menyajikan tile ke MapLibre, Leaflet, atau Mapbox GL
  - Styling berbasis database dan atribut fitur
  - Budget performa: ukuran tile, jumlah, dan latensi

### Minggu 11: Arsitektur Aplikasi Geospasial Berskala Besar
- **Pola spasial untuk backend aplikasi**
  - Geofencing, pencarian kedekatan, dan clustering lokasi
  - Kueri spatiotemporal yang menggabungkan waktu dan ruang
  - Spatial join berskala besar dan refresh inkremental
- **Operasional dan observabilitas**
  - Rutinitas maintenance Vacuum, bloat, dan GiST
  - Memantau performa kueri spasial
  - Backup, replikasi, dan pinning versi ekstensi

### Minggu 12: Capstone — Platform Location Intelligence
- **Merancang platform lokasi end-to-end**
  - Menyerap dataset berskala kota nyata (mis. ekstrak OpenStreetMap)
  - Membangun API geocoding, geofencing, dan kedekatan
  - Menambahkan layanan routing dan lapisan peta vector-tile
- **Mengirim dan mendokumentasikan**
  - Load testing endpoint spasial dan tuning indeks
  - Menulis runbook arsitektur dan operasional
  - Presentasi desain sistem dan metrik terukur

## Proyek Akhir

Peserta membangun platform location-intelligence untuk kota pilihan mereka. Platform harus menyerap ekstrak OpenStreetMap nyata, menyediakan API geocoding (forward dan reverse), mendukung kueri geofencing dan kedekatan atas titik-titik menarik, menghitung rute berkendara antar alamat arbitrer, dan merender peta web dari vector tiles yang dihasilkan server.

Proyek dikirim sebagai database PostgreSQL yang berfungsi dengan ekstensi PostGIS dan pgRouting, desain skema dan indeks yang terdokumentasi, kumpulan fungsi SQL atau lapisan API tipis yang mengekspos endpoint spasial, klien peta web, pengukuran performa dari load testing, serta runbook operasional yang mencakup maintenance, backup, dan pemantauan. Lab mingguan terhubung langsung ke capstone, sehingga peserta mengakumulasi komponen secara inkremental alih-alih memulai dari nol di akhir.

## Kriteria Penilaian

- **Tugas**: Lab praktik mingguan dinilai berdasarkan kebenaran kueri spasial SQL, ketepatan pemilihan tipe dan SRID, penggunaan indeks yang terlihat pada query plan, serta penjelasan tertulis yang jelas atas keputusan desain (proyek mandiri, plus kuis singkat tentang fundamental spasial seperti model DE-9IM dan perilaku CRS).
- **Proyek Akhir**: Dievaluasi berdasarkan kelengkapan fungsional (semua endpoint yang ditentukan dan lapisan peta bekerja end-to-end), kualitas teknis (penggunaan indeks GiST yang tepat, pilihan geometry vs geography yang masuk akal, reproyeksi yang benar), performa (latensi kueri terdokumentasi di bawah beban dengan bukti tuning), dan kualitas dokumentasi (skema, runbook, dan tulisan desain sistem).

## Referensi

- [Dokumentasi PostGIS](https://postgis.net/documentation/)
- [Workshop PostGIS](https://postgis.net/workshops/postgis-intro/)
- [Dokumentasi pgRouting](https://docs.pgrouting.org/)
- [Ekstrak dan alat data OpenStreetMap](https://www.openstreetmap.org/)
- [Dokumentasi MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [Dokumentasi GDAL/OGR](https://gdal.org/)
