---
title: "Membangun Dashboard Keuangan Pribadi dengan Next.js"
description: "Tutorial komprehensif tentang impor transaksi CSV, visualisasi data dengan Recharts, Prisma ORM untuk data keuangan, autentikasi dengan Auth.js, dan dashboard responsif di Next.js."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Dashboard Keuangan Pribadi dengan Next.js

## Ringkasan

Dalam tutorial ini, Anda akan membangun dashboard keuangan pribadi yang lengkap menggunakan Next.js App Router. Anda akan mempelajari cara mengimpor transaksi bank dari file CSV, mengkategorikan dan menganalisis pola pengeluaran, memvisualisasikan data keuangan dengan grafik interaktif, serta mengelola anggaran — semuanya dalam aplikasi responsif yang siap produksi. Pada akhirnya, Anda akan memiliki pelacak keuangan pribadi yang berfungsi penuh, sudah di-deploy dengan keamanan sisi server dan antarmuka yang modern.

## Target Audiens

- Pengembang full-stack dan frontend yang nyaman dengan React dan TypeScript.
- Pengembang yang sudah menguasai dasar Next.js dan ingin membangun aplikasi data-intensif di dunia nyata.
- Ekspektasi tingkat kemampuan: Menengah.

## Prasyarat

- Pemahaman yang baik tentang React (hooks, komponen, props) dan dasar TypeScript.
- Familiar dengan fundamental Next.js App Router (layout, rute, Server Components).
- Node.js 18+ dan package manager (npm, yarn, atau pnpm) terinstal.
- Database PostgreSQL (lokal atau cloud — kami merekomendasikan Neon).
- Penyedia OAuth yang kompatibel dengan Auth.js (Google atau GitHub) untuk autentikasi.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membangun dashboard multi-halaman dengan route group dinamis dan layout yang dilindungi autentikasi.
- Mengurai dan mengimpor data transaksi CSV dengan aman menggunakan Server Actions Next.js.
- Mendesain skema data keuangan yang ternormalisasi dengan Prisma ORM.
- Memvisualisasikan tren pengeluaran dan rincian kategori menggunakan Recharts.
- Menerapkan pencarian berbasis URL, pemfilteran, dan paginasi dengan search params Next.js.
- Men-deploy aplikasi Next.js yang sarat data ke Vercel dengan database PostgreSQL.

## Konteks dan Motivasi

Manajemen keuangan pribadi adalah salah satu aplikasi paling praktis yang dapat dibangun oleh seorang pengembang. Kebanyakan orang memiliki rekening bank yang mengekspor data transaksi sebagai file CSV, tetapi mengubah data mentah tersebut menjadi wawasan yang dapat ditindaklanjuti membutuhkan aplikasi yang dirancang dengan baik.

Dashboard keuangan menyentuh hampir setiap aspek pengembangan full-stack: penanganan file yang aman, pemodelan data, pemrosesan sisi server, pemfilteran pencarian waktu nyata, visualisasi data, dan desain responsif. Dengan membangun proyek ini, Anda akan menguasai pola-pola yang langsung dapat diterapkan ke dashboard SaaS, platform analitik, dan aplikasi web data-intensif lainnya.

## Konten Inti

### Persiapan Proyek dan Skema Database

Mulai dengan membuat proyek Next.js baru dengan TypeScript dan Tailwind CSS:

```bash
npx create-next-app@latest finance-dashboard --typescript --tailwind --eslint
cd finance-dashboard
```

Instal dependensi inti:

```bash
npm install prisma @prisma/client @auth/prisma-adapter next-auth@beta recharts csv-parse lucide-react date-fns
npm install -D @types/csv-parse
```

Siapkan Prisma dengan PostgreSQL. Buat skema yang memodelkan transaksi keuangan, kategori, anggaran, dan akun pengguna:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  transactions  Transaction[]
  budgets       Budget[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Transaction {
  id          String   @id @default(cuid())
  userId      String
  date        DateTime
  description String
  amount      Float
  categoryId  String
  type        String   @default("expense") // expense atau income
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id])

  @@index([userId, date(sort: Desc)])
  @@index([userId, categoryId])
}

