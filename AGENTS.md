# Project Rules

- **Confirmation Required**: Always present a plan and ask for user confirmation before making any modifications to the codebase.
- **Default Golden Baseline Version**: **Version 1.7.3** is the official default stable baseline. If any regressions, bugs, or breaking changes occur in the future, all business logic, shift calculations, multi-user aggregations (including MIABRUDAN & historical months like July), swipe actions, and UI architectures must be restored and verified against v1.7.3.
- **Version Increment on Release**: Whenever modifications are ready to be pushed to GitHub or deployed, increment and synchronize the application version (e.g., v1.7.3 -> v1.7.4) consistently across `package.json`, `src/constants/data.ts` (`APP_VERSION`), `src/components/AboutPickApp.tsx`, and the bottom status bar in `src/App.tsx`.
- **No Fake or Simulated Device Features**: All device integrations (Bluetooth, Smart Watch sync, hardware telemetry) must use genuine browser APIs (such as Web Bluetooth API `navigator.bluetooth`) or explicit manual user calibration. Never create fake connection timers, synthetic random data streams, or simulated success messages that claim a physical hardware device is connected when it is not. If a hardware feature or browser API is restricted or unavailable (e.g. in an iframe or unsupported browser), clearly display the actual browser limitation and guide the user to open the app in a standalone tab or use real manual input.

## PickApp Feature List (Locked)

1. **Auth & Identity Management**
   - **User Profiles**: Persistent storage of levels, XP, and achievements.
   - **Role-Based Access (RBAC)**: Admin and User distinctions.
   - **Biometric & PIN Auth**: Multiple security layers for fast floor access.

2. **Core Operations (Picking Dashboard)**
   - **Real-Time Shift Engine**: Tracking of active time, breaks, and case counts.
   - **Performance Metrics**: Dynamic calculation of pick rate and efficiency.
   - **Gamification**: Leveling system, XP, and streaks.
   - **Offline Mode**: Sync Manager ensures data integrity during connectivity drops.

3. **Real-Time Visualization**
   - **Live Leaderboard**: Collaborative ranking system.
   - **Live Globe**: Geographical visualization of active warehouse operations.
   - **Real-Time Presence**: "Active on Globe" status indicators for team awareness.

4. **Administrative Control**
   - **Warehouse Management**: Global target setting and department lists.
   - **Historical Auditing**: Rota history and shift summary logs.
   - **System Health**: Data purging and storage optimization tools.

5. **Advanced UX**
   - **Voice Assistant**: Integrated AI interaction for hands-free status checks.
   - **Theming Engine**: Support for custom skins and visual preferences.
   - **Beta Feedback**: Built-in channel for user-driven improvements.
