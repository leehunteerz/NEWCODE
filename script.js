/**
 * ================================
 * CODESPACE PRO - PROFESSIONAL CODE EDITOR
 * Monaco Editor | Auto-save | PWA | Themes
 * ================================
 */

// ================================
// GLOBAL STATE
// ================================

const App = {
    // Editor instances
    editor: null,
    editor2: null,
    
    // File system
    files: [],
    folders: [],
    currentFileId: null,
    openTabs: [],
    expandedFolders: new Set(),
    
    // Settings
    settings: {
        theme: 'vs-dark',
        fontSize: 14,
        minimap: true,
        wordWrap: false,
        autoSave: true,
        autoSaveDelay: 2000
    },
    
    // State
    projectName: 'Meu Projeto',
    modified: false,
    splitMode: false,
    selectedFolderId: null, // For creating files inside folders
    
    // Timers
    autoSaveTimer: null,
    lastSaveTime: Date.now(),
    
    // History
    history: [],
    
    // Real-time preview
    realtimePreviewWindow: null,
    broadcastChannel: null,
    previewFileId: null, // ID do arquivo HTML sendo visualizado no preview
    
    // Context menu and selection
    selectedItems: new Set(),
    selectionMode: false,
    contextMenuTarget: null,
    contextMenuClickHandler: null,
    contextMenuActionHandler: null,
    contextMenuEscapeHandler: null,
    
    // Maximize states
    editorMaximized: false,
    previewMaximized: false,
    previousEditorState: null,
    previousPreviewState: null,
    
    // Drag and drop
    draggedItem: null,
    dragOverFolder: null,
    
    // Move to folder
    moveToFolderTarget: null
};

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    let loadingHidden = false;
    
    // Função para esconder loading de forma segura
    const safeHideLoading = () => {
        if (!loadingHidden) {
            loadingHidden = true;
            hideLoadingScreen();
        }
    };
    
    // Garantir que o app-container seja visível imediatamente (fallback de segurança)
    const ensureAppVisible = () => {
        const appContainer = document.getElementById('app-container');
        const loading = document.getElementById('loading-screen');
        
        if (appContainer) {
            appContainer.classList.add('loaded');
            appContainer.style.opacity = '1';
            appContainer.style.visibility = 'visible';
            appContainer.style.display = 'flex';
        }
        
        if (loading) {
            loading.style.opacity = '0';
            loading.style.visibility = 'hidden';
            loading.style.pointerEvents = 'none';
            loading.style.zIndex = '-1';
        }
    };
    
    // Executar imediatamente após DOM carregar
    setTimeout(ensureAppVisible, 100);
    
    // Timeout de segurança para garantir que o loading seja escondido
    const loadingTimeout = setTimeout(() => {
        console.warn('⚠️ Timeout: Escondendo loading screen após 10 segundos');
        safeHideLoading();
    }, 10000);
    
    // Tentar inicializar após 1 segundo
    setTimeout(async () => {
        try {
            await initializeApp();
            clearTimeout(loadingTimeout);
            safeHideLoading();
        } catch (error) {
            console.error('❌ Erro ao inicializar app:', error);
            clearTimeout(loadingTimeout);
            safeHideLoading();
            // Tentar mostrar notificação apenas se a função existir
            if (typeof showNotification === 'function') {
                try {
                    showNotification('error', 'Erro de Inicialização', 'Houve um problema ao carregar o editor. Tente recarregar a página.');
                } catch (notifError) {
                    console.error('Erro ao mostrar notificação:', notifError);
                }
            }
        }
    }, 1000);
    
    // Fallback adicional: esconder loading após 3 segundos mesmo se nada acontecer
    setTimeout(() => {
        if (!loadingHidden) {
            console.warn('⚠️ Fallback: Escondendo loading screen após 3 segundos');
            safeHideLoading();
            
            // Forçar mostrar app-container mesmo sem inicialização completa
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.classList.add('loaded');
                appContainer.style.opacity = '1';
                appContainer.style.visibility = 'visible';
                appContainer.style.display = 'flex';
            }
        }
    }, 3000);
    
    // Fallback imediato: garantir que app-container seja visível após 2 segundos
    setTimeout(() => {
        const appContainer = document.getElementById('app-container');
        const loading = document.getElementById('loading-screen');
        
        if (appContainer) {
            console.warn('⚠️ Forçando visibilidade do app-container após 2 segundos');
            appContainer.classList.add('loaded');
            appContainer.style.opacity = '1';
            appContainer.style.visibility = 'visible';
            appContainer.style.display = 'flex';
        }
        
        if (loading) {
            loading.style.opacity = '0';
            loading.style.visibility = 'hidden';
            loading.style.pointerEvents = 'none';
            loading.style.zIndex = '-1';
            loading.style.display = 'none';
        }
        
        // Tentar configurar event listeners novamente se não foram configurados
        if (typeof setupEventListeners === 'function') {
            try {
                setupEventListeners();
            } catch (error) {
                console.error('❌ Erro ao configurar event listeners (fallback):', error);
            }
        }
    }, 2000);
    
    // Garantir visibilidade após 1.5 segundos também
    setTimeout(() => {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.style.opacity = '1';
            appContainer.style.visibility = 'visible';
        }
    }, 1500);
});

function hideLoadingScreen() {
    const loading = document.getElementById('loading-screen');
    const appContainer = document.getElementById('app-container');
    
    if (loading) {
        loading.classList.add('hidden');
        // Forçar esconder imediatamente também
        loading.style.opacity = '0';
        loading.style.visibility = 'hidden';
        loading.style.pointerEvents = 'none';
        
        // Remover completamente após animação
        setTimeout(() => {
            if (loading && loading.classList.contains('hidden')) {
                loading.style.display = 'none';
            }
        }, 500);
    }
    
    // Garantir que o app-container seja visível
    if (appContainer) {
        appContainer.style.opacity = '1';
        appContainer.style.visibility = 'visible';
        appContainer.style.display = 'flex';
    }
}

async function initializeApp() {
    console.log('🚀 Initializing Lehunteerz CodeSpace...');
    
    // Load saved data
    loadFromLocalStorage();
    
    // Initialize Monaco Editor com timeout
    try {
        await Promise.race([
            initializeMonaco(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Monaco Editor timeout após 8 segundos')), 8000)
            )
        ]);
    } catch (error) {
        console.error('❌ Erro ao inicializar Monaco Editor:', error);
        // Continuar mesmo se o Monaco falhar
        showNotification('warning', 'Aviso', 'Editor Monaco não pôde ser carregado completamente. Algumas funcionalidades podem estar limitadas.');
    }
    
    // Setup UI (mesmo se Monaco não carregar)
    try {
        setupEventListeners();
    } catch (error) {
        console.error('❌ Erro ao configurar event listeners:', error);
        // Tentar novamente após um delay
        setTimeout(() => {
            try {
                setupEventListeners();
            } catch (retryError) {
                console.error('❌ Erro ao configurar event listeners (tentativa 2):', retryError);
            }
        }, 500);
    }
    
    try {
        setupTheme();
        setupModals();
        setupResizing();
        setupPanels();
        setupStatusBar();
        setupRealtimePreview();
        setupContextMenu();
    } catch (error) {
        console.error('❌ Erro ao configurar UI:', error);
    }
    
    // Initialize default files if empty
    if (App.files.length === 0) {
        try {
            createDefaultFiles();
        } catch (error) {
            console.error('❌ Erro ao criar arquivos padrão:', error);
        }
    }
    
    // Render UI
    try {
        renderFileTree();
        renderTabs();
    } catch (error) {
        console.error('❌ Erro ao renderizar UI:', error);
    }
    
    // Open first file (apenas se editor estiver disponível)
    if (App.files.length > 0 && App.editor) {
        try {
            openFile(App.files[0].id);
        } catch (error) {
            console.error('❌ Erro ao abrir primeiro arquivo:', error);
        }
    }
    
    // Setup auto-save
    if (App.settings.autoSave) {
        try {
            startAutoSave();
        } catch (error) {
            console.error('❌ Erro ao configurar auto-save:', error);
        }
    }
    
    // Initialize Prettier plugins after page load (wait for all scripts)
    // Try multiple times to ensure plugins are loaded
    // Agora os plugins são carregados após o Monaco, então aguardar mais tempo
    let pluginInitAttempts = 0;
    const maxAttempts = 15; // Aumentado para dar mais tempo aos plugins carregarem
    
    const tryInitPlugins = () => {
        pluginInitAttempts++;
        initializePrettierPlugins();
        
        // Test if plugins work by trying to format a simple example
        if (prettierPlugins && prettierPlugins.length > 0) {
            // Test CSS plugin
            try {
                prettier.format('body{margin:0}', {
                    parser: 'css',
                    plugins: prettierPlugins
                });
                console.log('✅ Prettier plugins carregados e funcionando após', pluginInitAttempts, 'tentativa(s)');
                return; // Success, stop trying
            } catch (testError) {
                // Plugins found but not working, try again
                if (pluginInitAttempts < maxAttempts) {
                    setTimeout(tryInitPlugins, 1000); // Aumentado para 1 segundo
                } else {
                    console.warn('⚠️ Plugins encontrados mas não funcionam corretamente. A formatação pode estar limitada.');
                }
            }
        } else if (pluginInitAttempts < maxAttempts) {
            // Plugins not found yet, try again
            setTimeout(tryInitPlugins, 1000); // Aumentado para 1 segundo
        } else {
            console.warn('⚠️ Não foi possível carregar os plugins do Prettier após', maxAttempts, 'tentativas.');
            console.warn('A formatação funcionará, mas pode estar limitada a alguns tipos de arquivo.');
        }
    };
    
    // Escutar evento de plugins prontos (do load-plugins.js ou do método interno)
    window.addEventListener('prettierPluginsReady', function() {
        tryInitPlugins();
    });
    
    // Start trying after Monaco is initialized (plugins são carregados após Monaco)
    // Fallback: tentar após 2 segundos caso o evento não seja disparado
    setTimeout(tryInitPlugins, 2000); // Aguardar 2 segundos para dar tempo aos plugins carregarem
    
    // Setup online/offline detection
    setupOnlineOfflineDetection();
    
    // Show welcome notification (apenas se tudo carregou corretamente)
    if (App.editor) {
        showNotification('success', 'Lehunteerz CodeSpace', 'Editor carregado com sucesso! 🎉');
    }
    
    console.log('✅ Lehunteerz CodeSpace initialized');
    
    // Garantir que o loading seja escondido no final (múltiplas tentativas)
    hideLoadingScreen();
    setTimeout(hideLoadingScreen, 100);
    setTimeout(hideLoadingScreen, 500);
    
    // Garantir que o app-container seja visível
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.classList.add('loaded');
        appContainer.style.opacity = '1';
        appContainer.style.visibility = 'visible';
    }
}

// ================================
// MONACO EDITOR
// ================================

async function initializeMonaco() {
    return new Promise((resolve, reject) => {
        // Verificar se require está disponível
        if (typeof require === 'undefined') {
            reject(new Error('Require.js não está disponível. Verifique se os scripts do Monaco estão carregados.'));
            return;
        }
        
        try {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:380',message:'About to configure require',data:{requireDefined:typeof require!=='undefined',requireConfigExists:typeof require!=='undefined'&&typeof require.config==='function'},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
            require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:383',message:'About to require Monaco editor.main',data:{requireDefined:typeof require!=='undefined'},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
            require(['vs/editor/editor.main'], function() {
                try {
                    // Verificar se monaco está disponível
                    if (typeof monaco === 'undefined') {
                        reject(new Error('Monaco Editor não está disponível após carregar.'));
                        return;
                    }
                    
                    // Create main editor
                    const editorElement = document.getElementById('monaco-editor');
                    if (!editorElement) {
                        reject(new Error('Elemento monaco-editor não encontrado.'));
                        return;
                    }
                    
                    App.editor = monaco.editor.create(editorElement, {
                        value: '',
                        language: 'html',
                        theme: App.settings.theme,
                        fontSize: App.settings.fontSize,
                        minimap: { enabled: App.settings.minimap },
                        wordWrap: App.settings.wordWrap ? 'on' : 'off',
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        roundedSelection: true,
                        padding: { top: 10 },
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        formatOnPaste: true,
                        formatOnType: true
                    });
                    
                    // Setup editor events
                    App.editor.onDidChangeModelContent(() => {
                        handleEditorChange();
                        // Validate code after changes
                        debouncedValidateCode();
                    });
                    
                    App.editor.onDidChangeCursorPosition((e) => {
                        updateCursorPosition(e.position);
                    });
                    
                    // Setup diagnostics (validation)
                    setupCodeValidation();
                    
                    // Register code snippets
                    registerCodeSnippets();
                    
                    // Setup enhanced autocomplete
                    setupEnhancedAutocomplete();
                    
                    // Enable Emmet
                    if (window.emmetMonaco) {
                        window.emmetMonaco.emmetHTML(monaco);
                        window.emmetMonaco.emmetCSS(monaco);
                    }
                    
                    console.log('✅ Monaco Editor inicializado com sucesso');
                    
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:440',message:'Monaco initialized, about to call loadPrettierPlugins',data:{requireDefined:typeof require!=='undefined',monacoDefined:typeof monaco!=='undefined',editorCreated:!!App.editor},timestamp:Date.now(),hypothesisId:'A,B'})}).catch(()=>{});
                    // #endregion
                    
                    // Carregar plugins do Prettier APÓS o Monaco estar inicializado para evitar conflitos
                    loadPrettierPlugins();
                    
                    resolve();
                } catch (error) {
                    console.error('❌ Erro ao criar editor Monaco:', error);
                    reject(error);
                }
            }, function(error) {
                console.error('❌ Erro ao carregar Monaco Editor:', error);
                reject(error);
            });
        } catch (error) {
            console.error('❌ Erro ao configurar require:', error);
            reject(error);
        }
    });
}

// Função para carregar plugins do Prettier após o Monaco estar inicializado
// Usa iframe isolado para evitar conflito com loader do Monaco
function loadPrettierPlugins() {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:466',message:'loadPrettierPlugins called - using isolated iframe method',data:{requireDefined:typeof require!=='undefined',monacoDefined:typeof monaco!=='undefined',appEditorExists:!!App.editor,defineExists:typeof define!=='undefined'},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Criar iframe isolado para carregar plugins sem conflito com Monaco loader
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:475',message:'Isolated iframe created',data:{iframeCreated:!!iframe},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Aguardar iframe estar pronto
    iframe.onload = function() {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:479',message:'Iframe loaded, starting plugin load',data:{},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        const iframeWindow = iframe.contentWindow;
        const iframeDoc = iframe.contentDocument || iframeWindow.document;
        
        // Criar HTML básico no iframe
        iframeDoc.open();
        iframeDoc.write('<!DOCTYPE html><html><head></head><body></body></html>');
        iframeDoc.close();
        
        const plugins = ['html', 'postcss', 'babel'];
        let loadedCount = 0;
        const loadedPlugins = {};
        
        plugins.forEach(plugin => {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:492',message:'Loading plugin in isolated iframe',data:{plugin:plugin},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            
            const script = iframeDoc.createElement('script');
            script.src = `https://unpkg.com/prettier@3.1.1/plugins/${plugin}.js`;
            script.crossOrigin = 'anonymous';
            
            script.onload = function() {
                loadedCount++;
                // #region agent log
                const pluginVarName = 'prettierPlugins' + plugin.charAt(0).toUpperCase() + plugin.slice(1);
                
                // Verificar se prettierPlugins existe diretamente (pode ser um objeto com todos os plugins)
                const prettierPluginsObj = iframeWindow.prettierPlugins;
                const prettierPluginsType = typeof prettierPluginsObj;
                const prettierPluginsIsArray = Array.isArray(prettierPluginsObj);
                const prettierPluginsKeys = prettierPluginsObj && typeof prettierPluginsObj === 'object' ? Object.keys(prettierPluginsObj).slice(0,10) : [];
                
                // Verificar múltiplas formas de acesso
                const pluginExists1 = typeof iframeWindow[pluginVarName] !== 'undefined';
                const prettierExists = typeof iframeWindow.prettier !== 'undefined';
                const prettierPluginsExists = prettierExists && iframeWindow.prettier.plugins;
                
                // Tentar acessar prettierPlugins via 'in' operator também (pode não ser enumerável)
                const prettierPluginsInWindow = 'prettierPlugins' in iframeWindow;
                const prettierPluginsValue = prettierPluginsInWindow ? iframeWindow.prettierPlugins : null;
                const prettierPluginsValueType = prettierPluginsValue ? typeof prettierPluginsValue : 'null';
                
                fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:530',message:'Plugin loaded in iframe - checking exports',data:{plugin:plugin,loadedCount:loadedCount,totalPlugins:plugins.length,pluginVarExists1:pluginExists1,prettierExists:prettierExists,prettierPluginsExists:prettierPluginsExists,prettierPluginsType:prettierPluginsType,prettierPluginsIsArray:prettierPluginsIsArray,prettierPluginsKeys:prettierPluginsKeys,prettierPluginsObjExists:!!prettierPluginsObj,prettierPluginsInWindow:prettierPluginsInWindow,prettierPluginsValueType:prettierPluginsValueType},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                
                // Tentar múltiplas formas de acessar o plugin
                let pluginObj = null;
                
                // Método 1: Variável direta
                if (pluginExists1) {
                    pluginObj = iframeWindow[pluginVarName];
                }
                // Método 2: prettierPlugins pode ser um array ou objeto com todos os plugins
                else if (prettierPluginsObj || prettierPluginsValue) {
                    const pluginsSource = prettierPluginsObj || prettierPluginsValue;
                    if (Array.isArray(pluginsSource)) {
                        // Se é array, encontrar o plugin pelo nome
                        pluginObj = pluginsSource.find(p => p && (p.name === plugin || p.parsers && p.parsers[plugin]));
                    } else if (typeof pluginsSource === 'object') {
                        // Se é objeto, tentar acessar pela chave do plugin
                        // Os plugins são armazenados com a chave sendo o nome do plugin (html, postcss, babel)
                        pluginObj = pluginsSource[plugin] || pluginsSource[pluginVarName] || pluginsSource[plugin.charAt(0).toUpperCase() + plugin.slice(1)];
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:556',message:'Trying to access plugin from prettierPlugins object',data:{plugin:plugin,pluginFound:!!pluginObj,pluginsSourceKeys:Object.keys(pluginsSource).slice(0,5)},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                        // #endregion
                    }
                }
                // Método 3: prettier.plugins
                else if (prettierPluginsExists) {
                    const prettierPlugins = iframeWindow.prettier.plugins;
                    if (typeof prettierPlugins === 'object') {
                        pluginObj = prettierPlugins[plugin] || prettierPlugins[pluginVarName];
                    }
                }
                
                // Copiar plugin para window principal
                if (pluginObj) {
                    window[pluginVarName] = pluginObj;
                    loadedPlugins[plugin] = pluginObj;
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:569',message:'Plugin copied to window successfully',data:{plugin:plugin,pluginVarName:pluginVarName,pluginObjType:typeof pluginObj},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                    // #endregion
                    console.log(`✅ Plugin Prettier carregado: ${plugin}`);
                } else {
                    // Tentar acessar diretamente do objeto prettierPlugins
                    const pluginsSource = prettierPluginsObj || prettierPluginsValue;
                    if (pluginsSource && typeof pluginsSource === 'object' && pluginsSource[plugin]) {
                        pluginObj = pluginsSource[plugin];
                        window[pluginVarName] = pluginObj;
                        loadedPlugins[plugin] = pluginObj;
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:578',message:'Plugin found in prettierPlugins object and copied',data:{plugin:plugin,pluginVarName:pluginVarName,pluginExistsInObj:!!pluginsSource[plugin]},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                        // #endregion
                        console.log(`✅ Plugin Prettier carregado do objeto prettierPlugins: ${plugin}`);
                    } else {
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:585',message:'Plugin object not found - trying alternative approach',data:{plugin:plugin,prettierPluginsObjExists:!!pluginsSource,pluginInObj:pluginsSource?!!pluginsSource[plugin]:false},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                        // #endregion
                        
                        // Última tentativa: copiar todo o objeto prettierPlugins se existir
                        if (pluginsSource && !window.prettierPlugins) {
                            window.prettierPlugins = pluginsSource;
                            // #region agent log
                            fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:592',message:'Copied prettierPlugins object to window',data:{plugin:plugin,pluginsType:typeof pluginsSource,isArray:Array.isArray(pluginsSource),keys:Object.keys(pluginsSource).slice(0,5)},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                            // #endregion
                            console.log(`⚠️ Plugin ${plugin} não encontrado individualmente, mas prettierPlugins objeto copiado`);
                        }
                    }
                }
                
                // Tentar inicializar plugins após todos serem carregados
                if (loadedCount === plugins.length) {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:515',message:'All plugins loaded, initializing',data:{pluginsLoaded:Object.keys(loadedPlugins).length},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                    // #endregion
                    
                    setTimeout(() => {
                        if (typeof initializePrettierPlugins === 'function') {
                            initializePrettierPlugins();
                        }
                        // Disparar evento customizado para notificar que os plugins estão prontos
                        window.dispatchEvent(new CustomEvent('prettierPluginsReady', {
                            detail: { plugins: loadedPlugins }
                        }));
                        // Remover iframe após carregar
                        setTimeout(() => {
                            if (iframe.parentNode) {
                                document.body.removeChild(iframe);
                            }
                        }, 1000);
                    }, 500);
                }
            };
            
            script.onerror = function() {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:527',message:'Plugin failed to load in iframe',data:{plugin:plugin},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                console.warn(`⚠️ Não foi possível carregar plugin Prettier: ${plugin}`);
            };
            
            iframeDoc.head.appendChild(script);
        });
    };
    
    // Carregar página vazia no iframe
    iframe.src = 'about:blank';
}

