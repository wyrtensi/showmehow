"""Writes expected QR matrices produced by python-qrcode (pip install qrcode).

Run: python scripts/test/fixtures/qr-generate.py   (needs: pip install qrcode)
Output: .tmp/qr-expected.json (the full set, all 8 masks per string) and the small fixtures
scripts/test/fixtures/qr-*.json that the Node test reads without Python.

Every case is encoded as ONE byte-mode segment (no numeric/alphanumeric splitting), error
correction M, the version python-qrcode picks, and a forced mask.
"""
import json
import os
import sys

import qrcode
from qrcode.constants import ERROR_CORRECT_M
from qrcode.util import QRData, MODE_8BIT_BYTE

def find_root():
    here = os.path.dirname(os.path.abspath(__file__))
    while not os.path.exists(os.path.join(here, 'package.json')):
        parent = os.path.dirname(here)
        if parent == here:
            sys.exit('package.json not found above ' + here)
        here = parent
    return here


ROOT = find_root()
os.makedirs(os.path.join(ROOT, '.tmp'), exist_ok=True)
FIX = os.path.join(ROOT, 'scripts', 'test', 'fixtures')


def make(text, version=None, mask=None):
    qr = qrcode.QRCode(version=version, error_correction=ERROR_CORRECT_M, box_size=1, border=0, mask_pattern=mask)
    qr.add_data(QRData(text.encode('utf-8'), mode=MODE_8BIT_BYTE))
    qr.make(fit=version is None)
    return qr


def rows(qr):
    return [''.join('1' if c else '0' for c in row) for row in qr.modules]


def filler(n, seed):
    # Deterministic printable ASCII of exactly n bytes.
    alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.:;,'
    out = []
    x = seed
    for _ in range(n):
        x = (x * 1103515245 + 12345) & 0x7FFFFFFF
        out.append(alphabet[(x >> 8) % len(alphabet)])
    return ''.join(out)


# Strings of different lengths. The version boundaries (capacity at level M: 14, 26, 42, 62, 84,
# 106, 122, 152, 180, 213 bytes) are covered on both sides.
BOUNDARY = [14, 15, 26, 27, 42, 43, 62, 63, 84, 85, 106, 107, 122, 123, 152, 153, 180, 181, 213]
cases = []
cases.append(('short ascii', 'HELLO'))
cases.append(('digits only', '1234567890123456789012345'))
cases.append(('wifi ascii', 'WIFI:T:WPA;S:HomeNet;P:correct horse battery;;'))
cases.append(('wifi cyrillic ssid', 'WIFI:T:WPA;S:Дом_Иванова;P:пароль12345;;'))
cases.append(('wifi cyrillic long', 'WIFI:T:WPA;S:Квартира 42 (второй этаж, гостевая сеть);P:Очень-длинный-пароль-для-гостей-2026;;'))
cases.append(('wifi escaped', 'WIFI:T:WPA;S:a\\;b\\,c\\:d\\"e\\\\f;P:p\\;w\\,d\\:\\"x;;'))
cases.append(('wifi open', 'WIFI:T:nopass;S:Cafe Guest;;'))
cases.append(('wifi emoji-free unicode', 'WIFI:T:WPA;S:Café Zürich ñandú;P:Ünïcödé-pässwörd;;'))
cases.append(('wifi hidden', 'WIFI:T:WEP;S:Office;P:0123456789abc;H:true;;'))
cases.append(('url', 'https://wyrtensi.github.io/showmehow/guides/'))
for n in BOUNDARY:
    cases.append((f'filler {n}', filler(n, n)))

out_full = []
for name, text in cases:
    base = make(text)
    version = base.version
    entry = {'name': name, 'text': text, 'bytes': len(text.encode('utf-8')), 'version': version, 'pyMask': base.best_mask_pattern(), 'masks': {}}
    for mask in range(8):
        entry['masks'][str(mask)] = rows(make(text, version, mask))
    out_full.append(entry)

with open(os.path.join(ROOT, '.tmp', 'qr-expected.json'), 'w', encoding='utf-8') as f:
    json.dump(out_full, f, ensure_ascii=False)


def fixture(entry, masks):
    return {'name': entry['name'], 'text': entry['text'], 'version': entry['version'], 'cases': [{'mask': m, 'rows': entry['masks'][str(m)]} for m in masks]}


by_name = {e['name']: e for e in out_full}
os.makedirs(FIX, exist_ok=True)

# All eight masks for two small strings (one ASCII, one Cyrillic).
masks_fix = [fixture(by_name['wifi ascii'], range(8)), fixture(by_name['wifi cyrillic ssid'], range(8))]
# One string per version 1..10, mask rotating, covering the 8-bit and 16-bit count fields.
by_version = {}
for e in out_full:
    by_version.setdefault(e['version'], e)
versions_fix = []
for v in sorted(by_version):
    e = by_version[v]
    versions_fix.append(fixture(e, [v % 8]))
# Real Wi-Fi strings: special characters, open network, hidden flag, long Cyrillic.
wifi_fix = [fixture(by_name[n], [(i * 3 + 1) % 8]) for i, n in enumerate(['wifi cyrillic long', 'wifi escaped', 'wifi open', 'wifi emoji-free unicode', 'wifi hidden', 'digits only'])]

for fname, data in (('qr-masks.json', masks_fix), ('qr-versions.json', versions_fix), ('qr-wifi.json', wifi_fix)):
    with open(os.path.join(FIX, fname), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print('wrote', fname, os.path.getsize(os.path.join(FIX, fname)), 'bytes')

print('strings', len(out_full), 'versions', sorted(set(e['version'] for e in out_full)), 'qrcode', getattr(qrcode, '__version__', '?'))
