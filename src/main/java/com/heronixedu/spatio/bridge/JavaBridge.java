package com.heronixedu.spatio.bridge;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.cef.callback.CefQueryCallback;

import javax.swing.*;
import javax.swing.filechooser.FileNameExtensionFilter;
import java.awt.*;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Bridge between JCEF JavaScript and native Java file system operations.
 * Uses Swing JFileChooser (no JavaFX dependency).
 *
 * SECURITY: All file operations are validated:
 * - readFile only allows files opened via dialog (tracked in allowedReadPaths)
 * - writeFile only allows extensions: .spatio, .stl, .obj, .gltf, .json, .png
 * - Paths are canonicalized to prevent traversal attacks
 */
public class JavaBridge {

    private Component parentFrame;
    private File lastDirectory;

    // Security: track paths returned by file dialogs — only these can be read
    private final Set<String> allowedReadPaths = new HashSet<>();

    // Security: allowed file extensions for write operations
    private static final Set<String> ALLOWED_WRITE_EXTENSIONS = new HashSet<>(
            Arrays.asList(".spatio", ".stl", ".obj", ".gltf", ".json", ".png")
    );

    // Security: allowed file extensions for read/import operations.
    // Only two callers use readFile (JS grep): loadProject (.spatio) and
    // importSVG (.svg). .stl and .obj are export-only and never read.
    // .json is no longer permitted — the dead stamps import/export was
    // removed. Adding a new read-capable format requires deliberately
    // unlocking it here and thinking through the parser's attack surface.
    private static final Set<String> ALLOWED_READ_EXTENSIONS = new HashSet<>(
            Arrays.asList(".spatio", ".svg")
    );

    public JavaBridge(Component parentFrame) {
        this.parentFrame = parentFrame;
    }

    public void setFrame(Component frame) {
        this.parentFrame = frame;
    }

    public boolean handleQuery(String request, CefQueryCallback callback) {
        try {
            JsonObject json = JsonParser.parseString(request).getAsJsonObject();
            String action = json.get("action").getAsString();

            switch (action) {
                case "downloadFile": {
                    String name = json.get("name").getAsString();
                    String content = json.get("content").getAsString();
                    SwingUtilities.invokeLater(() -> {
                        try {
                            String savedPath = doDownloadFile(name, content);
                            callback.success(savedPath);
                        } catch (Exception e) {
                            callback.failure(-1, "Save failed");
                        }
                    });
                    return true;
                }
                case "showOpenDialog": {
                    SwingUtilities.invokeLater(() -> {
                        try {
                            callback.success(doShowOpenDialog());
                        } catch (Exception e) {
                            callback.failure(-1, "Open failed");
                        }
                    });
                    return true;
                }
                case "showImportDialog": {
                    SwingUtilities.invokeLater(() -> {
                        try {
                            callback.success(doShowImportDialog());
                        } catch (Exception e) {
                            callback.failure(-1, "Import failed");
                        }
                    });
                    return true;
                }
                case "readFile": {
                    String path = json.get("path").getAsString();
                    try {
                        // SECURITY: Only allow reading files that were selected via dialogs
                        String canonical = Path.of(path).toRealPath().toString();
                        if (!allowedReadPaths.contains(canonical)) {
                            System.err.println("[JavaBridge] BLOCKED read attempt: " + path);
                            callback.failure(-1, "File access denied");
                            return true;
                        }
                        // SECURITY: Check file extension
                        String ext = getExtension(canonical);
                        if (!ALLOWED_READ_EXTENSIONS.contains(ext)) {
                            System.err.println("[JavaBridge] BLOCKED read (bad extension): " + path);
                            callback.failure(-1, "File type not allowed");
                            return true;
                        }
                        // SECURITY: Check file size (max 50MB)
                        long size = Files.size(Path.of(canonical));
                        if (size > 50 * 1024 * 1024) {
                            callback.failure(-1, "File too large");
                            return true;
                        }
                        String content = Files.readString(Path.of(canonical));
                        // SECURITY: single-use token — consume only on a
                        // successful read. If the read fails (file deleted
                        // between dialog and read, permission error, I/O
                        // glitch), the token stays and the user can retry
                        // without opening the dialog again. The set still
                        // stays bounded because successful reads pop the
                        // token and the dialogs are the only way to add one.
                        allowedReadPaths.remove(canonical);
                        callback.success(content);
                    } catch (Exception e) {
                        callback.failure(-1, "Read failed");
                    }
                    return true;
                }
                default:
                    callback.failure(-1, "Unknown action");
                    return true;
            }
        } catch (Exception e) {
            System.err.println("[JavaBridge] Error: " + e.getMessage());
            callback.failure(-1, "Internal error");
            return true;
        }
    }

