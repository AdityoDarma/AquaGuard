from flask import Flask, request, jsonify, render_template, redirect, url_for, send_file
import pickle, numpy as np, os, io, json, csv
from database import init_db, simpan_prediksi, ambil_semua, hapus_semua, hapus_satu, statistik

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, 'model', 'rf_model_lele.pkl'), 'rb') as f: model = pickle.load(f)
with open(os.path.join(BASE_DIR, 'model', 'scaler_lele.pkl'), 'rb') as f: scaler = pickle.load(f)
with open(os.path.join(BASE_DIR, 'model', 'label_encoder_lele.pkl'), 'rb') as f: le = pickle.load(f)

init_db()

# ── Batas input yang diterima form (validasi frontend & backend) ──────────────
# Ini batas FISIK yang masuk akal untuk diinput user, bukan range training
BATAS_INPUT = {
    'suhu':      {'min': 15,  'max': 40,   'satuan': '°C',   'nama': 'Suhu'},
    'pH':        {'min': 3,   'max': 11,   'satuan': '',     'nama': 'pH'},
    'DO':        {'min': 0,   'max': 20,   'satuan': 'mg/L', 'nama': 'DO'},
    'amonia':    {'min': 0,   'max': 10,   'satuan': 'mg/L', 'nama': 'Amonia'},
    'nitrat':    {'min': 0,   'max': 200,  'satuan': 'mg/L', 'nama': 'Nitrat'},
    'TDS':       {'min': 0,   'max': 1000, 'satuan': 'mg/L', 'nama': 'TDS'},
    'turbidity': {'min': 0,   'max': 500,  'satuan': 'NTU',  'nama': 'Turbidity'},
}

# ── Batas EKSTREM absolut: jika dilampaui → paksa BERBAHAYA via rule ─────────
# Nilai ini jauh lebih longgar dari range optimal — hanya untuk kondisi kritis nyata
BATAS_EKSTREM = {
    'suhu':      (10,  45),    # di bawah 10 atau di atas 45 → kondisi ekstrem
    'pH':        (4,   10),    # pH sangat asam/basa
    'DO':        (0.5, 20),    # DO sangat rendah
    'amonia':    (0,   8),     # amonia sangat tinggi
    'nitrat':    (0,   190),   # mendekati batas max dataset
    'TDS':       (50,  950),   # TDS sangat tinggi/rendah
    'turbidity': (0,   400),   # turbidity ekstrem
}

SARAN = {
    'AMAN':      'Kualitas air kolam dalam kondisi baik. Pertahankan kondisi saat ini dan lakukan monitoring rutin.',
    'WASPADA':   'Kualitas air mulai menurun. Periksa parameter yang menyimpang dan lakukan tindakan pencegahan segera.',
    'BERBAHAYA': 'PERINGATAN! Kualitas air berbahaya bagi ikan lele. Segera lakukan pergantian air parsial dan perbaiki kondisi kolam.',
}

FEATURES = ['suhu','pH','DO','amonia','nitrat','TDS','turbidity']
SEVERITY = {'AMAN': 0, 'WASPADA': 1, 'BERBAHAYA': 2}

