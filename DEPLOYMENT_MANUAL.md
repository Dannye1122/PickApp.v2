# PickApp Enterprise Operational & Deployment Manual
**Release Candidate - Enterprise Production Grade**

---

## 1. Architectural Overview

PickApp utilizes a high-performance, real-time full-stack architecture engineered for the high-volume demands of modern warehouse fulfillment centers. 

```
                                      +-------------------------+
                                      |   Active Pick Operator  |
                                      |   (Barcode Scanners /   |
                                      |    Android Handhelds)   |
                                      +------------+------------+
                                                   |
                                            React (Vite)
                                        Local Storage Cache
                                        Capacitor OS Bridges
                                                   |
                                                   | (Dynamic Sync)
                                                   v
                                      +------------+------------+
                                      |     Google Firestore    |
                                      |     Security Matrix     |
                                      |    (Attribute-Based)    |
                                      +------------+------------+
                                                   |
                                                   v
                                 +-----------------+-----------------+
                                 |                                   |
                       [shift_summaries]                       [leaderboard]
                       Historical Shards                       Operational Metrics
```

### Data Pipeline Mechanics
1. **Dynamic Local Cache Layer**: Operators on the active picking floor write transactions and pick events directly to local reactive states. Each pick accrues to a local transaction log stored in standard encrypted state structures and synced with client-side persistence keys.
2. **Asynchronous Cloud Sync Engine**: When a device detects real-time network presence, transactions are queued and flushed up to Google Firestore under a dual-sync state model. In the event of temporary dead spots in aisles, progress is stored offline and committed atomically once signal is re-acquired.
3. **High-Density, Zero-Cost Quota Approach**: 
   - Gamification, trophies, and awards are handled entirely through local offline-cache reads. Updating a trophy count does NOT trigger a network write or drain. Live leaderboards are compiled reactively by subscribing into cloud channels (`onSnapshot`). This completely avoids pulling entire performance shards repeatedly, conserving device battery and preserving cloud read quotas.
   - **15-Minute Data-Shielding Rule**: The system enforces extreme density logic to prevent Firebase Quota Exceeds. Data summaries from operator terminals are shielded dynamically. Excessive pull-to-refresh will not hit the database layer directly for elements like Leaderboard if the 15-minute sync cooldown has not elapsed, meaning zero-cost hits.

---

## 2. Operator Interface Guide

### User Registration
1. Upon loading the app, new crew members are prompted with the registration interface.
2. The user enters their unique, display-friendly **Username** and selects their home department (e.g., *Picking*, *Packing*, *Bulk*, *Receiving*).
3. The operator's level, XP rewards, and achievements profile are initialized at zero. The operator profile is stored under the `/users` roster.

### Six-Digit Secure PIN Authentication
1. We have fully phased out biological metrics. **Username / PIN authentication is completely standardizing operational shifts.**
2. Credentials and profiles are protected behind a secure **6-digit PIN pad overlay**. Operators log in rapidly entering their individual 6-digit PIN on any scanner terminal.
3. For secure options (clearing the leaderboard, initiating system-wide logs purge, or re-claiming memory), the system prompts for administrative verification. Entering the authorized admin credentials grants high-level access.

### Warehouse Floor Operations
- **Active Scanning & Metrics**: The operator tracks their current pick speed against the target rate. The default performance tracking engine uses a primary target of **200 Cases Per Hour (P/H)**. 
- **Feedback Loop**: Dynamic visual alerts display whether they are running are *Above Target*, *At Target*, or *Below Target*, benchmarked around this 200 P/H operational focus layout unless custom targeted.
- **Sync Status Indicators**: Color-coded banners confirm the integrity of cloud state:
  - `SYNCED`: Database connection established, live write capabilities validated.
  - `LOCAL CACHE`: Gamification/status running offline, active sync pending channel availability.

---

## 3. The Control Center (Admin Manual)

### Global Settings Configuration
Administrators ('DASERGHIE' or 'ADMIN') can configure operational thresholds globally using the **Admin Settings Console**:
1. **Target KPI Setting**: Define the baseline case pick rate (e.g., Target 200 Cases/Hour) which automatically drives color accents and alerts on all forklift screens.
2. **Department Master Lists**: Declare, modify, or retire active department lanes.
3. **KPI Threshold Bands**: Set exact percentage brackets for excellent (Green), good (Amber), and warning (Red) levels.

### Operator Roster Management
- To maintain security, administrators have exclusive authority to **Delete Operator Profiles** from the active Firestore roster.
- This prevents shadow profiles or retired badges from altering floor analytics.

### Database Utilization & Purge Control
- **Operational Metrics**: Admins can monitor live database storage utilization, total document counts, and estimated billing footprint directly from the admin dashboard.
- **The Six-Week (42 Days) Autopurge Rule**: To prevent data drift, the system enforces historical filters on metric feeds. Only records within the active 42-day window are served to normal boards.
- **Manual Expired Purge**:
  1. Access the database stats module.
  2. Initiate the secure async database purge by entering the admin PIN (default admin master code or direct console verification).
  3. The service triggers a Firestore bulk batch delete, removing expired shift summaries and leaderboard documents older than 42 days sequentially while preserving current-active streaks.

---

## 4. APK Build & Production Compilation Guide

To compile a highly optimized, production-ready, zero-error APK binary for industrial Android terminal devices (e.g., Zebra scanners), execute the following sequential build-pipeline:

### Step 1: Install & Refresh Workspace Dependencies
Ensure all packages are completely resolved (No Biometrics or external bloatware packages required anymore):
```bash
npm install
```

### Step 2: Client Web Code Optimization & Build
Compile, tree-shake, and optimize the React/TypeScript codebase into optimized static bundles:
```bash
npm run build
```
Verify that the output is successfully generated in `/dist` with 0 compile errors.

### Step 3: Capacitor Sync
Distribute the optimized compiled web assets directly into the localized Android native target shell:
```bash
npx cap sync android
```

### Step 4: Native Gradle Production Compilation
Run the optimized Android Gradle build to yield a production release debug build APK:
```bash
cd android
./gradlew assembleDebug
```
*Note for Release Keys/Signed Builds:* For direct enterprise distribution onto customer MDMs (Mobile Device Management), compile the release target:
```bash
./gradlew assembleRelease
```

### Step 5: Verification of Compiled Assets
Upon a successful build, locate the production release binary at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---
*End of Manual.*
