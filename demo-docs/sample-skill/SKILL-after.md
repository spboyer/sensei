---
name: sample-skill
description: "**UTILITY SKILL** - Read, write, copy, delete, and list local files. WHEN: \"read file contents\", \"copy a file\", \"list a directory\"."
---

# Sample Skill

Use available file tools for the requested local operation. Confirm the target
path and intended result before acting; report tool failures explicitly.

## Operations

| Operation | Description |
|-----------|-------------|
| Read | Get file contents with encoding detection |
| Write | Create or overwrite files |
| Copy | Duplicate files or directories |
| Delete | Remove files with confirmation |
| List | Show directory contents |
| Exists | Check if path exists |

## Safety

- Confirms before destructive operations
- Ask before overwriting existing content
- Preserve unrelated files and respect repository access restrictions
