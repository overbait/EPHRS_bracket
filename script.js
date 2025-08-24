document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {};
    const defaultState = {
        players: [],
        assignments: {}, // e.g. { 'qf1-p1': 1, 'qf1-p2': 2 }
        scores: {},      // e.g. { 'qf1-p1': 2, 'qf1-p2': 3 }
        titles: {},      // e.g. { 'qf-title': 'My Quarter Finals' }
        viewMode: 'bracket',
        nextPlayerId: 1,
        isDirty: false,
    };

    function loadState() {
        const savedState = localStorage.getItem('tournamentState');
        if (savedState) {
            state = JSON.parse(savedState);
        } else {
            state = { ...defaultState };
        }
        // Ensure all keys exist even if loading an older state
        for (const key in defaultState) {
            if (!state.hasOwnProperty(key)) {
                state[key] = defaultState[key];
            }
        }
        state.isDirty = false; // Start clean
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

    // Call this after any action that changes the state
    function markDirty() {
        if (!state.isDirty) {
            state.isDirty = true;
            updateSaveButton();
        }
    }

    function updateSaveButton() {
        const saveBtn = document.getElementById('save-btn');
        if (state.isDirty) {
            saveBtn.classList.remove('saved');
            saveBtn.textContent = 'Save';
        } else {
            saveBtn.classList.add('saved');
            saveBtn.textContent = 'Saved';
        }
    }


    // --- DOM ELEMENTS ---
    const saveBtn = document.getElementById('save-btn');


    // --- CANVAS & RENDERING ---
    const canvas = document.getElementById('canvas');
    const canvasWrapper = document.getElementById('canvas-wrapper');

    function renderBracketCanvas(container) {
        // Corrected layout and positioning
        container.innerHTML = `
            <div class="bracket-view">
                <img src="Media/Logo_main-min.png" style="position: absolute; top: 40px; right: 60px; width: 350px;">
                <div class="round-title" style="top: 20px; left: 140px;" data-title-id="qf-title" contenteditable="true">${state.titles['qf-title'] || 'QUARTERFINALS'}</div>
                <div class="round-title" style="top: 20px; left: 690px;" data-title-id="sf-title" contenteditable="true">${state.titles['sf-title'] || 'SEMIFINALS'}</div>
                <div class="round-title" style="top: 20px; left: 1240px;" data-title-id="f-title" contenteditable="true">${state.titles['f-title'] || 'GRAND FINAL'}</div>
                <div class="round-title" style="top: 880px; left: 690px;" data-title-id="3p-title" contenteditable="true">${state.titles['3p-title'] || '3RD PLACE MATCH'}</div>

                <!-- Matches -->
                <div class="match-box" style="top: 100px; left: 100px;" data-match-id="qf1"></div>
                <div class="match-box" style="top: 300px; left: 100px;" data-match-id="qf2"></div>
                <div class="match-box" style="top: 580px; left: 100px;" data-match-id="qf3"></div>
                <div class="match-box" style="top: 780px; left: 100px;" data-match-id="qf4"></div>

                <div class="match-box" style="top: 200px; left: 650px;" data-match-id="sf1"></div>
                <div class="match-box" style="top: 680px; left: 650px;" data-match-id="sf2"></div>

                <div class="match-box" style="top: 440px; left: 1200px;" data-match-id="final"></div>
                <div class="match-box" style="top: 950px; left: 650px;" data-match-id="third-place"></div>

                <!-- Connectors -->
                <div class="connector" style="top: 145px; left: 400px; width: 250px; height: 100px; border-width: 4px 4px 0 0;"></div>
                <div class="connector" style="top: 245px; left: 400px; height: 1; width: 250px; border-top: 4px solid;"></div>
                <div class="connector" style="top: 245px; left: 400px; height: 100px; border-left: 4px solid;"></div>
                <div class="connector" style="top: 345px; left: 400px; width: 250px; height: 0; border-top: 4px solid;"></div>

                <div class="connector" style="top: 625px; left: 400px; width: 250px; height: 100px; border-width: 0 4px 4px 0;"></div>
                <div class="connector" style="top: 625px; left: 400px; height: 1; width: 250px; border-top: 4px solid;"></div>
                <div class="connector" style="top: 725px; left: 400px; height: 100px; border-left: 4px solid;"></div>
                <div class="connector" style="top: 725px; left: 400px; width: 250px; height: 0; border-top: 4px solid;"></div>

                <div class="connector" style="top: 245px; left: 950px; width: 250px; height: 240px; border-width: 4px 4px 0 0;"></div>
                <div class="connector" style="top: 485px; left: 950px; width: 250px; border-top: 4px solid;"></div>

                <div class="connector" style="top: 725px; left: 950px; width: 250px; height: 240px; border-width: 0 4px 4px 0;"></div>
            </div>
        `;
        // Now, populate the match boxes
        document.querySelectorAll('.match-box').forEach(box => populateMatchBox(box));
    }

    function populateMatchBox(box) {
        const matchId = box.dataset.matchId;
        const p1_slot = `${matchId}-p1`;
        const p2_slot = `${matchId}-p2`;

        const p1_id = state.assignments[p1_slot];
        const p2_id = state.assignments[p2_slot];

        const player1 = state.players.find(p=>p.id === p1_id) || {name: '...', flag: 'countryflags/aq.png'};
        const player2 = state.players.find(p=>p.id === p2_id) || {name: '...', flag: 'countryflags/aq.png'};

        box.innerHTML = `
            <div class="player-slot" data-slot-id="${p1_slot}">
                <img src="${player1.flag}" class="flag">
                <span class="name">${player1.name}</span>
                <span class="score" data-score-id="${p1_slot}" contenteditable="true">${state.scores[p1_slot] || 0}</span>
            </div>
            <div class="player-slot" data-slot-id="${p2_slot}">
                <img src="${player2.flag}" class="flag">
                <span class="name">${player2.name}</span>
                <span class="score" data-score-id="${p2_slot}" contenteditable="true">${state.scores[p2_slot] || 0}</span>
            </div>
        `;
    }

    function render() {
        // Main render function to be called on state changes
        const contentArea = document.querySelector('.content-area');
        renderPlayerBank();
        if (state.viewMode === 'bracket') {
            renderBracketCanvas(contentArea);
        } else {
            renderGroupsCanvas(contentArea);
        }
        applyDecorations();
    }

    function renderGroupsCanvas(container) {
        let columnsHtml = '';
        const groups = ['A', 'B', 'C', 'D'];

        for(let i = 0; i < groups.length; i++) {
            const groupLetter = groups[i];
            let column = `<div class="group-column">
                <h2 class="group-title" contenteditable="true">GROUP ${groupLetter}</h2>`;
            for (let j = 1; j <= 4; j++) { // Assuming 4 players per group
                const slotId = `group-${groupLetter.toLowerCase()}-${j}`;
                const assignedPlayerId = state.assignments[slotId];
                const player = state.players.find(p => p.id === assignedPlayerId) || { name: '...', avatar: '', flag: 'countryflags/aq.png' };
                column += `
                    <div class="player-slot" data-slot-id="${slotId}">
                        <img src="${player.avatar}" class="avatar">
                        <span class="name">${player.name}</span>
                        <img src="${player.flag}" class="flag">
                    </div>`;
            }
            column += `</div>`;
            columnsHtml += column;

            // Inject logo after group B
            if (i === 1) {
                columnsHtml += `<div class="logo-column"><img src="Media/Logo_main-min.png" alt="Logo"></div>`;
            }
        }

        container.innerHTML = `<div class="groups-view">${columnsHtml}</div>`;
    }

    // --- DECORATIONS ---
    const backgroundImages = [ 'Media/background1-min.png', 'Media/background2-min.png', 'Media/background3-min.png' ];
    const leafImages = [ 'Media/leves_1-min.png', 'Media/leves_2-min.png', 'Media/leves_3-min.png', 'Media/leves_4-min.png', 'Media/leves_5-min.png', 'Media/leves_6-min.png', 'Media/leves_7-min.png', 'Media/leves_8-min.png' ];

    function applyDecorations() {
        const bgElement = document.querySelector('#canvas .background');
        const randomBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
        bgElement.style.backgroundImage = `url('${randomBg}')`;

        const decorationsContainer = document.getElementById('decorations-container');
        decorationsContainer.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const leaf = document.createElement('img');
            leaf.className = 'leaf-decoration';
            leaf.src = leafImages[Math.floor(Math.random() * leafImages.length)];
            leaf.style.top = `${Math.random() * 90}%`;
            leaf.style.left = `${Math.random() * 90}%`;
            leaf.style.transform = `rotate(${Math.random() * 360}deg) scale(${Math.random() * 0.5 + 0.5})`;
            leaf.style.opacity = `${Math.random() * 0.4 + 0.2}`;
            decorationsContainer.appendChild(leaf);
        }
    }


    // --- CANVAS INTERACTION ---
    const playerAssignModal = document.getElementById('player-assign-modal');
    let activeSlotId = null;

    function handleCanvasClick(e) {
        // Player Slot Click
        const playerSlot = e.target.closest('.player-slot');
        if (playerSlot) {
            activeSlotId = playerSlot.dataset.slotId;
            const availablePlayers = state.players.filter(p => !Object.values(state.assignments).includes(p.id) || state.assignments[activeSlotId] === p.id);

            let optionsHtml = '';
            availablePlayers.forEach(p => {
                optionsHtml += `<div data-player-id="${p.id}">${p.name}</div>`;
            });
            optionsHtml += `<div data-player-id="unassign" style="color: #ff8a8a;">-- Unassign --</div>`;

            playerAssignModal.innerHTML = optionsHtml;
            playerAssignModal.style.left = `${e.clientX}px`;
            playerAssignModal.style.top = `${e.clientY}px`;
            playerAssignModal.classList.remove('modal-hidden');
            return;
        }

        // If clicking anywhere else, hide the assign modal
        if (!e.target.closest('#player-assign-modal')) {
            playerAssignModal.classList.add('modal-hidden');
        }
    }

    function handleAssignPlayer(e) {
        const playerId = e.target.dataset.playerId;
        if (!playerId || !activeSlotId) return;

        if (playerId === 'unassign') {
            delete state.assignments[activeSlotId];
        } else {
            state.assignments[activeSlotId] = parseInt(playerId);
        }

        markDirty();
        render(); // Re-render the whole canvas to reflect change
        playerAssignModal.classList.add('modal-hidden');
    }

    function handleCanvasBlur(e) {
        // Save scores
        const scoreEl = e.target.closest('.score');
        if (scoreEl) {
            const scoreId = scoreEl.dataset.scoreId;
            state.scores[scoreId] = scoreEl.textContent;
            markDirty();
        }

        // Save titles
        const titleEl = e.target.closest('.round-title');
        if (titleEl) {
            const titleId = titleEl.dataset.titleId;
            state.titles[titleId] = titleEl.textContent;
            markDirty();
        }
    }

    // --- INITIALIZATION ---
    function init() {
        loadState();

        saveBtn.addEventListener('click', saveState);

        // Placeholder for other initializations
        console.log('Application initialized with state:', state);

        // Auto-save every 30 seconds if there are changes
        setInterval(() => {
            if (state.isDirty) {
                saveState();
            }
        }, 30000);
    }

    init();

    // --- PLAYER BANK ---
    const playerListEl = document.getElementById('player-list');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const editModal = document.getElementById('player-edit-modal');

    let editingPlayer = null;

    function renderPlayerBank() {
        playerListEl.innerHTML = '';
        state.players.forEach(player => {
            const li = document.createElement('li');
            li.className = 'player-bank-item';
            li.dataset.id = player.id;

            const avatar = document.createElement('img');
            avatar.src = player.avatar;
            avatar.className = 'player-avatar-bank';

            const name = document.createElement('span');
            name.className = 'player-name-bank';
            name.textContent = player.name;

            const flag = document.createElement('img');
            flag.src = player.flag;
            flag.className = 'player-flag-bank';

            const actions = document.createElement('div');
            actions.className = 'player-bank-actions';
            actions.innerHTML = `<button class="edit-player-btn">✏️</button><button class="delete-player-btn">🗑️</button>`;

            li.append(avatar, name, flag, actions);
            playerListEl.appendChild(li);
        });
    }

    function handleAddPlayer() {
        const newPlayer = {
            id: state.nextPlayerId++,
            name: `Player ${state.nextPlayerId - 1}`,
            flag: 'countryflags/aq.png',
            avatar: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        };
        state.players.push(newPlayer);
        markDirty();
        renderPlayerBank();
    }

    function handleDeletePlayer(id) {
        state.players = state.players.filter(p => p.id !== id);
        // Also remove assignments
        for (const slotId in state.assignments) {
            if (state.assignments[slotId] === id) {
                delete state.assignments[slotId];
            }
        }
        markDirty();
        renderPlayerBank();
        // TODO: Re-render canvas
    }

    function openEditModal(player) {
        editingPlayer = player;
        document.getElementById('edit-player-name').value = player.name;
        document.getElementById('edit-current-flag').src = player.flag;
        document.getElementById('edit-current-avatar').src = player.avatar;
        editModal.classList.remove('modal-hidden');
    }

    function closeEditModal() {
        editingPlayer = null;
        editModal.classList.add('modal-hidden');
    }

    function handleSaveChanges() {
        if (!editingPlayer) return;
        editingPlayer.name = document.getElementById('edit-player-name').value;
        // Flag and avatar changes are handled by their own event listeners
        markDirty();
        renderPlayerBank();
        closeEditModal();
        // TODO: Re-render canvas
    }

    function handlePlayerBankClick(e) {
        const target = e.target;
        const playerItem = target.closest('.player-bank-item');
        if (!playerItem) return;

        const playerId = parseInt(playerItem.dataset.id);
        if (target.classList.contains('delete-player-btn')) {
            if (confirm('Are you sure you want to delete this player? This will unassign them from all slots.')) {
                handleDeletePlayer(playerId);
            }
        }
        if (target.classList.contains('edit-player-btn')) {
            const player = state.players.find(p => p.id === playerId);
            openEditModal(player);
        }
    }


    // --- INITIALIZATION ---
    function init() {
        loadState();

        // Toolbar & Modals
        saveBtn.addEventListener('click', saveState);
        addPlayerBtn.addEventListener('click', handleAddPlayer);
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

        // Canvas
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('focusout', handleCanvasBlur);


        console.log('Application initialized with state:', state);
        document.querySelector(`input[name="mode"][value="${state.viewMode}"]`).checked = true;
        render();

        setInterval(() => { if (state.isDirty) saveState(); }, 30000);
    }
});
