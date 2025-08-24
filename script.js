document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let players = [];
    let nextPlayerId = 1;
    let editingPlayerId = null;

    // --- CONSTANTS & DEFAULTS ---
    const countryFlags = [
        'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'eh', 'er', 'es', 'et', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'um', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'ye', 'yt', 'za', 'zm', 'zw'
    ];
    const defaultFlag = 'countryflags/aq.png';
    const defaultAvatar = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';

    // --- DOM ELEMENTS ---
    const playerListEl = document.getElementById('player-list');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const canvas = document.getElementById('canvas');
    const canvasWrapper = document.getElementById('canvas-wrapper');

    // --- PLAYER BANK FUNCTIONS ---
    function getPlayer(id) {
        return players.find(p => p.id === id);
    }

    function renderPlayerBank() {
        playerListEl.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.className = 'player-bank-item';
            li.dataset.id = player.id;
            li.innerHTML = `
                <img src="${player.avatar}" class="player-avatar-bank" alt="Avatar">
                <span class="player-name-bank">${player.name}</span>
                <img src="${player.flag}" class="player-flag-bank" alt="Flag">
                <div class="player-bank-actions">
                    <button class="edit-player-btn">✏️</button>
                    <button class="delete-player-btn">🗑️</button>
                </div>
            `;
            playerListEl.appendChild(li);
        });
    }

    function handleAddPlayer() {
        const newPlayer = {
            id: nextPlayerId++,
            name: `Player ${nextPlayerId - 1}`,
            flag: defaultFlag,
            avatar: defaultAvatar,
            assigned: false
        };
        players.push(newPlayer);
        renderPlayerBank();
    }

    function handleDeletePlayer(id) {
        players = players.filter(p => p.id !== id);
        // TODO: Unassign player from any slots if they are on the canvas
        renderPlayerBank();
    }

    function handlePlayerBankClick(e) {
        const target = e.target;
        const playerItem = target.closest('.player-bank-item');
        if (!playerItem) return;

        const playerId = parseInt(playerItem.dataset.id);
        if (target.classList.contains('delete-player-btn')) {
            handleDeletePlayer(playerId);
        }
        if (target.classList.contains('edit-player-btn')) {
            // TODO: Open edit modal
            console.log('Editing player', playerId);
        }
    }

    // --- SCALING ---
    function resizeCanvas() {
        const wrapperWidth = canvasWrapper.clientWidth;
        const scale = wrapperWidth / 1920;
        canvas.style.transform = `scale(${scale})`;
    }

    let assignments = {}; // { 'slot-id': playerId, ... }
    let activeSlot = null;

    // --- CANVAS INTERACTION ---
    function handleCanvasClick(e) {
        const target = e.target;
        const playerSlot = target.closest('.player-slot');

        if (playerSlot) {
            activeSlot = playerSlot.dataset.slotId;
            const modal = document.getElementById('player-assign-modal');

            // Populate modal with unassigned players
            const assignList = document.getElementById('player-assign-list');
            assignList.innerHTML = '';
            const assignedPlayerIds = Object.values(assignments);
            const availablePlayers = players.filter(p => !assignedPlayerIds.includes(p.id));

            availablePlayers.forEach(p => {
                const div = document.createElement('div');
                div.dataset.playerId = p.id;
                div.textContent = p.name;
                assignList.appendChild(div);
            });

            // Add option to unassign
            if (assignments[activeSlot]) {
                 const unassign = document.createElement('div');
                 unassign.dataset.playerId = 'unassign';
                 unassign.textContent = '--- Unassign ---';
                 unassign.style.color = 'red';
                 assignList.prepend(unassign);
            }

            modal.style.left = `${e.clientX + 5}px`;
            modal.style.top = `${e.clientY + 5}px`;
            modal.classList.remove('modal-hidden');
        } else if (!target.closest('#player-assign-modal')) {
            // Hide modal if clicking anywhere else that's not the modal itself
            document.getElementById('player-assign-modal').classList.add('modal-hidden');
        }
    }

    function handlePlayerAssign(e) {
        const playerIdStr = e.target.dataset.playerId;
        if (!playerIdStr || !activeSlot) return;

        const modal = document.getElementById('player-assign-modal');
        modal.classList.add('modal-hidden');

        const slotElement = document.querySelector(`[data-slot-id='${activeSlot}']`);
        if (!slotElement) return;

        // Unassigning
        if (playerIdStr === 'unassign') {
            delete assignments[activeSlot];
            slotElement.querySelector('.name').textContent = '...';
            slotElement.querySelector('.flag').innerHTML = '';
            return;
        }

        const playerId = parseInt(playerIdStr);
        const player = getPlayer(playerId);

        // Update state
        assignments[activeSlot] = playerId;

        // Update view
        slotElement.querySelector('.name').textContent = player.name;
        slotElement.querySelector('.flag').innerHTML = `<img src="${player.flag}" alt="flag">`;

        activeSlot = null;
    }


    const backgroundImages = [ 'Media/background1-min.png', 'Media/background2-min.png', 'Media/background3-min.png' ];
    const leafImages = [ 'Media/leves_1-min.png', 'Media/leves_2-min.png', 'Media/leves_3-min.png', 'Media/leves_4-min.png', 'Media/leves_5-min.png', 'Media/leves_6-min.png', 'Media/leves_7-min.png', 'Media/leves_8-min.png' ];

    function applyDecorations() {
        // Background
        const bgElement = document.querySelector('#canvas .background');
        const randomBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
        bgElement.style.backgroundImage = `url('${randomBg}')`;

        // Leaves
        const decorationsContainer = document.getElementById('decorations-container');
        decorationsContainer.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const leaf = document.createElement('img');
            leaf.className = 'leaf-decoration';
            leaf.src = leafImages[Math.floor(Math.random() * leafImages.length)];
            leaf.style.top = `${Math.random() * 90}%`;
            leaf.style.left = `${Math.random() * 90}%`;
            leaf.style.transform = `rotate(${Math.random() * 360}deg) scale(${Math.random() * 0.5 + 0.5})`;
            decorationsContainer.appendChild(leaf);
        }
    }

    // --- CANVAS RENDERING ---
    function renderBracketCanvas(container) {
        container.innerHTML = `
            <div class="bracket-view">
                <!-- Logo -->
                <img src="Media/Logo_main-min.png" style="position: absolute; top: 20px; right: 20px; width: 300px;">

                <!-- Round Titles -->
                <div class="round-title" style="top: 10px; left: 150px;" contenteditable="true">JULY 6<br>QUARTERFINALS</div>
                <div class="round-title" style="top: 10px; left: 600px;" contenteditable="true">JULY 12<br>SEMIFINALS</div>
                <div class="round-title" style="top: 10px; left: 1050px;" contenteditable="true">JULY 13<br>GRAND FINAL</div>
                <div class="round-title" style="top: 730px; left: 1050px;" contenteditable="true">3RD PLACE MATCH</div>

                <!-- Quarter Finals -->
                <div class="match-box" style="top: 100px; left: 100px;" data-match-id="qf1">
                    <div class="player-slot" data-slot-id="qf1-p1"><span class="flag"></span><span class="name">Player 1</span><span class="score" contenteditable="true">0</span></div>
                    <div class="player-slot" data-slot-id="qf1-p2"><span class="flag"></span><span class="name">Player 2</span><span class="score" contenteditable="true">0</span></div>
                </div>
                <div class="match-box" style="top: 300px; left: 100px;" data-match-id="qf2">
                    <div class="player-slot" data-slot-id="qf2-p1"><span class="flag"></span><span class="name">Player 3</span><span class="score" contenteditable="true">0</span></div>
                    <div class="player-slot" data-slot-id="qf2-p2"><span class="flag"></span><span class="name">Player 4</span><span class="score" contenteditable="true">0</span></div>
                </div>
                <div class="match-box" style="top: 550px; left: 100px;" data-match-id="qf3">
                    <div class="player-slot" data-slot-id="qf3-p1"><span class="flag"></span><span class="name">Player 5</span><span class="score" contenteditable="true">0</span></div>
                    <div class="player-slot" data-slot-id="qf3-p2"><span class="flag"></span><span class="name">Player 6</span><span class="score" contenteditable="true">0</span></div>
                </div>
                <div class="match-box" style="top: 750px; left: 100px;" data-match-id="qf4">
                    <div class="player-slot" data-slot-id="qf4-p1"><span class="flag"></span><span class="name">Player 7</span><span class="score" contenteditable="true">0</span></div>
                    <div class="player-slot" data-slot-id="qf4-p2"><span class="flag"></span><span class="name">Player 8</span><span class="score" contenteditable="true">0</span></div>
                </div>

                <!-- Semi Finals -->
                <div class="match-box" style="top: 200px; left: 550px;" data-match-id="sf1">
                    <div class="player-slot" data-slot-id="sf1-p1"><span class="flag"></span><span class="name">Winner QF1</span><span class="score" contenteditable="true">0</span></div>
                    <div class="player-slot" data-slot-id="sf1-p2"><span class="flag"></span><span class="name">Winner QF2</span><span class="score" contenteditable="true">0</span></div>
                </div>
                <div class="match-box" style="top: 650px; left: 550px;" data-match-id="sf2">
                    <div class="player-slot" data-slot-id="sf2-p1"><span class="flag"></span><span class="name">Winner QF3</span><span class="score" contenteditable="true">0</span></div>
                    <div class="player-slot" data-slot-id="sf2-p2"><span class="flag"></span><span class="name">Winner QF4</span><span class="score" contenteditable="true">0</span></div>
                </div>

                <!-- Final -->
                <div class="match-box" style="top: 425px; left: 1000px;" data-match-id="final">
                    <div class="player-slot" data-slot-id="final-p1"><span class="flag"></span><span class="name">Winner SF1</span><span class="score" contenteditable="true">0</span></div>
                    <div class="player-slot" data-slot-id="final-p2"><span class="flag"></span><span class="name">Winner SF2</span><span class="score" contenteditable="true">0</span></div>
                </div>

                <!-- 3rd Place Match -->
                <div class="match-box" style="top: 800px; left: 1000px;" data-match-id="third">
                    <div class="player-slot" data-slot-id="third-p1"><span class="flag"></span><span class="name">Loser SF1</span><span class="score" contenteditable="true">0</span></div>
                    <div class="player-slot" data-slot-id="third-p2"><span class="flag"></span><span class="name">Loser SF2</span><span class="score" contenteditable="true">0</span></div>
                </div>

                <!-- Connectors -->
                <div class="connector" style="top: 145px; left: 400px; width: 150px; height: 100px; border-width: 4px 4px 4px 0; border-radius: 0 10px 10px 0;"></div>
                <div class="connector" style="top: 245px; left: 400px; width: 50px; height: 0; border-top: 4px solid;"></div>
                <div class="connector" style="top: 245px; left: 450px; width: 0; height: 100px; border-right: 4px solid;"></div>

                <div class="connector" style="top: 345px; left: 400px; width: 150px; height: 100px; border-width: 0 4px 4px 0; border-radius: 0 0 10px 0;"></div>

                <div class="connector" style="top: 595px; left: 400px; width: 150px; height: 100px; border-width: 4px 4px 4px 0; border-radius: 0 10px 10px 0;"></div>
                <div class="connector" style="top: 695px; left: 400px; width: 50px; height: 0; border-top: 4px solid;"></div>
                <div class="connector" style="top: 695px; left: 450px; width: 0; height: 100px; border-right: 4px solid;"></div>

                <div class="connector" style="top: 795px; left: 400px; width: 150px; height: 100px; border-width: 0 4px 4px 0; border-radius: 0 0 10px 0;"></div>

                <div class="connector" style="top: 245px; left: 850px; width: 150px; height: 225px; border-width: 4px 4px 4px 0; border-radius: 0 10px 10px 0;"></div>
                <div class="connector" style="top: 470px; left: 850px; width: 50px; height: 0; border-top: 4px solid;"></div>

                <div class="connector" style="top: 695px; left: 850px; width: 150px; height: 225px; border-width: 0 4px 4px 0; border-radius: 0 0 10px 0;"></div>
            </div>
        `;
    }

    function render(mode) {
        const contentArea = document.querySelector('#canvas .content-area');
        if (mode === 'bracket') {
            renderBracketCanvas(contentArea);
        } else {
            renderGroupsCanvas(contentArea);
        }
        applyDecorations();
    }

    function renderGroupsCanvas(container) {
        let columnsHtml = '';
        const groups = ['A', 'B'];
        groups.forEach(groupLetter => {
            let column = `<div class="group-column">
                <h2 class="group-title">GROUP ${groupLetter}</h2>`;
            for (let i = 1; i <= 8; i++) {
                const slotId = `group-${groupLetter.toLowerCase()}-${i}`;
                column += `
                    <div class="player-slot" data-slot-id="${slotId}">
                        <span class="avatar"></span>
                        <span class="name">Player ${i}</span>
                        <span class="flag"></span>
                    </div>`;
            }
            column += `</div>`;
            columnsHtml += column;
        });

        const finalHtml = `
            <div class="groups-view">
                <div class="logo-area">
                    <img src="Media/Logo_main-min.png" alt="Logo">
                    <h1 contenteditable="true">MAIN EVENT<br>GROUPS</h1>
                </div>
                <div class="groups-area">
                    ${columnsHtml}
                </div>
            </div>
        `;
        container.innerHTML = finalHtml;
    }


    // --- INITIALIZATION ---
    function init() {
        addPlayerBtn.addEventListener('click', handleAddPlayer);
        playerListEl.addEventListener('click', handlePlayerBankClick);
        window.addEventListener('resize', resizeCanvas);
        canvas.addEventListener('click', handleCanvasClick);
        document.getElementById('player-assign-list').addEventListener('click', handlePlayerAssign);
        document.getElementById('export-png').addEventListener('click', exportToPng);

        document.querySelectorAll('input[name="mode"]').forEach(radio => {
            radio.addEventListener('change', e => {
                render(e.target.value);
            });
        });

        // Add some default players for testing
        for(let i=0; i<8; i++) { handleAddPlayer(); }

        resizeCanvas();
        render('bracket'); // Initial render
    }

    function exportToPng() {
        const originalTransform = canvas.style.transform;
        canvas.style.transform = 'scale(1)';

        html2canvas(canvas, {
            width: 1920,
            height: 1080,
            backgroundColor: null,
            useCORS: true,
        }).then(canvasImg => {
            const link = document.createElement('a');
            link.download = 'tournament-graphic.png';
            link.href = canvasImg.toDataURL('image/png');
            link.click();
            canvas.style.transform = originalTransform;
        }).catch(err => {
            console.error("PNG Export failed:", err);
            canvas.style.transform = originalTransform;
        });
    }

    init();
});
