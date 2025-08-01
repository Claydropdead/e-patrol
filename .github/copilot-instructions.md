# PNP E-Patrol MIMAROPA System - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Next.js 14 TypeScript project for the Philippine National Police (PNP) E-Patrol location tracking system specifically for the MIMAROPA region.

## Tech Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Backend**: Supabase (PostgreSQL database, Auth, Real-time)
- **State Management**: Zustand
- **Maps**: React Leaflet for location tracking
- **Charts**: Recharts for analytics

## Key Features
1. **Role-based Authentication**: Superadmin, Regional, Provincial, Station, Personnel
2. **Personnel Management**: Create and manage PNP officers across MIMAROPA
3. **Live Location Tracking**: Real-time GPS monitoring of personnel in the field
4. **MIMAROPA Structure**: Covers 5 provinces + Puerto Princesa + RMFB (98 total sub-units)

## User Roles & Permissions
- **Superadmin**: Full control - user role assignment, personnel creation, live monitoring
- **Regional**: View-only access to all MIMAROPA data
- **Provincial**: View-only access to their specific province
- **Station**: View-only access to their specific sub-unit
- **Personnel**: Mobile app users who share location data

## MIMAROPA Structure
```
MIMAROPA Region
├── Oriental Mindoro PPO (17 sub-units)
├── Occidental Mindoro PPO (15 sub-units)  
├── Marinduque PPO (8 sub-units)
├── Romblon PPO (19 sub-units)
├── Palawan PPO (25 sub-units)
├── Puerto Princesa CPO (7 sub-units)
└── RMFB - Regional Mobile Force Battalion (7 companies)
```

## Code Guidelines
- Use TypeScript with strict mode
- Follow Next.js 14 App Router patterns
- Implement proper error handling and loading states
- Use Tailwind CSS for styling with consistent design system
- Implement proper security with Supabase RLS policies
- Follow mobile-first responsive design principles

## Database Schema Focus
- Users have specific province/unit/sub-unit assignments
- Location tracking tied to Personnel role only
- Role-based access control at database level
- Audit logging for all administrative actions
