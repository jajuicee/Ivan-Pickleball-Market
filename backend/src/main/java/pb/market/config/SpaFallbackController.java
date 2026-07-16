package pb.market.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
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
 * This controller implements ErrorController to catch 404s and forward
 * them to index.html, letting React Router take over. This avoids the
 * infinite-forward loop that @RequestMapping catch-all patterns cause.
 */
@Controller
public class SpaFallbackController implements ErrorController {

    @RequestMapping("/error")
    public String handleError(HttpServletRequest request) {
        // Only forward to index.html for 404 (Not Found) errors.
        // All other errors (500, etc.) should show their default error page.
        Object status = request.getAttribute("jakarta.servlet.error.status_code");
        if (status != null && (int) status == 404) {
            return "forward:/index.html";
        }
        // For non-404 errors, let Spring Boot's default error handling take over
        throw new RuntimeException("Unexpected error: " + status);
    }
}
