---
name: template-design
description: Build HTML email templates that render everywhere. Use when designing email layouts, fixing Outlook rendering, implementing dark mode, adding accessibility, or choosing a templating framework.
license: MIT
---

# Template Design

Build HTML email templates that render correctly across every major email client.

## When to use this skill

- Building an HTML email template from scratch
- Debugging rendering issues in Outlook, Gmail, or other clients
- Making an existing template responsive for mobile
- Adding dark mode support to email templates
- Improving email accessibility for screen readers
- Choosing between email frameworks (MJML, React Email, Maizzle)
- Optimizing image-to-text ratio for deliverability
- Template linting is failing or flagging issues

## Related skills

- `email-copywriting` - writing email content that people actually read
- `spam-filter-avoidance` - content patterns that trigger spam filters
- `email-compliance` - legal requirements including unsubscribe links
- `ab-testing` - testing different template variants

---

## The fundamental problem

Email HTML is not web HTML. There are no standards for how email clients render HTML and CSS. Every client does it differently, and the worst offender - Outlook on Windows - uses Microsoft Word's rendering engine, not a browser engine. This means you're building for a fragmented landscape where the rules of web development don't apply.

The core principle: **code for the worst client, enhance for the best.**

## Document structure

Start every email template with this skeleton:

```html
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Email Subject Here</title>
  <!--[if mso]>
  <nso:officedocumentsettings>
    <o:allowpng/>
    <o:pixelsperinch>96</o:pixelsperinch>
  </nso:officedocumentsettings>
  <![endif]-->
  <style>
    /* Reset styles and media queries go here */
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f4f4f4;">
  <!-- Email content -->
</body>
</html>
```

Key points:
- The VML and Office namespaces (`xmlns:v`, `xmlns:o`) are required for Outlook to handle vector graphics and layout settings properly.
- `<meta name="color-scheme">` tells clients that support it (Apple Mail, Outlook on Mac) that your email has both light and dark mode styles.
- The `<!--[if mso]>` conditional comment targets Outlook's Word rendering engine specifically. Use it to fix Outlook-only layout issues.
- Set `<title>` to your subject line - some clients display it in preview tabs.

## Layout: tables are still required

Outlook on Windows uses Word's rendering engine, which does not support `display: flex`, `display: grid`, `float`, or even proper `div`-based layouts. Tables are the only reliable way to achieve multi-column layouts across all clients.

### Basic single-column layout

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4;">
  <tr>
    <td align="center" style="padding: 20px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; max-width: 600px;">
        <tr>
          <td style="padding: 40px 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333;">
            <!-- Content here -->
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

### Two-column layout with mobile stacking

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px;">
  <tr>
    <td style="padding: 0;">
      <!--[if mso]>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600">
      <tr>
      <td valign="top" width="290">
      <![endif]-->
      <div style="display: inline-block; width: 100%; max-width: 290px; vertical-align: top;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding: 10px;">
              <!-- Left column content -->
            </td>
          </tr>
        </table>
      </div>
      <!--[if mso]>
      </td>
      <td valign="top" width="290">
      <![endif]-->
      <div style="display: inline-block; width: 100%; max-width: 290px; vertical-align: top;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding: 10px;">
              <!-- Right column content -->
            </td>
          </tr>
        </table>
      </div>
      <!--[if mso]>
      </td>
      </tr>
      </table>
      <![endif]-->
    </td>
  </tr>
