# Score for the 1.3.2 trailer: synthesized (numpy only), 44.1 kHz stereo WAV.
# python3 score132.py out.wav  -- cut times must match tools/trailer/cut132.sh
import sys, wave, numpy as np
SR = 44100
CUTS = [0.0, 4.0, 6.5, 9.4, 11.5, 12.8, 15.3, 17.8, 21.8, 25.8, 32.3]  # a1 a3 a4 b1 b2 c1 a5 ui1 ui2 title end
T = CUTS[-1]
n = int(SR * T); t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(7)

def env(t0, a, d, length):
    e = np.zeros(n); i0 = int(t0 * SR); m = min(n - i0, int(length * SR))
    if m <= 0: return e
    tt = np.arange(m) / SR
    e[i0:i0 + m] = np.minimum(1, tt / max(a, 1e-4)) * np.exp(-tt / d)
    return e
def lp(x, a):  # one-pole low-pass
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y
def saw(f, ph=0): return 2 * ((t * f + ph) % 1) - 1
def add(x, pan=0.0, g=1.0):
    global L, R
    L += x * g * (1 - max(0, pan)); R += x * g * (1 + min(0, pan))

# 1) drone: A1 saws + sub, swelling up to the title, a hole before the final hit
TT = CUTS[9]
swell = np.clip(t / TT, 0, 1) ** 1.5 * 0.6 + 0.25
swell[(t > TT - 0.6) & (t < TT)] *= np.linspace(1, 0.05, ((t > TT - 0.6) & (t < TT)).sum())
drone = (saw(55) + saw(55.4, .3) + saw(82.6, .6) * 0.5) / 2.5
drone = np.convolve(drone, np.ones(24) / 24, mode='same')  # soften
sub = np.sin(2 * np.pi * 27.5 * t) * 0.7
add((drone * 0.22 + sub * 0.35) * swell * (t < TT), 0, 1.0)
# 2) heartbeat: lub-dub, faster into the chase
beat_t = 0.6; tb = 0.4
while tb < CUTS[7] - 0.3:
    for k, (dt0, amp) in enumerate([(0, 1.0), (0.22, 0.7)]):
        i0 = int((tb + dt0) * SR); m = int(0.25 * SR)
        if i0 + m >= n: break
        tt = np.arange(m) / SR
        thump = np.sin(2 * np.pi * (48 + 40 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 16) * amp
        L[i0:i0 + m] += thump * 0.75; R[i0:i0 + m] += thump * 0.75
    beat_t = 1.1 if tb < CUTS[2] else 0.6 if tb < CUTS[6] else 0.8
    tb += beat_t
# 3) braams on the big cuts: low detuned brass-like stabs
def braam(t0, f=55, g=1.0, length=3.5):
    e = env(t0, 0.03, 1.2, length)
    x = sum(saw(f * r, p) for r, p in [(1, 0), (1.006, .2), (0.994, .5), (2, .1), (1.5, .7)]) / 5
    x = np.convolve(x * e, np.ones(12) / 12, mode='same')
    add(x * g * 0.9, 0)
for c, f, g in [(CUTS[2], 55, 0.7), (CUTS[3], 49, 0.8), (CUTS[5], 55, 0.6), (CUTS[6], 46.25, 0.9)]: braam(c, f, g)
# 4) music box: Angeline's lullaby motif under the profile / gifts segments
notes = [76, 79, 83, 81, 79, 76, 74, 76, 79, 76, 72, 74, 71]
for i, m in enumerate(notes):
    t0 = CUTS[7] + 0.15 + i * 0.6
    if t0 > CUTS[9] - 0.3: break
    f = 440 * 2 ** ((m - 69) / 12)
    e = env(t0, 0.002, 0.7, 2.2)
    x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) + 0.12 * np.sin(2 * np.pi * f * 3.98 * t)) * e
    add(x * 0.32, 0.4 if i % 2 else -0.4)
# 5) riser into the title, then the final hit
m0, m1 = int((CUTS[9] - 3.0) * SR), int((CUTS[9] - 0.12) * SR)
noise = rng.standard_normal(m1 - m0); k = np.linspace(0, 1, m1 - m0)
noise = np.convolve(noise, np.ones(6) / 6, mode='same') * k ** 2.2
sweep = np.sin(2 * np.pi * np.cumsum(200 + 1600 * k ** 2) / SR) * k ** 2
L[m0:m1] += (noise * 0.35 + sweep * 0.15); R[m0:m1] += (noise * 0.35 - sweep * 0.15)
braam(CUTS[9], 41.2, 1.3, 6.5)
hit = env(CUTS[9], 0.001, 0.25, 1.0) * rng.standard_normal(n); add(np.convolve(hit, np.ones(4) / 4, mode='same') * 0.5, 0)
boom = np.sin(2 * np.pi * (30 + 60 * np.exp(-(t - CUTS[9]).clip(0) * 9)) * (t - CUTS[9]).clip(0)) * env(CUTS[9], 0.002, 1.4, 5)
add(boom * 0.9, 0)
# 6) small whooshes on the fast cuts
for c in [CUTS[1], CUTS[2], CUTS[3], CUTS[7], CUTS[8]]:
    m0 = int((c - 0.45) * SR); m1 = int((c + 0.1) * SR); w = rng.standard_normal(m1 - m0)
    k = np.linspace(0, 1, m1 - m0); w = np.convolve(w, np.ones(10) / 10, mode='same') * np.sin(np.pi * k) ** 2
    L[m0:m1] += w * 0.25; R[m0:m1] += w * 0.25
# reverb (a decaying noise tail, convolved by FFT)
ir_n = int(SR * 2.2); ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 3.2); ir[0] = 0; ir /= np.abs(ir).sum() / 6
def verb(x):
    N = 1 << int(np.ceil(np.log2(len(x) + ir_n)))
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:len(x)]
L = L + verb(L) * 0.28; R = R + verb(R) * 0.28
# fade out, normalise, write
fade = np.ones(n); fo = int(SR * 2.5); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max()); L = L / peak * 0.89; R = R / peak * 0.89
data = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('score', T, 's')
