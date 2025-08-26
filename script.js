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
    let loadedImageAssets = new Map(); // To store preloaded Image objects
    let clickableAreas = []; // For canvas interaction

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
        nextPlayerId: 1,
        decorations: [],
        backgroundSrc: null,
        isDirty: false,
    };

    // --- ASSET DEFINITIONS ---
    const backgroundImages = [ 'Media/background1-min.png', 'Media/background2-min.png', 'Media/background3-min.png' ];
    const leafImages = [ 'Media/leves_1-min.png', 'Media/leves_2-min.png', 'Media/leves_3-min.png', 'Media/leves_4-min.png', 'Media/leves_5-min.png', 'Media/leves_6-min.png', 'Media/leves_7-min.png', 'Media/leves_8-min.png' ];

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

    // --- ASSET PRELOADING ---
    async function preloadAssets() {
        console.log('Preloading assets...');
        const imageMap = new Map();
        const promises = [];

        // Font
        const font = new FontFace('SouthParkFont', 'url(Media/fonts_spfont 2.ttf)');
        promises.push(
            font.load().then(f => {
                document.fonts.add(f);
                console.log('Font loaded: SouthParkFont');
            }).catch(e => console.error("Font load error:", e))
        );

        // Images
        const imageSources = [
            ...backgroundImages,
            ...leafImages,
            'Media/Logo_main-min.png',
            'Media/text new-min.png'
        ];

        state.players.forEach(player => {
            imageSources.push(player.flag);
            imageSources.push(player.avatar);
        });

        const uniqueImageSources = [...new Set(imageSources.filter(Boolean))];

        uniqueImageSources.forEach(src => {
            const promise = new Promise(resolve => {
                const img = new Image();
                // For external images, we need to handle CORS to avoid tainted canvas
                if (!src.startsWith('data:')) {
                    img.crossOrigin = "Anonymous";
                }

                img.src = src;

                img.onload = () => {
                    imageMap.set(src, img);
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${src}`);
                    resolve(); // Resolve anyway to not block the app
                };
            });
            promises.push(promise);
        });

        await Promise.all(promises);
        console.log('Asset preloading complete.');
        return imageMap;
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
        render(); // Re-draw canvas with updated player info
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
                render(); // Re-draw canvas to remove the player
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
    const canvasEl = document.getElementById('tournament-canvas');
    const ctx = canvasEl.getContext('2d');

    function render() {
        // Ensure we don't render before assets are loaded
        if (loadedImageAssets.size === 0) {
            console.log("Assets not loaded yet, skipping render.");
            return;
        }

        // 0. Render player bank (this is outside the canvas)
        renderPlayerBank();

        // 1. Clear the canvas and clickable areas
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        clickableAreas = [];

        // Set default text styles
        ctx.fillStyle = 'white';
        ctx.font = '24px "Cinzel"';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // 2. Render background
        renderBackground();

        // 3. Render main content (bracket or groups)
        if (state.viewMode === 'bracket') {
            renderBracket();
        } else {
            renderGroups();
        }

        // 4. Render decorations on top
        renderDecorations();

        // 5. Render branding and titles on top of everything
        renderBranding();

        console.log("Canvas rendering complete.");
    }

    function renderBackground() {
        if (!state.backgroundSrc) {
            return; // Don't draw if no background is set
        }
        const bgImg = loadedImageAssets.get(state.backgroundSrc);
        if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, canvasEl.width, canvasEl.height);
        } else {
            // Fallback if image not loaded
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
        }
    }

    function renderBracket() {
        // Layout Constants
        const COLUMN_WIDTH = 400;
        const MATCH_HEIGHT = 110;
        const MATCH_V_GAP = 40;
        const QF_X = 50;
        const SF_X = QF_X + COLUMN_WIDTH + 120;
        const FINAL_X = SF_X + COLUMN_WIDTH + 120;
        const THIRD_X = SF_X + COLUMN_WIDTH / 2;

        const QF_HEADER_Y = 50;
        const QF_START_Y = QF_HEADER_Y + 80;

        // --- Draw Headers ---
        drawRoundHeader(QF_X, QF_HEADER_Y, COLUMN_WIDTH, 'Quarterfinals', 'qf_date', 'qf_best');
        drawRoundHeader(SF_X, QF_HEADER_Y, COLUMN_WIDTH, 'Semifinals', 'sf_date', 'sf_best');
        const finalLogo = loadedImageAssets.get('Media/Logo_main-min.png');
        if (finalLogo) ctx.drawImage(finalLogo, FINAL_X, QF_HEADER_Y, 250, (finalLogo.height/finalLogo.width)*250);
        drawRoundHeader(FINAL_X, QF_HEADER_Y + 180, COLUMN_WIDTH, 'Grand Final', 'final_date', 'final_best', 'final_time');
        drawRoundHeader(THIRD_X, QF_START_Y + 4 * (MATCH_HEIGHT + MATCH_V_GAP) + 20, COLUMN_WIDTH, '3rd Place Match', 'third_date', 'third_best', 'third_time');

        // --- Draw Match Boxes ---
        const matchPositions = {}; // Store center Y coords for line drawing

        // QF
        for (let i = 0; i < 4; i++) {
            const y = QF_START_Y + i * (MATCH_HEIGHT + MATCH_V_GAP);
            const matchId = `qf${i+1}`;
            drawMatchBox(QF_X, y, COLUMN_WIDTH, MATCH_HEIGHT, matchId);
            matchPositions[matchId] = { x: QF_X + COLUMN_WIDTH, y: y + MATCH_HEIGHT / 2 };
        }
        // SF
        const sf1_y = (matchPositions['qf1'].y + matchPositions['qf2'].y) / 2 - MATCH_HEIGHT / 2;
        drawMatchBox(SF_X, sf1_y, COLUMN_WIDTH, MATCH_HEIGHT, 'sf1');
        matchPositions['sf1'] = { x: SF_X + COLUMN_WIDTH, y: sf1_y + MATCH_HEIGHT / 2 };
        const sf2_y = (matchPositions['qf3'].y + matchPositions['qf4'].y) / 2 - MATCH_HEIGHT / 2;
        drawMatchBox(SF_X, sf2_y, COLUMN_WIDTH, MATCH_HEIGHT, 'sf2');
        matchPositions['sf2'] = { x: SF_X + COLUMN_WIDTH, y: sf2_y + MATCH_HEIGHT / 2 };
        // Final
        const final_y = (matchPositions['sf1'].y + matchPositions['sf2'].y) / 2 - MATCH_HEIGHT / 2;
        drawMatchBox(FINAL_X, final_y, COLUMN_WIDTH, MATCH_HEIGHT, 'final');
        matchPositions['final'] = { x: FINAL_X, y: final_y + MATCH_HEIGHT / 2 };
        // 3rd Place
        const third_y = QF_START_Y + 4 * (MATCH_HEIGHT + MATCH_V_GAP) + 120;
        drawMatchBox(THIRD_X, third_y, COLUMN_WIDTH, MATCH_HEIGHT, 'third-place');
        matchPositions['third-place'] = { x: THIRD_X, y: third_y + MATCH_HEIGHT / 2 };

        // --- Draw Lines ---
        drawBracketLines(matchPositions);
    }

    function drawRoundHeader(x, y, width, title, dateId, bestOfId, timeId) {
        ctx.save();
        ctx.textAlign = 'center';

        const date = state.titles[dateId] || '';
        const bestOf = state.titles[bestOfId] || '';
        const time = state.titles[timeId] || '';

        // Title
        ctx.font = '32px "SouthParkFont"';
        ctx.fillStyle = '#ffd27d';
        ctx.fillText(title, x + width / 2, y + 30);

        // Date, Best Of, Time
        const smallFont = '16px "Cinzel"';
        const smallFontHeight = 16;
        ctx.font = smallFont;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        if (dateId) {
            const metrics = ctx.measureText(date);
            const textX = x + width / 2 - metrics.width / 2;
            ctx.fillText(date, x + width / 2, y);
            clickableAreas.push({ x: textX, y: y, width: metrics.width, height: smallFontHeight, type: 'title', id: dateId, font: smallFont, color: 'white' });
        }
        if (bestOfId) {
            const metrics = ctx.measureText(bestOf);
            const textX = x + width / 2 - metrics.width / 2;
            ctx.fillText(bestOf, x + width / 2, y + 65);
            clickableAreas.push({ x: textX, y: y + 65, width: metrics.width, height: smallFontHeight, type: 'title', id: bestOfId, font: smallFont, color: 'white' });
        }
        if (timeId) {
            ctx.fillStyle = '#e06636';
            const metrics = ctx.measureText(time);
            const textX = x + width / 2 - metrics.width / 2;
            ctx.fillText(time, x + width / 2, y + 85);
            clickableAreas.push({ x: textX, y: y + 85, width: metrics.width, height: smallFontHeight, type: 'title', id: timeId, font: smallFont, color: '#e06636' });
        }
        ctx.restore();
    }

    function drawMatchBox(x, y, width, height, matchId) {
        ctx.save();
        // Draw the clipped polygon shape
        ctx.beginPath();
        ctx.moveTo(x + 20, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + 20, y + height);
        ctx.lineTo(x, y + height / 2);
        ctx.closePath();

        ctx.fillStyle = 'rgba(44, 28, 17, .8)';
        ctx.fill();
        ctx.strokeStyle = '#ffd27d';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Draw player slots inside
        const p1_slot_id = `${matchId}-p1`;
        const p2_slot_id = `${matchId}-p2`;
        drawPlayerSlotInBracket(x, y, width, height / 2, p1_slot_id);
        drawPlayerSlotInBracket(x, y + height / 2, width, height / 2, p2_slot_id);
    }

    function drawPlayerSlotInBracket(x, y, width, height, slotId) {
        // Register clickable area for the whole slot
        clickableAreas.push({ x, y, width, height, type: 'playerSlot', id: slotId });

        // Register a more specific area for the score
        const scoreWidth = 60;
        clickableAreas.push({
            x: x + width - scoreWidth,
            y: y,
            width: scoreWidth,
            height: height,
            type: 'score',
            id: slotId
        });

        const assignedPlayerId = state.assignments[slotId];
        const player = state.players.find(p => p.id === assignedPlayerId);
        const score = player ? (state.scores[slotId] !== undefined ? state.scores[slotId] : 0) : '';

        // Winner/loser background highlight
        const matchId = slotId.substring(0, slotId.lastIndexOf('-'));
        const p1_score = parseInt(state.scores[`${matchId}-p1`], 10) || 0;
        const p2_score = parseInt(state.scores[`${matchId}-p2`], 10) || 0;
        const isP1 = slotId.endsWith('-p1');

        if (p1_score !== p2_score) {
            const isWinner = (isP1 && p1_score > p2_score) || (!isP1 && p2_score > p1_score);
            ctx.save();
            const grad = ctx.createRadialGradient(x + width - 50, y + height/2, 0, x + width - 50, y + height/2, 150);
            if (isWinner) {
                grad.addColorStop(0, 'rgba(60, 179, 113, 0.3)');
            } else {
                grad.addColorStop(0, 'rgba(220, 20, 60, 0.2)');
            }
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, width, height);
            ctx.restore();
        }

        if (player) {
            // Flag
            const flagImg = loadedImageAssets.get(player.flag);
            if (flagImg) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.moveTo(x, y + height);
                ctx.lineTo(x, y);
                ctx.lineTo(x + width * 0.5, y);
                ctx.lineTo(x + width * 0.5, y + height);
                ctx.clip();
                ctx.drawImage(flagImg, x, y, width * 0.5, height);
                ctx.restore();
            }

            // Name
            ctx.save();
            ctx.font = '22px "SouthParkFont"';
            ctx.fillStyle = '#ffd27d';
            ctx.textBaseline = 'middle';
            ctx.fillText(player.name, x + 40, y + height / 2);
            ctx.restore();

            // Score
            ctx.save();
            ctx.font = '32px "SouthParkFont"';
            ctx.fillStyle = '#ffd27d';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(score, x + width - 20, y + height / 2);
            ctx.restore();
        }
    }

    function drawBracketLines(matchPositions) {
        ctx.save();
        ctx.strokeStyle = '#ffd27d';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ffd27d';
        ctx.shadowBlur = 3;

        Object.keys(bracketProgression).forEach(matchId => {
            const p1_score = parseInt(state.scores[`${matchId}-p1`], 10) || 0;
            const p2_score = parseInt(state.scores[`${matchId}-p2`], 10) || 0;
            if (p1_score === p2_score) return; // No winner

            const progression = bracketProgression[matchId];
            const winnerToId = progression.winnerTo;
            const loserToId = progression.loserTo;

            const startPos = matchPositions[matchId];

            if (winnerToId) {
                const endPos = matchPositions[winnerToId.substring(0, winnerToId.lastIndexOf('-'))];
                if (startPos && endPos) {
                    const midX = startPos.x + (endPos.x - startPos.x) / 2;
                    ctx.beginPath();
                    ctx.moveTo(startPos.x, startPos.y);
                    ctx.lineTo(midX, startPos.y);
                    ctx.lineTo(midX, endPos.y);
                    ctx.lineTo(endPos.x, endPos.y);
                    ctx.stroke();
                }
            }
            if (loserToId) {
                 const endPos = matchPositions[loserToId.substring(0, loserToId.lastIndexOf('-'))];
                 if (startPos && endPos) {
                    const midX = startPos.x + 30; // Just a little nudge out
                    const midY = endPos.y - 30;
                    ctx.beginPath();
                    ctx.moveTo(startPos.x, startPos.y);
                    ctx.lineTo(midX, startPos.y);
                    ctx.lineTo(midX, midY);
                    ctx.lineTo(endPos.x, midY);
                    ctx.lineTo(endPos.x, endPos.y);
                    ctx.stroke();
                 }
            }
        });
        ctx.restore();
    }

    function renderGroups() {
        const logoImg = loadedImageAssets.get('Media/Logo_main-min.png');
        const logoWidth = 340;
        const logoHeight = logoImg ? (logoImg.height / logoImg.width) * logoWidth : 340;
        const logoX = (canvasEl.width - logoWidth) / 2;
        const logoY = (canvasEl.height - logoHeight) / 2;
        if (logoImg) {
            ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        }

        // Layout constants
        const colWidth = 420;
        const colGap = 80;
        const boxHeight = 400;
        const boxGap = 60;
        const leftColX = logoX - colGap - colWidth;
        const rightColX = logoX + logoWidth + colGap;
        const topBoxY = (canvasEl.height - (2 * boxHeight + boxGap)) / 2;
        const bottomBoxY = topBoxY + boxHeight + boxGap;

        // Draw the 4 group boxes
        drawGroup(leftColX, topBoxY, colWidth, boxHeight, 'A');
        drawGroup(leftColX, bottomBoxY, colWidth, boxHeight, 'C');
        drawGroup(rightColX, topBoxY, colWidth, boxHeight, 'B');
        drawGroup(rightColX, bottomBoxY, colWidth, boxHeight, 'D');
    }

    function drawGroup(x, y, width, height, groupLetter) {
        // Draw content box
        ctx.save();
        ctx.fillStyle = 'rgba(44, 28, 17, .8)';
        ctx.strokeStyle = 'rgba(255, 210, 125, 0.4)';
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        ctx.restore();

        // Draw title
        ctx.save();
        ctx.font = '40px "SouthParkFont"';
        ctx.fillStyle = '#ffd27d';
        ctx.textAlign = 'center';
        const title = state.titles[`group-title-${groupLetter}`] || `GROUP ${groupLetter}`;
        ctx.fillText(title, x + width / 2, y + 25);
        ctx.restore();

        // Draw player slots
        const slotHeight = 70;
        const slotStartY = y + 90;
        for (let i = 0; i < 4; i++) {
            const slotId = `group-${groupLetter.toLowerCase()}-${i + 1}`;
            const slotY = slotStartY + i * slotHeight;
            drawPlayerSlotInGroup(x + 20, slotY, width - 40, slotHeight - 10, slotId);
        }
    }

    function drawPlayerSlotInGroup(x, y, width, height, slotId) {
        clickableAreas.push({ x, y, width, height, type: 'playerSlot', id: slotId });

        const assignedPlayerId = state.assignments[slotId];
        const player = state.players.find(p => p.id === assignedPlayerId);

        // Draw slot background
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.strokeStyle = 'rgba(255, 210, 125, 0.2)';
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        ctx.restore();

        if (player) {
            // Draw flag
            const flagImg = loadedImageAssets.get(player.flag);
            if (flagImg) {
                ctx.save();
                // Mask for the fade effect
                const maskGradient = ctx.createLinearGradient(x, y, x + width * 0.5, y);
                maskGradient.addColorStop(0, 'rgba(0,0,0,1)');
                maskGradient.addColorStop(0.8, 'rgba(0,0,0,1)');
                maskGradient.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = maskGradient;
                ctx.globalCompositeOperation = 'destination-in';
                ctx.fillRect(x, y, width, height);

                // Draw the flag itself
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 0.5;
                ctx.drawImage(flagImg, x, y, width * 0.3, height);
                ctx.restore();
            }

            // Draw avatar
            const avatarImg = loadedImageAssets.get(player.avatar);
            if (avatarImg) {
                ctx.save();
                const avatarSize = height - 10;
                // Clip to a circle
                ctx.beginPath();
                ctx.arc(x + width - (avatarSize/2) - 5, y + height/2, avatarSize/2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatarImg, x + width - avatarSize - 5, y + 5, avatarSize, avatarSize);
                ctx.restore();
            }

            // Draw name
            ctx.save();
            ctx.font = '28px "SouthParkFont"';
            ctx.fillStyle = '#ffd27d';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 3;
            ctx.fillText(player.name, x + 40, y + height / 2);
            ctx.restore();
        }
    }

    function renderDecorations() {
        if (!state.decorations || state.decorations.length === 0) {
            return;
        }

        state.decorations.forEach(deco => {
            const leafImg = loadedImageAssets.get(deco.src);
            if (leafImg) {
                ctx.save();
                ctx.globalAlpha = deco.opacity;
                ctx.translate(deco.x, deco.y);
                ctx.rotate(deco.rotation);
                ctx.scale(deco.scale, deco.scale);
                ctx.drawImage(leafImg, -leafImg.width / 2, -leafImg.height / 2);
                ctx.restore();
            }
        });
    }

    function renderBranding() {
        // 1. Main Title
        ctx.save();
        ctx.font = '80px "SouthParkFont"';
        ctx.fillStyle = '#ffd27d';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 8;

        const mainTitle = state.viewMode === 'bracket' ? state.mainTitle_bracket : state.mainTitle_groups;
        ctx.fillText(mainTitle, canvasEl.width / 2, 30);

        // Register clickable area for the title
        const titleMetrics = ctx.measureText(mainTitle);
        const titleHeight = 80; // Approximation of font height
        clickableAreas.push({
            x: canvasEl.width / 2 - titleMetrics.width / 2,
            y: 30,
            width: titleMetrics.width,
            height: titleHeight,
            type: 'title',
            id: state.viewMode === 'bracket' ? 'mainTitle_bracket' : 'mainTitle_groups',
            font: '80px "SouthParkFont"',
            color: '#ffd27d'
        });
        ctx.restore();

        // 2. Bottom Branding
        ctx.save();
        // "Hosted by" text
        ctx.font = '24px "Cinzel"'; // 1.5rem approx
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        const hostedByText = "Hosted by ";
        const hostedByMetrics = ctx.measureText(hostedByText);
        const hostedByY = canvasEl.height - 20;
        const hostedByX = 40;
        ctx.fillText(hostedByText, hostedByX, hostedByY);

        // Branding logo
        const brandLogoImg = loadedImageAssets.get('Media/text new-min.png');
        if (brandLogoImg) {
            const logoHeight = 40;
            const logoWidth = (brandLogoImg.width / brandLogoImg.height) * logoHeight;
            const logoX = hostedByX + hostedByMetrics.width + 15; // 15px margin
            const logoY = hostedByY - logoHeight;
            ctx.drawImage(brandLogoImg, logoX, logoY, logoWidth, logoHeight);
        }
        ctx.restore();
    }


    function randomizeAssets() {
        // Random background
        state.backgroundSrc = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];

        // Random leaves
        state.decorations = [];
        const numLeaves = 8;
        const gridCols = 4;
        const gridRows = 3;
        const cellWidth = canvasEl.width / gridCols;
        const cellHeight = canvasEl.height / gridRows;

        let availableCells = Array.from({ length: gridCols * gridRows }, (_, i) => i);

        for (let i = 0; i < numLeaves; i++) {
            if (availableCells.length === 0) break;

            const randomCellIndex = Math.floor(Math.random() * availableCells.length);
            const cell = availableCells.splice(randomCellIndex, 1)[0];

            const col = cell % gridCols;
            const row = Math.floor(cell / gridRows);

            // Position within the cell
            const x = col * cellWidth + Math.random() * cellWidth;
            const y = row * cellHeight + Math.random() * cellHeight;

            state.decorations.push({
                src: leafImages[Math.floor(Math.random() * leafImages.length)],
                x: x,
                y: y,
                rotation: Math.random() * 2 * Math.PI, // in radians
                scale: Math.random() * 0.25 + 0.25,
                opacity: Math.random() * 0.4 + 0.3
            });
        }

        markDirty();
        render();
    }

    function drawProgressionLines() {
        // This function will be rewritten to draw lines directly on the canvas.
        // The old logic of appending an SVG element is no longer valid.
        console.log("drawProgressionLines needs to be refactored for canvas.");
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
    // The old initCardGradients and applyDecorations functions are no longer needed,
    // as this functionality is now handled by randomizeAssets and renderDecorations.

    // --- CANVAS INTERACTION ---
    const playerAssignModal = document.getElementById('player-assign-modal');
    let activeSlotId = null;

    function handleCanvasClick(e) {
        // Get click coordinates, accounting for canvas scaling
        const rect = canvasEl.getBoundingClientRect();
        const scaleX = canvasEl.width / rect.width;
        const scaleY = canvasEl.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Find the clicked area by checking in reverse (topmost first)
        const clickedArea = clickableAreas.slice().reverse().find(area =>
            x >= area.x && x <= area.x + area.width &&
            y >= area.y && y <= area.y + area.height
        );

        if (clickedArea) {
            console.log('Clicked on:', clickedArea);
            if (clickedArea.type === 'playerSlot') {
                handlePlayerSlotClick(clickedArea.id, e.clientX, e.clientY);
            } else if (clickedArea.type === 'score' || clickedArea.type === 'title') {
                handleScoreClick(clickedArea); // handleScoreClick just calls the overlay
            }
        } else {
            // If clicking outside any interactive area, hide modals
            playerAssignModal.classList.add('modal-hidden');
        }
    }

    function handlePlayerSlotClick(slotId, clientX, clientY) {
        activeSlotId = slotId;
        const availablePlayers = state.players;
        let optionsHtml = availablePlayers.map(p => `<div data-player-id="${p.id}">${p.name}</div>`).join('');
        optionsHtml += `<div data-player-id="unassign" style="color: #ff8a8a;">-- Unassign --</div>`;
        playerAssignModal.innerHTML = optionsHtml;
        playerAssignModal.style.left = `${clientX}px`;
        playerAssignModal.style.top = `${clientY}px`;
        playerAssignModal.classList.remove('modal-hidden');
    }

    function handleScoreClick(area) {
        createInputOverlay(area);
    }

    function createInputOverlay(area) {
        // Remove existing input if any
        const existingInput = document.getElementById('canvas-input-overlay');
        if (existingInput) existingInput.remove();

        const input = document.createElement('input');
        input.id = 'canvas-input-overlay';
        input.type = 'text';

        // --- Calculate Position & Size ---
        const rect = canvasEl.getBoundingClientRect();
        const scaleX = rect.width / canvasEl.width;
        const scaleY = rect.height / canvasEl.height;

        input.style.position = 'absolute';
        input.style.left = `${rect.left + area.x * scaleX}px`;
        input.style.top = `${rect.top + area.y * scaleY}px`;
        input.style.width = `${area.width * scaleX}px`;
        input.style.height = `${area.height * scaleY}px`;

        // --- Style the input to match canvas text ---
        input.style.font = area.font || '32px "SouthParkFont"';
        input.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        input.style.color = area.color || '#ffd27d';
        input.style.border = '1px solid #ffd27d';
        input.style.textAlign = 'center';
        input.style.padding = '0';
        input.style.boxSizing = 'border-box';

        // --- Set initial value and event handlers ---
        let initialValue;
        if (area.type === 'score') {
            initialValue = state.scores[area.id] || 0;
        } else { // type is 'title' or 'mainTitle'
            initialValue = area.id.startsWith('mainTitle') ? state[area.id] : state.titles[area.id] || '';
        }
        input.value = initialValue;

        const onSave = () => {
            const newValue = input.value;
            if (area.type === 'score') {
                if (state.scores[area.id] != newValue) {
                    state.scores[area.id] = newValue;
                    const matchId = area.id.substring(0, area.id.lastIndexOf('-'));
                    updateBracketProgression(matchId);
                    markDirty();
                    render();
                }
            } else { // type is 'title' or 'mainTitle'
                const targetObject = area.id.startsWith('mainTitle') ? state : state.titles;
                if (targetObject[area.id] !== newValue) {
                    targetObject[area.id] = newValue;
                    markDirty();
                    render();
                }
            }
            input.remove();
        };

        input.addEventListener('blur', onSave);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                input.remove();
            }
        });

        document.body.appendChild(input);
        input.focus();
        input.select();
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


    // --- CANVAS SCALING ---
    function scaleCanvas() {
        const wrapper = document.getElementById('canvas-wrapper');
        if (!wrapper || !canvasEl) return;

        const wrapperWidth = wrapper.clientWidth;
        const wrapperHeight = wrapper.clientHeight;

        const canvasWidth = 1840;
        const canvasHeight = 1080;

        const scale = Math.min(wrapperWidth / canvasWidth, wrapperHeight / canvasHeight);

        canvasEl.style.transform = `scale(${scale})`;
    }


    // --- INITIALIZATION ---
    async function init() {
        loadState();

        loadedImageAssets = await preloadAssets();
        console.log('Loaded assets map:', loadedImageAssets);

        // Toolbar & Modals
        saveBtn.addEventListener('click', saveState);
        addPlayerBtn.addEventListener('click', handleAddPlayer);
        document.getElementById('randomise-btn').addEventListener('click', randomizeAssets);

        document.getElementById('export-png').addEventListener('click', () => {
            canvasEl.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'tournament.png';

                document.body.appendChild(link);
                link.click();

                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
        });

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

                    // Create a new Image object so the canvas can render it,
                    // and add it to our asset map.
                    const img = new Image();
                    img.src = dataUrl;
                    img.onload = () => {
                        loadedImageAssets.set(dataUrl, img);
                        markDirty();
                        render(); // Re-render the canvas to show the new avatar
                    };
                };
                reader.readAsDataURL(file);
            }
        });

        // Canvas
        canvasEl.addEventListener('click', handleCanvasClick);
        window.addEventListener('resize', scaleCanvas);

        // The main-title element is gone, so this listener is removed.
        // Title editing will be handled via canvas interactions.


        console.log('Application initialized.');
        document.querySelector(`input[name="mode"][value="${state.viewMode}"]`).checked = true;

        // Initial randomization of background/decorations if not loaded from state
        if (!state.backgroundSrc || !state.decorations || state.decorations.length === 0) {
            randomizeAssets();
        } else {
            render();
        }

        scaleCanvas(); // Initial scale

        setInterval(() => { if (state.isDirty) saveState(); }, 30000);
    }

    init();
});
