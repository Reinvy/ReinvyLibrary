---
title: "Panduan Penanganan dan Validasi Formulir Vue.js"
description: "Panduan komprehensif untuk membangun formulir yang kokoh, mudah diakses, dan tervalidasi di Vue.js 3 menggunakan pola v-model, VeeValidate, validasi skema Zod, formulir dinamis, alur multi-langkah, dan strategi pengujian."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Penanganan dan Validasi Formulir Vue.js

## Pendahuluan

Formulir adalah tulang punggung sebagian besar aplikasi web — menangani pendaftaran pengguna, alur checkout, filter pencarian, survei, dan banyak skenario entri data lainnya. Di Vue.js 3, penanganan formulir jauh melampaui pengikatan `v-model` sederhana. Formulir di dunia nyata memerlukan validasi yang kokoh, pembuatan bidang dinamis, status pengiriman yang terkontrol, kepatuhan aksesibilitas, dan pengujian menyeluruh.

Panduan ini mencakup spektrum penuh pengembangan formulir Vue.js 3, dari menguasai `v-model` di semua jenis input hingga membangun formulir multi-langkah yang kompleks dengan validasi berbasis skema menggunakan Zod dan VeeValidate. Pada akhirnya, Anda akan memiliki arsitektur formulir yang dapat digunakan kembali yang berskala dari formulir login sederhana hingga checkout multi-halaman dengan bidang bersyarat, validasi asinkron, dan cakupan pengujian yang komprehensif.

## Praktik Terbaik

### Gunakan v-model dengan Benar untuk Setiap Jenis Input

Direktif `v-model` adalah mekanisme pengikatan dua arah Vue, tetapi perilakunya bervariasi menurut jenis input. Selalu gunakan pengubah dan pola pengikatan yang benar:

- **Input teks**: `v-model` terikat ke `value` dan mendengarkan event `input` secara default
- **Kotak centang**: Kotak centang tunggal terikat ke boolean; beberapa kotak centang dengan `v-model` yang sama terikat ke array
- **Tombol radio**: Grup berbagi `v-model` yang sama, terikat ke nilai yang dipilih
- **Dropdown pilihan**: `v-model` terikat ke nilai `<option>` yang dipilih; gunakan atribut `multiple` untuk pilihan ganda
- **Komponen kustom**: Gunakan `v-model` dengan prop `modelValue` dan emit `update:modelValue`; atau gunakan beberapa pengikatan `v-model:[arg]` untuk komponen yang kompleks

### Pisahkan Logika Validasi dari Presentasi

Ekstrak skema validasi dan manajemen status formulir ke dalam komposabel atau modul khusus. Ini menjaga komponen Anda tetap mudah dibaca dan membuat logika validasi dapat diuji secara independen. Gunakan pustaka skema seperti Zod atau Yup untuk mendefinisikan batasan secara deklaratif, kemudian hubungkan skema tersebut ke komposabel `useForm` milik VeeValidate.

### Tangani Semua Status Formulir Secara Eksplisit

Setiap formulir memiliki setidaknya empat status: **idle**, **mengirim**, **sukses**, dan **error**. Ekspos flag reaktif untuk setiap status dan render umpan balik UI yang sesuai. Nonaktifkan tombol kirim saat mengirim, tampilkan spinner atau indikator progres, tampilkan pesan sukses atau error setelah pengiriman, dan kosongkan formulir atau atur ulang validasi setelah sukses.

### Bangun Formulir yang Aksesibel

Aksesibilitas dalam formulir tidak opsional. Setiap input harus memiliki `<label>` terkait, pesan error harus dihubungkan melalui `aria-describedby`, bidang wajib harus menggunakan `aria-required`, dan manajemen fokus harus memandu pengguna melalui kesalahan validasi. Gunakan `aria-invalid` untuk menandai bidang dengan kesalahan validasi dan region `aria-live` untuk pengumuman error dinamis.

