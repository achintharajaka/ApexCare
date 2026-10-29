---
name: ApexCare Precision HMS
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f4850'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  bg-canvas: '#F8FAFC'
  bg-surface: '#FFFFFF'
  bg-surface-subtle: '#F1F5F9'
  border-subtle: '#E2E8F0'
  border-strong: '#CBD5E1'
  primary-teal-hover: '#0369A1'
  primary-teal-subtle: '#E0F2FE'
  status-critical: '#EF4444'
  status-critical-bg: '#FEE2E2'
  status-warning: '#F59E0B'
  status-warning-bg: '#FEF3C7'
  status-success: '#10B981'
  status-success-bg: '#D1FAE5'
  status-info: '#3B82F6'
  status-info-bg: '#DBEAFE'
typography:
  display-kpi:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-default:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  badge-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system projects clinical rigor, structural dependability, and mission-critical precision. Designed for hospital administration, emergency triage, electronic medical records (EMR), and high-throughput cashier desks, the aesthetic rejects superficial ornamentation in favor of high-information-density enterprise utility.

The personality balances executive authority with calm, modern healthcare clarity:
- **Clinical Rigor & Confidence**: Dark navy chrome establishes a serious operational framework, while sky-teal primary accents direct focus to core clinical and financial workflows.
- **Ergonomic Density**: Interfaces minimize scroll overhead and cognitive fatigue through disciplined information hierarchies, two-pane operational layouts, and structured data tables.
- **Unambiguous Triage Semantics**: Semantic signaling uses paired high-contrast foregrounds and tinted background fills to communicate patient risk, bed capacity, and billing states instantly without visual vibration.

The aesthetic follows **Corporate / Modern** principles adapted for institutional medical software—crisp 1px slate structural containment, pure white card surfaces against a light workspace canvas, and subtle, low-elevation drop shadows.

## Colors

The color palette is engineered for a high-clarity clinical light mode environment:

- **Primary Actions (`#0284C7`)**: Medical sky teal commands interaction surfaces, primary calls to action, selected active states, and clinical submit triggers. Hover shifts to `#0369A1`, while subtle selections utilize `#E0F2FE`.
- **Structural Chrome & Headers (`#0F172A`)**: Deep slate navy grounds persistent navigation sidebars, high-contrast modal title bars, and heavy display typography.
- **Surfaces & Layers**: `#F8FAFC` forms the muted workspace floor, separating working panes from `#FFFFFF` card, modal, and drawer surfaces. `#F1F5F9` is reserved for table headers, inactive tracks, and neutral tag fills.
- **Dividers & Structural Grids**: Thin structural boundaries use `#E2E8F0` for general separation and `#CBD5E1` for form control boundaries and unselected input strokes.
- **Clinical Semantic Pairing**:
  - **Critical (`#EF4444` / `#FEE2E2`)**: Emergency triage, medication allergies, abnormal lab alerts, and expired items.
  - **Warning (`#F59E0B` / `#FEF3C7`)**: In-consultation indicators, pending diagnostic results, and stock warnings.
  - **Success / Settled (`#10B981` / `#D1FAE5`)**: Paid invoices, finalized reports, and confirmed clinical visits.
  - **Informational (`#3B82F6` / `#DBEAFE`)**: Scheduled bookings and general patient alerts.

## Typography

Typography relies on `Inter` across all structural tiers to maximize legibility across dense medical displays. 

- **Tabular Figures Requirement**: `font-variant-numeric: tabular-nums` must be enabled globally for all medical record numbers (MRNs), vital sign metrics, dosages, lab values, itemized ledgers, and financial values. This eliminates horizontal jitter across scanning paths.
- **Hierarchy Tiers**:
  - `display-kpi` (32px Bold): Used strictly for primary financial metrics (e.g., Net Amount Due) and high-level hospital occupancy metrics.
  - `headline-lg` (24px SemiBold): Primary module and screen titles.
  - `headline-md` (18px SemiBold): Panel sections, split drawer headers, and diagnostic category headings.
  - `body-default` & `body-medium` (14px): The primary baseline for clinical notes, data grid cells, form values, and input text.
  - `badge-sm` (12px Medium): Used within triage tags, status pills, and system timestamps.
  - `caption` (11px Medium): Table column superheaders, uppercase form meta-labels, and audit timestamps.

## Layout & Spacing

The layout is built for high-throughput desktop viewports baseline-tuned to 1440×900, maintaining strict content compartmentalization across horizontal master-detail splits.

- **Fixed Architectural Scaffolding**:
  - Primary Navigation Sidebar: Fixed `260px` width, anchored to the left.
  - Top Application Bar: Fixed `64px` height, anchored to the top.
  - Right Collapsible Context/Calendar Panel: Fixed `300px` width.
- **Split Workspaces**:
  - **Clinical EMR & Cashier Desks**: 60% left-pane (consultation timeline, charge builder) to 40% right-pane (medications, live totals, payment settlement).
  - **Triage & Ward Dashboards**: 65% left-pane (active queue, patient table) to 35% right-pane (vital alerts, ward capacity).
