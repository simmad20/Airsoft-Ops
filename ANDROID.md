# Airsoft Ops als Android-App (Google Play)

Dieser Branch (`android`) enthält die fertige Android-App. Sie ist mit **Capacitor** gebaut: Die Web-App aus `public/` steckt komplett in der App. Sie startet deshalb sofort und funktioniert offline. Nur Sessions mit mehreren Handys verbinden sich mit dem Server `airsoft-ops.onrender.com`.

| | |
|---|---|
| Paketname (application ID) | `com.dummygames.airsoftops` – **nie mehr änderbar**, sobald die App bei Google ist |
| Entwickler | DummyGamesStudios · dummygamesstudios@gmail.com |
| Mindest-Android | 7.0 (API 24) |
| Ziel-Android | 16 (API 36), wie Google Play es verlangt |
| Berechtigungen | Internet (Sessions), Vibration |

---

## Schritt 0: Datenschutzseite einschalten (einmalig, 1 Minute)

Google Play braucht eine Datenschutz-URL, die **immer** erreichbar ist. Der kostenlose Render-Server schläft nach 15 Minuten ein und braucht dann bis zu einer Minute zum Aufwachen. Die Datenschutzseite liegt deshalb zusätzlich auf **GitHub Pages**, das nie einschläft.

1. GitHub → Repo **Airsoft-Ops** → **Settings → Pages**
2. Unter *Build and deployment* bei **Source** „**GitHub Actions**“ wählen.
3. **Actions → „Privacy page“ → Run workflow** (Branch `main`).

Danach ist die Seite dauerhaft unter **<https://simmad20.github.io/Airsoft-Ops/datenschutz.html>** erreichbar. Jede Änderung an `public/datenschutz.html` auf `main` wird automatisch neu veröffentlicht.

---

## Weg A: Die .aab automatisch von GitHub bauen lassen (empfohlen)

GitHub baut die App bei jedem Push auf diesen Branch auf eigenen Servern. Du brauchst dafür kein Android Studio.

### 1. Upload-Schlüssel als Secrets hinterlegen (einmalig, ca. 3 Minuten)

Du hast von Claude drei Dateien bekommen:
- `airsoft-ops-upload.jks`: der Schlüssel
- `ANDROID_KEYSTORE_BASE64.txt`: derselbe Schlüssel als Text
- `upload-key-zugangsdaten.txt`: Alias und Passwort

**Alle drei sicher aufheben** (z. B. im Passwort-Manager). Mit dem Schlüssel unterschreibst du jede neue Version. Geht er verloren, kann Google ihn zwar zurücksetzen, das dauert aber ein paar Tage.

Dann auf GitHub: **Repo → Settings → Secrets and variables → Actions → New repository secret**. Lege diese vier Secrets an:

