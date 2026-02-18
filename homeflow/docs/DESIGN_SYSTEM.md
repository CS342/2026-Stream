# HomeFlow Design System

## Overview

The HomeFlow design system is inspired by the SchoolKit app and provides a cohesive, polished UI with Stanford Cardinal branding. All components use centralized design tokens from `constants/design-tokens.ts`.

## Quick Start

```typescript
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '@/constants/design-tokens';
import { PrimaryButton, InfoCard, StatCard, DecorativeBackground } from '@/components/ui';
```

---

## Design Tokens

### Colors

**Primary Colors (Stanford Cardinal)**
- `COLORS.primary`: `#8C1515` - Main brand color
- `COLORS.primaryLight`: `#B83A4B` - Lighter variant
- `COLORS.primaryDark`: `#6B0F0F` - Darker variant

**Text Colors**
- `COLORS.textDark`: `#2D2D44` - Primary text, headings
- `COLORS.textMuted`: `#6B6B85` - Secondary text
- `COLORS.textLight`: `#8E8EA8` - Tertiary text, captions

**Background Colors**
- `COLORS.white`: `#FFFFFF` - Card backgrounds
- `COLORS.backgroundLight`: `#FFF5F5` - Light cardinal tint
- `COLORS.appBackground`: `#FFFBFB` - Main screen background

**Functional Colors**
- `COLORS.healthData`: `#0EA5E9` - Health/fitness data
- `COLORS.survey`: `#F59E0B` - Surveys/questionnaires
- `COLORS.progress`: `#22C55E` - Progress indicators

### Typography

All presets include `fontSize` and `fontWeight`:

```typescript
<Text style={{ ...TYPOGRAPHY.h1, color: COLORS.textDark }}>Title</Text>
```

| Preset | Size | Weight | Usage |
|--------|------|--------|-------|
| `display` | 44 | 800 | Hero text |
| `screenTitle` | 38 | 800 | Tab screen titles |
| `h1` | 30 | 800 | Page titles |
| `sectionTitle` | 28 | 800 | Section headings |
| `h2` | 24 | 700 | Secondary headings |
| `body` | 18 | 600 | Body text |
| `button` | 19 | 800 | Button labels |
| `caption` | 14 | 600 | Small labels |

### Shadows

Pre-configured shadow objects for elevation:

```typescript
<View style={[styles.card, SHADOWS.card]} />
```

| Shadow | Usage |
|--------|-------|
| `SHADOWS.card` | Standard cards |
| `SHADOWS.button` | Primary buttons |
| `SHADOWS.header` | Screen headers |
| `SHADOWS.cardLarge` | Large feature cards |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `SPACING.screenPadding` | 24 | Screen edge padding |
| `SPACING.sectionGap` | 24 | Gap between sections |
| `SPACING.itemGap` | 14 | Gap between items |
| `SPACING.smallGap` | 8 | Small spacing |
| `SPACING.xs` | 4 | Minimal spacing |

### Gradients

All gradients use 2-3 color stops:

```typescript
<LinearGradient colors={[...GRADIENTS.primaryButton]} />
```

| Gradient | Colors | Usage |
|----------|--------|-------|
| `primaryButton` | Cardinal red gradient | Primary action buttons |
| `screenBackground` | Subtle light gradient | Screen backgrounds |
| `healthData` | Blue gradient | Health data features |
| `survey` | Amber gradient | Survey features |

### Animation

Spring physics configs for `react-native-reanimated`:

```typescript
scale.value = withSpring(1, ANIMATION.springBouncy);
```

| Config | Damping | Stiffness | Usage |
|--------|---------|-----------|-------|
| `springBouncy` | 20 | 180 | Bouncy interactions |
| `springSmooth` | 22 | 120 | Smooth transitions |

**Delays:**
- `entranceDelay`: 80ms - Base entrance delay
- `staggerDelay`: 100ms - Stagger between list items
- `fastStaggerDelay`: 50ms - Fast stagger for grids