- **Grid & Density Rules**:
  - Layout canvas uses `1.5rem` (24px) outer margin padding.
  - Inter-panel gaps adhere to a strict `1rem` (16px) gutter.
  - Data grid cell padding is compact: vertical padding uses `space-sm` (8px) and horizontal padding uses `space-md` (16px) to maximize row density per screen.

## Elevation & Depth

Visual hierarchy uses crisp 1px borders and disciplined low-opacity shadows. High contrast between the `#F8FAFC` canvas and `#FFFFFF` containers provides primary depth, while drop shadows communicate elevated interactive layers:

- **Flat Container Level (`elevation-0`)**: Static dashboard panels, sidebar, and table structures have no drop shadow; depth is achieved exclusively via `1px solid #E2E8F0`.
- **Card Surface Level (`elevation-1`)**: Standard metric tiles, patient overview panels, and data table containers use `0 1px 3px 0 rgba(0, 0, 0, 0.05)`.
- **Floating Overlays (`elevation-2`)**: Dropdowns, autocompletes, quick date pickers, and tooltips use `0 4px 6px -1px rgba(0, 0, 0, 0.10)`.
- **Modal & Drawers (`elevation-3`)**: Slide-over registration forms, billing settlement trays, and prescription modals use `0 20px 25px -5px rgba(0, 0, 0, 0.10)` paired with a 40% opacity slate overlay (`rgba(15, 23, 42, 0.40)`).

## Shapes

The design system uses moderate rounding to maintain enterprise professionalism without harsh utilitarianism:

- **Base Radius (6px / `rounded-md`)**: Standardized for interactive form inputs, autocomplete menus, native dropdown triggers, primary/secondary action buttons, and segmented control chips.
- **Card & Container Radius (8px / 10px)**: Diagnostic panels, data grid wrappers, and patient profile banners use `8px` (`0.5rem`), while floating modal dialogs and slide-over panels use `10px` (`0.625rem`).
- **Pill Radius (`9999px`)**: Reserved exclusively for status indicators, triage tags, severity pills, allergy alerts, and active patient filter badges.
- **Structural Accents**: Appointment timeline cards feature a solid `3px` left-edge border strip matching their respective status token (e.g., Emerald for Confirmed, Amber for In-Consultation, Red for Cancelled, Blue for Scheduled).

## Components

### Buttons & Interactive Triggers
- **Primary Action**: Solid `#0284C7` fill, white `#FFFFFF` text, `6px` radius, `0 1px 2px 0 rgba(0, 0, 0, 0.05)` shadow. Hover transitions to `#0369A1`. Height: 36px (compact desktop) or 40px (default).
- **Secondary Action**: `#FFFFFF` background, 1px solid `#CBD5E1`, text `#0F172A`. Hover transitions to `#F8FAFC`.
- **Destructive Action**: `#FEE2E2` background, `#EF4444` text, 1px solid transparent. Hover transitions to `#EF4444` background with `#FFFFFF` text.

### Form Inputs & Search Fields
- Baseline text inputs and selects use a height of `38px`, `6px` border radius, `#FFFFFF` background, and `1px solid #CBD5E1`.
- Placeholder text: `#64748B`. Focused state: `1px solid #0284C7` accompanied by a `0 0 0 3px #E0F2FE` focus ring.
- Input icons (e.g., search magnifying glass, calendar triggers) are fixed at 18px stroke icons colored in `#64748B`.

### Status Badges & Severity Chips
- Height: `24px` with a full pill radius (`9999px`), `badge-sm` typography (12px SemiBold), and `0.5rem` horizontal padding.
- Standard pairing:
  - Critical/Allergy: `#EF4444` text on `#FEE2E2` fill.
  - Warning/Pending: `#B45309` text on `#FEF3C7` fill.
  - Success/Settled: `#065F46` text on `#D1FAE5` fill.
  - Scheduled/Info: `#1D4ED8` text on `#DBEAFE` fill.

### Data Tables & Clinical Grids
- **Header**: `#F1F5F9` background, `caption` typography (11px, uppercase, tracking `0.05em`, color `#64748B`), height `36px`, border bottom `1px solid #E2E8F0`.
- **Row Cell**: Height `44px`, `body-default` typography with tabular numbers enabled, border bottom `1px solid #E2E8F0`. Hover state triggers `#F8FAFC` row highlight; active selection applies `#E0F2FE`.

### Cards & Modular Panels
- Surface: `#FFFFFF` fill with `1px solid #E2E8F0` border and `elevation-1` shadow.
- Header: Separated by a `1px solid #E2E8F0` divider, padding `12px 16px`, using `title-sm` (14px SemiBold) navy text (`#0F172A`).
- Content padding: `16px` (`space-md`).

### Checkboxes & Radio Controls
- Custom controls sized at 16×16px with `4px` radius for checkboxes and circular radius for radios.
- Inactive state: `1px solid #CBD5E1` with `#FFFFFF` background.
- Checked state: `#0284C7` background with `#FFFFFF` checkmark/bullet mark.