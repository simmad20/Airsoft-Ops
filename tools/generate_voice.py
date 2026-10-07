"""Renders the announcer lines to MP3 with Piper (offline neural TTS).

Usage:
    pip install piper-tts      # plus ffmpeg on the PATH
    python3 tools/generate_voice.py

Voices are downloaded once into tools/.voices/ (git-ignored). Output goes to public/audio/<lang>/<key>.mp3 plus public/audio/lines.json.
"""
import io
import json
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

DE_NUM = ["eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht"]
EN_NUM = ["one", "two", "three", "four", "five", "six", "seven", "eight"]

# Lines for the other game modes.
LINES["de"].update({
    "go": "Runde gestartet!",
    "vip_start": "Runde gestartet. Eskorte, bringt den VIP ins Ziel!",
    "vip_hit": "Der VIP wurde getroffen!",
    "vip_down": "Der VIP wurde ausgeschaltet!",
    "vip_extracted": "Der VIP hat das Ziel erreicht!",
    "escort_win": "Die Eskorte gewinnt!",
    "hunter_win": "Die Jäger gewinnen!",
    "snd_start": "Runde gestartet. Angreifer, zerstört die Ziele!",
    "obj_down": "Ziel zerstört!",
    "att_elim": "Alle Angreifer wurden ausgeschaltet.",
    "side_swap": "Seitenwechsel!",
    "br_start": "Das Spiel beginnt. Viel Glück!",
    "zone_warn": "Achtung! Die Zone schrumpft in einer Minute.",
    "zone_now": "Die Zone schrumpft jetzt!",
    "draw": "Unentschieden.",
    "hos_start": "Runde gestartet. Befreit die Geisel!",
    "hos_freed": "Die Geisel ist frei! Bringt sie zum Evakuierungspunkt!",
    "hos_evac": "Die Geisel wurde evakuiert!",
    "res_elim": "Alle Retter wurden ausgeschaltet.",
    "rescuers_win": "Die Retter gewinnen!",
    "kidnappers_win": "Die Geiselnehmer gewinnen!",
    "inf_start": "Das Spiel beginnt. Die Infektion breitet sich aus!",
    "inf_turned": "Ein weiterer Spieler wurde infiziert!",
    "inf_last": "Nur noch ein Überlebender!",
    "inf_win": "Alle sind infiziert. Die Infizierten gewinnen!",
    "surv_win": "Die Überlebenden gewinnen!",
    "mu_roles": "Die Rollen wurden verteilt. Schaut euch eure Rolle geheim an.",
    "mu_start": "Das Spiel beginnt. Traut niemandem!",
    "mu_end": "Das Spiel ist vorbei!",
    **{f"team_out_{i + 1}": f"Team {n} ist ausgeschieden!" for i, n in enumerate(DE_NUM)},
    **{f"team_win_{i + 1}": f"Team {n} gewinnt!" for i, n in enumerate(DE_NUM)},
    **{f"drop_{i + 1}": f"Versorgungsabwurf bei Punkt {n}!" for i, n in enumerate(DE_NUM[:6])},
})
LINES["en"].update({
    "go": "Round start!",
    "vip_start": "Round start. Escort, get the VIP to the extraction point!",
    "vip_hit": "The VIP has been hit!",
    "vip_down": "The VIP is down!",
    "vip_extracted": "The VIP has reached the extraction point!",
    "escort_win": "The escort wins!",
    "hunter_win": "The hunters win!",
    "snd_start": "Round start. Attackers, destroy the objectives!",
    "obj_down": "Objective destroyed!",
    "att_elim": "All attackers have been eliminated.",
    "side_swap": "Switch sides!",
    "br_start": "The game begins. Good luck!",
    "zone_warn": "Warning! The zone shrinks in one minute.",
    "zone_now": "The zone is shrinking now!",
    "draw": "It's a draw.",
    "hos_start": "Round start. Rescue the hostage!",
    "hos_freed": "The hostage is free! Get them to the extraction point!",
    "hos_evac": "The hostage has been extracted!",
    "res_elim": "All rescuers have been eliminated.",
    "rescuers_win": "The rescuers win!",
    "kidnappers_win": "The kidnappers win!",
    "inf_start": "The game begins. The infection is spreading!",
    "inf_turned": "Another player has been infected!",
    "inf_last": "Only one survivor left!",
    "inf_win": "Everyone is infected. The infected win!",
    "surv_win": "The survivors win!",
    "mu_roles": "Roles have been assigned. Check your role in secret.",
    "mu_start": "The game begins. Trust no one!",
    "mu_end": "The game is over!",
    **{f"team_out_{i + 1}": f"Team {n} has been eliminated!" for i, n in enumerate(EN_NUM)},
    **{f"team_win_{i + 1}": f"Team {n} wins!" for i, n in enumerate(EN_NUM)},
    **{f"drop_{i + 1}": f"Supply drop at point {n}!" for i, n in enumerate(EN_NUM[:6])},
})

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
    # The app reads this for the phone-voice fallback, the service worker for offline caching.
    (OUT_DIR / "lines.json").write_text(json.dumps(LINES, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
