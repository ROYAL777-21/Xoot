# CI Verification Trigger

This temporary branch exists to trigger the repository pull-request workflow against the latest `main` state after the Care+, native-feel, haptics, Live Activities, widget, security, and preview updates.

Expected workflow gates:

- `npm install`
- `npm run lint`
- `npm run test`
- `npm run build`

Do not merge this file into `main` unless it becomes useful as a permanent release note.
