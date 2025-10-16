---
argument-hint: [instructions] (optional: "exclude X", "only Y", "with message 'Z'", specific files)
description: Smart commit with logical grouping and optional user instructions
---

# Smart Commit Command

## Purpose
Create feature-complete, stable commits where each commit represents a working, deployable state. Group all related files needed for a feature to work together in a single commit, ensuring no broken builds at any commit point.

## Command Syntax
- `/commit` - Commit all appropriate changes with smart grouping
- `/commit [instructions]` - Commit with specific user instructions

## User Instructions Processing

**Arguments received:** `$ARGUMENTS`

If `$ARGUMENTS` is provided, interpret it as specific instructions and apply throughout the commit process:

**Supported instruction patterns:**
- **Exclusion**: "exclude X", "but not X", "without X"
- **Inclusion only**: "only X", "just X", "include only X"
- **Custom message**: "with message 'X'", "message: X"
- **File-specific**: List specific file paths to commit
- **Scope**: "frontend only", "backend changes", "bug fixes only"
- **Mixed**: Combine patterns like "only frontend but exclude tests"

**Processing logic:**
1. Parse `$ARGUMENTS` for instruction keywords
2. Override default file selection based on instructions
3. Apply custom commit messages if specified
4. Maintain logical grouping within the filtered scope

## Command Instructions

When the user asks you to commit changes, follow this systematic approach:

### 1. Analysis Phase
```bash
git status --porcelain
git diff --name-only
git ls-files --others --exclude-standard
```

**Categorize changes by:**
- **Backend/API**: Express routes, database scripts, server logic
- **Frontend/UI**: Public JS/CSS, components, user interface
- **Database**: Schema updates, migration scripts, data fixes
- **Bug Fixes**: Error handling, calculation fixes, API issues
- **Documentation**: CLAUDE.md, README updates, guides
- **Configuration**: Package.json, environment configs (exclude personal settings)
- **Features**: New functionality, enhancements, user-facing improvements

### 2. Feature-Complete Commit Rules

**✅ ALWAYS Group Together (Single Commit):**
- **ALL files required for a feature to work** (backend + frontend + database + config)
- Database schema changes + migration scripts + application code using those changes
- API routes + frontend components consuming those routes
- Component + styles + logic + tests for that component
- Bug fix + all files needed for the fix + tests validating the fix
- Service layer + API endpoints + UI components for a complete feature
- Configuration changes + code that depends on those configurations

**❌ NEVER Split Across Commits if they depend on each other:**
- Backend API without frontend that uses it (or vice versa)
- Database migration without application code updates
- Partial feature implementation (commit only when feature works end-to-end)
- Service changes without route updates that call them

**✅ Separate Commits ONLY for:**
- Completely independent features (Feature A works without Feature B)
- CLAUDE.md/documentation updates that don't affect code functionality
- Truly standalone bug fixes that don't require other changes

**🚨 CRITICAL RULE: Stability First**
Every commit MUST represent a stable, working state. If someone checks out any commit:
- Application should build without errors
- Features should work end-to-end
- No broken dependencies or missing pieces
- Tests should pass (if applicable)

**🚨 CRITICAL: Configuration Dependencies**
If a feature requires configuration changes (webpack, Next.js config, dependencies, env vars):
- **WRONG:** Commit 1: Feature code, Commit 2: Config changes (app crashes on commit 1)
- **RIGHT:** Commit 1: Config changes + Feature code together (app works)
- **ALSO RIGHT:** Commit 1: Config changes, Commit 2: Feature code (both work independently)
- Example: Canvas module requires webpack externals config - commit them TOGETHER or config FIRST

### 3. Commit Message Format

Use this template:
```
<Type>: <Clear summary in imperative mood>

<Optional detailed description>
- Key change 1
- Key change 2
- Key change 3

<Technical notes if complex>
```

**IMPORTANT:** Do NOT add promotional messages, attribution lines, or signature blocks to commit messages. Keep commit messages professional and focused on the actual changes.

**Types:** `Add`, `Fix`, `Update`, `Remove`, `Refactor`, `Implement`, `Create`

### 4. Staging Strategy (Feature-Complete Grouping)

**For each feature-complete commit:**