// Debounced preview update
const debouncedUpdatePreview = debounce(() => {
    updatePreview();
}, 300);

// Cache for preview blob URLs to prevent memory leaks
const previewBlobCache = new Map();

function handleEditorChange() {
    if (!App.currentFileId) return;
    
    const file = getFileById(App.currentFileId);
    if (!file) return;
    
    const newContent = App.editor.getValue();
    if (file.content !== newContent) {
        file.content = newContent;
        file.modified = true;
        App.modified = true;
        
        // Update tab
        const tab = document.querySelector(`[data-tab-id="${App.currentFileId}"]`);
        if (tab) tab.classList.add('modified');
        
        // Update preview if auto-refresh (with debounce)
        if (document.getElementById('auto-refresh').checked) {
            debouncedUpdatePreview();
        }
        
        // Send update to real-time preview immediately (no debounce for real-time)
        if (App.broadcastChannel || App.realtimePreviewWindow) {
            // Se há um arquivo HTML específico selecionado para preview, usar ele
            let htmlFile = null;
            let cssFile = null;
            let jsFile = null;
            
            if (App.previewFileId) {
                htmlFile = getFileById(App.previewFileId);
                if (htmlFile && htmlFile.extension === 'html') {
                    // Encontrar CSS e JS relacionados
                    const related = findRelatedFiles(htmlFile);
                    cssFile = related.cssFile;
                    jsFile = related.jsFile;
                }
            }
            
            // Se não há previewFileId definido ou arquivo não encontrado, usar comportamento padrão
            if (!htmlFile) {
                htmlFile = App.files.find(f => f.extension === 'html');
                cssFile = App.files.find(f => f.extension === 'css');
                jsFile = App.files.find(f => f.extension === 'js');
            }
            
            const mdFile = App.files.find(f => f.extension === 'md');
            
            let html = '';
            
            // Build HTML for real-time preview
            if (mdFile && mdFile.content && typeof marked !== 'undefined') {
                try {
                    html = renderMarkdownPreview(mdFile.content);
                } catch (error) {
                    html = `<html><body><p>Erro ao processar Markdown: ${error.message}</p></body></html>`;
                }
            } else {
                html = htmlFile ? htmlFile.content : '<!DOCTYPE html><html><head><title>Preview</title></head><body></body></html>';
                
                if (cssFile && cssFile.content) {
                    const cssTag = `<style>${cssFile.content}</style>`;
                    if (html.includes('</head>')) {
                        html = html.replace('</head>', `${cssTag}</head>`);
                    } else if (html.includes('<head>')) {
                        html = html.replace('<head>', `<head>${cssTag}`);
                    } else {
                        html = `<head>${cssTag}</head>${html}`;
                    }
                }
                
                if (jsFile && jsFile.content) {
                    const jsTag = `<script>${jsFile.content}<\/script>`;
                    if (html.includes('</body>')) {
                        html = html.replace('</body>', `${jsTag}</body>`);
                    } else if (html.includes('<body>')) {
                        html = html.replace('<body>', `<body>${jsTag}`);
                    } else {
                        html += jsTag;
                    }
                }
            }
            
            // Send via BroadcastChannel
            if (App.broadcastChannel) {
                App.broadcastChannel.postMessage({
                    type: 'preview-update',
                    html: html,
                    timestamp: Date.now()
                });
            }
            
            // Also send via localStorage as fallback
            updatePreviewWindow(html);
        }
        
        // Invalidate cache for this file type
        previewBlobCache.clear();
    }
}

function updateCursorPosition(position) {
    document.getElementById('cursor-position').textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
}

// ================================
// CODE VALIDATION
// ================================

// Debounced validation
const debouncedValidateCode = debounce(() => {
    validateCurrentFile();
}, 500);

function setupCodeValidation() {
    // Listen to Monaco diagnostics changes
    if (monaco && monaco.editor) {
        monaco.editor.onDidChangeMarkers((uris) => {
            updateProblemsPanel();
        });
    }
}

function validateCurrentFile() {
    const file = getFileById(App.currentFileId);
    if (!file || !App.editor) return;
    
    const model = App.editor.getModel();
    if (!model) return;
    
    const content = model.getValue();
    const language = getLanguageFromExtension(file.extension);
    const markers = [];
    
    try {
        if (file.extension === 'html') {
            validateHTML(content, markers);
        } else if (file.extension === 'css') {
            validateCSS(content, markers);
        } else if (file.extension === 'js' || file.extension === 'ts') {
            validateJavaScript(content, markers);
        } else if (file.extension === 'json') {
            validateJSON(content, markers);
        } else if (file.extension === 'xml') {
            validateXML(content, markers);
        } else if (file.extension === 'md') {
            validateMarkdown(content, markers);
        }
    } catch (error) {
        console.error('Validation error:', error);
    }
    
    // Update Monaco markers
    monaco.editor.setModelMarkers(model, 'validation', markers);
    
    // Update problems panel
    updateProblemsPanel();
}

function validateHTML(content, markers) {
    // Check for unclosed tags
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    const openTags = [];
    const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    let match;
    let lineNumber = 1;
    let lastIndex = 0;
    
    while ((match = tagRegex.exec(content)) !== null) {
        // Update line number
        const textBeforeMatch = content.substring(lastIndex, match.index);
        lineNumber += (textBeforeMatch.match(/\n/g) || []).length;
        lastIndex = match.index;
        
        const tagName = match[1].toLowerCase();
        const isClosing = match[0].startsWith('</');
        const isSelfClosing = match[0].endsWith('/>') || selfClosingTags.includes(tagName);
        
        if (isClosing) {
            const lastOpen = openTags.pop();
            if (!lastOpen || lastOpen.tag !== tagName) {
                markers.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: lineNumber,
                    startColumn: match.index - lastIndex + 1,
                    endLineNumber: lineNumber,
                    endColumn: match.index - lastIndex + match[0].length + 1,
                    message: `Tag de fechamento </${tagName}> não corresponde a nenhuma tag de abertura`
                });
            }
        } else if (!isSelfClosing) {
            openTags.push({ tag: tagName, line: lineNumber });
        }
    }
    
    // Check for unclosed tags
    openTags.forEach(({ tag, line }) => {
        markers.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: 1,
            message: `Tag <${tag}> não foi fechada`
        });
    });
    
    // Check for common HTML errors
    if (!content.includes('<!DOCTYPE') && content.trim().startsWith('<html')) {
        markers.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 10,
            message: 'Recomendado adicionar <!DOCTYPE html> no início do documento'
        });
    }
}

function validateCSS(content, markers) {
    // Check for unclosed braces
    let openBraces = 0;
    let lineNumber = 1;
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        lineNumber = index + 1;
        const openCount = (line.match(/\{/g) || []).length;
        const closeCount = (line.match(/\}/g) || []).length;
        openBraces += openCount - closeCount;
        
        if (openBraces < 0) {
            markers.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: lineNumber,
                startColumn: line.indexOf('}') + 1,
                endLineNumber: lineNumber,
                endColumn: line.indexOf('}') + 2,
                message: 'Chave de fechamento } sem correspondente'
            });
            openBraces = 0;
        }
    });
    
    if (openBraces > 0) {
        markers.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: lines.length,
            startColumn: 1,
            endLineNumber: lines.length,
            endColumn: 1,
            message: `${openBraces} chave(s) de abertura { não fechada(s)`
        });
    }
    
    // Check for common CSS errors
    const invalidPropertyRegex = /([a-zA-Z-]+)\s*:\s*[^;]+;/g;
    const lines2 = content.split('\n');
    lines2.forEach((line, index) => {
        if (line.includes(':') && !line.includes('{') && !line.trim().startsWith('/*')) {
            // This might be a property outside a rule
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0 && !line.substring(0, colonIndex).includes('{')) {
                markers.push({
                    severity: monaco.MarkerSeverity.Warning,
                    startLineNumber: index + 1,
                    startColumn: colonIndex + 1,
                    endLineNumber: index + 1,
                    endColumn: colonIndex + 2,
                    message: 'Propriedade CSS fora de uma regra. Verifique se está dentro de {}'
                });
            }
        }
    });
}

function validateJavaScript(content, markers) {
    try {
        // Try to parse as JavaScript
        new Function(content);
    } catch (error) {
        // Extract line number from error if possible
        const lineMatch = error.message.match(/line (\d+)/i);
        const lineNumber = lineMatch ? parseInt(lineMatch[1]) : 1;
        
        markers.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: 100,
            message: `Erro de sintaxe: ${error.message}`
        });
    }
    
    // Check for common JS issues
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        // Check for == instead of ===
        if (line.includes(' == ') && !line.includes('===') && !line.trim().startsWith('//')) {
            markers.push({
                severity: monaco.MarkerSeverity.Warning,
                startLineNumber: index + 1,
                startColumn: line.indexOf(' == ') + 1,
                endLineNumber: index + 1,
                endColumn: line.indexOf(' == ') + 5,
                message: 'Considere usar === em vez de == para comparação estrita'
            });
        }
        
        // Check for console.log (optional warning)
        if (line.includes('console.log') && !line.trim().startsWith('//')) {
            // Only warn if there are many console.logs
            const consoleLogCount = (content.match(/console\.log/g) || []).length;
            if (consoleLogCount > 5) {
                markers.push({
                    severity: monaco.MarkerSeverity.Info,
                    startLineNumber: index + 1,
                    startColumn: line.indexOf('console.log') + 1,
                    endLineNumber: index + 1,
                    endColumn: line.indexOf('console.log') + 12,
                    message: 'Considere remover console.log antes de produção'
                });
            }
        }
    });
}

function validateJSON(content, markers) {
    try {
        JSON.parse(content);
    } catch (error) {
        const lineMatch = error.message.match(/position (\d+)/i) || error.message.match(/line (\d+)/i);
        const position = lineMatch ? parseInt(lineMatch[1]) : 0;
        const lines = content.substring(0, position).split('\n');
        const lineNumber = lines.length;
        
        markers.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: 100,
            message: `JSON inválido: ${error.message}`
        });
    }
}

function validateXML(content, markers) {
    // Basic XML validation
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    const openTags = [];
    let match;
    let lineNumber = 1;
    let lastIndex = 0;
    
    while ((match = tagRegex.exec(content)) !== null) {
        const textBeforeMatch = content.substring(lastIndex, match.index);
        lineNumber += (textBeforeMatch.match(/\n/g) || []).length;
        lastIndex = match.index;
        
        const tagName = match[1].toLowerCase();
        const isClosing = match[0].startsWith('</');
        const isSelfClosing = match[0].endsWith('/>');
        
        if (isClosing) {
            const lastOpen = openTags.pop();
            if (!lastOpen || lastOpen.tag !== tagName) {
                markers.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: lineNumber,
                    startColumn: match.index - lastIndex + 1,
                    endLineNumber: lineNumber,
                    endColumn: match.index - lastIndex + match[0].length + 1,
                    message: `Tag de fechamento </${tagName}> não corresponde a nenhuma tag de abertura`
                });
            }
        } else if (!isSelfClosing) {
            openTags.push({ tag: tagName, line: lineNumber });
        }
    }
    
    // Check for unclosed tags
    openTags.forEach(({ tag, line }) => {
        markers.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: 1,
            message: `Tag <${tag}> não foi fechada`
        });
    });
    
    // Check for XML declaration
    if (!content.trim().startsWith('<?xml') && content.includes('<')) {
        markers.push({
            severity: monaco.MarkerSeverity.Info,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 10,
            message: 'Recomendado adicionar <?xml version="1.0"?> no início do documento'
        });
    }
}

function validateMarkdown(content, markers) {
    // Basic Markdown validation
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        // Check for unclosed code blocks
        if (line.trim().startsWith('```') && !line.trim().endsWith('```')) {
            // Opening code block - check if there's a closing one
            let foundClosing = false;
            for (let i = index + 1; i < lines.length; i++) {
                if (lines[i].trim().startsWith('```')) {
                    foundClosing = true;
                    break;
                }
            }
            if (!foundClosing) {
                markers.push({
                    severity: monaco.MarkerSeverity.Warning,
                    startLineNumber: index + 1,
                    startColumn: 1,
                    endLineNumber: index + 1,
                    endColumn: line.length + 1,
                    message: 'Bloco de código não fechado. Adicione ``` para fechar.'
                });
            }
        }
        
        // Check for malformed links
        const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(line)) !== null) {
            if (!linkMatch[2] || linkMatch[2].trim() === '') {
                markers.push({
                    severity: monaco.MarkerSeverity.Warning,
                    startLineNumber: index + 1,
                    startColumn: linkMatch.index + 1,
                    endLineNumber: index + 1,
                    endColumn: linkMatch.index + linkMatch[0].length + 1,
                    message: 'Link Markdown sem URL'
                });
            }
        }
    });
}

function updateProblemsPanel() {
    const problemsList = document.getElementById('problems-list');
    const problemsBadge = document.getElementById('problems-badge');
    if (!problemsList || !problemsBadge) return;
    
    const model = App.editor?.getModel();
    if (!model) {
        problemsList.innerHTML = '<div class="no-problems"><i class="fas fa-circle-check"></i><p>Nenhum problema encontrado</p></div>';
        problemsBadge.textContent = '0';
        return;
    }
    
    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    
    if (markers.length === 0) {
        problemsList.innerHTML = '<div class="no-problems"><i class="fas fa-circle-check"></i><p>Nenhum problema encontrado</p></div>';
        problemsBadge.textContent = '0';
        return;
    }
    
    problemsList.innerHTML = '';
    problemsBadge.textContent = markers.length.toString();
    
    markers.forEach(marker => {
        const item = document.createElement('div');
        item.className = `problem-item ${marker.severity === monaco.MarkerSeverity.Warning ? 'warning' : ''}`;
        
        const severityIcon = marker.severity === monaco.MarkerSeverity.Error 
            ? 'fa-circle-exclamation' 
            : marker.severity === monaco.MarkerSeverity.Warning
            ? 'fa-triangle-exclamation'
            : 'fa-circle-info';
        
        item.innerHTML = `
            <div>
                <i class="fas ${severityIcon}"></i>
                <strong>Linha ${marker.startLineNumber}, Col ${marker.startColumn}</strong>
            </div>
            <div class="problem-item-file">${marker.message}</div>
        `;
        
        item.addEventListener('click', () => {
            App.editor.setPosition({ lineNumber: marker.startLineNumber, column: marker.startColumn });
            App.editor.focus();
        });
        
        problemsList.appendChild(item);
    });
}

// ================================
// CODE SNIPPETS
// ================================

function registerCodeSnippets() {
    if (!monaco || !monaco.languages) return;
    
    // HTML Snippets
    monaco.languages.registerCompletionItemProvider('html', {
        provideCompletionItems: () => {
            return {
                suggestions: [
                    {
                        label: 'div',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<div>\n\t$0\n</div>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Criar elemento div'
                    },
                    {
                        label: 'button',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<button type="button">$0</button>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Criar botão'
                    },
                    {
                        label: 'form',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<form action="" method="post">\n\t$0\n</form>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Criar formulário'
                    },
                    {
                        label: 'input',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<input type="text" name="$1" placeholder="$2" />',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Criar campo de entrada'
                    },
                    {
                        label: 'link',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<link rel="stylesheet" href="$1" />',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Link para CSS'
                    },
                    {
                        label: 'script',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<script src="$1"></script>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Link para JavaScript'
                    },
                    {
                        label: 'img',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<img src="$1" alt="$2" />',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Inserir imagem'
                    },
                    {
                        label: 'a',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<a href="$1">$0</a>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Criar link'
                    },
                    {
                        label: 'ul',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<ul>\n\t<li>$0</li>\n</ul>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Lista não ordenada'
                    },
                    {
                        label: 'table',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '<table>\n\t<thead>\n\t\t<tr>\n\t\t\t<th>$1</th>\n\t\t</tr>\n\t</thead>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td>$0</td>\n\t\t</tr>\n\t</tbody>\n</table>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Criar tabela'
                    }
                ]
            };
        }
    });
    
    // CSS Snippets
    monaco.languages.registerCompletionItemProvider('css', {
        provideCompletionItems: () => {
            return {
                suggestions: [
                    {
                        label: 'flexbox',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'display: flex;\nflex-direction: row;\njustify-content: center;\nalign-items: center;',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Layout Flexbox básico'
                    },
                    {
                        label: 'grid',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'display: grid;\ngrid-template-columns: repeat($1, 1fr);\ngap: $2;',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Layout Grid básico'
                    },
                    {
                        label: 'center',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'display: flex;\njustify-content: center;\nalign-items: center;',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Centralizar conteúdo'
                    },
                    {
                        label: 'reset',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'margin: 0;\npadding: 0;\nbox-sizing: border-box;',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Reset básico'
                    },
                    {
                        label: 'transition',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'transition: $1 $2s ease;',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Adicionar transição'
                    },
                    {
                        label: 'media',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '@media (max-width: $1px) {\n\t$0\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Media query responsiva'
                    },
                    {
                        label: 'animation',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'animation: $1 $2s $3;',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Adicionar animação'
                    }
                ]
            };
        }
    });
    
    // JavaScript Snippets
    monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: () => {
            return {
                suggestions: [
                    {
                        label: 'function',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'function ${1:functionName}($2) {\n\t$0\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Criar função'
                    },
                    {
                        label: 'arrow',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'const ${1:functionName} = ($2) => {\n\t$0\n};',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Arrow function'
                    },
                    {
                        label: 'async',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'async function ${1:functionName}($2) {\n\t$0\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Função assíncrona'
                    },
                    {
                        label: 'promise',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'new Promise((resolve, reject) => {\n\t$0\n});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Criar Promise'
                    },
                    {
                        label: 'trycatch',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'try {\n\t$1\n} catch (error) {\n\tconsole.error(error);\n\t$0\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Try-catch block'
                    },
                    {
                        label: 'foreach',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '${1:array}.forEach((${2:item}) => {\n\t$0\n});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Loop forEach'
                    },
                    {
                        label: 'map',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '${1:array}.map((${2:item}) => {\n\treturn $0;\n});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Array map'
                    },
                    {
                        label: 'filter',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '${1:array}.filter((${2:item}) => {\n\treturn $0;\n});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Array filter'
                    },
                    {
                        label: 'addEventListener',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '${1:element}.addEventListener(\'${2:click}\', (${3:e}) => {\n\t$0\n});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Adicionar event listener'
                    },
                    {
                        label: 'class',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'class ${1:ClassName} {\n\tconstructor($2) {\n\t\t$0\n\t}\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Criar classe ES6'
                    }
                ]
            };
        }
    });
}

// ================================
// ENHANCED AUTOCOMPLETE
// ================================

