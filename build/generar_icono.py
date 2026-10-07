#!/usr/bin/env python3
"""Genera build/icon.png (512 px) y build/icon.ico (16-256 px) con esquinas
redondeadas a partir de build/icon-fuente.png. Requiere Pillow y NumPy.

    python build/generar_icono.py          (desde la raíz del repositorio)
    python build/generar_acerca.py         (luego, para refrescar el icono del "Acerca de")

El fuente es una loseta crema sobre fondo transparente. Se recorta la loseta
unos píxeles hacia dentro (para eliminar su borde original), se aplana sobre
crema y se le aplica una máscara de esquinas redondeadas propia (radio = 20 %
del lado) remuestreada a 4x, de modo que el borde sale suavizado en todos los
tamaños. Cada tamaño se reduce desde el maestro de 1024 px y se enmascara a su
propia resolución: así el contorno queda nítido también a 16 px.
"""
import io, pathlib, struct
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
