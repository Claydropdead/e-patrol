# PNP E-Patrol MIMAROPA

A comprehensive location tracking and personnel management system for the Philippine National Police (PNP) MIMAROPA Region.

## 🌟 Features

### 🔐 Role-based Authentication
- **Superadmin**: Complete system control, user management, personnel creation
- **Regional**: View-only access to all MIMAROPA data
- **Provincial**: View-only access to specific province data
- **Station**: View-only access to specific sub-unit data
- **Personnel**: Mobile app users for location sharing

### 👥 Personnel Management
- Create and manage PNP officers across 98 sub-units
- Role assignment and hierarchical access control
- Complete MIMAROPA organizational structure integration

### 📍 Live Location Tracking
- Real-time GPS monitoring of personnel in the field
- Status tracking: Patrolling, Active, Alert, Standby
- Interactive maps and coverage analysis

### 🏝️ MIMAROPA Coverage
- **Oriental Mindoro PPO** (17 sub-units)
- **Occidental Mindoro PPO** (15 sub-units)
- **Marinduque PPO** (8 sub-units)
- **Romblon PPO** (19 sub-units)
- **Palawan PPO** (25 sub-units)
- **Puerto Princesa CPO** (7 sub-units)
- **RMFB** - Regional Mobile Force Battalion (7 companies)

## 🚀 Tech Stack

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: Zustand
- **Maps**: React Leaflet
- **Charts**: Recharts

## 🛠️ Development Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd e-patrol
   npm install
   ```

2. **Environment Setup**:
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Login page: http://localhost:3000/login
   - Dashboard: http://localhost:3000/dashboard

## 🚦 Getting Started

1. **Login**: Use your PNP credentials to access the system
2. **Dashboard**: View your role-appropriate information
3. **Navigation**: Use the sidebar to access different features
4. **Live Monitoring**: Track personnel in real-time on the map

---

**Philippine National Police • MIMAROPA Region**  
*Authorized Personnel Only*
