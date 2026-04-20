**Role:** Expert Full-stack Developer specializing in Tauri, Rust, and Modern Frontend Frameworks (React/TypeScript + Tailwind CSS).

**Objective:** Create a cross-platform desktop application called "SSH Config Manager" using Tauri. The primary purpose of this app is to provide a graphical user interface to manage the local SSH configuration file (~/.ssh/config) on macOS, Windows, and Linux.

**Core Functional Requirements:**
1. **File Access:** The app must be able to locate, read, and write to the standard SSH config file path across different OS (e.g., /Users/username/.ssh/config on Mac/Linux and C:\Users\username\.ssh\config on Windows).
2. **Parser:** Implement a robust parser in Rust to handle the SSH config format. It must be able to handle "Host" blocks, their associated parameters (HostName, User, Port, IdentityFile, etc.), and preserve comments within the file.
3. **CRUD Operations:**
   - **Add:** Create a new Host entry with a form.
   - **Edit:** Modify existing Host entries.
   - **Delete:** Remove a Host entry.
   - **Sort:** Allow sorting the Host list alphabetically by Host name and update the physical file accordingly.
4. **UI/UX:**
   - A clean, developer-centric minimal UI using Tailwind CSS.
   - Sidebar showing the list of Hosts.
   - Detail view/form on the right to edit the selected Host's properties.
   - Dark mode by default.
   - Search bar to filter hosts quickly.

**Technical Constraints:**
- Use Tauri's command system to bridge the TypeScript frontend and Rust backend.
- Ensure file operations are safe and handle permission errors gracefully.
- The app must not corrupt the SSH config file if an error occurs during writing (implement a backup/temporary file strategy).
- Use a structured data model in Rust to represent a "Host" block.

**Deliverables:**
1. Full Tauri project structure.
2. Rust backend implementation (main.rs and necessary modules for parsing/writing).
3. Frontend implementation (Components, State Management, and API calls to Tauri commands).
4. Step-by-step guide on how to run and build the app for different platforms.
