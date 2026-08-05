import type { Locale } from "./types";

/** Shared string-keyed shape for both locales. */
export interface Dictionary {
  nav: { home: string; categories: string; search: string; source: string };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchButton: string;
    statsTopics: string;
    statsCategories: string;
    statsLanguages: string;
  };
  home: {
    featured: string;
    recentCheatsheets: string;
    syllabusProgress: string;
    syllabusProgressEmpty: string;
    syllabusProgressCta: string;
  };
  doc: {
    readingTime: string;
    copy: string;
    copied: string;
    toc: string;
    tocEmpty: string;
    prev: string;
    next: string;
    langEn: string;
    langId: string;
    overview: string;
    checklists: string;
    progress: string;
    of: string;
    chapters: string;
  };
  cheatsheet: {
    filterBy: string;
    allLanguages: string;
    allSections: string;
    snippets: string;
    copy: string;
    copied: string;
    lines: string;
  };
  search: {
    title: string;
    placeholder: string;
    results: string;
    noResultsTitle: string;
    noResultsMessage: string;
    popularTags: string;
  };
  common: {
    beginner: string;
    intermediate: string;
    advanced: string;
    backHome: string;
    browseCategory: string;
    errorTitle: string;
    errorMessage: string;
    retry: string;
    notFoundTitle: string;
    notFoundMessage: string;
  };
  footer: { syncedFrom: string; builtWith: string; lastSync: string };
  category: { count: string; emptyTitle: string; emptyMessage: string };
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: { home: "Home", categories: "Browse", search: "Search", source: "Source" },
    hero: {
      badge: "a cozy corner of the internet",
      title: "Learn, one paper card at a time.",
      subtitle:
        "Curated tutorials, cheatsheets, guides & syllabi — written with care, in English and Bahasa Indonesia.",
      searchPlaceholder: "Search tutorials, cheatsheets, guides…",
      searchButton: "Search",
      statsTopics: "topics",
      statsCategories: "categories",
      statsLanguages: "languages",
    },
    home: {
      featured: "Featured tutorial",
      recentCheatsheets: "Fresh cheatsheets",
      syllabusProgress: "Syllabus progress",
      syllabusProgressEmpty: "Pick a syllabus to start tracking chapters!",
      syllabusProgressCta: "Browse syllabi",
    },
    doc: {
      readingTime: "min read",
      copy: "Copy",
      copied: "Copied! ✨",
      toc: "On this page",
      tocEmpty: "No sections",
      prev: "Previous",
      next: "Next",
      langEn: "EN",
      langId: "ID",
      overview: "Overview",
      checklists: "Checklists",
      progress: "progress",
      of: "of",
      chapters: "chapters",
    },
    cheatsheet: {
      filterBy: "Filter",
      allLanguages: "All languages",
      allSections: "All sections",
      snippets: "snippets",
      copy: "Copy",
      copied: "Copied! ✨",
      lines: "lines",
    },
    search: {
      title: "Search",
      placeholder: "Search everything…",
      results: "results",
      noResultsTitle: "Nothing found — yet!",
      noResultsMessage: "Try a different keyword, or browse by category below.",
      popularTags: "Popular right now",
    },
    common: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
      backHome: "Back to home",
      browseCategory: "Browse category",
      errorTitle: "Oh no — the shelf fell over!",
      errorMessage:
        "Something went wrong while fetching from GitHub. Try again in a moment.",
      retry: "Try again",
      notFoundTitle: "This page wandered off.",
      notFoundMessage:
        "The page you're looking for doesn't exist — but the library is full of other good reads.",
    },
    footer: {
      syncedFrom: "Synced from",
      builtWith: "Built with paper & love",
      lastSync: "Last sync",
    },
    category: {
      count: "topics",
      emptyTitle: "Nothing here yet",
      emptyMessage: "This shelf is still being stocked. Check back soon!",
    },
  },
  id: {
    nav: { home: "Beranda", categories: "Jelajahi", search: "Cari", source: "Sumber" },
    hero: {
      badge: "sudut internet yang hangat",
      title: "Belajar, satu kartu kertas di satu waktu.",
      subtitle:
        "Tutorial, cheatsheet, panduan & silabus kurasi — ditulis dengan penuh perhatian, dalam Bahasa Indonesia dan Inggris.",
      searchPlaceholder: "Cari tutorial, cheatsheet, panduan…",
      searchButton: "Cari",
      statsTopics: "topik",
      statsCategories: "kategori",
      statsLanguages: "bahasa",
    },
    home: {
      featured: "Tutorial unggulan",
      recentCheatsheets: "Cheatsheet terbaru",
      syllabusProgress: "Progres silabus",
      syllabusProgressEmpty: "Pilih silabus untuk mulai melacak bab!",
      syllabusProgressCta: "Jelajahi silabus",
    },
    doc: {
      readingTime: "menit baca",
      copy: "Salin",
      copied: "Tersalin! ✨",
      toc: "Di halaman ini",
      tocEmpty: "Tidak ada bagian",
      prev: "Sebelumnya",
      next: "Berikutnya",
      langEn: "EN",
      langId: "ID",
      overview: "Ringkasan",
      checklists: "Daftar periksa",
      progress: "progres",
      of: "dari",
      chapters: "bab",
    },
    cheatsheet: {
      filterBy: "Filter",
      allLanguages: "Semua bahasa",
      allSections: "Semua bagian",
      snippets: "cuplikan",
      copy: "Salin",
      copied: "Tersalin! ✨",
      lines: "baris",
    },
    search: {
      title: "Cari",
      placeholder: "Cari semuanya…",
      results: "hasil",
      noResultsTitle: "Tidak ditemukan — belum!",
      noResultsMessage: "Coba kata kunci lain, atau jelajahi kategori di bawah.",
      popularTags: "Populer saat ini",
    },
    common: {
      beginner: "Pemula",
      intermediate: "Menengah",
      advanced: "Lanjutan",
      backHome: "Kembali ke beranda",
      browseCategory: "Jelajahi kategori",
      errorTitle: "Ups — raknya terjatuh!",
      errorMessage:
        "Terjadi kesalahan saat mengambil dari GitHub. Coba lagi sebentar lagi.",
      retry: "Coba lagi",
      notFoundTitle: "Halaman ini tersesat.",
      notFoundMessage:
        "Halaman yang Anda cari tidak ada — tapi perpustakaan ini penuh bacaan bagus lainnya.",
    },
    footer: {
      syncedFrom: "Disinkronkan dari",
      builtWith: "Dibuat dengan kertas & cinta",
      lastSync: "Sinkron terakhir",
    },
    category: {
      count: "topik",
      emptyTitle: "Belum ada apa-apa",
      emptyMessage: "Rak ini masih diisi. Kembalilah lagi nanti!",
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