| Name | Wert |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | kompletter Inhalt von `ANDROID_KEYSTORE_BASE64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | Passwort aus `upload-key-zugangsdaten.txt` |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | dasselbe Passwort |

### 2. Build starten

**Repo → Actions → „Android app“ → Run workflow → Branch `android` → Run workflow.**

Nach ca. 5 Minuten findest du im Lauf unten unter **Artifacts**:
- `airsoft-ops-release-aab-…`: die **.aab für Google Play**
- `airsoft-ops-debug-apk-…`: eine .apk zum direkten Ausprobieren auf dem Handy

Beides kommt als ZIP, einmal entpacken.

Jeder spätere Push auf `android` baut automatisch neu. Die Versionsnummer (`versionCode`) zählt dabei von selbst hoch, wie Google es für jede neue Version verlangt.

---

## Weg B: Lokal mit Android Studio bauen

Nur nötig, wenn du ohne GitHub bauen willst. Voraussetzung: [Node.js 22](https://nodejs.org) und [Android Studio](https://developer.android.com/studio).

```bash
git clone https://github.com/simmad20/Airsoft-Ops.git
cd Airsoft-Ops
git checkout android
npm ci
npm run android:sync      # kopiert public/ in die App
npm run android:open      # öffnet das Projekt in Android Studio
```

In Android Studio: **Build → Generate Signed App Bundle or APK → Android App Bundle**. Dort die Datei `airsoft-ops-upload.jks`, Alias `upload` und das Passwort angeben, dann *release* wählen. Die .aab liegt danach unter `android/app/release/`.

Ohne Android Studio, nur mit Kommandozeile: Lege `android/keystore.properties` an (die Datei wird nie committet):

```properties
storeFile=../airsoft-ops-upload.jks
storePassword=DEIN_PASSWORT
keyAlias=upload
keyPassword=DEIN_PASSWORT
```

Dann `cd android && ./gradlew bundleRelease -PversionCode=2 -PversionName=1.0.1`. Die `versionCode` muss bei jedem Upload höher sein als die letzte.

Mit Claude Code auf deinem Computer geht das auch: „Bau mir die signierte .aab aus dem android-Branch, Schlüssel liegt unter …“.

---

## Google Play Console: App anlegen und veröffentlichen

### 1. App erstellen
**Play Console → App erstellen**
- App-Name: `Airsoft Ops`
- Standardsprache: Deutsch (Deutschland)
- App oder Spiel: **App**
- Kostenlos oder kostenpflichtig: **Kostenlos** (das ist später nicht mehr änderbar)
- Erklärungen bestätigen.

### 2. App-Signatur
Beim ersten Hochladen fragt Google nach der **App-Signatur durch Google Play**. Einfach **bestätigen**. Google verwaltet dann den eigentlichen App-Schlüssel, dein Upload-Schlüssel dient nur zum Hochladen.

### 3. Store-Eintrag
Alle Texte und Bilder liegen in [`play-store/`](play-store/listing.md):
- Name, Kurz- und Vollbeschreibung (Deutsch und Englisch)
- App-Symbol `icon-512.png`, Vorstellungsgrafik `feature-graphic-1024x500.png`
- je 6 Smartphone-Screenshots in `play-store/screenshots/de` und `/en`

Für Englisch: **Store-Eintrag → Übersetzungen verwalten → Englisch (USA)** hinzufügen.

### 4. App-Inhalte (Menü „Richtlinien → App-Inhalte“)

| Punkt | Antwort |
|---|---|
| **Datenschutzerklärung** | `https://simmad20.github.io/Airsoft-Ops/datenschutz.html` |
| **App-Zugriff** | Alle Funktionen ohne Einschränkungen verfügbar (kein Login) |
| **Werbung** | Nein, die App enthält keine Werbung |
| **Einstufung des Inhalts** | Fragebogen ausfüllen, siehe unten |
| **Zielgruppe** | Altersgruppen **16–17** und **18+** wählen. Damit gilt die App nicht als Kinder-App. |
| **Nachrichten-App** | Nein |
| **Gesundheits-, Finanz-, Behörden-App** | Nein |
| **Datensicherheit** | siehe unten |

**Einstufung des Inhalts (IARC-Fragebogen):**
- Kategorie: **„Alle anderen App-Typen“** (Dienstprogramm/Tools, kein Spiel. Die App ist ein Timer für echte Spiele draußen).
- Gewalt, Sex, Drogen, Glücksspiel, Schimpfwörter: **Nein**.
- „Können Nutzer miteinander interagieren oder Inhalte austauschen?“ **Ja**: In einer Session sehen Mitspieler die eingegebenen Namen.
- Teilt Standort: **Nein**. Digitale Käufe: **Nein**.

**Datensicherheit:**
- „Erhebt oder teilt deine App Nutzerdaten?“ **Ja**
- „Werden alle Nutzerdaten bei der Übertragung verschlüsselt?“ **Ja**
- Erhobener Datentyp: **Personenbezogene Daten → Name**
  - Erhoben: **Ja**. Geteilt: **Nein**.
  - Sitzungsspezifisch verarbeitet: **Ja** (der Name, den man beim Beitreten zu einer Session eingibt, liegt nur im Arbeitsspeicher und verschwindet mit der Session).
  - Erforderlich oder optional: **Optional** (nur für Sessions).
  - Zweck: **App-Funktionen**.
- Keine weiteren Datentypen. Standort, Kontakte, Fotos, Geräte-IDs, Analysedaten: nichts davon.

### 5. Testen (Pflicht für neue private Entwicklerkonten)
Neue **private** Konten müssen vor der Veröffentlichung einen **geschlossenen Test** machen: **mindestens 12 Tester über 14 Tage hinweg**. Prüf in der Play Console unter *Dashboard*, ob das für dein Konto gilt.

