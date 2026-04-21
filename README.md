# Spatio Studio

**3D modeling studio for young creators, ages 6-14.**

Spatio Studio is a desktop application that lets kids build, paint, animate, and
export 3D models. It runs entirely offline — no accounts, no network calls,
no ads — making it safe for classroom and at-home use.

## Features

- **29 built-in shapes** across Basic, Fun, Geometric, and Advanced categories
- **Transform tools:** Select, Move, Rotate, Scale, Pan, with grid snapping
- **CSG operations:** Solid / Hole toggle, Group, Ungroup — cut tubes, rings, and letters
- **Paint mode** with a color picker (per-face coloring)
- **SVG import** — extrude any `.svg` drawing or logo into a 3D object
- **Precision modifiers:** live mirror, array, align/distribute, ruler, frame camera
- **Advanced modeling:** multi-level subdivision/smoothing, material presets, cross-section viewer with live area calc
- **Animation timeline** — record keyframes and play back position/rotation/scale changes
- **3D text** — four bundled fonts (Helvetiker, Optimer; regular + bold)
- **Stamp library** — save and reuse your own shapes
- **Learning mode:** 3 interactive lessons, coordinate challenges, and 25+ shape-quiz questions
- **Export:** STL, OBJ, GLTF for 3D printers and game engines, plus PNG screenshots
- **Save format v2** for projects — a single `.spatio` file

## Tech stack

- **Java 17** — Swing/AWT host application
- **JCEF** (Chromium Embedded Framework, via `me.friwi:jcefmaven`) — embedded browser
- **Three.js** (WebGL) — 3D rendering
- **Gson** — save/load bridge serialization
- **Maven** with the shade plugin for a single-file fat JAR

## Requirements

- Java 17 or newer (for both build and run)
- Any GPU with WebGL support
- Windows 10+, macOS 11+, or Linux (x86-64)
- 4 GB RAM minimum (8 GB recommended)

## Building

```bash
mvn clean package
```

Produces `target/spatio-studio-1.0.0-SNAPSHOT.jar` (~17 MB fat JAR).

## Running

```bash
java -jar target/spatio-studio-1.0.0-SNAPSHOT.jar
```

On first launch the app downloads ~120 MB of JCEF native libraries into
`~/.spatio-studio/jcef/`. This is a one-time step; subsequent launches are
immediate.

## Project layout

```
pom.xml                                       Maven build
src/main/java/com/heronixedu/spatio/
  Launcher.java                               main() entry point
  SpatioApplication.java                      Swing + JCEF host
  bridge/JavaBridge.java                      JS <-> Java file-IO bridge
src/main/resources/spatio/
  index.html                                  Spatio Studio UI
  css/                                        Stylesheets
  js/                                         ~30 feature modules (shapes, CSG,
                                              paint, SVG import, animation,
                                              tutorials, challenges, etc.)
  fonts/                                      Helvetiker + Optimer typefaces
  images/                                     App icons and logos
src/main/resources/images/                    Shared Heronix branding assets
```

## Security posture

- JCEF is launched with DevTools disabled (`remote_debugging_port = 0`)
- External navigation is blocked (`CefRequestHandler.onBeforeBrowse` only
  permits `file://` URLs from the extracted temp dir)
- Popups are blocked (`CefLifeSpanHandler.onBeforePopup` returns `true`)
- Background networking, extensions, sync, translate, and the media router
  are all disabled at JCEF start

See `src/main/java/com/heronixedu/spatio/SpatioApplication.java` for the full
hardened startup sequence.

## License

Part of the Heronix Education Platform. © Heronix Educational Software.