### Uji Logika Formulir, Bukan Hanya Render

Tulis pengujian unit untuk skema validasi dan logika komposabel tanpa memasang komponen. Gunakan pengujian komponen dengan `@vue/test-utils` untuk mensimulasikan interaksi pengguna — mengisi input, memicu validasi, dan mengirim. Untuk cakupan E2E, gunakan Playwright atau Cypress untuk memverifikasi alur formulir lengkap, termasuk error server dan kegagalan jaringan.

### Manfaatkan Composition API untuk Penggunaan Kembali Formulir

Enkapsulasi logika formulir dalam fungsi komposabel. Komposabel `useFormSubmission` dapat menangani siklus hidup pengiriman, manajemen token CSRF, dan panggilan API. Komposabel `useFormValidation` dapat membungkus `useForm` milik VeeValidate dengan default khusus proyek. Ini mencegah logika formulir bocor ke seluruh komponen dan membuatnya trivial untuk menambahkan formulir baru.

## Langkah Implementasi

### Langkah 1: Persiapan Proyek dengan Dependensi

Buat proyek Vue.js 3 baru atau tambahkan dependensi formulir ke proyek yang sudah ada:

```bash
npm install vee-validate zod @vee-validate/zod
```

- **vee-validate**: Pustaka penanganan formulir dengan komposabel untuk validasi, pengiriman, dan manajemen bidang
- **zod**: Pustaka deklarasi dan validasi skema yang mengutamakan TypeScript
- **@vee-validate/zod**: Adaptor yang mengintegrasikan skema Zod dengan `useForm` milik VeeValidate

Konfigurasikan VeeValidate di `main.ts`:

```typescript
import { createApp } from 'vue';
import App from './App.vue';
import { configure } from 'vee-validate';

configure({
  validateOnBlur: true,
  validateOnChange: true,
  validateOnInput: false,
  validateOnModelUpdate: true,
});

createApp(App).mount('#app');
```

### Langkah 2: Definisikan Skema Validasi dengan Zod

Buat file terpisah untuk skema formulir Anda. Ini menjaga aturan validasi tetap terisolasi dan dapat digunakan kembali di klien dan server:

```typescript
// schemas/contactForm.ts
import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama harus minimal 2 karakter')
    .max(100, 'Nama tidak boleh melebihi 100 karakter'),
  email: z
    .string()
    .email('Masukkan alamat email yang valid'),
  subject: z
    .string()
    .min(5, 'Subjek harus minimal 5 karakter')
    .max(200, 'Subjek tidak boleh melebihi 200 karakter'),
  message: z
    .string()
    .min(10, 'Pesan harus minimal 10 karakter')
    .max(2000, 'Pesan tidak boleh melebihi 2000 karakter'),
  priority: z.enum(['low', 'normal', 'high'], {
    errorMap: () => ({ message: 'Silakan pilih tingkat prioritas' }),
  }),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: 'Anda harus menyetujui syarat dan ketentuan' }),
  }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
```

Ekspor tipe TypeScript yang diinferensi dari skema Anda sehingga komponen dan lapisan API berbagi satu sumber kebenaran untuk bentuk formulir.

### Langkah 3: Bangun Komponen Formulir

Buat komponen formulir yang dapat digunakan kembali yang menggunakan `useForm` milik VeeValidate dengan skema Zod Anda:

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { contactFormSchema, type ContactFormValues } from '@/schemas/contactForm';

const { handleSubmit, isSubmitting, submitCount, resetForm, errors } =
  useForm<ContactFormValues>({
    validationSchema: toTypedSchema(contactFormSchema),
    initialValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
      priority: 'normal',
      agreeToTerms: false as unknown as true,
    },
  });

