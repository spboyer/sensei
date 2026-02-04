---
name: file-utils
description: |
  **UTILITY SKILL** - Perform common file system operations including reading, writing, copying, and listing files.
  USE FOR: "read file contents", "write to file", "list files in directory", "copy file", "delete file", "check if file exists", "get file size".
  DO NOT USE FOR: searching file contents (use grep/search tools), editing code (use code editor), working with git (use git skill), bulk file operations (use shell directly).
---

# File Utils

Handles common file system operations with safety checks.

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
- Respects .gitignore patterns
- Won't overwrite without explicit flag