1. **Testen → Geschlossener Test → Track erstellen** (z. B. „Airsoft-Gruppe“).
2. Tester: E-Mail-Liste anlegen, die Google-Konten deiner Airsoft-Gruppe eintragen (mindestens 12).
3. **Neuen Release erstellen → .aab hochladen**. Versionshinweis z. B. „Erste Testversion“.
4. Den Opt-in-Link aus der Console in die WhatsApp-Gruppe schicken. Wichtig: Die Tester müssen beitreten und die App installieren.
5. Nach 14 Tagen: **Produktionszugang beantragen** (Dashboard). Google fragt ein paar Sätze zum Test ab.

### 6. Produktion
**Produktion → Neuen Release erstellen → dieselbe oder eine neuere .aab → Länder auswählen** (z. B. Österreich, Deutschland, Schweiz oder weltweit) → **Zur Überprüfung senden**. Die erste Prüfung dauert meist ein paar Tage.

---

## Updates

1. Änderungen an der Web-App wie gewohnt in `public/` machen (auf `main`).
2. `main` in den `android`-Branch mergen und pushen. GitHub baut automatisch eine neue .aab.
3. Optional die Versionsnummer in `package.json` erhöhen (`"version": "1.0.1"`). Das ist die Nummer, die Nutzer sehen.
4. In der Play Console einen neuen Release mit der neuen .aab anlegen.

---

## Was sich in der App von der Webseite unterscheidet

- **Kein VALORANT-Clutch-Sound:** Der Sound gehört Riot Games und darf nur in kostenlosen Fan-Projekten im Web genutzt werden. Google prüft fremde Spiele-Inhalte in Store-Apps streng. In der App erscheint der CLUTCH!-Stempel weiter, dazu spielt die normale Sieger-Melodie. Ausgeschlossen wird er in `scripts/build-www.mjs`.
- **Kein Vollbild-Knopf:** Die App läuft ohnehin ohne Browserleiste.
- **Bildschirm bleibt an:** in der ganzen App, nicht nur während der Runde.
- **Zurück-Taste:** Während einer Runde kommt der Hinweis „App offen lassen“. Auf der Startseite geht die App in den Hintergrund statt sich zu beenden, damit eine laufende Session nicht abbricht.
- **Einladungslinks und QR-Codes** zeigen auf `airsoft-ops.onrender.com`. Mitspieler ohne App können also im Browser beitreten.
- **Teilen** öffnet das Android-Teilen-Menü (WhatsApp usw.).

## Wichtig für später

- **Stimmen:** Alle vier Ansager-Stimmen dürfen auch in einer kostenpflichtigen Version (Pro-Version, In-App-Kauf) genutzt werden:
  - **Thorsten** (Deutsch, Standard): CC0.
  - **Ramona** (Deutsch): M-AILABS-Lizenz, erlaubt ausdrücklich jede Nutzung einschließlich kommerzieller. Bedingungen: Copyright-Hinweis behalten (steht in `THIRD_PARTY_NOTICES.md` und im Impressum der App) und nicht mit dem Namen M-AILABS werben.
  - **Fenrir** (Englisch, Standard) und **Michael** (Englisch): Kokoro-82M, Apache 2.0.
- **Render-Server (kostenlos)** schläft nach 15 Minuten ohne Besucher ein. Die erste Session danach braucht bis zu einer Minute, bis sie verbunden ist. Spielen ohne Session ist davon nicht betroffen.
- **Paketname** `com.dummygames.airsoftops` bleibt für immer, sobald die erste .aab bei Google hochgeladen ist.

## Projektstruktur (Android-Teil)

```
capacitor.config.json        App-ID, Name, Einstellungen der App
scripts/build-www.mjs        kopiert public/ nach www/ (ohne Web-only-Dateien)
android/                     natives Android-Projekt (Gradle)
  app/build.gradle           Version und Signierung (Upload-Schlüssel aus Secrets oder keystore.properties)
  app/src/main/AndroidManifest.xml
  app/src/main/java/com/dummygames/airsoftops/MainActivity.java   Bildschirm an, Zurück-Taste
  app/src/main/res/          Icons, Startbild, Farben
.github/workflows/android.yml   automatischer Build auf GitHub
play-store/                  Texte, Icon, Grafik und Screenshots für den Store-Eintrag
public/datenschutz.html      Datenschutzerklärung (auf GitHub Pages veröffentlicht, URL für Google Play)
LICENSE, THIRD_PARTY_NOTICES.md   Lizenz des Projekts und der fremden Bestandteile
```
