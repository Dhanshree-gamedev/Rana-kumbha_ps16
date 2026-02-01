<div align="center">

# 🎓 CampusConnect

### *Bridging the Gap Between College Students*

[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<br/>

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Student.png" alt="Student" width="120"/>

**A modern social networking platform designed exclusively for college students to connect, learn, and grow together.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Architecture](#️-architecture) • [Installation](#-quick-start) • [Screenshots](#-screenshots)

---

</div>

## 🎯 Problem Statement

> **"College can be overwhelming. Students struggle to find peers with similar interests, miss out on learning opportunities, and feel disconnected from their campus community."**

### The Challenges We Address:

| Challenge | Impact |
|-----------|--------|
| 🔍 **Finding Like-minded Peers** | Students spend years without meeting people who share their interests |
| 📚 **Missed Learning Opportunities** | Workshops and study sessions happen without proper coordination |
| 💬 **Communication Barriers** | No centralized platform for meaningful academic conversations |
| 🎖️ **Lack of Recognition** | Active participation goes unnoticed and unrewarded |
| 🤖 **No Instant Help** | Students struggle to find quick answers about campus resources |

---

## 💡 Our Solution

**CampusConnect** is a comprehensive social networking platform that transforms how college students interact, learn, and grow together.

<div align="center">

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   📱 CAMPUSCONNECT - YOUR CAMPUS, CONNECTED                    │
│                                                                 │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│   │  POST   │  │ CONNECT │  │  LEARN  │  │  EARN   │          │
│   │ Ideas   │─▶│  Peers  │─▶│Together │─▶│ Badges  │          │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

</div>

### ✨ Key Solution Highlights

- **🌐 Unified Platform**: One place for all campus social interactions
- **🤝 Smart Connections**: Connect with peers who share your interests and goals
- **🎓 Interactive Workshops**: Host and join live learning sessions
- **💬 Real-time Chat**: Instant messaging with your connections
- **🤖 AI Assistant**: 24/7 help for navigating the platform
- **🏆 Gamification**: Earn badges for active participation

---

## 🚀 Features

### 📝 Social Feed
- Create text, image, and video posts
- Like and comment on posts
- Discover content from your campus community

### 🤝 Peer Connections
- Send and receive connection requests
- Build your professional network early
- View pending and accepted connections

### 💬 Real-time Messaging
- Private conversations with connections
- Online/offline presence indicators
- Instant message delivery

### 🎓 Live Workshops
- Create and host learning sessions
- Join workshops on topics of interest
- **Live chat during sessions** for real-time interaction
- Attendance tracking and participation rewards

### 🏆 Achievement Badges
- **🌟 First Post**: Make your first post
- **📝 Content Creator**: Create 10+ posts
- **🤝 Connector**: Build 5+ connections
- **🎓 Workshop Attendee**: Participate in workshops
- **🔥 Trending**: Get 50+ likes on a post

### 🤖 AI Campus Assistant
- Powered by advanced AI (OpenRouter)
- Get instant help with platform features
- Academic support and campus guidance
- Available 24/7

### 👤 User Profiles
- Customizable profile with photo
- Display department, year, and bio
- Showcase your badges and achievements
- View activity history

---

## 🛠️ Tech Stack

<div align="center">

### Frontend
| Technology | Purpose |
|:----------:|:--------|
| ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) | UI Library |
| ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) | Build Tool |
| ![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=react-router&logoColor=white) | Navigation |
| ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white) | HTTP Client |
| ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white) | Styling |

