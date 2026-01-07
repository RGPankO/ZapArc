#!/bin/bash
# Run expo prebuild in Git Bash environment with proper shasum

# Create shasum wrapper if it doesn't exist
if ! command -v shasum &> /dev/null; then
    echo "Creating shasum wrapper..."
    mkdir -p ~/bin
    cat > ~/bin/shasum << 'EOF'
#!/bin/bash
# shasum wrapper for sha256sum
if [ "$1" = "-a" ] && [ "$2" = "256" ]; then
    shift 2
    sha256sum "$@"
else
    sha256sum "$@"
fi
EOF
    chmod +x ~/bin/shasum
    export PATH="$HOME/bin:$PATH"
fi

# Navigate to project and run prebuild
cd "$(dirname "$0")"

# Delete node_modules/.cache to force fresh artifact download
rm -rf node_modules/.cache

# Run prebuild
npx expo prebuild --clean
