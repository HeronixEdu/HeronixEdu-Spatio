# Spatio Studio — User Manual

A guide to every tool in the app, written so a classroom teacher can hand
the relevant section to a student and expect them to get unstuck. Topics
are ordered roughly from easiest to most advanced.

---

## 1. Getting started

When you open Spatio, you see:

- A big **3D viewport** in the middle — this is where your scene lives.
- A **top toolbar** with two rows of tools.
- A **left panel** with shape categories and color swatches.
- A **right panel** with properties, measurements, and the learning tab.
- A small **axis widget** in one corner showing which way is X, Y, Z.
- A **view cube** for snapping to standard camera angles.

The scene starts empty. Add something — click a shape on the left panel.

### Moving the camera around

- **Left-drag** on empty space: orbit around the scene.
- **Right-drag** on empty space: pan (slide the view).
- **Scroll wheel**: zoom in and out.
- Click a face of the **view cube** to snap to front, back, left, right,
  top, or bottom.

The axis widget always shows which direction is which. Red is X, green
is Y (up), blue is Z.

---

## 2. Adding shapes

The left panel has a palette of **29 shapes** grouped into four tabs:

- **Basic:** box, sphere, cylinder, cone, pyramid, wedge, torus, ring,
  capsule, tube, prism, half-ball.
- **Fun:** star, heart, arrow, diamond, egg, gear, bolt, spring,
  crescent, round-roof.
- **Geometric:** hexagon, pentagon, trapezoid, octahedron, dodecahedron,
  icosahedron, paraboloid.
- **Advanced:** the text tool, SVG import, and letter/number generators.

Click any shape and it appears in the scene. Each new shape is placed in
a small spiral pattern from the center so shapes don't pile up on top of
each other.

The first 10 shapes you add cycle through a preset color palette. After
that the palette loops. You can change any color later — see section 5.

---

## 3. Select, move, rotate, scale, pan

The top toolbar has five **mode buttons** on the left:

- **Select** — click objects to pick them. Shift-click to multi-select.
- **Move** — a colored gizmo appears on the selected object. Drag the
  red, green, or blue arrows to slide along X, Y, Z. Arrow keys also
  work.
- **Rotate** — drag the colored rings to rotate around X, Y, Z.
- **Scale** — drag the colored cube handles to stretch along one axis,
  or the center handle to scale uniformly.
- **Pan** — drag the view around. Same as right-click in other modes.

### Snapping

The top-row-2 toolbar has a **Snap** toggle. When on:

- **Move** snaps to the snap-size grid (configurable, default 0.5).
- **Rotate** snaps every 15 degrees.
- **Scale** snaps every 0.1.

Snap is on by default. Turn it off for precise free-form placement.

### Precise positioning from the right panel

When you have a single object selected, the **Properties** tab on the
right shows X/Y/Z for position, rotation (in degrees), and scale. Edit
any number directly for exact control.

---

## 4. Multi-select

Hold **Shift** and click objects to add them to the selection. Shift-
click a selected object to remove it. Multi-select works with Move,
Rotate, and Scale — the gizmo appears at the group's center.

---

## 5. Color and Paint mode

Two ways to color:

- Click an object, then click a **swatch** in the left panel. The whole
  object gets that color.
- Click the **Paint** button in the top toolbar to enter **paint mode**.
  Pick a color from the paint color picker, then click individual faces
  of objects to color them one face at a time. Click Paint again to
  leave paint mode.

### Materials

In the left panel's materials section you'll find **material presets**
like plastic, metal, glass, wood, and ceramic. Click one while an
object is selected to change how shiny and transparent it is, without
changing the color.

---

## 6. CSG — cutting holes and combining shapes

**CSG** (Constructive Solid Geometry) lets you punch holes in objects
and glue shapes together.

The CSG row in the toolbar has:

