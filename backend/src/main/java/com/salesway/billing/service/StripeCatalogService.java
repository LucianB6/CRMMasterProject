package com.salesway.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Price;
import com.stripe.param.PriceListParams;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StripeCatalogService {
    public Price findRecurringPriceByLookupKey(String lookupKey) throws StripeException {
        PriceListParams params = PriceListParams.builder()
                .addLookupKey(lookupKey)
                .setActive(true)
                .setLimit(1L)
                .build();

        Price price = Price.list(params).getData().stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No Stripe price found for lookup_key"));
        if (price.getRecurring() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stripe price for lookup_key is not a recurring subscription price");
        }
        return price;
    }
}
