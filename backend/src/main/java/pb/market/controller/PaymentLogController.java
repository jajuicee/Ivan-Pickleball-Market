package pb.market.controller;

import pb.market.entity.PaymentLog;
import pb.market.repository.PaymentLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/payment-logs")
@RequiredArgsConstructor
public class PaymentLogController {
    private final PaymentLogRepository paymentLogRepository;

    @GetMapping
    public List<PaymentLog> getAll(
            @RequestParam(value = "from", required = false) String fromStr,
            @RequestParam(value = "to", required = false) String toStr) {
        if (fromStr != null && toStr != null) {
            LocalDateTime from = LocalDateTime.parse(fromStr);
            LocalDateTime to = LocalDateTime.parse(toStr);
            return paymentLogRepository.findByPaymentDateBetween(from, to);
        }
        return paymentLogRepository.findAllOrdered();
    }
}