- **Solid / Hole toggle** — mark the selected object as a hole instead
  of a solid. Holes are shown transparent and red. They don't become
  actual holes until you group them.
- **Group** — takes the selected objects. Any objects marked as "hole"
  are subtracted from any objects marked as "solid", and the result
  becomes a single new object.
- **Ungroup** — splits a grouped object back into its parts.

### Example: a donut with a square hole

1. Add a torus (donut).
2. Add a box. Scale and rotate it so it sticks through the torus.
3. Select the box. Click **Hole** — the box turns transparent red.
4. Shift-click the torus to add it to the selection.
5. Click **Group** — the box is subtracted from the torus.

---

## 7. Modifiers

The modifier section has:

- **Mirror** — live mirrors the selected object across a chosen axis.
  Move the original and the mirrored copy tracks it in real time.
- **Array** — duplicates the selected object in a line or a circle with
  configurable count and spacing.
- **Align / Distribute** — align selected objects to each other's edges,
  centers, or tops/bottoms. Evenly distribute them along an axis.
- **Ruler** — click-drag between two points in the scene to measure the
  distance. Useful for challenges and precise work.

### Cross-section

Toggle **Cross-section** to cut the scene with a plane and see inside
objects. The right panel shows the **area** of the resulting cut in
real time — useful for lessons on volume and surface area.

### Frame camera

Click **Frame** to snap the camera to fit all objects in view. Click
it again to reset.

---

## 8. Animation timeline

The animation timeline lets you record keyframes and play them back.

1. Arrange your scene the way you want it to start.
2. Click **+ Keyframe** to store the current positions, rotations, and
   scales at time 0.
3. Move to a new time (drag the scrubber). Move, rotate, or scale your
   objects.
4. Click **+ Keyframe** again to record a new keyframe at the new time.
5. Repeat as needed.
6. Click **Play**. The app smoothly interpolates between keyframes.

The duration slider sets how long the animation runs. Keyframes loop
when the time reaches the end.

**Remove Keyframe** deletes the keyframe closest to the current time.
**Clear** wipes all keyframes.

Deleting objects while an animation is playing pauses it automatically.

---

## 9. 3D Text

In the left panel's text tool:

1. Type into the text box.
2. Pick a font: Helvetica, Helvetica Bold, Optimer, or Optimer Bold.
3. Adjust size and depth with sliders.
4. Click **+ Add**.

The text becomes a real 3D object you can move, color, group, and
export like any other shape. Text is limited to 30 characters per
object to keep the geometry manageable.

There are also **quick-add buttons** for every letter A–Z and every
number 0–9 — tap a letter and it appears in the scene as a standalone
object. Useful for spelling out words.

---

## 10. SVG import

Draw a logo or shape in any 2D program, save it as `.svg`, and import
it as a 3D extrusion.

1. Click **SVG** in the top toolbar.
2. Pick your file.
3. Every path becomes a 3D extruded shape, grouped together and
   positioned above the ground plane.

Imported SVGs are scaled to fit roughly 5 units wide. You can then
scale, rotate, and color them like any other object.

**Limits:** 5 MB max file size. `<script>`, `<foreignObject>`, and
on-event handlers are stripped from the SVG before parsing. `javascript:`
and `data:` URIs inside `href` attributes are neutralized. The SVG is
never executed, only its path geometry is used.

---

## 11. Stamp library

The stamp library lets you save any shape or group as a reusable
"stamp" that you can stamp back into the scene later.

- **Save as Stamp** — with an object selected, saves its geometry and
  color to the stamp panel.
- Click a stamp to add a copy of it to the scene.
- Stamps are saved with the project file and restored when you reload.

---

## 12. Learning mode

The right panel's **Learn** tab has three sections:

- **Tutorials** — three interactive lessons that walk the student
  through the basics with arrows and highlights.
- **Challenges** — coordinate challenges that ask the student to place
  shapes at specific X/Y/Z locations. Checks answers automatically.