### Backend
| Technology | Purpose |
|:----------:|:--------|
| ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) | Runtime |
| ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) | Web Framework |
| ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white) | Database |
| ![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) | Authentication |
| ![Multer](https://img.shields.io/badge/Multer-FF6600?style=flat-square&logo=npm&logoColor=white) | File Uploads |

### AI & External Services
| Technology | Purpose |
|:----------:|:--------|
| ![OpenRouter](https://img.shields.io/badge/OpenRouter-6366F1?style=flat-square&logo=openai&logoColor=white) | AI Chatbot |
| ![Nodemailer](https://img.shields.io/badge/Nodemailer-339933?style=flat-square&logo=gmail&logoColor=white) | Email Service |

</div>

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              CAMPUSCONNECT                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        FRONTEND (React + Vite)                       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │ │
│  │  │   Feed   │ │Workshops │ │ Messages │ │ Profile  │ │ Chatbot  │   │ │
│  │  │   Page   │ │   Page   │ │   Page   │ │   Page   │ │Component │   │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │ │
│  │                              │                                       │ │
│  │                    AuthContext (JWT Token)                           │ │
│  └──────────────────────────────┼───────────────────────────────────────┘ │
│                                 │ HTTP/REST                              │
│  ┌──────────────────────────────▼───────────────────────────────────────┐ │
│  │                     BACKEND (Node.js + Express)                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │                         API Routes                               │ │ │
│  │  │ /auth │ /users │ /posts │ /connections │ /messages │ /workshops │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                │                                      │ │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌───────────────┐  │ │
│  │  │Middleware  │  │   Badge    │  │   Presence  │  │   OpenRouter  │  │ │
│  │  │(Auth/Upload)│  │   System   │  │   System    │  │   AI API      │  │ │
│  │  └────────────┘  └────────────┘  └─────────────┘  └───────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                 │                                        │
│  ┌──────────────────────────────▼───────────────────────────────────────┐ │
│  │                         DATABASE (SQLite)                             │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │ │
│  │  │  Users  │ │  Posts  │ │Messages │ │Workshops│ │ Badges/Presence │ │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Database Schema

| Table | Description |
|-------|-------------|
| `users` | User accounts, profiles, and credentials |
| `posts` | Feed posts with media support |
| `comments` | Post comments and interactions |
| `likes` | Post like tracking |
| `connections` | Peer connection requests and status |
| `messages` | Private conversations |
| `workshops` | Learning session details |
| `workshop_participants` | Workshop enrollment and attendance |
| `workshop_messages` | Live workshop chat |
| `badges` | Achievement definitions |
| `user_badges` | User badge awards |
| `user_presence` | Online/offline status |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Git**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Dhanshree-gamedev/Rana-kumbha_ps16.git
cd Rana-kumbha_ps16

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

```bash
# Terminal 1: Start Backend Server
cd backend
node server.js

# Terminal 2: Start Frontend Dev Server
cd frontend
npm run dev
```

### Access the Application

| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost:5173 |
| 🔌 Backend API | http://localhost:3001/api |
| 📁 Uploads | http://localhost:3001/uploads |

---

## 📂 Project Structure

```
Rana-kumbha_ps16/
├── 📁 backend/
│   ├── 📁 database/         # Database initialization
│   ├── 📁 middleware/       # Auth & upload middleware
│   ├── 📁 routes/           # API route handlers
│   │   ├── auth.js          # Authentication
│   │   ├── posts.js         # Posts CRUD
│   │   ├── users.js         # User management
│   │   ├── connections.js   # Peer connections
│   │   ├── messages.js      # Chat messaging
│   │   ├── workshops.js     # Workshop management
│   │   ├── badges.js        # Achievement system
│   │   ├── presence.js      # Online status
│   │   └── chatbot.js       # AI assistant
│   ├── 📁 uploads/          # User uploaded media
│   └── server.js            # Express server
│
├── 📁 frontend/
│   ├── 📁 src/
│   │   ├── 📁 components/   # Reusable UI components
│   │   ├── 📁 context/      # React contexts (Auth)
│   │   ├── 📁 pages/        # Page components
│   │   ├── 📁 api/          # API client setup
│   │   ├── index.css        # Global styles
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   └── vite.config.js       # Vite configuration
│
└── README.md
```

---

## 👥 Team

<div align="center">

### Team Rana Kumbha - PS16

| Role | Member |
|:----:|:------:|
| 👨‍💻 Developer | **Dhanshree** |

</div>

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### 🌟 Star this repo if you find it helpful!

<br/>

**Made with ❤️ for college students everywhere**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Waving%20Hand.png" alt="Wave" width="40"/>

</div>
