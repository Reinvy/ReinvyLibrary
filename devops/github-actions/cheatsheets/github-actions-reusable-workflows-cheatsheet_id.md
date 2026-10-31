---
title: "Cheat Sheet Reusable Workflows GitHub Actions"
description: "Referensi cepat reusable workflow GitHub Actions — input, secret, dan output workflow_call, sintaks pemanggilan, fan-out matrix, pinning versi, composite action, dan pembatasan permission."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Reusable Workflows GitHub Actions

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Mendeklarasikan workflow yang bisa dipanggil | `on: workflow_call:` | Membuat seluruh workflow dapat dipanggil dari tempat lain |
| Menambah input bertipe | `inputs.<nama>.type: string` | Tipe: `string`, `number`, `boolean`; `required` default `false` |
| Menambah secret | `secrets.<nama>.required: true` | Secret tidak pernah diwarisi otomatis tanpa deklarasi |
| Meneruskan semua secret | `secrets: inherit` di sisi pemanggil | Mengirim secret pemanggil termasuk milik organisasi |
| Mengekspos output workflow | `outputs.<nama>.value` | Wajib dipetakan dari output job, bukan dari step |
| Mengisi output job | `jobs.<id>.outputs.<nama>` | Ditulis di dalam step lewat `$GITHUB_OUTPUT` |
| Memanggil workflow repo lain | `uses: org/repo/.github/workflows/f.yml@v1` | Path wajib diawali `.github/workflows/` |
| Memanggil workflow repo sendiri | `uses: ./.github/workflows/f.yml` | Tidak boleh memakai `@ref` untuk pemanggilan lokal |
| Reuse antar job | `jobs.<id>.uses` | Job dengan `uses` tidak boleh juga punya `steps` |
| Fan-out dengan matrix | `strategy.matrix` pada job pemanggil | Callee tidak boleh mendefinisikan matrix di level atas |
| Memanggil berlapis | callee memanggil workflow `workflow_call` lain | Kedalaman maksimal empat workflow |
| Mengunci versi | `@v1`, `@sha`, atau `@main` | Tag bersifat mutable, SHA bersifat immutable |
| Reuse dalam satu job | composite action `runs.using: composite` | Reuse tingkat step dengan input dan output |
| Membatasi token | `permissions:` di pemanggil dan call site | Callee tidak boleh melebihi permission pemanggil |

## Perintah Umum

### Mendeklarasikan Workflow yang Dapat Dipanggil

```yaml
# .github/workflows/build.yml
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        required: false
        default: '20'
      publish:
        type: boolean
        default: false
    secrets:
      NPM_TOKEN:
        required: true
    outputs:
      artifact-name:
        description: "Nama artefak hasil build"
        value: ${{ jobs.build.outputs.artifact }}  # job wajib mengeksposnya
```

### Memanggil dari Workflow Lain

```yaml
jobs:
  build:
    # Pemanggilan lokal tanpa @ref; workflow pihak ketiga sebaiknya dipin ke SHA
    uses: my-org/ci-workflows/.github/workflows/build.yml@v1
    with:
      node-version: '22'
      publish: true
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy artefak ${{ needs.build.outputs.artifact-name }}"
```

### Fan-Out Matrix di Sisi Pemanggil

```yaml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        node: [18, 20, 22]
    uses: ./.github/workflows/test.yml
    with:
      node-version: ${{ matrix.node }}
```

### Permission di Call Site

```yaml
permissions:
  contents: read

jobs:
  publish:
    uses: ./.github/workflows/publish.yml
    permissions:
      contents: read
      packages: write
      id-token: write
```

## Potongan Kode

### Composite Action (Reuse Tingkat Step)

```yaml
# .github/actions/setup/action.yml
name: Setup project
description: Memasang Node dan dependency dengan cache
inputs:
  node-version:
    default: '20'
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: npm
    - shell: bash
      run: npm ci
```

Setiap step `run` di composite action wajib menyertakan `shell`; jika tidak, validasi gagal.

### Pemanggil: Pipeline Rilis

```yaml
name: Release
on:
  push:
    tags: ['v*']

permissions:
  contents: read

jobs:
  build:
    uses: ./.github/workflows/build.yml
    with:
      node-version: '22'
      publish: true
    secrets: inherit

  announce:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - env:
          ARTIFACT: ${{ needs.build.outputs.artifact-name }}
        run: |
          if [ -z "$ARTIFACT" ]; then
            echo "::error::build tidak mengembalikan nama artefak"
            exit 1
          fi
          echo "Berhasil menerbitkan $ARTIFACT"
```
