# 💣 Airsoft Bomb Timer

Ein Bomb-Timer fürs Airsoft-Feld als Web-App fürs Handy: Bombe auf Punkt A oder B planten, Countdown mit Piepen und Sprachansagen über die Bluetooth-Box, entschärfen per Gedrückthalten.

**▶ Live: [airsoft-ops.onrender.com](https://airsoft-ops.onrender.com)**

Im **Allein-Modus** läuft die App komplett im Browser und funktioniert nach dem ersten Öffnen dank Service Worker **auch ohne Netz**. Im **Session-Modus** verbinden sich mehrere Handys über mobiles Internet: ein Handy ist die Bombe, die anderen spielen als Lautsprecher die Töne synchron über ihre eigenen Bluetooth-Boxen ab.

## Features

- **Setup:** Rundenzeit, Bomben-Timer, Plant- und Entschärfzeit als Kacheln mit großen Ziffern. Ein Tipp öffnet ein Einstell-Fenster mit Schieberegler, großen Plus/Minus-Knöpfen (gedrückt halten zählt schnell weiter) und Schnellwahl (z. B. 5 min · 10 min oder 45 s · 1:30). Dazu Halb-Entschärfen (Fortschritt bleibt ab 50 % erhalten). Alles wird auf dem Gerät gespeichert.
- **Erweiterte Einstellungen** (zugeklappt unter dem Start-Knopf):
  - *Ansagen:* Sprache DE/EN, Sprecher (männlicher Ansager oder Handy-Stimme), Funkgerät-Effekt, eigene Lautstärke, Probe hören.
  - *Was angesagt wird:* Rundenstart, Bombe platziert, Noch eine Minute, Bomben-Restzeit (30 s / 10 s), Ergebnis, jeweils einzeln abschaltbar.
  - *Sounds:* eigene Lautstärke, Bomben-Piepen, Halte-Töne, Signaltöne, Explosion, Sieger-Jingle und Vibration, jeweils einzeln abschaltbar.
  - *Anzeige:* Vollbild beim Rundenstart, alles auf Standard zurücksetzen.
- **Männlicher Ansager:** Die Ansagen sind fertige Audiodateien (Deutsch und Englisch), laut abgemischt und offline verfügbar. Sie klingen auf jedem Handy gleich.
- **Planten:** Punkt A oder B gedrückt halten, mit Fortschrittsanzeige und Tönen.
- **Bombe aktiv:** großer Countdown, Piepen wird immer schneller, blinkende LED, Ansagen bei 30 s und 10 s.
- **Entschärfen:** Feld gedrückt halten. Loslassen setzt den Fortschritt zurück (bei Halb-Entschärfen auf 50 %).
- **Ende:** Explosion mit Sound und Vibration oder Sieger-Jingle, Sprachansage, wer gewonnen hat.
- **Fürs Feld gebaut:** Das Display bleibt während der Runde an (Wake Lock). Ein fast unhörbarer Ton hält die Bluetooth-Box wach. Dunkles Design, gut lesbar draußen.
- **Vollbild:** Beim Rundenstart blendet die App die Browserleiste automatisch aus (abschaltbar). Zusätzlich gibt es oben rechts einen Vollbild-Knopf.
- **Schutz vor versehentlichem Verlassen:** Während einer Runde führt die Zurück-Taste bzw. die Zurück-Wischgeste nicht aus der App, sondern zeigt nur einen Hinweis. Beim Neuladen oder Schließen des Tabs fragt der Browser nach.
- **Display bleibt an:** Solange eine Runde läuft, sperrt sich das Handy nicht (Screen Wake Lock). Kann der Browser das nicht, zeigt die App einen Hinweis.
- **Zum Startbildschirm hinzufügbar (PWA):** Über das Browsermenü („Zum Startbildschirm hinzufügen“ bzw. Teilen → „Zum Home-Bildschirm“) startet die App ohne Browserleiste wie eine normale App.

## Mehrere Handys (Session)

**So geht's:**

1. Auf dem Handy, das die **Bombe** sein soll: **„Session starten“**. Es erscheinen ein 4-stelliger Code und ein QR-Code.
2. Mitspieler scannen den QR-Code (oder öffnen die Seite → **„Beitreten“** → Code eingeben) und wählen eine Rolle:
   - **Lautsprecher:** Spielt alle Töne und Ansagen über die Box, die mit diesem Handy gekoppelt ist. Beliebig viele, verteilt übers Feld.
   - **Zuschauer:** Zeigt Rundenzeit, Bomben-Timer, Plant- und Entschärf-Fortschritt live, ohne Ton.
3. Das Bomben-Handy sieht, wer verbunden ist, und startet die Runde wie gewohnt. Geplantet und entschärft wird nur am Bomben-Handy.

**Wie die Synchronisation funktioniert:** Es wird kein Ton übertragen, sondern nur der Spielstand mit Zeitstempeln. Jedes Handy gleicht seine Uhr laufend mit dem Server ab (wie NTP) und spielt Piepen und Explosion selbst zur gemeinsamen Uhrzeit ab. Im Test lagen die Handys dabei wenige Millisekunden auseinander, auch bei verstellter Handy-Uhr. Ansagen wie „Bombe platziert“ kommen um die Netz-Verzögerung später (meist unter 0,3 s).

**Box-Verzögerung:** Bluetooth-Boxen haben selbst 100–300 ms Verzögerung, je nach Modell unterschiedlich. Unter *Erweiterte Einstellungen → Synchronisation* gibt es pro Handy die **Box-Verzögerung** und das **Abgleich-Piepen** (piept jede Sekunde auf allen Handys gleichzeitig). Auf zwei Handys einschalten und die Verzögerung der langsameren Box erhöhen, bis beide zusammen piepen.

**Gut zu wissen:**
- Alle Handys brauchen mobiles Internet und müssen die App **im Vordergrund offen** lassen. Das Display bleibt dabei automatisch an.
- Bricht die Verbindung kurz ab, verbindet sich das Handy automatisch neu und holt sich den aktuellen Stand. Explosion und Zeitablauf ergeben sich aus der Uhr, sie passieren also auch dann pünktlich, wenn das Bomben-Handy gerade kein Netz hat.
- Auch nach einem Neuladen der Seite tritt jedes Handy automatisch wieder seiner Session bei. Das Bomben-Handy übernimmt dabei eine laufende Runde.
- Auf dem Bomben-Handy lässt sich unter *Synchronisation* der eigene Ton abschalten („Ton auf diesem Handy“), wenn nur die Lautsprecher Ton machen sollen.

## Projektstruktur

```
.
├── public/                 # Die eigentliche Web-App (statische Dateien)
│   ├── index.html
│   ├── style.css
│   ├── app.js              # Spiellogik, Sound, Sprachausgabe
│   ├── audio/de, audio/en  # Ansagen als MP3
│   ├── vendor/qrcode.js    # QR-Code-Generator (MIT, Kazuhiko Arase)
│   ├── sw.js               # Service Worker für Offline-Betrieb
│   ├── manifest.webmanifest
│   └── icon.svg, icon-192.png, icon-512.png
├── tools/generate_voice.py # Erzeugt die Ansagen neu (Piper TTS)
├── server.js               # Node-Server: liefert die App aus und verwaltet die Sessions (WebSocket)
├── package.json
└── render.yaml             # Render-Blueprint für das Deployment
```

## Ansagen ändern

Die Texte stehen in `tools/generate_voice.py` (und für die Handy-Stimme in `public/app.js` unter `LINES`). Nach einer Änderung die MP3s neu erzeugen:

```bash
pip install piper-tts      # außerdem wird ffmpeg benötigt
python3 tools/generate_voice.py
```

Die Stimmen werden beim ersten Lauf automatisch heruntergeladen.

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) 18 oder neuer.

