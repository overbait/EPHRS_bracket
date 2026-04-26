// --- GLOBAL ERROR HANDLER ---
window.onerror = function(message, source, lineno, colno, error) {
    const queryParams = new URLSearchParams(window.location.search);
    const automationExportFormat = (queryParams.get('automation_export') || '').toLowerCase();
    const autoExportFormat = (queryParams.get('auto_export') || '').toLowerCase();
    const requestedAutoExportFormat = automationExportFormat || autoExportFormat;
    const isLoopbackHosted = /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(window.location.origin);

    if (requestedAutoExportFormat && isLoopbackHosted) {
        try {
            navigator.sendBeacon(
                `${window.location.origin}/api/automation-status`,
                new Blob(
                    [
                        JSON.stringify({
                            status: 'error',
                            format: requestedAutoExportFormat,
                            message: String(message),
                        }),
                    ],
                    { type: 'application/json' }
                )
            );
        } catch (beaconError) {
            console.error('Could not report automation error:', beaconError);
        }
    } else {
        alert('A critical error occurred. Please refresh the page. If the problem persists, try clearing your browser cache for this site.');
    }

    console.error("Caught unhandled error:", { message, source, lineno, colno, error });
    // It's often a good idea to clear potentially corrupted state here
    localStorage.removeItem('tournamentState');
};

