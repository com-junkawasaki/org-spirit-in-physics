#!/bin/bash
set -e

echo "Resolving modify/delete conflicts for MP3 files in _archive directory..."

# Find all modify/delete conflicts for mp3 files
CONFLICT_FILES=$(git ls-files -u | grep "jung-voice-assessment.*\.mp3" | awk '{print $4}' | sort -u)

if [ -z "$CONFLICT_FILES" ]; then
  echo "No MP3 conflicts found. Checking for other conflicts..."
  CONFLICT_FILES=$(git ls-files -u | awk '{print $4}' | sort -u)
  if [ -z "$CONFLICT_FILES" ]; then
    echo "No conflicts found."
    exit 0
  fi
fi

echo "Found $(echo "$CONFLICT_FILES" | wc -l) conflict file(s)"

# Resolve modify/delete conflicts by keeping deletion (ours)
for file in $CONFLICT_FILES; do
  if [[ "$file" == *".mp3" ]] && [[ "$file" == *"_archive"* ]]; then
    echo "Resolving: $file (keeping deletion - file was deleted in current branch)"
    # For modify/delete conflicts, remove from index to keep deletion
    git rm --cached "$file" 2>/dev/null || git rm "$file" 2>/dev/null || echo "  Already resolved or file not found"
  else
    echo "Skipping non-archive MP3 file: $file"
  fi
done

# Stage all resolutions
git add -A

echo ""
echo "Conflicts resolved. Review the changes with 'git status' and commit when ready."
echo "To commit: git commit -m 'chore: resolve conflicts by keeping deletion of archive MP3 files'"

