package pb.market.config;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.logging.Logger;

/**
 * Manages all connected WebSocket clients and broadcasts stock-change events.
 *
 * Message format sent to clients:
 *   {"type":"STOCK_UPDATE"}
 *
 * Clients receive this and trigger a re-fetch of /api/products so every
 * device always shows the real-time stock without the user needing to refresh.
 */
@Component
public class StockWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = Logger.getLogger(StockWebSocketHandler.class.getName());

    // Thread-safe set of all currently connected WebSocket sessions
    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        log.info("[WS] Client connected: " + session.getId() + " | total=" + sessions.size());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        log.info("[WS] Client disconnected: " + session.getId() + " | total=" + sessions.size());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        sessions.remove(session);
        log.warning("[WS] Transport error for " + session.getId() + ": " + exception.getMessage());
    }

    // ── Broadcast ─────────────────────────────────────────────────────────────

    /**
     * Called by controllers after any stock-mutating operation.
     * Sends {"type":"STOCK_UPDATE"} to every connected client.
     */
    public void broadcastStockUpdate() {
        String payload = "{\"type\":\"STOCK_UPDATE\"}";
        TextMessage message = new TextMessage(payload);
        int sent = 0;
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(message);
                    sent++;
                } catch (IOException e) {
                    log.warning("[WS] Failed to send to " + session.getId() + ": " + e.getMessage());
                    sessions.remove(session);
                }
            }
        }
        log.info("[WS] Broadcasted STOCK_UPDATE to " + sent + " client(s).");
    }
}
