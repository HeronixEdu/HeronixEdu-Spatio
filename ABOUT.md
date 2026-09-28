# About Spatio Studio

## What it is

Spatio Studio is a free 3D modeling studio for young creators, ages 6 to 14.
It is a desktop application that lets kids build, paint, and export
3D models. It is designed to be used in classrooms, computer labs, homes,
and libraries.

## Mission

Put a capable, creative 3D tool in the hands of every K-12 student in the
country without asking anything in return. No accounts. No subscriptions.
No ads. No data collection. No network call, ever.

Kids deserve real tools that work the same way a professional tool works,
not a dumbed-down web demo that locks features behind a paywall after ten
minutes of use. Spatio is built to feel generous from the first click.

## Principles

- **Offline by construction.** The app cannot connect to the internet,
  even if it tried. Chromium runs with DNS and proxy blackholed, every
  non-local resource request is cancelled at the handler level, and the
  browser runtime ships bundled inside the application so nothing is
  downloaded at install or first launch.
- **Zero telemetry.** No analytics. No crash reporting. No usage pings.
  No "anonymous" anything. Student work stays on the student's machine.
- **No accounts.** There is nothing to sign up for. The app opens and
  works. Student projects are plain files on disk.
- **Safe for classroom and home.** No ads, no external links, no outbound
  network, no in-app purchases, no chat, no social features, no user
  accounts, no age verification, no data handling at all because there
  is no data to handle.
- **One file, one click.** A single installer or fat JAR. No external
  runtime, no auxiliary downloads, no post-install configuration.

## Why it is free

Spatio is the free gift that Heronix Education Systems LLC gives to every
district it talks to. We build paid products for administrators — this
is the one we give to the kids.

## Technology

- **Java 17** Swing/AWT host application.
- **JCEF (Chromium Embedded Framework)** renders the UI, with the Chromium
  native runtime pre-bundled as a classpath resource so no first-launch
  download is ever needed.
- **Three.js** drives the WebGL scene, transforms, lighting, and exports.
- **Gson** handles the `.spatio` project file format.
- **Maven** builds a single shaded fat JAR, with opt-in profiles per
  target platform for offline native bundles.

The full source is in this repository. The only binary assets are fonts,
icons, and the JCEF native bundle (which is unmodified upstream Chromium
packaged by the jcefmaven project).

## Credits

- Built and maintained by **Heronix Education Systems LLC**.
- JCEF native bundles provided by the **jcefmaven** project
  (github.com/jcefmaven/jcefmaven), licensed under Apache 2.0.
- Three.js by its authors, licensed under MIT.
- Helvetiker and Optimer typeface JSONs ship with Three.js.

## License

Part of the Heronix Education Platform. © Heronix Education Systems LLC.
See `LICENSE` for full terms.

## Contact

Questions, pilot requests, bug reports, or curriculum feedback:
reach out through the Heronix contact channel for your district or
open an issue on this repository.
