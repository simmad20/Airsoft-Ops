# Airsoft Ops

Die Airsoft-Begleit-App fürs Handy: Spielmodus wählen, einstellen, losspielen. Mit männlichem Ansager, Countdown, Piepen und synchronen Bluetooth-Boxen auf mehreren Handys. Auf Deutsch und Englisch. Modi: **Bombe**, **VIP-Eskorte, Search & Destroy, Battle Royale, Geiselbefreiung, Infection** und **Murder Mystery** mit geheimen Rollen.

**▶ Live: [airsoft-ops.onrender.com](https://airsoft-ops.onrender.com)**

Im **Allein-Modus** läuft die App komplett im Browser und funktioniert nach dem ersten Öffnen dank Service Worker **auch ohne Netz**. Im **Session-Modus** verbinden sich mehrere Handys über mobiles Internet: ein Handy ist die Bombe, die anderen spielen als Lautsprecher die Töne synchron über ihre eigenen Bluetooth-Boxen ab.

## Bedienung

Die App hat unten eine Leiste mit drei Tabs:

- **Modi:** Die Spielmodi liegen als Tarotkarten (I–VII) in einem Kartenfächer vor einem drehenden Runen-Portal. Wischen, die Pfeile oder ein Tipp auf eine Karte wechseln den Modus, **„Wählen“** öffnet die **Lobby**: Das Bild fliegt aus der Karte an seinen Platz, darunter die Einstellungen des Modus, „So läuft es“ (aufklappbar) und der Start-Knopf. „Alle Modi“ bringt das Bild zurück in seine Karte.
- **Session:** Mehrere Handys verbinden. Entweder dieses Handy steuert („Session starten“, mit Code und QR-Code), oder man tritt einer Session bei (Code, Rolle, Name).
- **Einstellungen:** App-Sprache und Ansager-Sprache, Ansager (Stimme, Funkgerät-Effekt, Lautstärke), Sounds (Lautstärke, Vibration), Synchronisation (nur in einer Session), Anzeige (**Design: Classic / Modern**, Standard Classic, **Bilder: KI-Bilder / Eigene Grafik**, Vollbild), Zurücksetzen.

**Design Classic (Standard):** Die App startet im Look des ursprünglichen Bomb Timers: dunkelgraue, flache Flächen mit Bernstein-Akzent, ohne Bilder und Symbole. Bewegung gibt es nur dezent: Bildschirme gleiten kurz herein, der Tab-Strich und die Auswahl-Knöpfe gleiten mit, Fenster fahren weich hoch und Knöpfe reagieren beim Antippen. Der Tab „Modi“ zeigt „Runde einstellen“ mit den Modi als Kacheln (Name und eine kurze Zeile), darunter die Einstellungen des Modus und „Runde starten“. „Ton & Box testen“ liegt nur unter Einstellungen. Session und Einstellungen liegen wie bei Modern als Tabs unten; während einer Runde ist die Tab-Leiste ausgeblendet. Unter *Einstellungen → Anzeige → Design* lässt sich auf Modern (Tarot-Deck, Bilder, Animationen) umschalten. Die Einstellung gilt pro Handy.

Oben rechts schaltet **DE/EN** die Sprache der ganzen App um. Die Ansager-Sprache folgt der App-Sprache oder lässt sich unter *Einstellungen* getrennt festlegen. In einer Session kann jedes Handy seine eigene Sprache haben, Ergebnisse und Rollenkarten erscheinen auf jedem Handy in dessen Sprache.

Während eines Spiels ist die Leiste ausgeblendet, oben steht der Modus mit „Beenden“ (zweimal tippen). Zeiten stellt man über Kacheln mit großen Ziffern ein: Ein Tipp öffnet ein Fenster mit Schieberegler, Plus/Minus (gedrückt halten zählt schnell), Schnellwahl und „Übernehmen“. Alle Einstellungen bleiben auf dem Gerät gespeichert. Jeder Wechsel zwischen den Bildschirmen ist animiert, bei „Bewegung reduzieren“ im System nur noch ein Überblenden.

## Features

- **Männlicher Ansager:** Fertige Audiodateien auf Deutsch und Englisch, laut abgemischt, offline verfügbar. Optional Funkgerät-Effekt oder die Handy-Stimme.
- **Große Halte-Flächen:** Planten (A und B je eine halbe Bildschirmhälfte), Entschärfen, Ziele und Befreien sind große Flächen, die sich von unten füllen. Mehrere Finger zählen, und wer mit Handschuh kurz abrutscht (bis ca. eine halbe Sekunde), verliert den Fortschritt nicht.
- **Fürs Feld gebaut:** Das Display bleibt während der Runde an (Wake Lock). Ein fast unhörbarer Ton hält die Bluetooth-Box wach.
- **Vollbild:** Beim Spielstart blendet die App die Browserleiste aus (abschaltbar), oben rechts gibt es zusätzlich einen Vollbild-Knopf.
- **Schutz vor versehentlichem Verlassen:** Während einer Runde führt die Zurück-Geste nicht aus der App, beim Neuladen fragt der Browser nach.
- **Offline:** Nach dem ersten Öffnen funktioniert der Allein-Modus auch ohne Netz.
- **Zwei Bild-Stile:** Unter *Einstellungen → Anzeige → Bilder* wechselt man zwischen den KI-Bildern und eigenen, nachgebauten Vektor-Grafiken (Modi, Logo, Kartenrahmen und -rückseite). Jede Rolle bei Murder Mystery hat ein eigenes Neon-Symbol, die App kommt ganz ohne Emojis aus.
- **Zum Startbildschirm hinzufügbar (PWA):** Über das Browsermenü startet die App ohne Browserleiste wie eine normale App.

## Spielmodi

Den Modus wählt man im Tab **Modi**. Jeder Modus hat eine eigene Lobby mit Regeln und Einstellungen, eigene Ansagen und einen eigenen Spielbildschirm. Alle laufen allein auf einem Handy oder in einer Session mit Lautsprecher-Handys.

| Modus | Ablauf in der App | Wer gewinnt |
|---|---|---|
| **Bombe** | Planten an A/B, Countdown, Entschärfen (siehe oben) | Angreifer bei Explosion, Verteidiger bei Entschärfung oder Zeitablauf |
| **VIP-Eskorte** | Der VIP trägt das Handy. „VIP getroffen“ zieht ein Leben ab (einstellbar 1–5). „Ziel erreicht“ gedrückt halten. Bei 2–4 Zielpunkten lost die App eines aus, das nur die Eskorte über „Ziel anzeigen“ sieht. | Eskorte, wenn der VIP ankommt. Jäger bei VIP ausgeschaltet oder Zeitablauf |
| **Search & Destroy** | 2–5 Ziele (A–E), jedes per Gedrückthalten zerstören. Einstellbar, wie viele nötig sind. „Alle Angreifer ausgeschaltet“ (zweimal tippen). Punktestand über mehrere Runden mit automatischem Seitenwechsel. | Angreifer bei genug zerstörten Zielen. Verteidiger bei Zeitablauf oder ausgeschalteten Angreifern |
| **Battle Royale** | 2–8 Teams (farbig). Team zweimal antippen = ausgeschieden. Ansagen „Zone schrumpft in einer Minute“ / „jetzt“ im eingestellten Takt, Versorgungsabwürfe an zufälligen nummerierten Punkten. Rangliste am Ende. | Das letzte Team (bei Zeitablauf: Unentschieden) |
| **Geiselbefreiung** | Die Geisel trägt das Handy. „Befreien“ gedrückt halten, dann am Evakuierungspunkt „Evakuiert“. | Retter bei Evakuierung. Geiselnehmer bei Zeitablauf oder ausgeschalteten Rettern |
| **Infection** | Spielerzahl und Start-Infizierte einstellen. „Überlebender getroffen“ startet die Verwandlungszeit, danach Ansage und Zähler. Rücknahme möglich. | Infizierte, wenn alle infiziert sind. Überlebende bei Zeitablauf |
| **Murder Mystery** | Geheime Rollen, siehe unten | Entscheidet der Spielleiter |

Alle Ereignisse (Rundenstart, Treffer, Ziel zerstört, Zone, Abwurf, Ergebnis …) werden angesagt und oben als Banner eingeblendet.

### Murder Mystery

Das Handy, das das Spiel startet, ist der **Spielleiter**. Es sieht alle Rollen, der Spielleiter spielt also nicht mit.

- **Rollen:** In der Rollenliste steht bei jeder Rolle eine kurze Erklärung, Sonderrollen schaltet man per Schalter an. 1–3 Mörder (kennen sich) und beliebige Sonderrollen: Medic, Kopfgeldjäger (bekommt ein Ziel), Trittbrettfahrer (zieht seine Rolle: Unschuldiger, Medic oder Amok-Mörder), Zwillinge (kennen sich, genau zwei), Detektiv (prüft einmal eine Person: Gut, Böse oder Eigenes Ziel), Informant („einer dieser drei ist ein Mörder“), Bodyguard, Doppelagent (mit geheimem Ziel), Rächer, Joker, Wissenschaftler (untersucht einmal: „X ist Rolle A oder Rolle B“) und Spion. Alle übrigen werden Unschuldige.
- **Spieler mit Handy** treten der Session als **„Spieler“** bei. Ihre Rolle kommt nur auf ihr eigenes Handy, andere Handys bekommen sie nie zu sehen. Detektiv, Wissenschaftler und Trittbrettfahrer nutzen ihre Fähigkeit direkt auf der Rollenkarte.
- **Spielerliste:** Spieler ohne Handy fügt man einzeln per Name hinzu und löscht sie mit dem X. Verbundene Handys stehen automatisch mit in der Liste.
- **Handy weitergeben:** Spieler ohne Handy tippen ihren Namen an, drehen die Karte um, verdecken sie wieder und geben das Handy weiter. Jede Karte geht vor dem Spielstart nur einmal auf, danach ist sie gesperrt. Schaut jemand bei einer fremden Karte nach, findet der echte Besitzer seine Karte gesperrt vor, und der Schummler fliegt auf. Erst nach dem Start kann der Spielleiter über „Rollenkarten“ das erneute Ansehen freigeben.
- **Während des Spiels** markiert der Spielleiter ausgeschaltete Spieler, kann die Rollen einblenden und Spielern mit Handy eine geheime Nachricht schicken (z. B. für den Spion). Unter „Rollen erklärt“ sieht er kurz, was die Rollen in diesem Spiel können. Am Ende wählt er den Gewinner und alle Rollen werden aufgedeckt.

## Mehrere Handys (Session)

**So geht's:**

1. Auf dem Handy, das das Spiel steuert (bei „Bombe“ ist es die Bombe): Tab **Session** → **„Session starten“**. Es erscheinen ein 4-stelliger Code und ein QR-Code.
2. Mitspieler scannen den QR-Code (oder öffnen die Seite → Tab **Session** → Code eingeben) und wählen eine Rolle:
   - **Lautsprecher:** Spielt alle Töne und Ansagen über die Box, die mit diesem Handy gekoppelt ist. Beliebig viele, verteilt übers Feld.
   - **Spieler:** Bekommt bei Murder Mystery die geheime Rolle, sonst wie Zuschauer.
   - **Zuschauer:** Zeigt Rundenzeit, Bomben-Timer, Plant- und Entschärf-Fortschritt live, ohne Ton.
3. Das Bomben-Handy sieht, wer verbunden ist, und startet die Runde wie gewohnt. Geplantet und entschärft wird nur am Bomben-Handy.

**Wie die Synchronisation funktioniert:** Es wird kein Ton übertragen, sondern nur der Spielstand mit Zeitstempeln. Jedes Handy gleicht seine Uhr laufend mit dem Server ab (wie NTP) und spielt Piepen und Explosion selbst zur gemeinsamen Uhrzeit ab. Im Test lagen die Handys dabei wenige Millisekunden auseinander, auch bei verstellter Handy-Uhr. Ansagen wie „Bombe platziert“ kommen um die Netz-Verzögerung später (meist unter 0,3 s).

**Box-Verzögerung:** Bluetooth-Boxen haben selbst 100–300 ms Verzögerung, je nach Modell unterschiedlich. Unter *Einstellungen → Synchronisation* gibt es pro Handy die **Box-Verzögerung** und das **Abgleich-Piepen** (piept jede Sekunde auf allen Handys gleichzeitig). Auf zwei Handys einschalten und die Verzögerung der langsameren Box erhöhen, bis beide zusammen piepen.

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
│   ├── style.css           # Design Modern
│   ├── classic.css         # Design Classic (Look des ursprünglichen Bomb Timers)
│   ├── app.js              # Spielschleife, Bomben-Modus, Sessions, Sound, Sprachausgabe, Bildschirme
│   ├── ui.js               # Design-Bausteine: Bildschirmwechsel, Kartenfächer und Portal, Halte-Flächen, Effekte
│   ├── modes.js            # Weitere Spielmodi und Murder-Mystery-Rollen
│   ├── i18n.js             # Alle Texte auf Deutsch und Englisch
│   ├── art.js              # Nachgebaute Vektor-Grafiken: Modi, Logo, Rollen-Symbole, Kartenrahmen
│   ├── img/                # KI-Bilder: Spielmodi, Logo, Rollenkarte (Rahmen und Rückseite)
│   ├── audio/de, audio/en  # Ansagen als MP3, Liste in audio/lines.json
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

Die Texte stehen in `tools/generate_voice.py`. Das Skript schreibt außerdem `public/audio/lines.json`, aus der App (Handy-Stimme) und Offline-Cache die Liste lesen. Nach einer Änderung die MP3s neu erzeugen:

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
2. App öffnen (am besten vorher zum Home-Bildschirm hinzufügen) und unter *Einstellungen* **„Ton & Box testen“** drücken.
3. Einstellungen wählen und **„Runde starten“**.
4. Handy während der Runde nicht sperren und die App im Vordergrund lassen.

## Stimmen und Lizenzen

Die Ansagen wurden offline mit [Piper](https://github.com/rhasspy/piper) erzeugt:

- **Deutsch:** Stimme „Thorsten“ von [Thorsten-Voice](https://github.com/thorstenMueller/Thorsten-Voice), Lizenz CC0.
- **Englisch:** Stimme „Ryan“ auf Basis des [RyanSpeech](https://www.kaggle.com/datasets/roholazandie/ryanspeech)-Datensatzes, Lizenz [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Die englischen Ansagen dürfen daher nur **nicht-kommerziell** genutzt werden.

## Browser-Unterstützung

Getestet für aktuelle mobile Browser (Chrome auf Android, Safari auf iOS). Sprachausgabe nutzt die Stimmen des Geräts. Fehlt eine deutsche oder englische Stimme, laufen Piepen und Explosion trotzdem.