function setupEnhancedAutocomplete() {
    if (!monaco || !monaco.languages) return;
    
    // HTML Autocomplete enhancements
    monaco.languages.registerCompletionItemProvider('html', {
        provideCompletionItems: (model, position) => {
            const textUntilPosition = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });
            
            const suggestions = [];
            
            // Suggest HTML5 semantic tags
            const semanticTags = [
                'header', 'nav', 'main', 'article', 'section', 
                'aside', 'footer', 'figure', 'figcaption', 'mark',
                'time', 'details', 'summary', 'progress', 'meter'
            ];
            
            semanticTags.forEach(tag => {
                suggestions.push({
                    label: tag,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: `<${tag}>$0</${tag}>`,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: `Tag HTML5 semântica: <${tag}>`
                });
            });
            
            return { suggestions };
        }
    });
    
    // CSS Autocomplete enhancements
    monaco.languages.registerCompletionItemProvider('css', {
        provideCompletionItems: (model, position) => {
            const suggestions = [];
            
            // Common CSS properties
            const commonProperties = [
                'display', 'position', 'width', 'height', 'margin', 
                'padding', 'border', 'background', 'color', 'font',
                'text-align', 'flex', 'grid', 'transform', 'transition'
            ];
            
            commonProperties.forEach(prop => {
                suggestions.push({
                    label: prop,
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: `${prop}: $0;`,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: `Propriedade CSS: ${prop}`
                });
            });
            
            return { suggestions };
        }
    });
    
    // JavaScript Autocomplete enhancements
    monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: (model, position) => {
            const suggestions = [];
            
            // Common DOM methods
            const domMethods = [
                'querySelector', 'querySelectorAll', 'getElementById',
                'getElementsByClassName', 'addEventListener', 'removeEventListener',
                'setAttribute', 'getAttribute', 'classList', 'innerHTML', 'textContent'
            ];
            
            domMethods.forEach(method => {
                suggestions.push({
                    label: method,
                    kind: monaco.languages.CompletionItemKind.Method,
                    insertText: method,
                    documentation: `Método DOM: ${method}`
                });
            });
            
            return { suggestions };
        }
    });
}

// ================================
// FILE MANAGEMENT
// ================================

function createDefaultFiles() {
    App.files = [
        {
            id: generateId(),
            name: 'index',
            extension: 'html',
            content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meu Projeto</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>🚀 Bem-vindo ao Lehunteerz CodeSpace!</h1>
        <p>Editor de código profissional com Monaco Editor</p>
        <button onclick="showMessage()">Clique aqui</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
            modified: false
        },
        {
            id: generateId(),
            name: 'styles',
            extension: 'css',
            content: `/* Estilos do Projeto */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    text-align: center;
    max-width: 500px;
}

h1 {
    font-size: 32px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

p {
    color: #666;
    margin-bottom: 24px;
}

button {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: transform 0.2s;
}

button:hover {
    transform: translateY(-2px);
}`,
            modified: false
        },
        {
            id: generateId(),
            name: 'script',
            extension: 'js',
            content: `// JavaScript do Projeto

console.log('🎨 Lehunteerz CodeSpace iniciado!');

function showMessage() {
    alert('Olá! Este é seu projeto criado com Lehunteerz CodeSpace! 🚀');
}

// Adicionar evento quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Página carregada');
});`,
            modified: false
        }
    ];
}

function openFile(fileId) {
    const file = getFileById(fileId);
    if (!file) {
        showNotification('error', 'Erro ao abrir arquivo', `Arquivo não encontrado (ID: ${fileId}). O arquivo pode ter sido removido.`);
        return;
    }
    
    try {
        App.currentFileId = fileId;
        
        // Set editor content and language
        const language = getLanguageFromExtension(file.extension);
        
        // Dispose old model if exists (prevent memory leaks)
        const currentModel = App.editor.getModel();
        
        // Create new model
        const model = monaco.editor.createModel(file.content, language);
        
        // Set new model
        App.editor.setModel(model);
        
        // Dispose old model after setting new one (if different)
        if (currentModel && currentModel.uri.toString() !== model.uri.toString()) {
            // Use setTimeout to ensure model is set first
            setTimeout(() => {
                if (currentModel && !currentModel.isDisposed()) {
                    currentModel.dispose();
                }
            }, 0);
        }
        
        // Update UI
        const langEl = document.getElementById('current-language');
        if (langEl) {
            langEl.textContent = file.extension.toUpperCase();
        }
        
        // Add to tabs if not already open
        if (!App.openTabs.includes(fileId)) {
            App.openTabs.push(fileId);
        }
        
        // Update UI
        renderFileTree();
        renderTabs();
        updatePreview();
        
        // Trigger validation
        debouncedValidateCode();
    } catch (error) {
        console.error('Error opening file:', error);
        showNotification('error', 'Erro ao abrir arquivo', `Não foi possível abrir ${file.name}.${file.extension}: ${error.message || 'Erro desconhecido'}`);
    }
}

function createNewFile() {
    const name = document.getElementById('file-name-input').value.trim();
    const extension = document.getElementById('file-type-select').value;
    const folderId = App.selectedFolderId || null;
    
    if (!name) {
        showNotification('error', 'Erro ao criar arquivo', 'Digite um nome válido para o arquivo. O nome não pode estar vazio.');
        return;
    }
    
    // Validate file name
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
        showNotification('error', 'Erro ao criar arquivo', `O nome do arquivo contém caracteres inválidos: ${invalidChars.source}. Use apenas letras, números, hífens e underscores.`);
        return;
    }
    
    // Check if file already exists in the same folder
    const fileExists = App.files.some(f => 
        f.name === name && 
        f.extension === extension && 
        f.folderId === folderId
    );
    if (fileExists) {
        const location = folderId ? `na pasta "${getFolderById(folderId)?.name}"` : 'na raiz';
        showNotification('error', 'Erro ao criar arquivo', `Já existe um arquivo chamado ${name}.${extension} ${location}. Escolha um nome diferente.`);
        return;
    }
    
    try {
        // Get max order for siblings
        const siblings = App.files.filter(f => f.folderId === folderId);
        const maxOrder = siblings.length > 0 
            ? Math.max(...siblings.map(f => f.order || 0)) 
            : -1;
        
        const newFile = {
            id: generateId(),
            name: name,
            extension: extension,
            content: getTemplateForExtension(extension),
            modified: false,
            folderId: folderId,
            order: maxOrder + 1
        };
        
        App.files.push(newFile);
        
        // Expand parent folder if file is created inside one
        if (folderId) {
            App.expandedFolders.add(folderId);
        }
        
        renderFileTree();
        openFile(newFile.id);
        closeModal('new-file-modal');
        
        // Clear input and reset folder selection
        document.getElementById('file-name-input').value = '';
        App.selectedFolderId = null;
        
        // Update status bar if function exists
        if (App.updateStatusBar) {
            App.updateStatusBar();
        }
        
        const location = folderId ? ` na pasta "${getFolderById(folderId)?.name}"` : '';
        showNotification('success', 'Arquivo criado', `${name}.${extension} criado com sucesso${location}`);
    } catch (error) {
        console.error('Error creating file:', error);
        showNotification('error', 'Erro ao criar arquivo', `Não foi possível criar o arquivo: ${error.message || 'Erro desconhecido'}`);
    }
}

function deleteFile(fileId) {
    const file = getFileById(fileId);
    if (!file) return;
    
    if (!confirm(`Tem certeza que deseja deletar ${file.name}.${file.extension}?`)) {
        return;
    }
    
    // Remove from arrays
    App.files = App.files.filter(f => f.id !== fileId);
    App.openTabs = App.openTabs.filter(id => id !== fileId);
    
    // If it was the current file, open another
    if (App.currentFileId === fileId) {
        App.currentFileId = null;
        if (App.openTabs.length > 0) {
            openFile(App.openTabs[0]);
        } else if (App.files.length > 0) {
            openFile(App.files[0].id);
        }
    }
    
    renderFileTree();
    renderTabs();
    showNotification('info', 'Arquivo deletado', `${file.name}.${file.extension} foi removido`);
}

function closeTab(fileId) {
    const file = getFileById(fileId);
    
    if (file && file.modified) {
        if (!confirm(`${file.name}.${file.extension} tem alterações não salvas. Fechar mesmo assim?`)) {
            return;
        }
    }
    
    App.openTabs = App.openTabs.filter(id => id !== fileId);
    
    if (App.currentFileId === fileId) {
        if (App.openTabs.length > 0) {
            openFile(App.openTabs[App.openTabs.length - 1]);
        } else {
            App.currentFileId = null;
            App.editor.setValue('');
        }
    }
    
    renderTabs();
}

// ================================
// UI RENDERING
// ================================

// Cache for file tree items
let fileTreeCache = new Map();
let folderTreeCache = new Map();

function getFolderById(id) {
    return App.folders.find(f => f.id === id);
}

// Função para limpar cache do preview relacionado a um arquivo específico
function clearPreviewCacheForFile(fileId) {
    const keysToDelete = [];
    for (const [key, url] of previewBlobCache.entries()) {
        if (key.startsWith(`${fileId}_`) || key.includes(`_${fileId}_`) || key.endsWith(`_${fileId}`)) {
            keysToDelete.push(key);
            URL.revokeObjectURL(url);
        }
    }
    keysToDelete.forEach(key => previewBlobCache.delete(key));
}

// Função para limpar todo o cache do preview
function clearPreviewCache() {
    for (const [key, url] of previewBlobCache.entries()) {
        URL.revokeObjectURL(url);
    }
    previewBlobCache.clear();
    
    // Forçar reload do iframe
    const iframe = document.getElementById('preview-frame');
    if (iframe) {
        const currentSrc = iframe.src;
        iframe.src = '';
        setTimeout(() => {
            updatePreview();
        }, 100);
    }
}

// Função para limpar cookies e storage do iframe do preview
function clearPreviewCookiesAndStorage() {
    const iframe = document.getElementById('preview-frame');
    if (!iframe || !iframe.contentWindow) return;
    
    try {
        // Tentar limpar localStorage e sessionStorage do iframe
        iframe.contentWindow.localStorage?.clear();
        iframe.contentWindow.sessionStorage?.clear();
        
        // Limpar cookies (se possível)
        // Nota: Não podemos limpar cookies diretamente do iframe devido a políticas de segurança
        // Mas podemos forçar um reload que limpará o estado
        
        showNotification('success', 'Cache Limpo', 'Cookies e storage do preview foram limpos');
    } catch (e) {
        console.warn('Não foi possível limpar cookies/storage do iframe:', e);
        showNotification('warning', 'Aviso', 'Alguns dados podem não ter sido limpos devido a restrições de segurança');
    }
}

// Função para encontrar arquivos CSS e JS relacionados a um arquivo HTML
function findRelatedFiles(htmlFile) {
    if (!htmlFile || htmlFile.extension !== 'html') {
        return { cssFile: null, jsFile: null };
    }
    
    // Obter o nome base do arquivo HTML (sem extensão)
    const baseName = htmlFile.name;
    const htmlFolderId = htmlFile.folderId || null;
    
    // Procurar CSS com mesmo nome base e na mesma pasta
    let cssFile = App.files.find(f => 
        f.extension === 'css' && 
        f.name === baseName && 
        (f.folderId || null) === htmlFolderId
    );
    
    // Se não encontrou, procurar qualquer CSS na mesma pasta
    if (!cssFile && htmlFolderId) {
        cssFile = App.files.find(f => 
            f.extension === 'css' && 
            f.folderId === htmlFolderId
        );
    }
    
    // Se ainda não encontrou, procurar qualquer CSS na raiz
    if (!cssFile) {
        cssFile = App.files.find(f => 
            f.extension === 'css' && 
            !f.folderId
        );
    }
    
    // Procurar JS com mesmo nome base e na mesma pasta
    let jsFile = App.files.find(f => 
        f.extension === 'js' && 
        f.name === baseName && 
        (f.folderId || null) === htmlFolderId
    );
    
    // Se não encontrou, procurar qualquer JS na mesma pasta
    if (!jsFile && htmlFolderId) {
        jsFile = App.files.find(f => 
            f.extension === 'js' && 
            f.folderId === htmlFolderId
        );
    }
    
    // Se ainda não encontrou, procurar qualquer JS na raiz
    if (!jsFile) {
        jsFile = App.files.find(f => 
            f.extension === 'js' && 
            !f.folderId
        );
    }
    
    return { cssFile, jsFile };
}

function getFilesInFolder(folderId) {
    return App.files.filter(f => f.folderId === folderId);
}

function getFoldersInFolder(folderId) {
    return App.folders.filter(f => f.parentId === folderId);
}

function renderFileTree() {
    const container = document.getElementById('file-tree');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    fileTreeCache.clear();
    folderTreeCache.clear();
    
    // Get root folders (folders without parent)
    const rootFolders = App.folders.filter(f => !f.parentId);
    
    // Get root files (files without folder)
    const rootFiles = App.files.filter(f => !f.folderId);
    
    // Initialize order if needed
    rootFolders.forEach(folder => initializeFolderOrder(folder.parentId));
    rootFiles.forEach(file => initializeFileOrder(file.folderId));
    
    // Sort items (folders first by order, then files by order)
    rootFolders.sort((a, b) => {
        const orderA = typeof a.order !== 'undefined' ? a.order : 999;
        const orderB = typeof b.order !== 'undefined' ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });
    
    rootFiles.sort((a, b) => {
        const orderA = typeof a.order !== 'undefined' ? a.order : 999;
        const orderB = typeof b.order !== 'undefined' ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        const nameA = `${a.name}.${a.extension}`;
        const nameB = `${b.name}.${b.extension}`;
        return nameA.localeCompare(nameB);
    });
    
    // Render root folders first
    rootFolders.forEach(folder => {
        renderFolder(folder, container, 0);
    });
    
    // Render root files
    rootFiles.forEach(file => {
        renderFileItem(file, container, 0);
    });
    
    // Add context menu to empty area
    container.addEventListener('contextmenu', (e) => {
        if (!e.target.closest('.file-item') && !e.target.closest('.folder-header')) {
            e.preventDefault();
            showContextMenu(e, 'tree', null);
        }
    });
}

