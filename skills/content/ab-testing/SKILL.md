# A/B Testing

Test email variations systematically to improve open rates, click rates, and conversions with statistical confidence.

## When to use this skill

- Setting up your first email A/B test
- Open rates or click rates are flat and you want data-driven improvements
- Deciding between subject line variations, send times, or content approaches
- Determining if your test results are statistically significant or just noise
- Planning a testing program across campaigns or sequences
- Evaluating whether to use A/B testing, multivariate testing, or bandit algorithms
- Measuring the true incremental lift of your email program with holdout groups

## Related skills

- `email-copywriting` - writing the actual content variations to test
- `template-design` - HTML template variations for layout and visual tests
- `spam-filter-avoidance` - ensure test variants don't accidentally trigger spam filters
- `sender-reputation` - monitor whether testing impacts your sending reputation
- `email-sequences` - testing within drip campaigns and automated sequences

---

## What to test (in priority order)

Not all tests deliver equal value. Start with high-impact, easy-to-measure elements and work your way down.

### Tier 1 - highest impact, test these first

| Element | What to vary | Primary metric | Why it matters |
|---------|-------------|----------------|----------------|
| Subject line | Length, personalization, question vs statement, emoji, urgency | Open rate | The single biggest lever. A bad subject line means nobody sees anything else. |
| From name | Company name vs person name vs "Person at Company" | Open rate | Recipients decide to open based on who sent it as much as the subject. |
| Send time | Day of week, hour of day, timezone-adjusted vs fixed | Open rate | Same email sent at 6 AM vs 10 AM can see 20-40% open rate differences. |

### Tier 2 - high impact, requires more setup

| Element | What to vary | Primary metric | Why it matters |
|---------|-------------|----------------|----------------|
| CTA | Button text, color, placement, number of CTAs | Click rate | "Get started" vs "Start your free trial" can shift click rates by 10-30%. |
| Preview text | First 40-90 characters visible in inbox | Open rate | Often overlooked - many senders leave this as the default HTML boilerplate. |
| Content length | Short vs long, single-topic vs multi-topic | Click rate | Depends heavily on audience and email type. No universal "right" length. |

### Tier 3 - incremental gains, test after you've optimized tiers 1-2

| Element | What to vary | Primary metric | Why it matters |
|---------|-------------|----------------|----------------|
| Layout | Single column vs multi-column, image placement | Click rate | Visual hierarchy affects scanning behavior. |
| Personalization depth | Name only vs company vs role-specific content | Click rate, conversion | Diminishing returns - basic personalization matters most. |
| Tone | Formal vs casual, first person vs third person | Click rate, reply rate | Audience-dependent. B2B enterprise vs startup is a different world. |

**Rule of thumb:** If you're sending fewer than 50,000 emails per month, focus on tier 1. You probably don't have the volume to detect tier 3 differences.

---

## Sample size and statistical significance

This is where most email A/B tests go wrong. People call winners based on gut feeling or tiny sample sizes.

### Minimum sample sizes

The sample size you need depends on three things:

1. **Baseline rate** - your current open/click rate
2. **Minimum detectable effect (MDE)** - the smallest improvement worth detecting
3. **Statistical power** - the probability of detecting a real effect (standard: 80%)

Here are practical minimums per variant for a 95% confidence level and 80% power:

| Baseline rate | MDE (relative) | Sample per variant | Total for 2 variants |
|--------------|----------------|-------------------|---------------------|
| 20% open rate | 20% (detect 24% vs 20%) | ~3,800 | ~7,600 |
| 20% open rate | 10% (detect 22% vs 20%) | ~15,000 | ~30,000 |
| 5% click rate | 20% (detect 6% vs 5%) | ~15,000 | ~30,000 |
| 5% click rate | 30% (detect 6.5% vs 5%) | ~6,700 | ~13,400 |
| 2% conversion | 50% (detect 3% vs 2%) | ~3,800 | ~7,600 |