const onSubmit = handleSubmit(async (values) => {
  // Simulasi panggilan API
  await new Promise((resolve) => setTimeout(resolve, 1500));
  console.log('Formulir terkirim:', values);
  // Setelah sukses, reset formulir
  resetForm();
});
</script>
```

Flag `isSubmitting` milik VeeValidate secara otomatis diatur ke `true` selama penangan pengiriman berjalan, dan `submitCount` melacak berapa kali pengguna mencoba mengirim.

### Langkah 4: Buat Komponen Bidang Formulir yang Dapat Digunakan Kembali

Bangun komponen `BaseInput` generik yang menghubungkan `useField` milik VeeValidate ke input standar. Ini menghilangkan kode template yang berulang:

```vue
<!-- components/BaseInput.vue -->
<script setup lang="ts">
import { useField } from 'vee-validate';

const props = defineProps<{
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  helpText?: string;
}>();

const {
  value,
  errorMessage,
  handleBlur,
  handleChange,
  meta,
} = useField<string>(() => props.name);
</script>

<template>
  <div class="form-field" :class="{ 'form-field--invalid': meta.invalid && meta.touched }">
    <label :for="name" class="form-label">{{ label }}</label>
    <input
      :id="name"
      v-model="value"
      :type="type || 'text'"
      :placeholder="placeholder"
      :aria-invalid="meta.invalid && meta.touched"
      :aria-describedby="errorMessage ? `${name}-error` : undefined"
      @blur="handleBlur"
      @input="handleChange"
      class="form-input"
    />
    <p v-if="helpText && !errorMessage" class="form-helptext">{{ helpText }}</p>
    <p
      v-if="errorMessage"
      :id="`${name}-error`"
      class="form-error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>
```

Replikasi pola ini untuk `BaseSelect.vue`, `BaseTextarea.vue`, `BaseCheckbox.vue`, dan `BaseRadioGroup.vue`. Setiap komponen menangani jenis input spesifiknya sambil secara konsisten mengekspos pesan error, atribut aria, dan kait styling.

### Langkah 5: Rakit Formulir Lengkap

Gabungkan komponen bidang dan pengirim penanganan dalam formulir induk:

```vue
<!-- ContactForm.vue -->
<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { contactFormSchema, type ContactFormValues } from '@/schemas/contactForm';
import BaseInput from '@/components/BaseInput.vue';
import BaseSelect from '@/components/BaseSelect.vue';
import BaseTextarea from '@/components/BaseTextarea.vue';
import BaseCheckbox from '@/components/BaseCheckbox.vue';

const { handleSubmit, isSubmitting, submitCount, resetForm, errors } =
  useForm<ContactFormValues>({
    validationSchema: toTypedSchema(contactFormSchema),
    initialValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
      priority: 'normal',
      agreeToTerms: false as unknown as true,
    },
  });

const submitSuccess = ref(false);

const onSubmit = handleSubmit(async (values) => {
  submitSuccess.value = false;
  try {
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    submitSuccess.value = true;
    resetForm();
  } catch (error) {
    submitSuccess.value = false;
    throw error; // VeeValidate menangkap ini dan mengatur isSubmitting ke false
  }
});
</script>

<template>
  <form @submit="onSubmit" novalidate class="contact-form">
    <BaseInput name="name" label="Nama Lengkap" placeholder="Jane Doe" />
    <BaseInput name="email" label="Alamat Email" type="email" placeholder="jane@example.com" />
    <BaseSelect
      name="priority"
      label="Prioritas"
      :options="[
        { value: 'low', label: 'Rendah' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'Tinggi' },
      ]"
    />
    <BaseInput name="subject" label="Subjek" placeholder="Ada yang bisa kami bantu?" />
    <BaseTextarea name="message" label="Pesan" placeholder="Jelaskan pertanyaan Anda..." />

    <BaseCheckbox name="agreeToTerms" label="Saya menyetujui Syarat dan Ketentuan" />

    <div v-if="submitSuccess" class="form-success" role="status">
      Pesan Anda telah berhasil dikirim! Kami akan merespons dalam waktu 24 jam.
    </div>

    <button type="submit" :disabled="isSubmitting" class="submit-btn">
      <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
      {{ isSubmitting ? 'Mengirim...' : 'Kirim Pesan' }}
    </button>

    <p v-if="submitCount > 0 && Object.keys(errors).length" class="form-summary-error" role="alert">
      Harap perbaiki {{ Object.keys(errors).length }} error sebelum mengirim.
    </p>
  </form>
