# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian plugin for creating and managing daily, weekly, monthly, quarterly, and yearly notes. Extends Obsidian's native daily notes with additional periodicities. Uses Svelte for UI components.

## Commands

### Development
```bash
# Start dev server (requires .env with vault paths)
yarn dev

# Build for production
yarn build

# Lint
yarn lint

# Fix linting issues
yarn lint:fix
```

### Environment Setup
Development requires a `.env` file with vault paths:
```
TEST_VAULT=/path/to/test-vault
REAL_VAULT=/path/to/real-vault  # optional
REAL=1  # use REAL_VAULT instead of TEST_VAULT
```

The dev build auto-copies plugin files to `.obsidian/plugins/periodic-notes/` in the configured vault.

### Release
```bash
yarn release  # uses standard-version
```

## Architecture

### Core Concepts

**Calendar Sets**: Named configurations that define settings for multiple periodicities (day/week/month/quarter/year). Users can have multiple calendar sets and switch between them. Default set: "Default".

**Granularities**: The time periods supported - `day`, `week`, `month`, `quarter`, `year`. Each has its own format, folder, and template settings.

**Cache System**: `PeriodicNotesCache` maintains an in-memory index of all periodic notes across calendar sets. Matches notes by:
- Filename (using configured date format)
- Frontmatter (e.g., `day: 2022-02-02`)
- Loose date matching (fallback for non-strict formats)

### Key Components

#### `main.ts` - Plugin Entry Point
- Registers commands, ribbon icons, settings tab
- Manages plugin lifecycle
- Provides public API: `openPeriodicNote()`, `createPeriodicNote()`, `getPeriodicNote()`
- Handles settings migration from legacy formats

#### `cache.ts` - PeriodicNotesCache
- Indexes all periodic notes on vault load
- Listens for file create/rename/metadata changes
- Stores metadata: `Map<calendarSetId, Map<filePath, PeriodicNoteCachedMetadata>>`
- Supports exact matches and loose date parsing
- Powers navigation commands (next/previous note)

#### `calendarSetManager.ts` - CalendarSetManager
- Manages active calendar set state
- Provides accessors for formats, configs, enabled granularities
- Handles calendar set renaming
- Migrates from legacy settings formats

#### `commands.ts`
- Defines commands for each granularity (open, next, previous)
- Commands are registered/unregistered based on active calendar set config
- Uses contextual checks (e.g., "next weekly note" only available when viewing a weekly note)

#### `settings/` - Settings UI
- Svelte-based settings interface
- Components for editing calendar sets, formats, templates
- Validation for date formats and folder paths
- Supports multiple calendar sets

#### `timeline/` - Timeline UI
- Svelte component showing related notes in editor gutter
- Displays notes from same period (e.g., all daily notes in a week)

#### `switcher/` - Quick Switchers
- Natural language date navigation (requires nldates-obsidian plugin)
- Calendar set switcher
- Related files switcher (navigate between periodicities)

### Date Format Handling

Uses Moment.js for date parsing/formatting. Key files:
- `constants.ts`: Default formats (`YYYY-MM-DD`, `gggg-[W]ww`, etc.)
- `parser.ts`: Loose date matching for flexible formats
- `utils.ts`: Template transformations (`{{date}}`, `{{title}}`, day-of-week tags)

### Template System

Templates support special tags:
- `{{title}}`: Note title (formatted date)
- `{{date:FORMAT}}`, `{{time:FORMAT}}`: Current date/time
- Day-of-week tags for weekly notes: `{{monday:YYYY-MM-DD}}`
- Templates applied via `applyTemplateTransformations()` in `utils.ts`

## Integration Points

### Calendar Plugin
Listens for `periodic-notes:settings-updated` workspace event. Weekly notes functionality migrated from Calendar plugin to this plugin.

### Natural Language Dates Plugin
Optional integration for date switcher command (uses nldates-obsidian).

### Workspace Events
- `periodic-notes:resolve`: Fired when a periodic note is matched/created
- `periodic-notes:settings-updated`: Fired when settings change

## File Structure

```
src/
├── main.ts                   # Plugin class
├── cache.ts                  # Note indexing system
├── calendarSetManager.ts     # Calendar set state management
├── commands.ts               # Command definitions
├── utils.ts                  # Template transformations, file creation
├── parser.ts                 # Loose date matching
├── types.ts                  # Core types
├── constants.ts              # Default formats
├── settings/                 # Settings UI (Svelte)
│   ├── components/           # Reusable settings components
│   ├── pages/                # Settings page components
│   ├── localization.ts       # Moment locale config
│   └── validation.ts         # Format/path validation
├── timeline/                 # Timeline gutter UI (Svelte)
├── switcher/                 # Quick switcher modals
└── ui/                       # Base UI components (suggest, file-suggest)
```

## Key Data Flow

1. **Startup**: Load settings → Migrate if needed → Initialize cache → Scan vault for periodic notes
2. **File Creation**: User triggers command → Check cache → Create if missing → Apply template → Update cache
3. **Settings Change**: Update settings → Trigger `periodic-notes:settings-updated` → Reset cache → Re-scan vault
4. **Navigation**: User triggers next/prev → Query cache for adjacent note → Open file

## Important Notes

- Uses Obsidian's internal API (not public API) - see `obsidian.d.ts` for custom type declarations
- Moment.js is bundled (not external) - formats use Moment syntax
- Settings are reactive via Svelte stores (`svelte/store`)
- Build uses esbuild with esbuild-svelte plugin
- No test suite currently
