# Frontend Setup Guide

## Installing Node.js and npm

You need to install Node.js (which includes npm) to run the frontend. Here are the options:

### Option 1: Install via Homebrew (Recommended for macOS)

If you have Homebrew installed:

```bash
brew install node
```

After installation, verify:
```bash
node --version
npm --version
```

### Option 2: Install from Node.js Website

1. Visit https://nodejs.org/
2. Download the LTS (Long Term Support) version for macOS
3. Run the installer
4. Restart your terminal

### Option 3: Install via nvm (Node Version Manager) - Advanced

If you want to manage multiple Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install Node.js LTS
nvm install --lts
nvm use --lts
```

## After Installing Node.js

Once Node.js is installed, you can proceed with the frontend setup:

```bash
cd frontend
npm install
npm run dev
```

## Verify Installation

After installing, verify everything works:

```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
```

## Troubleshooting

- **Command not found after installation**: Restart your terminal or run `source ~/.zshrc`
- **Permission errors**: You may need to use `sudo` with Homebrew (not recommended) or fix npm permissions
- **Version issues**: Make sure you have Node.js 18+ for Next.js 14


