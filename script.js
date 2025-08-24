// --- GLOBAL ERROR HANDLER ---
window.onerror = function(message, source, lineno, colno, error) {
    alert('A critical error occurred. Please refresh the page. If the problem persists, try clearing your browser cache for this site.');
    console.error("Caught unhandled error:", { message, source, lineno, colno, error });
    // It's often a good idea to clear potentially corrupted state here
    localStorage.removeItem('tournamentState');
};

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {};
    const defaultState = {
        players: [],
        assignments: {},
        scores: {},
        titles: {},
        mainTitle_bracket: 'BRACKETS',
        mainTitle_groups: 'GROUPS',
        viewMode: 'bracket',
        nextPlayerId: 1,
        isDirty: false,
    };

    function loadState() {
        try {
            const savedState = localStorage.getItem('tournamentState');
            if (savedState) {
                state = JSON.parse(savedState);
                console.log('Loaded state from localStorage.');
            } else {
                throw new Error('No saved state found.');
            }
        } catch (e) {
            console.warn('Could not load state, using default. Error:', e.message);
            state = JSON.parse(JSON.stringify(defaultState)); // Deep copy
        }

        for (const key in defaultState) {
            if (!state.hasOwnProperty(key)) {
                state[key] = defaultState[key];
            }
        }
        state.isDirty = false;
        updateSaveButton();
    }

    function saveState() {
        if (!state.isDirty) return;
        try {
            localStorage.setItem('tournamentState', JSON.stringify(state));
            state.isDirty = false;
            updateSaveButton();
            console.log('State saved!');
        } catch (e) {
            console.error('Failed to save state to localStorage', e);
            alert('Error: Could not save state. Storage might be full.');
        }
    }

    function markDirty() {
        if (!state.isDirty) {
            state.isDirty = true;
            updateSaveButton();
        }
    }

    function updateSaveButton() {
        const saveBtn = document.getElementById('save-btn');
        if (!saveBtn) return;
        if (state.isDirty) {
            saveBtn.classList.remove('saved');
            saveBtn.textContent = 'Save';
        } else {
            saveBtn.classList.add('saved');
            saveBtn.textContent = 'Saved';
        }
    }


    // --- DOM ELEMENT REFERENCES ---
    const saveBtn = document.getElementById('save-btn');
    const playerListEl = document.getElementById('player-list');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const editModalEl = document.getElementById('player-edit-modal');


    // --- PLAYER BANK ---
    let editingPlayer = null;
    const countryFlags = [ 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'eh', 'er', 'es', 'et', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'um', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'ye', 'yt', 'za', 'zm', 'zw' ];

    function renderPlayerBank() {
        playerListEl.innerHTML = '';
        state.players.forEach(player => {
            const li = document.createElement('li');
            li.className = 'player-bank-item';
            li.dataset.id = player.id;
            li.innerHTML = `
                <img src="${player.avatar}" class="player-avatar-bank">
                <span class="player-name-bank">${player.name}</span>
                <img src="${player.flag}" class="player-flag-bank">
                <div class="player-bank-actions">
                    <button class="edit-player-btn">✏️</button>
                    <button class="delete-player-btn">🗑️</button>
                </div>`;
            playerListEl.appendChild(li);
        });
    }

    function handleAddPlayer() {
        const newPlayer = {
            id: state.nextPlayerId++, name: `Player ${state.nextPlayerId - 1}`,
            flag: 'countryflags/aq.png',
            avatar: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E👤%3C/text%3E%3C/svg%3E`
        };
        state.players.push(newPlayer);
        markDirty();
        renderPlayerBank();
    }

    function handleDeletePlayer(id) { /* ... implementation ... */ }

    function renderFlagOptions(searchTerm = '') {
        const optionsContainer = document.getElementById('edit-flag-options');
        const filteredFlags = countryFlags.filter(code => code.toLowerCase().includes(searchTerm.toLowerCase()));

        optionsContainer.innerHTML = filteredFlags.map(code =>
            `<img src="countryflags/${code}.png" data-flag-code="${code}" alt="${code}" title="${code}">`
        ).join('');
    }

    function openEditModal(player) {
        editingPlayer = player;
        document.getElementById('edit-player-name').value = player.name;
        document.getElementById('edit-current-flag').src = player.flag;
        document.getElementById('edit-current-avatar').src = player.avatar;
        editModalEl.classList.remove('modal-hidden');
    }

    function closeEditModal() {
        editingPlayer = null;
        document.getElementById('edit-flag-search').value = '';
        document.getElementById('edit-flag-options').innerHTML = '';
        editModalEl.classList.add('modal-hidden');
    }

    function handleSaveChanges() {
        if (!editingPlayer) return;
        editingPlayer.name = document.getElementById('edit-player-name').value;
        markDirty();
        renderPlayerBank();
        // render(); // Will be needed later
        closeEditModal();
    }

    function handlePlayerBankClick(e) {
        const playerItem = e.target.closest('.player-bank-item');
        if (!playerItem) return;
        const playerId = parseInt(playerItem.dataset.id);
        if (e.target.closest('.edit-player-btn')) {
            const player = state.players.find(p => p.id === playerId);
            if (player) openEditModal(player);
        }
        if (e.target.closest('.delete-player-btn')) {
            if (confirm('Delete this player? They will be removed from all slots.')) {
                state.players = state.players.filter(p => p.id !== playerId);
                Object.keys(state.assignments).forEach(slotId => {
                    if (state.assignments[slotId] === playerId) delete state.assignments[slotId];
                });
                markDirty();
                renderPlayerBank();
                // render(); // Will be needed later
            }
        }
    }

    const bracketProgression = {
        'qf1': { winnerTo: 'sf1-p1' },
        'qf2': { winnerTo: 'sf1-p2' },
        'qf3': { winnerTo: 'sf2-p1' },
        'qf4': { winnerTo: 'sf2-p2' },
        'sf1': { winnerTo: 'final-p1', loserTo: 'third-place-p1' },
        'sf2': { winnerTo: 'final-p2', loserTo: 'third-place-p2' },
    };

    // --- CANVAS & RENDERING ---
    const canvas = document.getElementById('canvas');
    const contentArea = document.querySelector('.content-area');

    function render() {
        renderPlayerBank();
        const mainTitleEl = document.getElementById('main-title');

        if (state.viewMode === 'bracket') {
            mainTitleEl.textContent = state.mainTitle_bracket;
            renderBracketCanvas(contentArea);
        } else {
            mainTitleEl.textContent = state.mainTitle_groups;
            renderGroupsCanvas(contentArea);
        }
    }

    function renderGroupsCanvas(container) {
        let groupsHtml = '';
        const groups = ['A', 'B', 'C', 'D'];

        for(const groupLetter of groups) {
            let group = `<div class="content-box">
                <h2 class="group-title" data-title-id="group-title-${groupLetter}" contenteditable="true">${state.titles[`group-title-${groupLetter}`] || `GROUP ${groupLetter}`}</h2>`;
            for (let j = 1; j <= 4; j++) { // Assuming 4 players per group
                const slotId = `group-${groupLetter.toLowerCase()}-${j}`;
                const assignedPlayerId = state.assignments[slotId];
                const player = state.players.find(p => p.id === assignedPlayerId) || { name: '...', avatar: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E`, flag: 'countryflags/aq.png' };
                group += `
                    <div class="player-slot" data-slot-id="${slotId}">
                        <img src="${player.avatar}" class="avatar">
                        <span class="name">${player.name}</span>
                        <img src="${player.flag}" class="flag">
                    </div>`;
            }
            group += `</div>`;
            groupsHtml += group;
        }

        const logoHtml = `<div class="logo-column"><img src="Media/Logo_main-min.png" alt="Logo"></div>`;

        container.innerHTML = `<div class="groups-view">${groupsHtml}${logoHtml}</div>`;
        initCardGradients();
    }

    function renderBracketCanvas(container) {
        container.innerHTML = `
            <div class="bracket-view">
                <img src="Media/Logo_main-min.png" class="bracket-logo" alt="Logo">
                <div class="round-title" style="top: 80px; left: 230px;" data-title-id="qf-title" contenteditable="true">${state.titles['qf-title'] || 'QUARTERFINALS'}</div>
                <div class="round-title" style="top: 80px; left: 700px;" data-title-id="sf-title" contenteditable="true">${state.titles['sf-title'] || 'SEMIFINALS'}</div>
                <div class="round-title" style="top: 80px; left: 1170px;" data-title-id="f-title" contenteditable="true">${state.titles['f-title'] || 'GRAND FINAL'}</div>

                <!-- QUARTERFINALS -->
                <div class="match-box" style="top: 150px; left: 200px;" data-match-id="qf1"></div>
                <div class="match-box" style="top: 320px; left: 200px;" data-match-id="qf2"></div>
                <div class="match-box" style="top: 560px; left: 200px;" data-match-id="qf3"></div>
                <div class="match-box" style="top: 730px; left: 200px;" data-match-id="qf4"></div>

                <!-- SEMIFINALS -->
                <div class="match-box" style="top: 235px; left: 670px;" data-match-id="sf1"></div>
                <div class="match-box" style="top: 645px; left: 670px;" data-match-id="sf2"></div>

                <!-- FINAL -->
                <div class="match-box" style="top: 440px; left: 1140px;" data-match-id="final"></div>

                <!-- 3RD PLACE -->
                <div class="round-title" style="top: 750px; left: 1170px;" data-title-id="3p-title" contenteditable="true">${state.titles['3p-title'] || '3RD PLACE'}</div>
                <div class="match-box" style="top: 830px; left: 1140px;" data-match-id="third-place"></div>
            </div>`;
        document.querySelectorAll('.match-box').forEach(box => populateMatchBox(box));
        drawBracketConnectors(container.querySelector('.bracket-view'));
    }

    function populateMatchBox(box) {
        const matchId = box.dataset.matchId;
        const p1_slot_id = `${matchId}-p1`;
        const p2_slot_id = `${matchId}-p2`;

        const p1_id = state.assignments[p1_slot_id];
        const p2_id = state.assignments[p2_slot_id];

        const player1 = state.players.find(p=>p.id === p1_id) || {name: '...', flag: 'countryflags/aq.png'};
        const player2 = state.players.find(p=>p.id === p2_id) || {name: '...', flag: 'countryflags/aq.png'};

        const score1 = parseInt(state.scores[p1_slot_id], 10) || 0;
        const score2 = parseInt(state.scores[p2_slot_id], 10) || 0;

        let p1_class = 'player-slot';
        let p2_class = 'player-slot';

        if (score1 > score2) {
            p1_class += ' winner';
            p2_class += ' loser';
        } else if (score2 > score1) {
            p2_class += ' winner';
            p1_class += ' loser';
        }

        box.innerHTML = `
            <div class="${p1_class}" data-slot-id="${p1_slot_id}">
                <img src="${player1.flag}" class="flag">
                <span class="name">${player1.name}</span>
                <span class="score" data-score-id="${p1_slot_id}" contenteditable="true">${state.scores[p1_slot_id] || 0}</span>
            </div>
            <div class="${p2_class}" data-slot-id="${p2_slot_id}">
                <img src="${player2.flag}" class="flag">
                <span class="name">${player2.name}</span>
                <span class="score" data-score-id="${p2_slot_id}" contenteditable="true">${state.scores[p2_slot_id] || 0}</span>
            </div>`;
    }

    function updateBracketProgression(matchId) {
        const progression = bracketProgression[matchId];
        if (!progression) return; // Not a match that progresses

        const p1_slot_id = `${matchId}-p1`;
        const p2_slot_id = `${matchId}-p2`;

        const score1 = parseInt(state.scores[p1_slot_id], 10) || 0;
        const score2 = parseInt(state.scores[p2_slot_id], 10) || 0;

        if (score1 === score2) return; // No winner yet, or a tie

        const winner_slot_id = score1 > score2 ? p1_slot_id : p2_slot_id;
        const loser_slot_id = score1 > score2 ? p2_slot_id : p1_slot_id;

        const winner_player_id = state.assignments[winner_slot_id];
        const loser_player_id = state.assignments[loser_slot_id];

        // Use a temp object to avoid modifying state before all checks
        const newAssignments = {};

        if (progression.winnerTo) {
            // If a player is already in the destination slot, don't overwrite.
            // This allows for manual overrides.
            // However, for this feature, we probably DO want to overwrite.
            // Let's assume we overwrite.
            newAssignments[progression.winnerTo] = winner_player_id;
        }

        if (progression.loserTo) {
            newAssignments[progression.loserTo] = loser_player_id;
        }

        // Apply changes if any were determined
        if (Object.keys(newAssignments).length > 0) {
            Object.assign(state.assignments, newAssignments);
            markDirty();
        }
    }

    function drawBracketConnectors(container) {
        const oldSvg = container.querySelector('.bracket-svg');
        if (oldSvg) oldSvg.remove();

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('bracket-svg');

        const connections = [
            // Quarters to Semis
            { from: 'qf1', to: 'sf1', fromPort: 'right', toPort: 'left-top' },
            { from: 'qf2', to: 'sf1', fromPort: 'right', toPort: 'left-bottom' },
            { from: 'qf3', to: 'sf2', fromPort: 'right', toPort: 'left-top' },
            { from: 'qf4', to: 'sf2', fromPort: 'right', toPort: 'left-bottom' },
            // Semis to Final
            { from: 'sf1', to: 'final', fromPort: 'right', toPort: 'left-top' },
            { from: 'sf2', to: 'final', fromPort: 'right', toPort: 'left-bottom' },
            // Semis to 3rd Place
            { from: 'sf1', to: 'third-place', fromPort: 'right', toPort: 'left-top', type: 'third-place' },
            { from: 'sf2', to: 'third-place', fromPort: 'right', toPort: 'left-bottom', type: 'third-place' },
        ];

        function getPortPoint(matchId, port) {
            const el = container.querySelector(`[data-match-id="${matchId}"]`);
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const relTop = rect.top - containerRect.top;
            const relLeft = rect.left - containerRect.left;

            switch(port) {
                case 'right': return { x: relLeft + rect.width, y: relTop + rect.height / 2 };
                case 'left-top': return { x: relLeft, y: relTop + rect.height * 0.25 };
                case 'left-bottom': return { x: relLeft, y: relTop + rect.height * 0.75 };
                default: return { x: relLeft, y: relTop + rect.height / 2 }; // 'left'
            }
        }

        connections.forEach(conn => {
            const startPoint = getPortPoint(conn.from, conn.fromPort);
            const endPoint = getPortPoint(conn.to, conn.toPort);

            if (!startPoint || !endPoint) return;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            let d = '';

            if (conn.type === 'third-place') {
                const midX1 = startPoint.x + 40;
                const midY = endPoint.y > startPoint.y ? endPoint.y + 60 : endPoint.y - 60;
                const midX2 = endPoint.x - 40;
                d = `M ${startPoint.x},${startPoint.y} H ${midX1} V ${midY} H ${midX2} V ${endPoint.y} H ${endPoint.x}`;
            } else {
                const midX = startPoint.x + 60;
                d = `M ${startPoint.x},${startPoint.y} H ${midX} V ${endPoint.y} H ${endPoint.x}`;
            }

            path.setAttribute('d', d);
            path.classList.add('bracket-connector-path');
            svg.appendChild(path);
        });

        container.prepend(svg);
    }

    // --- DECORATIONS ---
    const backgroundImages = [ 'Media/background1-min.png', 'Media/background2-min.png', 'Media/background3-min.png' ];
    const leafImages = [ 'Media/leves_1-min.png', 'Media/leves_2-min.png', 'Media/leves_3-min.png', 'Media/leves_4-min.png', 'Media/leves_5-min.png', 'Media/leves_6-min.png', 'Media/leves_7-min.png', 'Media/leves_8-min.png' ];

    function initCardGradients({
      blobsPerCard = 3,
      sizeMin = 400,
      sizeMax = 1000,
      blurPx = 80,
      opacity = 0.10,
      colors = [
        ['#C9CBA3', '#FFE1A8'],
        ['#E26D5C', '#723D46'],
        ['#472D30', '#E26D5C'],
        ['#FFE1A8', '#E26D5C']
      ]
    } = {}) {
      document.querySelectorAll('.content-box').forEach(card => {
        let bgContainer = card.querySelector('.card-bg-container');
        if (bgContainer) bgContainer.remove(); // Clear old gradients

        bgContainer = document.createElement('div');
        bgContainer.className = 'card-bg-container';
        card.prepend(bgContainer);

        const bg = document.createElement('div');
        bg.className = 'card-bg';

        for (let i = 0; i < blobsPerCard; i++) {
          const shape = document.createElement('div');
          const size = Math.random() * (sizeMax - sizeMin) + sizeMin;
          const [c1, c2] = colors[Math.floor(Math.random() * colors.length)];

          Object.assign(shape.style, {
            position: 'absolute',
            width: `${size}px`,
            height: `${size}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            transform: 'translate(-50%, -50%)',
            borderRadius: `${Math.random() * 100}% ${Math.random() * 100}%`,
            background: `radial-gradient(ellipse at center, ${c1} 0%, ${c2} 100%)`,
            filter: `blur(${blurPx}px)`,
            opacity: String(opacity)
          });

          bg.appendChild(shape);
        }
        bgContainer.appendChild(bg);
      });
    }

    function applyDecorations() {
        const bgElement = document.querySelector('#canvas .background');
        if (!bgElement) return;
        const randomBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
        bgElement.style.backgroundImage = `url('${randomBg}')`;

        const decorationsContainer = document.getElementById('decorations-container');
        decorationsContainer.innerHTML = '';

        // Grid placement logic to prevent overlaps
        const numLeaves = 8;
        const gridCols = 4;
        const gridRows = 3;
        const cellWidth = 100 / gridCols;
        const cellHeight = 100 / gridRows;

        let availableCells = Array.from({ length: gridCols * gridRows }, (_, i) => i);

        for (let i = 0; i < numLeaves; i++) {
            if (availableCells.length === 0) break; // Stop if we run out of cells

            // Pick a random available cell and remove it from the list
            const randomCellIndex = Math.floor(Math.random() * availableCells.length);
            const cell = availableCells.splice(randomCellIndex, 1)[0];

            const col = cell % gridCols;
            const row = Math.floor(cell / gridCols);

            // Calculate random position within the cell
            const top = row * cellHeight + Math.random() * (cellHeight - 20); // -20 to avoid edges
            const left = col * cellWidth + Math.random() * (cellWidth - 15);

            const leaf = document.createElement('img');
            leaf.className = 'leaf-decoration';
            leaf.src = leafImages[Math.floor(Math.random() * leafImages.length)];
            leaf.style.top = `${top}%`;
            leaf.style.left = `${left}%`;
            leaf.style.transform = `rotate(${Math.random() * 360}deg) scale(${Math.random() * 0.25 + 0.25})`;
            leaf.style.opacity = `${Math.random() * 0.4 + 0.3}`;
            decorationsContainer.appendChild(leaf);
        }
    }

    // --- CANVAS INTERACTION ---
    const playerAssignModal = document.getElementById('player-assign-modal');
    let activeSlotId = null;

    function handleCanvasClick(e) {
        const playerSlot = e.target.closest('.player-slot');
        if (playerSlot) {
            activeSlotId = playerSlot.dataset.slotId;
            // Show all players to allow assigning the same player to multiple slots.
            const availablePlayers = state.players;
            let optionsHtml = availablePlayers.map(p => `<div data-player-id="${p.id}">${p.name}</div>`).join('');
            optionsHtml += `<div data-player-id="unassign" style="color: #ff8a8a;">-- Unassign --</div>`;
            playerAssignModal.innerHTML = optionsHtml;
            playerAssignModal.style.left = `${e.clientX}px`;
            playerAssignModal.style.top = `${e.clientY}px`;
            playerAssignModal.classList.remove('modal-hidden');
            return;
        }
        if (!e.target.closest('#player-assign-modal')) {
            playerAssignModal.classList.add('modal-hidden');
        }
    }

    function handleAssignPlayer(e) {
        const playerId = e.target.dataset.playerId;
        if (!playerId || !activeSlotId) return;
        if (playerId === 'unassign') delete state.assignments[activeSlotId];
        else state.assignments[activeSlotId] = parseInt(playerId);
        markDirty();
        render();
        playerAssignModal.classList.add('modal-hidden');
    }

    function handleCanvasBlur(e) {
        const scoreEl = e.target.closest('.score');
        if (scoreEl) {
            const slotId = scoreEl.dataset.scoreId;
            state.scores[slotId] = scoreEl.textContent;

            const matchId = slotId.substring(0, slotId.lastIndexOf('-'));
            updateBracketProgression(matchId);

            markDirty();
            render(); // Re-render to show winner/loser highlighting and trigger progression
        }
        const titleEl = e.target.closest('.round-title');
        if (titleEl) {
            state.titles[titleEl.dataset.titleId] = titleEl.textContent;
            markDirty();
        }
    }

    // --- CANVAS SCALING ---
    function scaleCanvas() {
        const wrapper = document.getElementById('canvas-wrapper');
        const canvas = document.getElementById('canvas');
        if (!wrapper || !canvas) return;

        const wrapperWidth = wrapper.clientWidth;
        const wrapperHeight = wrapper.clientHeight;

        const canvasWidth = 1920;
        const canvasHeight = 1080;

        const scale = Math.min(wrapperWidth / canvasWidth, wrapperHeight / canvasHeight);

        canvas.style.transform = `scale(${scale})`;
    }


    // --- INITIALIZATION ---
    function init() {
        loadState();

        // Toolbar & Modals
        saveBtn.addEventListener('click', saveState);
        addPlayerBtn.addEventListener('click', handleAddPlayer);
        document.getElementById('randomise-btn').addEventListener('click', applyDecorations);
        playerListEl.addEventListener('click', handlePlayerBankClick);
        document.getElementById('save-player-changes-btn').addEventListener('click', handleSaveChanges);
        document.getElementById('cancel-player-edit-btn').addEventListener('click', closeEditModal);
        playerAssignModal.addEventListener('click', handleAssignPlayer);
        document.querySelectorAll('input[name="mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.viewMode = e.target.value;
                markDirty();
                render();
            });
        });

        // Player Edit Modal Listeners
        document.getElementById('edit-flag-search').addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            const optionsContainer = document.getElementById('edit-flag-options');
            if (searchTerm) {
                optionsContainer.style.display = 'flex';
                renderFlagOptions(searchTerm);
            } else {
                optionsContainer.style.display = 'none';
            }
        });

        document.getElementById('edit-flag-options').addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                const newFlagCode = e.target.dataset.flagCode;
                if (editingPlayer && newFlagCode) {
                    editingPlayer.flag = `countryflags/${newFlagCode}.png`;
                    document.getElementById('edit-current-flag').src = editingPlayer.flag;
                }
            }
        });

        // Canvas
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('focusout', handleCanvasBlur);
        window.addEventListener('resize', scaleCanvas);

        document.getElementById('main-title').addEventListener('focusout', (e) => {
            const newTitle = e.target.textContent;
            const key = `mainTitle_${state.viewMode}`;
            if (state[key] !== newTitle) {
                state[key] = newTitle;
                markDirty();
            }
        });


        console.log('Application initialized.');
        document.querySelector(`input[name="mode"][value="${state.viewMode}"]`).checked = true;
        render();
        scaleCanvas(); // Initial scale
        applyDecorations(); // Initial decorations

        setInterval(() => { if (state.isDirty) saveState(); }, 30000);
    }

    init();
});
