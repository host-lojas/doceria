// ==================== ALL ORIGINAL JS KEPT INTACT ====================
        let supabaseClient = null;
        let currentCatalogs = [];
        let currentProducts = [];
        let editingCatalogId = null;
        let editingProductId = null;

        function initSupabase() {
            const statusEl = document.getElementById('supabase-status');

            if (!SUPABASE_URL || SUPABASE_URL.includes('SEU-PROJETO') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.length < 30) {
                statusEl.innerHTML = `Modo Demo`;
                statusEl.className = 'px-3 py-1 text-xs flex items-center gap-x-2 text-amber-400 font-medium';
                return false;
            }

            try {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                statusEl.innerHTML = `Conectado`;
                statusEl.className = 'px-3 py-1 text-xs flex items-center gap-x-2 text-emerald-400 font-medium';
                return true;
            } catch (e) {
                console.error(e);
                statusEl.innerHTML = `Erro`;
                statusEl.className = 'px-3 py-1 text-xs flex items-center gap-x-2 text-red-400 font-medium';
                return false;
            }
        }

        function loginAdmin() {
            const pass = document.getElementById('admin-password').value;
            const correctPass = 'docere2026';

            if (pass === correctPass) {
                document.getElementById('login-gate').classList.add('hidden');
                document.getElementById('admin-panel').classList.remove('hidden');

                const connected = initSupabase();
                if (connected) {
                    loadAllData();
                } else {
                    showSupabaseWarning();
                }
            } else {
                alert('Senha incorreta!');
            }
        }

        function showSupabaseWarning() {
            const panel = document.getElementById('admin-panel');
            const oldWarning = document.getElementById('supabase-warning');
            if (oldWarning) oldWarning.remove();

            const warning = document.createElement('div');
            warning.id = 'supabase-warning';
            warning.className = 'mt-6 bg-red-900/30 border border-red-600/50 text-red-200 p-6 rounded-3xl';
            warning.innerHTML = `
                <div class="flex items-start gap-x-4">
                    <i class="fa-solid fa-exclamation-triangle text-3xl text-red-400 mt-1"></i>
                    <div class="flex-1">
                        <h3 class="font-bold text-lg">Supabase não está configurado</h3>
                        <p class="mt-2 text-sm">Abra o arquivo <strong>config.js</strong> e substitua as variáveis <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code> com os dados do seu projeto no Supabase.</p>
                        <p class="mt-3 text-xs text-red-300">Depois de configurar, recarregue a página e faça login novamente.</p>
                    </div>
                </div>
            `;
            panel.appendChild(warning);

            const actionButtons = panel.querySelectorAll('button');
            actionButtons.forEach(btn => {
                if (!btn.onclick?.toString().includes('logoutAdmin')) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                }
            });
        }

        function logoutAdmin() {
            document.getElementById('admin-panel').classList.add('hidden');
            document.getElementById('login-gate').classList.remove('hidden');
            document.getElementById('admin-password').value = 'docere2026';
        }

        function switchTab(tabIndex) {
            document.getElementById('tab-content-0').classList.add('hidden');
            document.getElementById('tab-content-1').classList.add('hidden');

            document.getElementById('tab-0').classList.remove('active', 'border-red-500', 'text-red-400');
            document.getElementById('tab-1').classList.remove('active', 'border-red-500', 'text-red-400');
            document.getElementById('tab-0').classList.add('text-zinc-400');
            document.getElementById('tab-1').classList.add('text-zinc-400');

            if (tabIndex === 0) {
                document.getElementById('tab-content-0').classList.remove('hidden');
                document.getElementById('tab-0').classList.add('active', 'border-red-500', 'text-red-400');
                document.getElementById('tab-0').classList.remove('text-zinc-400');
            } else {
                document.getElementById('tab-content-1').classList.remove('hidden');
                document.getElementById('tab-1').classList.add('active', 'border-red-500', 'text-red-400');
                document.getElementById('tab-1').classList.remove('text-zinc-400');
                renderProductsTable();
            }
        }

        async function loadAllData() {
            if (!supabaseClient) return;

            try {
                const { data: catalogs } = await supabaseClient.from('catalogs').select('*').order('name');
                currentCatalogs = catalogs || [];

                const { data: products } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
                currentProducts = products || [];

                renderCatalogsList();
                renderProductsTable();
                updateCounts();
            } catch (err) {
                console.error(err);
                alert('Erro ao carregar dados do Supabase. Verifique as permissões (RLS) das tabelas.');
            }
        }

        function updateCounts() {
            const catCount = document.getElementById('catalog-count');
            const prodCount = document.getElementById('product-count');

            if (catCount) catCount.textContent = currentCatalogs.length;
            if (prodCount) prodCount.textContent = currentProducts.length;
        }

        function renderCatalogsList() {
            const container = document.getElementById('catalogs-list');
            container.innerHTML = '';

            if (currentCatalogs.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center">
                        <i class="fa-solid fa-folder-open text-4xl text-zinc-600 mb-3"></i>
                        <p class="text-zinc-400">Nenhum catálogo criado ainda.</p>
                        <button onclick="showCreateCatalogModal()" class="mt-4 text-sm px-5 py-2 bg-white/5 hover:bg-white/10 rounded-2xl">Criar primeiro catálogo</button>
                    </div>`;
                return;
            }

            currentCatalogs.forEach(cat => {
                const productCount = currentProducts.filter(p => p.catalog_id === cat.id).length;

                const card = document.createElement('div');
                card.className = 'admin-card bg-zinc-900 rounded-3xl p-5 flex flex-col';
                card.innerHTML = `
                    <div class="flex-1">
                        <div class="flex items-start justify-between">
                            <div>
                                <div class="font-semibold text-xl tracking-tight">${cat.name}</div>
                                <div class="flex items-center gap-x-2 mt-1">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-zinc-400">
                                        ${productCount} produto${productCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-2 mt-6 pt-4 border-t border-white/10">
                        <button onclick="editCatalog('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')" 
                                class="flex-1 text-xs py-2.5 border border-white/20 hover:bg-white/5 active:bg-white/10 rounded-2xl transition font-medium">Editar</button>
                        <button onclick="deleteCatalog('${cat.id}')" 
                                class="flex-1 text-xs py-2.5 border border-red-900/60 hover:bg-red-950/70 active:bg-red-950 text-red-400 rounded-2xl transition font-medium">Excluir</button>
                    </div>
                `;
                container.appendChild(card);
            });

            updateCounts();
        }

        function renderProductsTable() {
            const tbody = document.getElementById('products-table-body');
            tbody.innerHTML = '';

            if (currentProducts.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="px-6 py-12 text-center">
                            <div class="flex flex-col items-center justify-center text-zinc-400">
                                <i class="fa-solid fa-box-open text-3xl mb-3 text-zinc-600"></i>
                                <p>Nenhum produto cadastrado.</p>
                            </div>
                        </td>
                    </tr>`;
                return;
            }

            currentProducts.forEach(product => {
                const cat = currentCatalogs.find(c => c.id === product.catalog_id);
                const catName = cat ? cat.name : 'Sem catálogo';
                const hasDiscount = product.discount_price && product.discount_price < product.price;

                const row = document.createElement('tr');
                row.className = 'product-row';
                row.innerHTML = `
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-x-4">
                            <img src="${product.image_url || 'https://picsum.photos/id/106/48/48'}" 
                                 class="w-11 h-11 rounded-2xl object-cover border border-white/10 flex-shrink-0" 
                                 onerror="this.src='https://picsum.photos/id/106/48/48'">
                            <div class="min-w-0">
                                <div class="font-semibold text-[15px] tracking-tight">${product.name}</div>
                                <div class="text-xs text-zinc-500 line-clamp-1 mt-0.5 max-w-[260px]">${product.description || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-block text-xs px-3 py-1 bg-white/5 rounded-full text-zinc-300">${catName}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        ${hasDiscount ? `
                            <div>
                                <span class="line-through text-xs text-zinc-500">${parseFloat(product.price).toFixed(2)}</span>
                                <div class="font-semibold text-emerald-400 text-[15px]">${parseFloat(product.discount_price).toFixed(2)}</div>
                            </div>
                        ` : `
                            <span class="font-semibold text-[15px]">${parseFloat(product.price).toFixed(2)}</span>
                        `}
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex justify-center gap-x-1">
                            <button onclick="editProduct('${product.id}')" class="p-2.5 hover:bg-white/10 active:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition touch-target">
                                <i class="fa-solid fa-edit text-base"></i>
                            </button>
                            <button onclick="deleteProduct('${product.id}')" class="p-2.5 hover:bg-red-950/70 active:bg-red-950 text-red-400 rounded-xl transition touch-target">
                                <i class="fa-solid fa-trash text-base"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });

            updateCounts();
        }

        function showCreateCatalogModal() {
            editingCatalogId = null;
            document.getElementById('catalog-modal-title').textContent = 'Novo Catálogo';
            document.getElementById('catalog-name').value = '';
            document.getElementById('catalog-modal').classList.remove('hidden');
            document.getElementById('catalog-modal').classList.add('flex');
        }

        function editCatalog(id, currentName) {
            editingCatalogId = id;
            document.getElementById('catalog-modal-title').textContent = 'Editar Catálogo';
            document.getElementById('catalog-name').value = currentName;
            document.getElementById('catalog-modal').classList.remove('hidden');
            document.getElementById('catalog-modal').classList.add('flex');
        }

        function closeCatalogModal() {
            document.getElementById('catalog-modal').classList.remove('flex');
            document.getElementById('catalog-modal').classList.add('hidden');
        }

        async function saveCatalog() {
            const name = document.getElementById('catalog-name').value.trim();
            if (!name) return alert('Nome do catálogo é obrigatório.');

            if (!supabaseClient) {
                if (editingCatalogId) {
                    const idx = currentCatalogs.findIndex(c => c.id === editingCatalogId);
                    if (idx !== -1) currentCatalogs[idx].name = name;
                } else {
                    currentCatalogs.push({ id: 'cat_' + Date.now(), name });
                }
                renderCatalogsList();
                closeCatalogModal();
                return;
            }

            try {
                if (editingCatalogId) {
                    await supabaseClient.from('catalogs').update({ name }).eq('id', editingCatalogId);
                } else {
                    await supabaseClient.from('catalogs').insert({ name });
                }
                closeCatalogModal();
                await loadAllData();
            } catch (err) {
                alert('Erro ao salvar: ' + err.message);
            }
        }

        async function deleteCatalog(id) {
            if (!confirm('Excluir este catálogo? Os produtos dentro dele também serão removidos.')) return;

            if (!supabaseClient) {
                currentCatalogs = currentCatalogs.filter(c => c.id !== id);
                currentProducts = currentProducts.filter(p => p.catalog_id !== id);
                renderCatalogsList();
                renderProductsTable();
                return;
            }

            try {
                await supabaseClient.from('products').delete().eq('catalog_id', id);
                await supabaseClient.from('catalogs').delete().eq('id', id);
                await loadAllData();
            } catch (err) {
                alert('Erro ao excluir: ' + err.message);
            }
        }

        function showCreateProductModal() {
            editingProductId = null;
            document.getElementById('product-modal-title').textContent = 'Novo Produto';
            document.getElementById('product-name').value = '';
            document.getElementById('product-description').value = '';
            document.getElementById('product-price').value = '10.00';
            document.getElementById('product-discount').value = '';
            document.getElementById('product-image').value = '';
            document.getElementById('image-preview').classList.add('hidden');

            populateCatalogSelect();
            document.getElementById('product-modal').classList.remove('hidden');
            document.getElementById('product-modal').classList.add('flex');
        }

        function populateCatalogSelect(selectedId = null) {
            const select = document.getElementById('product-catalog');
            select.innerHTML = '';

            currentCatalogs.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                if (selectedId === cat.id) opt.selected = true;
                select.appendChild(opt);
            });
        }

        function previewProductImage() {
            const url = document.getElementById('product-image').value.trim();
            const previewBox = document.getElementById('image-preview');
            const img = document.getElementById('preview-img');

            if (url) {
                img.src = url;
                previewBox.classList.remove('hidden');
            } else {
                previewBox.classList.add('hidden');
            }
        }

        let selectedImageFile = null;

        function handleImageFileSelect() {
            const fileInput = document.getElementById('product-image-file');
            const status = document.getElementById('upload-status');

            if (fileInput.files.length === 0) return;
            selectedImageFile = fileInput.files[0];

            const previewBox = document.getElementById('image-preview');
            const img = document.getElementById('preview-img');
            const reader = new FileReader();
            reader.onload = function (e) {
                img.src = e.target.result;
                previewBox.classList.remove('hidden');
            };
            reader.readAsDataURL(selectedImageFile);

            status.textContent = 'Arquivo selecionado. Salve o produto para enviar.';
            status.className = 'text-xs text-emerald-400 mt-1.5 px-1';
            status.style.display = 'block';
        }

        async function uploadImageToSupabase(file) {
            if (!supabaseClient || !file) return null;

            const status = document.getElementById('upload-status');
            status.textContent = 'Enviando imagem...';
            status.style.color = '#4ade80';

            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `product-${Date.now()}.${fileExt}`;
                const filePath = `products/${fileName}`;

                const { data, error } = await supabaseClient.storage
                    .from('product-images')
                    .upload(filePath, file, { cacheControl: '3600', upsert: false });

                if (error) throw error;

                const { data: urlData } = supabaseClient.storage
                    .from('product-images')
                    .getPublicUrl(filePath);

                status.textContent = 'Imagem enviada com sucesso!';
                return urlData.publicUrl;
            } catch (err) {
                status.textContent = 'Erro ao enviar: ' + err.message;
                status.style.color = '#f87171';
                return null;
            }
        }

        async function exportBackup() {
            if (!supabaseClient) {
                alert("Supabase não configurado.");
                return;
            }

            try {
                const { data: catalogs } = await supabaseClient.from('catalogs').select('*');
                const { data: products } = await supabaseClient.from('products').select('*');

                const backup = {
                    exported_at: new Date().toISOString(),
                    catalogs: catalogs || [],
                    products: products || []
                };

                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `docere-backup-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showToastMessage('Backup exportado com sucesso!');
            } catch (err) {
                alert('Erro ao exportar: ' + err.message);
            }
        }

        async function importBackup(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!confirm('Isso vai ADICIONAR os dados do backup ao Supabase. Continuar?')) {
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    const backup = JSON.parse(e.target.result);
                    if (!backup.catalogs || !backup.products) throw new Error('Arquivo de backup inválido');

                    for (const cat of backup.catalogs) {
                        const { id, ...catData } = cat;
                        await supabaseClient.from('catalogs').insert(catData);
                    }
                    for (const prod of backup.products) {
                        const { id, ...prodData } = prod;
                        await supabaseClient.from('products').insert(prodData);
                    }

                    alert('Backup importado com sucesso! Recarregando...');
                    await loadAllData();
                } catch (err) {
                    alert('Erro ao importar backup: ' + err.message);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        async function deleteAllData() {
            if (!supabaseClient) {
                alert("Supabase não configurado.");
                return;
            }

            if (!confirm('⚠️ ATENÇÃO: Isso vai APAGAR TODOS os catálogos e produtos permanentemente!')) return;
            if (!confirm('CONFIRMAÇÃO FINAL: Deseja continuar?')) return;

            try {
                await supabaseClient.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                await supabaseClient.from('catalogs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                alert('Todos os dados foram apagados.');
                await loadAllData();
            } catch (err) {
                alert('Erro ao apagar dados: ' + err.message);
            }
        }

        function showToastMessage(msg) {
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl text-sm flex items-center gap-x-2 z-[300]';
            toast.innerHTML = `<i class="fa-solid fa-check mr-2"></i> ${msg}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2600);
        }

        function editProduct(id) {
            const product = currentProducts.find(p => p.id === id);
            if (!product) return;

            editingProductId = id;
            document.getElementById('product-modal-title').textContent = 'Editar Produto';

            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-price').value = product.price || 0;
            document.getElementById('product-discount').value = product.discount_price || '';
            document.getElementById('product-image').value = product.image_url || '';

            populateCatalogSelect(product.catalog_id);

            const previewBox = document.getElementById('image-preview');
            const img = document.getElementById('preview-img');
            if (product.image_url) {
                img.src = product.image_url;
                previewBox.classList.remove('hidden');
            } else {
                previewBox.classList.add('hidden');
            }

            document.getElementById('product-modal').classList.remove('hidden');
            document.getElementById('product-modal').classList.add('flex');
        }

        function closeProductModal() {
            document.getElementById('product-modal').classList.remove('flex');
            document.getElementById('product-modal').classList.add('hidden');
        }

        async function saveProduct() {
            const name = document.getElementById('product-name').value.trim();
            const catalogId = document.getElementById('product-catalog').value;
            const description = document.getElementById('product-description').value.trim();
            const price = parseFloat(document.getElementById('product-price').value);
            const discount = parseFloat(document.getElementById('product-discount').value) || null;
            let imageUrl = document.getElementById('product-image').value.trim() || null;

            if (!name || !catalogId || !price) {
                alert('Nome, catálogo e preço são obrigatórios.');
                return;
            }

            const fileInput = document.getElementById('product-image-file');
            if (fileInput && fileInput.files.length > 0 && supabaseClient) {
                const uploadedUrl = await uploadImageToSupabase(fileInput.files[0]);
                if (uploadedUrl) imageUrl = uploadedUrl;
            }

            const productData = {
                name, catalog_id: catalogId, description, price,
                discount_price: discount, image_url: imageUrl, active: true
            };

            if (!supabaseClient) {
                alert("Supabase não está configurado.");
                return;
            }

            try {
                if (editingProductId) {
                    await supabaseClient.from('products').update(productData).eq('id', editingProductId);
                } else {
                    await supabaseClient.from('products').insert(productData);
                }

                if (fileInput) fileInput.value = '';
                selectedImageFile = null;

                closeProductModal();
                await loadAllData();
            } catch (err) {
                alert('Erro ao salvar produto: ' + err.message);
            }
        }

        async function deleteProduct(id) {
            if (!confirm('Excluir este produto permanentemente?')) return;

            if (!supabaseClient) {
                currentProducts = currentProducts.filter(p => p.id !== id);
                renderProductsTable();
                renderCatalogsList();
                return;
            }

            try {
                await supabaseClient.from('products').delete().eq('id', id);
                await loadAllData();
            } catch (err) {
                alert('Erro ao excluir: ' + err.message);
            }
        }

        window.onload = function () {
            // Auto-login for development (comment in production)
            // document.getElementById('login-gate').classList.add('hidden');
            // document.getElementById('admin-panel').classList.remove('hidden');
            // initSupabase();
        }

        console.log('%c[Admin v2] Painel Doceria Docerê melhorado carregado.', 'color:#64748b');