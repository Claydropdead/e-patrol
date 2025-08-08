// Simple in-memory rate limiter for API routes
// In production, use Redis or a proper rate limiting service

interface RateLimit {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimit>()

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remainingRequests: number; resetTime: number } {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
  
  const current = rateLimitStore.get(identifier)
  
  if (!current || current.resetTime < now) {
    // New window or expired
    const newLimit: RateLimit = {
      count: 1,
      resetTime: now + windowMs
    }
    rateLimitStore.set(identifier, newLimit)
    return {
      allowed: true,
      remainingRequests: maxRequests - 1,
      resetTime: newLimit.resetTime
    }
  }
  
  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: current.resetTime
    }
  }
  
  current.count++
  rateLimitStore.set(identifier, current)
  
  return {
    allowed: true,
    remainingRequests: maxRequests - current.count,
    resetTime: current.resetTime
  }
}

export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>) {
  return {
    'X-RateLimit-Remaining': result.remainingRequests.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
  }
}