</template>
```

Atribut `novalidate` pada elemen `<form>` menonaktifkan validasi bawaan browser, memberikan kendali penuh kepada VeeValidate.

### Langkah 6: Implementasikan Bidang Bersyarat Dinamis

Banyak formulir membutuhkan bidang yang muncul atau menghilang berdasarkan jawaban sebelumnya. Gunakan nilai yang diamati atau properti terkomputasi untuk mendorong bagian bersyarat:

```vue
<script setup lang="ts">
const priority = useField<string>('priority').value;

const showUrgentFields = computed(() =>
  ['high'].includes(priority.value)
);
</script>

<template>
  <BaseSelect name="priority" label="Prioritas" :options="priorityOptions" />

  <template v-if="showUrgentFields">
    <BaseInput name="urgentDeadline" label="Tanggal Batas Waktu" type="date" />
    <BaseTextarea name="urgentReason" label="Alasan Kedaruratan" />
  </template>
</template>
```

Saat menggunakan bidang bersyarat, perbarui skema Zod sesuai kebutuhan. Gunakan `z.discriminatedUnion` atau `.optional()` untuk membuat bidang wajib secara bersyarat:

```typescript
export const contactFormSchema = z.object({
  priority: z.enum(['low', 'normal', 'high']),
  // Bidang lainnya...
  urgentDeadline: z.string().optional(),
  urgentReason: z.string().optional(),
}).refine(
  (data) => {
    if (data.priority !== 'high') return true;
    return data.urgentDeadline && data.urgentDeadline.length > 0;
  },
  { message: 'Batas waktu wajib diisi untuk prioritas tinggi', path: ['urgentDeadline'] }
);
```

### Langkah 7: Bangun Formulir Multi-Langkah (Wizard)

Formulir multi-langkah memerlukan pelacakan langkah saat ini dan validasi hanya bidang pada langkah tersebut. VeeValidate mendukung ini secara native:

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';

const currentStep = ref(1);
const totalSteps = 3;

const checkoutSchema = z.object({
  // Langkah 1: Pengiriman
  fullName: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  zipCode: z.string().regex(/^\d{5}$/, 'Kode POS tidak valid'),
  // Langkah 2: Pembayaran
  cardNumber: z.string().regex(/^\d{16}$/, 'Nomor kartu tidak valid'),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Gunakan format BB/TT'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV tidak valid'),
  // Langkah 3: Tinjauan — tidak ada bidang tambahan
});

const { handleSubmit, validateField, values, isSubmitting } =
  useForm<z.infer<typeof checkoutSchema>>({
    validationSchema: toTypedSchema(checkoutSchema),
  });

const stepFields: Record<number, string[]> = {
  1: ['fullName', 'address', 'city', 'zipCode'],
  2: ['cardNumber', 'expiryDate', 'cvv'],
  3: [],
};

async function goToStep(step: number) {
  const fields = stepFields[currentStep.value] || [];
  const valid = await Promise.all(fields.map((f) => validateField(f)));
  if (valid.every(Boolean)) {
    currentStep.value = step;
  }
}
</script>

<template>
  <form @submit="handleSubmit">
    <div class="step-indicator">
      <span v-for="step in totalSteps" :key="step" :class="{ active: currentStep === step, completed: currentStep > step }">
        Langkah {{ step }}
      </span>
    </div>

    <div v-if="currentStep === 1">
      <BaseInput name="fullName" label="Nama Lengkap" />
      <BaseInput name="address" label="Alamat Jalan" />
      <BaseInput name="city" label="Kota" />
      <BaseInput name="zipCode" label="Kode POS" />
      <button type="button" @click="goToStep(2)">Berikutnya: Pembayaran</button>
    </div>

    <div v-if="currentStep === 2">
      <BaseInput name="cardNumber" label="Nomor Kartu" placeholder="1234123412341234" />
      <BaseInput name="expiryDate" label="Tanggal Kedaluwarsa" placeholder="BB/TT" />
      <BaseInput name="cvv" label="CVV" type="text" />
      <button type="button" @click="goToStep(1)">Kembali</button>
      <button type="button" @click="goToStep(3)">Berikutnya: Tinjauan</button>
    </div>

    <div v-if="currentStep === 3">
      <h3>Tinjau Pesanan Anda</h3>
      <pre>{{ values }}</pre>
      <button type="button" @click="goToStep(2)">Kembali</button>
      <button type="submit" :disabled="isSubmitting">Buat Pesanan</button>
    </div>
  </form>
</template>
```

