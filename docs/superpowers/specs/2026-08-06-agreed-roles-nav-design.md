# Agreed — Roles, Review Flow & Header Nav

**Date:** 2026-08-06  
**Status:** Phase 1 implemented (see plan)  
**Approach:** A — ringkas (Dokumen · Template + badge “Perlu tindakan”)

## Problem

Agreed today is an editor playground (draf lokal, variabel, komentar review). Produk akan menjadi ruang kerja perjanjian multi-pihak: admin platform, pemakai (inisiator), dan pihak lain yang hanya review via komentar hingga approve, lalu tanda tangan berurutan + materai. Header masih kosong (logo + tema); perlu model peran, status dokumen, dan navigasi yang konsisten sebelum implementasi auth/list/signing.

## Goals

- Definisikan peran platform vs peran dalam **satu perjanjian** (2+ pihak)
- Tetapkan alur status: draf → review berulang → approve → TTD inisiator (+ materai) → TTD pihak berikutnya → selesai
- Header nav tipis untuk pemakai; aksi dokumen tetap di document bar / panel
- Reviewer **tidak bisa edit** isi — hanya komentar + approve (mempertahankan pola MVP komentar yang sudah ada)
- Template: sistem + **template milik user** (simpan dari dokumen sendiri)

## Non-goals (spec ini)

- Implementasi auth, multi-tenant, atau API
- Implementasi e-sign / e-materai provider
- Redesign editor TipTap / pagination
- Inbox “janji temu” terpisah (review = komentar sinkron/asinkron, bukan penjadwalan meeting)
- Notifikasi push / email detail (cukup disebut sebagai follow-up)

## Roles

### Platform

| Peran | Lingkup |
|-------|---------|
| **Superadmin / Admin** | User platform, template sistem, pengaturan produk. Area nav terpisah dari workspace pemakai. |
| **Pemakai** | Akun yang membuat/mengelola dokumen & template pribadi. |

### Di dalam satu perjanjian

| Peran dokumen | Hak |
|---------------|-----|
| **Inisiator** | Buat & edit draf, kelola variabel, kirim/revisi ke review, setelah **Review disetujui**: tanda tangan **pertama** + materai, lalu menunggu pihak lain. Dapat menyimpan dokumen sebagai template milik sendiri. |
| **Pihak lain** (satu atau lebih) | Baca saja + komentar inline; **tidak edit** badan dokumen. Iterasi review. **Approve review** bila isi sudah sesuai. Setelah inisiator TTD+materai: tanda tangan giliran mereka. |

Catatan: “Pihak Pertama / Kedua” di teks kontrak = label substansi dokumen; di produk, **inisiator** = yang mengirim draf ke review, **pihak lain** = yang diundang review/TTD. Satu perjanjian selalu **≥ 2 pihak**.

## Document status machine

```
Draf
  → (kirim ke review)
Dalam review
  ↔ (komen → inisiator revisi → kirim ulang)   // loop; riwayat komentar dipertahankan
  → (semua pihak review relevan approve*) 
Review disetujui
  → (inisiator TTD + materai)
Menunggu TTD pihak
  → (setiap pihak lain TTD berurutan atau sesuai urutan undangan)
Selesai
```

\*MVP approve: cukup **semua pihak yang diundang sebagai reviewer** menekan approve (minimal satu pihak lain). Detail quorum multi-pihak (>2) dapat diperhalus nanti tanpa mengubah nav.

### Hak per status (ringkas)

| Status | Inisiator | Pihak lain |
|--------|-----------|------------|
| Draf | Edit, kirim review | — (belum diundang) / preview terbatas |
| Dalam review | Revisi setelah masukkan; kirim ulang; lihat komentar | Komentar saja; tidak edit |
| Review disetujui | TTD + materai | Menunggu giliran |
| Menunggu TTD pihak | Lihat progress | TTD saat giliran |
| Selesai | Baca / unduh | Baca / unduh |

## Header navigation (pendekatan A)

### Pemakai

| Item | Tujuan |
|------|--------|
| **Dokumen** | Daftar kontrak milik / relevan. Filter atau badge **Perlu tindakan** (menunggu review, perlu revisi, perlu TTD, dll.). |
| **Template** | Template sistem + template milik user. |
| Kanan | Tema · menu akun (profil, keluar; nanti: pengaturan akun). |

Bukan di header: Simpan, Preview, Bagikan, Variabel, Komentar, TTD — itu document bar / panel kontekstual.

### Admin / Superadmin

Area terpisah (mis. `/admin`): **Pengguna** · **Template sistem** · **Pengaturan**. Tidak dicampur ke nav pemakai kecuali role switcher di akun.

### Mobile

Nav pemakai: logo + menu (sheet/drawer) berisi Dokumen · Template · Akun. Document bar dan panel sheet (Variabel | Komentar) tetap seperti pola mobile editor saat ini.

## In-document chrome (bukan nav)

| Zona | Isi |
|------|-----|
| **Document bar** | Judul/status fase + aksi fase: Kirim review, Bagikan tautan review, Approve (pihak lain), TTD + materai (inisiator), TTD (pihak lain), Preview, Simpan |
| **Panel kanan / sheet** | Edit → Variabel; Review → Komentar (riwayat open/resolved) |
| **Kanvas** | A4; read-only untuk pihak lain di fase review & setelah lock tertentu |

## Review loop (produk)

1. Inisiator mengirim draf → status **Dalam review**; pihak lain buka tautan/undangan (read-only).
2. Pihak lain menandai teks + komentar (MVP yang ada); inisiator melihat, merevisi, kirim ulang.
3. Riwayat komentar (open/resolved) tetap jadi jejak.
4. Bila isi sesuai → pihak lain **Approve review** → **Review disetujui**.
5. Inisiator **TTD + materai** dulu → lalu pihak lain TTD.

Tidak ada fitur “jadwal meeting review” di scope ini; “review” = siklus komentar + approve.

## Templates

- **Sistem:** dikelola admin; tersedia ke pemakai saat buat baru.
- **Milik user:** “Simpan sebagai template” dari dokumen inisiator; hanya pemilik (atau kebijakan berbagi nanti).
- Buat dari 0 tetap didukung (dokumen kosong / starter).

## Data implications (arah, belum implementasi)

- Entitas: User, Document, DocumentParty (role: initiator | party, order), Comment (sudah ada arahnya), Approval, Signature, Stamp (materai), Template (owner: system | userId).
- Persistence: keluar dari localStorage-only saat auth/list dibangun; komentar harus terikat documentId + user, bukan hanya browser yang sama.

## Success criteria

- Pemakai memahami 2 item nav utama tanpa bingung dengan aksi dokumen.
- Pihak lain tidak pernah mendapat UI edit badan dokumen di fase review.
- Urutan TTD: inisiator (+ materai) sebelum pihak lain — terlihat di status & document bar.
- Admin tidak mengotori nav workspace pemakai.

## Open questions (non-blocking)

1. Urutan TTD jika >2 pihak lain: urutan undangan vs paralel?
2. Apakah inisiator juga harus “approve” sendiri sebelum TTD, atau kirim ulang terakhir cukup?
3. E-materai: wajib sebelum TTD pihak lain, atau opsional per template?