**Translation:** If your open rate is 20% and you want to detect a 20% relative improvement (4 percentage point lift to 24%), you need about 3,800 recipients in each variant - roughly 7,600 total sends.

If you can only detect a 50%+ relative change, the test is probably not worth running. You'll only catch massive differences, and you won't learn anything about incremental improvements.

### The two-proportion z-test

The standard significance test for email A/B testing is the two-proportion z-test. It compares two conversion rates and tells you whether the difference is statistically significant.

```
p1 = control conversions / control total
p2 = variant conversions / variant total
p_pool = (control conversions + variant conversions) / (control total + variant total)

standard_error = sqrt(p_pool * (1 - p_pool) * (1/control_total + 1/variant_total))
z = (p2 - p1) / standard_error
```

A z-score above 1.96 (or below -1.96) means p < 0.05 - the result is significant at 95% confidence.

**What 95% confidence actually means:** There is less than a 5% probability that the observed difference happened by chance. It does NOT mean there's a 95% chance the variant is better - that's a common misinterpretation.

### Confidence intervals matter more than p-values

A result can be "statistically significant" but practically meaningless. Always look at the confidence interval for the difference:

- **CI: [+0.1%, +4.2%]** - Significant, but the true lift might be as small as 0.1%. Probably not worth the effort to implement.
- **CI: [+2.5%, +6.8%]** - Significant, and even the low end is a meaningful improvement. Ship it.
- **CI: [-0.3%, +3.1%]** - NOT significant. The true effect could be negative. Don't call this a winner.

---

## Test design and execution

### Randomization and consistency

Good A/B tests require truly random, consistent assignment. A recipient who receives variant A should always be in variant A if they encounter the experiment again.

**Hash-based deterministic assignment** is the gold standard. Hash the experiment ID + recipient email to produce a stable bucket assignment:

```
bucket = SHA256(experimentId + ":" + contactEmail) -> normalize to [0, 1)
```

This approach:
- Guarantees the same recipient always gets the same variant
- Doesn't require storing assignments upfront (though logging them is still important)
- Works across distributed systems without coordination
- Supports weighted variants by dividing the [0, 1) range proportionally

Random list splits in your ESP work for one-off campaigns, but break down for sequences or journeys where the same person should consistently see the same variant.

### How long to run the test

**Minimum: 48 hours.** Email open behavior has strong day-of-week patterns. A test that runs only during Tuesday morning will miss the Thursday openers.

**Recommended: 5-7 days.** This captures a full weekly cycle and accounts for people who don't check email daily.

**Maximum: 14 days.** Beyond two weeks, external factors (seasonality, news events, list decay) start to contaminate your results.

Rules for when to stop:

1. **Don't peek and stop early.** If you check results after 2 hours and see variant B winning by 30%, resist the urge to call it. Early results are extremely noisy. This is called the "peeking problem" and it inflates your false positive rate well above 5%.
2. **Pre-commit to your sample size.** Calculate the required sample size before starting. Run until you reach it.
3. **Use a time-based cutoff as backup.** If you haven't reached your sample size after 14 days, the test is inconclusive - not a win for whoever happens to be ahead.

### Test one variable at a time

Change only one element per test. If you change the subject line AND the CTA AND the send time, and variant B wins, you have no idea which change caused the improvement. You can't apply what you learned.

Exception: multivariate testing (covered below) can test multiple variables simultaneously, but requires much larger sample sizes.

---

## A/B testing vs multivariate testing

| Factor | A/B testing | Multivariate testing |
|--------|------------|---------------------|
| Variables tested | 1 | 2+ simultaneously |
| Variants needed | 2-4 | Every combination (2x2=4, 2x3=6, 3x3=9...) |
| Sample size | Moderate (1,000+ per variant) | Large (1,000+ per combination) |
| What you learn | Which variant wins | Which combination wins AND which variables have the most impact |
| When to use | Most of the time | When you have high volume (100k+ sends) and want to understand variable interactions |

