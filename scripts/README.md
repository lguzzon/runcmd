# Scripts Directory Documentation

This directory contains comprehensive git-flow management tools and utilities for the RunCmd project. These scripts provide enterprise-grade Git workflow management with automated release and hotfix handling.

## 📁 Directory Structure

```
scripts/
├── git-flow.js          # Main git-flow command handler and utilities
├── commands/            # Individual git-flow command implementations
│   ├── init.js         # Initialize git-flow in repository
│   ├── start.js        # Start new branches (feature, release, hotfix, support)
│   ├── finish.js       # Finish and merge branches
│   ├── publish.js      # Publish branches to remote
│   ├── track.js        # Track remote branches locally
│   ├── delete.js       # Delete branches
│   ├── list.js         # List branches by type
│   └── config.js       # Configuration management
├── lib/                # Shared utility modules
│   ├── version.js      # Version utilities and validation
│   ├── changelog.js    # Changelog generation and management
│   └── prompts.js      # User interaction utilities
└── operations/         # High-level git operations
    ├── sync.js         # Sync main/master & develop branches
    ├── clone.js        # Clone repository with git-flow initialization
    ├── release.js      # Release branch management
    └── hotfix.js       # Hotfix branch management
```

## 🎯 Main Git-Flow Script

### [`git-flow.js`](git-flow.js)

The main entry point for all git-flow operations. This script provides:

- **Command Routing**: Routes commands to appropriate handlers
- **Utility Functions**: Shared git operations and validation
- **Error Handling**: Consistent error reporting and exit codes
- **Help System**: Comprehensive help for all commands

#### Usage

```bash
# Show main help
bun scripts/git-flow.js help

# Initialize git-flow
bun scripts/git-flow.js init

# Start a feature branch
bun scripts/git-flow.js start feature new-auth

# Finish a feature branch
bun scripts/git-flow.js finish feature new-auth
```

#### Available Commands

| Command | Description | Example |
| --------- | ------------- | --------- |
| `help` | Show help message | `git-flow.js help` |
| `install` | Ensure git-flow is available | `git-flow.js install` |
| `init` | Initialize git-flow | `git-flow.js init` |
| `start <type> <name>` | Start new branch | `start feature new-auth` |
| `finish <type> <name>` | Finish branch | `finish feature new-auth` |
| `publish <type> <name>` | Publish to remote | `publish feature new-auth` |
| `track <type> <name>` | Track remote branch | `track feature new-auth` |
| `delete <type> <name>` | Delete branch | `delete feature old-feature` |
| `list [type]` | List branches | `list feature` |
| `config` | Manage configuration | `config --get gitflow.branch.master` |
| `sync` | Sync main branches | `sync --dry-run` |
| `clone <url> [dir]` | Clone with git-flow | `clone https://github.com/user/repo` |
| `release <action>` | Release management | `release start --bump minor` |
| `hotfix <action>` | Hotfix management | `hotfix finish --tag v1.1.1` |

## 🛠️ Command Implementations

### [`commands/init.js`](commands/init.js)

Initializes git-flow in the current repository with default settings.

**Features:**

- Automatic git-flow installation if missing
- Default configuration setup
- Configuration display

**Usage:**

```bash
bun scripts/git-flow.js init
bun scripts/git-flow.js init --dry-run
```

### [`commands/start.js`](commands/start.js)

Starts a new branch of the specified type.

**Supported Types:**

- `feature` - New feature development
- `release` - Release preparation
- `hotfix` - Emergency fixes
- `support` - Long-term support branches

**Features:**

- Branch name validation
- Automatic base branch detection
- Remote tracking setup
- Conflict prevention

**Usage:**

```bash
bun scripts/git-flow.js start feature new-auth
bun scripts/git-flow.js start release v1.2.0
bun scripts/git-flow.js start hotfix critical-fix
```

### [`commands/finish.js`](commands/finish.js)

Finishes and merges a branch according to git-flow conventions.

**Features:**

- Automatic merge strategy selection
- Tag creation for releases and hotfixes
- Remote branch cleanup
- Changelog generation

**Usage:**

```bash
bun scripts/git-flow.js finish feature new-auth
bun scripts/git-flow.js finish release v1.2.0 --tag v1.2.0
bun scripts/git-flow.js finish hotfix critical-fix --tag v1.1.1
```

### [`commands/publish.js`](commands/publish.js)

