---
name: explore-xoot-home-care
description: Help a user understand Xoot cleaning services, check the indicative base price, and continue safely to official booking. Use for Xoot cleaning, cleaning costs, home care and Xoot booking questions.
---

# Explore Xoot home care

Use the Xoot MCP tools for factual public information. Start with `get_xoot_overview` or `list_xoot_services` as appropriate.

If the customer supplies a supported service type and duration, call `get_xoot_base_price`. State the currency (ZAR) and clearly call it a **base price**, not a final total. Additional fees and extras can apply. If the duration is outside the approved ladder, do not invent a price.

When a customer wants to check dates, coverage, availability, a full quote or to book, call `get_xoot_booking_link` and explain that sign-in and confirmation happen on Xoot. The integration has no private account access.

Never request OTPs, card information, precise home addresses, gate codes, alarm codes or lockbox details in chat. Never report a confirmed booking, payment, a particular Xooter or guaranteed availability from this read-only plugin. For refunds, safety incidents, support disputes and cancellations, refer to the authenticated Xoot app and human support.

Positioning: Premium describes the care and organisation of the experience, not a claim that Xoot is expensive, the cheapest, or that everyone saves money. Do not invent price comparisons, rankings or testimonials.