function renderFolder(folder, container, level) {
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    folderItem.dataset.folderId = folder.id;
    folderItem.style.paddingLeft = `${level * 20}px`;
    
    const isExpanded = App.expandedFolders.has(folder.id);
    const childFolders = getFoldersInFolder(folder.id);
    const childFiles = getFilesInFolder(folder.id);
    const hasChildren = childFolders.length > 0 || childFiles.length > 0;
    
    // Initialize and sort children
    initializeFolderOrder(folder.id);
    initializeFileOrder(folder.id);
    
    childFolders.sort((a, b) => {
        const orderA = typeof a.order !== 'undefined' ? a.order : 999;
        const orderB = typeof b.order !== 'undefined' ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });
    
    childFiles.sort((a, b) => {
        const orderA = typeof a.order !== 'undefined' ? a.order : 999;
        const orderB = typeof b.order !== 'undefined' ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        const nameA = `${a.name}.${a.extension}`;
        const nameB = `${b.name}.${b.extension}`;
        return nameA.localeCompare(nameB);
    });
    
    folderItem.innerHTML = `
        <div class="folder-header" data-folder-id="${folder.id}">
            <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'} folder-toggle" style="width: 12px; ${!hasChildren ? 'visibility: hidden;' : ''}"></i>
            <i class="fas fa-folder${isExpanded ? '-open' : ''}"></i>
            <span class="folder-name" data-folder-id="${folder.id}">${folder.name}</span>
            <div class="folder-actions">
                <button class="file-action-btn" onclick="event.stopPropagation(); createFileInFolder('${folder.id}')" title="Novo Arquivo">
                    <i class="fas fa-file-plus"></i>
                </button>
                <button class="file-action-btn" onclick="event.stopPropagation(); createSubFolder('${folder.id}')" title="Nova Subpasta">
                    <i class="fas fa-folder-plus"></i>
                </button>
                <button class="file-action-btn" onclick="event.stopPropagation(); deleteFolder('${folder.id}')" title="Deletar Pasta">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="folder-children" style="display: ${isExpanded ? 'block' : 'none'};">
        </div>
    `;
    
    const folderHeader = folderItem.querySelector('.folder-header');
    const folderChildren = folderItem.querySelector('.folder-children');
    const folderNameSpan = folderItem.querySelector('.folder-name');
    
    // Setup rename events
    setupFolderRenameEvents(folder.id, folderNameSpan);
    
    // Selection state
    if (App.selectedItems.has(`folder-${folder.id}`)) {
        folderHeader.classList.add('selected');
    }
    
    // Make folder draggable
    folderHeader.draggable = true;
    
    // Toggle expand/collapse
    folderHeader.addEventListener('click', (e) => {
        if (!e.target.closest('.folder-actions') && !e.target.closest('.folder-name')) {
            if (App.selectionMode && (e.ctrlKey || e.metaKey)) {
                toggleSelection(`folder-${folder.id}`, folderHeader);
            } else {
                clearSelection();
                toggleFolder(folder.id);
            }
        }
    });
    
    // Context menu
    folderHeader.addEventListener('contextmenu', (e) => {
        if (!e.target.closest('.folder-name')) {
            e.preventDefault();
            showContextMenu(e, 'folder', folder.id);
        }
    });
    
    // Context menu on folder name
    folderNameSpan.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e, 'folder', folder.id);
    });
    
    // Drag and drop for folders
    folderHeader.addEventListener('dragstart', (e) => {
        App.draggedItem = { type: 'folder', id: folder.id };
        folderHeader.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', folder.id);
    });
    
    folderHeader.addEventListener('dragend', () => {
        folderHeader.classList.remove('dragging');
        App.draggedItem = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    
    // Drop zone for folders
    folderHeader.addEventListener('dragover', (e) => {
        if (App.draggedItem && App.draggedItem.type === 'file') {
            e.preventDefault();
            folderHeader.classList.add('drag-over');
            App.dragOverFolder = folder.id;
        }
    });
    
    folderHeader.addEventListener('dragleave', () => {
        folderHeader.classList.remove('drag-over');
        if (App.dragOverFolder === folder.id) {
            App.dragOverFolder = null;
        }
    });
    
    folderHeader.addEventListener('drop', (e) => {
        e.preventDefault();
        folderHeader.classList.remove('drag-over');
        
        if (App.draggedItem && App.draggedItem.type === 'file') {
            moveFileToFolder(App.draggedItem.id, folder.id);
        } else if (App.draggedItem && App.draggedItem.type === 'folder' && App.draggedItem.id !== folder.id) {
            moveFolderToFolder(App.draggedItem.id, folder.id);
        }
        
        App.draggedItem = null;
        App.dragOverFolder = null;
    });
    
    // Render children if expanded
    if (isExpanded) {
        // Render child folders
        childFolders.forEach(childFolder => {
            renderFolder(childFolder, folderChildren, level + 1);
        });
        
        // Render child files
        childFiles.forEach(file => {
            renderFileItem(file, folderChildren, level + 1);
        });
    }
    
    container.appendChild(folderItem);
    folderTreeCache.set(folder.id, folderItem);
}

function renderFileItem(file, container, level) {
    const fileItem = document.createElement('div');
    fileItem.className = `file-item file-item-${file.extension}`;
    fileItem.dataset.fileId = file.id;
    fileItem.dataset.type = 'file';
    fileItem.draggable = true;
    fileItem.style.paddingLeft = `${level * 20}px`;
    
    if (file.id === App.currentFileId) {
        fileItem.classList.add('active');
    }
    
    if (App.selectedItems.has(`file-${file.id}`)) {
        fileItem.classList.add('selected');
    }
    
    const icon = getIconForExtension(file.extension);
    
    fileItem.innerHTML = `
        <i class="${icon}"></i>
        <span class="file-name-display" data-file-id="${file.id}">${file.name}.${file.extension}</span>
        <div class="file-actions">
            <button class="file-action-btn" onclick="event.stopPropagation(); deleteFile('${file.id}')" title="Deletar">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    const fileNameSpan = fileItem.querySelector('.file-name-display');
    
    // Setup rename events
    setupFileRenameEvents(file.id, fileNameSpan);
    
    fileItem.addEventListener('click', (e) => {
        if (!e.target.closest('.file-actions') && !e.target.closest('.file-name-display')) {
            if (App.selectionMode && (e.ctrlKey || e.metaKey)) {
                toggleSelection(`file-${file.id}`, fileItem);
            } else {
                clearSelection();
                openFile(file.id);
            }
        }
    });
    
    // Context menu on file item (but not on name span)
    fileItem.addEventListener('contextmenu', (e) => {
        if (!e.target.closest('.file-name-display')) {
            e.preventDefault();
            showContextMenu(e, 'file', file.id);
        }
    });
    
    // Drag and drop
    fileItem.addEventListener('dragstart', (e) => {
        App.draggedItem = { type: 'file', id: file.id };
        fileItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', file.id);
    });
    
    fileItem.addEventListener('dragend', () => {
        fileItem.classList.remove('dragging');
        App.draggedItem = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    
    container.appendChild(fileItem);
    fileTreeCache.set(file.id, fileItem);
}

function toggleFolder(folderId) {
    if (App.expandedFolders.has(folderId)) {
        App.expandedFolders.delete(folderId);
    } else {
        App.expandedFolders.add(folderId);
    }
    renderFileTree();
}

function createNewFolder(parentId = null) {
    const folderName = prompt('Digite o nome da pasta:');
    if (!folderName || !folderName.trim()) {
        return;
    }
    
    // Validate folder name
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(folderName)) {
        showNotification('error', 'Erro', 'Nome da pasta contém caracteres inválidos. Use apenas letras, números, espaços, hífens e underscores.');
        return;
    }
    
    // Check if folder already exists in the same parent
    const folderExists = App.folders.some(f => 
        f.name === folderName.trim() && 
        f.parentId === parentId
    );
    if (folderExists) {
        const location = parentId ? `na pasta "${getFolderById(parentId)?.name}"` : 'na raiz';
        showNotification('error', 'Erro', `Já existe uma pasta chamada "${folderName}" ${location}. Escolha um nome diferente.`);
        return;
    }
    
    // Get max order for siblings
    const siblings = App.folders.filter(f => f.parentId === parentId);
    const maxOrder = siblings.length > 0 
        ? Math.max(...siblings.map(f => f.order || 0)) 
        : -1;
    
    const newFolder = {
        id: generateId(),
        name: folderName.trim(),
        parentId: parentId,
        order: maxOrder + 1,
        createdAt: new Date().toISOString()
    };
    
    App.folders.push(newFolder);
    App.expandedFolders.add(newFolder.id); // Auto-expand new folder
    
    // Expand parent folder if creating subfolder
    if (parentId) {
        App.expandedFolders.add(parentId);
    }
    
    renderFileTree();
    
    const location = parentId ? ` na pasta "${getFolderById(parentId)?.name}"` : '';
    showNotification('success', 'Pasta criada', `Pasta "${folderName}" criada com sucesso${location}`);
}

function createSubFolder(parentId) {
    createNewFolder(parentId);
}

function createFileInFolder(folderId) {
    App.selectedFolderId = folderId;
    openModal('new-file-modal');
}

function deleteFolder(folderId) {
    const folder = getFolderById(folderId);
    if (!folder) return;
    
    const childFolders = getFoldersInFolder(folderId);
    const childFiles = getFilesInFolder(folderId);
    
    if (childFolders.length > 0 || childFiles.length > 0) {
        const confirmMsg = `A pasta "${folder.name}" contém ${childFolders.length} pasta(s) e ${childFiles.length} arquivo(s). Deseja deletar tudo?`;
        if (!confirm(confirmMsg)) {
            return;
        }
    } else {
        if (!confirm(`Tem certeza que deseja deletar a pasta "${folder.name}"?`)) {
            return;
        }
    }
    
    // Delete all child folders recursively
    function deleteFolderRecursive(id) {
        const children = getFoldersInFolder(id);
        children.forEach(child => {
            deleteFolderRecursive(child.id);
        });
        App.folders = App.folders.filter(f => f.id !== id);
    }
    
    deleteFolderRecursive(folderId);
    
    // Delete all files in folder
    App.files = App.files.filter(f => f.folderId !== folderId);
    
    // Remove from open tabs
    const filesToClose = App.files.filter(f => f.folderId === folderId).map(f => f.id);
    filesToClose.forEach(fileId => {
        App.openTabs = App.openTabs.filter(id => id !== fileId);
        if (App.currentFileId === fileId) {
            App.currentFileId = null;
        }
    });
    
    App.expandedFolders.delete(folderId);
    renderFileTree();
    renderTabs();
    
    showNotification('success', 'Pasta deletada', `Pasta "${folder.name}" e seu conteúdo foram removidos`);
}

// Cache for tabs
let tabsCache = new Map();

function renderTabs() {
    const container = document.getElementById('tabs-container');
    if (!container) return;
    
    // Get existing tabs
    const existingTabs = Array.from(container.children);
    const existingIds = new Set(existingTabs.map(el => el.dataset.tabId));
    const currentIds = new Set(App.openTabs);
    
    // Remove tabs that no longer exist
    existingTabs.forEach(tab => {
        if (!currentIds.has(tab.dataset.tabId)) {
            tab.remove();
            tabsCache.delete(tab.dataset.tabId);
        }
    });
    
    // Update or create tabs
    App.openTabs.forEach((fileId, index) => {
        const file = getFileById(fileId);
        if (!file) return;
        
        let tab = tabsCache.get(fileId) || container.querySelector(`[data-tab-id="${fileId}"]`);
        
        if (!tab) {
            // Create new tab
            tab = document.createElement('button');
            tab.className = 'editor-tab';
            tab.dataset.tabId = fileId;
            
            const icon = getIconForExtension(file.extension);
            
            tab.innerHTML = `
                <i class="${icon}"></i>
                <span>${file.name}.${file.extension}</span>
                <button class="tab-close" onclick="event.stopPropagation(); closeTab('${fileId}')">
                    <i class="fas fa-xmark"></i>
                </button>
            `;
            
            tab.addEventListener('click', () => openFile(fileId));
            
            // Insert at correct position
            const nextTab = Array.from(container.children).find(child => {
                const nextFileId = child.dataset.tabId;
                return App.openTabs.indexOf(nextFileId) > index;
            });
            
            if (nextTab) {
                container.insertBefore(tab, nextTab);
            } else {
                container.appendChild(tab);
            }
            
            tabsCache.set(fileId, tab);
        } else {
            // Update existing tab content if needed
            const span = tab.querySelector('span');
            if (span && span.textContent !== `${file.name}.${file.extension}`) {
                span.textContent = `${file.name}.${file.extension}`;
                const icon = getIconForExtension(file.extension);
                const iconEl = tab.querySelector('i');
                if (iconEl) iconEl.className = icon;
            }
        }
        
        // Update active state
        if (fileId === App.currentFileId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
        
        // Update modified state
        if (file.modified) {
            tab.classList.add('modified');
        } else {
            tab.classList.remove('modified');
        }
    });
}

function updatePreview() {
    const iframe = document.getElementById('preview-frame');
    if (!iframe) return;
    
    // Se há um arquivo HTML específico selecionado para preview, usar ele
    let htmlFile = null;
    let cssFile = null;
    let jsFile = null;
    
    if (App.previewFileId) {
        htmlFile = getFileById(App.previewFileId);
        if (htmlFile && htmlFile.extension === 'html') {
            // Encontrar CSS e JS relacionados
            const related = findRelatedFiles(htmlFile);
            cssFile = related.cssFile;
            jsFile = related.jsFile;
            
            // Atualizar indicação visual
            const previewFileInfo = document.getElementById('preview-file-info');
            const previewFileName = document.getElementById('preview-file-name');
            if (previewFileInfo && previewFileName) {
                previewFileName.textContent = `${htmlFile.name}.${htmlFile.extension}`;
                previewFileInfo.style.display = 'flex';
            }
        }
    } else {
        // Esconder indicação quando não há arquivo específico
        const previewFileInfo = document.getElementById('preview-file-info');
        if (previewFileInfo) {
            previewFileInfo.style.display = 'none';
        }
    }
    
    // Se não há previewFileId definido ou arquivo não encontrado, usar comportamento padrão
    if (!htmlFile) {
        htmlFile = App.files.find(f => f.extension === 'html');
        cssFile = App.files.find(f => f.extension === 'css');
        jsFile = App.files.find(f => f.extension === 'js');
    }
    
    const mdFile = App.files.find(f => f.extension === 'md');
    
    let html = '';
    
    // Handle Markdown files
    if (mdFile && mdFile.content && typeof marked !== 'undefined') {
        try {
            html = renderMarkdownPreview(mdFile.content);
        } catch (error) {
            console.error('Error parsing markdown:', error);
            html = `<html><body><p>Erro ao processar Markdown: ${error.message}</p></body></html>`;
        }
    } else {
        // Regular HTML preview
        html = htmlFile ? htmlFile.content : '<!DOCTYPE html><html><head><title>Preview</title></head><body></body></html>';
        
        // Inject CSS
        if (cssFile && cssFile.content) {
            const cssTag = `<style>${cssFile.content}</style>`;
            if (html.includes('</head>')) {
                html = html.replace('</head>', `${cssTag}</head>`);
            } else if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${cssTag}`);
            } else {
                html = `<head>${cssTag}</head>${html}`;
            }
        }
        
        // Inject JS
        if (jsFile && jsFile.content) {
            const jsTag = `<script>${jsFile.content}<\/script>`;
            if (html.includes('</body>')) {
                html = html.replace('</body>', `${jsTag}</body>`);
            } else if (html.includes('<body>')) {
                html = html.replace('<body>', `<body>${jsTag}`);
            } else {
                html += jsTag;
            }
        }
    }
    
    // Create cache key
    const cacheKey = `${htmlFile?.id || 'none'}_${cssFile?.id || 'none'}_${jsFile?.id || 'none'}_${mdFile?.id || 'none'}`;
    
    // Revoke old blob URL to prevent memory leaks
    const oldSrc = iframe.src;
    if (oldSrc && oldSrc.startsWith('blob:')) {
        // Verificar se a URL antiga ainda está no cache antes de revogar
        let urlStillInUse = false;
        for (const [key, url] of previewBlobCache.entries()) {
            if (url === oldSrc && key !== cacheKey) {
                urlStillInUse = true;
                break;
            }
        }
        if (!urlStillInUse && oldSrc !== previewBlobCache.get(cacheKey)) {
            URL.revokeObjectURL(oldSrc);
        }
    }
    
    // Sempre criar novo blob para garantir atualização (cache será usado apenas para evitar múltiplas criações simultâneas)
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Se já existe cache para esta chave, revogar a URL antiga
    if (previewBlobCache.has(cacheKey)) {
        const oldCachedUrl = previewBlobCache.get(cacheKey);
        if (oldCachedUrl && oldCachedUrl !== blobUrl && oldCachedUrl !== iframe.src) {
            URL.revokeObjectURL(oldCachedUrl);
        }
    }
    
    // Atualizar cache
    previewBlobCache.set(cacheKey, blobUrl);
    
    // Limit cache size
    if (previewBlobCache.size > 10) {
        const firstKey = previewBlobCache.keys().next().value;
        const oldUrl = previewBlobCache.get(firstKey);
        if (oldUrl && oldUrl !== iframe.src && oldUrl !== blobUrl) {
            URL.revokeObjectURL(oldUrl);
        }
        previewBlobCache.delete(firstKey);
    }
    
    // Sempre atualizar o iframe com a nova URL
    iframe.src = blobUrl;
    
    // Send update to real-time preview window if open
    if (App.broadcastChannel) {
        App.broadcastChannel.postMessage({
            type: 'preview-update',
            html: html,
            timestamp: Date.now()
        });
    }
}

// ================================
// FORMATTING
// ================================

// Initialize Prettier plugins
let prettierPlugins = null;

function initializePrettierPlugins() {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:2514',message:'initializePrettierPlugins called',data:{prettierDefined:typeof prettier!=='undefined',windowDefined:typeof window!=='undefined',prettierPluginsHtmlExists:typeof prettierPluginsHtml!=='undefined',windowPrettierPluginsHtmlExists:!!(window&&window.prettierPluginsHtml),windowPrettierPluginsExists:!!(window&&window.prettierPlugins)},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    if (typeof prettier === 'undefined') {
        console.warn('Prettier não está disponível. A formatação pode não funcionar corretamente.');
        prettierPlugins = [];
        return;
    }
    
    try {
        const plugins = [];
        
        // When Prettier plugins are loaded via CDN, they create UMD modules
        // The plugins are typically available as global variables or via prettierPlugins
        
        // Method 1: Direct access to global variables (CDN way)
        if (typeof window !== 'undefined') {
            // Try direct variable access (UMD modules expose these)
            if (typeof prettierPluginsHtml !== 'undefined') {
                plugins.push(prettierPluginsHtml);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:2530',message:'Found prettierPluginsHtml via global',data:{},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                // #endregion
            } else if (window.prettierPluginsHtml) {
                plugins.push(window.prettierPluginsHtml);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:2533',message:'Found prettierPluginsHtml via window',data:{},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                // #endregion
            }
            
            if (typeof prettierPluginsPostcss !== 'undefined') {
                plugins.push(prettierPluginsPostcss);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:2536',message:'Found prettierPluginsPostcss via global',data:{},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                // #endregion
            } else if (window.prettierPluginsPostcss) {
                plugins.push(window.prettierPluginsPostcss);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:2539',message:'Found prettierPluginsPostcss via window',data:{},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                // #endregion
            }
            
            if (typeof prettierPluginsBabel !== 'undefined') {
                plugins.push(prettierPluginsBabel);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:2542',message:'Found prettierPluginsBabel via global',data:{},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                // #endregion
            } else if (window.prettierPluginsBabel) {
                plugins.push(window.prettierPluginsBabel);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:2545',message:'Found prettierPluginsBabel via window',data:{},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                // #endregion
            }
            
            // Try accessing via prettierPlugins object
            if (window.prettierPlugins) {
                if (Array.isArray(window.prettierPlugins)) {
                    plugins.push(...window.prettierPlugins);
                } else {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:2535',message:'Accessing prettierPlugins object',data:{prettierPluginsKeys:Object.keys(window.prettierPlugins).slice(0,10),prettierPluginsType:typeof window.prettierPlugins},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
                    // #endregion
                    Object.values(window.prettierPlugins).forEach(p => {
                        if (p && typeof p === 'object') plugins.push(p);
                    });
                }
            }
            
            // Try accessing via prettier.plugins (if available)
            if (typeof prettier !== 'undefined' && prettier.plugins) {
                Object.values(prettier.plugins).forEach(p => {
                    if (p && typeof p === 'object' && !plugins.includes(p)) {
                        plugins.push(p);
                    }
                });
            }
            
            // Try accessing via global scope after UMD modules load
            // UMD modules may expose plugins differently
            const globalKeys = Object.keys(window);
            globalKeys.forEach(key => {
                if (key.includes('prettier') && key.includes('plugin') && typeof window[key] === 'object') {
                    const plugin = window[key];
                    if (plugin && typeof plugin === 'object' && !plugins.includes(plugin)) {
                        plugins.push(plugin);
                    }
                }
            });
        }
        
        // Method 2: Try to detect plugins from script tags that were loaded
        // When plugins load via UMD, they might register themselves differently
        if (plugins.length === 0) {
            // Check if scripts were loaded and try to access their exports
            const scriptTags = document.querySelectorAll('script[src*="prettier"][src*="plugins"]');
            scriptTags.forEach(script => {
                // Scripts loaded, but plugins might not be exposed yet
                // This is handled by the retry mechanism
            });
        }
        
        // Method 3: Use empty array as fallback - prettier might auto-detect plugins
        if (plugins.length === 0) {
            prettierPlugins = [];
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:2593',message:'No plugins found in initializePrettierPlugins',data:{},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            // Não mostrar warning aqui - será tentado novamente mais tarde
        } else {
            prettierPlugins = plugins;
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/a6dd7082-4d5e-4a0f-8b2c-636cac95e955',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:2597',message:'Prettier plugins initialized successfully',data:{pluginsCount:plugins.length},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            console.log('✅ Prettier plugins inicializados:', plugins.length, 'plugin(s)');
        }
    } catch (e) {
        console.error('Erro ao inicializar plugins do Prettier:', e);
        prettierPlugins = [];
    }
}

