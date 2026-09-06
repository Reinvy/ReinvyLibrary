import type { Locale } from "./types";

/** Shared string-keyed shape for both locales. */
export interface Dictionary {
  nav: { home: string; categories: string; search: string; source: string; collection: string };
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
    highlights: string;
    recentCheatsheets: string;
    syllabusProgress: string;
    syllabusProgressEmpty: string;
    syllabusProgressCta: string;
    categoriesTitle: string;
    popularTech: string;
    latestGuides: string;
    viewAll: string;
    readMore: string;
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
    browseByCategory: string;
    popularTech: string;
    indexedTopics: string;
    tryInstead: string;
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
  game: {
    level: string;
    xp: string;
    toGo: string;
    streak: string;
    freezes: string;
    quests: string;
    questProgress: string;
    questBonus: string;
    questAllDone: string;
    badges: string;
    badgesUnlocked: string;
    badgeLocked: string;
    toastBadge: string;
    toastLevel: string;
    toastQuest: string;
    toastFreeze: string;
    toastSyllabus: string;
    streakTitle: string;
    streakBest: string;
    streakEmpty: string;
    streakCta: string;
    tipTitle: string;
    markComplete: string;
    completed: string;
    earns: string;
    scrollHint: string;
    save: string;
    saved: string;
    adventure: string;
    shelf: string;
    continueReading: string;
    shelfEmpty: string;
    historyEmpty: string;
    browseMore: string;
    removeBookmark: string;
    stamps: string;
    stampsCollected: string;
    stampLocked: string;
    collectionTitle: string;
    collectionSubtitle: string;
    focusTitle: string;
    focusSubtitle: string;
    focusStart: string;
    focusPause: string;
    focusResume: string;
    focusReset: string;
    focusDone: string;
    focusMinutes: string;
    shareDownload: string;
    shareButton: string;
    shareDone: string;
    shareTagline: string;
    dataTitle: string;
    dataDescription: string;
    dataExport: string;
    dataImport: string;
    dataReset: string;
    dataResetConfirm: string;
    dataResetCancel: string;
    dataImportOk: string;
    dataImportFail: string;
  };
  category: { count: string; emptyTitle: string; emptyMessage: string };
  browse: { title: string; subtitle: string };
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: { home: "Home", categories: "Browse", search: "Search", source: "Source", collection: "Collection" },
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
      highlights: "Highlights",
      recentCheatsheets: "Fresh cheatsheets",
      syllabusProgress: "Syllabus progress",
      syllabusProgressEmpty: "Pick a syllabus to start tracking chapters!",
      syllabusProgressCta: "Browse syllabi",
      categoriesTitle: "Browse by category",
      popularTech: "Popular technologies",
      latestGuides: "Fresh guides & tutorials",
      viewAll: "View all",
      readMore: "Read",
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
      noResultsMessage: "Try a different keyword, pick a suggestion, or browse by category below.",
      popularTags: "Popular right now",
      browseByCategory: "Browse by category",
      popularTech: "Popular technologies",
      indexedTopics: "topics indexed",
      tryInstead: "Try instead",
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
    game: {
      level: "Lv",
      xp: "XP",
      toGo: "to go",
      streak: "day streak",
      freezes: "freezes",
      quests: "Today's quests",
      questProgress: "Finish all 3 for",
      questBonus: "bonus XP",
      questAllDone: "All quests done — bonus claimed!",
      badges: "Badge shelf",
      badgesUnlocked: "unlocked",
      badgeLocked: "Keep reading to unlock",
      toastBadge: "Badge unlocked",
      toastLevel: "Level up!",
      toastQuest: "Daily quest complete",
      toastFreeze: "Streak freeze used — Owi saved your streak!",
      toastSyllabus: "Syllabus complete — graduate!",
      streakTitle: "Reading streak",
      streakBest: "best",
      streakEmpty: "Owi is sleepy — read a page to wake them up!",
      streakCta: "Start reading",
      tipTitle: "Owi's washi tip",
      markComplete: "Mark as finished",
      completed: "Finished — nicely read!",
      earns: "One tap, or just scroll to the bottom.",
      scrollHint: "Read to the bottom (or tap below) to earn XP.",
      save: "Save",
      saved: "Saved",
      adventure: "Your adventure",
      shelf: "My shelf",
      continueReading: "Continue reading",
      shelfEmpty: "No saved reads yet — tap Save on any page.",
      historyEmpty: "Nothing here yet — your reads will appear like sticky notes.",
      browseMore: "Find something to read",
      removeBookmark: "Remove",
      stamps: "Stamp book",
      stampsCollected: "collected",
      stampLocked: "Unread",
      collectionTitle: "My collection",
      collectionSubtitle: "Badges, stamps, shelf & achievements — all yours, stored in this browser.",
      focusTitle: "Focus reading",
      focusSubtitle: "Pick a duration, read calmly, earn XP.",
      focusStart: "Start",
      focusPause: "Pause",
      focusResume: "Resume",
      focusReset: "Reset",
      focusDone: "Focus session complete — nicely done!",
      focusMinutes: "min",
      shareDownload: "Download card",
      shareButton: "Share",
      shareDone: "Shared!",
      shareTagline: "Learning, one paper card at a time.",
      dataTitle: "Your data stays here",
      dataDescription: "Progress lives only in this browser. Export a backup, or wipe the shelf clean.",
      dataExport: "Export backup",
      dataImport: "Import backup",
      dataReset: "Reset all",
      dataResetConfirm: "Yes, wipe it",
      dataResetCancel: "Keep it",
      dataImportOk: "Backup restored — welcome back!",
      dataImportFail: "That file doesn't look like a backup.",
    },
    category: {
      count: "topics",
      emptyTitle: "Nothing here yet",
      emptyMessage: "This shelf is still being stocked. Check back soon!",
    },
    browse: {
      title: "Browse the library",
      subtitle: "Pick a shelf — every category lists its topics and technologies.",
    },
  },
  id: {
    nav: { home: "Beranda", categories: "Jelajahi", search: "Cari", source: "Sumber", collection: "Koleksi" },
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
      highlights: "Sorotan",
      recentCheatsheets: "Cheatsheet terbaru",
      syllabusProgress: "Progres silabus",
      syllabusProgressEmpty: "Pilih silabus untuk mulai melacak bab!",
      syllabusProgressCta: "Jelajahi silabus",
      categoriesTitle: "Jelajahi berdasarkan kategori",
      popularTech: "Teknologi populer",
      latestGuides: "Panduan & tutorial terbaru",
      viewAll: "Lihat semua",
      readMore: "Baca",
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
      noResultsMessage: "Coba kata kunci lain, pilih saran, atau jelajahi kategori di bawah.",
      popularTags: "Populer saat ini",
      browseByCategory: "Jelajahi berdasarkan kategori",
      popularTech: "Teknologi populer",
      indexedTopics: "topik terindeks",
      tryInstead: "Coba ini",
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
    game: {
      level: "Lv",
      xp: "XP",
      toGo: "lagi",
      streak: "streak harian",
      freezes: "beku",
      quests: "Misi hari ini",
      questProgress: "Selesaikan ketiganya untuk",
      questBonus: "bonus XP",
      questAllDone: "Semua misi selesai — bonus diklaim!",
      badges: "Rak lencana",
      badgesUnlocked: "terbuka",
      badgeLocked: "Terus baca untuk membuka",
      toastBadge: "Lencana terbuka",
      toastLevel: "Naik level!",
      toastQuest: "Misi harian selesai",
      toastFreeze: "Beku streak dipakai — Owi menyelamatkan streakmu!",
      toastSyllabus: "Silabus tuntas — lulusan!",
      streakTitle: "Streak membaca",
      streakBest: "terbaik",
      streakEmpty: "Owi mengantuk — baca satu halaman untuk membangunkannya!",
      streakCta: "Mulai baca",
      tipTitle: "Tips washi Owi",
      markComplete: "Tandai selesai",
      completed: "Tuntas — bacaan yang bagus!",
      earns: "Satu ketukan, atau gulir saja sampai bawah.",
      scrollHint: "Baca sampai bawah (atau ketuk di bawah) untuk dapat XP.",
      save: "Simpan",
      saved: "Tersimpan",
      adventure: "Petualanganmu",
      shelf: "Rakku",
      continueReading: "Lanjutkan baca",
      shelfEmpty: "Belum ada simpanan — ketuk Simpan di halaman mana pun.",
      historyEmpty: "Belum ada apa-apa — bacaanmu akan muncul seperti sticky note.",
      browseMore: "Cari bacaan",
      removeBookmark: "Hapus",
      stamps: "Buku stempel",
      stampsCollected: "terkumpul",
      stampLocked: "Belum dibaca",
      collectionTitle: "Koleksiku",
      collectionSubtitle: "Lencana, stempel, rak & pencapaian — semuanya milikmu, tersimpan di browser ini.",
      focusTitle: "Fokus membaca",
      focusSubtitle: "Pilih durasi, baca dengan tenang, dapatkan XP.",
      focusStart: "Mulai",
      focusPause: "Jeda",
      focusResume: "Lanjut",
      focusReset: "Ulang",
      focusDone: "Sesi fokus selesai — kerja bagus!",
      focusMinutes: "mnt",
      shareDownload: "Unduh kartu",
      shareButton: "Bagikan",
      shareDone: "Terbagikan!",
      shareTagline: "Belajar, satu kartu kertas di satu waktu.",
      dataTitle: "Datamu tetap di sini",
      dataDescription: "Progres hanya tersimpan di browser ini. Unduh cadangan, atau bersihkan rak.",
      dataExport: "Unduh cadangan",
      dataImport: "Pulihkan cadangan",
      dataReset: "Hapus semua",
      dataResetConfirm: "Ya, hapus",
      dataResetCancel: "Batalkan",
      dataImportOk: "Cadangan dipulihkan — selamat kembali!",
      dataImportFail: "Berkas itu sepertinya bukan cadangan.",
    },
    category: {
      count: "topik",
      emptyTitle: "Belum ada apa-apa",
      emptyMessage: "Rak ini masih diisi. Kembalilah lagi nanti!",
    },
    browse: {
      title: "Jelajahi perpustakaan",
      subtitle: "Pilih rak — setiap kategori menampilkan topik dan teknologinya.",
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