### When multivariate testing makes sense

Only if ALL of these are true:

1. You send 100,000+ emails per campaign (enough volume per combination)
2. You suspect variables interact (e.g., a casual subject line works better with a casual CTA)
3. You've already optimized individual variables through A/B tests
4. You can set up and track all combinations reliably

For most email programs: stick with A/B tests. Run them sequentially. Subject line test in January, CTA test in February, send time test in March. You'll learn more from three clean A/B tests than one muddy multivariate test.

---

## Bandit algorithms vs fixed-horizon tests

Traditional A/B tests run for a fixed duration, then you pick the winner and deploy. Bandit algorithms (multi-armed bandit, Thompson sampling) dynamically shift traffic toward the better-performing variant during the test.

### When to use each

**Use fixed-horizon A/B tests when:**
- You need clean, defensible statistical results
- You're optimizing a template or strategy you'll reuse for months
- Learning is the priority (understanding WHY something works)

**Use bandit algorithms when:**
- You're sending a one-time campaign and want to maximize performance of that specific send
- Speed matters more than certainty
- The "explore" phase (testing suboptimal variants) has a real cost (e.g., revenue-critical transactional emails)

### How bandit testing works for email

1. Send the first 10-20% of the list split evenly across variants
2. After initial results come in, shift more volume to the better-performing variant
3. Continue adjusting allocation as more data arrives
4. By the end, 70-80% of the list receives the winning variant

**Tradeoff:** You sacrifice statistical rigor for better aggregate performance. You may not know if variant B is truly better - but more people saw the better-performing option.

Most ESPs that offer "auto-winner" selection are doing a basic version of this: send to a test portion, wait a fixed time, then send the winner to the remainder. This is better than nothing but is not a true bandit algorithm - it doesn't continuously adapt.

---

## Holdout groups

A holdout group is a randomly selected subset of your audience that does NOT receive the email (or receives no email at all). They measure the true incremental lift of your email program.

### Why holdouts matter

A/B tests tell you which variant is better. Holdouts tell you whether sending email at all is better than not sending.

Without holdouts, you can't distinguish between:
- "Our welcome sequence drove 30% more activations" (real lift)
- "People who were going to activate anyway also happened to receive our welcome sequence" (selection bias)

### How to implement holdouts

1. Randomly select 5-10% of your eligible audience as the holdout group
2. Suppress all email to the holdout group for the test period
3. Compare conversion/revenue between the group that received email and the holdout
4. Calculate incremental lift:

```
lift = (treatment_conversion_rate - holdout_conversion_rate) / holdout_conversion_rate
```

### Holdout group sizing

| Audience size | Holdout % | Holdout size | Expected baseline conversion | Can detect lift of |
|--------------|-----------|-------------|------------------------------|-------------------|
| 10,000 | 10% | 1,000 | 5% | ~50% relative |
| 50,000 | 10% | 5,000 | 5% | ~25% relative |
| 100,000 | 5% | 5,000 | 5% | ~25% relative |
| 500,000 | 5% | 25,000 | 5% | ~10% relative |

Larger audiences can use smaller holdout percentages (5%) because the absolute holdout size is still large enough.

### When to use holdouts

- **Quarterly:** Run a 2-4 week holdout on your main email programs to measure ongoing lift
- **New sequences:** Always run a holdout when launching a new email sequence to prove it works
- **High-frequency sends:** If you're sending daily or near-daily, holdouts reveal fatigue effects

**Warning:** Holdout results often show lower incrementality than you expect. An email program showing 200% ROI based on last-click attribution might show 30% incremental lift in a holdout test. That's normal - it means your email is capturing credit for conversions that would have happened anyway, plus generating real incremental value.

---

## Metrics to optimize for

Choose your primary metric BEFORE running the test. Optimizing for multiple metrics simultaneously leads to cherry-picking results.

