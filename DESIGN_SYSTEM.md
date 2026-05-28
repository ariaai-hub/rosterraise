# RosterRaise Design System

## Brand Colors
```
--red:        #E63946   (primary accent, CTAs)
--red-dark:   #9B1C1C   (hover states)
--black:      #0A0A0A   (primary background, nav)
--white:      #FFFFFF   (primary text on dark)
--off-white:  #F5F5F5   (section backgrounds)
--dark-card:  #141414   (card backgrounds on light)
--gray-light: #E5E5E5   (borders, dividers)
--gray:       #9CA3AF   (secondary text)
--gray-dark:  #4B5563   (muted text)
```

## Typography
- **Headlines**: `Oswald`, sans-serif — bold, uppercase, high impact
- **Body**: `Inter`, sans-serif — clean, readable, professional
- **Fallbacks**: system-ui, -apple-system, sans-serif

## Spacing Scale
- xs: 8px | sm: 16px | md: 24px | lg: 40px | xl: 60px | 2xl: 80px

## Nav Bar
- Background: `--black`
- Min-height: 100px
- Padding: 20px 40px
- Logo: Text-based (Oswald 32px bold), "ROST" white / "RAI$E" red stacked
- Sticky positioning

## Footer
- Background: #060606
- Logo: Same text treatment, scaled to 22px

## Form Inputs (MANDATORY — never mismatch)
- Background: #1A1A1A
- Border: 1px solid #2A2A2A
- Text: var(--red) #E63946
- Placeholder: #E63946 at 50% opacity
- Label: uppercase, 12px, var(--red), font-weight 600
- Font: Inter
- Border-radius: 6px
- Padding: 14px 16px

## Buttons
- Primary: var(--red) background, white text, Oswald 14px uppercase
- Border-radius: 4px
- Padding: 12px 24px
- Hover: var(--red-dark), translateY(-1px)

## Cards
- Background: var(--dark-card) #141414
- Border: 1px solid #1E1E1E
- Border-radius: 8px
- Padding: 24px

## Tracking (NOT YET CONFIGURED — placeholder only)
- Google Analytics 4: G-XXXXXXXXXX (placeholder — needs real ID)
- Meta Pixel: needs real Pixel ID
- Both codes are in all three pages, ready to activate once IDs are provided

## Component Checklist (verify on every page)
- [ ] Nav with text logo (ROST / RAI$E)
- [ ] "No Credit Card — Ever" badge in nav
- [ ] Dark background sections
- [ ] Form inputs: #1A1A1A bg, red text, red labels, placeholder #555
- [ ] Footer with text logo
- [ ] All links use .html extension
- [ ] HTTP 200 on all pages
- [ ] Google Analytics placeholder in <head>
- [ ] Meta Pixel placeholder in <head>