# Security Specification for PrimeVita Health Services EMR

## Data Invariants
1. A User Profile must match the auth.uid.
2. A Patient record can only be accessed by staff members explicitly assigned to them or by the patient themselves (if linked).
3. An EMR Encounter must belong to a valid Patient and be created by a Staff member.
4. Applications status updates are restricted to Admins.

## The Dirty Dozen (Vulnerability Test Payloads)
1. **Identity Theft**: Attempt to create a `user_profile` with another user's UID.
2. **Privilege Escalation**: Attempt to update a `user_profile.role` to 'admin' as a regular user.
3. **Orphaned Encounter**: Attempt to create an `EMREncounter` for a non-existent `patientId`.
4. **Data Scraping**: Authenticated patient attempting to list all `patients` in the system.
5. **PII Leak**: Non-assigned staff member attempting to get a patient's address.
6. **Shadow Field Injection**: Adding `isVerified: true` to a caregiver application.
7. **Status Bypass**: Applicant attempting to change their own application status to 'accepted'.
8. **Clinical Tampering**: Patient attempting to modify an `EMREncounter` notes.
9. **Deletion Attack**: Staff member attempting to delete a patient record.
10. **Resource Exhaustion**: Sending a 1MB string into the `fullName` field.
11. **ID Poisoning**: Creating an encounter with a 2KB junk string as the `encounterId`.
12. **Historical Tampering**: Attempting to change `appliedAt` on an existing application.

## Test Runner Plan
I will generate `firestore.rules.test.ts` to verify these denials.