    private String doDownloadFile(String defaultName, String content) {
        try {
            // SECURITY: Sanitize default filename
            defaultName = sanitizeFilename(defaultName);

            JFileChooser chooser = new JFileChooser();
            chooser.setDialogTitle("Save File — Choose where to save your work");
            chooser.setSelectedFile(new File(defaultName));
            if (lastDirectory != null) chooser.setCurrentDirectory(lastDirectory);

            if (defaultName.endsWith(".stl")) {
                chooser.setFileFilter(new FileNameExtensionFilter("STL Files (*.stl)", "stl"));
            } else if (defaultName.endsWith(".obj")) {
                chooser.setFileFilter(new FileNameExtensionFilter("OBJ Files (*.obj)", "obj"));
            } else if (defaultName.endsWith(".gltf")) {
                chooser.setFileFilter(new FileNameExtensionFilter("GLTF Files (*.gltf)", "gltf"));
            } else if (defaultName.endsWith(".spatio")) {
                chooser.setFileFilter(new FileNameExtensionFilter("Spatio Projects (*.spatio)", "spatio"));
            }

            if (chooser.showSaveDialog(parentFrame) == JFileChooser.APPROVE_OPTION) {
                File file = chooser.getSelectedFile();
                // Ensure correct extension
                String ext = defaultName.substring(defaultName.lastIndexOf('.'));
                if (!file.getName().contains(".")) {
                    file = new File(file.getAbsolutePath() + ext);
                }
                // SECURITY: Validate extension
                String fileExt = getExtension(file.getName());
                if (!ALLOWED_WRITE_EXTENSIONS.contains(fileExt)) {
                    System.err.println("[JavaBridge] BLOCKED write (bad extension): " + file.getName());
                    return "";
                }
                Files.writeString(file.toPath(), content);
                lastDirectory = file.getParentFile();
                System.out.println("[JavaBridge] Saved to: " + file.getAbsolutePath());
                return file.getAbsolutePath();
            }
        } catch (Exception e) {
            System.err.println("[JavaBridge] Save failed: " + e.getMessage());
        }
        return "";
    }

    private String doShowOpenDialog() {
        try {
            JFileChooser chooser = new JFileChooser();
            chooser.setDialogTitle("Open Project");
            if (lastDirectory != null) chooser.setCurrentDirectory(lastDirectory);
            chooser.setFileFilter(new FileNameExtensionFilter("Spatio Projects", "spatio"));

            if (chooser.showOpenDialog(parentFrame) == JFileChooser.APPROVE_OPTION) {
                File file = chooser.getSelectedFile();
                lastDirectory = file.getParentFile();
                // SECURITY: Add to allowed read paths
                String canonical = file.toPath().toRealPath().toString();
                allowedReadPaths.add(canonical);
                return file.getAbsolutePath();
            }
        } catch (Exception e) {
            System.err.println("[JavaBridge] Open failed: " + e.getMessage());
        }
        return "";
    }

    private String doShowImportDialog() {
        try {
            JFileChooser chooser = new JFileChooser();
            chooser.setDialogTitle("Import 3D Model");
            if (lastDirectory != null) chooser.setCurrentDirectory(lastDirectory);
            chooser.setFileFilter(new FileNameExtensionFilter("SVG Files", "svg"));

            if (chooser.showOpenDialog(parentFrame) == JFileChooser.APPROVE_OPTION) {
                File file = chooser.getSelectedFile();
                lastDirectory = file.getParentFile();
                // SECURITY: Add to allowed read paths
                String canonical = file.toPath().toRealPath().toString();
                allowedReadPaths.add(canonical);
                return file.getAbsolutePath();
            }
        } catch (Exception e) {
            System.err.println("[JavaBridge] Import failed: " + e.getMessage());
        }
        return "";
    }

    /**
     * Sanitize filename — strip path separators and traversal sequences
     */
    private String sanitizeFilename(String name) {
        if (name == null) return "untitled.spatio";
        name = name.replace("/", "").replace("\\", "").replace("..", "");
        if (name.isEmpty()) name = "untitled.spatio";
        return name;
    }

    /**
     * Get file extension (lowercase, with dot)
     */
    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0) return "";
        return filename.substring(dot).toLowerCase();
    }
}