model Category {
  id           String        @id @default(cuid())
  name         String
  icon         String        @default("tag")
  color        String        @default("#6366f1")
  userId       String?
  transactions Transaction[]
  budgets      Budget[]

  @@unique([name, userId])
}

model Budget {
  id         String   @id @default(cuid())
  userId     String
  categoryId String
  amount     Float
  month      Int      // 1-12
  year       Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id])

  @@unique([userId, categoryId, month, year])
}
```

Jalankan migrasi:

```bash
npx prisma migrate dev --name init
```

Buat singleton klien Prisma untuk menghindari kehabisan koneksi selama pengembangan:

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Autentikasi dengan Auth.js

Siapkan Auth.js v5 dengan penyedia OAuth Google atau GitHub. Buat konfigurasi auth:

```typescript
// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
```

Buat handler rute API Auth.js:

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

Tambahkan variabel lingkungan ke file `.env`:

```text
DATABASE_URL="postgresql://..."
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
```

### Layout Dashboard dengan Perlindungan Rute

Buat layout dashboard terproteksi yang memeriksa autentikasi dan mengambil data pengguna. Gunakan route group untuk memisahkan halaman auth dari halaman dashboard:

```text
app/
  (auth)/
    login/
      page.tsx
  (dashboard)/
    layout.tsx
    page.tsx
    transactions/
      page.tsx
    categories/
      page.tsx
    budgets/
      page.tsx
  api/
    auth/
      [...nextauth]/
        route.ts
  layout.tsx
  page.tsx
```

Layout dashboard menerapkan autentikasi dan menyediakan navigasi bersama:

```typescript
// app/(dashboard)/layout.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar user={session.user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

### Impor Transaksi CSV

Salah satu fitur paling kuat dari dashboard keuangan adalah mengimpor data bank nyata. Bangun Server Action yang mengurai file CSV dan memasukkan transaksi ke database.

Pertama, buat utilitas yang menormalisasi format CSV spesifik bank ke struktur standar. Bank yang berbeda mengekspor nama kolom yang berbeda, sehingga parser harus dapat dikonfigurasi:

```typescript
// lib/import-parser.ts
import { parse } from "csv-parse/sync";

export interface RawTransaction {
  date: string;
  description: string;
  amount: number;
  type: "expense" | "income";
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  type?: string;
}

const DEFAULT_MAPPING: ColumnMapping = {
  date: "date",
  description: "description",
  amount: "amount",
};

export function parseCSVTransactions(
  csvContent: string,
  mapping: ColumnMapping = DEFAULT_MAPPING
): RawTransaction[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // menangani BOM UTF-8 Excel
  });

  return records.map((row: Record<string, string>) => {
    const amount = parseFloat(row[mapping.amount]) || 0;
    const type = amount < 0 ? "expense" : "income";

    return {
      date: row[mapping.date],
      description: row[mapping.description],
      amount: Math.abs(amount),
      type: mapping.type ? (row[mapping.type] as "expense" | "income") : type,
    };
  });
}
```

Sekarang buat Server Action yang menangani impor:

```typescript
// lib/actions/import.ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseCSVTransactions, type ColumnMapping } from "@/lib/import-parser";
import { revalidatePath } from "next/cache";

export async function importTransactions(
  formData: FormData
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, count: 0, errors: ["Tidak terautentikasi"] };
  }

  const file = formData.get("file") as File;
  if (!file || !file.name.endsWith(".csv")) {
    return { success: false, count: 0, errors: ["Unggah file CSV"] };
  }

  const errors: string[] = [];
  let importedCount = 0;

  try {
    const csvText = await file.text();
    const mapping: ColumnMapping = {
      date: (formData.get("dateColumn") as string) || "date",
      description: (formData.get("descriptionColumn") as string) || "description",
      amount: (formData.get("amountColumn") as string) || "amount",
    };

    const transactions = parseCSVTransactions(csvText, mapping);

    // Cari atau buat kategori default "Tidak Terkategorikan"
    let defaultCategory = await prisma.category.findFirst({
      where: { name: "Tidak Terkategorikan", userId: session.user.id },
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: "Tidak Terkategorikan", userId: session.user.id },
      });
    }

    // Insert batch transaksi
    const batchSize = 100;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      await prisma.transaction.createMany({
        data: batch.map((tx) => ({
          userId: session.user!.id,
          date: new Date(tx.date),
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          categoryId: defaultCategory!.id,
        })),
        skipDuplicates: true,
      });
      importedCount += batch.length;
    }

    revalidatePath("/transactions");
    revalidatePath("/");
  } catch (error) {
    console.error("Import gagal:", error);
    errors.push("Gagal memproses file CSV. Periksa format dan coba lagi.");
  }

  return { success: errors.length === 0, count: importedCount, errors };
}
```

Bangun UI impor dengan zona drag-and-drop dan formulir pemetaan kolom:

```typescript
// components/import-dialog.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, FileText, X } from "lucide-react";
import { importTransactions } from "@/lib/actions/import";

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    count: number;
    errors: string[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await importTransactions(formData);
      setResult(res);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Impor Transaksi</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form action={handleSubmit}>
          <div
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-indigo-600">
                <FileText className="w-6 h-6" />
                <span className="font-medium">{file.name}</span>
              </div>
            ) : (
              <div className="text-gray-500">
                <Upload className="w-10 h-10 mx-auto mb-2" />
                <p>Letakkan file CSV Anda di sini atau klik untuk memilih</p>
                <p className="text-sm mt-1">File ekspor bank didukung</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {file && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Petakan kolom CSV:
              </p>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">Kolom tanggal</span>
                  <input
                    name="dateColumn"
                    defaultValue="date"
                    className="mt-1 w-full px-2 py-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Deskripsi</span>
                  <input
                    name="descriptionColumn"
                    defaultValue="description"
                    className="mt-1 w-full px-2 py-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Kolom jumlah</span>
                  <input
                    name="amountColumn"
                    defaultValue="amount"
                    className="mt-1 w-full px-2 py-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  />
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || isPending}
            className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Mengimpor..." : "Impor Transaksi"}
          </button>
        </form>

        {result && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              result.success
                ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {result.success
              ? `Berhasil mengimpor ${result.count} transaksi.`
              : `Impor selesai dengan ${result.errors.length} error: ${result.errors.join(", ")}. ${result.count} transaksi diimpor.`}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Ikhtisar Dashboard dengan Grafik Pengeluaran

Halaman dashboard utama menampilkan ringkasan keuangan dan grafik interaktif. Bangun Server Component yang mengambil data agregat:

```typescript
// app/(dashboard)/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OverviewCards } from "@/components/overview-cards";
import { SpendingByCategory } from "@/components/spending-by-category";
import { MonthlyTrend } from "@/components/monthly-trend";
import { RecentTransactions } from "@/components/recent-transactions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Agregasi pengeluaran bulan ini
  const monthlyExpenses = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "expense",
      date: {
        gte: new Date(currentYear, currentMonth - 1, 1),
        lt: new Date(currentYear, currentMonth, 1),
      },
    },
    _sum: { amount: true },
    _count: { amount: true },
  });

  // Pengeluaran per kategori bulan ini
  const categorySpending = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "expense",
      date: {
        gte: new Date(currentYear, currentMonth - 1, 1),
        lt: new Date(currentYear, currentMonth, 1),
      },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  // Ambil detail kategori
  const categoryIds = categorySpending.map((c) => c.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
  });

  // Tren bulanan untuk 6 bulan terakhir
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyTrend = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      date: { gte: sixMonthsAgo },
    },
    _sum: { amount: true },
  });

  // Transaksi terbaru
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 5,
    include: { category: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <ImportButton />
      </div>

      <OverviewCards
        totalExpenses={monthlyExpenses._sum.amount ?? 0}
        transactionCount={monthlyExpenses._count.amount ?? 0}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingByCategory
          categories={categories}
          spending={categorySpending}
        />
        <MonthlyTrend
          transactions={recentTransactions}
          monthlyData={monthlyTrend}
        />
      </div>

      <RecentTransactions transactions={recentTransactions} />
    </div>
  );
}
```

Bangun komponen grafik pengeluaran per kategori menggunakan Recharts:

```typescript
// components/spending-by-category.tsx
"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SpendingItem {
  categoryId: string;
  _sum: { amount: number | null };
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export function SpendingByCategory({
  categories,
  spending,
}: {
  categories: Category[];
  spending: SpendingItem[];
}) {
  const data = spending
    .map((item) => {
      const category = categories.find((c) => c.id === item.categoryId);
      return {
        name: category?.name ?? "Tidak Terkategorikan",
        value: item._sum.amount ?? 0,
        color: category?.color ?? "#6b7280",
      };
    })
    .filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold mb-4">Pengeluaran per Kategori</h3>
        <p className="text-gray-500 text-sm">Belum ada pengeluaran bulan ini.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-semibold mb-4">Pengeluaran per Kategori</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `$${value.toFixed(2)}`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Manajemen Transaksi dengan Pencarian dan Filter

Bangun halaman transaksi yang lengkap dengan pencarian berbasis URL, pemfilteran, dan paginasi. Pola ini menjaga status filter tetap di URL sehingga dapat dibagikan dan di-bookmark:

```typescript
// app/(dashboard)/transactions/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TransactionList } from "@/components/transaction-list";
import { TransactionFilters } from "@/components/transaction-filters";

interface TransactionsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    sort?: string;
    order?: string;
  }>;
}

const ITEMS_PER_PAGE = 20;

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const skip = (page - 1) * ITEMS_PER_PAGE;

  // Bangun klausa where dari search params
  const where: Record<string, unknown> = { userId: session.user.id };

  if (params.search) {
    where.description = {
      contains: params.search,
      mode: "insensitive",
    };
  }
  if (params.category) where.categoryId = params.category;
  if (params.type) where.type = params.type;
  if (params.startDate || params.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (params.startDate) dateFilter.gte = new Date(params.startDate);
    if (params.endDate) dateFilter.lte = new Date(params.endDate);
    where.date = dateFilter;
  }

  const [transactions, totalCount, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: where as any,
      include: { category: true },
      orderBy: { [params.sort ?? "date"]: params.order ?? "desc" },
      take: ITEMS_PER_PAGE,
      skip,
    }),
    prisma.transaction.count({ where: where as any }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transaksi</h1>
        <ImportButton />
      </div>

      <TransactionFilters categories={categories} />

      <TransactionList
        transactions={transactions}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </div>
  );
}
```

Komponen filter sisi klien membaca dan menulis search params URL:

```typescript
// components/transaction-filters.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { Search } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
}

export function TransactionFilters({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useDebouncedCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set("page", "1"); // reset ke halaman pertama saat filter berubah
      router.push(`${pathname}?${params.toString()}`);
    },
    300
  );

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cari transaksi..."
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => updateParams("search", e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      <select
        defaultValue={searchParams.get("category") ?? ""}
        onChange={(e) => updateParams("category", e.target.value)}
        className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700"
      >
        <option value="">Semua Kategori</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("type") ?? ""}
        onChange={(e) => updateParams("type", e.target.value)}
        className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700"
      >
        <option value="">Semua Tipe</option>
        <option value="expense">Pengeluaran</option>
        <option value="income">Pemasukan</option>
      </select>

      <input
        type="date"
        defaultValue={searchParams.get("startDate") ?? ""}
        onChange={(e) => updateParams("startDate", e.target.value)}
        className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700"
      />
      <input
        type="date"
        defaultValue={searchParams.get("endDate") ?? ""}
        onChange={(e) => updateParams("endDate", e.target.value)}
        className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700"
      />
    </div>
  );
}
```

### Manajemen Anggaran

Bangun pelacakan anggaran yang membandingkan pengeluaran bulanan dengan batas yang telah ditentukan:

```typescript
// lib/actions/budget.ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setBudget(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Tidak terautentikasi");

  const categoryId = formData.get("categoryId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const month = parseInt(formData.get("month") as string, 10);
  const year = parseInt(formData.get("year") as string, 10);

  if (!categoryId || isNaN(amount) || isNaN(month) || isNaN(year)) {
    throw new Error("Data anggaran tidak valid");
  }

  await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId: session.user.id,
        categoryId,
        month,
        year,
      },
    },
    update: { amount },
    create: {
      userId: session.user.id,
      categoryId,
      amount,
      month,
      year,
    },
  });

  revalidatePath("/budgets");
}

export async function deleteBudget(budgetId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Tidak terautentikasi");

  await prisma.budget.delete({
    where: { id: budgetId, userId: session.user.id },
  });

  revalidatePath("/budgets");
}
```

Halaman anggaran menampilkan progress bar untuk setiap kategori yang membandingkan pengeluaran aktual dengan jumlah yang dianggarkan:

```typescript
// app/(dashboard)/budgets/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BudgetCard } from "@/components/budget-card";
import { BudgetForm } from "@/components/budget-form";

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const budgets = await prisma.budget.findMany({
    where: { userId, month: currentMonth, year: currentYear },
    include: { category: true },
  });

  // Hitung pengeluaran untuk setiap kategori anggaran
  const budgetIds = budgets.map((b) => b.categoryId);
  const spending = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      categoryId: { in: budgetIds },
      type: "expense",
      date: {
        gte: new Date(currentYear, currentMonth - 1, 1),
        lt: new Date(currentYear, currentMonth, 1),
      },
    },
    _sum: { amount: true },
  });

  const spendingMap = new Map(
    spending.map((s) => [s.categoryId, s._sum.amount ?? 0])
  );

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Anggaran</h1>
        <BudgetForm categories={categories} />
      </div>

      {budgets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Belum ada anggaran untuk bulan ini.</p>
          <p className="text-sm mt-1">
            Buat anggaran untuk mulai melacak batas pengeluaran Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              spent={spendingMap.get(budget.categoryId) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Contoh Kode

### Komponen BudgetCard Lengkap

Komponen klien ini menampilkan anggaran tunggal dengan progress bar berkode warna:

```typescript
// components/budget-card.tsx
"use client";

import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { deleteBudget } from "@/lib/actions/budget";

interface BudgetCardProps {
  budget: {
    id: string;
    amount: number;
    category: { name: string; color: string; icon: string };
  };
  spent: number;
}

export function BudgetCard({ budget, spent }: BudgetCardProps) {
  const percentage = Math.min((spent / budget.amount) * 100, 100);
  const isOverBudget = spent > budget.amount;
  const remaining = budget.amount - spent;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">{budget.category.name}</h3>
          <p className="text-sm text-gray-500">
            ${spent.toFixed(2)} dari ${budget.amount.toFixed(2)}
          </p>
        </div>
        <div className="w-14 h-14">
          <CircularProgressbar
            value={percentage}
            text={`${Math.round(percentage)}%`}
            styles={buildStyles({
              textSize: "28px",
              pathColor: isOverBudget ? "#ef4444" : budget.category.color,
              textColor: isOverBudget ? "#ef4444" : "#374151",
            })}
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-sm">
        {isOverBudget ? (
          <span className="text-red-600 font-medium">
            Lebih anggaran sebesar ${Math.abs(remaining).toFixed(2)}
          </span>
        ) : (
          <span className="text-green-600 font-medium">
            Sisa ${remaining.toFixed(2)}
          </span>
        )}
        <form action={deleteBudget.bind(null, budget.id)}>
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Hapus
          </button>
        </form>
      </div>
    </div>
  );
}
```

### Hook Debounce Kustom untuk Pencarian

Hook debounce ringan mencegah pembaruan URL yang berlebihan saat mengetik dengan cepat:

```typescript
// hooks/use-debounced-callback.ts
import { useCallback, useRef } from "react";

