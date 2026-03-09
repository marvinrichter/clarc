# GitHub Discussions — Setup Guide

This document defines the structure for clarc's GitHub Discussions community.

## Enabling Discussions

In the GitHub repository settings:
1. Go to **Settings → General → Features**
2. Enable **Discussions**
3. Set the default discussion category to **Q&A**

---

## Category Structure

### 📣 Announcements
**Description:** New releases, important changes, and project updates from the maintainers.
**Format:** Announcement
**Who can post:** Maintainers only
**Examples:**
- clarc v1.0.0 released
- Breaking change in hooks API
- New language rule sets available

### 💡 Ideas
**Description:** Feature requests, workflow suggestions, and ideas for new agents, skills, or commands. Vote on what should be built next.
**Format:** Open-ended discussion
**Who can post:** Everyone
**Examples:**
- "Would love a /standup command that summarizes yesterday's commits"
- "Idea: clarc-way for data engineering workflows"

### 🙋 Q&A
**Description:** Questions about using clarc — installation, commands, agents, skills, hooks. Mark answers as helpful.
**Format:** Q&A (answers can be marked as the solution)
**Who can post:** Everyone
**Examples:**
- "How do I run /tdd in a Python project?"
- "hooks.json not loading after update"
- "Can I use clarc with Cursor?"

### 🎯 Show & Tell
**Description:** Share your clarc workflows, custom skills, agents, and commands. What have you built with clarc? How do you use it in your team?
**Format:** Open-ended discussion
**Who can post:** Everyone
**Examples:**
- "I built a custom /deploy command for my team"
- "How I use clarc for daily code reviews at a 10-person startup"
- "My personal skill for Django + Celery patterns"

### 🌍 Community Patterns
**Description:** Proven clarc workflows contributed by the community. These may eventually be promoted into official skills or commands.
**Format:** Open-ended discussion
**Who can post:** Everyone
**Examples:**
- "clarc Way for mobile: iOS + Android parallel development"
- "Using clarc with a monorepo"
- "clarc for solo developers vs. teams"

### 🐛 Bugs
**Description:** Found a bug? Please use [GitHub Issues](https://github.com/marvinrichter/clarc/issues) instead — this category links there.
**Format:** Redirect to Issues
**Note:** Keep Discussions for ideas and questions; bugs go to Issues for tracking.

---

## Moderation Guidelines

- Be welcoming to new users — many are new to structured AI workflows
- Close questions once answered (mark solution in Q&A)
- Move bug reports from Discussions to Issues
- Promote high-quality community patterns to the official skills backlog
- Pin important announcements in the Announcements category

---

## Pinned Discussions (create on launch)

1. **Welcome to clarc!** (Announcements) — introduction, links to quickstart and wiki
2. **What are you building with clarc?** (Show & Tell) — seed community engagement
3. **Read before posting** (Q&A) — link to /doctor, installation guide, FAQ
