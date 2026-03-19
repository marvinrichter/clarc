# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✓         |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately via one of:

- **GitHub Security Advisories**: [Report a vulnerability](https://github.com/marvinrichter/clarc/security/advisories/new)
- **Email**: marvin@marvinrichter.dev

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You will receive a response within 48 hours. We aim to release a fix within 14 days for confirmed vulnerabilities.

## Scope

clarc is a local developer tool — it installs files into `~/.claude/` and runs scripts locally. It does not operate a server or handle user data. The main security concern is supply chain integrity (malicious content in agents, skills, or hooks).
