(function () {
    'use strict';

    // 1. Verificação se já estamos na página Combinada
    const hasCombinedTable = !!document.querySelector('#combined_table');
    const urlParams = new URLSearchParams(window.location.search);
    const screen = (window.game_data && window.game_data.screen) || urlParams.get('screen');
    const mode = (window.game_data && window.game_data.mode) || urlParams.get('mode');

    const isCombinedPage = hasCombinedTable || (screen === 'overview_villages' && (mode === 'combined' || !mode));

    // Se NÃO for a página combinada e não tiver a tabela, redireciona
    if (!isCombinedPage) {
        const villageId = (window.game_data && window.game_data.village && window.game_data.village.id) 
            ? window.game_data.village.id 
            : (urlParams.get('village') || '');
        
        if (window.UI && typeof window.UI.InfoMessage === 'function') {
            window.UI.InfoMessage("A redirecionar para a Visualização Combinada...", 2000, "info");
        }
        window.location.href = `/game.php?village=${villageId}&screen=overview_villages&mode=combined`;
        return;
    }

    // 2. Se a interface já existir no DOM, apenas abre/fecha (toggle)
    const existingContainer = document.getElementById('rename-container');
    if (existingContainer) {
        if (existingContainer.style.display === 'none') {
            existingContainer.style.display = 'block';
            existingContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            existingContainer.style.display = 'none';
        }
        return;
    }

    // 3. Localização do ponto de inserção no DOM (Prioridade total à tabela de aldeias)
    const targetElement = document.querySelector('#combined_table')
                       || document.querySelector('.modemenu')
                       || document.querySelector('.vis.modemenu')
                       || document.querySelector('#overview_menu')
                       || document.querySelector('#paged_view_content')
                       || document.querySelector('#content_value')
                       || document.querySelector('#main_layout')
                       || document.body;

    const translations = {
        en: {
            heading: "Renaming Options",
            tableHeaders: { option: "Option", configuration: "Configuration" },
            options: {
                textOption: "Text",
                numberOption: "Number",
                kOption: "By K",
                randomCoordOption: "Random Coordinates",
                distanceOption: "Distance (in fields)",
                randomNameOption: "Random Name"
            },
            hints: {
                kHint: "Automatically adds the continent (e.g. K54)",
                randomNameHint: "Generates a unique fantasy name"
            },
            placeholders: {
                textInput: "Enter text",
                digitInput: "Total digits",
                startNumberInput: "Starting number",
                targetCoordInput: "Target (XXX|YYY)",
                result: "Example result"
            },
            previewLabel: "Preview:",
            renameButton: "Rename All",
            fixButton: "Auto-Fix New",
            notifications: {
                selectOptionWarning: "Warning: Select at least one renaming option.",
                textOptionWarning: "For this function, enable and fill the 'Text' option with your pattern.",
                allInPatternSuccess: "All villages are already following your pattern!",
                renamingStart: (total) => `Starting to rename ${total} village(s)...`,
                renamingProgress: (current, total) => `Renaming: ${current} of ${total} processed...`,
                completed: (total) => `Finished! ${total} village(s) processed.`
            }
        },
        pt: {
            heading: "Opções de Renomeação",
            tableHeaders: { option: "Opção", configuration: "Configuração" },
            options: {
                textOption: "Texto",
                numberOption: "Número",
                kOption: "Por K",
                randomCoordOption: "Coordenada Aleatória",
                distanceOption: "Distância (em campos)",
                randomNameOption: "Nome Aleatório"
            },
            hints: {
                kHint: "Adiciona automaticamente o continente (ex: K54)",
                randomNameHint: "Gera um nome de fantasia único"
            },
            placeholders: {
                textInput: "Digite o texto",
                digitInput: "Total dígitos",
                startNumberInput: "Nº inicial",
                targetCoordInput: "Alvo (XXX|YYY)",
                result: "Exemplo de resultado"
            },
            previewLabel: "Pré-visualização:",
            renameButton: "Renomear Todas",
            fixButton: "Auto-Corrigir Novas",
            notifications: {
                selectOptionWarning: "Atenção: Seleciona pelo menos uma opção de renomeação.",
                textOptionWarning: "Para esta função, ativa e preenche a opção 'Texto' com o teu padrão.",
                allInPatternSuccess: "Todas as aldeias já estão dentro do teu padrão!",
                renamingStart: (total) => `A iniciar renomeação de ${total} aldeia(s)...`,
                renamingProgress: (current, total) => `A renomear: ${current} de ${total} processadas...`,
                completed: (total) => `Concluído! ${total} aldeia(s) processadas com sucesso.`
            }
        }
    };

    const contentRename = `
    <div id="rename-container" style="display: block; font-family: Verdana, Arial, sans-serif; padding: 18px; background: #f4e4bc; border: 2px solid #8c5f0d; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 1000px; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #c1a264; padding-bottom: 10px; margin-bottom: 15px;">
            <h3 id="rename-title" style="margin: 0; color: #603000; font-size: 17px;">🛠️ Opções de Renomeação</h3>
            <div style="display: flex; align-items: center; gap: 8px;">
                <select id="language-select" style="padding: 4px 8px; border: 1px solid #8c5f0d; border-radius: 4px; font-size: 12px; cursor: pointer; background: #fff; color: #333;">
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                </select>
                <button id="btn-close-renamer" style="background: #a02c2c; color: #fff; border: 1px solid #601010; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-weight: bold; font-size: 12px;">✕</button>
            </div>
        </div>

        <table id="rename-options-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <thead>
                <tr style="background: #deb887; border-bottom: 2px solid #8c5f0d;">
                    <th style="text-align: left; padding: 8px 10px; color: #4a2a00; font-size: 13px;">Opção</th>
                    <th style="text-align: left; padding: 8px 10px; color: #4a2a00; font-size: 13px;">Configuração</th>
                </tr>
            </thead>
            <tbody id="rename-options-list">
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588; background: rgba(255,255,255,0.3);">
                    <td style="padding: 8px 10px; width: 220px;">
                        <input type="checkbox" id="textOption" class="rename-option" style="cursor: pointer; vertical-align: middle;">
                        <label for="textOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px; vertical-align: middle;">Texto</label>
                    </td>
                    <td style="padding: 8px 10px;"><input type="text" id="textInput" placeholder="Digite o texto" style="width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;"></td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588;">
                    <td style="padding: 8px 10px; width: 220px;">
                        <input type="checkbox" id="numberOption" class="rename-option" style="cursor: pointer; vertical-align: middle;">
                        <label for="numberOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px; vertical-align: middle;">Número</label>
                    </td>
                    <td style="padding: 8px 10px; display: flex; gap: 10px;">
                        <input type="number" id="digitInput" placeholder="Total dígitos" style="flex: 1; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;">
                        <input type="number" id="startNumberInput" placeholder="Nº inicial" style="flex: 1; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;">
                    </td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588; background: rgba(255,255,255,0.3);">
                    <td style="padding: 8px 10px; width: 220px;">
                        <input type="checkbox" id="kOption" class="rename-option" style="cursor: pointer; vertical-align: middle;">
                        <label for="kOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px; vertical-align: middle;">Por K</label>
                    </td>
                    <td style="padding: 8px 10px;"><span id="kHintSpan" style="font-size: 12px; color: #555; font-style: italic;">Adiciona automaticamente o continente (ex: K54)</span></td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588;">
                    <td style="padding: 8px 10px; width: 220px;">
                        <input type="checkbox" id="randomCoordOption" class="rename-option" style="cursor: pointer; vertical-align: middle;">
                        <label for="randomCoordOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px; vertical-align: middle;">Coordenada Aleatória</label>
                    </td>
                    <td style="padding: 8px 10px;"></td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588; background: rgba(255,255,255,0.3);">
                    <td style="padding: 8px 10px; width: 220px;">
                        <input type="checkbox" id="distanceOption" class="rename-option" style="cursor: pointer; vertical-align: middle;">
                        <label for="distanceOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px; vertical-align: middle;">Distância (campos)</label>
                    </td>
                    <td style="padding: 8px 10px;"><input type="text" id="targetCoordInput" placeholder="Alvo (XXX|YYY)" style="width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;"></td>
                </tr>
                <tr class="rename-option-container">
                    <td style="padding: 8px 10px; width: 220px;">
                        <input type="checkbox" id="randomNameOption" class="rename-option" style="cursor: pointer; vertical-align: middle;">
                        <label for="randomNameOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px; vertical-align: middle;">Nome Aleatório</label>
                    </td>
                    <td style="padding: 8px 10px;"><span id="randomNameHintSpan" style="font-size: 12px; color: #555; font-style: italic;">Gera um nome de fantasia único</span></td>
                </tr>
            </tbody>
        </table>

        <div style="background: #fff; padding: 12px; border: 1px solid #c1a264; border-radius: 4px; margin-bottom: 15px;">
            <strong id="preview-title" style="color: #603000; font-size: 12px; display: block; margin-bottom: 5px; text-transform: uppercase;">Pré-visualização:</strong>
            <input type="text" id="result" placeholder="Exemplo de resultado" style="width: 100%; border: none; background: transparent; font-size: 15px; font-weight: bold; color: #000; outline: none;" readonly="">
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="fix-outliers" class="btn" style="padding: 9px 16px; font-size: 13px; cursor: pointer; border-radius: 4px; background: #f0ad4e; color: white; border: 1px solid #d58512; font-weight: bold;">Auto-Corrigir Novas</button>
            <button id="combine-options" class="btn" style="padding: 9px 20px; font-size: 13px; cursor: pointer; border-radius: 4px; background: #5cb85c; color: white; border: 1px solid #398439; font-weight: bold;">Renomear Todas</button>
        </div>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = contentRename;
    
    if (targetElement && targetElement.parentNode) {
        targetElement.parentNode.insertBefore(container, targetElement);
    } else {
        document.body.appendChild(container);
    }

    let currentOptions = [];
    let currentLang = 'pt';

    const closeBtn = document.getElementById('btn-close-renamer');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const renContainer = document.getElementById('rename-container');
            if (renContainer) renContainer.style.display = 'none';
        });
    }

    function getTranslation() {
        return translations[currentLang] || translations.pt;
    }

    function setLanguage(lang) {
        currentLang = lang;
        const t = getTranslation();
        const titleEl = document.getElementById('rename-title');
        if (titleEl) titleEl.innerHTML = `🛠️ ${t.heading}`;

        ['option', 'configuration'].forEach((key, i) => {
            const th = document.querySelector(`#rename-options-table th:nth-child(${i + 1})`);
            if (th) th.textContent = t.tableHeaders[key];
        });
        ['textOption', 'numberOption', 'kOption', 'randomCoordOption', 'distanceOption', 'randomNameOption'].forEach(opt => {
            const label = document.querySelector(`#${opt} + label`);
            if (label) label.textContent = t.options[opt];
        });
        ['textInput', 'digitInput', 'startNumberInput', 'targetCoordInput', 'result'].forEach(input => {
            const el = document.getElementById(input);
            if (el) el.placeholder = t.placeholders[input];
        });

        const kHint = document.getElementById('kHintSpan');
        if (kHint) kHint.textContent = t.hints.kHint;

        const randomHint = document.getElementById('randomNameHintSpan');
        if (randomHint) randomHint.textContent = t.hints.randomNameHint;

        const previewTitle = document.getElementById('preview-title');
        if (previewTitle) previewTitle.textContent = t.previewLabel;

        const combineBtn = document.getElementById('combine-options');
        if (combineBtn) combineBtn.textContent = t.renameButton;

        const fixBtn = document.getElementById('fix-outliers');
        if (fixBtn) fixBtn.textContent = t.fixButton;

        saveSettings();
        combineOptions();
    }

    function saveSettings() {
        const langEl = document.getElementById('language-select');
        const settings = { language: langEl ? langEl.value : 'pt' };
        document.querySelectorAll('.rename-option-container').forEach(cont => {
            const checkbox = cont.querySelector('.rename-option');
            if (checkbox) {
                const inputs = [...cont.querySelectorAll('input[type="text"], input[type="number"]')].reduce((acc, input) => {
                    acc[input.id] = input.value;
                    return acc;
                }, {});
                settings[checkbox.id] = { checked: checkbox.checked, inputs };
            }
        });
        try {
            localStorage.setItem('renameSettingsTW', JSON.stringify(settings));
        } catch (e) {
            console.warn('TW Renamer: Não foi possível gravar no localStorage', e);
        }
    }

    function loadSettings() {
        let settings = null;
        try {
            settings = JSON.parse(localStorage.getItem('renameSettingsTW'));
        } catch (e) {
            console.warn('TW Renamer: Erro ao ler do localStorage', e);
        }
        if (!settings) return;

        const selectedLanguage = settings.language || 'pt';
        const langSelect = document.getElementById('language-select');
        if (langSelect) langSelect.value = selectedLanguage;
        setLanguage(selectedLanguage);

        Object.keys(settings).forEach(key => {
            if (key === 'language') return;
            const setting = settings[key];
            const checkbox = document.getElementById(key);
            if (checkbox) {
                checkbox.checked = !!setting.checked;
                if (setting.inputs) {
                    Object.keys(setting.inputs).forEach(inputId => {
                        const inputElement = document.getElementById(inputId);
                        if (inputElement) inputElement.value = setting.inputs[inputId];
                    });
                }
            }
        });
    }

    function extractCoordsFromText(text) {
        if (!text) return [0, 0];
        const coordsMatches = text.match(/\b(\d{1,3}\|\d{1,3})\b/g);
        if (coordsMatches && coordsMatches.length > 0) {
            const lastMatch = coordsMatches[coordsMatches.length - 1];
            return lastMatch.split('|').map(Number);
        }
        return [0, 0];
    }

    function combineOptions() {
        currentOptions = [...document.querySelectorAll('.rename-option-container')].map(cont => {
            const checkbox = cont.querySelector('.rename-option');
            if (!checkbox || !checkbox.checked) return null;
            const inputs = [...cont.querySelectorAll('input[type="text"], input[type="number"]')].reduce((acc, input) => {
                acc[input.id] = input.value;
                return acc;
            }, {});
            return { type: checkbox.id.replace('Option', '').toLowerCase(), ...inputs };
        }).filter(Boolean);

        const exampleVillage = document.querySelector('.nowrap.row_a, .nowrap.row_b, tr[class*="row_"]');
        let coords = [500, 500];

        if (exampleVillage) {
            const quickeditLabel = exampleVillage.querySelector('.quickedit-label');
            if (quickeditLabel) {
                coords = extractCoordsFromText(quickeditLabel.textContent);
            }
        }

        const startNumber = parseInt(currentOptions.find(opt => opt.type === 'number')?.startNumberInput, 10) || 1;
        const resultEl = document.getElementById('result');
        if (resultEl) {
            resultEl.value = generateVillageName(currentOptions, startNumber, coords);
        }
        saveSettings();
    }

    function generateRandomName() {
        const prefixes = ["Al", "Bar", "Car", "Del", "Eld", "Fal", "Gar", "Hal", "Il", "Jar", "Kal", "Lor", "Val", "Mor", "Aet", "Thor"];
        const middles = ["dorn", "fell", "gorn", "hil", "mir", "nar", "pel", "quil", "rak", "sor", "tur", "vash", "lund", "grim"];
        const suffixes = ["dor", "mar", "rin", "ton", "vin", "wyn", "zar", "thur", "lak", "dil", "ros", "gard", "heim", "crest"];
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${middles[Math.floor(Math.random() * middles.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    }

    function generateVillageName(optionsArray, numberCounter, coords) {
        return optionsArray.map(opt => {
            switch (opt.type) {
                case 'text':
                    return opt.textInput || '';
                case 'number': {
                    const digits = Math.max(1, Math.min(10, parseInt(opt.digitInput, 10) || 1));
                    return String(numberCounter).padStart(digits, '0');
                }
                case 'k':
                    if (coords && coords.length === 2) {
                        return `K${Math.floor(coords[1] / 100)}${Math.floor(coords[0] / 100)}`;
                    }
                    return '';
                case 'randomcoord':
                    return `${Math.floor(Math.random() * 800).toString().padStart(3, '0')}|${Math.floor(Math.random() * 800).toString().padStart(3, '0')}`;
                case 'distance':
                    if (coords && opt.targetCoordInput && opt.targetCoordInput.includes('|')) {
                        const target = opt.targetCoordInput.split('|').map(Number);
                        if (target.length === 2 && !isNaN(target[0]) && !isNaN(target[1])) {
                            return `${Math.round(Math.sqrt((target[0] - coords[0]) ** 2 + (target[1] - coords[1]) ** 2) * 10) / 10}`;
                        }
                    }
                    return '';
                case 'randomname':
                    return generateRandomName();
                default:
                    return '';
            }
        }).filter(val => val.length > 0).join(' ').trim();
    }

    // Espera elemento com verificação ativa (resistente a lag de UI)
    function executeQuickEdit(labelNode, finalName, callback) {
        const renameIcon = labelNode.querySelector('.rename-icon');
        if (!renameIcon) {
            if (callback) callback();
            return;
        }

        renameIcon.click();

        let attempts = 0;
        const maxAttempts = 20; // 20 * 15ms = até 300ms de espera inteligente
        const checkInterval = setInterval(() => {
            attempts++;
            const quickEditSpan = labelNode.querySelector('.quickedit-edit');
            if (quickEditSpan) {
                const textInput = quickEditSpan.querySelector('input[type="text"]');
                const submitBtn = quickEditSpan.querySelector('.btn, input[type="submit"]');

                if (textInput && submitBtn) {
                    clearInterval(checkInterval);
                    textInput.value = finalName;
                    submitBtn.click();
                    if (callback) callback();
                    return;
                }
            }

            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                if (callback) callback();
            }
        }, 15);
    }

    // Processamento sequencial suave e 100% fiável
    function processRenaming(villagesNodeList, startingNumber) {
        let numberCounter = startingNumber;
        const total = villagesNodeList.length;
        const t = getTranslation();

        if (total === 0) return;

        showCustomNotification(t.notifications.renamingStart(total));

        let processed = 0;
        const delayBetweenVillages = 140;

        villagesNodeList.forEach((element, index) => {
            setTimeout(() => {
                const labelNode = element.querySelector('.quickedit-vn');
                if (!labelNode) {
                    processed++;
                    return;
                }

                const textLabel = element.querySelector('.quickedit-label');
                const textContent = textLabel ? textLabel.textContent : '';
                const coords = extractCoordsFromText(textContent);

                const finalName = generateVillageName(currentOptions, numberCounter++, coords)
                    .slice(0, 32)
                    .replace(/[´^]/g, '');

                executeQuickEdit(labelNode, finalName, () => {
                    processed++;
                    if (processed % 10 === 0 && processed < total) {
                        showCustomNotification(t.notifications.renamingProgress(processed, total));
                    }
                    if (processed === total) {
                        showCustomNotification(t.notifications.completed(total), "success");
                    }
                });
            }, index * delayBetweenVillages);
        });
    }

    const fixOutliersBtn = document.getElementById('fix-outliers');
    if (fixOutliersBtn) {
        fixOutliersBtn.addEventListener('click', function () {
            const t = getTranslation();
            if (currentOptions.length === 0) {
                showCustomNotification(t.notifications.selectOptionWarning, "error");
                return;
            }

            const textOpt = currentOptions.find(opt => opt.type === 'text');
            if (!textOpt || !textOpt.textInput || !textOpt.textInput.trim()) {
                showCustomNotification(t.notifications.textOptionWarning, "error");
                return;
            }

            const baseText = textOpt.textInput.trim();
            const lineVillages = document.querySelectorAll('.nowrap.row_a, .nowrap.row_b, tr[class*="row_"]');

            let maxFoundNumber = 0;
            let villagesToRename = [];

            lineVillages.forEach((element) => {
                const labelNode = element.querySelector('.quickedit-vn');
                if (!labelNode) return;

                const textLabel = element.querySelector('.quickedit-label');
                let currentName = textLabel ? textLabel.textContent : '';

                // Limpa coordenadas e tags de continente (ex: (500|500) K55)
                currentName = currentName.replace(/\(?\d{1,3}\|\d{1,3}\)?(?:\s*K\d{1,2})?/gi, '').trim();

                if (currentName.includes(baseText)) {
                    const remainingPart = currentName.replace(baseText, '');
                    const numMatch = remainingPart.match(/\d+/);
                    if (numMatch) {
                        const num = parseInt(numMatch[0], 10);
                        if (num > maxFoundNumber) {
                            maxFoundNumber = num;
                        }
                    }
                } else {
                    villagesToRename.push(element);
                }
            });

            if (villagesToRename.length === 0) {
                showCustomNotification(t.notifications.allInPatternSuccess, "success");
                return;
            }

            processRenaming(villagesToRename, maxFoundNumber + 1);
        });
    }

    const combineBtn = document.getElementById('combine-options');
    if (combineBtn) {
        combineBtn.addEventListener('click', function () {
            const t = getTranslation();
            if (currentOptions.length === 0) {
                showCustomNotification(t.notifications.selectOptionWarning, "error");
                return;
            }
            const lineVillages = Array.from(document.querySelectorAll('.nowrap.row_a, .nowrap.row_b, tr[class*="row_"]'));
            const startingNumber = parseInt(currentOptions.find(opt => opt.type === 'number')?.startNumberInput, 10) || 1;
            processRenaming(lineVillages, startingNumber);
        });
    }

    const langSelect = document.getElementById('language-select');
    if (langSelect) {
        langSelect.addEventListener('change', function () {
            setLanguage(this.value);
        });
    }

    document.querySelectorAll('.rename-option, #textInput, #digitInput, #startNumberInput, #targetCoordInput').forEach(input => {
        input.addEventListener('input', combineOptions);
        input.addEventListener('change', combineOptions);
    });

    function showCustomNotification(message, type = "success") {
        if (window.UI && typeof window.UI.InfoMessage === 'function') {
            window.UI.InfoMessage(message, 2500, type === "success" ? "success" : "error");
            return;
        }

        let container = document.getElementById('customNotificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'customNotificationContainer';
            container.style.position = 'fixed';
            container.style.bottom = '30px';
            container.style.left = '15px';
            container.style.zIndex = '10000';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '6px';
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.padding = '8px 15px';
        notification.style.backgroundColor = type === "success" ? '#4CAF50' : '#f44336';
        notification.style.color = '#fff';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 3px 8px rgba(0,0,0,0.3)';
        notification.style.fontSize = '12px';
        notification.style.fontWeight = 'bold';
        notification.style.fontFamily = 'Verdana, Arial, sans-serif';
        notification.style.transition = 'opacity 0.3s ease';

        container.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }

    loadSettings();
    combineOptions();
})();