#!/usr/bin/env python3
"""Genera src/acerca.html a partir de build/acerca.tpl.html.

Inserta en la plantilla:
  @@FUENTES@@  los @font-face embebidos de carta_solar.html (misma tipografía,
               cero CDN, sin duplicar los woff2 a mano);
  @@ICONO@@    la entrada de 256 px de build/icon.ico en base64.

Solo usa la biblioteca estándar. Uso, desde la raíz del repositorio:
    python build/generar_acerca.py
"""
import base64, pathlib, re, struct, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
tpl = (RAIZ / 'build' / 'acerca.tpl.html').read_text(encoding='utf-8')
html = (RAIZ / 'carta_solar.html').read_text(encoding='utf-8')

fuentes = re.findall(r'@font-face\s*\{[^}]*\}', html)
if not fuentes:
    sys.exit('carta_solar.html no contiene @font-face embebidos')

ico = (RAIZ / 'build' / 'icon.ico').read_bytes()
_, tipo, n = struct.unpack_from('<HHH', ico, 0)
if tipo != 1:
    sys.exit('build/icon.ico no es un ICO válido')
png256 = None
for i in range(n):
    w, h, _, _, _, _, tam, off = struct.unpack_from('<BBBBHHII', ico, 6 + 16 * i)
    if w == 0 and h == 0:                       # 0 = 256 px en el formato ICO
        png256 = ico[off:off + tam]
if not png256 or png256[:8] != b'\x89PNG\r\n\x1a\n':
    sys.exit('build/icon.ico no tiene una entrada PNG de 256 px')

salida = (tpl.replace('/*@@FUENTES@@*/', '\n'.join(fuentes))
             .replace('@@ICONO@@', base64.b64encode(png256).decode('ascii')))
if '@@' in salida:
    sys.exit('Quedaron marcadores sin sustituir en la plantilla')
if re.search(r'(?:src|href)="https?://', salida):
    sys.exit('acerca.html tendría referencias externas; debe ser cero-CDN')

destino = RAIZ / 'src' / 'acerca.html'
destino.write_text(salida, encoding='utf-8', newline='\n')
print(f'{destino.relative_to(RAIZ)}: {len(salida.encode("utf-8"))} bytes, '
      f'{len(fuentes)} @font-face, icono {len(png256)} bytes')
