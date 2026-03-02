"""In-memory rate limit for OpenAI calls (per minute)."""
import time
import threading

# Default: 20 calls per minute to avoid hitting tier limits
OPENAI_CALLS_PER_MINUTE = 20
_timestamps: list[float] = []
_lock = threading.Lock()


def wait_if_needed() -> None:
    """Block until we're under the per-minute limit."""
    with _lock:
        now = time.monotonic()
        cutoff = now - 60
        _timestamps[:] = [t for t in _timestamps if t > cutoff]
        if len(_timestamps) >= OPENAI_CALLS_PER_MINUTE:
            # Wait until oldest expires
            wait = 60 - (now - _timestamps[0])
            if wait > 0:
                time.sleep(wait)
            _timestamps[:] = [t for t in _timestamps if t > time.monotonic() - 60]
        _timestamps.append(time.monotonic())