async function formatCurrentFile() {
    const file = getFileById(App.currentFileId);
    if (!file) {
        showNotification('warning', 'Aviso', 'Nenhum arquivo aberto para formatar');
        return;
    }
    
    // Check if prettier is available
    if (typeof prettier === 'undefined') {
        showNotification('error', 'Erro', 'Prettier não está disponível. Verifique se os scripts foram carregados corretamente.');
        return;
    }
    
    // Initialize plugins if not already done
    if (prettierPlugins === null) {
        initializePrettierPlugins();
    }
    
    // Show loading state
    const formatBtn = document.getElementById('format-btn');
    const originalHTML = formatBtn.innerHTML;
    formatBtn.disabled = true;
    formatBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        let formatted;
        const content = App.editor.getValue();
        
        // Get plugins array - ensure it's always an array
        const plugins = Array.isArray(prettierPlugins) ? prettierPlugins : [];
        
        if (file.extension === 'html') {
            // HTML requires html plugin
            // Try to format with plugins, if it fails, try to get plugins again
            try {
                formatted = await prettier.format(content, {
                    parser: 'html',
                    plugins: plugins,
                    printWidth: 100,
                    tabWidth: 2,
                    htmlWhitespaceSensitivity: 'css'
                });
            } catch (htmlError) {
                if (htmlError.message && htmlError.message.includes("Couldn't resolve parser")) {
                    // Try to reinitialize plugins
                    initializePrettierPlugins();
                    const newPlugins = Array.isArray(prettierPlugins) ? prettierPlugins : [];
                    if (newPlugins.length > 0) {
                        formatted = await prettier.format(content, {
                            parser: 'html',
                            plugins: newPlugins,
                            printWidth: 100,
                            tabWidth: 2,
                            htmlWhitespaceSensitivity: 'css'
                        });
                    } else {
                        throw new Error('Plugin HTML do Prettier não está disponível. Certifique-se de que o script "prettier/plugins/html.min.js" está carregado no HTML.');
                    }
                } else {
                    throw htmlError;
                }
            }
        } else if (file.extension === 'css') {
            // CSS formatting - try with plugins first, then without
            try {
                formatted = await prettier.format(content, {
                    parser: 'css',
                    plugins: plugins.length > 0 ? plugins : [],
                    printWidth: 100,
                    tabWidth: 2
                });
            } catch (cssError) {
                // Try without plugins (some versions auto-load)
                try {
                    formatted = await prettier.format(content, {
                        parser: 'css',
                        printWidth: 100,
                        tabWidth: 2
                    });
                } catch (cssError2) {
                    // Last resort: basic CSS formatting
                    formatted = formatCSSManually(content);
                    showNotification('warning', 'Formatação Básica', 'Usando formatação CSS básica. Plugin PostCSS não disponível.');
                }
            }
        } else if (file.extension === 'js') {
            // JavaScript requires babel plugin
            try {
                formatted = await prettier.format(content, {
                    parser: 'babel',
                    plugins: plugins,
                    printWidth: 100,
                    tabWidth: 2,
                    semi: true,
                    singleQuote: true,
                    trailingComma: 'es5'
                });
            } catch (jsError) {
                if (jsError.message && jsError.message.includes("Couldn't resolve parser")) {
                    // Try to reinitialize plugins
                    initializePrettierPlugins();
                    const newPlugins = Array.isArray(prettierPlugins) ? prettierPlugins : [];
                    if (newPlugins.length > 0) {
                        formatted = await prettier.format(content, {
                            parser: 'babel',
                            plugins: newPlugins,
                            printWidth: 100,
                            tabWidth: 2,
                            semi: true,
                            singleQuote: true,
                            trailingComma: 'es5'
                        });
                    } else {
                        throw new Error('Plugin Babel do Prettier não está disponível. Certifique-se de que o script "prettier/plugins/babel.min.js" está carregado no HTML.');
                    }
                } else {
                    throw jsError;
                }
            }
        } else if (file.extension === 'json') {
            // JSON doesn't require plugins
            formatted = await prettier.format(content, {
                parser: 'json',
                printWidth: 100,
                tabWidth: 2
            });
        } else if (file.extension === 'md') {
            // Markdown formatting - basic cleanup
            formatted = content
                .split('\n')
                .map(line => line.trimEnd())
                .join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            if (formatted === content) {
                showNotification('info', 'Info', 'Markdown já está formatado');
                return;
            }
        } else if (file.extension === 'txt') {
            // Text file formatting - basic cleanup
            formatted = content
                .split('\n')
                .map(line => line.trimEnd())
                .join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            if (formatted === content) {
                showNotification('info', 'Info', 'Texto já está formatado');
                return;
            }
        } else if (file.extension === 'xml') {
            // XML formatting
            try {
                formatted = await prettier.format(content, {
                    parser: 'html', // Prettier uses HTML parser for XML
                    plugins: plugins,
                    printWidth: 100,
                    tabWidth: 2,
                    xmlWhitespaceSensitivity: 'ignore'
                });
            } catch (xmlError) {
                formatted = content;
                showNotification('warning', 'Aviso', 'Formatação XML não disponível. Verifique se o plugin HTML está carregado.');
                return;
            }
        } else if (file.extension === 'yaml' || file.extension === 'yml') {
            // YAML formatting - basic cleanup
            formatted = content
                .split('\n')
                .map(line => line.trimEnd())
                .join('\n')
                .trim();
            
            if (formatted === content) {
                showNotification('info', 'Info', 'YAML já está formatado');
                return;
            }
        } else if (file.extension === 'ts') {
            // TypeScript uses same formatter as JavaScript
            try {
                formatted = await prettier.format(content, {
                    parser: 'typescript',
                    plugins: plugins,
                    printWidth: 100,
                    tabWidth: 2,
                    semi: true,
                    singleQuote: true,
                    trailingComma: 'es5'
                });
            } catch (tsError) {
                // Fallback to babel parser
                try {
                    formatted = await prettier.format(content, {
                        parser: 'babel',
                        plugins: plugins,
                        printWidth: 100,
                        tabWidth: 2,
                        semi: true,
                        singleQuote: true,
                        trailingComma: 'es5'
                    });
                } catch (fallbackError) {
                    throw new Error('Formatação TypeScript não disponível. Verifique se o plugin Babel está carregado.');
                }
            }
        } else if (file.extension === 'py') {
            // Python formatting - basic cleanup
            formatted = content
                .split('\n')
                .map(line => line.trimEnd())
                .join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            if (formatted === content) {
                showNotification('info', 'Info', 'Python já está formatado');
                return;
            }
        } else if (file.extension === 'php') {
            // PHP formatting - basic cleanup
            formatted = content
                .split('\n')
                .map(line => line.trimEnd())
                .join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            if (formatted === content) {
                showNotification('info', 'Info', 'PHP já está formatado');
                return;
            }
        } else if (file.extension === 'sql') {
            // SQL formatting - basic cleanup and uppercase keywords
            formatted = content
                .split('\n')
                .map(line => {
                    // Basic SQL keyword uppercase
                    const keywords = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INTO', 'VALUES', 'SET', 'AND', 'OR', 'ORDER', 'BY', 'GROUP', 'HAVING', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 'AS'];
                    let formattedLine = line.trimEnd();
                    keywords.forEach(keyword => {
                        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                        formattedLine = formattedLine.replace(regex, keyword);
                    });
                    return formattedLine;
                })
                .join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            if (formatted === content) {
                showNotification('info', 'Info', 'SQL já está formatado');
                return;
            }
        } else {
            showNotification('warning', 'Aviso', `Formatação não disponível para arquivos .${file.extension}`);
            return;
        }
        
        // Get current cursor position
        const position = App.editor.getPosition();
        
        // Apply formatted code
        App.editor.setValue(formatted);
        
        // Restore cursor position if possible
        if (position) {
            const lineCount = formatted.split('\n').length;
            const newPosition = {
                lineNumber: Math.min(position.lineNumber, lineCount),
                column: position.column
            };
            App.editor.setPosition(newPosition);
        }
        
        showNotification('success', 'Formatado', `Código ${file.extension.toUpperCase()} formatado com sucesso`);
    } catch (error) {
        console.error('Format error:', error);
        let errorMsg = 'Erro desconhecido ao formatar código';
        let errorDetails = '';
        
        if (error.message) {
            errorMsg = error.message;
            
            // Check for specific Prettier errors
            if (error.message.includes("Couldn't resolve parser")) {
                const parserMatch = error.message.match(/parser "([^"]+)"/);
                const parser = parserMatch ? parserMatch[1] : 'desconhecido';
                
                // Check which scripts are actually loaded
                const scripts = Array.from(document.querySelectorAll('script[src*="prettier"]'));
                const loadedScripts = scripts.map(s => s.src.split('/').pop()).join(', ');
                
                errorDetails = `O parser "${parser}" não está disponível.\n\n`;
                errorDetails += `Scripts Prettier carregados: ${loadedScripts || 'Nenhum encontrado'}\n\n`;
                
                // Provide specific guidance
                if (parser === 'css') {
                    errorDetails += 'SOLUÇÃO: Certifique-se de que o seguinte script está no HTML ANTES do script.js:\n';
                    errorDetails += '<script src="https://cdnjs.cloudflare.com/ajax/libs/prettier/3.1.1/plugins/postcss.min.js"></script>';
                } else if (parser === 'html') {
                    errorDetails += 'SOLUÇÃO: Certifique-se de que o seguinte script está no HTML ANTES do script.js:\n';
                    errorDetails += '<script src="https://cdnjs.cloudflare.com/ajax/libs/prettier/3.1.1/plugins/html.min.js"></script>';
                } else if (parser === 'babel') {
                    errorDetails += 'SOLUÇÃO: Certifique-se de que o seguinte script está no HTML ANTES do script.js:\n';
                    errorDetails += '<script src="https://cdnjs.cloudflare.com/ajax/libs/prettier/3.1.1/plugins/babel.min.js"></script>';
                }
                
                errorDetails += '\n\nOs scripts devem estar nesta ordem:\n';
                errorDetails += '1. prettier/standalone.min.js\n';
                errorDetails += '2. prettier/plugins/html.min.js\n';
                errorDetails += '3. prettier/plugins/postcss.min.js\n';
                errorDetails += '4. prettier/plugins/babel.min.js\n';
                errorDetails += '5. script.js';
            } else if (error.message.includes('Unexpected token')) {
                errorDetails = 'Verifique se há caracteres inválidos ou sintaxe incorreta.';
            } else if (error.message.includes('Expected')) {
                errorDetails = 'Faltam elementos na estrutura do código.';
            } else if (error.message.includes('Invalid')) {
                errorDetails = 'O código contém elementos inválidos.';
            } else if (error.message.includes('SyntaxError')) {
                errorDetails = 'Erro de sintaxe detectado. Verifique a estrutura do código.';
            } else if (error.message.includes('Plugin')) {
                errorDetails = 'Problema com plugins do Prettier. Verifique se todos os scripts dos plugins foram carregados no HTML.';
            }
        }
        
        const fullMessage = errorDetails 
            ? `${errorMsg}\n\n${errorDetails}` 
            : `${errorMsg}. Verifique a sintaxe do código.`;
        
        showNotification('error', 'Erro ao formatar', fullMessage);
    } finally {
        formatBtn.disabled = false;
        formatBtn.innerHTML = originalHTML;
    }
}

// ================================
// SAVE & EXPORT
// ================================

function saveProject() {
    // Mark all files as saved
    App.files.forEach(f => f.modified = false);
    App.modified = false;
    
    // Remove modified class from tabs
    document.querySelectorAll('.editor-tab.modified').forEach(tab => {
        tab.classList.remove('modified');
    });
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Update history
    addToHistory('Projeto salvo');
    
    App.lastSaveTime = Date.now();
    updateSaveStatus();
    
    showNotification('success', 'Salvo', 'Projeto salvo com sucesso');
}

function saveToLocalStorage() {
    const data = {
        projectName: App.projectName,
        files: App.files,
        folders: App.folders,
        expandedFolders: Array.from(App.expandedFolders),
        settings: App.settings,
        openTabs: App.openTabs,
        currentFileId: App.currentFileId
    };
    
    localStorage.setItem('codespace-pro-project', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('codespace-pro-project');
    if (!saved) return;
    
    try {
        const data = JSON.parse(saved);
        App.projectName = data.projectName || 'Meu Projeto';
        App.files = data.files || [];
        App.folders = data.folders || [];
        App.expandedFolders = data.expandedFolders ? new Set(data.expandedFolders) : new Set();
        App.settings = { ...App.settings, ...data.settings };
        App.openTabs = data.openTabs || [];
        App.currentFileId = data.currentFileId;
        
        const projectNameInput = document.getElementById('project-name-input');
        if (projectNameInput) {
            projectNameInput.value = App.projectName;
        }
        
        // Validate loaded files
        if (App.files && App.files.length > 0) {
            App.files = App.files.filter(file => {
                if (!file.id || !file.name || !file.extension) {
                    console.warn('Invalid file data removed:', file);
                    return false;
                }
                // Ensure folderId exists if specified
                if (file.folderId && !App.folders.some(f => f.id === file.folderId)) {
                    file.folderId = null; // Remove invalid folder reference
                }
                return true;
            });
        }
        
        // Validate loaded folders
        if (App.folders && App.folders.length > 0) {
            App.folders = App.folders.filter(folder => {
                if (!folder.id || !folder.name) {
                    console.warn('Invalid folder data removed:', folder);
                    return false;
                }
                // Ensure parentId exists if specified
                if (folder.parentId && !App.folders.some(f => f.id === folder.parentId)) {
                    folder.parentId = null; // Remove invalid parent reference
                }
                return true;
            });
        }
        
        // Validate open tabs
        if (App.openTabs && App.openTabs.length > 0) {
            App.openTabs = App.openTabs.filter(tabId => {
                return App.files.some(f => f.id === tabId);
            });
        }
        
        // Validate current file
        if (App.currentFileId && !App.files.some(f => f.id === App.currentFileId)) {
            App.currentFileId = null;
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('warning', 'Aviso ao carregar', `Não foi possível carregar dados salvos: ${error.message || 'Erro desconhecido'}. Usando configurações padrão.`);
        // Reset to defaults
        App.projectName = 'Meu Projeto';
        App.files = [];
        App.folders = [];
        App.expandedFolders = new Set();
        App.openTabs = [];
        App.currentFileId = null;
    }
}

async function exportProject(type) {
    try {
        if (!type) {
            showNotification('error', 'Erro ao exportar', 'Tipo de exportação não especificado.');
            return;
        }
        
        if (type === 'zip') {
            await exportAsZip();
        } else if (type === 'html') {
            await exportAsSingleHTML();
        } else if (type === 'json') {
            exportAsJSON();
        } else {
            showNotification('error', 'Erro ao exportar', `Tipo de exportação inválido: ${type}. Tipos suportados: zip, html, json.`);
            return;
        }
        
        closeModal('export-modal');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('error', 'Erro ao exportar', `Falha ao exportar projeto: ${error.message || 'Erro desconhecido'}. Verifique se há arquivos abertos.`);
    }
}

async function exportAsZip() {
    if (!App.files || App.files.length === 0) {
        showNotification('error', 'Erro ao exportar', 'Não há arquivos para exportar. Crie pelo menos um arquivo antes de exportar.');
        return;
    }
    
    try {
        const zip = new JSZip();
        
        // Add all files maintaining folder structure
        App.files.forEach(file => {
            if (!file.name || !file.extension) {
                console.warn('File with invalid name/extension skipped:', file);
                return;
            }
            
            // Build file path based on folder hierarchy
            let filePath = '';
            if (file.folderId) {
                filePath = getFolderPath(file.folderId) + '/';
            }
            
            zip.file(`${filePath}${file.name}.${file.extension}`, file.content || '');
        });
        
        // Generate tree structure file
        const treeStructure = generateTreeStructure();
        zip.file('ESTRUTURA.md', treeStructure);
        zip.file('ESTRUTURA.txt', treeStructure); // Also add as .txt
        
        const blob = await zip.generateAsync({ type: 'blob' });
        const fileName = (App.projectName || 'projeto').replace(/[<>:"/\\|?*]/g, '_') + '.zip';
        saveAs(blob, fileName);
        
        showNotification('success', 'Exportado', `Projeto exportado como ${fileName} (${App.files.length} arquivo(s) + estrutura)`);
    } catch (error) {
        console.error('ZIP export error:', error);
        throw new Error(`Erro ao gerar arquivo ZIP: ${error.message || 'Erro desconhecido'}`);
    }
}

function getFolderPath(folderId) {
    const folder = getFolderById(folderId);
    if (!folder) return '';
    
    if (folder.parentId) {
        return getFolderPath(folder.parentId) + '/' + folder.name;
    }
    return folder.name;
}

function generateTreeStructure() {
    let structure = `# Estrutura do Projeto: ${App.projectName}\n\n`;
    structure += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
    structure += `## 📁 Estrutura de Arquivos\n\n\`\`\`\n`;
    
    // Get root folders and files
    const rootFolders = App.folders.filter(f => !f.parentId).sort((a, b) => {
        const orderA = typeof a.order !== 'undefined' ? a.order : 999;
        const orderB = typeof b.order !== 'undefined' ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });
    
    const rootFiles = App.files.filter(f => !f.folderId).sort((a, b) => {
        const orderA = typeof a.order !== 'undefined' ? a.order : 999;
        const orderB = typeof b.order !== 'undefined' ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        const nameA = `${a.name}.${a.extension}`;
        const nameB = `${b.name}.${b.extension}`;
        return nameA.localeCompare(nameB);
    });
    
    // Render folders
    rootFolders.forEach((folder, index) => {
        const isLastFolder = index === rootFolders.length - 1 && rootFiles.length === 0;
        structure += renderFolderTree(folder, '', isLastFolder);
    });
    
    // Render root files
    rootFiles.forEach((file, index) => {
        const isLastFile = index === rootFiles.length - 1;
        const connector = isLastFile ? '└── ' : '├── ';
        structure += `${connector}${file.name}.${file.extension}\n`;
    });
    
    // If no files or folders
    if (rootFolders.length === 0 && rootFiles.length === 0) {
        structure += `(projeto vazio)\n`;
    }
    
    structure += `\`\`\`\n\n`;
    structure += `## 📊 Estatísticas\n\n`;
    structure += `- **Total de Arquivos:** ${App.files.length}\n`;
    structure += `- **Total de Pastas:** ${App.folders.length}\n`;
    structure += `- **Arquivos por Tipo:**\n\n`;
    
    // Count files by extension
    const fileTypes = {};
    App.files.forEach(file => {
        const ext = file.extension || 'sem extensão';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });
    
    Object.entries(fileTypes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([ext, count]) => {
            structure += `  - \`.${ext}\`: ${count} arquivo(s)\n`;
        });
    
    structure += `\n---\n\n*Estrutura gerada automaticamente pelo Lehunteerz CodeSpace*\n`;
    
    return structure;
}

function renderFolderTree(folder, prefix, isLast) {
    let structure = '';
    const connector = isLast ? '└── ' : '├── ';
    structure += `${prefix}${connector}📁 ${folder.name}/\n`;
    
    const nextPrefix = isLast ? prefix + '    ' : prefix + '│   ';
    
    // Get child folders
    const childFolders = App.folders.filter(f => f.parentId === folder.id).sort((a, b) => {
        const orderA = typeof a.order !== 'undefined' ? a.order : 999;
        const orderB = typeof b.order !== 'undefined' ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });
    
    // Get files in folder
    const folderFiles = App.files.filter(f => f.folderId === folder.id).sort((a, b) => {
        const orderA = typeof a.order !== 'undefined' ? a.order : 999;
        const orderB = typeof b.order !== 'undefined' ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        const nameA = `${a.name}.${a.extension}`;
        const nameB = `${b.name}.${b.extension}`;
        return nameA.localeCompare(nameB);
    });
    
    // Render child folders
    childFolders.forEach((childFolder, index) => {
        const isLastChild = index === childFolders.length - 1 && folderFiles.length === 0;
        structure += renderFolderTree(childFolder, nextPrefix, isLastChild);
    });
    
    // Render files
    folderFiles.forEach((file, index) => {
        const isLastFile = index === folderFiles.length - 1;
        const fileConnector = isLastFile ? '└── ' : '├── ';
        structure += `${nextPrefix}${fileConnector}${file.name}.${file.extension}\n`;
    });
    
    return structure;
}

function exportAsSingleHTML() {
    try {
        const htmlFile = App.files.find(f => f.extension === 'html');
        const cssFile = App.files.find(f => f.extension === 'css');
        const jsFile = App.files.find(f => f.extension === 'js');
        
        if (!htmlFile && !cssFile && !jsFile) {
            showNotification('error', 'Erro ao exportar', 'Nenhum arquivo HTML, CSS ou JS encontrado para exportar.');
            return;
        }
        
        let html = htmlFile ? htmlFile.content : '<!DOCTYPE html><html><head><title>Exported Project</title></head><body></body></html>';
        
        // Ensure HTML structure exists
        if (!html.includes('<head>')) {
            html = html.replace('<html>', '<html><head></head>');
        }
        if (!html.includes('<body>')) {
            html = html.replace('</head>', '</head><body></body>');
        }
        
        if (cssFile && cssFile.content) {
            const css = `<style>${cssFile.content}</style>`;
            if (html.includes('</head>')) {
                html = html.replace('</head>', `${css}</head>`);
            } else if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${css}`);
            } else {
                html = `<head>${css}</head>${html}`;
            }
        }
        
        if (jsFile && jsFile.content) {
            const js = `<script>${jsFile.content}<\/script>`;
            if (html.includes('</body>')) {
                html = html.replace('</body>', `${js}</body>`);
            } else if (html.includes('<body>')) {
                html = html.replace('<body>', `<body>${js}`);
            } else {
                html += js;
            }
        }
        
        const blob = new Blob([html], { type: 'text/html' });
        const fileName = (App.projectName || 'projeto').replace(/[<>:"/\\|?*]/g, '_') + '.html';
        saveAs(blob, fileName);
        
        const filesIncluded = [htmlFile, cssFile, jsFile].filter(Boolean).length;
        showNotification('success', 'Exportado', `Projeto exportado como ${fileName} (${filesIncluded} arquivo(s) incluído(s))`);
    } catch (error) {
        console.error('HTML export error:', error);
        throw new Error(`Erro ao gerar arquivo HTML: ${error.message || 'Erro desconhecido'}`);
    }
}

function exportAsJSON() {
    try {
        if (!App.files || App.files.length === 0) {
            showNotification('error', 'Erro ao exportar', 'Não há arquivos para exportar. Crie pelo menos um arquivo antes de exportar.');
            return;
        }
        
        const data = {
            projectName: App.projectName || 'Meu Projeto',
            files: App.files,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const fileName = (App.projectName || 'projeto').replace(/[<>:"/\\|?*]/g, '_') + '.json';
        saveAs(blob, fileName);
        
        showNotification('success', 'Exportado', `Projeto exportado como ${fileName} (${App.files.length} arquivo(s))`);
    } catch (error) {
        console.error('JSON export error:', error);
        throw new Error(`Erro ao gerar arquivo JSON: ${error.message || 'Erro desconhecido'}`);
    }
}

// ================================
// AUTO-SAVE
// ================================

function startAutoSave() {
    if (App.autoSaveTimer) {
        clearInterval(App.autoSaveTimer);
    }
    
    App.autoSaveTimer = setInterval(() => {
        if (App.modified && App.settings.autoSave) {
            saveToLocalStorage();
            App.lastSaveTime = Date.now();
            updateSaveStatus();
        }
    }, App.settings.autoSaveDelay);
}

function updateSaveStatus() {
    const elapsed = Math.floor((Date.now() - App.lastSaveTime) / 1000);
    const text = elapsed === 0 ? 'Salvo agora' : `Salvo há ${elapsed}s`;
    document.getElementById('last-saved').textContent = text;
}

// Update save status every second (throttled to avoid unnecessary updates)
let saveStatusInterval = setInterval(() => {
    const lastSavedEl = document.getElementById('last-saved');
    if (lastSavedEl && document.visibilityState === 'visible') {
        updateSaveStatus();
    }
}, 1000);

// ================================
// THEMES
// ================================

function setupTheme() {
    const savedTheme = localStorage.getItem('codespace-theme') || 'vs-dark';
    applyTheme(savedTheme);
}

function applyTheme(themeName) {
    App.settings.theme = themeName;
    
    if (App.editor) {
        monaco.editor.setTheme(themeName);
    }
    
    // Update body class for UI theme
    document.body.className = '';
    if (themeName === 'vs') {
        document.body.classList.add('theme-light');
    }
    
    localStorage.setItem('codespace-theme', themeName);
    
    // Update active theme card
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.remove('active');
    });
    const activeCard = document.querySelector(`[data-theme="${themeName}"]`);
    if (activeCard) {
        activeCard.classList.add('active');
    }
}

// ================================
// PANELS
// ================================

function setupPanels() {
    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const panelName = tab.dataset.panel;
            switchPanel(panelName);
        });
    });
    
    // Panel actions
    document.getElementById('clear-panel-btn').addEventListener('click', clearCurrentPanel);
    document.getElementById('maximize-panel-btn').addEventListener('click', togglePanelMaximize);
    document.getElementById('close-panel-btn').addEventListener('click', closeBottomPanel);
    
    // Preview actions
    document.getElementById('refresh-preview-btn').addEventListener('click', updatePreview);
    document.getElementById('open-new-tab-btn').addEventListener('click', openInNewTab);
    document.getElementById('open-realtime-preview-btn').addEventListener('click', openRealtimePreview);
    
    // Preview cache menu
    const cacheMenuBtn = document.getElementById('preview-cache-menu-btn');
    const cacheDropdown = document.getElementById('preview-cache-dropdown');
    
    if (cacheMenuBtn && cacheDropdown) {
        cacheMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cacheDropdown.classList.toggle('active');
        });
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if (!cacheMenuBtn.contains(e.target) && !cacheDropdown.contains(e.target)) {
                cacheDropdown.classList.remove('active');
            }
        });
        
        // Event listeners para itens do menu
        cacheDropdown.querySelectorAll('.cache-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                cacheDropdown.classList.remove('active');
                
                switch (action) {
                    case 'clear-cache':
                        clearPreviewCache();
                        showNotification('success', 'Cache Limpo', 'Cache do preview foi limpo com sucesso');
                        break;
                    case 'clear-cookies':
                        clearPreviewCookiesAndStorage();
                        break;
                    case 'clear-all':
                        clearPreviewCache();
                        clearPreviewCookiesAndStorage();
                        showNotification('success', 'Tudo Limpo', 'Cache, cookies e storage foram limpos');
                        break;
                }
            });
        });
    }
    
    // Editor maximize
    document.getElementById('maximize-editor-btn').addEventListener('click', toggleMaximizeEditor);
    
    // Keyboard shortcut for editor maximize (F11)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F11') {
            e.preventDefault();
            toggleMaximizeEditor();
        }
    });
}

function switchPanel(panelName) {
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
    
    document.querySelector(`[data-panel="${panelName}"]`).classList.add('active');
    document.getElementById(`${panelName}-panel`).classList.add('active');
}

function clearCurrentPanel() {
    const activePanel = document.querySelector('.panel-content.active');
    const panelId = activePanel.id;
    
    if (panelId === 'console-panel') {
        document.getElementById('console-output').innerHTML = '';
        document.getElementById('console-badge').textContent = '0';
    } else if (panelId === 'problems-panel') {
        document.getElementById('problems-list').innerHTML = '<div class="no-problems"><i class="fas fa-circle-check"></i><p>Nenhum problema encontrado</p></div>';
        document.getElementById('problems-badge').textContent = '0';
    }
}

function togglePanelMaximize() {
    const panel = document.getElementById('bottom-panel');
    panel.classList.toggle('maximized');
    
    const btn = document.getElementById('maximize-panel-btn');
    const icon = btn.querySelector('i');
    
    if (panel.classList.contains('maximized')) {
        icon.className = 'fas fa-minimize';
    } else {
        icon.className = 'fas fa-maximize';
    }
}

function closeBottomPanel() {
    document.getElementById('bottom-panel').classList.add('closed');
}

function openInNewTab() {
    // Se há um arquivo HTML específico selecionado para preview, usar ele
    let htmlFile = null;
    let cssFile = null;
    let jsFile = null;
    
    if (App.previewFileId) {
        htmlFile = getFileById(App.previewFileId);
        if (htmlFile && htmlFile.extension === 'html') {
            // Encontrar CSS e JS relacionados
            const related = findRelatedFiles(htmlFile);
            cssFile = related.cssFile;
            jsFile = related.jsFile;
        }
    }
    
    // Se não há previewFileId definido ou arquivo não encontrado, usar comportamento padrão
    if (!htmlFile) {
        htmlFile = App.files.find(f => f.extension === 'html');
        cssFile = App.files.find(f => f.extension === 'css');
        jsFile = App.files.find(f => f.extension === 'js');
    }
    
    const mdFile = App.files.find(f => f.extension === 'md');
    
    let html = '';
    
    // Handle Markdown
    if (mdFile && mdFile.content && typeof marked !== 'undefined') {
        try {
            html = renderMarkdownPreview(mdFile.content);
        } catch (error) {
            html = `<html><body><p>Erro ao processar Markdown: ${error.message}</p></body></html>`;
        }
    } else {
        html = htmlFile ? htmlFile.content : '<!DOCTYPE html><html><head><title>Preview</title></head><body></body></html>';
        
        if (cssFile && cssFile.content) {
            const css = `<style>${cssFile.content}</style>`;
            if (html.includes('</head>')) {
                html = html.replace('</head>', `${css}</head>`);
            } else if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>${css}`);
            } else {
                html = `<head>${css}</head>${html}`;
            }
        }
        
        if (jsFile && jsFile.content) {
            const js = `<script>${jsFile.content}<\/script>`;
            if (html.includes('</body>')) {
                html = html.replace('</body>', `${js}</body>`);
            } else if (html.includes('<body>')) {
                html = html.replace('<body>', `<body>${js}`);
            } else {
                html += js;
            }
        }
    }
    
    const newWindow = window.open();
    newWindow.document.write(html);
    newWindow.document.close();
}

// ================================
// REAL-TIME PREVIEW
// ================================

function setupRealtimePreview() {
    // Initialize BroadcastChannel for cross-tab communication
    if (typeof BroadcastChannel !== 'undefined') {
        App.broadcastChannel = new BroadcastChannel('codespace-preview');
        
        // Listen for messages from preview window
        App.broadcastChannel.addEventListener('message', (event) => {
            if (event.data.type === 'preview-ready') {
                // Preview window is ready, send initial content
                updatePreview();
            }
        });
    }
    
    // Also use localStorage as fallback for older browsers
    window.addEventListener('storage', (event) => {
        if (event.key === 'codespace-preview-update') {
            // Preview update received from another tab
            const data = JSON.parse(event.newValue);
            if (data && data.html) {
                updatePreviewWindow(data.html);
            }
        }
    });
}

function openRealtimePreview() {
    // Check if preview window is already open
    if (App.realtimePreviewWindow && !App.realtimePreviewWindow.closed) {
        App.realtimePreviewWindow.focus();
        showNotification('info', 'Preview', 'Janela de preview já está aberta');
        return;
    }
    
    // Create preview HTML
    const previewHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview em Tempo Real - Lehunteerz CodeSpace</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1e1e1e;
            color: #fff;
            overflow: hidden;
        }
        .preview-header {
            background: #252526;
            padding: 10px 20px;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .preview-title {
            font-size: 14px;
            font-weight: 500;
        }
        .preview-status {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
        }
        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #4caf50;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .status-indicator.disconnected {
            background: #f44336;
            animation: none;
        }
        #preview-content {
            width: 100%;
            height: calc(100vh - 50px);
            border: none;
            background: white;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: calc(100vh - 50px);
            color: #858585;
        }
    </style>
</head>
<body>
    <div class="preview-header">
        <div class="preview-title">
            <i class="fas fa-sync-alt"></i> Preview em Tempo Real
        </div>
        <div class="preview-status">
            <span class="status-indicator" id="status-indicator"></span>
            <span id="status-text">Conectado</span>
        </div>
    </div>
    <div id="preview-content" class="loading">
        <div>
            <div style="font-size: 48px; margin-bottom: 10px;">⏳</div>
            <div>Aguardando conteúdo...</div>
        </div>
    </div>
    <script>
        // Initialize BroadcastChannel
        let broadcastChannel;
        let lastUpdateTime = 0;
        
        if (typeof BroadcastChannel !== 'undefined') {
            broadcastChannel = new BroadcastChannel('codespace-preview');
            
            broadcastChannel.addEventListener('message', (event) => {
                if (event.data.type === 'preview-update') {
                    updatePreview(event.data.html);
                    updateStatus(true);
                    lastUpdateTime = Date.now();
                }
            });
            
            // Notify main window that preview is ready
            broadcastChannel.postMessage({ type: 'preview-ready' });
        }
        
        // Fallback: use localStorage polling
        setInterval(() => {
            try {
                const updateData = localStorage.getItem('codespace-preview-update');
                if (updateData) {
                    const data = JSON.parse(updateData);
                    if (data && data.timestamp > lastUpdateTime) {
                        updatePreview(data.html);
                        updateStatus(true);
                        lastUpdateTime = data.timestamp;
                    }
                }
            } catch (e) {
                console.error('Error reading preview update:', e);
            }
        }, 100);
        
        function updatePreview(html) {
            const contentDiv = document.getElementById('preview-content');
            if (!contentDiv) return;
            
            // Create blob URL
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            // Update iframe or create new one
            let iframe = contentDiv.querySelector('iframe');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                contentDiv.innerHTML = '';
                contentDiv.appendChild(iframe);
            }
            
            // Revoke old URL
            if (iframe.dataset.blobUrl) {
                URL.revokeObjectURL(iframe.dataset.blobUrl);
            }
            
            iframe.src = url;
            iframe.dataset.blobUrl = url;
        }
        
        function updateStatus(connected) {
            const indicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            
            if (indicator && statusText) {
                if (connected) {
                    indicator.classList.remove('disconnected');
                    statusText.textContent = 'Conectado';
                } else {
                    indicator.classList.add('disconnected');
                    statusText.textContent = 'Desconectado';
                }
            }
        }
        
        // Check connection status
        setInterval(() => {
            const timeSinceLastUpdate = Date.now() - lastUpdateTime;
            if (timeSinceLastUpdate > 5000 && lastUpdateTime > 0) {
                updateStatus(false);
            }
        }, 1000);
        
        // Handle window close
        window.addEventListener('beforeunload', () => {
            if (broadcastChannel) {
                broadcastChannel.close();
            }
        });
    </script>
