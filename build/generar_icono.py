#!/usr/bin/env python3
"""Genera build/icon.png (512 px) y build/icon.ico (16-256 px) con esquinas
redondeadas a partir de build/icon-fuente.png. Requiere Pillow y NumPy.

    python build/generar_icono.py          (desde la raíz del repositorio)

Además actualiza el icono embebido en carta_solar.html (favicon, que también
usa la ventana "Acerca de"), para que el HTML siga siendo autocontenido.

El fuente es una loseta crema sobre fondo transparente. Se recorta la loseta
unos píxeles hacia dentro (para eliminar su borde original), se aplana sobre
crema y se le aplica una máscara de esquinas redondeadas propia (radio = 20 %
del lado) remuestreada a 4x, de modo que el borde sale suavizado en todos los
tamaños. Cada tamaño se reduce desde el maestro de 1024 px y se enmascara a su
propia resolución: así el contorno queda nítido también a 16 px.
"""
import base64, io, pathlib, re, struct
import numpy as np
from PIL import Image, ImageDraw

RAIZ = pathlib.Path(__file__).resolve().parent.parent
B = RAIZ / 'build'
RECORTE = (40, 28, 622, 600)        # loseta del fuente, ya sin su borde
CREMA = (243, 240, 231, 255)
RADIO = 0.20
TAMANOS_ICO = [16, 20, 24, 32, 40, 48, 64, 128, 256]

src = Image.open(B / 'icon-fuente.png').convert('RGBA')
loseta = src.crop(RECORTE)
w, h = loseta.size
lado = max(w, h)
base = Image.new('RGBA', (lado, lado), CREMA)
base.alpha_composite(loseta, ((lado - w) // 2, (lado - h) // 2))
a = np.array(base); a[:, :, 3] = 255
maestro = Image.fromarray(a).resize((1024, 1024), Image.LANCZOS)

def redondeado(n, ss=4):
    img = maestro.resize((n, n), Image.LANCZOS)
    m = Image.new('L', (n * ss, n * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, n * ss - 1, n * ss - 1),
                                        radius=int(RADIO * n * ss), fill=255)
    img.putalpha(m.resize((n, n), Image.LANCZOS))
    return img

redondeado(512).save(B / 'icon.png', optimize=True)

pngs = []
for n in TAMANOS_ICO:
    buf = io.BytesIO(); redondeado(n).save(buf, 'PNG', optimize=True)
    pngs.append(buf.getvalue())
cab = struct.pack('<HHH', 0, 1, len(TAMANOS_ICO))
off = 6 + 16 * len(TAMANOS_ICO); ent = b''
for n, d in zip(TAMANOS_ICO, pngs):
    ent += struct.pack('<BBBBHHII', n % 256, n % 256, 0, 0, 1, 32, len(d), off)
    off += len(d)
(B / 'icon.ico').write_bytes(cab + ent + b''.join(pngs))
print('build/icon.png (512) y build/icon.ico', TAMANOS_ICO)

# Icono embebido en el HTML: la entrada de 256 px del ICO
html_p = RAIZ / 'carta_solar.html'
html = html_p.read_text(encoding='utf-8')
b64 = base64.b64encode(pngs[TAMANOS_ICO.index(256)]).decode('ascii')
nuevo, n = re.subn(r'(id="acIcono" href="data:image/png;base64,)[A-Za-z0-9+/=]+(")',
                   lambda m: m.group(1) + b64 + m.group(2), html)
if n != 1:
    raise SystemExit('carta_solar.html: no se encontró el favicon id="acIcono"')
html_p.write_text(nuevo, encoding='utf-8', newline='\n')
print('carta_solar.html: icono embebido actualizado')
