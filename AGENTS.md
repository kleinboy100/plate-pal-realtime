# Project rules

- Customer operating status must read the public restaurant view, use only the manual toggle, and recover through polling, focus/online refresh and retries; owner-only realtime events cannot reliably reach customers.
- Read public operating status through a session-free client with uncached requests so customer token refresh failures cannot block availability checks.
- Check production service-worker updates on app focus, reconnect and visible polling so installed customers receive status fixes without reinstalling.