Wawasan utamanya adalah memanggil `validateField` hanya untuk bidang di langkah saat ini sebelum melanjutkan. Ini mencegah menampilkan kesalahan validasi yang tidak relevan untuk bidang yang belum dilihat pengguna.

### Langkah 8: Implementasikan Validasi Asinkron

Validasi bidang terhadap server secara real-time — misalnya, memeriksa ketersediaan nama pengguna atau memvalidasi kode kupon. VeeValidate mendukung validasi asinkron melalui `.refine` Zod dengan fungsi asinkron:

```typescript
import { z } from 'zod';

async function checkUsernameAvailability(username: string): Promise<boolean> {
  const response = await fetch(`/api/users/check-username?q=${encodeURIComponent(username)}`);
  const data = await response.json();
  return data.available;
}

export const registrationSchema = z.object({
  username: z
    .string()
    .min(3, 'Nama pengguna harus minimal 3 karakter')
    .refine(
      async (val) => {
        if (val.length < 3) return true; // Biarkan min() menangani ini
        return checkUsernameAvailability(val);
      },
      { message: 'Nama pengguna sudah digunakan' }
    ),
  email: z.string().email(),
  password: z.string().min(8, 'Kata sandi harus minimal 8 karakter'),
});
```

`useField` milik VeeValidate secara otomatis melakukan debounce fungsi refine asinkron ketika `validateOnChange` bernilai `true`, sehingga server tidak dipanggil pada setiap ketukan tombol. Anda dapat menyesuaikan waktu debounce melalui opsi `debounce` di `configure` VeeValidate atau per-bidang.

### Langkah 9: Uji Komponen Formulir

Uji skema validasi dan logika formulir secara terisolasi. Pengujian skema cepat dan menangkap kasus tepi sejak awal:

```typescript
// __tests__/contactFormSchema.test.ts
import { contactFormSchema } from '@/schemas/contactForm';

describe('contactFormSchema', () => {
  it('menerima pengiriman yang valid', () => {
    const result = contactFormSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      subject: 'Pertanyaan kemitraan',
      message: 'Kami ingin menjajaki peluang kemitraan dengan perusahaan Anda.',
      priority: 'high',
      agreeToTerms: true,
    });
    expect(result.success).toBe(true);
  });

  it('menolak email yang tidak valid', () => {
    const result = contactFormSchema.safeParse({
      name: 'Jane',
      email: 'bukan-email',
      subject: 'Subjek uji',
      message: 'Pesan yang lebih panjang yang memenuhi persyaratan panjang minimum.',
      priority: 'normal',
      agreeToTerms: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  it('memerlukan persetujuan terhadap syarat', () => {
    const result = contactFormSchema.safeParse({
      name: 'Jane',
      email: 'jane@example.com',
      subject: 'Subjek uji',
      message: 'Tubuh pesan yang lebih panjang untuk pengujian.',
      priority: 'normal',
      agreeToTerms: false,
    });
    expect(result.success).toBe(false);
  });
});
```

