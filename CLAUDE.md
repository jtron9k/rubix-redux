@AGENTS.md

<!-- AGENTS.md is canonical. Edit it, not this file. Add only Claude Code specific notes below. -->

## Claude Code

- Preview with `.claude/launch.json`: `dev` runs `npm run dev` on 5173, `decap` runs `npx decap-server` on 8081 (start both, then open `http://localhost:5173/admin/index.html`).
- `preview_start dev` can report a different port than Vite actually bound (it may listen on `[::1]:5173`). Check `preview_logs` and use the logged URL.
- Setup testing writes real content files. Restore with `git checkout content public/admin/config.yml`, delete created group/page files, and remove a `.env` the test created.