Publishes a local branch to the remote repository.

**Features:**

- Automatic remote creation
- Force push support
- Progress reporting

**Usage:**

```bash
bun scripts/git-flow.js publish feature new-auth
bun scripts/git-flow.js publish release v1.2.0 --force
```

### [`commands/track.js`](commands/track.js)

Tracks a remote branch locally.

**Features:**

- Remote branch discovery
- Local branch creation
- Tracking setup

**Usage:**

```bash
bun scripts/git-flow.js track feature new-auth
bun scripts/git-flow.js track release v1.2.0
```

### [`commands/delete.js`](commands/delete.js)

Deletes a branch locally and optionally from remote.

**Features:**

- Safe deletion with confirmation
- Remote branch cleanup
- Current branch protection

**Usage:**

```bash
bun scripts/git-flow.js delete feature old-feature
bun scripts/git-flow.js delete release v1.1.0 --remote
```

### [`commands/list.js`](commands/list.js)

Lists branches by type with detailed information.

**Features:**

- Filter by branch type
- Remote branch detection
- Status information
- Color-coded output

**Usage:**

```bash
bun scripts/git-flow.js list                    # List all branches
bun scripts/git-flow.js list feature           # List feature branches
bun scripts/git-flow.js list release           # List release branches
bun scripts/git-flow.js list hotfix            # List hotfix branches
```

### [`commands/config.js`](commands/config.js)

Manages git-flow configuration settings.

**Features:**

- Get configuration values
- Set configuration values
- List all configuration
- Validation and help

**Usage:**

```bash
bun scripts/git-flow.js config --get gitflow.branch.master
bun scripts/git-flow.js config --set gitflow.branch.develop develop
bun scripts/git-flow.js config --list
```

## 🔧 Utility Libraries

### [`lib/version.js`](lib/version.js)

Version management utilities for semantic versioning.

**Functions:**

- `parseVersion(version)` - Parse semantic version
- `compareVersions(v1, v2)` - Compare two versions
- `bumpVersion(version, type)` - Bump version by type
- `isValidVersion(version)` - Validate version format

**Usage:**

```javascript
import { bumpVersion, compareVersions } from './lib/version.js';

const newVersion = bumpVersion('1.2.3', 'minor'); // '1.3.0'
const isGreater = compareVersions('1.3.0', '1.2.0'); // true
```

### [`lib/changelog.js`](lib/changelog.js)

Changelog generation and management utilities.

**Functions:**

- `generateChangelog(commits)` - Generate changelog from commits
- `updateChangelog(file, content)` - Update changelog file
- `parseCommitMessage(message)` - Parse conventional commits
- `formatChangelogEntry(entry)` - Format changelog entry

**Usage:**

```javascript
import { generateChangelog } from './lib/changelog.js';

const changelog = generateChangelog([
  { type: 'feat', scope: 'auth', message: 'Add OAuth2 support' },
  { type: 'fix', scope: 'api', message: 'Fix authentication bug' }
]);
```

### [`lib/prompts.js`](lib/prompts.js)

User interaction utilities for CLI prompts.

**Functions:**

- `promptYesNo(question, defaultYes)` - Yes/No prompt
- `promptText(question)` - Text input prompt
- `promptChoice(question, choices)` - Multiple choice prompt
- `confirmAction(message)` - Confirmation prompt

**Usage:**

```javascript
import { promptYesNo, promptText } from './lib/prompts.js';

const shouldContinue = await promptYesNo('Continue with release?');
const version = await promptText('Enter version number:');
```

## 🚀 High-Level Operations

### [`operations/sync.js`](operations/sync.js)

Synchronizes main branches (master/main and develop) with remote.

**Features:**

- Stash-safe synchronization
- Conflict detection and handling
- Dry-run support
- Progress reporting

**Usage:**

```bash
bun scripts/git-flow.js sync
bun scripts/git-flow.js sync --offline
bun scripts/git-flow.js sync --dry-run
```

### [`operations/clone.js`](operations/clone.js)

Clones a repository and initializes git-flow.

**Features:**

- Repository cloning
- Git-flow initialization
- Directory creation
- Error handling

**Usage:**

```bash
bun scripts/git-flow.js clone https://github.com/user/repo
bun scripts/git-flow.js clone https://github.com/user/repo my-project
```

### [`operations/release.js`](operations/release.js)

