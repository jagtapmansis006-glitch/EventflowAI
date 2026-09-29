
# ⚡ EventflowAI

<p align="center">
  <b>Real-Time AI Venue Orchestration & Crowd Control Platform</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/OpenCV-Computer_Vision-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" alt="OpenCV" />
  <img src="https://img.shields.io/badge/Supabase-Database-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>



## 📌 Overview

**EventflowAI** is an end-to-end venue orchestration system built for high-density, large-scale event management[cite: 2]. By combining **Computer Vision analytics**, **AI-driven voice control**, and **real-time spatial telemetric maps**, it empowers event administrators to proactively control crowd movement, prevent bottlenecks, and execute rapid incident response[cite: 2].

---

## ✨ Core Features

* **🎙️ Hands-Free Voice Assistant:** Execute instant operational commands (*"Open Gate 3"*, *"What is the current crowd count?"*) via Speech Synthesis and NLP[cite: 2].
* **🗺️ Spatial Command Center:** Live interactive dashboard tracking crowd density across zones, active queues, flow rates, and high-priority alerts[cite: 2].
* **🚧 Dynamic Gate & Route Management:** Remotely open/close gates and reroute venue pathways in real time to balance crowd distribution[cite: 2].
* **🧪 Predictive Scenario Simulations:** Test operational adjustments inside a virtual environment before applying changes live on the floor[cite: 2].
* **🔐 Tiered Role-Based Access (RBAC):** Granular privilege delegation for `EVENT_ADMIN` operators vs. global `SUPER_ADMIN` system managers[cite: 2].
* **📋 Immutable Audit Trail:** Complete logging of system events, operator overrides, and voice command histories for post-event analytics[cite: 2].

---

## 🏗️ System Architecture

```text
               ┌──────────────────────────────────────────────┐
               │         Computer Vision Video Streams         │
               │        (YOLO / OpenCV Density Engine)         │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
┌────────────────────────┐   ┌─────────────────┐   ┌────────────────────────┐
│  Attendee Portal/Web   │   │  REST API & DB  │   │   Admin Command Center │
│ (eventflow-attendee)   │◄─►│ (FastAPI/Node)  │◄─►│   (React / TypeScript) │
└────────────────────────┘   │  & Supabase DB  │   └────────────────────────┘
                             └────────┬────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │   Voice & AI Engine      │
                         │ (Speech / Event Context) │
                         └──────────────────────────┘

```

---

## 📂 Project Structure

```text
EventflowAI/
├── admin_frontend/         # React/TypeScript Command Center Portal
│   ├── src/
│   │   ├── context/        # Global state, voice commands & gate synchronization
│   │   ├── api.ts          # Bearer auth & API fetch client
│   │   └── types.ts        # Event schemas, Audit Records, and User Sessions
│   └── package.json
├── backend/                # Primary REST API (Gate control, voice handlers, audit logs)
├── computervision/         # Video stream processing & object tracking pipelines
├── crowd_project/          # Crowd simulation models & density estimation algorithms
├── eventflow-attendee/     # Attendee mobile/web view
├── superadmin/             # Multi-tenant organization dashboard
├── install_and_run.bat     # Automated Windows dependencies installer
├── run_app.bat             # Single-click local environment launcher
└── README.md

```

---

## 🚀 Quick Start

### 1. Prerequisites

* **Node.js** v18.x or higher
* **Python** 3.10+
* **Git**

### 2. Installation & Setup

```bash
# Clone the repository
git clone [https://github.com/jagtapmansis006-glitch/EventflowAI.git](https://github.com/jagtapmansis006-glitch/EventflowAI.git)
cd EventflowAI

# Configure environment variables (.env)
cp .env.example .env

```

### 3. Running Locally

**Windows (Automated):**

```cmd
install_and_run.bat
run_app.bat

```

**Manual Startup:**

```bash
# Start Backend
cd backend
npm install && npm start

# Start Admin Frontend (New Terminal)
cd admin_frontend
npm install && npm run dev

```

---

## 🛰️️ Core API Snapshot

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/auth/me` | Fetch active user session & assigned scope

 |
| `GET` | `/api/v1/admin/events/:id/overview` | Stream live venue stats, gate status, and alerts

 |
| `PATCH` | `/api/v1/admin/events/:id/gates/:gateId` | Modify gate state (`OPEN` / `CLOSED`)

 |
| `POST` | `/api/v1/admin/events/:id/voice-command` | Process NLP voice commands and return action payloads

 |
| `GET` | `/api/v1/admin/events/:id/audit-logs` | Retrieve real-time operational logs

 |

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

```

```