---

## Components

### PrimaryButton

Gradient button with spring animation and inner glow effect.

```typescript
<PrimaryButton
  title="Continue"
  icon="arrow-forward"
  onPress={() => console.log('Pressed')}
  disabled={false}
/>
```

**Features:**
- Linear gradient background
- Inner white border (glow effect)
- Spring scale animation on press
- Optional icon
- Disabled state with muted colors

### InfoCard

Animated card for navigational items with icon, text, and badge.

```typescript
<InfoCard
  title="Daily Survey"
  subtitle="Complete your symptom tracking"
  icon="clipboard-outline"
  color={COLORS.survey}
  badge="Due Today"
  onPress={() => navigate('/survey')}
  index={0}
/>
```

**Features:**
- Staggered entrance animation
- Gradient icon circle
- Optional subtitle and badge
- Chevron indicator
- Scale animation on press

### StatCard

Small card displaying a statistic with icon and label.

```typescript
<StatCard
  label="Days Active"
  value="12"
  icon="calendar"
  color={COLORS.primary}
  index={0}
/>
```

**Features:**
- Compact design for grid layouts
- Gradient icon circle
- Staggered entrance animation
- Perfect for 3-column layouts

### DecorativeBackground

Gradient background with animated decorative circles.

```typescript
<DecorativeBackground variant="home" gradientColors={GRADIENTS.screenBackground}>
  {children}
</DecorativeBackground>
```

**Features:**
- Optional gradient background
- Animated floating circles
- Variants: `home`, `screen`
- Non-interactive (pointerEvents: none)

---

## Utility Functions

### withOpacity(color, opacity)

Adds opacity to hex colors:

```typescript
backgroundColor: withOpacity(COLORS.primary, 0.1) // #8C15151A
```

### getGradientForColor(color)

Returns appropriate gradient for a color:

```typescript
const gradient = getGradientForColor(COLORS.healthData);
```

---

## Usage Examples

### Standard Screen Layout

```typescript
<DecorativeBackground variant="home" gradientColors={GRADIENTS.screenBackground}>
  <SafeAreaView style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ padding: SPACING.screenPadding }}>
      <Text style={{ ...TYPOGRAPHY.h1, color: COLORS.textDark }}>
        My Screen
      </Text>
      
      <InfoCard
        title="Action Item"
        icon="star"
        color={COLORS.primary}
        onPress={() => {}}
        index={0}
      />
    </ScrollView>
  </SafeAreaView>
</DecorativeBackground>
```

### Stats Grid

```typescript
<View style={{ flexDirection: 'row', gap: SPACING.itemGap }}>
  <StatCard label="Total" value="42" icon="trophy" color={COLORS.primary} index={0} />
  <StatCard label="Active" value="12" icon="flame" color={COLORS.survey} index={1} />
  <StatCard label="Done" value="98%" icon="checkmark" color={COLORS.progress} index={2} />
</View>
```

---

## Design Principles

1. **Consistent Spacing**: Use tokens, not magic numbers
2. **Bold Typography**: Heavy weights (700-800) for hierarchy
3. **Subtle Shadows**: Low opacity (0.06-0.12) for depth
4. **Thick Borders**: 2-3px borders in subtle colors
5. **Animated Interactions**: Spring physics on all touches
6. **Staggered Entrances**: Delay list items for polish
7. **Gradient Depth**: Multi-stop gradients over flat colors

---

## Migration from Old Theme

**Before:**
```typescript
import { Colors, Spacing } from '@/constants/theme';
backgroundColor: Colors.light.buttonBackground
```

**After:**
```typescript
import { COLORS, SPACING } from '@/constants/design-tokens';
backgroundColor: COLORS.primary
```

The old `theme.ts` is preserved for backward compatibility but new code should use `design-tokens.ts`.
