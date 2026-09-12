import sqlite3, os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'riwayat.db')

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS riwayat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            waktu TEXT, suhu REAL, pH REAL, DO REAL,
            amonia REAL, nitrat REAL, TDS REAL, turbidity REAL,
            status TEXT, p_aman REAL, p_waspada REAL, p_berbahaya REAL
        )''')
        conn.commit()

def simpan_prediksi(params, hasil):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''INSERT INTO riwayat
            (waktu,suhu,pH,DO,amonia,nitrat,TDS,turbidity,status,p_aman,p_waspada,p_berbahaya)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''', (
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            params.get('suhu'), params.get('pH'), params.get('DO'),
            params.get('amonia'), params.get('nitrat'), params.get('TDS'), params.get('turbidity'),
            hasil.get('status'),
            hasil.get('probabilitas',{}).get('AMAN',0),
            hasil.get('probabilitas',{}).get('WASPADA',0),
            hasil.get('probabilitas',{}).get('BERBAHAYA',0),
        ))
        conn.commit()

def ambil_semua(filter_status=None, limit=200):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        if filter_status in ('AMAN','WASPADA','BERBAHAYA'):
            rows = conn.execute('SELECT * FROM riwayat WHERE status=? ORDER BY id DESC LIMIT ?',(filter_status,limit)).fetchall()
        else:
            rows = conn.execute('SELECT * FROM riwayat ORDER BY id DESC LIMIT ?',(limit,)).fetchall()
    return [dict(r) for r in rows]

def hapus_semua():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('DELETE FROM riwayat')
        conn.execute("DELETE FROM sqlite_sequence WHERE name='riwayat'")
        conn.commit()

def hapus_satu(rid):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('DELETE FROM riwayat WHERE id=?',(rid,)); conn.commit()

def statistik():
    with sqlite3.connect(DB_PATH) as conn:
        total = conn.execute('SELECT COUNT(*) FROM riwayat').fetchone()[0]
        rows  = conn.execute('SELECT status,COUNT(*) FROM riwayat GROUP BY status').fetchall()
    stat = {'total':total,'AMAN':0,'WASPADA':0,'BERBAHAYA':0}
    for r in rows: stat[r[0]] = r[1]
    return stat