def evaluasi_standar(suhu, pH, DO, amonia, nitrat, TDS, turbidity):
    peringatan = []
    parameter_status = {}

    def catat(param, next_status, pesan=None):
        parameter_status[param] = next_status
        if pesan:
            peringatan.append(pesan)

    if suhu < 20 or suhu > 35:
        catat('suhu', 'BERBAHAYA', f'Suhu {suhu}°C berada pada zona berbahaya (<20 atau >35°C)')
    elif not (26 <= suhu <= 30):
        catat('suhu', 'WASPADA', f'Suhu {suhu}°C di luar rentang optimal (26–30°C)')
    else:
        catat('suhu', 'AMAN')

    if pH < 6.0 or pH > 9.0:
        catat('pH', 'BERBAHAYA', f'pH {pH} berada pada zona berbahaya (<6 atau >9)')
    elif not (7.0 <= pH <= 8.0):
        catat('pH', 'WASPADA', f'pH {pH} di luar rentang optimal (7.0–8.0)')
    else:
        catat('pH', 'AMAN')

    if DO < 3:
        catat('DO', 'BERBAHAYA', f'DO {DO} mg/L berada pada zona berbahaya (<3 mg/L)')
    elif DO < 5:
        catat('DO', 'WASPADA', f'DO {DO} mg/L di bawah batas aman (>5 mg/L)')
    else:
        catat('DO', 'AMAN')

    if amonia > 0.5:
        catat('amonia', 'BERBAHAYA', f'Amonia {amonia} mg/L berada pada zona berbahaya (>0.5 mg/L)')
    elif amonia > 0.1:
        catat('amonia', 'WASPADA', f'Amonia {amonia} mg/L melebihi batas aman (<0.1 mg/L)')
    else:
        catat('amonia', 'AMAN')

    if nitrat > 50:
        catat('nitrat', 'BERBAHAYA', f'Nitrat {nitrat} mg/L berada pada zona berbahaya (>50 mg/L)')
    elif nitrat > 10:
        catat('nitrat', 'WASPADA', f'Nitrat {nitrat} mg/L melebihi batas aman (>10 mg/L)')
    else:
        catat('nitrat', 'AMAN')

    if TDS < 100 or TDS > 1000:
        catat('TDS', 'BERBAHAYA', f'TDS {TDS} mg/L berada pada zona berbahaya (<100 atau >1000 mg/L)')
    elif not (200 <= TDS <= 500):
        catat('TDS', 'WASPADA', f'TDS {TDS} mg/L di luar rentang optimal (200–500 mg/L)')
    else:
        catat('TDS', 'AMAN')

    if turbidity > 100:
        catat('turbidity', 'BERBAHAYA', f'Turbidity {turbidity} NTU berada pada zona berbahaya (>100 NTU)')
    elif turbidity > 30:
        catat('turbidity', 'WASPADA', f'Turbidity {turbidity} NTU di atas batas waspada (>30 NTU)')
    else:
        catat('turbidity', 'AMAN')

    berbahaya_count = sum(1 for status in parameter_status.values() if status == 'BERBAHAYA')
    waspada_count = sum(1 for status in parameter_status.values() if status == 'WASPADA')

    if berbahaya_count >= 1:
        status = 'BERBAHAYA'
    elif waspada_count >= 2:
        status = 'WASPADA'
    else:
        status = 'AMAN'

    return status, peringatan, parameter_status, berbahaya_count, waspada_count

def skor_keputusan_rule(final_label, berbahaya_count, waspada_count):
    if final_label == 'BERBAHAYA':
        berbahaya = min(0.92, 0.68 + (0.07 * max(0, berbahaya_count - 1)) + (0.02 * waspada_count))
        waspada = min(0.24, 0.18 + (0.02 * waspada_count))
        aman = max(0.04, 1.0 - berbahaya - waspada)
        total = aman + waspada + berbahaya
        return {'AMAN': aman / total, 'WASPADA': waspada / total, 'BERBAHAYA': berbahaya / total}

    if final_label == 'WASPADA':
        waspada = min(0.82, 0.62 + (0.05 * max(0, waspada_count - 2)))
        berbahaya = 0.08
        aman = 1.0 - waspada - berbahaya
        return {'AMAN': aman, 'WASPADA': waspada, 'BERBAHAYA': berbahaya}

    if waspada_count == 1:
        return {'AMAN': 0.68, 'WASPADA': 0.27, 'BERBAHAYA': 0.05}

    return {'AMAN': 0.92, 'WASPADA': 0.06, 'BERBAHAYA': 0.02}

def proses_prediksi(data, simpan=True):
    values = []
    error_validasi = []

    for feat in FEATURES:
        val = data.get(feat)
        if val is None or str(val).strip() == '':
            return None, {'error': f'Parameter {feat} tidak boleh kosong'}, 400
        try:
            val = float(val)
        except (TypeError, ValueError):
            return None, {'error': f'Parameter {feat} harus berupa angka'}, 400

        b = BATAS_INPUT[feat]
        if val < b['min'] or val > b['max']:
            error_validasi.append(
                f"{b['nama']} {val}{b['satuan']} tidak valid — nilai harus antara {b['min']}–{b['max']}{b['satuan']}"
            )
        values.append(val)

    if error_validasi:
        return None, {
            'error_validasi': True,
            'pesan': 'Nilai parameter di luar batas yang dapat diproses.',
            'detail': error_validasi,
        }, 422

    suhu, pH, DO, amonia, nitrat, TDS, turbidity = values

    kondisi_ekstrem = []
    for feat, val in zip(FEATURES, values):
        lo, hi = BATAS_EKSTREM[feat]
        if val < lo or val > hi:
            kondisi_ekstrem.append(f'{feat}={val} di luar batas absolut ({lo}–{hi})')

    if kondisi_ekstrem:
        pred_label = 'BERBAHAYA'
        prob_dict  = {'AMAN': 0.0, 'WASPADA': 0.05, 'BERBAHAYA': 0.95}
        peringatan_rule = [f'⛔ Nilai ekstrem: {k}' for k in kondisi_ekstrem]
    else:
        arr        = np.array([values])
        arr_sc     = scaler.transform(arr)
        pred_label = le.inverse_transform(model.predict(arr_sc))[0]
        prob_dict  = dict(zip(le.classes_, model.predict_proba(arr_sc)[0].tolist()))
        peringatan_rule = []

    status_standar, peringatan_standar, parameter_status, berbahaya_count, waspada_count = evaluasi_standar(suhu, pH, DO, amonia, nitrat, TDS, turbidity)
    prob_model = dict(prob_dict)
    final_label = status_standar
    if kondisi_ekstrem:
        final_label = 'BERBAHAYA'
        berbahaya_count = max(berbahaya_count, 1)
    prob_dict = skor_keputusan_rule(final_label, berbahaya_count, waspada_count)
    peringatan = list(peringatan_rule) + peringatan_standar

    params = dict(zip(FEATURES, values))
    hasil = {
        'status':       final_label,
        'probabilitas': prob_dict,
        'probabilitas_model': prob_model,
        'status_model': pred_label,
        'status_standar': status_standar,
        'status_dikoreksi': final_label != pred_label,
        'parameter_status': parameter_status,
        'berbahaya_count': berbahaya_count,
        'waspada_count': waspada_count,
        'peringatan':   peringatan,
        'saran':        SARAN[final_label],
    }
    if simpan:
        simpan_prediksi(params, hasil)

    return {**hasil, 'input': params}, None, 200

