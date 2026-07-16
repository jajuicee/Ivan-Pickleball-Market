package pb.market.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * SPA (Single Page Application) fallback controller.
 *
 * When the frontend is served from Spring Boot's static resources,
 * React Router handles client-side routing. If a user navigates directly
 * to e.g. /orders or /inventory, Spring Boot would normally return 404
 * because there's no server-side route for those paths.
 *
 * This controller catches any non-API, non-WebSocket, non-static-file
 * request and forwards it to index.html, letting React Router take over.
 */
@Controller
public class SpaFallbackController {

    @RequestMapping(value = {
            "/",
            "/{path:^(?!api|ws|assets|logo\\.png|manifest\\.json|vite\\.svg).*}",
            "/{path:^(?!api|ws|assets|logo\\.png|manifest\\.json|vite\\.svg).*}/**"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
