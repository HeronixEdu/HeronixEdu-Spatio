# Installing Spatio Studio

Three audiences read this document: end users (teachers, parents, kids),
developers building from source, and district IT administrators deploying
to many machines at once. Skip to the section that applies to you.

---

## For end users

### System requirements

- Windows 10 or newer (64-bit). macOS 11+ support is available on an
  opt-in build; see the developer section.
- 4 GB RAM minimum, 8 GB recommended.
- Any GPU with WebGL support — integrated Intel graphics are enough.
- 500 MB free disk space (the install extracts about 300 MB of Chromium
  runtime the first time the app is launched).
- **No internet connection required.** No accounts required. No Java
  installation required if you use an installer build; a fat-JAR build
  needs a Java 17 runtime on the machine.

### Running the fat JAR

1. Make sure Java 17 or newer is installed. Verify with:

   ```
   java -version
   ```

2. Double-click `spatio-studio-1.0.0-SNAPSHOT.jar`, or from a terminal:

   ```
   java -jar spatio-studio-1.0.0-SNAPSHOT.jar
   ```

3. The first launch will extract the Chromium runtime to
   `%USERPROFILE%\.spatio-studio\jcef\` on Windows. This takes about
   30 seconds and only happens once. Subsequent launches open instantly.

### Where your files live

- **Projects:** default to `%USERPROFILE%\Documents\Spatio Projects\` on
  Windows. The app creates this folder on first launch. Every
  Save / Open / Import dialog defaults to it, so students can just click
  Save without fighting with file paths. You can still navigate
  elsewhere from the dialog (for example, to save to a USB stick); the
  app remembers the last folder you picked within a session.

  On a school machine with Windows Folder Redirection set up via Group
  Policy, the student's Documents folder is usually routed to their
  personal network home drive — which means `Spatio Projects` also lives
  there, and projects follow the student between lab machines.

- **App data:** `%USERPROFILE%\.spatio-studio\` (Windows) — this holds
  the Chromium runtime and nothing else. Safe to delete; the app will
  re-extract it on next launch.
- **Temporary extraction:** `%TEMP%\spatio-web-*` — cleaned up by the OS
  eventually; also safe to delete while the app is closed.

### Uninstalling

- Delete the `.jar` file.
- Delete `%USERPROFILE%\.spatio-studio\` to remove the bundled Chromium.
- Your saved `.spatio` projects are not touched. By default they live in
  `%USERPROFILE%\Documents\Spatio Projects\`; delete that folder too if
  you want to wipe student work.

---

## For developers

### Build environment

- JDK 17 or newer (tested on 17 and 21).
- Maven 3.8 or newer.
- About 300 MB free in your local Maven cache for the JCEF native bundle.

### Building

Clone the repo and from its root run:

```
mvn clean package
```

This produces `target/spatio-studio-1.0.0-SNAPSHOT.jar` — a roughly
157 MB fat JAR with the Windows x64 Chromium natives bundled in as a
classpath resource. This JAR is ready to ship and runs without a
network connection.

### Build profiles

| Profile | Active by default | Purpose |
|---|---|---|
| `offline-bundle-win` | yes | Bundles Windows x64 Chromium natives. |
| `offline-bundle-mac-amd64` | no | macOS Intel natives, opt-in. |
| `offline-bundle-mac-arm64` | no | macOS Apple Silicon natives, opt-in. |

Examples:

```
# Default: offline Windows build.
mvn clean package

# Thin dev build (17 MB, will refuse to start — used for quick
# compile-checks).
mvn clean package -P-offline-bundle-win

# macOS Apple Silicon offline build.
mvn clean package -P-offline-bundle-win,offline-bundle-mac-arm64
```

### Running from source

After a `mvn package`:

```
java -jar target/spatio-studio-1.0.0-SNAPSHOT.jar
```

If you built the thin profile by mistake, the app exits immediately with
a clear fatal message — it refuses to fall back to a network download.

### Project layout

```
pom.xml                                         Maven build
src/main/java/com/heronixedu/spatio/
  Launcher.java                                 main() entry point
  SpatioApplication.java                        JCEF host + hardening
  bridge/JavaBridge.java                        JS <-> Java file I/O
src/main/resources/spatio/
  index.html                                    main UI
  css/                                          stylesheets
  js/                                           ~30 feature modules
  fonts/                                        Helvetiker + Optimer JSONs
  images/                                       app icons and logos
```

### Dependency notes

- `me.friwi:jcefmaven` 135.0.20 — the JCEF wrapper. Pinned.
- `me.friwi:jcef-natives-windows-amd64` — the Chromium native bundle.
  The version is `jcef-ca49ada+cef-135.0.20+ge7de5c3+chromium-135.0.7049.85`
  and is tied to the jcefmaven release. Upgrade them together.
- `com.google.code.gson:gson` 2.11.0 — used by the save/load bridge.

---

## For district IT

### Deployment-friendly facts

- **The app makes zero network calls** at install, first launch, or in
  normal use. This is not policy — it is enforced by the code. DNS is
  blackholed at the Chromium process level, proxy is pointed at a closed
  loopback port, every non-local subresource request is cancelled at the
  handler level, and the Chromium runtime is bundled inside the
  application. There is no auto-updater, no telemetry, no crash
  reporting, no component update service.
- **No account or signup** is required. The app opens and works.
- **No writes outside** `%USERPROFILE%\.spatio-studio\` and whatever
  path the user explicitly chose when saving a project. No registry
  writes on the current fat-JAR build. No services installed.
- **No administrator rights** needed to run the fat JAR.

### Verifying offline behavior

On a test machine with the app installed:

1. Disconnect the machine from the network at the adapter or firewall
   level.
2. Delete `%USERPROFILE%\.spatio-studio\` to force a clean first launch.
3. Launch the app. Extraction takes about 30 seconds. The app opens.
4. Use it. Save a project. Load it back.
5. Run a packet capture (Wireshark) during all of the above on the host
   machine's adapter. No packets should leave the machine.

### Deployment scope

The fat JAR build is fine for labs and single-teacher distribution. A
proper silent-install MSI with a bundled JRE is on the roadmap but not
shipped yet. In the meantime, you can deploy by copying the JAR plus a
Java 17 runtime to a shared location and creating a shortcut on each
workstation. Document your process; every district does this slightly
differently.

### Firewall rules

None. If you want to enforce the offline guarantee at the network layer
as well, add an outbound firewall rule that blocks the Java process from
reaching anything other than loopback — but it is not necessary for
normal operation.

### Student data

There is no student data to consider. The app has no account system,
no cloud sync, no collaboration features, and no network activity.
Student projects live as `.spatio` files on local disk. By default they
go in `%USERPROFILE%\Documents\Spatio Projects\` — every Save dialog
starts there, so students don't have to know or care about file paths.

If you use Windows Folder Redirection to redirect `Documents` to a
network home drive (a common K-12 pattern for "students can't save
locally"), `Spatio Projects` rides along — work is persisted on the
network share and follows the student to any lab machine without any
configuration on Spatio's part. No special setup needed.

Back projects up the same way you back up any other student work in
Documents.
