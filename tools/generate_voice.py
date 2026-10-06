"""Renders the announcer lines to MP3 with Piper (offline neural TTS).

Usage:
    pip install piper-tts      # plus ffmpeg on the PATH
    python3 tools/generate_voice.py

Voices are downloaded once into tools/.voices/ (git-ignored). Output goes to public/audio/<lang>/<key>.mp3.
"""
import io
import subprocess
import tarfile
import urllib.request
import wave
from pathlib import Path

import numpy as np

from piper import PiperVoice
from piper.config import SynthesisConfig

ROOT = Path(__file__).resolve().parent.parent
VOICE_DIR = Path(__file__).resolve().parent / ".voices"
OUT_DIR = ROOT / "public" / "audio"
RELEASE = "https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-{}.tar.gz"

# Male voices: Thorsten (German, CC0) and Ryan (US English, CC BY-NC-SA 4.0).
VOICES = {"de": "de-thorsten-low", "en": "en-us-ryan-high"}

LINES = {
    "de": {
        "start": "Runde gestartet. Angreifer, platziert die Bombe!",
        "planted_a": "Bombe platziert auf Punkt A!",
        "planted_b": "Bombe platziert auf Punkt B!",
        "min1": "Noch eine Minute.",
        "s30": "Noch dreißig Sekunden!",
        "s10": "Noch zehn Sekunden!",
        "defused": "Bombe entschärft.",
        "def_win": "Verteidiger gewinnen!",
        "att_win": "Angreifer gewinnen!",
        "timeout": "Zeit abgelaufen.",
        "test": "Lautsprechertest. Punkt A. Punkt B.",
    },
    "en": {
        "start": "Round start. Attackers, plant the bomb!",
        "planted_a": "Bomb planted on site A!",
        "planted_b": "Bomb planted on site B!",
        "min1": "One minute remaining.",
        "s30": "Thirty seconds!",
        "s10": "Ten seconds!",
        "defused": "Bomb defused.",
        "def_win": "Defenders win!",
        "att_win": "Attackers win!",
        "timeout": "Time is up.",
        "test": "Speaker check. Site A. Site B.",
    },
}

# Trim silence, cut rumble, compress and normalise loudly so it carries over a field.
FILTER = (
    "silenceremove=start_periods=1:start_threshold=-45dB,"
    "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
    "highpass=f=110,"
    "acompressor=threshold=-22dB:ratio=4:attack=4:release=90:makeup=3,"
    "loudnorm=I=-12:TP=-1:LRA=6,"
    "apad=pad_dur=0.08"
)


def voice_path(name: str) -> Path:
    model = VOICE_DIR / name / f"{name}.onnx"
    if not model.exists():
        print(f"Downloading voice {name} ...")
        data = urllib.request.urlopen(RELEASE.format(name)).read()
        (VOICE_DIR / name).mkdir(parents=True, exist_ok=True)
        with tarfile.open(fileobj=io.BytesIO(data)) as tar:
            tar.extractall(VOICE_DIR / name)
    return model


def synth(voice: PiperVoice, text: str, syn: SynthesisConfig) -> bytes:
    """Text -> 16-bit mono WAV. Newer espeak splits "ç" into "c" + combining cedilla, which the
    older Thorsten model does not know, so the pair is merged back before synthesis."""
    audio = []
    for sentence in voice.phonemize(text):
        merged = []
        for ph in sentence:
            if ph == "\u0327" and merged and merged[-1] == "c":
                merged[-1] = "ç"
            else:
                merged.append(ph)
        audio.append(voice.phoneme_ids_to_audio(voice.phonemes_to_ids(merged), syn))
    pcm = np.clip(np.concatenate(audio), -1, 1)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(voice.config.sample_rate)
        wav.writeframes((pcm * 32767).astype(np.int16).tobytes())
    return buf.getvalue()


def main() -> None:
    syn = SynthesisConfig(length_scale=1.05, noise_scale=0.6, noise_w_scale=0.7)
    for lang, lines in LINES.items():
        voice = PiperVoice.load(str(voice_path(VOICES[lang])))
        out = OUT_DIR / lang
        out.mkdir(parents=True, exist_ok=True)
        for key, text in lines.items():
            subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-y", "-i", "pipe:0", "-af", FILTER,
                 "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "64k", str(out / f"{key}.mp3")],
                input=synth(voice, text, syn), check=True,
            )
            print(f"{lang}/{key}.mp3  {text}")


if __name__ == "__main__":
    main()
