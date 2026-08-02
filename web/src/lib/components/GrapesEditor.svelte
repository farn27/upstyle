<script>
    import { onMount, onDestroy } from 'svelte';
    import grapesjs from 'grapesjs';
    import 'grapesjs/dist/css/grapes.min.css';
    
    export let content = {};
    export let products = [];
    export let onSave = null;
    
    let editor = null;
    let container;
    let isInitialized = false;
    
    onMount(() => {
        if (!container || isInitialized) return;
        isInitialized = true;
        
        // Initialize GrapesJS with custom styling
        editor = grapesjs.init({
            container: container,
            height: '100%',
            width: 'auto',
            fromElement: false,
            storageManager: false,
            panels: { defaults: [] },
            blockManager: {
                appendTo: '#blocks',
            },
            styleManager: {
                appendTo: '#styles',
                sectors: [
                    {
                        name: 'Layout',
                        open: false,
                        buildProps: ['display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap', 'grid-template-columns', 'grid-template-rows']
                    },
                    {
                        name: 'Typography',
                        open: false,
                        buildProps: ['font-family', 'font-size', 'font-weight', 'color', 'line-height', 'text-align', 'text-decoration']
                    },
                    {
                        name: 'Spacing',
                        open: false,
                        buildProps: ['margin', 'padding']
                    },
                    {
                        name: 'Borders',
                        open: false,
                        buildProps: ['border', 'border-radius', 'box-shadow']
                    },
                    {
                        name: 'Background',
                        open: false,
                        buildProps: ['background-color', 'background-image', 'background-size', 'background-position']
                    },
                    {
                        name: 'Size',
                        open: false,
                        buildProps: ['width', 'height', 'max-width', 'min-height']
                    }
                ]
            },
            traitManager: {
                appendTo: '#traits'
            },
            layerManager: {
                appendTo: '#layers'
            }
        });
        
        // Add custom blocks after initialization
        const blockManager = editor.BlockManager;
        
        blockManager.add('section-hero', {
            label: 'Hero Section',
            content: `<section style="padding: 80px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 20px;">Your Headline Here</h1>
                <p style="font-size: 18px; margin-bottom: 30px;">Your subheadline goes here</p>
                <button style="padding: 15px 40px; background: white; color: #667eea; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Call to Action</button>
            </section>`
        });
        
        blockManager.add('section-features', {
            label: 'Features Grid',
            content: `<section style="padding: 60px 20px; background: #f8f9fa;">
                <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px;">
                    <div style="padding: 30px; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="font-size: 40px; margin-bottom: 15px;">🎯</div>
                        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Feature 1</h3>
                        <p style="color: #666;">Description of your first feature</p>
                    </div>
                    <div style="padding: 30px; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="font-size: 40px; margin-bottom: 15px;">⚡</div>
                        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Feature 2</h3>
                        <p style="color: #666;">Description of your second feature</p>
                    </div>
                    <div style="padding: 30px; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="font-size: 40px; margin-bottom: 15px;">🚀</div>
                        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Feature 3</h3>
                        <p style="color: #666;">Description of your third feature</p>
                    </div>
                </div>
            </section>`
        });
        
        blockManager.add('section-cta', {
            label: 'Call to Action',
            content: `<section style="padding: 80px 20px; text-align: center; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white;">
                <h2 style="font-size: 42px; font-weight: bold; margin-bottom: 20px;">Ready to Get Started?</h2>
                <p style="font-size: 18px; margin-bottom: 30px; opacity: 0.9;">Join thousands of satisfied customers today</p>
                <button style="padding: 18px 50px; background: white; color: #11998e; border: none; border-radius: 8px; font-weight: bold; font-size: 18px; cursor: pointer;">Get Started Now</button>
            </section>`
        });
        
        blockManager.add('section-contact', {
            label: 'Contact Form',
            content: `<section style="padding: 60px 20px; background: #f8f9fa;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 30px;">Contact Us</h2>
                    <div style="display: grid; gap: 20px;">
                        <input type="text" placeholder="Your Name" style="width: 100%; padding: 15px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px;" />
                        <input type="email" placeholder="Your Email" style="width: 100%; padding: 15px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px;" />
                        <textarea placeholder="Your Message" rows="4" style="width: 100%; padding: 15px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; resize: vertical;"></textarea>
                        <button style="width: 100%; padding: 15px; background: #667eea; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer;">Send Message</button>
                    </div>
                </div>
            </section>`
        });
        
        blockManager.add('section-about', {
            label: 'About Section',
            content: `<section style="padding: 80px 20px; background: white;">
                <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;">
                    <div>
                        <h2 style="font-size: 36px; font-weight: bold; margin-bottom: 20px;">About Our Company</h2>
                        <p style="font-size: 16px; color: #666; line-height: 1.8; margin-bottom: 20px;">We are passionate about creating amazing products that make a difference. Our team of experts works tirelessly to deliver excellence in everything we do.</p>
                        <p style="font-size: 16px; color: #666; line-height: 1.8;">With years of experience and a commitment to innovation, we continue to push boundaries and set new standards in our industry.</p>
                    </div>
                    <div style="height: 400px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">Company Image</div>
                </div>
            </section>`
        });
        
        // Apply custom CSS to override GrapesJS default styles
        const editorCss = editor.Css;
        editorCss.setRules(`
            .gjs-cv-canvas {
                background-color: #f1f5f9 !important;
            }
            .gjs-block {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                background: white;
                color: #1e293b;
                padding: 12px;
                margin-bottom: 8px;
                cursor: move;
                transition: all 0.2s;
            }
            .gjs-block:hover {
                border-color: #6366f1;
                box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
            }
            .gjs-block-label {
                font-weight: 600;
                font-size: 13px;
            }
            .gjs-sm-sector .gjs-sm-title {
                background: #f8fafc;
                color: #475569;
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .gjs-sm-sector .gjs-sm-field input,
            .gjs-sm-sector .gjs-sm-field select {
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 12px;
            }
            .gjs-layer {
                padding: 8px 12px;
                border-bottom: 1px solid #f1f5f9;
                color: #334155;
                font-size: 13px;
            }
            .gjs-layer:hover {
                background: #f8fafc;
            }
            .gjs-trait {
                padding: 8px 0;
                border-bottom: 1px solid #f1f5f9;
            }
            .gjs-trait-label {
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #64748b;
            }
            .gjs-trait-input {
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 12px;
            }
        `);
        
        // Load existing content if available
        if (content && content.sections) {
            const html = content.sections.map(section => {
                const sectionData = section.data;
                switch(section.type) {
                    case 'hero':
                        return `<section style="padding: 80px 20px; text-align: center; background: ${sectionData.bgColor || '#667eea'}; color: ${sectionData.textColor || 'white'};">
                            <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 20px;">${sectionData.headline}</h1>
                            <p style="font-size: 18px; margin-bottom: 30px;">${sectionData.subheadline}</p>
                            <button style="padding: 15px 40px; background: ${sectionData.ctaColor || 'white'}; color: ${sectionData.bgColor || '#667eea'}; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">${sectionData.ctaText}</button>
                        </section>`;
                    case 'products':
                        return `<section style="padding: 60px 20px; background: white;">
                            <h2 style="text-align: center; font-size: 36px; font-weight: bold; margin-bottom: 40px;">${sectionData.title}</h2>
                            <p style="text-align: center; color: #666; margin-bottom: 30px;">${sectionData.subtitle}</p>
                            <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(${sectionData.columns || 4}, 1fr); gap: 20px;">
                                ${products.slice(0, 8).map(p => `
                                    <div style="border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                                        <div style="height: 200px; background: #f5f5f5; display: flex; align-items: center; justify-content: center;">
                                            ${p.foto ? `<img src="${p.foto}" style="max-width: 100%; max-height: 100%; object-fit: cover;" />` : '<span style="font-size: 40px;">📦</span>'}
                                        </div>
                                        <div style="padding: 15px;">
                                            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">${p.nama}</h3>
                                            <p style="color: #667eea; font-weight: bold; font-size: 18px;">Rp ${Number(p.hargaJual).toLocaleString('id-ID')}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </section>`;
                    default:
                        return '';
                }
            }).join('');
            
            if (html) {
                editor.setComponents(html);
            }
        }
        
        // Custom commands
        editor.Commands.add('save-design', {
            run: (editor, sender) => {
                const html = editor.getHtml();
                const css = editor.getCss();
                if (onSave) {
                    onSave({ html, css });
                }
            }
        });
    });
    
    onDestroy(() => {
        if (editor) {
            editor.destroy();
            isInitialized = false;
        }
    });
    
    function handleSave() {
        if (editor) {
            editor.runCommand('save-design');
        }
    }
    
    function handleClear() {
        if (editor) {
            editor.DomComponents.clear();
        }
    }
</script>

<div class="flex h-screen bg-white">
    <!-- Sidebar - Blocks -->
    <div class="w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Blocks</h3>
        <div id="blocks"></div>
    </div>
    
    <!-- Main Editor Area -->
    <div class="flex-1 flex flex-col">
        <!-- Toolbar -->
        <div class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
            <div class="flex items-center gap-2">
                <button on:click={handleSave} class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase transition shadow-sm">
                    Save
                </button>
                <button on:click={handleClear} class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-black uppercase transition">
                    Clear
                </button>
            </div>
            <div class="flex items-center gap-2">
                <button class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-black uppercase transition">
                    Undo
                </button>
                <button class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-black uppercase transition">
                    Redo
                </button>
            </div>
        </div>
        
        <!-- Editor Canvas -->
        <div class="flex-1 flex overflow-hidden">
            <!-- Left Panel - Layers -->
            <div class="w-60 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto">
                <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Layers</h3>
                <div id="layers"></div>
            </div>
            
            <!-- Canvas -->
            <div class="flex-1 bg-slate-100 overflow-auto">
                <div bind:this={container} class="min-h-full"></div>
            </div>
            
            <!-- Right Panel - Styles & Traits -->
            <div class="w-80 bg-slate-50 border-l border-slate-200 p-4 overflow-y-auto">
                <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Styles</h3>
                <div id="styles" class="mb-6"></div>
                
                <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Traits</h3>
                <div id="traits"></div>
            </div>
        </div>
    </div>
</div>