</body>
</html>`;
    
    // Open new window
    App.realtimePreviewWindow = window.open('', '_blank', 'width=1200,height=800');
    
    if (App.realtimePreviewWindow) {
        App.realtimePreviewWindow.document.write(previewHTML);
        App.realtimePreviewWindow.document.close();
        
        // Send initial content
        setTimeout(() => {
            updatePreview();
        }, 500);
        
        showNotification('success', 'Preview em Tempo Real', 'Janela de preview aberta. Alterações serão sincronizadas automaticamente.');
        
        // Monitor window close
        const checkClosed = setInterval(() => {
            if (App.realtimePreviewWindow.closed) {
                clearInterval(checkClosed);
                App.realtimePreviewWindow = null;
            }
        }, 1000);
    } else {
        showNotification('error', 'Erro', 'Não foi possível abrir a janela de preview. Verifique se os pop-ups estão bloqueados.');
    }
}

function updatePreviewWindow(html) {
    // This function is called when receiving updates via localStorage
    // The preview window will pick it up via polling
    try {
        localStorage.setItem('codespace-preview-update', JSON.stringify({
            html: html,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Error updating preview via localStorage:', e);
    }
}

// ================================
// MAXIMIZE FUNCTIONALITY
// ================================

function toggleMaximizeEditor() {
    const editorArea = document.querySelector('.editor-area');
    const sidebar = document.getElementById('sidebar');
    const header = document.querySelector('.top-header');
    const statusBar = document.querySelector('.status-bar');
    const bottomPanel = document.getElementById('bottom-panel');
    const maximizeBtn = document.getElementById('maximize-editor-btn');
    const icon = maximizeBtn.querySelector('i');
    
    if (!App.editorMaximized) {
        // Save current state
        App.previousEditorState = {
            sidebarVisible: sidebar.style.display !== 'none',
            bottomPanelVisible: bottomPanel.style.display !== 'none',
            bottomPanelHeight: bottomPanel.style.height
        };
        
        // Maximize editor
        sidebar.style.display = 'none';
        bottomPanel.style.display = 'none';
        header.style.display = 'none';
        statusBar.style.display = 'none';
        
        editorArea.style.position = 'fixed';
        editorArea.style.top = '0';
        editorArea.style.left = '0';
        editorArea.style.width = '100vw';
        editorArea.style.height = '100vh';
        editorArea.style.zIndex = '10000';
        editorArea.classList.add('maximized');
        
        // Update button icon
        icon.className = 'fas fa-compress';
        maximizeBtn.title = 'Restaurar Editor (F11)';
        
        App.editorMaximized = true;
        
        // Trigger Monaco resize
        if (App.editor) {
            setTimeout(() => {
                App.editor.layout({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }, 100);
        }
        
        // Listen for window resize
        window.addEventListener('resize', handleEditorMaximizeResize);
        
        showNotification('info', 'Editor Maximizado', 'Pressione F11 ou clique no botão para restaurar');
    } else {
        // Restore previous state
        if (App.previousEditorState) {
            sidebar.style.display = App.previousEditorState.sidebarVisible ? '' : 'none';
            bottomPanel.style.display = App.previousEditorState.bottomPanelVisible ? '' : 'none';
            if (App.previousEditorState.bottomPanelHeight) {
                bottomPanel.style.height = App.previousEditorState.bottomPanelHeight;
            }
        } else {
            sidebar.style.display = '';
            bottomPanel.style.display = '';
        }
        
        header.style.display = '';
        statusBar.style.display = '';
        
        editorArea.style.position = '';
        editorArea.style.top = '';
        editorArea.style.left = '';
        editorArea.style.width = '';
        editorArea.style.height = '';
        editorArea.style.zIndex = '';
        editorArea.classList.remove('maximized');
        
        // Update button icon
        icon.className = 'fas fa-expand';
        maximizeBtn.title = 'Maximizar Editor (F11)';
        
        App.editorMaximized = false;
        
        // Remove resize listener
        window.removeEventListener('resize', handleEditorMaximizeResize);
        
        // Trigger Monaco resize
        if (App.editor) {
            setTimeout(() => {
                const editorContainer = document.getElementById('editor-container');
                if (editorContainer) {
                    App.editor.layout({
                        width: editorContainer.offsetWidth,
                        height: editorContainer.offsetHeight
                    });
                } else {
                    App.editor.layout();
                }
            }, 100);
        }
    }
}

function handleEditorMaximizeResize() {
    if (App.editorMaximized && App.editor) {
        App.editor.layout({
            width: window.innerWidth,
            height: window.innerHeight
        });
    }
}

// Preview maximize function removed - button was removed from UI

// ================================
// RENAME FUNCTIONALITY
// ================================

function renameFile(fileId) {
    const file = getFileById(fileId);
    if (!file) return;
    
    const fileNameSpan = document.querySelector(`.file-name-display[data-file-id="${fileId}"]`);
    if (fileNameSpan) {
        startInlineRename(fileId, fileNameSpan);
    } else {
        // Fallback to prompt if span not found
        const newName = prompt('Digite o novo nome do arquivo (sem extensão):', file.name);
        if (newName && newName.trim() && newName.trim() !== file.name) {
            performRename(fileId, newName.trim());
        }
    }
}

function startInlineRename(fileId, spanElement) {
    const file = getFileById(fileId);
    if (!file || !spanElement) return;
    
    const currentName = file.name;
    const extension = file.extension;
    const fullName = `${currentName}.${extension}`;
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'file-name-input-edit';
    input.style.cssText = `
        background: var(--bg-tertiary);
        border: 2px solid var(--accent-primary);
        color: var(--text-primary);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 13px;
        font-family: inherit;
        min-width: 100px;
        outline: none;
    `;
    
    // Replace span with input
    const parent = spanElement.parentElement;
    parent.replaceChild(input, spanElement);
    input.focus();
    input.select();
    
    // Handle save
    const saveRename = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            performRename(fileId, newName);
        } else {
            // Restore original
            const newSpan = document.createElement('span');
            newSpan.className = 'file-name-display';
            newSpan.dataset.fileId = fileId;
            newSpan.textContent = fullName;
            parent.replaceChild(newSpan, input);
            setupFileRenameEvents(fileId, newSpan);
        }
    };
    
    // Handle cancel
    const cancelRename = () => {
        const newSpan = document.createElement('span');
        newSpan.className = 'file-name-display';
        newSpan.dataset.fileId = fileId;
        newSpan.textContent = fullName;
        parent.replaceChild(newSpan, input);
        setupFileRenameEvents(fileId, newSpan);
    };
    
    input.addEventListener('blur', saveRename);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRename();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelRename();
        }
    });
}

function setupFileRenameEvents(fileId, spanElement) {
    // Double click to rename
    spanElement.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startInlineRename(fileId, spanElement);
    });
    
    // Context menu
    spanElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e, 'file', fileId);
    });
}

function performRename(fileId, newName) {
    const file = getFileById(fileId);
    if (!file) return;
    
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newName)) {
        showNotification('error', 'Erro', 'Nome do arquivo contém caracteres inválidos.');
        renderFileTree(); // Restore tree
        return;
    }
    
    // Check for duplicates
    const duplicate = App.files.find(f => 
        f.name === newName && 
        f.extension === file.extension && 
        f.folderId === file.folderId &&
        f.id !== fileId
    );
    
    if (duplicate) {
        showNotification('error', 'Erro', `Já existe um arquivo chamado ${newName}.${file.extension} nesta pasta.`);
        renderFileTree(); // Restore tree
        return;
    }
    
    file.name = newName;
    saveToLocalStorage();
    renderFileTree();
    renderTabs();
    
    showNotification('success', 'Renomeado', `${file.name}.${file.extension} renomeado com sucesso`);
}

function renameFolder(folderId) {
    const folder = getFolderById(folderId);
    if (!folder) return;
    
    const folderNameSpan = document.querySelector(`.folder-name[data-folder-id="${folderId}"]`);
    if (folderNameSpan) {
        startInlineRenameFolder(folderId, folderNameSpan);
    } else {
        // Fallback to prompt if span not found
        const newName = prompt('Digite o novo nome da pasta:', folder.name);
        if (newName && newName.trim() && newName.trim() !== folder.name) {
            performRenameFolder(folderId, newName.trim());
        }
    }
}

function startInlineRenameFolder(folderId, spanElement) {
    const folder = getFolderById(folderId);
    if (!folder || !spanElement) return;
    
    const currentName = folder.name;
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'folder-name-input-edit';
    input.style.cssText = `
        background: var(--bg-tertiary);
        border: 2px solid var(--accent-primary);
        color: var(--text-primary);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 13px;
        font-family: inherit;
        min-width: 100px;
        outline: none;
    `;
    
    // Replace span with input
    const parent = spanElement.parentElement;
    parent.replaceChild(input, spanElement);
    input.focus();
    input.select();
    
    // Handle save
    const saveRename = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            performRenameFolder(folderId, newName);
        } else {
            // Restore original
            const newSpan = document.createElement('span');
            newSpan.className = 'folder-name';
            newSpan.dataset.folderId = folderId;
            newSpan.textContent = currentName;
            parent.replaceChild(newSpan, input);
            setupFolderRenameEvents(folderId, newSpan);
        }
    };
    
    // Handle cancel
    const cancelRename = () => {
        const newSpan = document.createElement('span');
        newSpan.className = 'folder-name';
        newSpan.dataset.folderId = folderId;
        newSpan.textContent = currentName;
        parent.replaceChild(newSpan, input);
        setupFolderRenameEvents(folderId, newSpan);
    };
    
    input.addEventListener('blur', saveRename);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRename();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelRename();
        }
    });
}

function setupFolderRenameEvents(folderId, spanElement) {
    // Double click to rename
    spanElement.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startInlineRenameFolder(folderId, spanElement);
    });
    
    // Context menu
    spanElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e, 'folder', folderId);
    });
}

function performRenameFolder(folderId, newName) {
    const folder = getFolderById(folderId);
    if (!folder) return;
    
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newName)) {
        showNotification('error', 'Erro', 'Nome da pasta contém caracteres inválidos.');
        renderFileTree(); // Restore tree
        return;
    }
    
    // Check for duplicates
    const duplicate = App.folders.find(f => 
        f.name === newName && 
        f.parentId === folder.parentId &&
        f.id !== folderId
    );
    
    if (duplicate) {
        showNotification('error', 'Erro', `Já existe uma pasta chamada "${newName}" neste local.`);
        renderFileTree(); // Restore tree
        return;
    }
    
    folder.name = newName;
    saveToLocalStorage();
    renderFileTree();
    
    showNotification('success', 'Renomeado', `Pasta "${folder.name}" renomeada com sucesso`);
}

// ================================
// MOVE TO FOLDER FUNCTIONALITY
// ================================

function showMoveToFolderModal(type, id) {
    const select = document.getElementById('target-folder-select');
    if (!select) return;
    
    // Clear and populate folder select
    select.innerHTML = '<option value="">Raiz do Projeto</option>';
    
    function addFolderOptions(folders, level = 0) {
        folders.forEach(folder => {
            const indent = '  '.repeat(level);
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = `${indent}📁 ${folder.name}`;
            select.appendChild(option);
            
            // Add child folders
            const children = App.folders.filter(f => f.parentId === folder.id);
            if (children.length > 0) {
                addFolderOptions(children, level + 1);
            }
        });
    }
    
    const rootFolders = App.folders.filter(f => !f.parentId);
    addFolderOptions(rootFolders);
    
    // Set current folder as selected (if moving a folder, can't move to itself or children)
    if (type === 'folder') {
        const currentFolder = getFolderById(id);
        if (currentFolder) {
            // Disable current folder and its children
            Array.from(select.options).forEach(option => {
                if (option.value === id || isChildFolder(option.value, id)) {
                    option.disabled = true;
                }
            });
        }
    }
    
    App.moveToFolderTarget = { type, id };
    openModal('move-to-folder-modal');
    
    // Setup confirm button
    const confirmBtn = document.getElementById('confirm-move-btn');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const targetFolderId = select.value || null;
            if (type === 'file') {
                moveFileToFolder(id, targetFolderId);
            } else {
                moveFolderToFolder(id, targetFolderId);
            }
            closeModal('move-to-folder-modal');
        };
    }
}

function isChildFolder(folderId, parentId) {
    const folder = getFolderById(folderId);
    if (!folder || !folder.parentId) return false;
    if (folder.parentId === parentId) return true;
    return isChildFolder(folder.parentId, parentId);
}

function moveFileToFolder(fileId, targetFolderId) {
    const file = getFileById(fileId);
    if (!file) return;
    
    const oldFolderId = file.folderId;
    file.folderId = targetFolderId;
    
    // Expand target folder
    if (targetFolderId) {
        App.expandedFolders.add(targetFolderId);
    }
    
    saveToLocalStorage();
    renderFileTree();
    
    const targetName = targetFolderId ? getFolderById(targetFolderId)?.name : 'raiz';
    showNotification('success', 'Movido', `${file.name}.${file.extension} movido para ${targetName}`);
}

function moveFolderToFolder(folderId, targetFolderId) {
    const folder = getFolderById(folderId);
    if (!folder) return;
    
    // Prevent moving folder into itself or its children
    if (targetFolderId && (targetFolderId === folderId || isChildFolder(targetFolderId, folderId))) {
        showNotification('error', 'Erro', 'Não é possível mover uma pasta para dentro de si mesma ou de suas subpastas.');
        return;
    }
    
    folder.parentId = targetFolderId;
    
    // Expand target folder
    if (targetFolderId) {
        App.expandedFolders.add(targetFolderId);
    }
    
    saveToLocalStorage();
    renderFileTree();
    
    const targetName = targetFolderId ? getFolderById(targetFolderId)?.name : 'raiz';
    showNotification('success', 'Movido', `Pasta "${folder.name}" movida para ${targetName}`);
}

// ================================
// MANUAL CSS FORMATTING (FALLBACK)
// ================================

function formatCSSManually(css) {
    // Basic CSS formatting without Prettier
    let formatted = css
        .replace(/\s*{\s*/g, ' {\n    ')
        .replace(/;\s*/g, ';\n    ')
        .replace(/\s*}\s*/g, '\n}\n\n')
        .replace(/,\s*/g, ', ')
        .replace(/:\s*/g, ': ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();
    
    // Clean up extra spaces
    formatted = formatted
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');
    
    return formatted;
}

// ================================
// MARKDOWN PREVIEW WITH ENHANCEMENTS
// ================================

function renderMarkdownPreview(markdownContent) {
    // Configure marked with options
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: false
        });
    }
    
    // Parse markdown
    let markdownHtml = marked.parse(markdownContent);
    
    // Process ALL code blocks to add copy buttons and syntax highlighting
    // This regex matches both with and without language classes
    markdownHtml = markdownHtml.replace(/<pre><code(?:\s+class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/gi, (match, lang, code) => {
        const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
        const cleanLang = (lang || 'text').toLowerCase().trim();
        
        // Code is already HTML-escaped by marked, so we use it as-is
        // The text extraction will happen in JavaScript when copying
        
        return `<div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-language">${cleanLang}</span>
                <button class="code-copy-btn" onclick="copyCodeToClipboard('${codeId}')" title="Copiar código">
                    <i class="fas fa-copy"></i>
                    <span class="copy-text">Copiar</span>
                </button>
            </div>
            <pre><code id="${codeId}" class="language-${cleanLang}">${code}</code></pre>
        </div>`;
    });
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview Markdown</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.7;
            color: #24292e;
            background: #ffffff;
        }
        
        @media (prefers-color-scheme: dark) {
            body {
                background: #0d1117;
                color: #c9d1d9;
            }
        }
        
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
            color: #24292e;
        }
        
        @media (prefers-color-scheme: dark) {
            h1, h2, h3, h4, h5, h6 {
                color: #c9d1d9;
            }
        }
        
        h1 {
            font-size: 2em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
        }
        
        @media (prefers-color-scheme: dark) {
            h1 {
                border-bottom-color: #30363d;
            }
        }
        
        h2 {
            font-size: 1.5em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
        }
        
        @media (prefers-color-scheme: dark) {
            h2 {
                border-bottom-color: #30363d;
            }
        }
        
        p {
            margin-bottom: 16px;
        }
        
        a {
            color: #0366d6;
            text-decoration: none;
        }
        
        @media (prefers-color-scheme: dark) {
            a {
                color: #58a6ff;
            }
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        code {
            background: rgba(175, 184, 193, 0.2);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 85%;
        }
        
        @media (prefers-color-scheme: dark) {
            code {
                background: rgba(110, 118, 129, 0.4);
            }
        }
        
        .code-block-wrapper {
            position: relative;
            margin: 16px 0;
            border-radius: 6px;
            overflow: hidden;
            background: #161b22;
            border: 1px solid #30363d;
        }
        
        .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #21262d;
            border-bottom: 1px solid #30363d;
            font-size: 12px;
        }
        
        .code-language {
            color: #8b949e;
            font-weight: 500;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }
        
        .code-copy-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: transparent;
            border: 1px solid #30363d;
            color: #c9d1d9;
            padding: 4px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .code-copy-btn:hover {
            background: #30363d;
            border-color: #484f58;
            color: #ffffff;
        }
        
        .code-copy-btn.copied {
            background: #238636;
            border-color: #238636;
            color: #ffffff;
        }
        
        .code-copy-btn.copied .copy-text {
            display: none;
        }
        
        .code-copy-btn.copied::after {
            content: "Copiado!";
        }
        
        .code-copy-btn i {
            font-size: 11px;
        }
        
        pre {
            margin: 0;
            padding: 16px;
            overflow-x: auto;
            background: #161b22;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 85%;
            line-height: 1.45;
        }
        
        pre code {
            background: none;
            padding: 0;
            border-radius: 0;
            color: #c9d1d9;
            display: block;
            overflow: visible;
            word-wrap: normal;
        }
        
        ul, ol {
            margin-bottom: 16px;
            padding-left: 2em;
        }
        
        li {
            margin-bottom: 4px;
        }
        
        li > p {
            margin-top: 16px;
        }
        
        blockquote {
            padding: 0 1em;
            color: #6a737d;
            border-left: 0.25em solid #dfe2e5;
            margin: 0 0 16px 0;
        }
        
        @media (prefers-color-scheme: dark) {
            blockquote {
                color: #8b949e;
                border-left-color: #30363d;
            }
        }
        
        table {
            border-spacing: 0;
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 16px;
            display: block;
            overflow-x: auto;
        }
        
        table th,
        table td {
            padding: 6px 13px;
            border: 1px solid #dfe2e5;
        }
        
        @media (prefers-color-scheme: dark) {
            table th,
            table td {
                border-color: #30363d;
            }
        }
        
        table th {
            font-weight: 600;
            background: #f6f8fa;
        }
        
        @media (prefers-color-scheme: dark) {
            table th {
                background: #161b22;
            }
        }
        
        table tr {
            background: #ffffff;
            border-top: 1px solid #c6cbd1;
        }
        
        @media (prefers-color-scheme: dark) {
            table tr {
                background: #0d1117;
                border-top-color: #21262d;
            }
        }
        
        table tr:nth-child(2n) {
            background: #f6f8fa;
        }
        
        @media (prefers-color-scheme: dark) {
            table tr:nth-child(2n) {
                background: #161b22;
            }
        }
        
        img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin: 16px 0;
        }
        
        hr {
            height: 0.25em;
            padding: 0;
            margin: 24px 0;
            background: #e1e4e8;
            border: 0;
        }
        
        @media (prefers-color-scheme: dark) {
            hr {
                background: #21262d;
            }
        }
        
        input[type="checkbox"] {
            margin-right: 8px;
        }
        
        .task-list-item {
            list-style-type: none;
        }
        
        .task-list-item {
            list-style-type: none;
        }
        
        .task-list-item input {
            margin: 0 0.2em 0.25em -1.6em;
            vertical-align: middle;
        }
        
        .task-list-item-checked {
            text-decoration: line-through;
            opacity: 0.7;
        }
        
        /* Code block improvements */
        .hljs {
            display: block;
            overflow-x: auto;
            padding: 0;
            background: transparent;
        }
        
        /* Inline code improvements */
        :not(pre) > code {
            background: rgba(175, 184, 193, 0.2);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-size: 85%;
        }
        
        @media (prefers-color-scheme: dark) {
            :not(pre) > code {
                background: rgba(110, 118, 129, 0.4);
            }
        }
        
        /* Link improvements */
        a[href^="#"] {
            color: #0366d6;
        }
        
        @media (prefers-color-scheme: dark) {
            a[href^="#"] {
                color: #58a6ff;
            }
        }
        
        /* Image improvements */
        img {
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        /* Table improvements */
        table {
            display: table;
        }
        
        /* Blockquote improvements */
        blockquote > :first-child {
            margin-top: 0;
        }
        
        blockquote > :last-child {
            margin-bottom: 0;
        }
        
        /* List improvements */
        ul.contains-task-list {
            list-style: none;
            padding-left: 0;
        }
        
        ul.contains-task-list li {
            padding-left: 1.5em;
        }
        
        ul.contains-task-list li input[type="checkbox"] {
            margin-left: -1.5em;
        }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>
        function copyCodeToClipboard(codeId) {
            const codeElement = document.getElementById(codeId);
            if (!codeElement) return;
            
            const btn = event.target.closest('.code-copy-btn');
            
            // Get text content - this automatically decodes HTML entities
            let text = codeElement.textContent || codeElement.innerText || '';
            
            // If textContent doesn't work (some edge cases), try innerText
            if (!text || text.trim().length === 0) {
                // Create a temporary element to decode HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = codeElement.innerHTML;
                text = tempDiv.textContent || tempDiv.innerText || '';
            }
            
            // Clean up text (preserve structure but trim edges)
            text = text.trim();
            
            // Copy to clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    if (btn) {
                        btn.classList.add('copied');
                        setTimeout(() => {
                            btn.classList.remove('copied');
                        }, 2000);
                    }
                }).catch(err => {
                    console.error('Erro ao copiar:', err);
                    fallbackCopy(text, btn);
                });
            } else {
                fallbackCopy(text, btn);
            }
        }
        
        function fallbackCopy(text, btn) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful && btn) {
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.classList.remove('copied');
                    }, 2000);
                }
            } catch (e) {
                console.error('Erro ao copiar (fallback):', e);
            }
            document.body.removeChild(textArea);
        }
        
        // Highlight code blocks after page load
        function highlightAllCode() {
            if (typeof hljs !== 'undefined') {
                document.querySelectorAll('pre code').forEach((block) => {
                    if (!block.classList.contains('hljs')) {
                        try {
                            hljs.highlightElement(block);
                        } catch (e) {
                            console.warn('Erro ao destacar código:', e);
                        }
                    }
                });
            }
        }
        
        // Run immediately and on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', highlightAllCode);
        } else {
            highlightAllCode();
        }
        
        // Also run after a short delay to ensure everything is loaded
        setTimeout(highlightAllCode, 100);
    </script>
</head>
<body>
${markdownHtml}
</body>
</html>`;
}

