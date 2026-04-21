# Spatio Studio

**Free, offline, no-telemetry 3D modeling for kids ages 6–14.**

Spatio Studio is a desktop application that lets students build, paint,
and export 3D models. It is designed for classrooms, homes,
and computer labs — and is **architecturally incapable of making a
network connection.** No accounts, no cloud, no analytics, no auto-
updater, no data collection of any kind.

Part of the Heronix Education Platform. © Heronix Educational Software.

---

## At a glance

- **29 built-in shapes** — basic solids, fun shapes, platonic solids,
  advanced geometry.
- **Transform tools:** Select, Move, Rotate, Scale, Pan, with grid
  snapping, multi-select, and live gizmos.
- **CSG:** Solid / Hole / Group / Ungroup — cut tubes, rings, letters,
  and custom holes from any shape.
- **Paint mode** with a color picker and per-face coloring.
- **SVG import** — extrude any `.svg` drawing or logo into a 3D object.
- **Precision modifiers:** live mirror, array, align / distribute,
  ruler, frame camera, cross-section with live area calc.
- **3D text** — four bundled fonts (Helvetiker, Optimer; regular + bold),
  plus quick A–Z and 0–9 letter generators.
- **Stamp library** — save and reuse your own shapes.
- **Learning mode:** three interactive tutorials, coordinate challenges,
  and 25+ shape-quiz questions.
- **Export:** STL, OBJ, and GLTF for 3D printers, game engines, and AR,
  plus PNG screenshots.
- **Save format v2** — a single `.spatio` JSON file per project.

---

## Offline by construction

This is the project's strongest claim and the reason it is safe for K-12
deployment. Spatio cannot connect to the internet, even if a future
dependency, malicious SVG, or stray JS tried to. Three independent
layers enforce this at runtime:

1. **Chromium's DNS resolver** is set to return `NOTFOUND` for every
   host.
2. **Chromium's proxy** is pointed at a closed loopback port that
   refuses connections.
3. **Every non-local resource load** (XHR, fetch, img, script,
   stylesheet, etc.) is cancelled at the JCEF request-handler level
   unless the URL scheme is `file:`, `about:`, or `chrome-devtools:`.
   `data:` and `blob:` are intentionally excluded — the app's only
   uses of them pass content over the Java bridge as strings, not as
   URL loads. See `SECURITY.md` for the full rationale.

On top of that:

- The Chromium runtime itself is **pre-bundled as a classpath resource**
  (via `me.friwi:jcef-natives-windows-amd64`), so no ~120 MB first-
  launch download ever happens. The app fails fast if the bundle is
  somehow missing, rather than falling back to the network.
- jcefmaven's mirror list is **emptied at startup** to remove the
  download path entirely.
- Chromium is started with every known telemetry / background-service
  flag disabled: component updater, breakpad, crash reporter, domain
  reliability, sync, translate, speech API, metrics reporting, hyperlink
  auditing, autofill server, and more.
- The JCEF browser is hardened: **DevTools disabled**, popups blocked,
  top-level navigation to non-local URLs blocked, auth credentials
  never supplied.
- Chromium's **OS-level process sandbox is on**. A renderer RCE (e.g.,
  from a malicious SVG or font parse bug) stays contained in a
  restricted child process instead of getting JVM-host-level access.

**Verify it yourself:** install the app, cut the machine off the
network, delete `%USERPROFILE%\.spatio-studio\`, launch. The app extracts
Chromium from its own JAR, starts, and runs. A Wireshark capture on the
host will show zero packets leaving the machine.

---

## Quick start

### Run the app

1. Install Java 17 or newer. Check: `java -version`.
2. Download `spatio-studio-1.0.0-SNAPSHOT.jar`.
3. Double-click, or run:

   ```
   java -jar spatio-studio-1.0.0-SNAPSHOT.jar
   ```

First launch takes about 30 seconds (one-time extraction of the bundled
Chromium runtime). Every launch after is instant.

### Build from source

```
mvn clean package
```

Produces `target/spatio-studio-1.0.0-SNAPSHOT.jar` — a roughly 157 MB
fat JAR with the Windows x64 Chromium natives bundled in. Ready to
ship.

For other platforms and thin dev builds, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

---

## Documentation

- **[ABOUT.md](ABOUT.md)** — project mission, philosophy, credits,
  license.
- **[SECURITY.md](SECURITY.md)** — security posture, Chromium pinning,
  quarterly update policy, vulnerability reporting.
- **[docs/INSTALLATION.md](docs/INSTALLATION.md)** — install, build,
  and deploy. Has sections for end users, developers, and district IT.
- **[docs/USER-MANUAL.md](docs/USER-MANUAL.md)** — every feature
  walked through, plus teacher tips and troubleshooting.

---

## Requirements

- Java 17 or newer (build and run).
- Any GPU with WebGL support — integrated Intel graphics are enough.
- Windows 10+ (primary). macOS 11+ via an opt-in build profile.
- 4 GB RAM minimum, 8 GB recommended.
- 500 MB free disk space (the one-time Chromium extraction takes ~300 MB).

---

## Tech stack

- **Java 17** Swing/AWT host application.
- **JCEF** (Chromium Embedded Framework, via `me.friwi:jcefmaven`
  135.0.20) — embedded browser with the native runtime bundled.
- **Three.js** (WebGL) — 3D rendering, transforms, exports.
- **Gson** — save/load bridge serialization.
- **Maven** with the shade plugin for a single-file fat JAR, plus
  profiles per target platform.

---

## Project layout

```
pom.xml                                   Maven build + native-bundle profiles
ABOUT.md                                  Project mission and credits
docs/
  INSTALLATION.md                         Install, build, deploy
  USER-MANUAL.md                          Feature walk-through
src/main/java/com/heronixedu/spatio/
  Launcher.java                           main() entry point
  SpatioApplication.java                  Swing + JCEF host, hardening
  bridge/JavaBridge.java                  JS <-> Java file I/O bridge
src/main/resources/spatio/
  index.html                              UI
  css/                                    stylesheets
  js/                                     ~30 feature modules
  fonts/                                  Helvetiker + Optimer typefaces
  images/                                 app icons and logos
```

---

## License

Part of the Heronix Education Platform. © Heronix Educational Software.
See `ABOUT.md` for full credits.