Tulis pengujian komponen untuk interaksi formulir menggunakan Vue Test Utils:

```typescript
// __tests__/ContactForm.test.ts
import { mount } from '@vue/test-utils';
import ContactForm from '@/components/ContactForm.vue';

describe('ContactForm', () => {
  it('menonaktifkan tombol kirim saat mengirim', async () => {
    const wrapper = mount(ContactForm);
    const submitBtn = wrapper.find('button[type="submit"]');

    await wrapper.find('#name').setValue('Jane Doe');
    await wrapper.find('#email').setValue('jane@example.com');
    // Isi bidang yang tersisa...

    await wrapper.find('form').trigger('submit.prevent');
    expect(submitBtn.attributes('disabled')).toBeDefined();
  });

  it('menampilkan kesalahan validasi saat blur pada bidang wajib yang kosong', async () => {
    const wrapper = mount(ContactForm);
    const nameInput = wrapper.find('#name');

    await nameInput.trigger('focus');
    await nameInput.trigger('blur');

    expect(wrapper.text()).toContain('Nama harus minimal 2 karakter');
  });
});
```

## Insight Penting

- **Validasi berbasis skema** dengan Zod menghilangkan duplikasi antara aturan validasi klien dan server serta menyediakan tipe TypeScript yang diinferensi langsung dari skema
- **API komposabel VeeValidate** terintegrasi dengan bersih ke Composition API Vue 3, menjaga logika formulir tetap di `<script setup>` tanpa boilerplate yang bertele-tele
- **Validasi bersyarat** melalui `.refine` Zod dan discriminated unions menangani persyaratan formulir yang kompleks tanpa fungsi validator kustom
- **Formulir multi-langkah** dapat dikelola dengan membatasi validasi ke bidang pada langkah saat ini, mencegah tampilan error sebelum waktunya
- **Aksesibilitas** memerlukan pengkabelan eksplisit: `aria-invalid` untuk status error, `aria-describedby` menghubungkan error ke input, dan `role="alert"` untuk pesan dinamis
- **Strategi pengujian** harus melapisi pengujian unit skema (cepat, komprehensif), pengujian interaksi komponen (perilaku pengguna), dan pengujian E2E (alur kerja lengkap termasuk integrasi API)

## Langkah Berikutnya

- Jelajahi **persistensi status formulir dengan Pinia** — simpan data formulir parsial ke localStorage atau Pinia untuk mencegah kehilangan data saat navigasi
- Implementasikan **bidang unggah file** dengan `useField` VeeValidate untuk file, termasuk seret-dan-lepas dan pratinjau
- Tambahkan **formulir kolaboratif real-time** menggunakan WebSocket atau Yjs untuk pengeditan formulir multi-pengguna
- Integrasikan **editor teks kaya** (TipTap, Quill) dengan adaptor bidang kustom VeeValidate
- Siapkan **analitik formulir** untuk melacak pengabaian bidang, tingkat kesalahan validasi, dan metrik keberhasilan pengiriman

## Kesimpulan

Membangun formulir di Vue.js 3 dengan VeeValidate dan Zod menyediakan pendekatan yang kokoh, aman terhadap tipe, dan mudah dipelihara untuk salah satu tugas pengembangan frontend yang paling umum. Dengan memisahkan skema validasi dari presentasi, menangani semua status formulir secara eksplisit, dan menulis logika formulir yang dapat diuji, Anda dapat membuat formulir yang ramah pengembang dan mudah diakses oleh pengguna. Pola dalam panduan ini berskala dari formulir login dua bidang hingga wizard multi-langkah tingkat perusahaan dengan logika bersyarat yang kompleks — semuanya sambil menjaga basis kode Anda tetap bersih, bertipe, dan teruji secara menyeluruh.