```bash
npm install
npm start
```

Dann im Browser `http://localhost:3000` öffnen. Einen anderen Port setzt man mit `PORT=8080 npm start`.

> **Hinweis:** Wake Lock, Service Worker und teilweise die Sprachausgabe funktionieren auf dem Handy nur über **HTTPS** (oder `localhost`). Zum Testen am Handy also die Render-URL verwenden, nicht die lokale IP.

## Auf Render veröffentlichen

Für Sessions mit mehreren Handys braucht die App einen laufenden Server (WebSocket). Sie muss deshalb als **Web Service** laufen, eine Static Site reicht dafür nicht mehr.

### Von der Static Site auf Web Service umstellen (URL bleibt gleich)

1. Im Render-Dashboard die Static Site **Airsoft-Ops** öffnen → **Settings** → ganz unten **Delete Static Site**. Erst dadurch wird der Name `airsoft-ops` frei.
2. **New → Web Service** → Repository `simmad20/Airsoft-Ops` auswählen.
3. Einstellungen:
   - **Name:** `Airsoft-Ops` (ergibt wieder `https://airsoft-ops.onrender.com`)
   - **Branch:** `main`
   - **Runtime / Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
   - Unter **Advanced** optional **Health Check Path:** `/healthz`
4. **Create Web Service** klicken. Nach ein bis zwei Minuten steht im Log „Your service is live“.

