# List available commands
default:
    @just --list

# Run all tests
test:
    bun test

# Run tests in watch mode
test-watch:
    bun test --watch

# Install dependencies
install:
    bun install