| Metric | When to optimize for it | Gotchas |
|--------|------------------------|---------|
| Open rate | Subject line tests, from name tests, send time tests | Apple Mail Privacy Protection inflates opens by 30-60%. Unreliable as sole metric for Apple-heavy audiences. |
| Click rate | CTA tests, content tests, layout tests | More reliable than opens. Measures actual engagement. |
| Click-to-open rate (CTOR) | Content effectiveness independent of subject line | Combines the Apple MPP noise from opens with click data. Less useful than it was pre-2021. |
| Conversion rate | When you have clear downstream actions (signup, purchase) | Requires conversion tracking beyond the email. Longer attribution windows. |
| Revenue per email | E-commerce, when you can tie revenue to individual sends | Best metric for bottom-line impact but needs robust attribution. |
| Reply rate | Sales emails, cold outreach | Only relevant for emails that expect replies. |
| Unsubscribe rate | Safety metric - always monitor alongside your primary metric | A variant can win on clicks but lose subscribers. Check both. |

### The Apple Mail Privacy Protection problem

Since iOS 15 (September 2021), Apple Mail pre-fetches images and tracking pixels for all emails, generating false "opens." This affects roughly 50-60% of consumer email audiences.

**Impact on A/B testing:**
- Open rate tests still work, but the signal is noisier
- You need larger sample sizes to detect real differences
- Consider using click rate as your primary metric if your audience skews Apple
- Never rely solely on open rate for cold or marketing email A/B tests

---

## Testing programs (not just tests)

One-off tests are useful. A systematic testing program compounds learning.

### Building a testing roadmap

Run tests in this order for maximum learning:

1. **Subject line framework** (month 1-2) - Test 4-6 subject line approaches (question, number, personalized, curiosity, benefit, urgency). Find your top 2-3 frameworks.
2. **Send time optimization** (month 2-3) - Test 3-4 send windows. This is audience-specific - there's no universal best time.
3. **CTA optimization** (month 3-4) - Test button copy, placement, and number of CTAs.
4. **Content structure** (month 4-5) - Test email length, format (text-heavy vs image-heavy), and content hierarchy.
5. **Personalization depth** (month 5-6) - Test what level of personalization actually moves the needle.

### Documenting and applying learnings

After each test, record:

- What you tested and why
- Sample size per variant
- Duration
- Results (with confidence intervals)
- Whether the result was statistically significant
- What you'll do differently going forward

Without documentation, you'll re-run the same tests or, worse, make changes that contradict what you've already learned.

---

## Common mistakes

### 1. Calling a winner too early

The single most common mistake. After 200 sends, variant B has a 25% open rate vs variant A's 20%. "B wins!" No - with 200 sends, that 5-point difference is well within the margin of error. You need thousands of observations for open rate tests.

**Fix:** Calculate your required sample size before starting. Don't look at results until you've reached it.

### 2. Testing with too little volume

If your list is under 1,000 contacts, most A/B tests are statistically meaningless. You won't have enough data to distinguish a real effect from noise.

**Fix:** For small lists, skip formal A/B tests. Instead, make bigger, bolder changes between campaigns and observe trends over time. Or batch multiple campaigns together to accumulate sample size.

### 3. Testing too many variables at once

Changing the subject line, CTA, images, and send time simultaneously. When variant B wins, you don't know which change caused it.

**Fix:** One variable per test. Always.

### 4. Ignoring the "losing" variant's data

Variant A loses. You archive it. But variant A might have outperformed on a secondary metric (lower unsubscribes, higher reply rate) or performed better in a specific segment.

**Fix:** Analyze test results by segment (mobile vs desktop, new subscribers vs long-term, engagement level). A "loser" overall might be a winner for a subset.

### 5. Not accounting for Apple MPP in open rate tests

