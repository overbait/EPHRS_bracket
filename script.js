document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let players = [];
    let currentMode = 'bracket';
    let nextPlayerId = 1;

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

    // --- DOM ELEMENTS ---
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const playerNameInput = document.getElementById('player-name');
    const flagSearchInput = document.getElementById('flag-search');
    const flagOptionsContainer = document.getElementById('flag-options');
    const playerFlagInput = document.getElementById('player-flag');
    const playerImageInput = document.getElementById('player-image');
    const addPlayerButton = document.getElementById('add-player');
    const playerList = document.getElementById('player-list');
    const exportButton = document.getElementById('export-png');
    const renderArea = document.getElementById('render-area');

    // --- EVENT LISTENERS ---
    modeRadios.forEach(radio => radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        renderPreview();
    }));

    flagSearchInput.addEventListener('input', handleFlagSearch);
    addPlayerButton.addEventListener('click', handleAddPlayer);
    exportButton.addEventListener('click', exportToPng);
    playerList.addEventListener('click', handlePlayerListActions);


    // --- FUNCTIONS ---

    function handleFlagSearch(e) {
        const query = e.target.value.toLowerCase();
        flagOptionsContainer.innerHTML = '';
        if (query.length === 0) return;

        const filteredFlags = countryFlags.filter(code => code.startsWith(query));

        filteredFlags.forEach(code => {
            const option = document.createElement('div');
            option.innerHTML = `<img src="countryflags/${code}.png" alt="${code}"> ${code.toUpperCase()}`;
            option.addEventListener('click', () => {
                playerFlagInput.value = `countryflags/${code}.png`;
                flagSearchInput.value = code.toUpperCase();
                flagOptionsContainer.innerHTML = '';
            });
            flagOptionsContainer.appendChild(option);
        });
    }

    function handleAddPlayer() {
        const name = playerNameInput.value.trim();
        const flag = playerFlagInput.value;
        const imageFile = playerImageInput.files[0];

        if (!name || !flag) {
            alert('Please enter a player name and select a flag.');
            return;
        }

        let imageUrl = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; // transparent pixel

        const addPlayerObject = (imgUrl) => {
            const newPlayer = {
                id: nextPlayerId++,
                name: name,
                flag: flag,
                image: imgUrl
            };
            players.push(newPlayer);
            renderPlayerList();
            renderPreview();
            resetPlayerForm();
        };

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                addPlayerObject(e.target.result);
            };
            reader.readAsDataURL(imageFile);
        } else {
            addPlayerObject(imageUrl);
        }
    }

    function resetPlayerForm() {
        playerNameInput.value = '';
        flagSearchInput.value = '';
        playerFlagInput.value = '';
        playerImageInput.value = '';
        flagOptionsContainer.innerHTML = '';
    }

    function renderPlayerList() {
        playerList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.dataset.id = player.id;
            li.innerHTML = `
                <img src="${player.flag}" style="width: 20px; margin-right: 10px;">
                <span>${player.name}</span>
                <button class="delete-player" style="width:auto; background-color: #dc3545;">Delete</button>
            `;
            playerList.appendChild(li);
        });
    }

    function handlePlayerListActions(e) {
        if (e.target.classList.contains('delete-player')) {
            const playerId = parseInt(e.target.closest('li').dataset.id);
            players = players.filter(p => p.id !== playerId);
            renderPlayerList();
            renderPreview();
        }
    }

    function renderPreview() {
        renderArea.innerHTML = '';
        renderArea.className = `${currentMode}-template`;

        if (currentMode === 'bracket') {
            renderBracketTemplate();
        } else {
            renderGroupsTemplate();
        }
    }

    function renderBracketTemplate() {
        // Simple 8-player bracket for demonstration
        let matches = [];
        for (let i = 0; i < 8; i += 2) {
            matches.push([players[i] || { name: 'Player '+(i+1) }, players[i+1] || { name: 'Player '+(i+2) }]);
        }

        const qfHtml = matches.map(match => `
            <div class="match">
                <div class="player">
                    <img src="${match[0].flag || 'countryflags/aq.png'}" class="flag">
                    <span class="name">${match[0].name}</span>
                    <span class="score">0</span>
                </div>
                <div class="player">
                    <img src="${match[1].flag || 'countryflags/aq.png'}" class="flag">
                    <span class="name">${match[1].name}</span>
                    <span class="score">0</span>
                </div>
            </div>
        `).join('');

        renderArea.innerHTML = `
            <div class="round quarter-finals"><h2>Quarter Finals</h2>${qfHtml}</div>
            <div class="round semi-finals"><h2>Semi Finals</h2>
                <div class="match"><div class="player"><span class="name">Winner QF1</span></div><div class="player"><span class="name">Winner QF2</span></div></div>
                <div class="match"><div class="player"><span class="name">Winner QF3</span></div><div class="player"><span class="name">Winner QF4</span></div></div>
            </div>
            <div class="round final"><h2>Final</h2>
                <div class="match"><div class="player"><span class="name">Winner SF1</span></div><div class="player"><span class="name">Winner SF2</span></div></div>
            </div>`;
    }

    function renderGroupsTemplate() {
        const groups = { A: [], B: [], C: [], D: [] };
        players.forEach((player, index) => {
            const groupName = String.fromCharCode(65 + (index % 4));
            groups[groupName].push(player);
        });

        let groupsHtml = '';
        for (const groupName in groups) {
            const playersHtml = groups[groupName].map(player => `
                <div class="player">
                    <img src="${player.flag}" class="flag">
                    <span class="name">${player.name}</span>
                </div>
            `).join('');

            // Pad with empty slots if group is not full
            for (let i = groups[groupName].length; i < Math.ceil(players.length / 4); i++) {
                 playersHtml += `<div class="player"><img src="countryflags/aq.png" class="flag"><span class="name">...</span></div>`;
            }

            groupsHtml += `<div class="group"><h3>Group ${groupName}</h3>${playersHtml}</div>`;
        }

        renderArea.innerHTML = `
            <img src="Media/Logo_main-min.png" class="central-logo">
            ${groupsHtml}
            <div class="date">Tournament Date</div>
        `;
    }

    function exportToPng() {
        // Temporarily scale up for full resolution capture
        const preview = document.getElementById('preview');
        preview.style.transform = 'scale(1)';

        html2canvas(renderArea, {
            width: 1920,
            height: 1080,
            useCORS: true,
            logging: true
        }).then(canvas => {
            // Scale back down after capture
            preview.style.transform = 'scale(0.5)';

            const link = document.createElement('a');
            link.download = `${currentMode}-template.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            console.error("oops, something went wrong!", err);
            // Ensure scale is reset even on error
            preview.style.transform = 'scale(0.5)';
        });
    }

    // --- INITIAL RENDER ---
    renderPreview();
});
