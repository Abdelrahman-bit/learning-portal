#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

if [ -n "$GITHUB_PAT" ]; then
  echo "Setting up GitHub Personal Access Token authentication for submodule..."
  # Force git to use the PAT when cloning from GitHub
  git config --global url."https://${GITHUB_PAT}@github.com/".insteadOf "https://github.com/"
else
  echo "Warning: GITHUB_PAT environment variable is not set. Attempting public checkout..."
fi

# Sync submodule URLs and update
git submodule sync
git submodule update --init --recursive --force
echo "Submodule checkout completed successfully!"
