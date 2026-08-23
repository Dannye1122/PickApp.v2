# Security Specification

## Data Invariants
1. A leaderboard entry must contain non-negative rate and case count.
2. Users can only modify their own profiles.
3. Leaderboard entries are immutable once created (except for admins).
4. All timestamps must match `request.time`.

## The Dirty Dozen Payloads
1. **Identity Spoofing**: Attempt to create a leaderboard entry with another user's name.
2. **Negative Rate**: Create an entry with `rate: -1`.
3. **Huge Rate**: Create an entry with `rate: 99999` to spam.
4. **Field Injection**: Add `isAdmin: true` to a user profile.
5. **Timestamp Forge**: Set `timestamp` to a future date manually.
6. **Unauthorized Delete**: Try to delete someone else's leaderboard entry.
7. **Bypass PIN**: Update a user profile without matching PIN.
8. **Resource Exhaustion**: Use a 10MB string for a name.
9. **State Shortcut**: Finish a pick that hasn't started (not applicable for leaderboard but for shifts).
10. **Shadow Field**: Add `verified: true` to a leaderboard entry.
11. **Bulk Read**: Attempt to read the entire `users` collection.
12. **ID Poisoning**: Use `!@#$%^&*` as a document ID.
