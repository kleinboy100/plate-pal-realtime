# Store status recovery

- [x] Check live store status and customer access.
- [x] Recover missed updates and failed reads without falsely reporting closed.
- [x] Verify automatic recovery and customer checkout availability (six tests passed; live customer cart recovered and enabled checkout, without submitting a real order).
- [ ] Isolate public status reads from customer session failures and verify recovery in the customer cart.
- [ ] Refresh installed-app updates when customers reopen the app.