@app.route('/')
def index(): return render_template('index.html', batas=BATAS_INPUT)

@app.route('/riwayat')
def riwayat():
    f = request.args.get('status','')
    return render_template('riwayat.html', riwayat=ambil_semua(f or None), stat=statistik(), filter_status=f)

@app.route('/tentang')
def tentang(): return render_template('tentang.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data     = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({'error': 'Request harus berupa JSON dengan parameter kualitas air.'}), 400

        hasil, error, status_code = proses_prediksi(data, simpan=True)
        if error:
            return jsonify(error), status_code
        return jsonify(hasil)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict-batch', methods=['POST'])
def predict_batch():
    try:
        file = request.files.get('file')
        if not file or file.filename == '':
            return jsonify({'error': 'File CSV belum dipilih.'}), 400
        if not file.filename.lower().endswith('.csv'):
            return jsonify({'error': 'Format file harus CSV.'}), 400

        text = file.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            return jsonify({'error': 'CSV kosong atau header tidak terbaca.'}), 400

        missing = [f for f in FEATURES if f not in reader.fieldnames]
        if missing:
            return jsonify({
                'error': 'Header CSV tidak sesuai.',
                'required_columns': FEATURES,
                'missing_columns': missing,
            }), 400

        results = []
        errors = []
        max_rows = 300
        for idx, row in enumerate(reader, start=2):
            if idx > max_rows + 1:
                errors.append({'row': idx, 'error': f'Maksimal {max_rows} baris per upload.'})
                break

            payload = {f: row.get(f) for f in FEATURES}
            hasil, error, status_code = proses_prediksi(payload, simpan=True)
            if error:
                errors.append({'row': idx, 'status_code': status_code, 'error': error})
                continue

            results.append({
                'row': idx,
                'input': hasil['input'],
                'status': hasil['status'],
                'probabilitas': hasil['probabilitas'],
                'peringatan_count': len(hasil['peringatan']),
                'saran': hasil['saran'],
            })

        summary = {
            'total_rows': len(results) + len(errors),
            'success': len(results),
            'failed': len(errors),
            'AMAN': sum(1 for r in results if r['status'] == 'AMAN'),
            'WASPADA': sum(1 for r in results if r['status'] == 'WASPADA'),
            'BERBAHAYA': sum(1 for r in results if r['status'] == 'BERBAHAYA'),
        }
        return jsonify({'summary': summary, 'results': results, 'errors': errors})

    except UnicodeDecodeError:
        return jsonify({'error': 'File CSV harus menggunakan encoding UTF-8.'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/riwayat/hapus/<int:rid>', methods=['POST'])
def hapus_record(rid):
    hapus_satu(rid)
    return redirect(url_for('riwayat', status=request.form.get('filter_status','')))

@app.route('/riwayat/hapus-semua', methods=['POST'])
def hapus_semua_route():
    hapus_semua(); return redirect(url_for('riwayat'))

@app.route('/riwayat/export-json')
def export_json():
    data = ambil_semua()
    buf  = io.BytesIO(json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8'))
    buf.seek(0)
    return send_file(buf, mimetype='application/json', as_attachment=True, download_name='riwayat_prediksi.json')

@app.route('/api/tren')
def api_tren():
    data = ambil_semua(limit=50)
    data.reverse()
    return jsonify(data)

if __name__ == '__main__': app.run(debug=True)