// ================================
// CONTEXT MENU & SELECTION
// ================================

function setupContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (!contextMenu) return;
    
    // Evitar adicionar listeners múltiplas vezes
    if (contextMenu.dataset.setup === 'true') {
        return; // Já foi configurado
    }
    contextMenu.dataset.setup = 'true';
    
    // Close context menu when clicking outside (usar event delegation)
    // Remover listener antigo se existir
    if (App.contextMenuClickHandler) {
        document.removeEventListener('click', App.contextMenuClickHandler);
    }
    App.contextMenuClickHandler = (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    };
    document.addEventListener('click', App.contextMenuClickHandler);
    
    // Handle context menu actions usando event delegation
    // Remover listener antigo se existir
    if (App.contextMenuActionHandler) {
        contextMenu.removeEventListener('click', App.contextMenuActionHandler);
    }
    App.contextMenuActionHandler = (e) => {
        const item = e.target.closest('.context-menu-item');
        if (!item) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const action = item.dataset.action;
        if (action) {
            handleContextMenuAction(action);
            hideContextMenu();
        }
    };
    contextMenu.addEventListener('click', App.contextMenuActionHandler);
    
    // Close on Escape key (usar flag para evitar múltiplos listeners)
    if (!App.contextMenuEscapeHandler) {
        App.contextMenuEscapeHandler = (e) => {
            if (e.key === 'Escape') {
                hideContextMenu();
                if (App.selectionMode) {
                    exitSelectionMode();
                }
            }
        };
        document.addEventListener('keydown', App.contextMenuEscapeHandler);
    }
}

function showContextMenu(e, type, id) {
    const contextMenu = document.getElementById('context-menu');
    if (!contextMenu) return;
    
    App.contextMenuTarget = { type, id };
    
    // Position menu
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.classList.add('active');
    
    // Show/hide items based on context
    const moveUpItem = document.getElementById('move-up-item');
    const moveDownItem = document.getElementById('move-down-item');
    const deleteItem = document.getElementById('delete-item');
    const organizeSeparator = document.getElementById('organize-separator');
    const deleteSeparator = document.getElementById('delete-separator');
    
    // Reset visibility
    moveUpItem.style.display = 'none';
    moveDownItem.style.display = 'none';
    deleteItem.style.display = 'none';
    organizeSeparator.style.display = 'none';
    deleteSeparator.style.display = 'none';
    
    if (type === 'file' || type === 'folder') {
            // Show organize options
            moveUpItem.style.display = 'flex';
            moveDownItem.style.display = 'flex';
            deleteItem.style.display = 'flex';
            organizeSeparator.style.display = 'block';
            deleteSeparator.style.display = 'block';
            
            // Show rename option
            const renameItem = document.getElementById('rename-item');
            const renameSeparator = document.getElementById('rename-separator');
            const moveToFolderItem = document.getElementById('move-to-folder-item');
            const moveSeparator = document.getElementById('move-separator');
            
            if (renameItem) renameItem.style.display = 'flex';
            if (renameSeparator) renameSeparator.style.display = 'block';
            if (moveToFolderItem) moveToFolderItem.style.display = 'flex';
            if (moveSeparator) moveSeparator.style.display = 'block';
            
            // Show preview option for HTML files
            const previewHtmlItem = document.getElementById('preview-html-item');
            const previewSeparator = document.getElementById('preview-separator');
            
            if (type === 'file' && id) {
                const file = getFileById(id);
                if (file && file.extension === 'html') {
                    if (previewHtmlItem) previewHtmlItem.style.display = 'flex';
                    if (previewSeparator) previewSeparator.style.display = 'block';
                } else {
                    if (previewHtmlItem) previewHtmlItem.style.display = 'none';
                    if (previewSeparator) previewSeparator.style.display = 'none';
                }
            } else {
                if (previewHtmlItem) previewHtmlItem.style.display = 'none';
                if (previewSeparator) previewSeparator.style.display = 'none';
            }
        
        // Check if can move up/down
        const canMoveUp = canMoveItemUp(type, id);
        const canMoveDown = canMoveItemDown(type, id);
        
        moveUpItem.style.opacity = canMoveUp ? '1' : '0.5';
        moveUpItem.style.pointerEvents = canMoveUp ? 'auto' : 'none';
        
        moveDownItem.style.opacity = canMoveDown ? '1' : '0.5';
        moveDownItem.style.pointerEvents = canMoveDown ? 'auto' : 'none';
    }
    
    // Prevent menu from going off screen
    setTimeout(() => {
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    }, 0);
}

function hideContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        contextMenu.classList.remove('active');
    }
    App.contextMenuTarget = null;
}

function handleContextMenuAction(action) {
    const { type, id } = App.contextMenuTarget || {};
    
    switch (action) {
        case 'new-file':
            App.selectedFolderId = type === 'folder' ? id : null;
            openModal('new-file-modal');
            break;
            
        case 'new-page':
            App.selectedFolderId = type === 'folder' ? id : null;
            createNewHTMLPage();
            break;
            
        case 'new-folder':
            const parentId = type === 'folder' ? id : null;
            createNewFolder(parentId);
            break;
            
        case 'select-items':
            enterSelectionMode();
            break;
            
        case 'refresh':
            refreshFileTree();
            break;
            
        case 'move-up':
            if (type && id) {
                moveItemUp(type, id);
            }
            break;
            
        case 'move-down':
            if (type && id) {
                moveItemDown(type, id);
            }
            break;
            
        case 'delete':
            if (type === 'file' && id) {
                deleteFile(id);
            } else if (type === 'folder' && id) {
                deleteFolder(id);
            }
            break;
            
        case 'rename':
            if (type === 'file' && id) {
                renameFile(id);
            } else if (type === 'folder' && id) {
                renameFolder(id);
            }
            break;
            
        case 'move-to-folder':
            if (type === 'file' && id) {
                showMoveToFolderModal('file', id);
            } else if (type === 'folder' && id) {
                showMoveToFolderModal('folder', id);
            }
            break;
            
        case 'preview-html':
            if (type === 'file' && id) {
                const file = getFileById(id);
                if (file && file.extension === 'html') {
                    // Limpar cache quando mudamos de arquivo para forçar atualização
                    const oldPreviewFileId = App.previewFileId;
                    App.previewFileId = id;
                    
                    // Se mudou o arquivo, limpar cache relacionado ao arquivo antigo
                    if (oldPreviewFileId && oldPreviewFileId !== id) {
                        clearPreviewCacheForFile(oldPreviewFileId);
                    }
                    
                    // Limpar cache do novo arquivo também para forçar atualização
                    clearPreviewCacheForFile(id);
                    
                    // Forçar atualização do preview
                    updatePreview();
                    
                    // Garantir que o painel de preview está visível
                    const previewPanel = document.getElementById('preview-panel');
                    const previewTab = document.querySelector('[data-panel="preview"]');
                    if (previewPanel && previewTab) {
                        // Ativar a aba de preview
                        document.querySelectorAll('.panel-tab').forEach(tab => tab.classList.remove('active'));
                        document.querySelectorAll('.panel-content').forEach(panel => panel.classList.remove('active'));
                        previewTab.classList.add('active');
                        previewPanel.classList.add('active');
                        // Garantir que o painel inferior está visível
                        const bottomPanel = document.getElementById('bottom-panel');
                        if (bottomPanel && bottomPanel.classList.contains('hidden')) {
                            bottomPanel.classList.remove('hidden');
                        }
                    }
                    showNotification('success', 'Preview', `Visualizando "${file.name}.${file.extension}" no preview`);
                }
            }
            break;
    }
}

function createNewHTMLPage() {
    const name = prompt('Digite o nome da página HTML:', 'index');
    if (!name || !name.trim()) {
        return;
    }
    
    const folderId = App.selectedFolderId || null;
    
    // Get max order for siblings
    const siblings = App.files.filter(f => f.folderId === folderId);
    const maxOrder = siblings.length > 0 
        ? Math.max(...siblings.map(f => f.order || 0)) 
        : -1;
    
    const newFile = {
        id: generateId(),
        name: name.trim(),
        extension: 'html',
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name.trim()}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Bem-vindo à ${name.trim()}</h1>
        <p>Esta é uma nova página HTML criada no Lehunteerz CodeSpace.</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
        modified: false,
        folderId: folderId,
        order: maxOrder + 1
    };
    
    App.files.push(newFile);
    
    if (folderId) {
        App.expandedFolders.add(folderId);
    }
    
    renderFileTree();
    openFile(newFile.id);
    
    App.selectedFolderId = null;
    showNotification('success', 'Página criada', `Página ${name}.html criada com sucesso`);
}

