# AquaGuard — Sistem Peringatan Dini Kualitas Air Lele Sangkuriang

Aplikasi web berbasis Flask + Random Forest untuk memprediksi status kualitas air kolam ikan lele Sangkuriang berdasarkan 7 parameter: Suhu, pH, DO, Amonia, Nitrat, TDS, dan Turbidity.

---

## Struktur Folder

```
lele_web/
├── app.py                  ← Backend Flask (API + routing)
├── requirements.txt        ← Daftar library Python
├── Procfile                ← Konfigurasi deploy Render
├── .gitignore
├── model/                  ← ⚠️ Folder ini kamu buat sendiri, tidak ada di GitHub
│   ├── rf_model_lele.pkl
│   ├── scaler_lele.pkl
│   └── label_encoder_lele.pkl
├── templates/
│   └── index.html          ← Halaman utama
└── static/
    ├── css/style.css
    └── js/main.js
```

---

## LANGKAH 1 — Persiapan Lokal

### 1.1 Install Python
Pastikan Python 3.10+ sudah terinstall.
```
python --version
```

### 1.2 Buat virtual environment
```bash
# Buka terminal, masuk ke folder project
cd lele_web

# Buat virtual environment
python -m venv venv

# Aktifkan (Windows)
venv\Scripts\activate

# Aktifkan (Mac/Linux)
source venv/bin/activate
```

### 1.3 Install library
```bash
pip install -r requirements.txt
```

---

## LANGKAH 2 — Letakkan File Model

1. Ekstrak file `model_lele_sangkuriang.zip` yang sudah kamu download dari Google Colab
2. Buat folder `model/` di dalam folder `lele_web/`
3. Pindahkan 3 file `.pkl` ke dalam folder `model/`:
   ```
   lele_web/model/rf_model_lele.pkl
   lele_web/model/scaler_lele.pkl
   lele_web/model/label_encoder_lele.pkl
   ```

---

## LANGKAH 3 — Jalankan Lokal

```bash
# Pastikan sudah di dalam folder lele_web/ dan venv aktif
python app.py
```

Buka browser → **http://127.0.0.1:5000**

Jika berhasil, akan muncul tampilan AquaGuard. Coba isi form dan tekan Prediksi.

---

## LANGKAH 4 — Upload ke GitHub

### 4.1 Buat akun GitHub
Daftar di https://github.com jika belum punya.

### 4.2 Buat repository baru
1. Klik tombol **+** → **New repository**
2. Nama repo: `aquaguard-lele` (atau bebas)
3. Pilih **Public**
4. Klik **Create repository**

### 4.3 Upload file ke GitHub
```bash
# Di dalam folder lele_web/
git init
git add .
git commit -m "Initial commit - AquaGuard Flask App"
git branch -M main
git remote add origin https://github.com/USERNAME/aquaguard-lele.git
git push -u origin main
```
> Ganti `USERNAME` dengan username GitHub kamu.

### 4.4 Upload file model secara manual (penting!)
File `.pkl` tidak ikut di-push karena ada di `.gitignore`.
Kamu perlu upload model ke Render secara terpisah (lihat Langkah 5.3).

---

## LANGKAH 5 — Deploy ke Render (Gratis)

### 5.1 Buat akun Render
Daftar di https://render.com menggunakan akun GitHub.

### 5.2 Buat Web Service baru
1. Klik **New** → **Web Service**
2. Pilih **Connect a repository** → pilih repo `aquaguard-lele`
3. Isi konfigurasi:
   - **Name**: `aquaguard-lele`
   - **Region**: Singapore (paling dekat Indonesia)
   - **Branch**: `main`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Plan: pilih **Free**
5. Klik **Create Web Service**

### 5.3 Upload file model ke Render
Karena file `.pkl` tidak ada di GitHub, kamu perlu cara lain:

**Opsi A — Upload via Render Shell (paling mudah):**
1. Setelah deploy selesai, buka tab **Shell** di dashboard Render
2. Ketik perintah berikut untuk membuat folder model:
   ```bash
   mkdir model
   ```
3. Upload file `.pkl` via fitur **Files** di Render dashboard (drag & drop ke folder `model/`)

**Opsi B — Simpan model ke Google Drive lalu download saat startup:**
Tambahkan kode berikut di bagian awal `app.py` (sebelum load model):
```python
import gdown, os
if not os.path.exists('model/rf_model_lele.pkl'):
    os.makedirs('model', exist_ok=True)
    gdown.download('LINK_GDRIVE_RF', 'model/rf_model_lele.pkl', quiet=False)
    gdown.download('LINK_GDRIVE_SCALER', 'model/scaler_lele.pkl', quiet=False)
    gdown.download('LINK_GDRIVE_LE', 'model/label_encoder_lele.pkl', quiet=False)
```
> Ganti `LINK_GDRIVE_*` dengan link share Google Drive dari masing-masing file `.pkl`.
> Tambahkan `gdown` ke `requirements.txt`.

### 5.4 Akses website
Setelah deploy selesai (~2-5 menit), Render akan memberi URL seperti:
```
https://aquaguard-lele.onrender.com
```
Website sudah online dan bisa diakses siapapun!

---

## Catatan Penting

- **Free tier Render**: server akan "tidur" jika tidak ada request selama 15 menit. Request pertama setelah tidur akan lambat (~30 detik). Ini normal untuk plan gratis.
- **Versi library**: pastikan versi scikit-learn di `requirements.txt` sama dengan yang kamu pakai di Google Colab saat training. Perbedaan versi bisa menyebabkan file `.pkl` gagal di-load.
- Untuk cek versi scikit-learn di Colab: `import sklearn; print(sklearn.__version__)`

---

## Test Data untuk Validasi

| Parameter | AMAN | WASPADA | BERBAHAYA |
|---|---|---|---|
| Suhu (°C) | 28.0 | 25.0 | 32.5 |
| pH | 7.5 | 7.5 | 5.8 |
| DO (mg/L) | 6.5 | 4.5 | 1.5 |
| Amonia (mg/L) | 0.05 | 0.2 | 2.5 |
| Nitrat (mg/L) | 8.0 | 20.0 | 155.0 |
| TDS (mg/L) | 350 | 320 | 650 |
| Turbidity (NTU) | 15.0 | 80.0 | 150.0 |
