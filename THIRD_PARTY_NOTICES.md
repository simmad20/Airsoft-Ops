# Third-party notices

Airsoft Ops' own code, texts and artwork are licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE)
(Copyright (c) 2026 DummyGamesStudios). The parts below are **not** covered by that license and keep their own terms.

| Part | Files | Author / source | License |
|---|---|---|---|
| German announcer voice "Thorsten" | `public/audio/de/*.mp3` | [Thorsten-Voice](https://github.com/thorstenMueller/Thorsten-Voice), rendered with [Piper](https://github.com/rhasspy/piper) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| English announcer voice "Ryan" | `public/audio/en/*.mp3` | Piper voice trained on the [RyanSpeech](https://www.kaggle.com/datasets/roholazandie/ryanspeech) dataset | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): attribution, **non-commercial only**, share alike. These files are therefore under CC BY-NC-SA 4.0. |
| Fonts Barlow, Chakra Petch, Share Tech Mono | `public/fonts/*.woff2` | see `public/fonts/OFL-*.txt` | [SIL Open Font License 1.1](https://openfontlicense.org) |
| QR Code Generator for JavaScript | `public/vendor/qrcode.js` | Kazuhiko Arase | MIT (notice in the file). "QR Code" is a registered trademark of DENSO WAVE INCORPORATED. |
| Clutch sound effect (website only) | `public/audio/sfx/clutch.mp3` | from VALORANT, Riot Games | Used under Riot Games' ["Legal Jibber Jabber"](https://www.riotgames.com/en/legal) policy for free fan projects. Riot Games does not endorse or sponsor this project. **Not part of the Android app.** |
| WebSocket library `ws` (server) | npm dependency | Einar Otto Stangvik and contributors | MIT |
| Capacitor (Android app, branch `android`) | npm dependencies | Ionic | MIT |

Piper itself (MIT) is only used offline by `tools/generate_voice.py` and is not shipped.
