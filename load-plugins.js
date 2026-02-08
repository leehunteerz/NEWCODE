/**
 * Carregamento Otimizado de Plugins Prettier
 * Este arquivo separado carrega os plugins do Prettier de forma assíncrona
 * para melhorar o desempenho e evitar conflitos com o Monaco Editor
 */

(function() {
    'use strict';
    
    // Verificar se já foi carregado
    if (window.prettierPluginsLoaded) {
        return;
    }
    
    window.prettierPluginsLoaded = true;
    
    /**
     * Carrega plugins do Prettier em um iframe isolado
     * para evitar conflitos com o loader do Monaco Editor
     */
    function loadPrettierPlugins() {
        // Criar iframe isolado para carregar plugins sem conflito com Monaco loader
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.width = '0';
        iframe.style.height = '0';
        document.body.appendChild(iframe);
        
        // Aguardar iframe estar pronto
        iframe.onload = function() {
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
                const script = iframeDoc.createElement('script');
                script.src = `https://unpkg.com/prettier@3.1.1/plugins/${plugin}.js`;
                script.crossOrigin = 'anonymous';
                
                script.onload = function() {
                    loadedCount++;
                    const pluginVarName = 'prettierPlugins' + plugin.charAt(0).toUpperCase() + plugin.slice(1);
                    
                    // Acessar plugin do objeto prettierPlugins
                    const prettierPluginsObj = iframeWindow.prettierPlugins;
                    let pluginObj = null;
                    
                    if (prettierPluginsObj && typeof prettierPluginsObj === 'object' && prettierPluginsObj[plugin]) {
                        pluginObj = prettierPluginsObj[plugin];
                    }
                    
                    // Copiar plugin para window principal
                    if (pluginObj) {
                        window[pluginVarName] = pluginObj;
                        loadedPlugins[plugin] = pluginObj;
                        console.log(`✅ Plugin Prettier carregado: ${plugin}`);
                    }
                    
                    // Quando todos os plugins forem carregados
                    if (loadedCount === plugins.length) {
                        setTimeout(() => {
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
                    console.warn(`⚠️ Não foi possível carregar plugin Prettier: ${plugin}`);
                };
                
                iframeDoc.head.appendChild(script);
            });
        };
        
        // Carregar página vazia no iframe
        iframe.src = 'about:blank';
    }
    
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPrettierPlugins);
    } else {
        // DOM já está pronto
        loadPrettierPlugins();
    }
})();