If 50% of your audience uses Apple Mail, your open rate data includes a large number of phantom opens. This dilutes real differences and makes tests harder to call.

**Fix:** Filter Apple Mail opens from your analysis if your ESP supports it, or use click rate as your primary metric.

### 6. Using "auto-winner" without understanding how it works

Most ESP "auto-winner" features send to a test subset (10-20%), wait a fixed time (often just 2-4 hours), and send the "winner" to the rest. Two hours is nowhere near enough time for reliable results.

**Fix:** If you use auto-winner, set the wait time to at least 24 hours. Better yet, set it to 48 hours. If your ESP doesn't allow a long enough wait, run the test manually.

### 7. Treating every campaign as a separate experiment

Testing "Sale ends today!" vs "Last chance - 24 hours left" is not a reusable learning. It's a one-off optimization.

**Fix:** Test frameworks and patterns, not specific copy. Test "urgency vs curiosity" as a subject line approach, then apply the winner to future campaigns with different specific copy.

### 8. Never running holdout tests

You're optimizing variant A vs B, but never asking "should we be sending this email at all?"

**Fix:** Run a holdout test on your main email programs at least once per quarter.

### 9. Ignoring send volume distribution across variants

If you send variant A to 1,000 people and variant B to 10,000 people, the test is not valid even if you set it up as 50/50. Technical issues (send failures, bounce spikes, ESP throttling) can create uneven distribution.

**Fix:** Always verify actual send counts per variant before analyzing results. If the split is more than 5% off from your target, investigate before drawing conclusions.

### 10. P-hacking by choosing your metric after the test

Variant B didn't win on open rate, but it won on click-to-open rate! Let's call that the winner. This is cherry-picking and dramatically inflates false positives.

**Fix:** Declare your primary metric before the test starts. Secondary metrics are informational, not decision-making.

---

## Platform implementation notes

Most email service providers (ESPs) have built-in A/B testing. When evaluating tools, look for:

- **Deterministic assignment** - Same recipient always gets same variant (hash-based, not random per-send)
- **Weighted variant support** - Ability to split traffic unevenly (e.g., 80/20 for risky changes)
- **Holdout groups** - Native support for suppressing a control group from all sends
- **Statistical significance reporting** - Confidence intervals and p-values, not just "winner" badges
- **Configurable wait times** - Auto-winner that lets you set 24-48 hour windows, not just 2-4 hours
- **Segment-level results** - Break down results by audience segment, not just aggregate

[molted.email](https://molted.email) implements deterministic hash-based variant assignment with weighted buckets, holdout group support, and two-proportion z-test significance testing with 95% confidence intervals. Experiments are tied to journey steps, so variant assignment persists across a sequence rather than randomizing per-send.

---

## References

- [Evan Miller's Sample Size Calculator](https://www.evanmiller.org/ab-testing/sample-size.html) - The standard free tool for calculating required sample sizes
- [Statsig A/B Test Calculator](https://www.statsig.com/calculator) - Sample size and significance calculator
- [Optimizely Sample Size Calculator](https://www.optimizely.com/sample-size-calculator/) - Another widely-used calculator
- [CXL - 12 A/B Testing Mistakes](https://cxl.com/blog/12-ab-split-testing-mistakes-i-see-businesses-make-all-the-time/) - Common pitfalls with real examples
- [Litmus - Email A/B Testing Guide](https://www.litmus.com/blog/email-ab-testing-how-to) - Email-specific testing best practices
- [Braze - Multi-Armed Bandit vs A/B Testing](https://www.braze.com/resources/articles/multi-armed-bandit-vs-ab-testing) - When to use adaptive algorithms
- [Rejoiner - Measuring Email Lift with Holdout Tests](https://www.rejoiner.com/resources/measure-true-profitability-email-campaigns-using-holdout-tests) - Holdout group methodology
- [Apple Mail Privacy Protection FAQ](https://support.apple.com/en-us/102051) - Impact on email tracking
