package com.heronixedu.spatio;

import com.heronixedu.spatio.bridge.JavaBridge;
import me.friwi.jcefmaven.CefAppBuilder;
import me.friwi.jcefmaven.MavenCefAppHandlerAdapter;
import org.cef.CefApp;
import org.cef.CefClient;
import org.cef.CefSettings;
import org.cef.browser.CefBrowser;
import org.cef.browser.CefFrame;
import org.cef.browser.CefMessageRouter;
import org.cef.callback.CefQueryCallback;
import org.cef.handler.CefLoadHandlerAdapter;
import org.cef.handler.CefMessageRouterHandlerAdapter;

import javax.swing.*;
import java.awt.*;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * Spatio Studio — pure Swing/AWT application with embedded Chromium (JCEF).
 * No JavaFX involved — avoids SwingNode heavyweight component issues.
 */
public class SpatioApplication {

    private CefApp cefApp;
    private CefClient cefClient;
    private CefBrowser cefBrowser;
    private JavaBridge javaBridge;
    private JFrame frame;

    public static void main(String[] args) {
        new SpatioApplication().launch();
    }

    public void launch() {
        try {
            // Extract web resources
            Path webRoot = extractWebResources();
            System.out.println("[Spatio] Web resources at: " + webRoot);

            // Build JCEF
            CefAppBuilder builder = new CefAppBuilder();
            Path installDir = Path.of(System.getProperty("user.home"), ".spatio-studio", "jcef");
            builder.setInstallDir(installDir.toFile());

            CefSettings settings = builder.getCefSettings();
            settings.windowless_rendering_enabled = false;
            settings.log_severity = CefSettings.LogSeverity.LOGSEVERITY_WARNING;
            settings.remote_debugging_port = 0; // SECURITY: Disable DevTools
            // Suppress Google API keys warning and disable features that need internet
            builder.addJcefArgs("--no-sandbox");
            builder.addJcefArgs("--disable-extensions");
            builder.addJcefArgs("--disable-component-update");
            builder.addJcefArgs("--disable-background-networking");
            builder.addJcefArgs("--disable-client-side-phishing-detection");
            builder.addJcefArgs("--disable-default-apps");
            builder.addJcefArgs("--disable-sync");
            builder.addJcefArgs("--no-first-run");
            builder.addJcefArgs("--disable-translate");
            builder.addJcefArgs("--disable-features=MediaRouter");
            builder.addJcefArgs("--disable-gpu-shader-disk-cache");
            builder.addJcefArgs("--disable-application-cache");
            builder.addJcefArgs("--aggressive-cache-discard");

            builder.setAppHandler(new MavenCefAppHandlerAdapter() {
                @Override
                public void stateHasChanged(CefApp.CefAppState state) {
                    if (state == CefApp.CefAppState.TERMINATED) {
                        System.exit(0);
                    }
                }
            });

            System.out.println("[Spatio] Building JCEF...");
            cefApp = builder.build();
            cefClient = cefApp.createClient();

            // Set up Java bridge via CefMessageRouter
            javaBridge = new JavaBridge(null); // frame set later
            CefMessageRouter.CefMessageRouterConfig routerConfig = new CefMessageRouter.CefMessageRouterConfig();
            routerConfig.jsQueryFunction = "javaQuery";
            routerConfig.jsCancelFunction = "javaQueryCancel";

            CefMessageRouter router = CefMessageRouter.create(routerConfig);
            router.addHandler(new CefMessageRouterHandlerAdapter() {
                @Override
                public boolean onQuery(CefBrowser browser, CefFrame frame, long queryId,
                                       String request, boolean persistent, CefQueryCallback callback) {
                    return javaBridge.handleQuery(request, callback);
                }
            }, true);
            cefClient.addMessageRouter(router);

            // SECURITY: Block popups and external navigation
            cefClient.addLifeSpanHandler(new org.cef.handler.CefLifeSpanHandlerAdapter() {
                @Override
                public boolean onBeforePopup(CefBrowser browser, CefFrame frame, String target_url,
                                             String target_frame_name) {
                    System.out.println("[Spatio] BLOCKED popup: " + target_url);
                    return true; // Block all popups
                }
            });

            // SECURITY: Block navigation to external URLs — only allow file:// from temp dir
            cefClient.addRequestHandler(new org.cef.handler.CefRequestHandlerAdapter() {
                @Override
                public boolean onBeforeBrowse(CefBrowser browser, CefFrame frame,
                                              org.cef.network.CefRequest request, boolean user_gesture,
                                              boolean is_redirect) {
                    String url = request.getURL();
                    if (url != null && url.startsWith("file:///")) {
                        return false; // Allow local file URLs
                    }
                    System.err.println("[Spatio] BLOCKED navigation to: " + url);
                    return true; // Block everything else
                }
            });

            // Capture JS console messages
            cefClient.addDisplayHandler(new org.cef.handler.CefDisplayHandlerAdapter() {
                @Override
                public boolean onConsoleMessage(CefBrowser browser, org.cef.CefSettings.LogSeverity level,
                                                String message, String source, int line) {
                    String src = source != null ? source.substring(source.lastIndexOf('/') + 1) : "?";
                    System.out.println("[JS " + level + "] " + src + ":" + line + " " + message);
                    return false;
                }

                @Override
                public void onTitleChange(CefBrowser browser, String title) {
                    if (title != null && title.startsWith("JS ERROR:")) {
                        System.err.println("[Spatio] " + title);
                    }
                }
            });

            // Log load events
            cefClient.addLoadHandler(new CefLoadHandlerAdapter() {
                @Override
                public void onLoadEnd(CefBrowser browser, CefFrame frame, int httpStatusCode) {
                    if (frame.isMain()) {
                        System.out.println("[Spatio] Page loaded (status " + httpStatusCode + ")");
                        browser.executeJavaScript(BRIDGE_JS, "", 0);
                    }
                }

                @Override
                public void onLoadError(CefBrowser browser, CefFrame frame, ErrorCode errorCode,
                                        String errorText, String failedUrl) {
                    System.err.println("[Spatio] Load error: " + errorCode + " - " + errorText);
                }
            });

            // Create browser
            String indexUrl = webRoot.resolve("index.html").toUri().toString();
            System.out.println("[Spatio] Loading: " + indexUrl);
            cefBrowser = cefClient.createBrowser(indexUrl, false, false);

            // Create Swing frame
            SwingUtilities.invokeLater(() -> {
                frame = new JFrame("Spatio Studio");
                frame.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
                frame.addWindowListener(new WindowAdapter() {
                    @Override
                    public void windowClosing(WindowEvent e) {
                        shutdown();
                    }
                });

                frame.getContentPane().setLayout(new BorderLayout());
                frame.getContentPane().add(cefBrowser.getUIComponent(), BorderLayout.CENTER);

                frame.setSize(1280, 800);
                frame.setMinimumSize(new Dimension(1024, 600));
                frame.setLocationRelativeTo(null);

                // Window icon
                try {
                    java.net.URL iconUrl = getClass().getResource("/spatio/images/Icon.png");
                    if (iconUrl != null) {
                        frame.setIconImage(javax.imageio.ImageIO.read(iconUrl));
                    }
                } catch (Exception ex) {
                    System.err.println("[Spatio] Could not load icon: " + ex.getMessage());
                }

                // Give the bridge access to the frame for file dialogs
                javaBridge.setFrame(frame);

                frame.setVisible(true);
            });

        } catch (Exception e) {
            System.err.println("[Spatio] Failed to start: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private void shutdown() {
        if (cefBrowser != null) cefBrowser.close(true);
        if (cefClient != null) cefClient.dispose();
        if (cefApp != null) cefApp.dispose();
    }

    private Path extractWebResources() throws IOException {
        Path tempDir = Files.createTempDirectory("spatio-web-");
        // Don't deleteOnExit the root dir — CEF may still be reading when JVM shuts down

        String[] files = {
            "index.html",
            "css/fredoka.css",
            "css/spatio.css",
            "js/three.min.js",
            "js/three-csg.js",
            "js/TransformControls.js",
            "js/GLTFExporter.js",
            "js/spatio-modal.js",
            "js/spatio-core.js",
            "js/spatio-shapes.js",
            "js/spatio-interaction.js",
            "js/font-helvetiker-bold.js",
            "js/font-helvetiker.js",
            "js/font-optimer-bold.js",
            "js/font-optimer.js",
            "js/spatio-properties.js",
            "js/spatio-text.js",
            "js/spatio-params.js",
            "fonts/helvetiker_regular.typeface.json",
            "fonts/helvetiker_bold.typeface.json",
            "fonts/optimer_regular.typeface.json",
            "fonts/optimer_bold.typeface.json",
            "js/spatio-csg.js",
            "js/spatio-io.js",
            "js/spatio-ui.js",
            "js/spatio-education.js",
            "js/spatio-challenges.js",
            "js/spatio-crosssection.js",
            "js/spatio-mirror.js",
            "js/spatio-subdivide.js",
            "js/spatio-array.js",
            "js/spatio-materials.js",
            "js/spatio-ruler.js",
            "js/spatio-align.js",
            "js/SVGLoader.js",
            "js/spatio-svgimport.js",
            "js/spatio-animate.js",
            "js/spatio-paint.js",
            "js/spatio-stamps.js",
            "js/spatio-tutorials.js",
            "js/spatio-app.js",
            "images/Icon.png",
            "images/Text Logo_Horizontal.png",
            "images/SVG/Icon.svg",
            "images/SVG/Text Logo_Horizontal.svg",
        };

        for (String file : files) {
            Path target = tempDir.resolve(file);
            Files.createDirectories(target.getParent());
            try (InputStream is = getClass().getResourceAsStream("/spatio/" + file)) {
                if (is != null) {
                    Files.copy(is, target, StandardCopyOption.REPLACE_EXISTING);
                } else {
                    System.err.println("[Spatio] Missing resource: /spatio/" + file);
                }
            }
        }
        return tempDir;
    }

    private static final String BRIDGE_JS =
        "window.javaApp = {" +
        "  downloadFile: function(name, content) {" +
        "    return new Promise(function(resolve) {" +
        "      window.javaQuery({" +
        "        request: JSON.stringify({action:'downloadFile', name:name, content:content})," +
        "        onSuccess: function(r) { resolve(r === 'true'); }," +
        "        onFailure: function() { resolve(false); }" +
        "      });" +
        "    });" +
        "  }," +
        "  showOpenDialog: function() {" +
        "    return new Promise(function(resolve) {" +
        "      window.javaQuery({" +
        "        request: JSON.stringify({action:'showOpenDialog'})," +
        "        onSuccess: function(r) { resolve(r); }," +
        "        onFailure: function() { resolve(''); }" +
        "      });" +
        "    });" +
        "  }," +
        "  readFile: function(path) {" +
        "    return new Promise(function(resolve) {" +
        "      window.javaQuery({" +
        "        request: JSON.stringify({action:'readFile', path:path})," +
        "        onSuccess: function(r) { resolve(r); }," +
        "        onFailure: function() { resolve(''); }" +
        "      });" +
        "    });" +
        "  }," +
        "  showImportDialog: function() {" +
        "    return new Promise(function(resolve) {" +
        "      window.javaQuery({" +
        "        request: JSON.stringify({action:'showImportDialog'})," +
        "        onSuccess: function(r) { resolve(r); }," +
        "        onFailure: function() { resolve(''); }" +
        "      });" +
        "    });" +
        "  }" +
        "};" +
        "console.log('JavaBridge injected via JCEF');";
}