1. **Identify Feature Scope:** List ALL files needed for the feature to work
2. **Verify Dependencies:** Ensure no file depends on unstaged changes
3. **Stage Complete Set:**
```bash
git add <all files for complete feature>
git commit -m "$(cat <<'EOF'
<commit message here>
EOF
)"
```

**Example - Suggestions UX Enhancement:**
```bash
# Stage ALL files needed for UX improvements to work
git add src/components/suggestions/MySuggestions.jsx
git add src/components/suggestions/SuggestionsModal.jsx
git commit -m "$(cat <<'EOF'
Enhance suggestions modal UX with animations and accessibility

- Add skeleton loading screens with 300ms minimum display
- Implement pagination (10 items per page)
- Add animated height transitions between tabs
- Add ARIA labels and keyboard navigation (arrow keys)
- Fix cursor pointer on tab buttons

Complete UX upgrade - all features work together.
EOF
)"
```

**Never stage:**
- Personal config files (.claude/settings.local.json)
- IDE-specific files
- Temporary/cache files
- Environment-specific configs (.env files)
- Gitignored directories (node_modules, backups, etc.)

### 5. Feature-Complete Commit Examples

**❌ BAD (File-Centric, Breaks Stability):**
1. `Add database migration for suggestions` (database only - app won't work)
2. `Implement suggestions API endpoints` (backend only - no UI to use it)
3. `Add suggestions modal and UI` (frontend only - no working backend)
4. `Fix rate limiting edge cases` (partial feature)

**✅ GOOD (Feature-Complete, Stable):**
1. `Implement suggestions/feedback system (Phase 6)`
   - Database: prisma schema, migrations
   - Backend: suggestion-service.js, API routes
   - Frontend: SuggestionsModal, SubmitForm, MySuggestions components
   - Auth: AuthContext integration
   - All files needed for feature to work end-to-end

2. `Update project documentation for suggestions feature` (CLAUDE.md)
   - Standalone, doesn't affect code functionality

**Example: Suggestions UX Improvements**
1. `Enhance suggestions modal UX with animations and accessibility`
   - Skeleton loading screens
   - Pagination (10 per page)
   - Animated height transitions
   - ARIA labels for accessibility
   - Cursor pointer on tabs
   - Keyboard navigation
   - All files: MySuggestions.jsx, SuggestionsModal.jsx
   - Complete feature, stable at this commit

**Example: Independent Bug Fixes**
1. `Fix suggestion badge display bug`
   - Change category → type field mapping
   - Add green color for "open" status
   - Update badge rendering logic
   - Files: MySuggestions.jsx
   - Standalone fix, works independently

### 6. Quality Checks (Stability Verification)

Before each commit, verify:
- ✅ **Feature is complete and functional** (all dependencies included)
- ✅ **Application builds without errors** at this commit
- ✅ **No missing pieces** that will come in "next commit"
- ✅ **End-to-end functionality works** (backend + frontend + database if applicable)
- ✅ **Message clearly explains the complete feature/fix**
- ✅ **No unrelated files included**
- ✅ **No personal/local config files** (.env, settings.local.json)

**Stability Test:**
Ask yourself: "If someone checks out this commit, will the application work without errors?"
If the answer is NO, the commit is incomplete - add the missing files.

### 7. Final Report

After committing, provide:
- List of commits created with summaries
- Files changed in each commit
- Any files excluded and why
- Current git status

## Usage Examples

**User says:** "/commit"
**Claude response:** Analyzes git status → Creates 2-4 logical commits → Reports what was done

**User says:** "/commit exclude level editor changes"
**Claude response:** Analyzes git status → Excludes level editor files → Creates commits for remaining changes

**User says:** "/commit only bug fixes"
**Claude response:** Identifies bug fix files → Creates targeted commits only for fixes → Leaves other changes unstaged

**User says:** "/commit with message 'Implement user authentication'"
**Claude response:** Groups auth-related files → Uses custom message → Commits other changes separately

**User says:** "/commit client/js/game.js server/game-logic.js"
**Claude response:** Commits only specified files → Ignores all other changes

**User says:** "/commit frontend only but exclude tests"
**Claude response:** Commits frontend files → Skips test files → Leaves backend changes unstaged

---

This command ensures clean git history with logical commit boundaries and professional commit messages.