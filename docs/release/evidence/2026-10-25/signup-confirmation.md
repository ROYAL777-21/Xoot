# Password-signup confirmation correction — prepared, not published

Reviewed PR95 source: d036520a77b61d38c92ea5441c733c7910bfb3ac, stacked on PR92.
Production read-only logs showed successful signup followed by email_not_confirmed at password
sign-in; a separate request hit email rate limiting. The live signup trigger guards absent optional
referral dependencies, so they were not demonstrated as the failure cause.

Auth now keeps a no-session signup on a dedicated Confirm your email screen, clears the password,
retains the 000000 placeholder and accepts the complete code. Resend uses auth.resend(type:signup).
Unconfirmed password sign-in returns to confirmation. It preserves confirmation, safe redirects,
generic error handling and returning-user copy; it does not grant a session or role without Auth.

Production's Confirm sign up template was saved through the owner-authenticated dashboard.
A fresh tab showed Confirm your Xoot email, only the reviewed purple Xoot content, Token and
ConfirmationURL placeholders, and Save disabled. Preview iframe text independently matched the new
body. The source editor is a sink textarea; its fill behaviour was checked in preview before saving.
Production Email OTP length remains six. No actual code, password or session was read.

Validation: 24 focused auth/callback/security checks; independent 20/20; TypeScript; scoped lint;
production-mode staging-config build; 50-page prerender; artifact scan. The old Auth implementation
failed three added regressions. An isolated synthetic browser preview exercised signup, confirmation,
resend and mock verification on small/desktop screens without real provider traffic or console errors.
It does not prove a new real account completed email confirmation.

Exact-source Vercel preview dpl_58hEJrqQ1qr5u7QnE58BCiyFok8D is READY at
https://xoot-kpllx7rx5-royal777-21s-projects.vercel.app .
It is a preview, with no production promotion or new real signup performed there.
Required GitHub checks did not start because of the existing billing/usage block. Preserve current
plan/spending limits; no fabricated status or bypass. The live website still serves e0c021e.

A real new-account password/code/link check remains required after a suitable staging website is
ready and the founder enters their own credentials privately. The
[production checklist](../../production-checklist.md) records all remaining gates.
