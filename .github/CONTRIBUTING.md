# Contributing to CATS (Crawl and Test System)

Thank you for your interest in contributing to CATS! This document provides
guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our
[Code of Conduct](../CODE_OF_CONDUCT.md). We are committed to providing a
welcoming and inclusive environment for all contributors, and we take our
accessibility mission seriously in how we build our community.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in
   [Issues](https://github.com/iamjolly/crawl-and-test/issues)
2. If not, create a new issue using the **Bug Report** template
3. Provide as much detail as possible, including steps to reproduce

### Suggesting Features

1. Check if the feature has already been requested in
   [Issues](https://github.com/iamjolly/crawl-and-test/issues)
2. If not, create a new issue using the **Feature Request** template
3. Clearly describe the feature and its benefits

### Development Workflow

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
4. **Make your changes**
5. **Test your changes**
6. **Commit your changes** using conventional commits
7. **Push** to your fork
8. **Create a Pull Request**

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/crawl-and-test.git
cd crawl-and-test

# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers

# Set up git hooks
npm run prepare
```

### Running the Project

```bash
# Start development server
npm run dev

# Run accessibility crawler
npm start -- -s https://example.com --html

# Run tests
npm test

# Run linting
npm run lint
```

## Code Standards

### JavaScript Style Guide

- Use ES6+ features
- Follow the ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Prefer `const` over `let`, avoid `var`

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(crawler): add support for WCAG 2.2
fix(dashboard): resolve mobile navigation issue
docs(readme): update installation instructions
```

### Testing

- Write tests for new features and bug fixes
- Ensure all tests pass: `npm test`
- Maintain or improve code coverage
- Test accessibility compliance of any UI changes

### Accessibility Requirements

Since CATS is an accessibility testing tool, we hold ourselves to high
standards:

- All UI components must be keyboard navigable
- Proper ARIA labels and roles must be used
- Color contrast must meet WCAG AA standards
- Screen reader compatibility is required
- Test with actual assistive technologies when possible

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all checks pass**:
   - Tests pass
   - Linting passes
   - No security vulnerabilities
4. **Use the PR template** and fill out all relevant sections
5. **Keep PRs focused** - one feature/fix per PR
6. **Respond to feedback** promptly

## Code Review Guidelines

### For Authors

- Self-review your code before submitting
- Ensure CI checks pass
- Respond to feedback constructively
- Update your PR based on suggestions

### For Reviewers

- Be constructive and specific in feedback
- Focus on code quality, security, and accessibility
- Test the changes locally if possible
- Approve when satisfied with the implementation

## Project Structure

```
├── .github/          # GitHub templates and workflows
├── src/
│   ├── core/         # Core crawler functionality
│   ├── servers/      # Dashboard server
│   ├── generators/   # Report generators
│   ├── templates/    # HTML templates
│   ├── styles/       # CSS/SCSS styles
│   └── utils/        # Utility functions
├── public/           # Static assets and generated reports
├── tests/            # Test files
└── docs/             # Documentation
```

## Getting Help

- Check existing [Issues](https://github.com/iamjolly/crawl-and-test/issues)
- Join our [Discussions](https://github.com/iamjolly/crawl-and-test/discussions)
- Read the [Documentation](docs/)

## License

By contributing to CATS, you agree that your contributions will be licensed
under the MIT License.
