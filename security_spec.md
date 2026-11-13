# Firestore Security Specification – «صديق المزارع / مزرعتي الافتراضية»

## 1. Data Invariants
1. **Default-Deny Catch-All**: No collection is accessible unless explicitly matched and permitted.
2. **PII Isolation**: User email addresses and notification preferences live in `/users/{userId}/private/info` and are readable/writable ONLY by the verified owner (`request.auth.uid == userId`) or Admin (`Alsharji73@gmail.com` verified or in `/admins/{uid}`).
3. **Farm Ownership**: A `/farms/{farmId}` document and its `/plots/{plotId}` subcollection belong strictly to `ownerId == request.auth.uid` (and `farmId == request.auth.uid`). No other farmer can read or mutate another farmer's private farm resources.
4. **Anti-Cheat / Immutable Integrity**:
   - Users cannot elevate their own `role` to `'admin'` or modify `isBanned` on `/users/{userId}`.
   - Users cannot fabricate server timestamps (`createdAt == request.time`, `updatedAt == request.time`).
   - All document IDs are strictly validated via `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
5. **Admin Governance**: Admin privileges are verified via `request.auth.token.email == 'Alsharji73@gmail.com' && request.auth.token.email_verified == true` or `/admins/$(request.auth.uid)`.

## 2. The "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/users/attacker`: Rejected (`!isSignedIn()`).
2. Unauthenticated read of `/users/victim/private/info`: Rejected (PII isolation).
3. Authenticated user `userA` reading `/users/userB/private/info`: Rejected (`!isOwner(userB)`).
4. Authenticated user `userA` creating `/users/userA` with `role: "admin"` (Self-Assigned Role): Rejected (`incoming().role == 'farmer'`).
5. Authenticated user `userA` updating `/users/userA` with `isBanned: false` or `role: "admin"`: Rejected (`affectedKeys().hasOnly(...)`).
6. Authenticated user `userA` sending a Ghost Field `isVerified: true` on `/farms/userA`: Rejected (`keys().hasOnly(...)`).
7. Authenticated user `userA` writing `/farms/userB` (Owner spoofing): Rejected (`farmId == request.auth.uid && incoming().ownerId == request.auth.uid`).
8. Authenticated user `userA` forging `updatedAt: "2020-01-01"` instead of `request.time`: Rejected (`incoming().updatedAt == request.time`).
9. Authenticated user `userA` injecting a 2000-char junk string into `{plotId}`: Rejected (`isValidId(plotId)`).
10. Unverified email spoofing `Alsharji73@gmail.com` with `email_verified: false`: Rejected (`request.auth.token.email_verified == true`).
11. Non-admin modifying `/system/seasonal_config`: Rejected (`isAdmin()`).
12. Creating `/friendships/f1` with `requesterId: "someone_else"` or `status: "accepted"`: Rejected (`incoming().requesterId == request.auth.uid && incoming().status == 'pending'`).