Alternativ legt **New → Blueprint** den Service automatisch aus der `render.yaml` an (Name dann `airsoft-bomb-timer`).

> **Free-Plan:** Ein kostenloser Web Service schläft nach ca. 15 Minuten ohne Aufrufe ein, der erste Aufruf danach dauert bis zu einer Minute. Also **vor dem Spiel einmal die Seite öffnen**. Während einer Session halten die verbundenen Handys den Server wach. Wird der Server neu gestartet (z. B. durch ein Deploy), sind laufende Sessions weg und müssen neu gestartet werden. Ohne Einschlafen kostet der kleinste bezahlte Plan bei Render ca. 7 $ im Monat.

Bei jedem Push auf `main` deployt Render automatisch neu. Deshalb nicht während eines Spiels pushen.

## Vollbild auf Android und iPhone

| | Android (Chrome) | iPhone (Safari) |
|---|---|---|
| Im Browser | Vollbild per Knopf oder automatisch beim Rundenstart | Nicht möglich, Apple erlaubt Vollbild im Browser nur für Videos |
| Als App installiert | Vollbild ohne Status- und Browserleiste | Ohne Safari-Leiste, nur die Statusleiste bleibt |

Beim Wechsel ins Vollbild blendet Chrome kurz selbst einen Hinweis mit der Adresse ein („… zum Beenden nach unten wischen“). Das ist eine Sicherheitsfunktion des Browsers und lässt sich von der Webseite aus nicht abschalten. Wer ihn nicht sehen will, fügt die App zum Startbildschirm hinzu.

Für das iPhone also unbedingt **Teilen → „Zum Home-Bildschirm“** nutzen und die App über das neue Symbol starten.

Für maximalen Schutz vor versehentlichem Schließen kann man zusätzlich die Bildschirmfixierung des Handys nutzen: **Android:** „App-Pinning“ bzw. „Bildschirm anheften“ in den Sicherheitseinstellungen. **iPhone:** „Geführter Zugriff“ unter Bedienungshilfen. Damit lässt sich die App erst mit PIN bzw. Code verlassen.

## Am Spieltag

1. Bluetooth-Box mit dem Handy koppeln und die Lautstärke aufdrehen.
2. App öffnen (am besten vorher zum Home-Bildschirm hinzufügen) und **„Ton & Box testen“** drücken.
3. Einstellungen wählen und **„Runde starten“**.
4. Handy während der Runde nicht sperren und die App im Vordergrund lassen.

## Stimmen und Lizenzen

Die Ansagen wurden offline mit [Piper](https://github.com/rhasspy/piper) erzeugt:

- **Deutsch:** Stimme „Thorsten“ von [Thorsten-Voice](https://github.com/thorstenMueller/Thorsten-Voice), Lizenz CC0.
- **Englisch:** Stimme „Ryan“ auf Basis des [RyanSpeech](https://www.kaggle.com/datasets/roholazandie/ryanspeech)-Datensatzes, Lizenz [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Die englischen Ansagen dürfen daher nur **nicht-kommerziell** genutzt werden.

## Browser-Unterstützung

Getestet für aktuelle mobile Browser (Chrome auf Android, Safari auf iOS). Sprachausgabe nutzt die Stimmen des Geräts. Fehlt eine deutsche oder englische Stimme, laufen Piepen und Explosion trotzdem.
