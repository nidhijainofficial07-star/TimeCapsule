# ⏳ TimeCapsule

### Save today. Rediscover tomorrow.

**TimeCapsule** is a private, cloud-connected project archive designed to help developers capture, organize, track, and revisit their development journey — all in one place.

Every project has a story: the original idea, features, bugs, improvements, resources, development sessions, and milestones. TimeCapsule brings all these pieces together so that no important detail gets lost along the way.

---

## 🌐 Live Demo

Try TimeCapsule here:

🔗 https://time-capsule-mkd9.vercel.app/

The application is deployed using Vercel and connected to Supabase for authentication and cloud storage.
## ✨ Features

### 📁 Project Management
- Create and manage multiple projects.
- Store project descriptions, goals, and development details.
- Track project progress and lifecycle.
- Maintain organized project records.

### 💡 Ideas & Quick Capture
- Capture ideas before they disappear.
- Save thoughts, improvements, and future plans.
- Organize ideas for later development.

### 🛠️ Development Tracking
Keep track of the complete development process:
- Features and functionality.
- Bugs and issues.
- Improvements and enhancements.
- Development resources.
- Development sessions and notes.

### 📸 Snapshots & Version History
- Save project snapshots at important milestones.
- Maintain version history.
- Compare project versions.
- Revisit previous stages of development.

### 📅 Timeline & Activity Tracking
- View your development journey chronologically.
- Keep track of important project activities.
- Review changes and milestones over time.

### 🔍 Search & Organization
- Search through your archived project information.
- Access project records in an organized workspace.

### ☁️ Cloud Sync & Authentication
- Secure user authentication with Supabase.
- User-specific cloud archive storage.
- Automatic cloud synchronization.
- Local caching for a smoother experience.
- Sync status indicators.
- User data isolation using Supabase Row Level Security (RLS).

### 📦 Import & Export
- Export your complete archive as JSON.
- Export selected records in supported formats.
- Import previously exported archives.
- Preview imports before applying them.
- Handle duplicates using available import options.

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend UI |
| TypeScript | Type-safe development |
| Vite | Development and build tooling |
| TanStack Router | Application routing |
| Tailwind CSS | Styling |
| Supabase | Authentication and cloud database |
| PostgreSQL | Database |
| Vitest | Testing |

---

## 🏗️ Architecture Overview

TimeCapsule uses a frontend application with a local archive cache and Supabase-backed cloud persistence.

```text
                 TimeCapsule
                      |
             React + TypeScript
                      |
              Application UI
                      |
              Archive Services
                      |
             Local Archive Cache
                      |
                Sync Queue
                      |
               Supabase Auth
                      |
             Supabase Database
                      |
              PostgreSQL + RLS
```

The current cloud persistence layer stores each user's archive in a JSONB record in the `user_archives` table. Additional structured tables are present in the database schema but are not currently the application's primary persistence mechanism.

---



## 🔐 Security & Data Protection

TimeCapsule uses Supabase authentication and Row Level Security to protect user data.

- Authenticated users can access their own archive.
- Database policies restrict access to records belonging to the authenticated user.
- User-specific archive storage prevents one account from accessing another account's archive through the application.
- Environment variables are used for project configuration.

Security policies have been tested for cross-user access scenarios. However, this does not constitute a complete security audit or penetration test.

---

## 🗺️ Future Improvements

Potential areas for future development include:

- Integration of the individual structured database tables.
- Enhanced project analytics and progress insights.
- Advanced version comparison.
- More export formats.
- Improved collaboration capabilities.
- Additional archive organization and filtering options.

---

## 🎯 Vision

TimeCapsule is built around a simple idea:

**Your development journey deserves to be remembered.**

Whether you're working on a college project, building a personal application, experimenting with new technologies, or developing something professionally, TimeCapsule gives you a dedicated space to preserve the process — not just the final result.

Don't just save your projects. Save the journey behind them.

---

## 👩‍💻 Author

**Nidhi Jain**

Computer Engineering Student | Developer

---

## 📄 License

This project is currently available for personal and educational use. A formal open-source license can be added separately.
