# High-level operations

The Git Flow helper's orchestrated operations: cloning a repository with git-flow initialized, synchronizing the base branches, and running the release and hotfix lifecycle with version bumping, README and changelog updates, and tagging.

## Boundary

It does not own the plain branch lifecycle commands, which pass straight through to git-flow without the version ritual.