</table>
```

This is the "hybrid" or "ghost table" technique. The outer `div` elements with `display: inline-block` stack naturally on small screens, while the MSO conditional comments provide a fixed-width table layout specifically for Outlook.

### Layout rules

- **Max width: 600px.** This is the de facto standard. Some modern clients support wider, but 600px guarantees no horizontal scrolling.
- **Use `role="presentation"` on every layout table.** This tells screen readers the table is for layout, not data. Critical for accessibility.
- **Never use `<table>` for actual data display without removing `role="presentation"`.** If you're showing tabular data (pricing, order items), use semantic table markup without the role attribute.
- **Avoid rowspan.** It breaks in Outlook. Use nested tables instead.
- **Set both `width` attribute and `max-width` style.** The attribute is for Outlook (which ignores CSS width on tables), the style is for everything else.

## CSS support: what works and what doesn't

### Universally safe CSS properties

These work in all major clients (Gmail, Outlook, Apple Mail, Yahoo):

| Property | Notes |
|----------|-------|
| `color` | Use hex values, not `rgb()` or `hsl()` |
| `background-color` | Same - hex only for maximum compatibility |
| `font-family` | System fonts only for reliable rendering |
| `font-size` | Use `px`, not `em` or `rem` |
| `font-weight` | `bold` or numeric values |
| `font-style` | `normal`, `italic` |
| `text-align` | `left`, `center`, `right` |
| `text-decoration` | `none`, `underline` |
| `line-height` | Use unitless values or `px` |
| `padding` | Works on `td` elements; write out each side separately |
| `border` | Works on `td` and `table` |
| `width`, `height` | On `td`, `table`, `img` |
| `vertical-align` | On `td` |

### Properties that break in Outlook

| Property | Status in Outlook | Workaround |
|----------|-------------------|------------|
| `display: flex` | Ignored | Use tables |
| `display: grid` | Ignored | Use tables |
| `float` | Partially works, unreliable | Use tables |
| `margin` | Partially works on block elements, ignored on `td` | Use `padding` on `td` cells |
| `border-radius` | Ignored | Use VML for rounded corners, or accept square corners in Outlook |
| `background-image` | Ignored on `td`/`div` | Use VML backgrounds (see below) |
| `max-width` | Ignored on `table` | Set both `width` attribute and `max-width` style |
| `gap` | Not supported | Use padding/margin on child elements |
| CSS shorthand (`padding: 10px 20px`) | Partially works | Write each side separately: `padding-top`, `padding-right`, etc. |

### Properties that Gmail strips

Gmail strips `<style>` blocks in some contexts (non-Gmail addresses viewed in Gmail, AMP emails) and is aggressive about removing CSS it doesn't recognize:

- All `@import` rules
- `position` and related properties
- CSS Grid properties (`grid-template-columns`, etc.)
- Flexbox sub-properties (`flex-direction`, `justify-content`, `align-items`)
- CSS custom properties (`--variable-name`)
- `calc()` in any property

**Gmail also truncates emails larger than 102KB of HTML.** If your email is clipped, recipients won't see the footer, unsubscribe link, or CTA at the bottom. Minify your HTML and keep images hosted externally.

### Inline styles are mandatory

Many email clients strip `<style>` tags entirely. Always apply critical styles inline. Use `<style>` blocks as progressive enhancement only - for things like media queries and hover states that only work in clients that support `<style>`.

```html
<!-- Do this -->
<td style="padding: 20px; font-family: Helvetica, Arial, sans-serif; font-size: 16px; color: #333333;">
  Content here
</td>

<!-- Not this -->
<td class="content">Content here</td>
```

Write out CSS properties individually. Avoid shorthand:

```html
<!-- Do this -->
<td style="padding-top: 20px; padding-right: 30px; padding-bottom: 20px; padding-left: 30px;">