- **Shape Quiz** — 25+ multiple-choice questions about shape names,
  vertex counts, and real-world examples.

This mode is designed to be usable without a teacher — but is also
useful as a warm-up exercise for a class session.

---

## 13. Saving, loading, and exporting

### Save / Open

- **Save** writes a `.spatio` project file. This is a single JSON
  document containing every object in your scene, its transform, its
  color and material, the camera position, any stamps you've created,
  and your animation timeline.
- **Open** restores a `.spatio` file. Only files saved by version 2 of
  the app are accepted — this is the current format.

### Screenshot

Click the camera icon in the top toolbar's second row to save a PNG of
the current viewport. Useful for paste-into-a-doc or quick share.

### Exporting for 3D printing and other tools

Three export formats, all in the second toolbar row:

- **STL** — for 3D printers. One solid mesh.
- **OBJ** — widely supported by every 3D tool on earth.
- **GLTF** — for game engines, AR apps, and web 3D viewers. Preserves
  colors.

### 3D printing workflow

Export as STL, open in your printer's slicer (Cura, PrusaSlicer, Bambu
Studio, etc.), generate G-code, send to the printer. The default scale
of one Spatio unit is roughly 1 cm, but you can scale the STL up or
down in the slicer.

---

## 14. Keyboard shortcuts

| Key | Action |
|---|---|
| Click | Select object |
| Shift-Click | Multi-select / toggle |
| Arrow keys | Move / rotate selected (mode-dependent) |
| Alt + Up/Down | Move selected up / down along Y |
| Shift + Arrow | Fine movement (0.1 units) |
| Delete | Delete selected |
| Left-drag (empty) | Orbit camera |
| Right-drag (empty) | Pan camera |
| Scroll wheel | Zoom |

Click the keyboard-icon button in the top-right toolbar to see this
panel in-app.

---

## 15. Tips for teachers

- **Plan for short sessions.** A 25-minute activity with a clear goal
  ("build a castle with at least 5 different shapes") works better than
  a vague "explore the app".
- **Use Learning Mode as homework.** The tutorials, challenges, and
  quiz are self-paced and don't require a teacher nearby.
- **Teach the Cross-section tool** when covering volume and surface
  area — it makes abstract math visual.
- **Introduce CSG as "cookie-cutter mode"** — kids immediately
  understand cutting shapes out of other shapes.
- **Encourage exporting to STL** — most schools now have at least one
  3D printer, and there is no substitute for the moment a student holds
  something they designed.
- **Projects are portable.** Tell students to save their `.spatio` files
  to a shared drive or USB stick — they can open the same project on
  any Spatio installation at home.
- **No accounts, ever.** If a kid asks "how do I log in" the answer is
  "you don't — your work is on this computer." This is the point.

---

## 16. Troubleshooting

**The app won't open.** Make sure Java 17 or newer is installed. From a
terminal: `java -version`. If that command isn't found, install a JDK
from Adoptium (temurin) or Oracle.

**First launch takes 30+ seconds.** This is the one-time extraction of
the Chromium runtime to `%USERPROFILE%\.spatio-studio\jcef\`. Every
launch after is instant.

**"FATAL: No Chromium native bundle on classpath."** The JAR was built
with the thin dev profile. Rebuild with `mvn package` (default profile)
or ask your IT admin for the offline build.

**Shapes look flat / missing.** Your GPU driver is out of date or doesn't
support WebGL. Update the driver.

**Text objects look broken.** The font may have failed to parse. Try a
different font in the font dropdown. If it still fails, report a bug.

**Save file won't open.** The error message tells you which case:
"invalid format" means the file is corrupted; "newer app" means the
file was saved by a future version of Spatio. Install the newer version.

**Nothing else is wrong, I just want to reset everything.** Delete
`%USERPROFILE%\.spatio-studio\` and relaunch. Your projects (wherever
you saved them) are not affected.
