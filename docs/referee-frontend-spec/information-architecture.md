# Information Architecture

## Site Map: State-Based Navigation

```mermaid
graph TD
    A[🏐 App Launch] --> B{User State Check}
    
    B -->|New User| C[🎯 Tournament Selection]
    B -->|Returning User| D[📍 Referee Dashboard]
    
    C --> E[👆 Tap Tournament Card]
    E --> F[📋 Tournament Detail View]
    
    F --> F1[📊 Tournament Info Card]
    F --> F2[🔄 "Switch to this Tournament" Button]
    
    F2 --> G[Tournament Selected & Saved ✓]
    G --> D[📍 Referee Dashboard]
    
    D --> H[📍 My Assignments Tab]
    D --> I[📊 Match Results Tab] 
    D --> J[🏆 Tournament Tab]
    D --> K[⚙️ Settings Tab]
    
    J --> J1[📊 Same Tournament Info Card]
    J --> J2[🏃‍♀️ Live Tournament Status]
    
    K --> K1[🎨 Display Preferences]
    K --> K2[🔔 Notifications]
```

## Navigation Structure

**State 1: No Tournament Selected**
- **Full-screen tournament selection** (reuses existing tournament list component)
- **No bottom navigation bar** - clean, focused experience
- **Large, touch-friendly tournament cards** optimized for outdoor viewing

**State 2: Tournament Selected**
- **Bottom tab bar appears** with 4 sections: My Assignments, Results, Tournament, Settings
- **Tournament name prominently displayed** in header
- **All referee-specific features enabled**

**Persistent State Management:**
- **localStorage/AsyncStorage** saves last selected tournament
- **Auto-resume** to referee dashboard on app reopen
- **Tournament switching** always available in Tournament tab