export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  ) as T;
}
```

### Script Seed untuk Pengembangan

Buat script seed untuk mengisi database dengan data sampel yang realistis:

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Perumahan", icon: "home", color: "#ef4444" },
  { name: "Makanan", icon: "utensils", color: "#f97316" },
  { name: "Transportasi", icon: "car", color: "#eab308" },
  { name: "Hiburan", icon: "film", color: "#22c55e" },
  { name: "Belanja", icon: "shopping-bag", color: "#3b82f6" },
  { name: "Kesehatan", icon: "heart-pulse", color: "#ec4899" },
  { name: "Utilitas", icon: "zap", color: "#8b5cf6" },
  { name: "Gaji", icon: "briefcase", color: "#06b6d4" },
];

async function main() {
  console.log("Mengisi database...");

  // Buat kategori
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { name_userId: { name: cat.name, userId: "" } },
      update: {},
      create: { ...cat },
    });
  }

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Tambahkan konfigurasi seed ke `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

## Insight Penting

- **URL search params adalah state manager terbaik untuk UI filter**: Menyimpan status filter di URL (bukan state React) membuat halaman dapat dibagikan, di-bookmark, dan di-render di server. Next.js `searchParams` di Server Components menangani ini secara native, dan komponen klien dapat membaca/menulisnya melalui `useSearchParams` dan `useRouter`.
- **Batch import dengan createMany jauh lebih cepat**: Memasukkan 1000 transaksi satu per satu dengan `prisma.transaction.create()` membutuhkan 10-15 detik. Menggunakan `createMany()` dengan ukuran batch 100 mengurangi ini menjadi di bawah 1 detik.
- **Selalu parsing jumlah sebagai nilai absolut dengan field tipe terpisah**: Ekspor CSV bank mungkin menggunakan nilai negatif untuk pengeluaran. Menormalisasi ke nilai positif dengan field `type` eksplisit (expense/income) menghilangkan ambiguitas dan menyederhanakan query agregasi.
- **Server Actions dengan FormData ideal untuk unggahan file**: FormData membawa file CSV dan field pemetaan kolom dalam satu permintaan tanpa memerlukan rute API multipart. Direktif `"use server"` menjaga logika impor tetap bersama dengan kode server lainnya.
- **Pie chart Recharts dengan innerRadius membuat donut chart**: Menggunakan `innerRadius={60}` mengubah pie chart standar menjadi donut chart, yang merupakan visualisasi standar untuk rincian kategori anggaran. Bagian tengah yang kosong dapat menampilkan angka total secara opsional.

## Langkah Berikutnya

- Tambahkan deteksi transaksi berulang menggunakan pencocokan pola pada deskripsi.
- Implementasikan "perkiraan arus kas" yang memprediksi saldo masa depan berdasarkan pendapatan dan pengeluaran berulang.
- Jelajahi [Silabus Next.js](/frontend/nextjs/syllabi/nextjs-syllabus.md) untuk jalur pembelajaran terstruktur.
- Pelajari tentang visualisasi data tingkat lanjut dengan [dokumentasi Recharts](https://recharts.org/en-US/guide).

## Kesimpulan

Anda telah berhasil membangun dashboard keuangan pribadi yang lengkap dengan Next.js yang menangani impor data CSV dunia nyata, manajemen transaksi dengan pencarian dan pemfilteran berbasis URL, visualisasi pengeluaran interaktif dengan Recharts, dan pelacakan anggaran dengan pemantauan progress. Sepanjang proses ini, Anda menguasai Server Actions untuk pemrosesan file yang aman, Prisma ORM untuk pemodelan data keuangan, manajemen state berbasis search params, dan layout dashboard responsif dengan Tailwind CSS. Pola-pola ini dapat langsung ditransfer ke aplikasi SaaS berbasis data lainnya.