<!-- Not this (shorthand is unreliable in some clients) -->
<td style="padding: 20px 30px;">
```

## Responsive design

Over 70% of emails are opened on mobile devices. If your email isn't mobile-friendly, most recipients will delete it immediately.

### Strategy: fluid-hybrid

The most reliable approach combines fluid widths with the ghost table technique shown above. Content flows naturally on small screens without requiring media queries (which Gmail doesn't support for non-Google addresses).

```html
<!-- Outer wrapper: 100% width, centered inner container -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center">
      <!-- Inner container: fixed max-width, fluid on mobile -->
      <div style="max-width: 600px; margin: 0 auto;">
        <!--[if mso]>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
        <tr><td>
        <![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 20px; font-size: 16px; line-height: 1.5;">
              Content scales fluidly
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </div>
    </td>
  </tr>
</table>
```

### Media queries (progressive enhancement)

Use media queries for clients that support them (Apple Mail, iOS Mail, Outlook for Mac, some Yahoo). Don't rely on them as your only responsive strategy.

```html
<style>
  @media only screen and (max-width: 600px) {
    .mobile-full-width {
      width: 100% !important;
      max-width: 100% !important;
    }
    .mobile-padding {
      padding-left: 20px !important;
      padding-right: 20px !important;
    }
    .mobile-hide {
      display: none !important;
      max-height: 0 !important;
      overflow: hidden !important;
    }
    .mobile-text-center {
      text-align: center !important;
    }
    .mobile-font-size {
      font-size: 18px !important;
      line-height: 26px !important;
    }
  }
</style>
```

### Mobile design rules

- **Minimum touch target: 44x44px.** Apple's Human Interface Guidelines and WCAG both specify this. Buttons smaller than this are hard to tap.
- **Body text: 16px minimum.** Anything smaller is hard to read on mobile without zooming.
- **Single column for mobile.** Multi-column layouts should stack vertically on screens under 600px.
- **Full-width buttons on mobile.** Don't make users tap a tiny centered button.

## Dark mode

More than 80% of users have dark mode enabled on at least one device. Your emails need to handle it.

### How clients apply dark mode

There are three categories:

1. **No changes** - Client renders your email as-is (rare).
2. **Partial inversion** - Client changes background colors but leaves other elements alone (Gmail on Android).
3. **Full inversion** - Client inverts colors, adjusts images, and re-renders the email (Apple Mail, Outlook on Mac).

### Declaring dark mode support

Add these meta tags in `<head>`:

```html
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
```

And this CSS:

```html
<style>
  :root {
    color-scheme: light dark;
  }
</style>
```

### Writing dark mode overrides

```html
<style>
  /* For clients that support prefers-color-scheme */
  @media (prefers-color-scheme: dark) {
    .email-body {
      background-color: #1a1a1a !important;
    }
    .email-content {
      background-color: #2d2d2d !important;
      color: #e0e0e0 !important;
    }
    .heading {
      color: #ffffff !important;
    }
    .link {
      color: #6eb5ff !important;
    }
  }

  /* Outlook.com / Outlook App dark mode (uses data attributes) */
  [data-ogsc] .email-body {
    background-color: #1a1a1a !important;
  }
  [data-ogsc] .email-content {
    background-color: #2d2d2d !important;
    color: #e0e0e0 !important;
  }
</style>
```

### Dark mode design rules

- **Avoid pure white (#FFFFFF) and pure black (#000000).** Apple Mail auto-inverts these. Use `#FDFDFD` and `#1a1a1a` instead.
- **Use transparent PNGs for logos** so they sit cleanly on any background color.
- **Add a subtle border or padding around logos** so they don't disappear against dark backgrounds.
- **Test button colors.** A dark blue button on a dark background becomes invisible. Choose colors with enough contrast in both modes.
- **Don't embed text in images.** The text can't be re-colored in dark mode, and will look wrong against the inverted background.

### Dark mode client support

| Client | `prefers-color-scheme` | `[data-ogsc]` | Auto-inversion |
|--------|----------------------|---------------|----------------|
| Apple Mail | Yes | No | Yes (can override) |
| iOS Mail | Yes | No | Yes (can override) |
| Outlook (Mac) | Yes | No | Yes |
| Outlook.com | No | Yes | Partial |
| Outlook (Windows) | No | No | No |
| Gmail (web) | No | No | No |
| Gmail (Android) | No | No | Partial |
| Gmail (iOS) | No | No | Partial |
| Yahoo Mail | No | No | Partial |

## Typography

### System font stacks

Web fonts have limited email support - they work in Apple Mail, iOS Mail, and Outlook on Mac, but not in Gmail, Outlook on Windows, or Yahoo. Always specify a full fallback stack.

```css
/* Sans-serif (recommended for most emails) */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

/* Serif (for editorial / newsletter style) */
font-family: Georgia, 'Times New Roman', Times, serif;

/* Monospace (for code, order numbers) */
font-family: 'Courier New', Courier, monospace;
```

### Using web fonts (progressive enhancement)

If you want to try web fonts, use `@import` or `<link>` in `<head>` with a full fallback stack. Clients that don't support web fonts will use the fallback.

```html
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
</style>

<!-- Then use it with fallbacks -->
<td style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
```

**Note:** Gmail strips `@import` entirely. Only use web fonts if you accept that most Gmail users will see the fallback.

### Typography sizing

| Element | Desktop | Mobile |
|---------|---------|--------|
| Body text | 16px | 16px (minimum) |
| Headings (H1) | 28-32px | 24-28px |
| Headings (H2) | 22-24px | 20-22px |
| Preheader/small text | 12-14px | 14px |
| Button text | 16-18px | 16-18px |

- **Line height:** 1.5 for body text, 1.2-1.3 for headings.
- **Paragraph spacing:** Use `padding-bottom` on `<td>` elements or `margin-bottom` on `<p>` tags (test margin behavior across clients).

## Images

### General rules

- **Host images externally.** Don't use base64-encoded images in email HTML - many clients block them, and they bloat file size.
- **Always include `alt` text.** Many clients block images by default. Alt text ensures recipients understand the email even without images.
- **Set explicit `width` and `height` attributes.** This prevents layout shifting when images load.
- **Use `display: block`** on images to prevent the gap that appears below images in some clients.

```html
<img src="https://cdn.example.com/hero.jpg"
     alt="Product launch announcement"
     width="600"
     height="300"
     style="display: block; max-width: 100%; height: auto; border: 0;"
     />
```

### Retina/HiDPI images

For sharp images on retina displays, export images at 2x the display size and constrain with `width` and `height` attributes:

```html
<!-- Image is 1200x600 actual, displayed at 600x300 -->
<img src="https://cdn.example.com/hero@2x.jpg"
     alt="Product hero image"
     width="600"
     height="300"
     style="display: block; max-width: 100%; height: auto; border: 0;"
     />
```

### Image formats

| Format | Use for | Email support |
|--------|---------|---------------|
| JPEG | Photos, complex images | Universal |
| PNG | Logos, graphics with transparency | Universal |
| GIF | Simple animations, icons | Universal (animated GIFs play in most clients except Outlook on Windows, which shows the first frame) |
| SVG | - | Poor support - avoid in email |
| WebP | - | Partial support - avoid for now |

### Background images

Outlook ignores CSS `background-image`. Use VML (Vector Markup Language) for Outlook with a CSS fallback for everything else:

```html
<td style="background-image: url('https://cdn.example.com/bg.jpg'); background-color: #2d3748; background-size: cover; background-position: center;">
  <!--[if mso]>
  <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px; height:300px;">
    <v:fill type="frame" src="https://cdn.example.com/bg.jpg" color="#2d3748" />
    <v:textbox inset="0,0,0,0">
  <![endif]-->
  <div style="padding: 40px; color: #ffffff;">
    Content over the background image
  </div>
  <!--[if mso]>
    </v:textbox>
  </v:rect>
  <![endif]-->
</td>
```

### Image-to-text ratio and deliverability

Spam filters can't read text inside images. Image-heavy emails look suspicious because spammers historically used image-only emails to bypass keyword-based filters.

**Rules of thumb:**
- Include at least 500 characters of real text (not in images). Research shows that emails with 500+ characters of text pass spam filters regardless of image count.
- Aim for roughly 60% text to 40% images by visual area.
- Never send an image-only email. Even a single-image newsletter needs real text above and below.
- Always add descriptive `alt` text to images - it counts as readable text for some spam filters and helps recipients with images disabled.

## Buttons

Bulletproof buttons work everywhere, including Outlook. The standard approach uses a table with padding:

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="border-radius: 6px; background-color: #2563eb;">
      <a href="https://example.com/action"
         target="_blank"
         style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
        Get Started
      </a>
    </td>
  </tr>
</table>
```

For Outlook, which ignores `border-radius` and sometimes clips padding on links, add VML:

```html
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
  href="https://example.com/action"
  style="height:48px; v-text-anchor:middle; width:200px;"
  arcsize="12%"
  strokecolor="#2563eb"
  fillcolor="#2563eb">
  <w:anchorlock/>
  <center style="color:#ffffff; font-family:Helvetica,Arial,sans-serif; font-size:16px; font-weight:bold;">
    Get Started
  </center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="https://example.com/action" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-family: Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 600;">
  Get Started
</a>
<!--<![endif]-->
```

## Accessibility

Email accessibility matters - roughly 15% of the global population has some form of disability. The European Accessibility Act (EAA), effective in 2025, expands legal requirements for digital accessibility.

### Essential practices

1. **Use semantic heading structure.** Put an `<h1>` in your email for the main topic. Screen reader users navigate by headings - 72% of emails tested lack proper heading structure.

2. **Add `role="presentation"` to layout tables.** Without it, screen readers announce "table with X rows and Y columns" for every layout table.

3. **Write meaningful alt text.** Not "image1.jpg" - describe what the image shows and why it matters. For decorative images, use `alt=""` (empty, not missing).

4. **Use sufficient color contrast.** WCAG requires 4.5:1 contrast ratio for body text and 3:1 for large text (18px+ or 14px+ bold). 51% of emails fail this.

5. **Don't rely on color alone.** Links should be underlined, not just colored differently. Error states should include text, not just red.

6. **Set the `lang` attribute** on the `<html>` tag so screen readers use the correct pronunciation.

7. **Use real text, not images of text.** Screen readers can't read text in images. It also breaks in dark mode, can't be resized, and is invisible when images are blocked.

8. **Logical reading order.** Screen readers follow the HTML source order, not the visual layout. Make sure your HTML reads in a sensible order when stripped of all styling.

### Accessible links

```html
<!-- Do this - descriptive link text -->
<a href="https://example.com/report" style="color: #2563eb; text-decoration: underline;">
  View your monthly report
</a>

<!-- Not this - screen reader says "click here" with no context -->
<a href="https://example.com/report">Click here</a>
```

## Template linting and validation

Production email platforms lint templates before sending. Common automated checks include:

- **Spam phrase detection.** Phrases like "act now", "buy now", "click here", "free money", "guaranteed", "no obligation", "congratulations" raise spam filter scores. These are flagged as warnings.
- **Variable validation.** Used-but-undeclared variables (`{{company}}` in the template but not defined) are errors. Declared-but-unused variables are warnings.
- **Insecure URLs.** Any `href="http://..."` (not HTTPS) is an error. Mixed content triggers security warnings and damages trust.
- **Missing unsubscribe link.** Marketing emails without an unsubscribe link violate CAN-SPAM, GDPR, and the Google/Yahoo 2024 bulk sender requirements. Transactional emails are exempt.

Platforms like [molted.email](https://molted.email) enforce these rules automatically during template creation and block sends when critical lint rules fail.

### HTML sanitization

Email HTML goes through sanitization before sending to strip potentially dangerous content:

- **Allowed tags:** `p`, `br`, `a`, `b`, `i`, `em`, `strong`, `u`, `ul`, `ol`, `li`, `h1`-`h6`, `table`, `thead`, `tbody`, `tr`, `td`, `th`, `img`, `div`, `span`, `blockquote`, `pre`, `code`
- **Stripped automatically:** `<script>`, `<iframe>`, event handlers (`onclick`, `onload`, etc.), hidden elements (`display:none`, `visibility:hidden`, `font-size:0`), invisible Unicode characters, data URIs
- **URL restrictions:** Only `https:` and `mailto:` protocols are allowed in `href` and `src` attributes. `javascript:` and `data:` URIs are stripped.

## Email templating frameworks

If you're writing email templates by hand, consider a framework that handles the cross-client complexity for you.

### MJML

MJML is the most mature email framework. It uses custom tags (`<mj-section>`, `<mj-column>`, `<mj-text>`) that compile to production-ready HTML with all the table-based layout, MSO conditionals, and inline styles handled automatically.

```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text font-size="20px" color="#333333">
          Hello {{name}}
        </mj-text>
        <mj-button background-color="#2563eb" href="https://example.com">
          Get Started
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

**Strengths:** Battle-tested responsive output, built-in components, large community.
**Weaknesses:** Custom markup language (not HTML or JSX), output HTML is verbose.

### React Email

React Email lets you build templates with JSX components. Good developer experience if your team already uses React.

```jsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

export default function WelcomeEmail({ name }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f4f4f4' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Text style={{ fontSize: '20px', color: '#333' }}>
            Hello {name}
          </Text>
          <Button href="https://example.com" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '14px 32px' }}>
            Get Started
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

**Strengths:** Familiar React/JSX syntax, component reuse, TypeScript support, live preview dev server.
**Weaknesses:** Outlook rendering can be poor for complex layouts - some developers report highly unsatisfactory results in Outlook for multi-column designs. Test thoroughly before shipping to B2B audiences.

### Maizzle

Maizzle uses Tailwind CSS to build emails. It compiles Tailwind classes to inline styles and handles email-specific transforms.

**Strengths:** Tailwind developer experience, fine-grained control over output HTML.
**Weaknesses:** Steeper learning curve, smaller community than MJML.

### Framework selection guide

| Situation | Recommendation |
|-----------|---------------|
| B2B audience (Outlook matters) | MJML or hand-coded |
| React team, mostly consumer audience | React Email |
| Tailwind team | Maizzle |
| Simple transactional emails | React Email or hand-coded |
| Complex marketing templates | MJML |
| Maximum control over output | Hand-coded with a boilerplate |

## Testing

### Cross-client testing tools

- **[Litmus](https://litmus.com)** - Previews across 70+ clients, accessibility checks, spam testing. Enterprise pricing (starting around $500/month in 2025).
- **[Email on Acid](https://emailonacid.com)** - Previews across 90+ clients, unlimited testing at all tiers. More affordable than Litmus.
- **[Mailtrap](https://mailtrap.io)** - Email testing sandbox with HTML/CSS analysis. Good for development workflows.
- **[Can I Email](https://caniemail.com)** - Free reference for HTML/CSS support across email clients. The "Can I Use" for email - check here before using any CSS property.

### Manual testing checklist

Test every template in at least these clients, which cover the vast majority of email opens:

1. **Gmail (web)** - Strips `<style>` tags for non-Google addresses, aggressive CSS filtering
2. **Gmail (mobile app)** - Different rendering from web Gmail
3. **Apple Mail (macOS)** - Best CSS support, good baseline
4. **iOS Mail** - Similar to Apple Mail, test touch targets
5. **Outlook 365 (Windows)** - Word rendering engine, the strictest client
6. **Outlook (web)** - Different from Windows Outlook, uses its own rendering
7. **Yahoo Mail** - Media query support but quirky rendering

### What to check in each client

- Does the layout hold or break?
- Do images load with correct sizing?
- Is text readable (size, contrast, color)?
- Do buttons look correct and are they tappable?
- Does the email look acceptable in dark mode?
- Is the email clipped? (Gmail clips at 102KB)
- Does the unsubscribe link work?

## Common mistakes

1. **Using `div`-based layouts without table fallbacks.** Looks great in Apple Mail, completely broken in Outlook. Always use tables for structure, or at minimum the ghost table technique with MSO conditionals.

2. **Relying on `<style>` blocks for critical styles.** Gmail strips them for non-Google recipients. Any style that affects readability must be inline.

3. **Forgetting the plain text version.** Some recipients (and spam filters) prefer or require plain text. Always generate a text alternative. Even if it's a simplified version, it's better than nothing.

4. **Images without alt text.** When images are blocked (many corporate environments do this by default), recipients see broken image icons with no context. Always include descriptive alt text.

5. **Sending image-only emails.** Spam filters flag these aggressively. You need at least 500 characters of real text.

6. **Not testing in Outlook.** "It works in Chrome" means nothing for email. Outlook on Windows uses Word's engine, which is a completely different rendering context.

7. **Using CSS shorthand.** `padding: 10px 20px` may work in some clients but fail in others. Write `padding-top: 10px; padding-right: 20px; padding-bottom: 10px; padding-left: 20px;` for reliability.

8. **Pure white/black backgrounds without dark mode consideration.** Apple Mail auto-inverts #FFFFFF and #000000. Use #FDFDFD and #1a1a1a to keep control over your colors in dark mode.

9. **Exceeding Gmail's 102KB limit.** If your HTML exceeds 102KB, Gmail clips the email with a "View entire message" link. Recipients miss the footer, unsubscribe link, and often the primary CTA. Minify HTML, use external images, and strip unnecessary code.

10. **Using `margin` for spacing on table cells.** Outlook ignores `margin` on `<td>` elements. Use `padding` on `<td>` instead, or create empty spacer `<td>` elements.

## References

- [Can I Email](https://www.caniemail.com/) - HTML and CSS support tables for email clients
- [Litmus Community](https://litmus.com/community) - Email development discussions and solutions
- [Email Markup Consortium - Accessibility Report 2025](https://emailmarkup.org/en/reports/accessibility/2025/) - Data on accessibility issues in real emails
- [MJML Documentation](https://mjml.io/) - MJML framework reference
- [React Email Documentation](https://react.email/) - React Email framework reference
- [Campaign Monitor CSS Guide](https://www.campaignmonitor.com/css/) - CSS support reference for email clients
- [WCAG 2.2 - Color Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) - Accessibility contrast requirements
- [Google/Yahoo Bulk Sender Requirements](https://support.google.com/mail/answer/81126) - Authentication and unsubscribe requirements
