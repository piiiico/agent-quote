# The same quote as a typical AI-written sales email

Written by us to show the pattern: a vendor-side AI answering a buyer-side AI's "could you give us a price for an EMS for our battery" email. It carries the same deal as `examples/ems-bess/quote-a.json`.

---

> Subject: Re: EMS for your battery system
>
> Hi there,
>
> Thank you so much for reaching out, and for considering Fjordstyring for your energy management needs! We're excited about the opportunity to help you get the most out of your battery investment.
>
> Our FS-200 platform is a comprehensive, AI-powered energy management solution designed to maximise the value of commercial battery systems. It integrates seamlessly with leading inverter brands, including Deye, and supports industry-standard protocols to ensure a smooth installation.
>
> With FS-200, you can unlock multiple value streams, including peak shaving, spot price optimisation and participation in flexibility markets, all while keeping full visibility through our intuitive dashboard. Our customers typically see significant savings from the very first month.
>
> Pricing depends on the specifics of your site, but for a system of your size, the total investment typically starts from around NOK 35,000, plus an affordable annual licence. We also offer flexible revenue-sharing models for flexibility markets.
>
> Delivery is usually within a few weeks of order confirmation, and our experienced team will handle commissioning to ensure everything runs smoothly from day one.
>
> We'd love to set up a short call to understand your needs better and put together a tailored proposal. Would you have 30 minutes next week?
>
> Best regards,
> The Fjordstyring Team

---

## Counting decision-relevant facts

A decision-relevant fact is something a buyer's agent can compare across vendors or check: a price with a unit, a date or duration, a scope item, a term, or a product claim.

| | Email | `quote-a.json` |
|---|---|---|
| Prices with a unit | 1, fuzzy ("starts from around NOK 35,000") | 4 lines: 24,900 + 9,500 one-time, 7,200/year, 25% of aFRR revenue |
| Lead time | 0 ("a few weeks") | 1 (42 days) |
| Validity and whether it is binding | 0 | 2 (until 2026-11-30, binding) |
| Included | 1 (commissioning) | 4 |
| Excluded | 0 | 3 |
| Terms | 1 ("flexible revenue-sharing", no %) | 4 (payment 30 days, warranty 3 years, notice 3 months, ex VAT) |
| Product claims | 6 (Deye, "industry-standard protocols", peak shaving, spot, flexibility markets, dashboard) | 7 |
| **Total** | **9** | **25** (`node compare.mjs` prints this) |

Not in the total, because they overlap it:

- Claims with evidence the buyer can open: email 0, JSON 6 of 7.
- The buyer's 8 requirements: the email touches 4 loosely ("Deye", not the SG04LP3 model; "peak shaving", not the capacity tariff) and none can be checked. The JSON answers all 8 (one without evidence), and the buyer's code grades each one; the seller cannot grade itself.

The email also contains things the JSON leaves out on purpose: "AI-powered", "seamlessly", "intuitive", "significant savings", "smooth". None of them can change a ranking. And its call to action is a 30-minute call, which a buyer's agent cannot attend.

What the email hides and the JSON surfaces: the HAN port reader and the electrician are excluded, the aFRR fee is 25% of revenue, and the API read-access claim has no evidence.
