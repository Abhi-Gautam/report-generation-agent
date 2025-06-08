# Theme Guidelines - Light/Dark Mode Support

## 🎨 Design System Overview

This project uses a semantic design token system with CSS custom properties for automatic light/dark theme support. All UI components must use semantic tokens instead of hardcoded colors.

## ✅ ALWAYS USE - Semantic Design Tokens

### Backgrounds
```tsx
bg-background    // Main app background
bg-card         // Card/modal backgrounds  
bg-popover      // Popover/dropdown backgrounds
bg-muted        // Subtle background areas
bg-accent       // Accent backgrounds
bg-secondary    // Secondary backgrounds
bg-primary      // Primary backgrounds
```

### Text Colors
```tsx
text-foreground         // Primary text color
text-muted-foreground   // Secondary/muted text
text-card-foreground    // Text on card backgrounds
text-primary-foreground // Text on primary backgrounds
text-accent-foreground  // Text on accent backgrounds
text-destructive        // Error/destructive text
```

### Borders & Inputs
```tsx
border-border    // Standard borders
border-input     // Form input borders
bg-input        // Input backgrounds (if needed)
focus:ring-ring // Focus ring color
```

### Interactive States
```tsx
bg-primary text-primary-foreground           // Primary buttons
bg-secondary text-secondary-foreground       // Secondary buttons  
bg-accent text-accent-foreground            // Accent elements
bg-destructive text-destructive-foreground  // Destructive actions
bg-muted text-muted-foreground              // Muted elements
```

## ❌ NEVER USE - Hardcoded Colors

```tsx
// DON'T: These break dark mode
bg-white, bg-gray-50, bg-gray-100
text-gray-900, text-gray-700, text-gray-600
border-gray-300, border-gray-200
bg-red-50, text-red-800, bg-blue-100
```

## 🔧 Quick Reference Mapping

| ❌ Hardcoded | ✅ Semantic Token |
|-------------|------------------|
| `bg-white` | `bg-card` |
| `text-gray-900` | `text-foreground` |
| `text-gray-700` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `border-gray-300` | `border-border` |
| `border-gray-200` | `border-input` |
| `bg-red-50` | `bg-destructive/10` |
| `text-red-800` | `text-destructive` |
| `bg-blue-50` | `bg-accent/10` |

## 📋 Pre-Flight Checklist

Before committing any UI changes, verify:

- [ ] No hardcoded `bg-white`, `bg-gray-*` backgrounds
- [ ] No hardcoded `text-gray-*` text colors
- [ ] No hardcoded `border-gray-*` borders
- [ ] Forms use `bg-background`, `border-input`, `text-foreground`
- [ ] Modals use `bg-card` with `border-border`
- [ ] Error states use `bg-destructive/10` and `text-destructive`
- [ ] Component works in both light and dark themes

## 🎯 Implementation Examples

### ✅ Good - Themed Modal
```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-card rounded-lg p-6 border border-border">
    <h2 className="text-xl font-semibold text-foreground">Title</h2>
    <p className="text-muted-foreground">Description</p>
    
    <input 
      className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      placeholder="Enter text..."
    />
    
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
      <p className="text-destructive">Error message</p>
    </div>
  </div>
</div>
```

### ❌ Bad - Hardcoded Colors
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50">
  <div className="bg-white rounded-lg p-6 border border-gray-300">
    <h2 className="text-xl font-semibold text-gray-900">Title</h2>
    <p className="text-gray-600">Description</p>
    
    <input 
      className="border border-gray-300 text-gray-700"
      placeholder="Enter text..."
    />
    
    <div className="bg-red-50 border border-red-200">
      <p className="text-red-800">Error message</p>
    </div>
  </div>
</div>
```

## 🔗 Related Files

- `frontend/src/app/globals.css` - CSS custom properties definition
- `frontend/tailwind.config.js` - Tailwind theme configuration
- `frontend/src/components/header.tsx` - Theme toggle implementation

## 🧪 Testing Themes

1. Use the theme toggle in the header to switch between light/dark
2. Verify all UI elements maintain proper contrast and readability
3. Check that custom components respect the theme system
4. Ensure no elements appear broken or invisible in either theme

---

**Remember: Always use semantic design tokens for automatic light/dark theme compatibility!**