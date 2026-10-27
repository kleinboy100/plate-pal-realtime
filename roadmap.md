# Store status recovery

- [x] Check live store status and customer access.
- [x] Recover missed updates and failed reads without falsely reporting closed.
- [x] Verify automatic recovery and customer checkout availability (six tests passed; live customer cart recovered and enabled checkout, without submitting a real order).
- [x] Isolate public status reads from customer session failures; reproduced before, verified open afterwards, network retry recovery and real-meal collection checkout availability (no order submitted); ten tests passed.
- [x] Check installed-app updates on reopening, reconnect and visible polling; deployed installed-app update delivery requires publishing.