Manages release branches with automated version bumping.

**Features:**

- Release branch creation
- Version bumping (major/minor/patch)
- Release notes generation
- Tag creation
- Remote synchronization

**Usage:**

```bash
bun scripts/git-flow.js release start --bump minor
bun scripts/git-flow.js release finish --tag v1.2.0 --message "Release 1.2.0"
```

### [`operations/hotfix.js`](operations/hotfix.js)

Manages hotfix branches for emergency fixes.

**Features:**

- Hotfix branch creation from main/master
- Automatic version bumping
- Emergency release workflow
- Tag creation with custom messages

**Usage:**

```bash
bun scripts/git-flow.js hotfix start --bump patch
bun scripts/git-flow.js hotfix finish --tag v1.1.1 --message "Critical security fix"
```

## 🎨 Design Patterns

### Modular Architecture

The scripts follow a modular design pattern:

1. **Main Handler** (`git-flow.js`) - Command routing and shared utilities
2. **Command Modules** (`commands/`) - Individual command implementations
3. **Utility Libraries** (`lib/`) - Shared functionality
4. **Operations** (`operations/`) - High-level workflows

### Error Handling

Consistent error handling across all scripts:

- **Exit Codes**: 0 for success, 1+ for errors
- **Error Messages**: Clear, actionable error messages
- **Logging**: Structured logging with color coding
- **Validation**: Input validation before operations

### Git Integration

Robust git integration with:

- **Atomic Operations**: Safe git operations with rollback
- **Remote Handling**: Automatic remote branch management
- **Conflict Resolution**: Clear conflict detection and guidance
- **Stash Safety**: Safe operations that preserve uncommitted changes

## 🚀 Usage Examples

### Complete Feature Workflow

```bash
# Start a new feature
bun scripts/git-flow.js start feature user-authentication

# Work on the feature (make commits)

# Publish to remote for collaboration
bun scripts/git-flow.js publish feature user-authentication

# Finish the feature
bun scripts/git-flow.js finish feature user-authentication

# Delete the branch
bun scripts/git-flow.js delete feature user-authentication --remote
```

### Release Management

```bash
# Start release preparation
bun scripts/git-flow.js release start --bump minor

# Work on release (update version numbers, etc.)

# Finish release
bun scripts/git-flow.js release finish --tag v1.2.0 --message "Release 1.2.0"

# Sync with remote
bun scripts/git-flow.js sync
```

### Emergency Hotfix

```bash
# Start hotfix
bun scripts/git-flow.js hotfix start --bump patch

# Apply critical fix

# Finish hotfix
bun scripts/git-flow.js hotfix finish --tag v1.1.1 --message "Security patch"

# Sync immediately
bun scripts/git-flow.js sync
```

## 🔧 Configuration

### Git Flow Configuration

The scripts respect standard git-flow configuration:

```bash
# Check current configuration
bun scripts/git-flow.js config --list

# Set custom prefixes
bun scripts/git-flow.js config --set gitflow.prefix.feature feature/
bun scripts/git-flow.js config --set gitflow.prefix.release release/
```

### Environment Variables

- `CI=true` - Skip interactive prompts in CI environments
- `DEBUG=1` - Enable debug logging
- `GIT_FLOW_AUTO_INSTALL=1` - Auto-install git-flow if missing

## 📚 Integration

### With RunCmd

These scripts integrate seamlessly with the main RunCmd runner:

```bash
# Use with runcmd.sh
./runcmd.sh scripts/git-flow.js start feature new-feature

# Use with custom runners
cp runcmd.sh git-flow.sh
./git-flow.sh start feature new-feature
```

### With CI/CD

The scripts are designed for CI/CD integration:

- **Non-interactive**: Skip prompts in CI environments
- **Exit Codes**: Proper exit codes for pipeline success/failure
- **Logging**: Structured output for CI logs
- **Atomic Operations**: Safe operations that don't leave repositories in broken states

## 🤝 Contributing

When contributing to the scripts:

1. **Follow Patterns**: Use existing patterns and conventions
2. **Error Handling**: Implement proper error handling and validation
3. **Documentation**: Add JSDoc comments for new functions
4. **Testing**: Test thoroughly with various git repository states
5. **Help System**: Update help text for new commands or options

## 📄 License

These scripts are part of the RunCmd project and are licensed under the MIT License.