function enterSelectionMode() {
    App.selectionMode = true;
    showNotification('info', 'Modo Seleção', 'Pressione Ctrl/Cmd + Clique para selecionar múltiplos itens. Pressione ESC para sair.');
    
    // Add visual indicator
    const fileTree = document.getElementById('file-tree');
    if (fileTree) {
        fileTree.classList.add('selection-mode');
    }
}

function exitSelectionMode() {
    App.selectionMode = false;
    clearSelection();
    
    const fileTree = document.getElementById('file-tree');
    if (fileTree) {
        fileTree.classList.remove('selection-mode');
    }
}

function toggleSelection(itemId, element) {
    if (App.selectedItems.has(itemId)) {
        App.selectedItems.delete(itemId);
        element.classList.remove('selected');
    } else {
        App.selectedItems.add(itemId);
        element.classList.add('selected');
    }
    
    if (App.selectedItems.size === 0) {
        exitSelectionMode();
    }
}

function clearSelection() {
    App.selectedItems.clear();
    document.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

function refreshFileTree() {
    renderFileTree();
    showNotification('success', 'Atualizado', 'Árvore de arquivos atualizada');
}

function canMoveItemUp(type, id) {
    if (type === 'file') {
        const file = getFileById(id);
        if (!file) return false;
        
        const siblings = App.files.filter(f => f.folderId === file.folderId);
        siblings.sort((a, b) => {
            const nameA = `${a.name}.${a.extension}`;
            const nameB = `${b.name}.${b.extension}`;
            return nameA.localeCompare(nameB);
        });
        
        return siblings.indexOf(file) > 0;
    } else if (type === 'folder') {
        const folder = getFolderById(id);
        if (!folder) return false;
        
        const siblings = App.folders.filter(f => f.parentId === folder.parentId);
        siblings.sort((a, b) => a.name.localeCompare(b.name));
        
        return siblings.indexOf(folder) > 0;
    }
    return false;
}

function canMoveItemDown(type, id) {
    if (type === 'file') {
        const file = getFileById(id);
        if (!file) return false;
        
        const siblings = App.files.filter(f => f.folderId === file.folderId);
        siblings.sort((a, b) => {
            const nameA = `${a.name}.${a.extension}`;
            const nameB = `${b.name}.${b.extension}`;
            return nameA.localeCompare(nameB);
        });
        
        return siblings.indexOf(file) < siblings.length - 1;
    } else if (type === 'folder') {
        const folder = getFolderById(id);
        if (!folder) return false;
        
        const siblings = App.folders.filter(f => f.parentId === folder.parentId);
        siblings.sort((a, b) => a.name.localeCompare(b.name));
        
        return siblings.indexOf(folder) < siblings.length - 1;
    }
    return false;
}

function moveItemUp(type, id) {
    if (type === 'file') {
        const file = getFileById(id);
        if (!file) return;
        
        // Initialize order if not exists
        if (typeof file.order === 'undefined') {
            initializeFileOrder(file.folderId);
        }
        
        const siblings = App.files.filter(f => f.folderId === file.folderId);
        siblings.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const currentIndex = siblings.indexOf(file);
        if (currentIndex > 0) {
            const previousFile = siblings[currentIndex - 1];
            const tempOrder = file.order;
            file.order = previousFile.order;
            previousFile.order = tempOrder;
            
            saveToLocalStorage();
            renderFileTree();
            showNotification('success', 'Movido', `${file.name}.${file.extension} movido para cima`);
        }
    } else if (type === 'folder') {
        const folder = getFolderById(id);
        if (!folder) return;
        
        // Initialize order if not exists
        if (typeof folder.order === 'undefined') {
            initializeFolderOrder(folder.parentId);
        }
        
        const siblings = App.folders.filter(f => f.parentId === folder.parentId);
        siblings.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const currentIndex = siblings.indexOf(folder);
        if (currentIndex > 0) {
            const previousFolder = siblings[currentIndex - 1];
            const tempOrder = folder.order;
            folder.order = previousFolder.order;
            previousFolder.order = tempOrder;
            
            saveToLocalStorage();
            renderFileTree();
            showNotification('success', 'Movido', `Pasta "${folder.name}" movida para cima`);
        }
    }
}

function moveItemDown(type, id) {
    if (type === 'file') {
        const file = getFileById(id);
        if (!file) return;
        
        // Initialize order if not exists
        if (typeof file.order === 'undefined') {
            initializeFileOrder(file.folderId);
        }
        
        const siblings = App.files.filter(f => f.folderId === file.folderId);
        siblings.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const currentIndex = siblings.indexOf(file);
        if (currentIndex < siblings.length - 1) {
            const nextFile = siblings[currentIndex + 1];
            const tempOrder = file.order;
            file.order = nextFile.order;
            nextFile.order = tempOrder;
            
            saveToLocalStorage();
            renderFileTree();
            showNotification('success', 'Movido', `${file.name}.${file.extension} movido para baixo`);
        }
    } else if (type === 'folder') {
        const folder = getFolderById(id);
        if (!folder) return;
        
        // Initialize order if not exists
        if (typeof folder.order === 'undefined') {
            initializeFolderOrder(folder.parentId);
        }
        
        const siblings = App.folders.filter(f => f.parentId === folder.parentId);
        siblings.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const currentIndex = siblings.indexOf(folder);
        if (currentIndex < siblings.length - 1) {
            const nextFolder = siblings[currentIndex + 1];
            const tempOrder = folder.order;
            folder.order = nextFolder.order;
            nextFolder.order = tempOrder;
            
            saveToLocalStorage();
            renderFileTree();
            showNotification('success', 'Movido', `Pasta "${folder.name}" movida para baixo`);
        }
    }
}

function initializeFileOrder(folderId) {
    const files = App.files.filter(f => f.folderId === folderId);
    files.forEach((file, index) => {
        if (typeof file.order === 'undefined') {
            file.order = index;
        }
    });
}

function initializeFolderOrder(parentId) {
    const folders = App.folders.filter(f => f.parentId === parentId);
    folders.forEach((folder, index) => {
        if (typeof folder.order === 'undefined') {
            folder.order = index;
        }
    });
}

// ================================
// MODALS
// ================================

function setupModals() {
    // Close buttons
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            const modalId = e.target.closest('.modal').id;
            closeModal(modalId);
        });
    });
    
    // Theme selection
    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
            const theme = card.dataset.theme;
            applyTheme(theme);
        });
    });
    
    // Export options
    document.querySelectorAll('.export-option').forEach(option => {
        option.addEventListener('click', () => {
            const type = option.dataset.export;
            exportProject(type);
        });
    });
    
    // Move to folder modal - close on cancel
    const moveModalCancel = document.querySelector('#move-to-folder-modal .btn-secondary');
    if (moveModalCancel) {
        moveModalCancel.addEventListener('click', () => {
            closeModal('move-to-folder-modal');
            App.moveToFolderTarget = null;
        });
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ================================
// RESIZING
// ================================

function setupResizing() {
    // Sidebar resize (optimized with requestAnimationFrame)
    const sidebarHandle = document.getElementById('sidebar-resize');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarHandle && sidebar) {
        let rafId = null;
        let isResizing = false;
        
        sidebarHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            const startX = e.clientX;
            const startWidth = sidebar.offsetWidth;
            sidebarHandle.classList.add('resizing');
            sidebar.style.transition = 'none'; // Disable transitions during resize
            
            function onMouseMove(e) {
                if (!isResizing) return;
                
                // Cancel previous animation frame
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }
                
                // Use requestAnimationFrame for smooth performance
                rafId = requestAnimationFrame(() => {
                    const newWidth = startWidth + (e.clientX - startX);
                    const finalWidth = Math.max(200, Math.min(500, newWidth));
                    sidebar.style.width = finalWidth + 'px';
                    
                    // Trigger Monaco resize if editor exists
                    if (App.editor && !App.editorMaximized) {
                        App.editor.layout();
                    }
                });
            }
            
            function onMouseUp() {
                isResizing = false;
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                sidebarHandle.classList.remove('resizing');
                sidebar.style.transition = ''; // Re-enable transitions
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
            
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMouseMove, { passive: true });
            document.addEventListener('mouseup', onMouseUp);
        });
    }
    
    // Bottom panel resize (optimized with requestAnimationFrame)
    const bottomHandle = document.getElementById('bottom-resize');
    const bottomPanel = document.getElementById('bottom-panel');
    
    if (bottomHandle && bottomPanel) {
        let rafId = null;
        let isResizing = false;
        
        bottomHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            const startY = e.clientY;
            const startHeight = bottomPanel.offsetHeight;
            bottomHandle.classList.add('resizing');
            bottomPanel.style.transition = 'none'; // Disable transitions during resize
            
            function onMouseMove(e) {
                if (!isResizing) return;
                
                // Cancel previous animation frame
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }
                
                // Use requestAnimationFrame for smooth performance
                rafId = requestAnimationFrame(() => {
                    const diff = startY - e.clientY;
                    const newHeight = startHeight + diff;
                    const maxHeight = window.innerHeight * 0.7;
                    const minHeight = 100;
                    const finalHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
                    
                    bottomPanel.style.height = finalHeight + 'px';
                    
                    // Trigger Monaco resize if editor exists
                    if (App.editor && !App.editorMaximized) {
                        App.editor.layout();
                    }
                });
            }
            
            function onMouseUp() {
                isResizing = false;
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                bottomHandle.classList.remove('resizing');
                bottomPanel.style.transition = ''; // Re-enable transitions
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
            
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMouseMove, { passive: true });
            document.addEventListener('mouseup', onMouseUp);
        });
    }
}

// ================================
// STATUS BAR
// ================================

// Cache for line counts
let lineCountCache = new Map();
let lastFileContentHash = '';

function calculateFileHash() {
    return App.files.map(f => `${f.id}:${f.content.length}`).join('|');
}

function setupStatusBar() {
    // Throttled update function
    const updateStatusBar = throttle(() => {
        const fileCount = App.files.length;
        const fileCountEl = document.getElementById('file-count');
        const totalLinesEl = document.getElementById('total-lines');
        
        if (!fileCountEl || !totalLinesEl) return;
        
        // Update file count
        fileCountEl.textContent = `${fileCount} arquivo${fileCount !== 1 ? 's' : ''}`;
        
        // Calculate lines only if content changed
        const currentHash = calculateFileHash();
        if (currentHash !== lastFileContentHash) {
            let totalLines = 0;
            
            App.files.forEach(file => {
                if (lineCountCache.has(file.id)) {
                    const cached = lineCountCache.get(file.id);
                    if (cached.contentLength === file.content.length) {
                        totalLines += cached.lines;
                        return;
                    }
                }
                
                const lines = file.content.split('\n').length;
                lineCountCache.set(file.id, {
                    lines: lines,
                    contentLength: file.content.length
                });
                totalLines += lines;
            });
            
            totalLinesEl.textContent = `${totalLines} linhas`;
            lastFileContentHash = currentHash;
        }
    }, 500);
    
    // Update immediately
    updateStatusBar();
    
    // Then update every second (throttled)
    setInterval(updateStatusBar, 1000);
    
    // Store update function for use in other functions
    App.updateStatusBar = updateStatusBar;
}

// ================================
// EVENT LISTENERS
// ================================

function setupOnlineOfflineDetection() {
    let lastOnlineStatus = navigator.onLine;
    let notificationTimeout = null;
    
    // Function to show notification when status changes
    const handleStatusChange = (isOnline) => {
        // Clear any pending notifications
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
        }
        
        // Small delay to avoid duplicate notifications
        notificationTimeout = setTimeout(() => {
            if (isOnline) {
                showNotification('success', 'Conexão Restaurada', 'Internet conectada novamente! 🎉', 5000);
                console.log('🟢 Status: ONLINE');
            } else {
                showNotification('warning', 'Sem Conexão', 'Você está offline. Algumas funcionalidades podem estar limitadas.', 8000);
                console.log('🔴 Status: OFFLINE');
            }
        }, 100);
    };
    
    // Function to check and update status
    const checkOnlineStatus = () => {
        const isOnline = navigator.onLine;
        
        // Only show notification if status changed
        if (isOnline !== lastOnlineStatus) {
            lastOnlineStatus = isOnline;
            handleStatusChange(isOnline);
        }
    };
    
    // Check initial status
    if (!navigator.onLine) {
        handleStatusChange(false);
    }
    
    // Listen for online event (window)
    window.addEventListener('online', () => {
        lastOnlineStatus = true;
        handleStatusChange(true);
    }, false);
    
    // Listen for offline event (window)
    window.addEventListener('offline', () => {
        lastOnlineStatus = false;
        handleStatusChange(false);
    }, false);
    
    // Also listen on document (some browsers need this)
    document.addEventListener('online', () => {
        lastOnlineStatus = true;
        handleStatusChange(true);
    }, false);
    
    document.addEventListener('offline', () => {
        lastOnlineStatus = false;
        handleStatusChange(false);
    }, false);
    
    // Polling fallback - check every 1 second
    // This helps catch cases where events don't fire immediately
    setInterval(() => {
        checkOnlineStatus();
    }, 1000);
    
    console.log('📡 Detecção de conexão ativada. Status inicial:', navigator.onLine ? 'ONLINE' : 'OFFLINE');
}

function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // Verificar se os elementos existem antes de adicionar listeners
    const safeAddListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
            return true;
        } else {
            console.warn(`⚠️ Elemento não encontrado: ${id}`);
            return false;
        }
    };
    
    // Header buttons
    safeAddListener('theme-btn', 'click', () => openModal('theme-modal'));
    safeAddListener('settings-btn', 'click', () => openModal('settings-modal'));
    safeAddListener('format-btn', 'click', formatCurrentFile);
    safeAddListener('save-btn', 'click', saveProject);
    safeAddListener('export-btn', 'click', () => openModal('export-modal'));
    
    // New file
    safeAddListener('new-file-btn', 'click', () => {
        App.selectedFolderId = null; // Reset folder selection
        openModal('new-file-modal');
    });
    safeAddListener('create-file-btn', 'click', createNewFile);
    
    // New folder
    safeAddListener('new-folder-btn', 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        createNewFolder();
    });
    
    // Project name
    safeAddListener('project-name-input', 'change', (e) => {
        if (e && e.target) {
            App.projectName = e.target.value;
            if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
        }
    });
    
    // Keyboard shortcuts
    try {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S - Save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (typeof saveProject === 'function') saveProject();
            }
            
            // Shift+Alt+F - Format
            if (e.shiftKey && e.altKey && e.key === 'F') {
                e.preventDefault();
                if (typeof formatCurrentFile === 'function') formatCurrentFile();
            }
            
            // Ctrl+N - New file
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                if (typeof openModal === 'function') openModal('new-file-modal');
            }
        });
    } catch (error) {
        console.error('❌ Erro ao configurar keyboard shortcuts:', error);
    }
    
    // Sidebar tabs
    try {
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const panelId = tab.dataset.tab;
                
                document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
                
                tab.classList.add('active');
                const panel = document.getElementById(`${panelId}-panel`);
                if (panel) {
                    panel.classList.add('active');
                }
            });
        });
    } catch (error) {
        console.error('❌ Erro ao configurar sidebar tabs:', error);
    }
    
    console.log('✅ Event listeners configurados');
}

// ================================
// UTILITY FUNCTIONS
// ================================

function generateId() {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance optimization
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function getFileById(id) {
    return App.files.find(f => f.id === id);
}

function getLanguageFromExtension(ext) {
    const map = {
        'html': 'html',
        'css': 'css',
        'js': 'javascript',
        'json': 'json',
        'md': 'markdown',
        'txt': 'plaintext',
        'xml': 'xml',
        'yaml': 'yaml',
        'yml': 'yaml',
        'ts': 'typescript',
        'py': 'python',
        'php': 'php',
        'sql': 'sql'
    };
    return map[ext] || 'plaintext';
}

function getIconForExtension(ext) {
    const icons = {
        'html': 'fab fa-html5',
        'css': 'fab fa-css3-alt',
        'js': 'fab fa-js',
        'json': 'fas fa-code',
        'md': 'fab fa-markdown',
        'txt': 'fas fa-file-alt',
        'xml': 'fas fa-file-code',
        'yaml': 'fas fa-file-code',
        'yml': 'fas fa-file-code',
        'ts': 'fab fa-js-square',
        'py': 'fab fa-python',
        'php': 'fab fa-php',
        'sql': 'fas fa-database'
    };
    return icons[ext] || 'fas fa-file';
}

function getTemplateForExtension(ext) {
    const templates = {
        'html': '<!DOCTYPE html>\n<html>\n<head>\n  <title>New Page</title>\n</head>\n<body>\n  \n</body>\n</html>',
        'css': '/* Novo arquivo CSS */\n\n',
        'js': '// Novo arquivo JavaScript\n\n',
        'json': '{\n  \n}',
        'md': '# Novo Documento\n\nBem-vindo ao editor Markdown!\n\n## Recursos\n\n- **Negrito** e *itálico*\n- Listas\n- Código com syntax highlighting\n- Links\n- Tabelas\n- Checkboxes\n- Blockquotes\n\n### Exemplo de Código\n\n```javascript\nconsole.log("Hello World");\n\nfunction exemplo() {\n    return "Código formatado!";\n}\n```\n\n### Exemplo de Tabela\n\n| Coluna 1 | Coluna 2 | Coluna 3 |\n|----------|----------|----------|\n| Dados    | Dados    | Dados    |\n| Mais     | Mais     | Mais     |\n\n### Exemplo de Checklist\n\n- [x] Tarefa concluída\n- [ ] Tarefa pendente\n- [ ] Outra tarefa\n\n### Exemplo de Blockquote\n\n> Esta é uma citação importante!\n> Pode ter múltiplas linhas.\n\n### Links e Imagens\n\n[Link para exemplo](https://example.com)\n\n---\n\n**Divirta-se escrevendo!** 🚀',
        'txt': 'Novo arquivo de texto\n\n',
        'xml': '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>',
        'yaml': '# Novo arquivo YAML\n\n',
        'yml': '# Novo arquivo YAML\n\n',
        'ts': '// Novo arquivo TypeScript\n\n',
        'py': '# Novo arquivo Python\n\n',
        'php': '<?php\n// Novo arquivo PHP\n\n?>',
        'sql': '-- Novo arquivo SQL\n\n'
    };
    return templates[ext] || '';
}

function showNotification(type, title, message, duration = 5000) {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };
    
    notification.innerHTML = `
        <i class="fas ${icons[type]} notification-icon"></i>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-xmark"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}

function addToHistory(action) {
    App.history.unshift({
        action: action,
        timestamp: new Date().toISOString(),
        files: JSON.parse(JSON.stringify(App.files))
    });
    
    // Keep only last 10 items
    if (App.history.length > 10) {
        App.history = App.history.slice(0, 10);
    }
    
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('history-list');
    
    if (App.history.length === 0) {
        container.innerHTML = '<div class="history-empty"><i class="fas fa-clock"></i><p>Nenhum histórico ainda</p></div>';
        return;
    }
    
    container.innerHTML = '';
    
    App.history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const time = new Date(item.timestamp).toLocaleString('pt-BR');
        
        div.innerHTML = `
            <div>${item.action}</div>
            <div class="history-item-time">${time}</div>
        `;
        
        div.addEventListener('click', () => {
            if (confirm('Restaurar este estado do projeto?')) {
                App.files = JSON.parse(JSON.stringify(item.files));
                renderFileTree();
                if (App.files.length > 0) {
                    openFile(App.files[0].id);
                }
                showNotification('success', 'Restaurado', 'Projeto restaurado do histórico');
            }
        });
        
        container.appendChild(div);
    });
}

// ================================
// CONSOLE SETUP
// ================================

// Intercept console.log in preview
window.addEventListener('message', (e) => {
    if (e.data.type === 'console') {
        addConsoleMessage(e.data.method, e.data.args);
    }
});

function addConsoleMessage(method, args) {
    const output = document.getElementById('console-output');
    const badge = document.getElementById('console-badge');
    
    const message = document.createElement('div');
    message.className = `console-message console-${method}`;
    message.textContent = args.join(' ');
    
    output.appendChild(message);
    output.scrollTop = output.scrollHeight;
    
    const count = output.children.length;
    badge.textContent = count;
}

console.log('✨ Lehunteerz CodeSpace loaded successfully!');
