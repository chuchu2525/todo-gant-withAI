# CLAUDE.md

機能追加の時は必ず PRD を作成すること

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`
- **Run tests**: `npm test`
- **Run tests with UI**: `npm test:ui`
- **Run tests with coverage**: `npm run test:coverage`

## Environment Setup

1. Install dependencies: `npm install`
2. Set `GEMINI_API_KEY` in `.env.local` file for AI functionality
3. Run development server: `npm run dev`

## Architecture Overview

This is a React-based todo/gantt chart application with AI integration. The app uses:

- **React 19** with TypeScript and Vite for the build system
- **Tailwind CSS** for styling with a dark theme
- **Vitest** for testing with jsdom environment
- **Google Gemini AI** for intelligent task management features

### Core Architecture

**State Management**:

- App-level state in `App.tsx` manages all tasks, view modes, and synchronization
- Tasks are stored as YAML in localStorage and parsed/stringified via `yamlService.ts`
- Real-time sync between GUI changes and YAML representation

**View System**:

- Single views: `list`, `gantt`, `ai`
- Split views: `split-list-gantt`, `split-list-ai`, `split-gantt-ai`
- Mobile responsive with split views fallback to single views
- `ResizablePanel` component handles split view layouts with persistent sizing

**Data Flow**:

1. Tasks stored as YAML string in localStorage
2. YAML parsed to Task objects for rendering
3. GUI modifications update Task objects
4. Tasks re-serialized to YAML and saved to localStorage
5. AI operations work directly on YAML strings

### Key Components

- **App.tsx**: Main application state and view orchestration
- **TaskList**: Drag-and-drop task management with bulk operations
- **GanttChart**: Interactive gantt visualization with date dragging
- **AiInteraction**: Natural language task management via Gemini AI
- **ResizablePanel**: Split view layout with persistent panel sizing
- **TaskForm**: Modal-based task creation/editing with dependency management

### Services

- **geminiService.ts**: Secure AI integration with input validation and sanitization
- **yamlService.ts**: Task serialization/deserialization
- **calendarService.ts**: Date utilities and calculations

### Type System

Core types defined in `types.ts`:

- `Task`: Main task entity with dependencies, dates, status, priority
- `ViewMode`: Union type for all view configurations
- `SplitViewConfig`: Configuration for split view layouts
- `TaskStatus`, `TaskPriority`: Enums for task properties

### Security Features

The geminiService implements several security measures:

- Secure API key management with validation
- Input sanitization and malicious payload detection
- Request/response validation
- Size limits on YAML and instruction inputs
- No sensitive data logging in production

### Testing Setup

- Vitest with jsdom environment
- Testing Library React for component testing
- Mock setup in `src/test/setup.ts` includes localStorage, crypto.randomUUID, and environment variables
- Tests located in `src/components/__tests__/` and `src/services/__tests__/`

### File Organization

- Root level: Main app files (App.tsx, types.ts, constants.ts)
- `/components/`: React components
- `/services/`: Business logic and external integrations
- `/src/`: Additional source files including tests
- `/styles/`: Global CSS
