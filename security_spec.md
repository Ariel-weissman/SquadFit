# Security Specification

## Data Invariants
1. **UserId Ownership**: A user profile document ID MUST match the authenticated user's ID (`request.auth.uid`). No identity spoofing.
2. **Access Control**: A user can only access, write to, or view subresources of a Party (nudges, history, members, and plans) if they are currently a member of that parent Party (checked via `/databases/$(database)/documents/parties/$(partyId)/members/$(request.auth.uid)`).
3. **Immutable Fields**: Timestamps and creator IDs are locked after initial creation. 
4. **Server Timestamps**: Field updates of timestamps like `createdAt` and `updatedAt` are validated using `request.time`.

## The Dirty Dozen Payloads (Targeted Malicious Payloads)
The following payloads are explicitly designed to breach security gates and must be blocked:
1. Creating a user profile under a different userId than the authenticated user.
2. Modifying another user's email, name, or stats in `/users/{userId}`.
3. Updating a party's workout structure without active authentication.
4. Injecting excessive size tags in lists or fields.
5. Ingesting arbitrary admin roles in a user document.
6. Triggering a nudge to an arbitrary recipient with spoofed IDs.
7. Overwriting history entries created by another user.
8. Writing a member profile with elevated roles or permissions within a party.
9. Modifying static immutable fields (`createdAt`, `ownerId`).
10. Deleting workout logs belonging to another user.
11. Bypassing size and validation checks on name length or input strings.
12. Attempting lists or reads without verified membership inside target groups.

All these attempts must return `PERMISSION_DENIED`.
