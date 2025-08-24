document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let players = [];
    let currentMode = 'bracket';
    let nextPlayerId = 1;
    let editingPlayerId = null; // To know which player's flag is being changed

    // --- COUNTRY FLAGS ---
    const countryFlags = [
        'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az',
        'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'br', 'bs',
        'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn',
        'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee',
        'eg', 'eh', 'er', 'es', 'et', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge', 'gf',
        'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm',
        'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm',
        'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc',
        'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk',
        'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na',
        'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pe', 'pf', 'pg',
        'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw',
        'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss',
        'st', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to',
        'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'um', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi',
        'vn', 'vu', 'wf', 'ws', 'ye', 'yt', 'za', 'zm', 'zw'
    ];
    const defaultFlag = 'countryflags/aq.png';
    const defaultImage = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';

    // --- DOM ELEMENTS ---
    const addPlayerBtn = document.getElementById('add-player-btn');
    const playerListEl = document.getElementById('player-list');
    const flagModal = document.getElementById('flag-modal');
    const flagSearchInput = document.getElementById('flag-search');
    const flagOptionsContainer = document.getElementById('flag-options');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const renderArea = document.getElementById('render-area');
    const previewWrapper = document.getElementById('preview-wrapper');

    // Hidden file input for player images
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.accept = 'image/*';
    imageInput.style.display = 'none';
    document.body.appendChild(imageInput);


    // --- FUNCTIONS ---

    function getPlayerById(id) {
        return players.find(p => p.id === id);
    }

    function renderPlayerList() {
        playerListEl.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.className = 'player-item';
            li.dataset.id = player.id;
            li.draggable = true;
            li.innerHTML = `
                <img src="${player.flag}" class="player-flag" alt="Flag">
                <span class="player-name" contenteditable="false">${player.name}</span>
                <img src="${player.image}" class="player-avatar" alt="Avatar">
                <button class="delete-player-btn">×</button>
            `;
            playerListEl.appendChild(li);
        });
    }

    function handleAddPlayer() {
        const newPlayer = {
            id: nextPlayerId++,
            name: `Player ${nextPlayerId - 1}`,
            flag: defaultFlag,
            image: defaultImage,
        };
        players.push(newPlayer);
        renderPlayerList();
        renderPreview();
    }

    function handlePlayerListClick(e) {
        const target = e.target;
        const playerItem = target.closest('.player-item');
        if (!playerItem) return;

        const playerId = parseInt(playerItem.dataset.id);

        if (target.classList.contains('player-name')) {
            // Toggle content editable
            const isEditing = target.contentEditable === 'true';
            target.contentEditable = !isEditing;
            if (!isEditing) {
                target.focus();
                document.execCommand('selectAll', false, null);
            } else {
                const player = getPlayerById(playerId);
                player.name = target.textContent;
                renderPreview();
            }
        } else if (target.classList.contains('player-flag')) {
            editingPlayerId = playerId;
            flagModal.classList.remove('modal-hidden');
        } else if (target.classList.contains('player-avatar')) {
             editingPlayerId = playerId;
             imageInput.click(); // Trigger hidden file input
        } else if (target.classList.contains('delete-player-btn')) {
            players = players.filter(p => p.id !== playerId);
            renderPlayerList();
            renderPreview();
        }
    }

    function handleNameBlur(e) {
        if (e.target.classList.contains('player-name')) {
            e.target.contentEditable = 'false';
            const playerItem = e.target.closest('.player-item');
            const playerId = parseInt(playerItem.dataset.id);
            const player = getPlayerById(playerId);
            if(player) player.name = e.target.textContent;
            renderPreview();
        }
    }

    function handleNameKeydown(e) {
         if (e.key === 'Enter' && e.target.classList.contains('player-name')) {
            e.preventDefault();
            e.target.blur();
        }
    }

    function handleFlagSearch() {
        const query = flagSearchInput.value.toLowerCase();
        flagOptionsContainer.innerHTML = '';
        const filtered = countryFlags.filter(code => code.startsWith(query));

        filtered.forEach(code => {
            const option = document.createElement('div');
            option.dataset.flagUrl = `countryflags/${code}.png`;
            option.innerHTML = `<img src="countryflags/${code}.png" alt="${code}"> ${code.toUpperCase()}`;
            flagOptionsContainer.appendChild(option);
        });
    }

    function handleFlagSelect(e) {
        const flagUrl = e.target.closest('div').dataset.flagUrl;
        if (flagUrl && editingPlayerId) {
            const player = getPlayerById(editingPlayerId);
            player.flag = flagUrl;
            closeModal();
            renderPlayerList();
            renderPreview();
        }
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file && editingPlayerId) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const player = getPlayerById(editingPlayerId);
                player.image = event.target.result;
                renderPlayerList();
                renderPreview();
            };
            reader.readAsDataURL(file);
        }
        // Reset file input value to allow re-uploading the same file
        e.target.value = '';
    }

    function closeModal() {
        flagModal.classList.add('modal-hidden');
        flagSearchInput.value = '';
        editingPlayerId = null;
    }

    // --- Drag and Drop ---
    let draggedPlayerId = null;

    function handleDragStart(e) {
        draggedPlayerId = parseInt(e.target.dataset.id);
        e.target.style.opacity = '0.5';
    }

    function handleDragEnd(e) {
        e.target.style.opacity = '1';
        draggedPlayerId = null;
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        const targetItem = e.target.closest('.player-item');
        if (targetItem) {
            // Can add visual feedback here, like a placeholder
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        if (draggedPlayerId === null) return;

        const targetItem = e.target.closest('.player-item');
        if (!targetItem) return;

        const droppedOnPlayerId = parseInt(targetItem.dataset.id);
        if (draggedPlayerId === droppedOnPlayerId) return;

        const draggedIndex = players.findIndex(p => p.id === draggedPlayerId);
        const droppedOnIndex = players.findIndex(p => p.id === droppedOnPlayerId);

        // Remove dragged player and re-insert at the new position
        const [draggedPlayer] = players.splice(draggedIndex, 1);
        players.splice(droppedOnIndex, 0, draggedPlayer);

        renderPlayerList();
        renderPreview();
    }

    // --- Resizing ---
    function resizePreview() {
        const wrapperWidth = previewWrapper.clientWidth;
        const scale = wrapperWidth / 1920;
        renderArea.style.transform = `scale(${scale})`;
    }


    // --- EVENT LISTENERS ---
    addPlayerBtn.addEventListener('click', handleAddPlayer);
    playerListEl.addEventListener('click', handlePlayerListClick);
    playerListEl.addEventListener('focusout', handleNameBlur);
    playerListEl.addEventListener('keydown', handleNameKeydown);

    closeModalBtn.addEventListener('click', closeModal);
    flagSearchInput.addEventListener('input', handleFlagSearch);
    flagOptionsContainer.addEventListener('click', handleFlagSelect);
    imageInput.addEventListener('change', handleImageUpload);

    playerListEl.addEventListener('dragstart', handleDragStart);
    playerListEl.addEventListener('dragend', handleDragEnd);
    playerListEl.addEventListener('dragover', handleDragOver);
    playerListEl.addEventListener('drop', handleDrop);

    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentMode = e.target.value;
            renderPreview();
        });
    });

    window.addEventListener('resize', resizePreview);


    // --- DECORATIONS & ADVANCED STYLING ---
    const backgroundImages = [
        'Media/background1-min.png',
        'Media/background2-min.png',
        'Media/background3-min.png',
    ];
    const leafImages = [
        'Media/leves_1-min.png', 'Media/leves_2-min.png', 'Media/leves_3-min.png',
        'Media/leves_4-min.png', 'Media/leves_5-min.png', 'Media/leves_6-min.png',
        'Media/leves_7-min.png', 'Media/leves_8-min.png'
    ];
    const blobColors = ['#C9CBA3', '#FFE1A8', '#E26D5C', '#723D46', '#9E7A7A'];

    function applyRandomBackground() {
        const bgElement = document.querySelector('#render-area .background');
        const randomBg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
        bgElement.style.backgroundImage = `url('${randomBg}')`;
    }

    function addRandomLeaves() {
        const container = document.getElementById('decorations-container');
        container.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const leaf = document.createElement('img');
            leaf.className = 'leaf-decoration';
            leaf.src = leafImages[Math.floor(Math.random() * leafImages.length)];
            leaf.style.top = `${Math.random() * 90}%`;
            leaf.style.left = `${Math.random() * 90}%`;
            const scale = Math.random() * 0.5 + 0.5;
            const rotation = Math.random() * 360;
            leaf.style.transform = `rotate(${rotation}deg) scale(${scale})`;
            leaf.style.opacity = Math.random() * 0.5 + 0.3;
            container.appendChild(leaf);
        }
    }

    function addBackgroundBlobs(container) {
        const contentBoxes = container.querySelectorAll('.content-box');
        contentBoxes.forEach(box => {
            const oldContainer = box.querySelector('.card-bg-container');
            if (oldContainer) oldContainer.remove();

            const blobContainer = document.createElement('div');
            blobContainer.className = 'card-bg-container';

            for (let i = 0; i < 3; i++) {
                const blob = document.createElement('div');
                blob.className = 'card-bg-blob';
                const color1 = blobColors[Math.floor(Math.random() * blobColors.length)];
                const color2 = blobColors[Math.floor(Math.random() * blobColors.length)];
                blob.style.background = `radial-gradient(circle, ${color1} 0%, ${color2} 100%)`;
                blob.style.top = `${Math.random() * 60 - 30}%`;
                blob.style.left = `${Math.random() * 60 - 30}%`;
                const size = Math.random() * 150 + 100;
                blob.style.width = `${size}px`;
                blob.style.height = `${size}px`;
                blob.style.opacity = Math.random() * 0.4 + 0.2;
                blobContainer.appendChild(blob);
            }
            box.prepend(blobContainer);
        });
    }


    // --- TEMPLATE RENDERING ---

    function renderPreview() {
        const contentArea = document.querySelector('#render-area .content');
        contentArea.innerHTML = '';

        if (currentMode === 'bracket') {
            contentArea.className = 'content bracket-layout';
            renderBracketTemplate(contentArea);
        } else {
            contentArea.className = 'content groups-layout';
            renderGroupsTemplate(contentArea);
        }

        // Apply advanced styling
        applyRandomBackground();
        addRandomLeaves();
        addBackgroundBlobs(contentArea);
    }

    function renderBracketTemplate(container) {
        // Renders a simple 8-player bracket
        const rounds = {
            'Quarter Finals': 4,
            'Semi Finals': 2,
            'Final': 1
        };

        let roundHtml = '';
        let playersInRound = [...players];

        for (const [roundName, matchCount] of Object.entries(rounds)) {
            let matchesHtml = '';
            for (let i = 0; i < matchCount; i++) {
                const player1 = playersInRound.shift() || { name: '...', flag: defaultFlag, score: 0 };
                const player2 = playersInRound.shift() || { name: '...', flag: defaultFlag, score: 0 };
                matchesHtml += `
                    <div class="content-box match">
                        <div class="player">
                            <img src="${player1.flag}">
                            <span>${player1.name}</span>
                            <span class="score">${player1.score || 0}</span>
                        </div>
                        <div class="player">
                            <img src="${player2.flag}">
                            <span>${player2.name}</span>
                            <span class="score">${player2.score || 0}</span>
                        </div>
                    </div>
                `;
            }
            roundHtml += `<div class="round"><h2>${roundName}</h2>${matchesHtml}</div>`;
        }
        container.innerHTML = roundHtml;
    }

    function renderGroupsTemplate(container) {
        const groups = { A: [], B: [], C: [], D: [] };
        players.forEach((player, index) => {
            const groupName = String.fromCharCode(65 + (index % 4));
            groups[groupName].push(player);
        });

        let groupsHtml = '';
        for (const groupName in groups) {
            const playersHtml = groups[groupName].map(player => `
                <div class="player">
                    <img src="${player.flag}">
                    <span>${player.name}</span>
                </div>
            `).join('') || '<div class="player"><span>...</span></div>';

            groupsHtml += `
                <div class="content-box group-box">
                    <h3>Group ${groupName}</h3>
                    ${playersHtml}
                </div>
            `;
        }
        container.innerHTML = groupsHtml;
    }


    // --- INITIALIZATION ---
    function init() {
        // Add a few players by default for demonstration
        for(let i=0; i<4; i++) {
            handleAddPlayer();
        }
        renderPlayerList();
        renderPreview();
        resizePreview();
    }

    // --- EXPORT ---
    function exportToPng() {
        const originalTransform = renderArea.style.transform;
        renderArea.style.transform = 'scale(1)'; // Temporarily reset scale for full-res capture

        html2canvas(renderArea, {
            width: 1920,
            height: 1080,
            backgroundColor: null, // Use transparent background
            useCORS: true,
            logging: true,
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `${currentMode}-graphic.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Restore original scale
            renderArea.style.transform = originalTransform;
        }).catch(err => {
            console.error("Failed to export PNG:", err);
            // Restore original scale even on error
            renderArea.style.transform = originalTransform;
        });
    }

    document.getElementById('export-png').addEventListener('click', exportToPng);

    init();
});
