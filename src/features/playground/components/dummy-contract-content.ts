/** Initial TipTap HTML — multi-page Indonesian contract draft (dummy).
 *  Merge fields: span[data-type=contract-variable][data-key=…] → live form values.
 */
import { variableHtml } from "./contract-variables"

const v = variableHtml

export const DUMMY_CONTRACT_CONTENT = `
<h2 style="text-align: center">${v("judul")}</h2>
<p style="text-align: justify">
Pada hari ini, ${v("tanggal")}, para pihak yang bertanda tangan di bawah ini:
</p>
<p style="text-align: justify">
<strong>${v("pihak1")}</strong>, selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>,
adalah badan hukum yang didirikan berdasarkan hukum Republik Indonesia dan berkedudukan di Indonesia.
</p>
<p style="text-align: justify">
<strong>${v("pihak2")}</strong>, selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>,
adalah badan hukum yang didirikan berdasarkan hukum Republik Indonesia dan berkedudukan di Indonesia.
</p>
<p style="text-align: justify">
Para pihak terlebih dahulu menerangkan bahwa mereka saling bersepakat untuk mengikatkan diri
dalam perjanjian kerja sama dengan ketentuan dan syarat sebagai berikut.
</p>
<h3>Pasal 1 — Ruang Lingkup</h3>
<p style="text-align: justify">
PIHAK PERTAMA dan PIHAK KEDUA sepakat untuk bekerja sama sesuai ruang lingkup yang disepakati bersama,
termasuk namun tidak terbatas pada perencanaan, pelaksanaan, serta evaluasi atas pekerjaan yang menjadi
objek perjanjian ini. Ruang lingkup dapat diperluas atau dikurangi berdasarkan kesepakatan tertulis para pihak.
</p>
<p style="text-align: justify">
Setiap perubahan ruang lingkup wajib dituangkan dalam addendum yang ditandatangani oleh kuasa yang berwenang
dari masing-masing pihak dan menjadi bagian yang tidak terpisahkan dari perjanjian ini.
</p>
<h3>Pasal 2 — Nilai Kontrak</h3>
<p style="text-align: justify">
Nilai perjanjian ini adalah sebesar <strong>${v("nilai")}</strong> (termasuk atau belum termasuk pajak
sebagaimana diatur dalam lampiran pembayaran). Pembayaran dilakukan sesuai jadwal milestone yang tertuang
dalam lampiran, setelah berita acara serah terima atau dokumen pendukung lain yang disyaratkan dipenuhi.
</p>
<p style="text-align: justify">
Keterlambatan pembayaran yang melewati jangka waktu yang disepakati dapat dikenakan bunga atau denda
sebagaimana diatur dalam lampiran, tanpa mengurangi hak PIHAK PERTAMA untuk menuntut pemenuhan kewajiban lain.
</p>
<h3>Pasal 3 — Jangka Waktu</h3>
<p style="text-align: justify">
Perjanjian ini berlaku sejak tanggal penandatanganan dan berakhir pada tanggal yang disepakati para pihak,
kecuali diakhiri lebih awal sesuai ketentuan pengakhiran dalam perjanjian ini. Perpanjangan jangka waktu
hanya berlaku apabila disepakati secara tertulis.
</p>
<p style="text-align: justify">
Apabila pekerjaan belum selesai pada akhir jangka waktu karena keadaan di luar kendali wajar para pihak,
para pihak akan bermusyawarah untuk menetapkan perpanjangan yang wajar tanpa menghilangkan hak dan kewajiban
yang telah timbul.
</p>
<h3>Pasal 4 — Hak dan Kewajiban</h3>
<p style="text-align: justify">
PIHAK PERTAMA berkewajiban menyediakan informasi, akses, dan keputusan yang diperlukan agar PIHAK KEDUA dapat
melaksanakan pekerjaan sesuai lingkup. PIHAK KEDUA berkewajiban melaksanakan pekerjaan secara profesional,
menjaga kerahasiaan data, dan menyerahkan hasil kerja sesuai spesifikasi.
</p>
<p style="text-align: justify">
Masing-masing pihak wajib menunjuk personel penghubung yang dapat dihubungi pada hari kerja untuk koordinasi
operasional. Perubahan personel penghubung wajib diberitahukan secara tertulis secepatnya.
</p>
<h3>Pasal 5 — Kerahasiaan</h3>
<p style="text-align: justify">
Para pihak wajib menjaga kerahasiaan informasi yang diperoleh dalam pelaksanaan perjanjian, termasuk data
pelanggan, dokumen teknis, dan ketentuan komersial, kecuali diwajibkan oleh hukum atau telah menjadi
informasi publik secara sah.
</p>
<p style="text-align: justify">
Kewajiban kerahasiaan tetap berlaku selama jangka waktu perjanjian dan untuk jangka waktu tambahan
setelah berakhirnya perjanjian sebagaimana disepakati dalam lampiran.
</p>
<h3>Pasal 6 — Pengakhiran</h3>
<p style="text-align: justify">
Salah satu pihak dapat mengakhiri perjanjian dengan pemberitahuan tertulis apabila pihak lainnya melakukan
wanprestasi material dan tidak memperbaiki dalam jangka waktu yang diberikan setelah teguran tertulis.
</p>
<p style="text-align: justify">
Pengakhiran tidak menghapus kewajiban pembayaran atas pekerjaan yang telah diselesaikan dan diterima,
serta tidak menghapus kewajiban kerahasiaan dan ganti rugi yang telah timbul.
</p>
<h3>Pasal 7 — Hukum yang Berlaku</h3>
<p style="text-align: justify">
Perjanjian ini diatur oleh dan ditafsirkan sesuai hukum Republik Indonesia. Setiap sengketa yang timbul
diupayakan penyelesaian melalui musyawarah; apabila tidak tercapai, diselesaikan melalui forum yang disepakati
para pihak dalam lampiran.
</p>
<p style="text-align: justify">
Demikian perjanjian ini dibuat untuk dipatuhi oleh kedua belah pihak dalam keadaan sehat dan tanpa paksaan.
</p>
`.trim()
