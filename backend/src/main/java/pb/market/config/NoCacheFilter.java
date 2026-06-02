package pb.market.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Adds no-cache headers to every API response so that browsers and HTTP clients
 * on all devices always fetch fresh data from the server instead of using a
 * locally cached copy. This ensures multi-device consistency — when Device A
 * updates stock, Device B will always retrieve the latest state from the DB.
 */
@Component
public class NoCacheFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // Apply only to /api/** endpoints
        String path = request.getRequestURI();
        if (path.startsWith("/api/")) {
            response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            response.setHeader("Pragma", "no-cache");
            response.setHeader("Expires", "0");
        }

        filterChain.doFilter(request, response);
    }
}