window.onunhandledrejection = function(event) {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    return window.onerror(reason, '', 0, 0, event.reason);
};

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const queryParams = new URLSearchParams(window.location.search);
    const isExportMode = queryParams.get('export') === '1';
    const automationExportFormat = (queryParams.get('automation_export') || '').toLowerCase();
    const autoExportFormat = (queryParams.get('auto_export') || '').toLowerCase();
    const requestedAutoExportFormat = automationExportFormat || autoExportFormat;
    const automationExportName = queryParams.get('automation_name') || '';
    const isLoopbackHosted = /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(window.location.origin);
    const SERVER_BASE_URL = isLoopbackHosted ? window.location.origin : 'http://127.0.0.1:8765';
    const isServerHosted = isLoopbackHosted;
    let state = {};
    const defaultState = {
        players: [],
        assignments: {},
        scores: {},
        titles: {
            qf_date: 'July 6', qf_best: 'Best of 5',
            sf_date: 'July 12', sf_best: 'Best of 7',
            final_date: 'July 13', final_best: 'Best of 9',
            third_date: 'July 13', third_best: 'Best of 5',
            final_time: '17:00 GMT', third_time: '15:00 GMT',
        },
        mainTitle_bracket: 'PLAYOFFS',
        mainTitle_groups: 'GROUPS',
        viewMode: 'bracket',
        theme: 'autumn',
        decoration: null,
        positions: {},
        nextPlayerId: 1,
        isDirty: false,
    };

    const themeConfigs = {
        autumn: {
            label: 'Autumn',
            logoMain: 'Media/Logo_main-min.png',
            logoCompact: 'Media/Logo_main-min.png',
            backgrounds: [
                { src: 'Media/background1-min.png', position: 'center center' },
                { src: 'Media/background2-min.png', position: 'center center' },
                { src: 'Media/background3-min.png', position: 'center center' },
            ],
            leafPool: [
                'Media/leves_1-min.png',
                'Media/leves_2-min.png',
                'Media/leves_3-min.png',
                'Media/leves_4-min.png',
                'Media/leves_5-min.png',
                'Media/leves_6-min.png',
                'Media/leves_7-min.png',
                'Media/leves_8-min.png',
            ],
            cardGradients: {
                sizeMin: 280,
                sizeMax: 580,
                blurPx: 52,
                opacity: 0.055,
                colors: [
                    ['#C9CBA3', '#FFE1A8'],
                    ['#E26D5C', '#723D46'],
                    ['#6b3e26', '#e26d5c'],
                    ['#FFE1A8', '#c36a2d'],
                ],
            },
        },
        spring: {
            label: 'Spring',
            logoMain: 'Media/spring_assets/Logo_Spring4.png',
            logoCompact: 'Media/spring_assets/Logo_Spring4_small.png',
            backgrounds: [
                { src: 'Media/spring_assets/bgs/bg_01.png', position: 'left top' },
                { src: 'Media/spring_assets/bgs/bg_02.png', position: 'center top' },
                { src: 'Media/spring_assets/bgs/bg_03.png', position: 'right top' },
                { src: 'Media/spring_assets/bgs/bg_04.png', position: 'left top' },
                { src: 'Media/spring_assets/bgs/bg_05.png', position: 'center top' },
                { src: 'Media/spring_assets/bgs/bg_06.png', position: 'right top' },
            ],
            leafPool: [
                'Media/spring_assets/leaves/leaves_green_mid1.png',
                'Media/spring_assets/leaves/leaves_green_mid2.png',
                'Media/spring_assets/leaves/leaves_green_mid3.png',
                'Media/spring_assets/leaves/leaves_green_mid4.png',
                'Media/spring_assets/leaves/leaves_green_mid5.png',
                'Media/spring_assets/leaves/leaves_green_mid6.png',
                'Media/spring_assets/leaves/leaves_green_mid7.png',
                'Media/spring_assets/leaves/leaves_green_mid8.png',
                'Media/spring_assets/leaves/leaves_green_mid9.png',
                'Media/spring_assets/leaves/leaves_green_small1.png',
                'Media/spring_assets/leaves/leaves_green_small2.png',
                'Media/spring_assets/leaves/leaves_green_small3.png',
                'Media/spring_assets/leaves/leaves_green_small4.png',
                'Media/spring_assets/leaves/leaves_green_small5.png',
                'Media/spring_assets/leaves/leaves_green_small6.png',
                'Media/spring_assets/leaves/leaves_pink_mid1.png',
                'Media/spring_assets/leaves/leaves_pink_mid2.png',
                'Media/spring_assets/leaves/leaves_pink_mid3.png',
                'Media/spring_assets/leaves/leaves_pink_mid4.png',
                'Media/spring_assets/leaves/leaves_pink_mid5.png',
                'Media/spring_assets/leaves/leaves_pink_mid6.png',
                'Media/spring_assets/leaves/leaves_pink_mid7.png',
                'Media/spring_assets/leaves/leaves_pink_mid8.png',
                'Media/spring_assets/leaves/leaves_pink_mid9.png',
                'Media/spring_assets/leaves/leaves_pink_mid10.png',
            ],
            leafPresets: [
                [
                    { src: 'Media/spring_assets/leaves/leaves_green_mid7.png', top: '4%', left: '5%', rotate: -28, scale: 1.08, width: 180, height: 180, opacity: 0.95 },
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid9.png', top: '8%', left: '17%', rotate: -14, scale: 1.03, width: 170, height: 170, opacity: 0.96 },
                    { src: 'Media/spring_assets/leaves/leaves_green_small4.png', top: '12%', left: '32%', rotate: -2, scale: 0.82, width: 92, height: 92, opacity: 0.86 },
                    { src: 'Media/spring_assets/leaves/leaves_green_mid2.png', top: '17%', left: '78%', rotate: 12, scale: 1.04, width: 168, height: 168, opacity: 0.93 },
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid4.png', top: '12%', left: '90%', rotate: 20, scale: 0.98, width: 150, height: 150, opacity: 0.94 },
                    { src: 'Media/spring_assets/leaves/leaves_green_small1.png', top: '28%', left: '93%', rotate: -6, scale: 0.8, width: 84, height: 84, opacity: 0.82 },
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid6.png', top: '69%', left: '2%', rotate: 32, scale: 1.08, width: 170, height: 170, opacity: 0.94 },
                    { src: 'Media/spring_assets/leaves/leaves_green_mid5.png', top: '76%', left: '16%', rotate: 28, scale: 1.01, width: 154, height: 154, opacity: 0.92 },
                    { src: 'Media/spring_assets/leaves/leaves_green_small3.png', top: '68%', left: '29%', rotate: 36, scale: 0.82, width: 90, height: 90, opacity: 0.84 },
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid7.png', top: '74%', left: '82%', rotate: 40, scale: 1.07, width: 170, height: 170, opacity: 0.95 },
                    { src: 'Media/spring_assets/leaves/leaves_green_mid3.png', top: '82%', left: '94%', rotate: 28, scale: 1.01, width: 150, height: 150, opacity: 0.92 },
                ],
                [
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid7.png', top: '6%', left: '8%', rotate: -30, scale: 1.04, width: 152, height: 152, opacity: 0.94 },
                    { src: 'Media/spring_assets/leaves/leaves_green_mid2.png', top: '12%', left: '20%', rotate: -14, scale: 1.02, width: 150, height: 150, opacity: 0.92 },
                    { src: 'Media/spring_assets/leaves/leaves_green_small5.png', top: '16%', left: '33%', rotate: -4, scale: 0.78, width: 88, height: 88, opacity: 0.8 },
                    { src: 'Media/spring_assets/leaves/leaves_green_mid9.png', top: '12%', left: '78%', rotate: -8, scale: 0.98, width: 144, height: 144, opacity: 0.9 },
                    { src: 'Media/spring_assets/leaves/leaves_green_small2.png', top: '18%', left: '90%', rotate: -18, scale: 0.8, width: 90, height: 90, opacity: 0.82 },
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid3.png', top: '72%', left: '4%', rotate: 24, scale: 1.05, width: 150, height: 150, opacity: 0.95 },
                    { src: 'Media/spring_assets/leaves/leaves_green_mid6.png', top: '78%', left: '16%', rotate: 34, scale: 1.01, width: 148, height: 148, opacity: 0.91 },
                    { src: 'Media/spring_assets/leaves/leaves_green_small6.png', top: '65%', left: '28%', rotate: 46, scale: 0.84, width: 92, height: 92, opacity: 0.84 },
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid10.png', top: '74%', left: '74%', rotate: 42, scale: 1.08, width: 155, height: 155, opacity: 0.96 },
                    { src: 'Media/spring_assets/leaves/leaves_green_mid3.png', top: '82%', left: '86%', rotate: 28, scale: 1.01, width: 148, height: 148, opacity: 0.91 },
                    { src: 'Media/spring_assets/leaves/leaves_green_small5.png', top: '68%', left: '96%', rotate: 22, scale: 0.84, width: 90, height: 90, opacity: 0.82 },
                ],
                [
                    { src: 'Media/spring_assets/leaves/leaves_green_mid8.png', top: '8%', left: '74%', rotate: -18, scale: 1.02, width: 148, height: 148, opacity: 0.92 },
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid5.png', top: '14%', left: '87%', rotate: -4, scale: 1.06, width: 152, height: 152, opacity: 0.95 },
                    { src: 'Media/spring_assets/leaves/leaves_green_small2.png', top: '22%', left: '97%', rotate: 10, scale: 0.78, width: 86, height: 86, opacity: 0.82 },
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid8.png', top: '68%', left: '78%', rotate: 24, scale: 1.05, width: 154, height: 154, opacity: 0.95 },
                    { src: 'Media/spring_assets/leaves/leaves_green_mid4.png', top: '76%', left: '91%', rotate: 36, scale: 1.01, width: 150, height: 150, opacity: 0.92 },
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid4.png', top: '10%', left: '2%', rotate: -24, scale: 1.06, width: 156, height: 156, opacity: 0.94 },
                    { src: 'Media/spring_assets/leaves/leaves_green_mid6.png', top: '16%', left: '14%', rotate: -10, scale: 1.01, width: 148, height: 148, opacity: 0.9 },
                    { src: 'Media/spring_assets/leaves/leaves_green_small1.png', top: '23%', left: '27%', rotate: 4, scale: 0.8, width: 88, height: 88, opacity: 0.82 },
                    { src: 'Media/spring_assets/leaves/leaves_pink_mid8.png', top: '72%', left: '6%', rotate: 20, scale: 1.07, width: 158, height: 158, opacity: 0.95 },
                    { src: 'Media/spring_assets/leaves/leaves_green_mid7.png', top: '80%', left: '19%', rotate: 32, scale: 1.02, width: 148, height: 148, opacity: 0.9 },
                    { src: 'Media/spring_assets/leaves/leaves_green_small4.png', top: '67%', left: '31%', rotate: 42, scale: 0.84, width: 92, height: 92, opacity: 0.84 },
                ],
            ],
            cardGradients: {
                sizeMin: 290,
                sizeMax: 560,
                blurPx: 54,
                opacity: 0.06,
                colors: [
                    ['#6EC9FF', '#4DD0E1'],
                    ['#7EE8A1', '#6EC9FF'],
                    ['#F59DDA', '#74E2D6'],
                    ['#B1F2B2', '#75B8FF'],
                ],
            },
        },
    };

    function getThemeConfig(themeId = state.theme) {
        return themeConfigs[themeId] || themeConfigs.autumn;
    }

    function serverApiUrl(path) {
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }

        return `${SERVER_BASE_URL}${path}`;
    }

    async function fetchServerState() {
        try {
            const response = await fetch(serverApiUrl('/api/state'), { cache: 'no-store' });
            if (!response.ok) {
                return null;
            }

            const serverState = await response.json();
            if (!serverState || typeof serverState !== 'object' || Object.keys(serverState).length === 0) {
                return null;
            }

            return serverState;
        } catch (error) {
            console.warn('Could not load state from server:', error);
            return null;
        }
    }

    async function loadState() {
        const shouldUseServerState = isExportMode || isServerHosted;
        const serverState = shouldUseServerState ? await fetchServerState() : null;

        if (serverState) {
            state = serverState;
            console.log('Loaded state from server snapshot.');
        } else {
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
        }

        for (const key in defaultState) {
            if (!state.hasOwnProperty(key)) {
                state[key] = defaultState[key];
            }
        }

        if (!themeConfigs[state.theme]) {
            state.theme = defaultState.theme;
        }

        if (!state.positions || typeof state.positions !== 'object') {
            state.positions = {};
        }

        state.isDirty = false;
        updateSaveButton();
    }

    async function persistStateToServer() {
        try {
            await fetch(serverApiUrl('/api/state'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state),
            });
        } catch (error) {
            console.warn('Could not persist state to server:', error);
        }
    }

    async function saveState() {
        if (!state.isDirty) return;
        try {
            localStorage.setItem('tournamentState', JSON.stringify(state));
            await persistStateToServer();
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

    function applyTheme() {
        document.body.dataset.theme = state.theme;
        document.body.classList.toggle('export-render', isExportMode);
        document.documentElement.classList.toggle('export-render', isExportMode);
        if (themeSelect) {
            themeSelect.value = state.theme;
        }
    }


    // --- DOM ELEMENT REFERENCES ---
    const saveBtn = document.getElementById('save-btn');
    const exportPngBtn = document.getElementById('export-png');
    const exportPdfBtn = document.getElementById('export-pdf');
    const randomiseBackgroundBtn = document.getElementById('randomise-background-btn');
    const randomiseLeavesBtn = document.getElementById('randomise-leaves-btn');
    const themeSelect = document.getElementById('theme-select');
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

    function handleReset() {
        if (confirm('Are you sure you want to reset everything? This will delete all players and clear all slots.')) {
            state = JSON.parse(JSON.stringify(defaultState));
            markDirty();
            saveState();
            applyTheme();
            render();
            renderDecorations();
            updateSaveButton();
            console.log('State has been reset.');
        }
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
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const canvas = document.getElementById('canvas');
    const contentArea = document.querySelector('.content-area');
    const layoutSelector = '[data-draggable-id]';
    let lineRedrawFrame = null;
    let lineRedrawFrameInner = null;
    let layoutSanitizeFrame = null;
    const DRAG_HOLD_MS = 180;

    function getStoredPosition(draggableId) {
        const saved = state.positions?.[draggableId];
        return {
            x: Number(saved?.x) || 0,
            y: Number(saved?.y) || 0,
        };
    }

    function setStoredPosition(draggableId, nextPosition) {
        state.positions[draggableId] = {
            x: Math.round(nextPosition.x),
            y: Math.round(nextPosition.y),
        };
    }

    function applyStoredLayoutPositions(root = document) {
        root.querySelectorAll(layoutSelector).forEach(element => {
            const draggableId = element.dataset.draggableId;
            const position = getStoredPosition(draggableId);
            element.style.translate = `${position.x}px ${position.y}px`;
            element.classList.add('draggable-item');
        });
    }

    function isElementOutsideCanvas(element, canvasRect) {
        const rect = element.getBoundingClientRect();
        const hasHorizontalOverlap = rect.right > canvasRect.left + 12 && rect.left < canvasRect.right - 12;
        const hasVerticalOverlap = rect.bottom > canvasRect.top + 12 && rect.top < canvasRect.bottom - 12;
        return !hasHorizontalOverlap || !hasVerticalOverlap;
    }

    function sanitizeLayoutPositions({ persist = false } = {}) {
        const canvasRect = canvas.getBoundingClientRect();
        if (!canvasRect.width || !canvasRect.height) return;

        let resetAnything = false;
        canvas.querySelectorAll(layoutSelector).forEach(element => {
            const draggableId = element.dataset.draggableId;
            if (!draggableId) return;
            const position = getStoredPosition(draggableId);
            if (position.x === 0 && position.y === 0) return;

            if (!isElementOutsideCanvas(element, canvasRect)) {
                return;
            }

            setStoredPosition(draggableId, { x: 0, y: 0 });
            element.style.translate = '0px 0px';
            resetAnything = true;
        });

        if (!resetAnything) return;

        if (!isExportMode) {
            markDirty();
        }

        scheduleLineRedraw();

        if (persist && !isExportMode) {
            saveState();
        }
    }

    function scheduleLayoutSanitization() {
        if (layoutSanitizeFrame !== null) {
            cancelAnimationFrame(layoutSanitizeFrame);
        }

        layoutSanitizeFrame = requestAnimationFrame(() => {
            layoutSanitizeFrame = null;
            sanitizeLayoutPositions();
        });
    }

    function scheduleLineRedraw() {
        if (lineRedrawFrame !== null) {
            cancelAnimationFrame(lineRedrawFrame);
        }
        if (lineRedrawFrameInner !== null) {
            cancelAnimationFrame(lineRedrawFrameInner);
        }

        lineRedrawFrame = requestAnimationFrame(() => {
            lineRedrawFrame = null;
            lineRedrawFrameInner = requestAnimationFrame(() => {
                lineRedrawFrameInner = null;
                drawProgressionLines();
            });
        });
    }

    function scheduleSettledLineRedraw() {
        scheduleLineRedraw();

        if (document.fonts?.ready) {
            document.fonts.ready.then(() => {
                scheduleLineRedraw();
            }).catch(() => {});
        }

        waitForImages(canvas).then(() => {
            scheduleLineRedraw();
        }).catch(() => {});
    }

    function render() {
        // Clear any existing progression lines whenever a re-render happens.
        // This prevents lines from persisting between view modes or during updates.
        const existingLines = document.querySelector('.progression-lines-svg');
        if (existingLines) {
            existingLines.remove();
        }

        renderPlayerBank();
        const mainTitleEl = document.getElementById('main-title');
        const canvasEl = document.getElementById('canvas');

        // Add a class to the canvas based on the view mode
        canvasEl.classList.remove('bracket-mode', 'groups-mode');
        if (state.viewMode === 'bracket') {
            mainTitleEl.textContent = state.mainTitle_bracket;
            canvasEl.classList.add('bracket-mode');
            renderBracketCanvas(contentArea);
        } else {
            mainTitleEl.textContent = state.mainTitle_groups;
            canvasEl.classList.add('groups-mode');
            renderGroupsCanvas(contentArea);
        }

        applyStoredLayoutPositions(canvas);
        scheduleLayoutSanitization();
        scheduleSettledLineRedraw();
    }

    function renderGroupsCanvas(container) {
        const theme = getThemeConfig();
        const groups = {
            left: ['A', 'C'],
            right: ['B', 'D']
        };

        let leftColumnHtml = '';
        for (const groupLetter of groups.left) {
            leftColumnHtml += renderGroup(groupLetter);
        }

        let rightColumnHtml = '';
        for (const groupLetter of groups.right) {
            rightColumnHtml += renderGroup(groupLetter);
        }

        const logoHtml = `<img src="${theme.logoMain}" alt="Logo" class="draggable-item" data-draggable-id="groups-main-logo" draggable="false">`;

        let html = '<div class="groups-view">'; // This will be position: relative
        html += `<div class="groups-left-col group-column">${leftColumnHtml}</div>`;
        html += `<div class="groups-logo-col logo-column-main">${logoHtml}</div>`;
        html += `<div class="groups-right-col group-column">${rightColumnHtml}</div>`;
        html += '</div>';

        container.innerHTML = html;
        initCardGradients(theme.cardGradients);
    }

    function renderGroup(groupLetter) {
        let groupHtml = `<div class="content-box draggable-item" data-draggable-id="group-card-${groupLetter}">
            <h2 class="group-title" data-title-id="group-title-${groupLetter}" contenteditable="true">${state.titles[`group-title-${groupLetter}`] || `GROUP ${groupLetter}`}</h2>`;
        for (let j = 1; j <= 4; j++) { // Assuming 4 players per group
            const slotId = `group-${groupLetter.toLowerCase()}-${j}`;
            const assignedPlayerId = state.assignments[slotId];
            const player = state.players.find(p => p.id === assignedPlayerId);
            const slotClass = player ? 'player-slot' : 'player-slot empty-slot';
            const flagSrc = player ? player.flag : '';
            const playerName = player ? player.name : '';

            // This new structure mimics the match-box, with the flag as a sibling to the content
            groupHtml += `
                <div class="player-slot-group-wrapper" data-slot-id="${slotId}">
                    <img class="flag-image" src="${flagSrc}" alt="">
                    <div class="${slotClass}">
                        <span class="name">${playerName}</span>
                    </div>
                </div>`;
        }
        groupHtml += `</div>`;
        return groupHtml;
    }

    function renderMatch(matchId, extraClass = '') {
        const p1_slot_id = `${matchId}-p1`;
        const p2_slot_id = `${matchId}-p2`;

        const p1_id = state.assignments[p1_slot_id];
        const p2_id = state.assignments[p2_slot_id];

        const player1 = state.players.find(p => p.id === p1_id);
        const player2 = state.players.find(p => p.id === p2_id);

        const player1Name = player1 ? player1.name : '';
        const player2Name = player2 ? player2.name : '';

        const player1Flag = player1 ? player1.flag : '';
        const player2Flag = player2 ? player2.flag : '';

        const score1 = player1 ? (state.scores[p1_slot_id] !== undefined ? state.scores[p1_slot_id] : 0) : '';
        const score2 = player2 ? (state.scores[p2_slot_id] !== undefined ? state.scores[p2_slot_id] : 0) : '';

        let p1_class = player1 ? 'player-slot' : 'player-slot empty-slot';
        let p2_class = player2 ? 'player-slot' : 'player-slot empty-slot';
        let p1_trophy = '';
        let p2_trophy = '';

        if (score1 > score2) {
            p1_class += ' winner';
            p2_class += ' loser';
            if (matchId === 'final') {
                p1_class += ' grand-final-winner';
                p1_trophy = '<img src="Media/icon_troph2-min.png" class="trophy-icon" alt="Trophy">';
            }
        } else if (score2 > score1) {
            p2_class += ' winner';
            p1_class += ' loser';
            if (matchId === 'final') {
                p2_class += ' grand-final-winner';
                p2_trophy = '<img src="Media/icon_troph2-min.png" class="trophy-icon" alt="Trophy">';
            }
        }

        return `
            <div class="match-box draggable-item ${extraClass}" data-match-id="${matchId}" data-draggable-id="match-${matchId}">
                <img class="flag-image p1-flag-img" src="${player1Flag}" alt="">
                <img class="flag-image p2-flag-img" src="${player2Flag}" alt="">
                <div class="${p1_class}" data-slot-id="${p1_slot_id}">
                    <span class="name">${player1Name}</span>
                    <span class="score" data-score-id="${p1_slot_id}" contenteditable="true">${score1}</span>
                    ${p1_trophy}
                </div>
                <div class="${p2_class}" data-slot-id="${p2_slot_id}">
                    <span class="name">${player2Name}</span>
                    <span class="score" data-score-id="${p2_slot_id}" contenteditable="true">${score2}</span>
                    ${p2_trophy}
                </div>
            </div>`;
    }

    function renderBracketCanvas(container) {
        const theme = getThemeConfig();
        let html = '<div class="bracket-view">'; // This will be a position: relative container

        // --- Absolutely Positioned Columns ---

        // Quarterfinals Column
        html += '<div class="bracket-column bracket-qf-column">';
        html += `<div class="round-header draggable-item" data-draggable-id="header-qf"><span class="date" contenteditable="true" data-title-id="qf_date">${state.titles.qf_date || ''}</span><h3>Quarterfinals</h3><span class="best-of" contenteditable="true" data-title-id="qf_best">${state.titles.qf_best || ''}</span></div>`;
        html += renderMatch('qf1');
        html += renderMatch('qf2');
        html += renderMatch('qf3');
        html += renderMatch('qf4');
        html += '</div>';

        // Semifinals Column
        html += '<div class="bracket-column bracket-sf-column">';
        html += `<div class="round-header draggable-item" data-draggable-id="header-sf"><span class="date" contenteditable="true" data-title-id="sf_date">${state.titles.sf_date || ''}</span><h3>Semifinals</h3><span class="best-of" contenteditable="true" data-title-id="sf_best">${state.titles.sf_best || ''}</span></div>`;
        html += renderMatch('sf1');
        html += renderMatch('sf2');
        html += '</div>';

        // Grand Final Group
        html += '<div class="bracket-column bracket-final-group">';
        html += `<img src="${theme.logoCompact}" alt="Logo" class="final-logo draggable-item" data-draggable-id="main-logo" draggable="false">`;
        html += `<div class="round-header draggable-item" data-draggable-id="header-final"><span class="date" contenteditable="true" data-title-id="final_date">${state.titles.final_date || ''}</span><h3>Grand Final</h3><span class="best-of" contenteditable="true" data-title-id="final_best">${state.titles.final_best || ''}</span><span class="time live" contenteditable="true" data-title-id="final_time">${state.titles.final_time || ''}</span></div>`;
        html += renderMatch('final');
        html += '</div>';

        // 3rd Place Group
        html += '<div class="bracket-column bracket-third-place-group">';
        html += `<div class="round-header third-header draggable-item" data-draggable-id="header-third"><span class="date" contenteditable="true" data-title-id="third_date">${state.titles.third_date || ''}</span><h3>3rd Place Match</h3><span class="best-of" contenteditable="true" data-title-id="third_best">${state.titles.third_best || ''}</span><span class="time live" contenteditable="true" data-title-id="third_time">${state.titles.third_time || ''}</span></div>`;
        html += renderMatch('third-place', 'third-match');
        html += '</div>';

        html += '</div>'; // Close .bracket-view
        container.innerHTML = html;

    }

    const MATCH_LEFT_NOTCH = 20;

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function getVisibleBoundaryX(matchBoxRect, anchorY) {
        const relativeY = clamp((anchorY - matchBoxRect.top) / matchBoxRect.height, 0, 1);
        const notchRatio = 1 - Math.min(1, Math.abs(relativeY - 0.5) / 0.5);
        return matchBoxRect.left + MATCH_LEFT_NOTCH * notchRatio;
    }

    function getAnchorPoint(element, canvasRect, scale, side = 'right') {
        const rect = element.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        let x = side === 'left' ? rect.left : rect.right;

        if (side === 'left') {
            const matchBox = element.closest('.match-box');
            if (matchBox) {
                x = getVisibleBoundaryX(matchBox.getBoundingClientRect(), centerY);
            }
        }

        return {
            x: (x - canvasRect.left) / scale,
            y: (centerY - canvasRect.top) / scale,
        };
    }

    function getMatchSlotAnchor(matchBox, slotIndex, canvasRect, scale, side = 'left') {
        const rect = matchBox.getBoundingClientRect();
        const fallbackRatio = slotIndex === 1 ? 0.28 : 0.72;
        const slotElement = matchBox.querySelector(`[data-slot-id='${matchBox.dataset.matchId}-p${slotIndex}']`);
        const slotRect = slotElement?.getBoundingClientRect();
        const centerY = slotRect
            ? slotRect.top + slotRect.height / 2
            : rect.top + rect.height * fallbackRatio;

        let x = side === 'left' ? rect.left : rect.right;
        if (side === 'left') {
            x = getVisibleBoundaryX(rect, centerY);
        }

        return {
            x: (x - canvasRect.left) / scale,
            y: (centerY - canvasRect.top) / scale,
        };
    }

    function getWinnerTargetAnchor(targetSlotId, canvasRect, scale) {
        const slotElement = document.querySelector(`[data-slot-id='${targetSlotId}']`);
        const slotIndexMatch = /-p([12])$/.exec(targetSlotId);
        const slotIndex = slotIndexMatch ? parseInt(slotIndexMatch[1], 10) : 1;
        const targetMatchId = targetSlotId.replace(/-p[12]$/, '');
        const targetMatchBox = document.querySelector(`.match-box[data-match-id='${targetMatchId}']`);

        if (targetMatchBox) {
            return getMatchSlotAnchor(targetMatchBox, slotIndex, canvasRect, scale, 'left');
        }

        if (slotElement) {
            return getAnchorPoint(slotElement, canvasRect, scale, 'left');
        }

        return null;
    }

    function buildConnectorPath(startPoint, endPoint, laneX) {
        const corridorStart = Math.max(startPoint.x + 28, laneX);
        const safeLaneX = Math.min(endPoint.x - 28, corridorStart);
        const verticalDelta = endPoint.y - startPoint.y;
        const radius = Math.min(22, Math.abs(verticalDelta) / 2, Math.max(12, (endPoint.x - startPoint.x) / 7));

        if (Math.abs(verticalDelta) < 4) {
            return `M ${startPoint.x} ${startPoint.y} H ${endPoint.x}`;
        }

        const sweep = verticalDelta > 0 ? 1 : -1;
        const startCornerY = startPoint.y + radius * sweep;
        const endCornerY = endPoint.y - radius * sweep;

        return [
            `M ${startPoint.x} ${startPoint.y}`,
            `H ${safeLaneX - radius}`,
            `Q ${safeLaneX} ${startPoint.y} ${safeLaneX} ${startCornerY}`,
            `V ${endCornerY}`,
            `Q ${safeLaneX} ${endPoint.y} ${safeLaneX + radius} ${endPoint.y}`,
            `H ${endPoint.x}`,
        ].join(' ');
    }

    function createConnectorPath(startPoint, endPoint, options = {}) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        path.setAttribute('d', buildConnectorPath(startPoint, endPoint, options.laneX));
        path.classList.add('progression-line', options.variant || 'base-line');

        if (options.variant === 'active-line') {
            path.dataset.emphasis = options.emphasis || 'strong';
        }

        if (options.active) {
            path.dataset.active = 'true';
        }

        return path;
    }

    function getConnectionStage(matchId) {
        return matchId.startsWith('qf') ? 'qf-sf' : 'sf-final';
    }

    function getSeededSourceSlot(matchId, p1Slot, p2Slot, progression) {
        if (!progression?.winnerTo) return p1Slot;
        return progression.winnerTo.endsWith('p2') ? p2Slot : p1Slot;
    }

    function assignLanePositions(connections) {
        const grouped = connections.reduce((acc, connection) => {
            const stage = getConnectionStage(connection.matchId);
            acc[stage] = acc[stage] || [];
            acc[stage].push(connection);
            return acc;
        }, {});

        Object.values(grouped).forEach(groupConnections => {
            groupConnections.sort((a, b) => a.baseStart.y - b.baseStart.y);

            const maxStartX = Math.max(...groupConnections.map(connection => connection.baseStart.x));
            const minEndX = Math.min(...groupConnections.map(connection => connection.end.x));
            const corridorWidth = Math.max(60, minEndX - maxStartX - 52);
            const spacing = Math.min(34, Math.max(18, corridorWidth / (groupConnections.length + 1)));
            const laneStart = maxStartX + Math.max(26, corridorWidth * 0.34);
            const centerOffset = (groupConnections.length - 1) / 2;

            groupConnections.forEach((connection, index) => {
                const laneX = laneStart + (index - centerOffset) * spacing;
                connection.laneX = clamp(laneX, maxStartX + 30, minEndX - 30);
            });
        });

        return connections;
    }

    function drawProgressionLines() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        const existingLines = canvas.querySelector('.progression-lines-svg');
        if (existingLines) {
            existingLines.remove();
        }

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('progression-lines-svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '4';

        const canvasRect = canvas.getBoundingClientRect();
        if (canvasRect.width === 0) return;

        const scale = canvasRect.width / canvas.offsetWidth;
        if (scale === 0) return;

        const connections = Object.entries(bracketProgression).map(([matchId, progression]) => {
            const matchBox = document.querySelector(`.match-box[data-match-id='${matchId}']`);
            const endAnchor = progression.winnerTo
                ? getWinnerTargetAnchor(progression.winnerTo, canvasRect, scale)
                : null;

            if (!matchBox || !endAnchor) return null;

            const p1Slot = matchBox.querySelector(`[data-slot-id='${matchId}-p1']`);
            const p2Slot = matchBox.querySelector(`[data-slot-id='${matchId}-p2']`);
            if (!p1Slot || !p2Slot) return null;

            const seededSlot = getSeededSourceSlot(matchId, p1Slot, p2Slot, progression);
            const p1Score = parseInt(p1Slot.querySelector('.score')?.textContent, 10) || 0;
            const p2Score = parseInt(p2Slot.querySelector('.score')?.textContent, 10) || 0;
            const winnerSlot = p1Score === p2Score ? null : (p1Score > p2Score ? p1Slot : p2Slot);

            return {
                matchId,
                progression,
                end: endAnchor,
                baseStart: getAnchorPoint(seededSlot, canvasRect, scale, 'right'),
                activeStart: winnerSlot ? getAnchorPoint(winnerSlot, canvasRect, scale, 'right') : null,
                isResolved: Boolean(winnerSlot),
            };
        }).filter(Boolean);

        assignLanePositions(connections).forEach(connection => {
            const neutralPath = createConnectorPath(connection.baseStart, connection.end, {
                laneX: connection.laneX,
                variant: 'base-line',
            });
            svg.appendChild(neutralPath);

            if (!connection.isResolved || !connection.activeStart) {
                return;
            }

            neutralPath.dataset.active = 'true';

            const activePath = createConnectorPath(connection.activeStart, connection.end, {
                laneX: connection.laneX,
                variant: 'active-line',
                emphasis: 'strong',
            });
            svg.appendChild(activePath);
        });

        if (svg.children.length > 0) {
            canvas.appendChild(svg);
        }
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

        if (progression.winnerTo) {
            state.assignments[progression.winnerTo] = winner_player_id;
        }

        if (progression.loserTo) {
            state.assignments[progression.loserTo] = loser_player_id;
        }

        markDirty();
    }


    // --- DECORATIONS ---
    function initCardGradients({
      blobsPerCard = 3,
      sizeMin = 600,      // Increased for larger blobs
      sizeMax = 1200,     // Increased for larger blobs
      blurPx = 90,        // Increased for softer edges
      opacity = 0.08,     // Decreased for more subtlety
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

    function pickRandomBackground(theme) {
        const background = theme.backgrounds[Math.floor(Math.random() * theme.backgrounds.length)];
        return {
            src: background.src,
            position: background.position || 'center center',
        };
    }

    function buildLeafLayout(theme) {
        const presetPool = theme.leafPresets?.length ? theme.leafPresets : [];
        const chosenPreset = presetPool.length
            ? presetPool[Math.floor(Math.random() * presetPool.length)].map(leaf => ({ ...leaf }))
            : [];

        const desiredLeafCount = theme === themeConfigs.spring ? 16 : 12;
        const layout = chosenPreset.length ? chosenPreset : [];

        while (layout.length < desiredLeafCount) {
            layout.push(...buildRandomLeafLayout(theme, desiredLeafCount - layout.length));
        }

        return layout.slice(0, desiredLeafCount);
    }

    function buildRandomLeafLayout(theme, countOverride = null) {
        const leafCount = countOverride ?? (theme === themeConfigs.spring ? 16 : 12);
        const safeZones = theme === themeConfigs.spring
            ? [
                { top: [4, 28], left: [2, 34] },
                { top: [6, 28], left: [72, 98] },
                { top: [36, 56], left: [2, 20] },
                { top: [36, 56], left: [84, 98] },
                { top: [66, 90], left: [2, 32] },
                { top: [66, 90], left: [72, 98] },
            ]
            : [
                { top: [6, 26], left: [4, 32] },
                { top: [8, 30], left: [74, 96] },
                { top: [36, 56], left: [2, 18] },
                { top: [36, 56], left: [86, 98] },
                { top: [68, 88], left: [6, 34] },
                { top: [66, 88], left: [72, 96] },
            ];

        return Array.from({ length: leafCount }, (_, index) => {
            const zone = safeZones[index % safeZones.length];
            const isSpring = theme === themeConfigs.spring;
            const size = isSpring
                ? (index % 3 === 0 ? 122 : index % 3 === 1 ? 102 : 72)
                : (index % 3 === 0 ? 132 : index % 3 === 1 ? 108 : 76);

            return {
                src: theme.leafPool[Math.floor(Math.random() * theme.leafPool.length)],
                top: `${zone.top[0] + Math.random() * (zone.top[1] - zone.top[0])}%`,
                left: `${zone.left[0] + Math.random() * (zone.left[1] - zone.left[0])}%`,
                rotate: Math.round(Math.random() * 72 - 36),
                scale: isSpring ? (Math.random() * 0.22 + 0.82) : (Math.random() * 0.22 + 0.62),
                width: size,
                height: size,
                opacity: isSpring ? (Math.random() * 0.16 + 0.78) : (Math.random() * 0.22 + 0.34),
            };
        });
    }

    function buildDecorationPreset({ preserveBackground = false, preserveLeaves = false } = {}) {
        const theme = getThemeConfig();
        const background = preserveBackground && state.decoration?.theme === state.theme
            ? { src: state.decoration.background, position: state.decoration.backgroundPosition }
            : pickRandomBackground(theme);
        const leaves = preserveLeaves && state.decoration?.theme === state.theme
            ? state.decoration.leaves.map(leaf => ({ ...leaf }))
            : buildLeafLayout(theme);
        return {
            theme: state.theme,
            background: background.src,
            backgroundPosition: background.position || 'center center',
            leaves,
        };
    }

    function renderDecorations() {
        const backgroundLayer = canvas.querySelector('.background');
        if (!backgroundLayer) return;

        if (!state.decoration || state.decoration.theme !== state.theme) {
            state.decoration = buildDecorationPreset();
        }

        backgroundLayer.style.backgroundImage = `url('${state.decoration.background}')`;
        backgroundLayer.style.backgroundPosition = state.decoration.backgroundPosition || 'center center';

        const decorationsContainer = document.getElementById('decorations-container');
        decorationsContainer.innerHTML = '';

        state.decoration.leaves.forEach(leafConfig => {
            const leaf = document.createElement('img');
            leaf.className = 'leaf-decoration';
            leaf.src = leafConfig.src;
            leaf.style.top = leafConfig.top;
            leaf.style.left = leafConfig.left;
            leaf.style.width = `${leafConfig.width}px`;
            leaf.style.height = `${leafConfig.height}px`;
            leaf.style.transform = `rotate(${leafConfig.rotate}deg) scale(${leafConfig.scale})`;
            leaf.style.opacity = `${leafConfig.opacity ?? 0.9}`;
            decorationsContainer.appendChild(leaf);
        });
    }

    function applyDecorations({ markStateDirty = true, preserveBackground = false, preserveLeaves = false } = {}) {
        state.decoration = buildDecorationPreset({ preserveBackground, preserveLeaves });
        renderDecorations();
        initCardGradients(getThemeConfig().cardGradients);

        if (markStateDirty) {
            markDirty();
        }
    }

    // --- CANVAS INTERACTION ---
    const playerAssignModal = document.getElementById('player-assign-modal');
    let activeSlotId = null;
    let activeLayoutDrag = null;
    let pendingLayoutDrag = null;
    let suppressCanvasClick = false;

    function getCanvasScale() {
        const canvasRect = canvas.getBoundingClientRect();
        return canvasRect.width && canvas.offsetWidth ? canvasRect.width / canvas.offsetWidth : 1;
    }

    function beginLayoutDrag(session) {
        activeLayoutDrag = session;
        pendingLayoutDrag = null;

        if (typeof session.element.setPointerCapture === 'function') {
            session.element.setPointerCapture(session.pointerId);
        }
    }

    function clearPendingLayoutDrag() {
        if (!pendingLayoutDrag) return;
        clearTimeout(pendingLayoutDrag.timerId);
        pendingLayoutDrag = null;
    }

    function buildLayoutDragSession(e, draggable) {
        return {
            pointerId: e.pointerId,
            element: draggable,
            draggableId: draggable.dataset.draggableId,
            startX: e.clientX,
            startY: e.clientY,
            origin: getStoredPosition(draggable.dataset.draggableId),
            moved: false,
        };
    }

    function handleLayoutPointerDown(e) {
        if (isExportMode || e.button !== 0) return;

        const draggable = e.target.closest(layoutSelector);
        if (!draggable || !canvas.contains(draggable)) return;

        const session = buildLayoutDragSession(e, draggable);
        const shouldDelayDrag = Boolean(e.target.closest('.player-slot, .player-slot-group-wrapper'));

        clearPendingLayoutDrag();

        if (shouldDelayDrag) {
            session.timerId = setTimeout(() => {
                beginLayoutDrag(session);
                suppressCanvasClick = true;
            }, DRAG_HOLD_MS);
            pendingLayoutDrag = session;
            return;
        }

        beginLayoutDrag(session);
    }

    function handleLayoutPointerMove(e) {
        if (pendingLayoutDrag && e.pointerId === pendingLayoutDrag.pointerId) {
            const drift = Math.hypot(e.clientX - pendingLayoutDrag.startX, e.clientY - pendingLayoutDrag.startY);
            if (drift > 6) {
                clearPendingLayoutDrag();
            }
        }

        if (!activeLayoutDrag || e.pointerId !== activeLayoutDrag.pointerId) return;

        const scale = getCanvasScale();
        const dx = (e.clientX - activeLayoutDrag.startX) / scale;
        const dy = (e.clientY - activeLayoutDrag.startY) / scale;

        if (!activeLayoutDrag.moved && Math.hypot(dx, dy) < 4) {
            return;
        }

        if (!activeLayoutDrag.moved) {
            activeLayoutDrag.moved = true;
            suppressCanvasClick = true;
            document.body.classList.add('layout-dragging');
            activeLayoutDrag.element.classList.add('is-dragging');
        }

        const nextPosition = {
            x: activeLayoutDrag.origin.x + dx,
            y: activeLayoutDrag.origin.y + dy,
        };

        activeLayoutDrag.element.style.translate = `${nextPosition.x}px ${nextPosition.y}px`;
        scheduleLineRedraw();
        e.preventDefault();
    }

    function finishLayoutDrag(e) {
        if (pendingLayoutDrag && (!e || e.pointerId === pendingLayoutDrag.pointerId)) {
            clearPendingLayoutDrag();
        }

        if (!activeLayoutDrag || (e && e.pointerId !== activeLayoutDrag.pointerId)) return;

        const { element, draggableId, origin, startX, startY, moved } = activeLayoutDrag;

        if (moved && e) {
            const scale = getCanvasScale();
            const nextPosition = {
                x: origin.x + (e.clientX - startX) / scale,
                y: origin.y + (e.clientY - startY) / scale,
            };

            setStoredPosition(draggableId, nextPosition);
            element.style.translate = `${nextPosition.x}px ${nextPosition.y}px`;
            sanitizeLayoutPositions({ persist: false });
            markDirty();
            scheduleLineRedraw();
        }

        element.classList.remove('is-dragging');
        document.body.classList.remove('layout-dragging');
        activeLayoutDrag = null;
    }

    function handleCanvasClick(e) {
        if (suppressCanvasClick) {
            suppressCanvasClick = false;
            return;
        }

        const playerSlot = e.target.closest('.player-slot');
        if (playerSlot) {
            let slotId = playerSlot.dataset.slotId;
            // For group view, the ID is on the wrapper, not the slot itself.
            if (!slotId) {
                const wrapper = playerSlot.closest('.player-slot-group-wrapper');
                if (wrapper) {
                    slotId = wrapper.dataset.slotId;
                }
            }

            if (slotId) {
                activeSlotId = slotId;
                const availablePlayers = state.players; // Allow assigning same player multiple times
                let optionsHtml = availablePlayers.map(p => `<div data-player-id="${p.id}">${p.name}</div>`).join('');
                optionsHtml += `<div data-player-id="unassign" style="color: #ff8a8a;">-- Unassign --</div>`;
                playerAssignModal.innerHTML = optionsHtml;
                playerAssignModal.style.left = `${e.clientX}px`;
                playerAssignModal.style.top = `${e.clientY}px`;
                playerAssignModal.classList.remove('modal-hidden');
                return; // Exit after handling the click
            }
        }

        // If the click was not on a slot, hide the modal (unless clicking in the modal)
        if (!e.target.closest('#player-assign-modal')) {
            playerAssignModal.classList.add('modal-hidden');
        }
    }

    function handleNativeDragStart(e) {
        if (e.target.closest('.final-logo, .logo-column-main img, #bottom-branding img')) {
            e.preventDefault();
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
            render(); // Re-render to show winner/loser styling and progression
            return; // Exit to avoid handling other blurs
        }

        // Handle bracket metadata editing (dates, best-of, etc.)
        const editedTitleEl = e.target.closest('[data-title-id]');
        if (editedTitleEl) {
            const titleId = editedTitleEl.dataset.titleId;
            if (state.titles[titleId] !== editedTitleEl.textContent) {
                state.titles[titleId] = editedTitleEl.textContent;
                markDirty();
            }
        }
    }

    // --- CANVAS SCALING ---
    function scaleCanvas() {
        const wrapper = document.getElementById('canvas-wrapper');
        const canvas = document.getElementById('canvas');
        if (!wrapper || !canvas) return;

        if (isExportMode) {
            canvas.style.left = '0';
            canvas.style.top = '0';
            canvas.style.transform = 'none';
            return;
        }

        const wrapperRect = wrapper.getBoundingClientRect();
        const wrapperWidth = wrapperRect.width;
        const wrapperHeight = wrapperRect.height;

        const canvasWidth = 1840;
        const canvasHeight = 1080;

        const scale = Math.min(wrapperWidth / canvasWidth, wrapperHeight / canvasHeight);

        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }

    function setExportButtonsBusy(isBusy, label = 'Exporting...') {
        [exportPngBtn, exportPdfBtn].forEach(button => {
            if (!button) return;
            if (!button.dataset.defaultLabel) {
                button.dataset.defaultLabel = button.textContent;
            }
            button.disabled = isBusy;
            button.textContent = isBusy ? label : button.dataset.defaultLabel;
        });
    }

    function waitForImages(root) {
        const imageElements = Array.from(root.querySelectorAll('img'));
        const imagePromises = imageElements.map(image => {
            if (image.complete && image.naturalWidth > 0) {
                return Promise.resolve();
            }

            return new Promise(resolve => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
            });
        });

        return Promise.all(imagePromises);
    }

    const exportAssetCache = new Map();

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function requestBlobWithXhr(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 0) {
                    resolve(xhr.response);
                    return;
                }
                reject(new Error(`XHR failed for ${url}`));
            };
            xhr.onerror = () => reject(new Error(`XHR network error for ${url}`));
            xhr.send();
        });
    }

    async function urlToDataUrl(url) {
        if (!url || url.startsWith('data:')) {
            return url;
        }

        if (exportAssetCache.has(url)) {
            return exportAssetCache.get(url);
        }

        try {
            let blob;

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${url}`);
                }
                blob = await response.blob();
            } catch (fetchError) {
                blob = await requestBlobWithXhr(url);
            }

            const dataUrl = await blobToDataUrl(blob);
            exportAssetCache.set(url, dataUrl);
            return dataUrl;
        } catch (error) {
            console.warn('Could not inline export asset:', url, error);
            exportAssetCache.set(url, null);
            return null;
        }
    }

    function extractBackgroundUrls(backgroundValue) {
        const matches = [];
        const regex = /url\((['"]?)(.*?)\1\)/g;
        let result = regex.exec(backgroundValue);

        while (result) {
            matches.push(result[2]);
            result = regex.exec(backgroundValue);
        }

        return matches;
    }

    async function inlineImagesForExport(root) {
        const imageElements = Array.from(root.querySelectorAll('img'));
        await Promise.all(imageElements.map(async image => {
            const source = image.currentSrc || image.src;
            const dataUrl = await urlToDataUrl(source);
            if (dataUrl) {
                image.src = dataUrl;
            }
        }));
    }

    async function inlineBackgroundImagesForExport(root) {
        const elements = [root, ...root.querySelectorAll('*')];

        await Promise.all(elements.map(async element => {
            const backgroundValue = element.style.backgroundImage;
            if (!backgroundValue || backgroundValue === 'none') return;

            let nextValue = backgroundValue;
            const urls = extractBackgroundUrls(backgroundValue);
            for (const url of urls) {
                const dataUrl = await urlToDataUrl(url);
                if (dataUrl) {
                    nextValue = nextValue.replace(url, dataUrl);
                }
            }

            element.style.backgroundImage = nextValue;
        }));
    }

    function freezeComputedStylesForExport(sourceRoot, targetRoot) {
        const sourceElements = [sourceRoot, ...sourceRoot.querySelectorAll('*')];
        const targetElements = [targetRoot, ...targetRoot.querySelectorAll('*')];

        sourceElements.forEach((sourceElement, index) => {
            const targetElement = targetElements[index];
            if (!targetElement) {
                return;
            }

            const computedStyle = window.getComputedStyle(sourceElement);
            for (const propertyName of computedStyle) {
                targetElement.style.setProperty(
                    propertyName,
                    computedStyle.getPropertyValue(propertyName),
                    computedStyle.getPropertyPriority(propertyName)
                );
            }

            targetElement.style.animation = 'none';
            targetElement.style.transition = 'none';
        });
    }

    function buildExportStage({ freezeComputedStyles = false } = {}) {
        const wrapper = document.getElementById('canvas-wrapper');
        if (!wrapper) {
            throw new Error('Canvas wrapper is missing.');
        }

        const stage = document.createElement('div');
        stage.style.position = 'fixed';
        stage.style.left = '-10000px';
        stage.style.top = '0';
        stage.style.width = '1840px';
        stage.style.height = '1080px';
        stage.style.pointerEvents = 'none';
        stage.style.opacity = '1';
        stage.style.zIndex = '-1';

        const clone = wrapper.cloneNode(true);
        if (freezeComputedStyles) {
            freezeComputedStylesForExport(wrapper, clone);
        }
        clone.id = 'export-canvas-wrapper';
        clone.style.width = '1840px';
        clone.style.height = '1080px';
        clone.style.maxWidth = 'none';
        clone.style.aspectRatio = 'auto';
        clone.style.border = 'none';
        clone.style.boxShadow = 'none';

        const cloneCanvas = clone.querySelector('#canvas');
        if (cloneCanvas) {
            cloneCanvas.style.left = '0';
            cloneCanvas.style.top = '0';
            cloneCanvas.style.transform = 'none';
            cloneCanvas.style.transformOrigin = 'top left';
            cloneCanvas.style.width = '1840px';
            cloneCanvas.style.height = '1080px';
        }

        stage.appendChild(clone);
        document.body.appendChild(stage);

        return { stage, target: clone };
    }

    async function renderLiveCanvasForExport() {
        const wrapper = document.getElementById('canvas-wrapper');
        const liveCanvas = document.getElementById('canvas');
        if (!wrapper || !liveCanvas) {
            throw new Error('Live export canvas is missing.');
        }

        const previousWrapperStyle = wrapper.getAttribute('style');
        const previousCanvasStyle = liveCanvas.getAttribute('style');

        wrapper.style.width = '1840px';
        wrapper.style.height = '1080px';
        wrapper.style.maxWidth = 'none';
        wrapper.style.aspectRatio = 'auto';
        wrapper.style.border = 'none';
        wrapper.style.boxShadow = 'none';

        liveCanvas.style.left = '0';
        liveCanvas.style.top = '0';
        liveCanvas.style.transform = 'none';
        liveCanvas.style.transformOrigin = 'top left';
        liveCanvas.style.width = '1840px';
        liveCanvas.style.height = '1080px';

        try {
            await document.fonts.ready;
            await waitForImages(wrapper);
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            return await html2canvas(wrapper, {
                width: 1840,
                height: 1080,
                scale: 1,
                foreignObjectRendering: true,
                useCORS: false,
                allowTaint: false,
                backgroundColor: null,
                logging: false,
                imageTimeout: 0,
            });
        } finally {
            if (previousWrapperStyle === null) {
                wrapper.removeAttribute('style');
            } else {
                wrapper.setAttribute('style', previousWrapperStyle);
            }

            if (previousCanvasStyle === null) {
                liveCanvas.removeAttribute('style');
            } else {
                liveCanvas.setAttribute('style', previousCanvasStyle);
            }
            scaleCanvas();
            scheduleSettledLineRedraw();
        }
    }

    async function renderCanvasForExport() {
        if (typeof html2canvas !== 'function') {
            throw new Error('html2canvas is not available.');
        }

        const useForeignObjectRendering = !automationExportFormat;

        if (useForeignObjectRendering) {
            return renderLiveCanvasForExport();
        }

        const { stage, target } = buildExportStage();

        try {
            await document.fonts.ready;
            await waitForImages(target);
            await inlineImagesForExport(target);
            await inlineBackgroundImagesForExport(target);

            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            return await html2canvas(target, {
                width: 1840,
                height: 1080,
                scale: 1,
                foreignObjectRendering: false,
                useCORS: false,
                allowTaint: false,
                backgroundColor: null,
                logging: false,
                imageTimeout: 0,
            });
        } finally {
            stage.remove();
        }
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function canvasToBlob(canvas, mimeType, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                    return;
                }

                reject(new Error(`Could not convert canvas to ${mimeType}.`));
            }, mimeType, quality);
        });
    }

    function buildExportFilename(format, preferredName = '') {
        const normalizedFormat = format === 'pdf' ? 'pdf' : 'png';
        const trimmedName = preferredName.trim();
        if (!trimmedName) {
            return `tournament-graphic.${normalizedFormat}`;
        }

        return trimmedName.toLowerCase().endsWith(`.${normalizedFormat}`)
            ? trimmedName
            : `${trimmedName}.${normalizedFormat}`;
    }

    async function buildExportArtifact(format, preferredName = '') {
        await saveState();

        const renderedCanvas = await renderCanvasForExport();
        const filename = buildExportFilename(format, preferredName);

        if (format === 'png') {
            const blob = await canvasToBlob(renderedCanvas, 'image/png');
            return { blob, filename };
        }

        if (format === 'pdf') {
            if (!isServerHosted) {
                throw new Error('PDF export requires the local app server.');
            }

            const pngBlob = await canvasToBlob(renderedCanvas, 'image/png');
            const blob = await buildPdfOnServer(pngBlob, filename);
            return { blob, filename };
        }

        throw new Error(`Unsupported export format: ${format}`);
    }

    async function uploadExportArtifact(format, blob, filename) {
        const response = await fetch(
            serverApiUrl(`/api/exports?format=${encodeURIComponent(format)}&filename=${encodeURIComponent(filename)}`),
            {
                method: 'POST',
                headers: {
                    'Content-Type': blob.type || 'application/octet-stream',
                },
                body: blob,
            }
        );

        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `Export upload failed with status ${response.status}`);
        }
    }

    async function buildPdfOnServer(pngBlob, filename) {
        const response = await fetch(
            serverApiUrl(`/api/pdf?filename=${encodeURIComponent(filename)}`),
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'image/png',
                },
                body: pngBlob,
            }
        );

        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `PDF generation failed with status ${response.status}`);
        }

        return response.blob();
    }

    async function reportAutomationStatus(status, message = '') {
        if (!isServerHosted || !requestedAutoExportFormat) {
            return;
        }

        await fetch(serverApiUrl('/api/automation-status'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status,
                format: requestedAutoExportFormat,
                message,
            }),
        });
    }

    async function handleClientExport(format, options = {}) {
        const {
            download = true,
            uploadToServer = false,
            filename = '',
        } = options;

        const artifact = await buildExportArtifact(format, filename);

        if (uploadToServer) {
            await uploadExportArtifact(format, artifact.blob, artifact.filename);
        }

        if (download) {
            downloadBlob(artifact.blob, artifact.filename);
        }

        return artifact;
    }

    async function handleExport(format) {
        setExportButtonsBusy(true, format === 'pdf' ? 'Building PDF...' : 'Building PNG...');

        try {
            await handleClientExport(format);
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Export ${format.toUpperCase()} failed. ${error.message}`);
        } finally {
            setExportButtonsBusy(false);
        }
    }

    async function runAutomationExport() {
        if (!requestedAutoExportFormat) {
            return;
        }

        if (!isServerHosted) {
            throw new Error('Automation export requires the local server.');
        }

        try {
            await handleClientExport(requestedAutoExportFormat, {
                download: false,
                uploadToServer: true,
                filename: automationExportName,
            });
            document.body.dataset.automationExport = 'success';
            await reportAutomationStatus('success');
        } catch (error) {
            document.body.dataset.automationExport = 'error';
            await reportAutomationStatus('error', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }


    // --- INITIALIZATION ---
    async function init() {
        await loadState();
        applyTheme();

        // Toolbar & Modals
        saveBtn.addEventListener('click', () => { saveState(); });
        addPlayerBtn.addEventListener('click', handleAddPlayer);
        randomiseBackgroundBtn.addEventListener('click', () => applyDecorations({ preserveLeaves: true }));
        randomiseLeavesBtn.addEventListener('click', () => applyDecorations({ preserveBackground: true }));
        document.getElementById('reset-btn').addEventListener('click', handleReset);
        exportPngBtn.addEventListener('click', () => { handleExport('png'); });
        exportPdfBtn.addEventListener('click', () => { handleExport('pdf'); });

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
        themeSelect.addEventListener('change', (e) => {
            if (!themeConfigs[e.target.value]) return;
            state.theme = e.target.value;
            state.decoration = buildDecorationPreset();
            applyTheme();
            markDirty();
            render();
            renderDecorations();
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

        // Avatar Upload Listener
        document.getElementById('edit-avatar-upload').addEventListener('change', (e) => {
            if (!editingPlayer) return;
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target.result;
                    editingPlayer.avatar = dataUrl;
                    document.getElementById('edit-current-avatar').src = dataUrl;
                    markDirty(); // Mark state as changed
                };
                reader.readAsDataURL(file);
            }
        });

        // Canvas
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('dragstart', handleNativeDragStart);
        canvas.addEventListener('focusout', handleCanvasBlur);
        canvasWrapper.addEventListener('pointerdown', handleLayoutPointerDown);
        window.addEventListener('pointermove', handleLayoutPointerMove);
        window.addEventListener('pointerup', finishLayoutDrag);
        window.addEventListener('pointercancel', finishLayoutDrag);
        window.addEventListener('resize', () => {
            scaleCanvas();
            scheduleLineRedraw();
        });
        window.addEventListener('load', () => {
            scaleCanvas();
            scheduleSettledLineRedraw();
        });

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
        themeSelect.value = state.theme;
        render();
        scaleCanvas(); // Initial scale
        renderDecorations();
        initCardGradients(getThemeConfig().cardGradients);
        await runAutomationExport();

        setInterval(() => { if (state.isDirty) saveState(); }, 30000);
    }

    init();
});
