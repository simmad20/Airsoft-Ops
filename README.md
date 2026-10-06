# 💣 Airsoft Bomb Timer

Ein Bomb-Timer fürs Airsoft-Feld als Web-App fürs Handy: Bombe auf Punkt A oder B planten, Countdown mit Piepen und Sprachansagen über die Bluetooth-Box, entschärfen per Gedrückthalten.

Die App läuft komplett im Browser. Der Server liefert nur die Dateien aus. Nach dem ersten Öffnen funktioniert sie dank Service Worker **auch ohne Netz** auf dem Spielfeld.

## Features

- **Setup:** Rundenzeit (0 = ohne Limit), Bomben-Timer, Plant- und Entschärfzeit, Halb-Entschärfen (Fortschritt bleibt ab 50 % erhalten), Sprache der Ansagen (EN/DE) und Piep-Lautstärke. Die Einstellungen werden auf dem Gerät gespeichert.
- **Planten:** Punkt A oder B gedrückt halten, mit Fortschrittsanzeige und Tönen.
- **Bombe aktiv:** großer Countdown, Piepen wird immer schneller, blinkende LED, Ansagen bei 30 s und 10 s.
- **Entschärfen:** Feld gedrückt halten. Loslassen setzt den Fortschritt zurück (bei Halb-Entschärfen auf 50 %).
- **Ende:** Explosion mit Sound und Vibration oder Sieger-Jingle, Sprachansage, wer gewonnen hat.
- **Fürs Feld gebaut:** Das Display bleibt während der Runde an (Wake Lock). Ein fast unhörbarer Ton hält die Bluetooth-Box wach. Dunkles Design, gut lesbar draußen.
- **Installierbar (PWA):** Über „Zum Home-Bildschirm hinzufügen“ startet die App im Vollbild wie eine normale App.

## Projektstruktur

```
.
├── public/                 # Die eigentliche Web-App (statische Dateien)
│   ├── index.html
│   ├── style.css
│   ├── app.js              # Spiellogik, Sound, Sprachausgabe
│   ├── sw.js               # Service Worker für Offline-Betrieb
│   ├── manifest.webmanifest
│   └── icon.svg, icon-192.png, icon-512.png
├── server.js               # Kleiner Node-Server ohne Abhängigkeiten
├── package.json
└── render.yaml             # Render-Blueprint für das Deployment
```

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) 18 oder neuer.

```bash
npm start
```

Dann im Browser `http://localhost:3000` öffnen. Einen anderen Port setzt man mit `PORT=8080 npm start`.

> **Hinweis:** Wake Lock, Service Worker und teilweise die Sprachausgabe funktionieren auf dem Handy nur über **HTTPS** (oder `localhost`). Zum Testen am Handy also die Render-URL verwenden, nicht die lokale IP.

## Auf Render veröffentlichen

### Variante A: Blueprint (am einfachsten)

1. Auf [render.com](https://render.com) einloggen und das GitHub-Konto verbinden.
2. **New → Blueprint** wählen und dieses Repository auswählen.
3. Render liest die `render.yaml` und legt den Service `airsoft-bomb-timer` an. Mit **Apply** bestätigen.
4. Nach ein bis zwei Minuten ist die App unter `https://airsoft-bomb-timer.onrender.com` (oder ähnlich) erreichbar.

### Variante B: Web Service manuell anlegen

1. **New → Web Service** und das Repository auswählen.
2. Einstellungen:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
3. **Create Web Service** klicken.

### Variante C: Static Site (kostenlos, ohne Einschlafen)

Da die App nur aus statischen Dateien besteht, geht es auch ohne Node-Server:

1. **New → Static Site** und das Repository auswählen.
2. **Build Command:** leer lassen. **Publish Directory:** `public`
3. **Create Static Site** klicken.

> **Free-Plan bei Web Services:** Ein kostenloser Web Service schläft nach ca. 15 Minuten ohne Aufrufe ein. Der erste Aufruf danach dauert dann bis zu einer Minute. Für die laufende Runde ist das egal, weil die App komplett im Browser läuft. Wer das Warten vermeiden will, nimmt Variante C.

Bei jedem Push auf den verbundenen Branch deployt Render automatisch neu.

## Am Spieltag

1. Bluetooth-Box mit dem Handy koppeln und die Lautstärke aufdrehen.
2. App öffnen (am besten vorher zum Home-Bildschirm hinzufügen) und **„Ton & Box testen“** drücken.
3. Einstellungen wählen und **„Runde starten“**.
4. Handy während der Runde nicht sperren und die App im Vordergrund lassen.

## Browser-Unterstützung

Getestet für aktuelle mobile Browser (Chrome auf Android, Safari auf iOS). Sprachausgabe nutzt die Stimmen des Geräts. Fehlt eine deutsche oder englische Stimme, laufen Piepen und Explosion trotzdem.
