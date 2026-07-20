---
title: "Building a Personal Finance Dashboard with Next.js"
description: "A comprehensive hands-on tutorial covering CSV transaction import, data visualization with Recharts, Prisma ORM for financial data, authentication with Auth.js, and responsive dashboards in Next.js."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Personal Finance Dashboard with Next.js

## Summary

In this tutorial, you will build a full-featured personal finance dashboard using Next.js App Router. You will learn how to import bank transactions from CSV files, categorize and analyze spending patterns, visualize financial data with interactive charts, and manage budgets — all within a responsive, production-ready application. By the end, you will have a deployed personal finance tracker that processes real financial data with server-side security and a polished user interface.

## Target Audience

- Full-stack and frontend developers comfortable with React and TypeScript.
- Developers who know Next.js basics and want to build a data-driven, real-world application.
- Expected developer level: Intermediate.

## Prerequisites

- Solid understanding of React (hooks, components, props) and TypeScript basics.
- Familiarity with Next.js App Router fundamentals (layouts, routes, Server Components).
- Node.js 18+ and a package manager (npm, yarn, or pnpm) installed.
- A PostgreSQL database (local or cloud — we use Neon for simplicity).
- A free Auth.js-compatible OAuth provider (Google or GitHub) for authentication.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Build a multi-page dashboard with dynamic route groups and authentication-protected layouts.
- Parse and import CSV transaction data securely using Next.js Server Actions.
- Design a normalized financial data schema with Prisma ORM.
- Visualize spending trends and category breakdowns using Recharts.
- Implement URL-based search, filtering, and pagination with Next.js search params.
- Deploy a data-heavy Next.js application to Vercel with a PostgreSQL database.

## Context and Motivation

Personal finance management is one of the most practical applications a developer can build. Most people have bank accounts that export transaction data as CSV files, but turning that raw data into actionable insight requires a well-architected application.

A finance dashboard touches nearly every aspect of full-stack development: secure file handling, data modeling, server-side processing, real-time search filtering, data visualization, and responsive design. By building this project, you will master patterns that apply directly to SaaS dashboards, analytics platforms, and any data-intensive web application.

## Core Content

### Project Setup and Database Schema

Start by creating a new Next.js project with TypeScript and Tailwind CSS:

```bash
npx create-next-app@latest finance-dashboard --typescript --tailwind --eslint
cd finance-dashboard
```

Install the core dependencies:

```bash
npm install prisma @prisma/client @auth/prisma-adapter next-auth@beta recharts csv-parse lucide-react date-fns
npm install -D @types/csv-parse
```

Set up Prisma with PostgreSQL. Create a schema that models financial transactions, categories, budgets, and user accounts:

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
  type        String   @default("expense") // expense or income
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

Run the migration:

```bash
npx prisma migrate dev --name init
```

Create a Prisma singleton client to avoid exhausting connections during development:

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Authentication with Auth.js

Set up Auth.js v5 with a Google or GitHub OAuth provider. Create the auth configuration:

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

Create the Auth.js API route handler:

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

Add environment variables to your `.env` file:

```text
DATABASE_URL="postgresql://..."
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
```

### Dashboard Layout with Route Protection

Create a protected dashboard layout that checks authentication and fetches the current user. Use a route group to separate auth pages from dashboard pages:

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

The dashboard layout enforces authentication and provides shared navigation:

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

### CSV Transaction Import

One of the most powerful features of a finance dashboard is importing real bank data. Build a Server Action that parses CSV files and inserts transactions into the database.

First, create a utility that normalizes bank-specific CSV formats to a standard structure. Different banks export different column names, so the parser must be configurable:

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
    bom: true, // handle Excel UTF-8 BOM
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

