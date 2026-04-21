# Security Posture and Update Policy

This document explains the security posture of Spatio Studio and the
policy for keeping its bundled Chromium runtime patched. Read this
before deploying to many machines or before handing out `.spatio`,
`.svg`, `.obj`, or `.stl` files that came from untrusted sources.

---

## Offline by construction

Spatio cannot connect to the internet, even if a future dependency or
a malicious input file tried to. Three independent layers enforce this
at runtime. Details in `README.md`. The short version:

- Chromium's DNS resolver is set to return `NOTFOUND` for every host.
- Chromium's proxy is pointed at a closed loopback port.
- Every non-local subresource load is cancelled at the JCEF handler
  level — only `file:`, `about:`, and `chrome-devtools:` URLs pass.
  `data:` and `blob:` are intentionally excluded (see the `isLocalUrl`
  comment in `SpatioApplication.java` for the reasoning).

No telemetry. No crash reports. No auto-updater. No "anonymous"
anything.

---

## Chromium sandbox

The Chromium renderer runs inside the OS-level process sandbox. If a
renderer-side vulnerability is exploited (e.g., a malicious SVG that
triggers a known WebKit/Skia parse bug, or a crafted font), the
attacker gets a restricted child process, not JVM-host-level access.

The `--no-sandbox` flag is **not** set. If you see a sandbox-init
failure in the Java stderr log after a jcefmaven upgrade, file an
upstream issue and keep investigating — do not silently re-add the
flag. It would contradict the overall posture.

---

## Pinned Chromium version and update cadence

Spatio bundles a specific Chromium build, determined by the jcefmaven
version we depend on. The current pinning:

| Component | Version | As of |
|---|---|---|
| `me.friwi:jcefmaven` | 135.0.20 | May 2025 upstream release |
| Chromium (inside JCEF) | 135.0.7049.85 | - |

Chromium ships renderer-side CVE patches approximately monthly. We are
downstream of jcefmaven, which itself is downstream of the upstream
JCEF project, which follows Chromium's release cadence. **We cannot
patch Chromium directly without a jcefmaven release.**

### Policy

- **Every quarter** (January, April, July, October), a maintainer
  checks for a newer jcefmaven release on Maven Central:
  https://central.sonatype.com/artifact/me.friwi/jcefmaven/versions
- If one exists, bump `jcef.version` and `jcef.natives.version` in
  `pom.xml`, rebuild, smoke-test, and ship a patch release.
- If the latest jcefmaven release is more than **six months** behind
  upstream Chromium stable at the time of the check, open an issue
  upstream at https://github.com/jcefmaven/jcefmaven/issues and
  evaluate whether to hold the quarterly ship or call the pinning
  acceptable given our offline posture and the input-validation
  measures listed below.

### What we mitigate when the Chromium version lags

For a machine that is fully offline and running Spatio, the realistic
attack vector is a **malicious file opened by a user**:

- `.spatio` project files — parsed as JSON by `Gson` (not Chromium).
  Hard-capped at **500 objects per project** (rejected with a clear
  error above the cap), and each object's `position`/`rotation`/`scale`
  triplet is validated as finite numeric before use. Malformed entries
  are skipped with a user-visible count. Low renderer attack surface.
- `.svg` files — parsed by Three.js's `SVGLoader`. The SVG content is
  first run through a set of sanitization regexes in
  `spatio-svgimport.js` (strips `<script>`, `<foreignObject>`, `on*`
  handlers, neutralizes `javascript:` / `data:` URIs in `href`).
  Remaining surface: SVG path parsing itself.
- `.obj` and `.stl` — these are **export only**. Spatio does not
  currently import them. No renderer attack surface from these.
- Embedded fonts (`font-helvetiker*.js`, `font-optimer*.js`) — these
  ship with the app and are not user-supplied.

If a quarter goes by without a jcefmaven update and a Chromium CVE
lands with a publicly released exploit that reaches any of the
above parsers, add a note to this file and to the release notes of
the next build. Do not ship the app with known-exploitable input
handlers without mitigation.

---

## Reporting a vulnerability

If you find a security issue in Spatio or in the Heronix Education
Platform, contact Heronix Educational Software through the channel
your district uses, or open a private issue / email the repository
maintainer. Do **not** file publicly before we have had a chance to
respond. We aim to respond within one business week.

Please include:

- Version of the app (see `pom.xml` `<version>`).
- Operating system and Java version.
- A reproducer — a file, a minimal set of steps, or a video.
- Your assessment of severity.

## What is out of scope

- Local-only attacks that assume the attacker already has a shell on
  the user's machine. A teacher with admin rights can already read any
  file the student wrote.
- The contents of the Chromium runtime itself (report upstream to
  jcefmaven or the CEF / Chromium project).
- Social-engineering attacks where the student is tricked into
  installing something else entirely.
