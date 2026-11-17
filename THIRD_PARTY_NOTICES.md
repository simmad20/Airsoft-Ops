# Third-party notices

Airsoft Ops' own code, texts and artwork are licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE)
(Copyright (c) 2026 DummyGamesStudios). The parts below are **not** covered by that license and keep their own terms.

| Part | Files | Author / source | License |
|---|---|---|---|
| German announcer voice "Thorsten" | `public/audio/de/*.mp3` | [Thorsten-Voice](https://github.com/thorstenMueller/Thorsten-Voice), rendered with [Piper](https://github.com/rhasspy/piper) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| German announcer voice "Ramona" | `public/audio/de-ramona/*.mp3` | Piper voice trained on the [M-AILABS Speech Dataset](https://github.com/i-celeste-aurora/m-ailabs-dataset): Copyright (c) 2017-2019 by the original creators @ M-AILABS, Copyright (c) 2020 I. Celeste Aurora Solak. Recordings from [LibriVox](https://librivox.org/) (public domain) | M-AILABS licence (BSD-style): use in any form, **including commercial use**, allowed; keep the copyright notice; the names of the copyright holders may not be used to endorse or promote this app |
| English announcer voices "Fenrir" and "Michael" | `public/audio/en/*.mp3` (Fenrir), `public/audio/en-michael/*.mp3` (Michael) | [Kokoro-82M](https://github.com/hexgrad/kokoro) by hexgrad, voices `am_fenrir` and `am_michael` | [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) |
| Fonts Barlow, Chakra Petch, Share Tech Mono | `public/fonts/*.woff2` | see `public/fonts/OFL-*.txt` | [SIL Open Font License 1.1](https://openfontlicense.org) |
| QR Code Generator for JavaScript | `public/vendor/qrcode.js` | Kazuhiko Arase | MIT (notice in the file). "QR Code" is a registered trademark of DENSO WAVE INCORPORATED. |
| Clutch sound effect (website only) | `public/audio/sfx/clutch.mp3` | from VALORANT, Riot Games | Used under Riot Games' ["Legal Jibber Jabber"](https://www.riotgames.com/en/legal) policy for free fan projects. Riot Games does not endorse or sponsor this project. **Not part of the Android app.** |
| WebSocket library `ws` (server) | npm dependency | Einar Otto Stangvik and contributors | MIT |
| Capacitor (Android app, branch `android`) | npm dependencies | Ionic | MIT |

Piper and Kokoro are only used offline by `tools/generate_voice.py` and are not shipped.
