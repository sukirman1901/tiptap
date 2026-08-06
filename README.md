# Agreed

Workspace penyusunan kontrak berbasis [TipTap](https://tiptap.dev/), dengan kanvas kertas A4 dan variabel dokumen yang terhubung ke form.

**Repo:** [github.com/sukirman1901/tiptap](https://github.com/sukirman1901/tiptap)

> Masih dalam pengembangan aktif. UI dan API bisa berubah.

## Fitur

- **Kanvas A4 multi-halaman** — dokumen tampil seperti kertas, dengan henti halaman manual dan indikator `Halaman X / Y`
- **Variabel kontrak** — isi form (judul, pihak, tanggal, nilai) mengisi field di dalam draf via `@nilai`, `{pihak1}`, dll.
- **Toolbar penyusunan** — format teks, font, warna, alignment, tabel, gambar, slash menu (`/`)
- **Informasi dokumen** — panel kanan (desktop) / sheet (mobile)
- **Tema terang/gelap** — mengikuti shadcn/ui + `next-themes`

## Stack

| Layer | Teknologi |
|-------|-----------|
| App | Next.js 16, React 19 |
| Editor | TipTap 2 + extension custom (page break, variabel) |
| UI | Tailwind CSS 4, shadcn/ui, Radix |
| Package | pnpm |

## Mulai

```bash
pnpm install
pnpm dev
```

Buka [http://localhost:3001](http://localhost:3001).

### Skrip lain

```bash
pnpm build          # generate tipe aksi editor + production build
pnpm start          # jalankan hasil build
pnpm lint
pnpm editor:types   # regenerate src/registry/editor/editor.d.ts
pnpm format
```

## Struktur singkat

```
src/
  app/(web)/              # halaman utama → playground
  features/playground/    # UI kontrak (canvas, meta, variabel)
  registry/editor/        # komponen & extension TipTap
  layouts/front-stage/    # header / footer
  components/ui/          # subset shadcn yang dipakai
docs/superpowers/         # spek & rencana desain
```

## Variabel di canvas

Ketik `@` di editor untuk menyisipkan, atau ketik `{nilai}` (otomatis jadi field).

| Token | Form |
|-------|------|
| `{judul}` / `@judul` | Judul kontrak |
| `{pihak1}` / `@pihak1` | Pihak 1 |
| `{pihak2}` / `@pihak2` | Pihak 2 |
| `{tanggal}` / `@tanggal` | Tanggal |
| `{nilai}` / `@nilai` | Nilai (Rp) |

## Dokumentasi desain

- [Contract workspace UI](docs/superpowers/specs/2026-08-04-contract-workspace-ui-design.md)
- [Multi-page canvas](docs/superpowers/specs/2026-08-04-multi-page-canvas-design.md)
- [Rencana implementasi](docs/superpowers/plans/2026-08-04-contract-workspace-ui.md)

## Kontribusi

1. Fork / clone repo ini
2. `pnpm install` → `pnpm dev`
3. Branch fitur, commit, buka Pull Request ke [sukirman1901/tiptap](https://github.com/sukirman1901/tiptap)

## Asal

Diturunkan dari eksperimen editor TipTap + shadcn, lalu diarahkan ulang menjadi workspace kontrak (bukan starter generik).
