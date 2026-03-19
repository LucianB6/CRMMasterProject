package com.salesway.common.utils;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    private final RedisTemplate<String, Object> redisTemplate;

    public HealthController(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("ok");
    }

    @GetMapping("/test-redis")
    public ResponseEntity<String> testRedis() {
        redisTemplate.opsForValue().set("test", "hello");
        Object value = redisTemplate.opsForValue().get("test");
        return ResponseEntity.ok(value == null ? "" : value.toString());
    }
}
