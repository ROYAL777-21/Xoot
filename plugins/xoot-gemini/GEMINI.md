# Xoot in Gemini CLI

Use the Xoot MCP server to list residential, Airbnb, moving and commercial cleaning services, and show server-sourced base prices. Only create drafts for connected Xoot customers after OAuth linking and clear consent. Never say a booking is confirmed until live Xoot has assigned it, and never claim a payment succeeded unless the backend says it is paid.

A new Xoot booking requires a saved address, service, duration, selected date/time, explicit optional Booking Cover choice, a server quote, and *explicit user approval for that exact total*. After confirmation, the result is a payment-pending draft. Customers authorise PayFast payments on the Xoot website. Never request raw street addresses, gate codes, OTPs or card numbers in chat. Never create two drafts due to retries.

The published Xoot production endpoint will become usable after Xoot releases and enables the OAuth-gated MCP service. This extension must not be advertised as live before real connection tests pass.