Now create the Server Action that handles the import:

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
    return { success: false, count: 0, errors: ["Unauthorized"] };
  }

  const file = formData.get("file") as File;
  if (!file || !file.name.endsWith(".csv")) {
    return { success: false, count: 0, errors: ["Please upload a CSV file"] };
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

    // Find or create the "Uncategorized" default category
    let defaultCategory = await prisma.category.findFirst({
      where: { name: "Uncategorized", userId: session.user.id },
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: "Uncategorized", userId: session.user.id },
      });
    }

    // Batch insert transactions
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
    console.error("Import failed:", error);
    errors.push("Failed to process CSV file. Check the format and try again.");
  }

  return { success: errors.length === 0, count: importedCount, errors };
}
```

Build the import UI with a drag-and-drop zone and column mapping form:

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
          <h2 className="text-lg font-semibold">Import Transactions</h2>
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
                <p>Drop your CSV file here or click to browse</p>
                <p className="text-sm mt-1">Bank export files supported</p>
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
                Map your CSV columns:
              </p>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">Date column</span>
                  <input
                    name="dateColumn"
                    defaultValue="date"
                    className="mt-1 w-full px-2 py-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Description</span>
                  <input
                    name="descriptionColumn"
                    defaultValue="description"
                    className="mt-1 w-full px-2 py-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Amount column</span>
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
            {isPending ? "Importing..." : "Import Transactions"}
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
              ? `Successfully imported ${result.count} transactions.`
              : `Import completed with ${result.errors.length} error(s): ${result.errors.join(", ")}. ${result.count} transactions imported.`}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Dashboard Overview with Spending Charts

The main dashboard page displays financial summaries and interactive charts. Build a Server Component that fetches aggregated data:

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

  // Aggregate current month spending
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

  // Spending by category for the current month
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

  // Fetch full category details
  const categoryIds = categorySpending.map((c) => c.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
  });

  // Monthly trend for the past 6 months
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

  // Recent transactions
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

Build the spending-by-category chart component using Recharts:

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
        name: category?.name ?? "Uncategorized",
        value: item._sum.amount ?? 0,
        color: category?.color ?? "#6b7280",
      };
    })
    .filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
        <p className="text-gray-500 text-sm">No expenses recorded this month.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
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

### Transaction Management with Search and Filters

Build a full-featured transactions page with URL-based search, filtering, and pagination. This pattern keeps filter state in the URL so it is shareable and bookmarkable:

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

  // Build the where clause from search params
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
        <h1 className="text-2xl font-bold">Transactions</h1>
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

The client-side filter component reads and writes URL search params:

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
      params.set("page", "1"); // reset to first page on filter change
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
          placeholder="Search transactions..."
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
        <option value="">All Categories</option>
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
        <option value="">All Types</option>
        <option value="expense">Expenses</option>
        <option value="income">Income</option>
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

### Budget Management

Build budget tracking that compares monthly spending against predefined limits:

```typescript
// lib/actions/budget.ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setBudget(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const categoryId = formData.get("categoryId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const month = parseInt(formData.get("month") as string, 10);
  const year = parseInt(formData.get("year") as string, 10);

  if (!categoryId || isNaN(amount) || isNaN(month) || isNaN(year)) {
    throw new Error("Invalid budget data");
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
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.budget.delete({
    where: { id: budgetId, userId: session.user.id },
  });

  revalidatePath("/budgets");
}
```

The budgets page shows a progress bar for each category comparing actual spending to the budgeted amount:

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

  // Calculate spending for each budget category
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
        <h1 className="text-2xl font-bold">Budgets</h1>
        <BudgetForm categories={categories} />
      </div>

      {budgets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No budgets set for this month.</p>
          <p className="text-sm mt-1">
            Create a budget to start tracking your spending limits.
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

## Code Examples

### Complete Budget Card Component

This client component displays a single budget with a color-coded progress bar:

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
            ${spent.toFixed(2)} of ${budget.amount.toFixed(2)}
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
            Over budget by ${Math.abs(remaining).toFixed(2)}
          </span>
        ) : (
          <span className="text-green-600 font-medium">
            ${remaining.toFixed(2)} remaining
          </span>
        )}
        <form action={deleteBudget.bind(null, budget.id)}>
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        </form>
      </div>
    </div>
  );
}
```

### Custom Debounce Hook for Search

A lightweight debounce hook prevents excessive URL updates during rapid typing:

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

### Seed Script for Development

Create a seed script to populate the database with realistic sample data:

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Housing", icon: "home", color: "#ef4444" },
  { name: "Food & Dining", icon: "utensils", color: "#f97316" },
  { name: "Transportation", icon: "car", color: "#eab308" },
  { name: "Entertainment", icon: "film", color: "#22c55e" },
  { name: "Shopping", icon: "shopping-bag", color: "#3b82f6" },
  { name: "Healthcare", icon: "heart-pulse", color: "#ec4899" },
  { name: "Utilities", icon: "zap", color: "#8b5cf6" },
  { name: "Salary", icon: "briefcase", color: "#06b6d4" },
];

async function main() {
  console.log("Seeding database...");

  // Create categories
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { name_userId: { name: cat.name, userId: "" } },
      update: {},
      create: { ...cat },
    });
  }

  console.log("Seed completed.");
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

Add the seed configuration to `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

## Key Insights

- **URL search params are the best state manager for filter UIs**: Storing filter state in the URL (rather than React state) makes pages shareable, bookmarkable, and server-renderable. Next.js `searchParams` in Server Components handle this natively, and client components can read/write them via `useSearchParams` and `useRouter`.
- **Batch imports with createMany are dramatically faster**: Inserting 1000 transactions one-by-one with `prisma.transaction.create()` takes 10-15 seconds. Using `createMany()` with a batch size of 100 reduces this to under 1 second.
- **Always parse amounts as absolute values with a separate type field**: Bank CSV exports may use negative values for expenses or debits. Normalizing to positive amounts with an explicit `type` field (expense/income) eliminates ambiguity and simplifies aggregation queries.
- **Server Actions with FormData are ideal for file uploads**: FormData carries both the CSV file and the column mapping fields in a single request without needing a multipart API route. The `"use server"` directive keeps the import logic co-located with the rest of your server code.
- **Recharts pie charts with innerRadius create donut charts**: Using `innerRadius={60}` transforms a standard pie chart into a donut chart, which is the standard visualization for budget-category breakdowns. The empty center can optionally display a total figure.

## Next Steps

- Add recurring transaction detection using pattern matching on descriptions.
- Implement a "cash flow forecast" that predicts future balances based on recurring income and expenses.
- Explore the [Next.js Syllabus](/frontend/nextjs/syllabi/nextjs-syllabus.md) for a structured learning path.
- Learn about advanced data visualization with the [Recharts documentation](https://recharts.org/en-US/guide).

## Conclusion

You have built a complete personal finance dashboard with Next.js that handles real-world CSV data import, transaction management with URL-based search and filtering, interactive spending visualizations with Recharts, and budget tracking with progress monitoring. Along the way, you mastered Server Actions for secure file processing, Prisma ORM for financial data modeling, search param-based state management, and responsive dashboard layouts with Tailwind CSS. These patterns are directly transferable to any data-driven SaaS application.
