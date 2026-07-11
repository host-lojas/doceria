// ==================== GLOBAL STATE ====================
        let currentCart = [];
        let allProducts = [];
        let allCatalogs = [];
        let currentFilter = 'all';
        let currentSearchTerm = '';
        let currentProductModal = null;
        let currentModalQuantity = 1;
        let selectedPaymentMethod = null;
        let selectedPickupMethod = null;
        let confirmedLocation = null; // { lat, lng }
        let currentMap = null;
        let currentMarker = null;
        let supabaseClient = null;

        // ==================== INIT ====================
        async function init() {
            // Tailwind script config
            document.documentElement.style.setProperty('--primary', STORE_CONFIG.primaryColor || '#DC2626');

            // Load cart from localStorage
            loadCartFromStorage();
            updateCartBadge();

            // Init Supabase if configured
            supabaseClient = getSupabaseClient();

            // Load products & catalogs
            await loadProductsAndCatalogs();

            // Render everything
            renderCategories();
            renderProducts();

            // Search listener
            const searchInput = document.getElementById('search-input');
            searchInput.addEventListener('input', () => {
                currentSearchTerm = searchInput.value.toLowerCase().trim();
                renderProducts();
            });

            // Keyboard escape
            document.addEventListener('keydown', function (e) {
                if (e.key === "Escape") {
                    const modals = document.querySelectorAll('.fixed.inset-0:not(.hidden)');
                    if (modals.length > 0) {
                        modals[modals.length - 1].click();
                    }
                }
            });

            // Update dynamic status badges (hero + modal logic)
            updateHeroStatusBadge();

            console.log('%c[Doceria Docerê] App inicializado com sucesso!', 'color:#16a34a');
        }

        async function loadProductsAndCatalogs() {
            const grid = document.getElementById('products-grid');
            grid.innerHTML = `
                <div class="col-span-full flex justify-center py-12">
                    <div class="flex flex-col items-center">
                        <i class="fa-solid fa-spinner fa-spin text-3xl text-red-400"></i>
                        <p class="mt-3 text-sm text-zinc-500">Carregando cardápio...</p>
                    </div>
                </div>
            `;

            try {
                if (supabaseClient) {
                    // Load from Supabase
                    const { data: catalogsData, error: catError } = await supabaseClient
                        .from('catalogs')
                        .select('*')
                        .order('name');

                    const { data: productsData, error: prodError } = await supabaseClient
                        .from('products')
                        .select('*')
                        .eq('active', true)
                        .order('created_at', { ascending: false });

                    if (catError || prodError) throw new Error('Erro ao carregar do Supabase');

                    allCatalogs = catalogsData || [];
                    allProducts = productsData || [];

                    if (allProducts.length === 0) {
                        // Seed if empty? For now show message in console
                        console.warn('Nenhum produto encontrado no Supabase. Use a área Admin para cadastrar.');
                    }
                } else {
                    // Fallback to initial data
                    console.log('%c[Docerê] Usando dados locais (configure o Supabase para persistência)', 'color:#854d0e');
                    allCatalogs = [...INITIAL_CATALOGS];
                    allProducts = [...INITIAL_PRODUCTS];
                }
            } catch (err) {
                console.error('Erro ao carregar produtos:', err);
                // Fallback
                allCatalogs = [...INITIAL_CATALOGS];
                allProducts = [...INITIAL_PRODUCTS];

                showToast('Usando cardápio de demonstração. Configure o Supabase para usar dados reais.', 4500);
            }
        }

        function renderCategories() {
            const container = document.getElementById('categories-container');
            container.innerHTML = '';

            // All button
            const allBtn = createCategoryPill('Todos', 'all', true);
            container.appendChild(allBtn);

            allCatalogs.forEach(cat => {
                const btn = createCategoryPill(cat.name, cat.id);
                container.appendChild(btn);
            });
        }

        function createCategoryPill(name, id, isActive = false) {
            const btn = document.createElement('button');
            btn.className = `category-pill whitespace-nowrap px-5 py-2 text-sm font-semibold rounded-3xl border transition-all snap-start ${isActive ? 'active bg-red-600 text-white border-red-600' : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'}`;
            btn.innerHTML = name;

            btn.onclick = () => {
                // Deselect all
                document.querySelectorAll('#categories-container button').forEach(b => b.classList.remove('active', 'bg-red-600', 'text-white'));
                btn.classList.add('active', 'bg-red-600', 'text-white', 'border-red-600');

                currentFilter = id;
                renderProducts();
            };

            if (isActive) {
                btn.classList.add('active', 'bg-red-600', 'text-white', 'border-red-600');
            }
            return btn;
        }

        function filterProducts() {
            // Called on search input
            renderProducts();
        }

        function resetFilters() {
            currentFilter = 'all';
            currentSearchTerm = '';
            document.getElementById('search-input').value = '';

            // Reset active pill
            document.querySelectorAll('#categories-container button').forEach((btn, index) => {
                btn.classList.remove('active', 'bg-red-600', 'text-white', 'border-red-600');
                if (index === 0) btn.classList.add('active', 'bg-red-600', 'text-white', 'border-red-600');
            });

            renderProducts();
        }

        function renderProducts(filteredProducts = null) {
            const container = document.getElementById('products-grid');
            const noResults = document.getElementById('no-results');
            const title = document.getElementById('products-section-title');
            const countEl = document.getElementById('products-count');

            container.innerHTML = '';
            noResults.classList.add('hidden');

            let productsToShow = filteredProducts || allProducts;

            // Apply catalog filter
            if (currentFilter !== 'all') {
                productsToShow = productsToShow.filter(p => p.catalog_id === currentFilter);
            }

            // Apply search
            if (currentSearchTerm.length > 1) {
                productsToShow = productsToShow.filter(p =>
                    p.name.toLowerCase().includes(currentSearchTerm) ||
                    (p.description && p.description.toLowerCase().includes(currentSearchTerm))
                );
            }

            if (productsToShow.length === 0) {
                noResults.classList.remove('hidden');
                countEl.textContent = '';
                title.textContent = currentSearchTerm.length > 1 ? 'Nenhum resultado encontrado' : 'Nenhum produto';
                return;
            }

            // Group products by catalog_id for sectioned display
            const grouped = {};
            productsToShow.forEach(p => {
                const catId = p.catalog_id || 'sem-catalogo';
                if (!grouped[catId]) grouped[catId] = [];
                grouped[catId].push(p);
            });

            // Determine catalogs to render (respect currentFilter and order from allCatalogs)
            let catalogsToRender = allCatalogs;
            if (currentFilter !== 'all') {
                catalogsToRender = allCatalogs.filter(c => c.id === currentFilter);
            }

            // Update header title and count info
            if (currentSearchTerm.length > 1) {
                title.textContent = `Resultados para "${currentSearchTerm}"`;
                countEl.textContent = `${productsToShow.length} produtos encontrados`;
            } else if (currentFilter === 'all') {
                title.textContent = 'Nossos Catálogos';
                countEl.textContent = `${productsToShow.length} itens no total • organizados por catálogo`;
            } else {
                const cat = allCatalogs.find(c => c.id === currentFilter);
                title.textContent = cat ? cat.name : 'Produtos do Catálogo';
                countEl.textContent = `${productsToShow.length} itens disponíveis`;
            }

            // Render one vertical section per catalog
            let renderedAny = false;
            catalogsToRender.forEach(cat => {
                const catProducts = grouped[cat.id] || [];
                if (catProducts.length === 0) return;

                renderedAny = true;

                const section = document.createElement('div');
                section.className = 'catalog-section';

                // Beautiful highlighted header with red/pink accent
                section.innerHTML = `
                    <div class="mb-5">
                        <div class="flex items-end justify-between gap-4">
                            <div class="flex-1 min-w-0">
                                <h3 class="text-3xl md:text-4xl font-bold tracking-tighter text-zinc-900 leading-none">${cat.name}</h3>
                                <p class="text-sm text-zinc-500 mt-1.5">${catProducts.length} ${catProducts.length === 1 ? 'produto artesanal' : 'produtos artesanais'}</p>
                            </div>
                            <div class="hidden sm:block">
                                <div class="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-red-600/10 to-pink-500/10 text-red-600 text-xs font-extrabold tracking-[1.5px] rounded-2xl border border-red-200">
                                    CATÁLOGO
                                </div>
                            </div>
                        </div>
                        <!-- Elegant accent line (red to pink gradient) -->
                        <div class="mt-3 h-[3px] w-16 bg-gradient-to-r from-red-600 via-red-500 to-pink-500 rounded-full"></div>
                    </div>
                `;

                // Inner responsive product grid for THIS catalog only
                const grid = document.createElement('div');
                grid.className = `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5`;

                catProducts.forEach(product => {
                    // Pass false to hide redundant catalog badge inside cards (section header already shows it)
                    const card = createProductCard(product, false);
                    grid.appendChild(card);
                });

                section.appendChild(grid);
                container.appendChild(section);
            });

            if (!renderedAny) {
                // Shouldn't normally happen, but safety
                noResults.classList.remove('hidden');
                countEl.textContent = '';
            }
        }

        function createProductCard(product, showCatalogBadge = true) {
            const card = document.createElement('div');
            card.className = `product-card bg-white border border-zinc-100 rounded-3xl overflow-hidden cursor-pointer group`;

            const hasDiscount = product.discount_price && product.discount_price < product.price;
            const finalPrice = hasDiscount ? product.discount_price : product.price;

            let catalogName = '';
            if (showCatalogBadge) {
                const cat = allCatalogs.find(c => c.id === product.catalog_id);
                if (cat) catalogName = cat.name;
            }

            card.innerHTML = `
                <div class="relative h-44 overflow-hidden bg-zinc-100">
                    <img src="${product.image_url || 'https://picsum.photos/id/106/300/200'}" 
                         class="product-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                         onerror="this.src='https://picsum.photos/id/106/300/200'">
                    
                    ${hasDiscount ? `
                        <div class="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wider">
                            -${Math.round(((product.price - product.discount_price) / product.price) * 100)}%
                        </div>
                    ` : ''}
                </div>
                
                <div class="p-4">
                    <div class="flex justify-between items-start gap-2">
                        <div class="flex-1 min-w-0">
                            ${catalogName ? `
                                <span class="block text-xs font-semibold text-red-600 tracking-wider mb-0.5">${catalogName}</span>
                            ` : ''}
                            <h4 class="font-semibold text-zinc-800 leading-tight line-clamp-2">${product.name}</h4>
                        </div>
                    </div>
                    
                    <p class="text-xs text-zinc-500 mt-2 line-clamp-2 leading-snug">${product.description || ''}</p>
                    
                    <div class="mt-4 flex items-end justify-between">
                        <div>
                            ${hasDiscount ? `
                                <span class="text-xs line-through text-zinc-400">${formatPrice(product.price)}</span><br>
                                <span class="price-tag text-xl">${formatPrice(finalPrice)}</span>
                            ` : `
                                <span class="price-tag text-xl">${formatPrice(finalPrice)}</span>
                            `}
                        </div>
                        
                        <button onclick="event.stopImmediatePropagation(); addToCart('${product.id}', 1, true);"
                                class="bg-red-600 hover:bg-red-700 active:bg-red-800 transition text-white text-xs font-bold px-4 py-2 rounded-2xl flex items-center gap-x-1.5">
                            <i class="fa-solid fa-plus text-xs"></i>
                            <span>Adicionar</span>
                        </button>
                    </div>
                </div>
            `;

            // Click on card opens detail (but not on the add button)
            card.onclick = (e) => {
                if (!e.target.closest('button')) {
                    openProductModal(product);
                }
            };

            return card;
        }

        function openProductModal(product) {
            currentProductModal = product;
            currentModalQuantity = 1;

            const modal = document.getElementById('product-modal');
            document.getElementById('modal-product-image').src = product.image_url || 'https://picsum.photos/id/106/300/200';
            document.getElementById('modal-product-name').textContent = product.name;

            const cat = allCatalogs.find(c => c.id === product.catalog_id);
            document.getElementById('modal-product-catalog').textContent = cat ? cat.name : '';

            document.getElementById('modal-product-description').textContent = product.description || 'Produto artesanal da Doceria Docerê.';

            // Price
            const priceContainer = document.getElementById('modal-product-price');
            const hasDiscount = product.discount_price && product.discount_price < product.price;
            const finalPrice = hasDiscount ? product.discount_price : product.price;

            if (hasDiscount) {
                priceContainer.innerHTML = `
                    <div class="text-right">
                        <span class="line-through text-xs text-zinc-400">${formatPrice(product.price)}</span>
                        <div class="price-tag text-3xl font-bold">${formatPrice(finalPrice)}</div>
                    </div>
                `;
            } else {
                priceContainer.innerHTML = `<div class="price-tag text-3xl font-bold">${formatPrice(finalPrice)}</div>`;
            }

            document.getElementById('modal-quantity').textContent = currentModalQuantity;

            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeProductModal() {
            const modal = document.getElementById('product-modal');
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            currentProductModal = null;
        }

        function changeModalQuantity(delta) {
            currentModalQuantity = Math.max(1, currentModalQuantity + delta);
            document.getElementById('modal-quantity').textContent = currentModalQuantity;
        }

        function addCurrentProductToCart() {
            if (!currentProductModal) return;
            addToCart(currentProductModal.id, currentModalQuantity);
            closeProductModal();
        }

        function addToCart(productId, quantity = 1, showToastMsg = false) {
            const product = allProducts.find(p => p.id === productId);
            if (!product) return;

            const existing = currentCart.findIndex(item => item.id === productId);

            const finalPrice = (product.discount_price && product.discount_price < product.price)
                ? product.discount_price
                : product.price;

            if (existing !== -1) {
                currentCart[existing].quantity += quantity;
            } else {
                currentCart.push({
                    id: product.id,
                    name: product.name,
                    price: finalPrice,
                    originalPrice: product.price,
                    quantity: quantity,
                    catalog: allCatalogs.find(c => c.id === product.catalog_id)?.name || ''
                });
            }

            saveCartToStorage();
            updateCartBadge();

            if (showToastMsg) {
                showToast(`${quantity}x ${product.name} adicionado ao carrinho`);
            }

            // If cart modal is open, refresh it
            const cartModal = document.getElementById('cart-modal');
            if (!cartModal.classList.contains('hidden')) {
                renderCartItems();
            }
        }

        function removeFromCart(index) {
            currentCart.splice(index, 1);
            saveCartToStorage();
            updateCartBadge();
            renderCartItems();
        }

        function updateCartItemQuantity(index, newQty) {
            if (newQty < 1) return;
            currentCart[index].quantity = newQty;
            saveCartToStorage();
            renderCartItems();
            updateCartBadge();
        }

        function renderCartItems() {
            const container = document.getElementById('cart-items');
            const subtotalEl = document.getElementById('cart-subtotal');

            container.innerHTML = '';

            if (currentCart.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-10">
                        <i class="fa-solid fa-shopping-bag text-5xl text-zinc-200 mb-4"></i>
                        <p class="text-zinc-400">Seu carrinho está vazio</p>
                        <button onclick="closeCartModal()" class="mt-4 text-sm text-red-600 font-medium">Explorar produtos</button>
                    </div>
                `;
                subtotalEl.textContent = formatPrice(0);
                return;
            }

            let subtotal = 0;

            currentCart.forEach((item, index) => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;

                const div = document.createElement('div');
                div.className = 'flex gap-4 bg-white border border-zinc-100 p-3 rounded-2xl';
                div.innerHTML = `
                    <div class="flex-1 min-w-0">
                        <div class="font-semibold text-sm leading-tight">${item.name}</div>
                        <div class="text-xs text-zinc-500">${item.catalog}</div>
                        
                        <div class="flex items-center justify-between mt-3">
                            <div class="font-bold text-red-600">${formatPrice(item.price)}</div>
                            
                            <div class="flex items-center border border-zinc-200 rounded-xl">
                                <button onclick="updateCartItemQuantity(${index}, ${item.quantity - 1})" class="px-2.5 py-0.5 text-lg leading-none active:bg-zinc-100 rounded-l-xl">-</button>
                                <span class="px-3 font-semibold tabular-nums">${item.quantity}</span>
                                <button onclick="updateCartItemQuantity(${index}, ${item.quantity + 1})" class="px-2.5 py-0.5 text-lg leading-none active:bg-zinc-100 rounded-r-xl">+</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex flex-col items-end justify-between">
                        <button onclick="removeFromCart(${index})" class="text-red-400 hover:text-red-600 p-1">
                            <i class="fa-solid fa-trash text-sm"></i>
                        </button>
                        
                        <div class="font-bold text-right tabular-nums">${formatPrice(itemTotal)}</div>
                    </div>
                `;
                container.appendChild(div);
            });

            subtotalEl.textContent = formatPrice(subtotal);
        }

        function openCartModal() {
            const modal = document.getElementById('cart-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            renderCartItems();
        }

        function closeCartModal() {
            const modal = document.getElementById('cart-modal');
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }

        function proceedToCheckout() {
            closeCartModal();

            // Reset checkout state
            selectedPaymentMethod = null;
            selectedPickupMethod = null;
            confirmedLocation = null;
            document.getElementById('delivery-section').classList.add('hidden');
            document.getElementById('location-status').classList.add('hidden');
            document.getElementById('frete-display').classList.add('hidden');

            // Reset do campo de endereço e botão de redefinir
            const enderecoReset = document.getElementById('endereco-input');
            if (enderecoReset) {
                enderecoReset.readOnly = false;
                enderecoReset.classList.remove('bg-zinc-100', 'text-zinc-700', 'cursor-not-allowed');
                enderecoReset.value = '';
                enderecoReset.title = '';
            }
            const resetBtn = document.getElementById('reset-location-btn');
            if (resetBtn) resetBtn.classList.add('hidden');

            // Clear previous selections
            document.querySelectorAll('.payment-option, .pickup-option').forEach(el => {
                el.classList.remove('!border-red-600', '!bg-red-50');
                if (el.classList.contains('pickup-option')) {
                    el.classList.add('border-zinc-200');
                }
            });

            // Pre fill name/phone if wanted (demo)
            // document.getElementById('customer-name').value = '';

            const modal = document.getElementById('checkout-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            updateCheckoutSummary();
        }

        function closeCheckoutModal() {
            const modal = document.getElementById('checkout-modal');
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }

        function selectPaymentMethod(element, method) {
            // Deselect others
            document.querySelectorAll('.payment-option').forEach(el => {
                el.classList.remove('!border-red-600', '!bg-red-50');
            });

            element.classList.add('!border-red-600', '!bg-red-50');
            selectedPaymentMethod = method;
        }

        function selectPickupMethod(element, method) {
            document.querySelectorAll('.pickup-option').forEach(el => {
                el.classList.remove('!border-red-600', '!bg-red-50');
                el.classList.add('border-zinc-200');
            });

            element.classList.remove('border-zinc-200');
            element.classList.add('!border-red-600', '!bg-red-50');

            selectedPickupMethod = method;

            const deliverySection = document.getElementById('delivery-section');

            if (method === 'delivery') {
                deliverySection.classList.remove('hidden');
                // Reset location
                confirmedLocation = null;
                document.getElementById('location-status').classList.add('hidden');
            } else {
                deliverySection.classList.add('hidden');
                document.getElementById('frete-display').classList.add('hidden');
            }

            updateCheckoutSummary();
        }

        function shareLocationForDelivery() {
            if (!navigator.geolocation) {
                alert('Seu navegador não suporta geolocalização.');
                return;
            }

            // Reset do campo caso já tenha sido preenchido anteriormente
            const enderecoInput = document.getElementById('endereco-input');
            if (enderecoInput) {
                enderecoInput.readOnly = false;
                enderecoInput.classList.remove('bg-zinc-100', 'text-zinc-700', 'cursor-not-allowed');
                enderecoInput.value = '';
                enderecoInput.title = '';
            }
            document.getElementById('location-status').classList.add('hidden');
            const resetBtn = document.getElementById('reset-location-btn');
            if (resetBtn) resetBtn.classList.add('hidden');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;

                    // Open map modal to confirm/adjust position
                    openMapModal(latitude, longitude);
                },
                (error) => {
                    console.error(error);
                    alert('Não foi possível obter sua localização. Verifique as permissões do navegador ou insira o endereço manualmente.');
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }

        let mapInstance = null;
        let markerInstance = null;

        function openMapModal(lat, lng) {
            const modal = document.getElementById('map-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            // Destroy previous map if exists
            if (mapInstance) {
                mapInstance.remove();
                mapInstance = null;
            }

            setTimeout(() => {
                mapInstance = L.map('map').setView([lat, lng], 16);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(mapInstance);

                markerInstance = L.marker([lat, lng], {
                    draggable: true
                }).addTo(mapInstance);

                // Optional: update on drag
                markerInstance.on('dragend', function (e) {
                    // Could update coords live if wanted
                });
            }, 300);
        }

        function closeMapModal() {
            const modal = document.getElementById('map-modal');
            modal.classList.remove('flex');
            modal.classList.add('hidden');

            if (mapInstance) {
                mapInstance.remove();
                mapInstance = null;
            }
        }

        // ==================== STORE INFO MODAL ====================
        function openStoreInfoModal() {
            const modal = document.getElementById('store-info-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            // Try to make WhatsApp dynamic from STORE_CONFIG
            const waLink = document.getElementById('modal-whatsapp-link');
            const waNumberEl = document.getElementById('modal-whatsapp-number');

            let waNumber = '81999999999';
            let waDisplay = '(81) 99999-9999';

            if (typeof STORE_CONFIG !== 'undefined' && STORE_CONFIG.whatsapp) {
                waNumber = STORE_CONFIG.whatsapp.replace(/\D/g, '');
                // Format nicely
                if (waNumber.length === 11) {
                    waDisplay = `(${waNumber.slice(0, 2)}) ${waNumber.slice(2, 7)}-${waNumber.slice(7)}`;
                } else if (waNumber.length === 10) {
                    waDisplay = `(${waNumber.slice(0, 2)}) ${waNumber.slice(2, 6)}-${waNumber.slice(6)}`;
                } else {
                    waDisplay = STORE_CONFIG.whatsapp;
                }
            }

            if (waLink) {
                waLink.href = `https://wa.me/55${waNumber}?text=Olá%20Docerê%20Doceria!%20Gostaria%20de%20mais%20informações%20sobre%20a%20loja.`;
            }
            if (waNumberEl) {
                waNumberEl.textContent = waDisplay;
            }

            // Update the dynamic Open/Closed status badge
            updateStoreStatusBadge();
        }

        /**
         * Retorna o status atual da loja com base no horário de Brasília
         */
        function getStoreStatus() {
            const now = new Date();
            const brasilia = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

            const day = brasilia.getDay();           // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
            const hour = brasilia.getHours();
            const minute = brasilia.getMinutes();
            const currentMinutes = hour * 60 + minute;

            let isOpen = false;
            let closingTime = '';
            let nextOpening = 'terça às 11:00';

            if (day === 2) { // Terça
                isOpen = currentMinutes >= (11 * 60) && currentMinutes < (18 * 60);
                closingTime = '18:00';
                nextOpening = 'quarta às 11:00';
            } else if (day >= 3 && day <= 5) { // Quarta a Sexta
                isOpen = currentMinutes >= (11 * 60) && currentMinutes < (18 * 60 + 30);
                closingTime = '18:30';
                nextOpening = 'amanhã às 11:00';
            } else if (day === 6) { // Sábado
                isOpen = currentMinutes >= (11 * 60) && currentMinutes < (17 * 60);
                closingTime = '17:00';
                nextOpening = 'terça às 11:00';
            } else {
                // Domingo ou Segunda
                isOpen = false;
                nextOpening = 'terça às 11:00';
            }

            return {
                isOpen,
                closingTime,
                nextOpening,
                day
            };
        }

        function updateStoreStatusBadge() {
            const container = document.getElementById('store-status-badge');
            if (!container) return;

            const status = getStoreStatus();
            let badgeHTML = '';

            if (status.isOpen) {
                badgeHTML = `
                    <div class="inline-flex items-center gap-x-2 px-5 py-2 bg-emerald-100 text-emerald-700 rounded-2xl text-sm font-bold shadow-sm">
                        <div class="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span>ABERTO AGORA • Fecha às ${status.closingTime}</span>
                    </div>
                `;
            } else {
                badgeHTML = `
                    <div class="inline-flex items-center gap-x-2 px-5 py-2 bg-red-100 text-red-700 rounded-2xl text-sm font-bold shadow-sm">
                        <div class="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                        <span>FECHADO • Abre ${status.nextOpening}</span>
                    </div>
                `;
            }

            container.innerHTML = badgeHTML;
        }

        function closeStoreInfoModal() {
            const modal = document.getElementById('store-info-modal');
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }

        /**
         * Atualiza o badge de status no Hero Banner (ABERTO AGORA / FECHADO)
         */
        function updateHeroStatusBadge() {
            const container = document.getElementById('hero-status-badge');
            if (!container) return;

            const status = getStoreStatus();
            let badgeHTML = '';

            if (status.isOpen) {
                badgeHTML = `
                    <div class="flex items-center gap-x-1.5">
                        <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span>ABERTO AGORA • Fecha às ${status.closingTime}</span>
                    </div>
                `;
                container.style.color = '#166534'; // emerald-700
            } else {
                badgeHTML = `
                    <div class="flex items-center gap-x-1.5">
                        <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>FECHADO • Abre ${status.nextOpening}</span>
                    </div>
                `;
                container.style.color = '#b91c1c'; // red-700
            }

            container.innerHTML = badgeHTML;
        }

        /**
         * Busca o endereço reverso usando Nominatim (OpenStreetMap) — gratuito, sem chave.
         */
        async function reverseGeocodeWithNominatim(lat, lon) {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=pt-BR&zoom=18`;

            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'DocereDoceria/1.0 (delivery app)'
                    }
                });

                if (!response.ok) {
                    throw new Error('Nominatim retornou erro ' + response.status);
                }

                return await response.json();
            } catch (error) {
                console.error('[Nominatim] Erro ao buscar endereço reverso:', error);
                return null;
            }
        }

        async function confirmMapLocation() {
            if (!markerInstance) return;

            const pos = markerInstance.getLatLng();
            confirmedLocation = {
                lat: pos.lat,
                lng: pos.lng
            };

            closeMapModal();

            // === Reverse Geocoding com Nominatim ===
            const enderecoInput = document.getElementById('endereco-input');
            let niceAddress = '';

            const nominatimData = await reverseGeocodeWithNominatim(pos.lat, pos.lng);

            if (nominatimData && nominatimData.address) {
                const addr = nominatimData.address;

                const street = addr.road || addr.street || addr.pedestrian || addr.footway || '';
                const neighbourhood = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.village || '';
                const city = addr.city || addr.town || addr.municipality || '';

                if (street) {
                    niceAddress = street;
                    if (neighbourhood && neighbourhood.toLowerCase() !== street.toLowerCase()) {
                        niceAddress += `, ${neighbourhood}`;
                    }
                    if (city && city.toLowerCase() !== neighbourhood.toLowerCase() && city.toLowerCase() !== street.toLowerCase()) {
                        niceAddress += `, ${city}`;
                    }
                } else if (neighbourhood) {
                    niceAddress = neighbourhood;
                    if (city && city.toLowerCase() !== neighbourhood.toLowerCase()) {
                        niceAddress += `, ${city}`;
                    }
                }
            }

            if (!niceAddress && nominatimData && nominatimData.display_name) {
                const parts = nominatimData.display_name.split(',').map(p => p.trim());
                niceAddress = parts.slice(0, 3).join(', ');
            }

            if (!niceAddress) {
                niceAddress = `Localização confirmada (GPS)`;
            }

            // Preenche o campo e torna readonly
            if (enderecoInput) {
                enderecoInput.value = niceAddress;
                enderecoInput.readOnly = true;
                enderecoInput.classList.add('bg-zinc-100', 'text-zinc-700', 'cursor-not-allowed');
                enderecoInput.title = 'Endereço preenchido automaticamente via GPS + Nominatim. Clique em "Redefinir localização no mapa" para alterar.';
            }

            // Mostra status e botão de redefinir
            const status = document.getElementById('location-status');
            status.classList.remove('hidden');
            status.innerHTML = `
                <i class="fa-solid fa-check-circle text-emerald-600"></i>
                <span>Localização confirmada • Endereço preenchido automaticamente</span>
            `;

            const resetBtn = document.getElementById('reset-location-btn');
            if (resetBtn) resetBtn.classList.remove('hidden');

            showToast('Endereço preenchido automaticamente! Complete apenas o número da casa.');

            setTimeout(() => {
                updateFreteDisplay();
                updateCheckoutSummary();
            }, 100);
        }

        function resetDeliveryLocation() {
            const enderecoInput = document.getElementById('endereco-input');
            if (enderecoInput) {
                enderecoInput.readOnly = false;
                enderecoInput.classList.remove('bg-zinc-100', 'text-zinc-700', 'cursor-not-allowed');
                enderecoInput.value = '';
                enderecoInput.title = '';
            }

            document.getElementById('location-status').classList.add('hidden');
            const resetBtn = document.getElementById('reset-location-btn');
            if (resetBtn) resetBtn.classList.add('hidden');

            // Reabre o fluxo de compartilhamento de localização
            shareLocationForDelivery();
        }

        function updateFreteDisplay() {
            const endereco = document.getElementById('endereco-input').value.trim();
            const freteBox = document.getElementById('frete-display');
            const freteValueEl = document.getElementById('frete-value');

            if (!endereco || selectedPickupMethod !== 'delivery') {
                freteBox.classList.add('hidden');
                return;
            }

            const frete = calculateFrete(endereco);

            if (frete > 0) {
                freteValueEl.textContent = formatPrice(frete);
                freteBox.classList.remove('hidden');
            } else {
                freteValueEl.textContent = 'A definir pela loja';
                freteBox.classList.remove('hidden');
            }

            updateCheckoutSummary();
        }

        function updateCheckoutSummary() {
            const summaryContainer = document.getElementById('checkout-summary');
            const totalEl = document.getElementById('checkout-total');

            summaryContainer.innerHTML = '';

            let subtotal = 0;
            currentCart.forEach(item => {
                subtotal += item.price * item.quantity;

                const row = document.createElement('div');
                row.className = 'flex justify-between text-sm px-1';
                row.innerHTML = `
                    <span class="text-white/90">${item.quantity}x ${item.name}</span>
                    <span class="font-medium tabular-nums">${formatPrice(item.price * item.quantity)}</span>
                `;
                summaryContainer.appendChild(row);
            });

            let frete = 0;
            let total = subtotal;

            if (selectedPickupMethod === 'delivery') {
                const endereco = document.getElementById('endereco-input')?.value.trim() || '';
                frete = calculateFrete(endereco);

                if (frete > 0) {
                    const freteRow = document.createElement('div');
                    freteRow.className = 'flex justify-between text-sm px-1 pt-2 border-t border-white/20 mt-2';
                    freteRow.innerHTML = `
                        <span class="text-white/80">Taxa de entrega</span>
                        <span class="font-medium text-emerald-400 tabular-nums">${formatPrice(frete)}</span>
                    `;
                    summaryContainer.appendChild(freteRow);
                }

                total = subtotal + frete;
            }

            totalEl.textContent = formatPrice(total);
        }

        // Live update frete when address changes
        setTimeout(() => {
            const enderecoInput = document.getElementById('endereco-input');
            if (enderecoInput) {
                enderecoInput.addEventListener('input', () => {
                    updateFreteDisplay();
                    updateCheckoutSummary();
                });
            }
        }, 800);

        function maskPhone(input) {
            let value = input.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length > 6) {
                input.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
            } else if (value.length > 2) {
                input.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
            } else {
                input.value = value;
            }
        }

        function finalizeOrder() {
            // Validation
            const name = document.getElementById('customer-name').value.trim();
            const phone = document.getElementById('customer-phone').value.trim();

            if (!name || !phone) {
                alert('Por favor preencha seu nome e telefone.');
                return;
            }

            if (!selectedPaymentMethod) {
                alert('Selecione uma forma de pagamento.');
                return;
            }

            if (!selectedPickupMethod) {
                alert('Selecione como deseja receber o pedido.');
                return;
            }

            let deliveryAddress = '';
            let frete = 0;

            if (selectedPickupMethod === 'delivery') {
                const endereco = document.getElementById('endereco-input').value.trim();
                const numero = document.getElementById('numero-input').value.trim();
                const complemento = document.getElementById('complemento-input').value.trim();
                const referencia = document.getElementById('referencia-input').value.trim();

                if (!endereco || !numero || !complemento || !referencia) {
                    alert('Para entrega, preencha todos os campos de endereço (Endereço, Número, Complemento e Ponto de Referência).');
                    return;
                }

                deliveryAddress = `${endereco}, ${numero} - ${complemento}. Ref: ${referencia}`;
                frete = calculateFrete(endereco);

                if (confirmedLocation) {
                    deliveryAddress += ` (GPS: ${confirmedLocation.lat.toFixed(5)}, ${confirmedLocation.lng.toFixed(5)})`;
                }
            }

            // Build WhatsApp message - Versão limpa e profissional
            let message = `*NOVO PEDIDO - Doceria Docerê*%0A`;
            message += `────────────────────%0A%0A`;

            message += `*Cliente:* ${name}%0A`;
            message += `*Telefone:* ${phone}%0A%0A`;

            message += `*Itens do Pedido:*%0A`;
            let subtotal = 0;

            currentCart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;
                message += `• ${item.quantity}x ${item.name} — ${formatPrice(itemTotal)}%0A`;
            });

            message += `%0A*Resumo Financeiro:*%0A`;
            message += `Subtotal: ${formatPrice(subtotal)}%0A`;

            if (selectedPickupMethod === 'delivery') {
                message += `Taxa de Entrega: ${frete > 0 ? formatPrice(frete) : 'A definir'}%0A`;
                message += `%0A*Endereço de Entrega:*%0A${deliveryAddress}%0A`;
            } else if (selectedPickupMethod === 'pickup') {
                message += `Taxa de Entrega: Grátis (Retirada na loja)%0A`;
                message += `%0A*Retirada na Loja:*%0A${STORE_CONFIG.address}%0A`;
            } else {
                message += `Taxa de Entrega: Grátis (Consumo no local)%0A`;
                message += `%0A*Consumo no Local* — Aguardando na loja%0A`;
            }

            message += `%0A────────────────────%0A`;
            message += `*TOTAL A PAGAR: ${formatPrice(subtotal + (frete || 0))}*%0A`;
            message += `────────────────────%0A%0A`;

            message += `*Forma de Pagamento:* ${selectedPaymentMethod}%0A%0A`;

            message += `Por favor, confirme o pedido e o tempo estimado de preparo/entrega.%0A`;
            message += `Obrigado!`;

            // Open WhatsApp
            const whatsappNumber = STORE_CONFIG.whatsapp.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/55${whatsappNumber}?text=${message}`;

            window.open(whatsappUrl, '_blank');

            // Success feedback
            showToast('Pedido enviado para o WhatsApp da loja! 🎉', 6000);

            // Clear everything
            setTimeout(() => {
                currentCart = [];
                saveCartToStorage();
                updateCartBadge();
                closeCheckoutModal();

                // Optional: show final success screen or just reset
            }, 1200);
        }

        function updateCartBadge() {
            const count = currentCart.reduce((sum, item) => sum + item.quantity, 0);

            const badge = document.getElementById('cart-count-badge');
            const badgeMobile = document.getElementById('cart-count-badge-mobile');

            if (badge) badge.textContent = count;
            if (badgeMobile) badgeMobile.textContent = count;

            // Hide badge if zero
            if (count === 0) {
                if (badge) badge.style.display = 'none';
                if (badgeMobile) badgeMobile.style.display = 'none';
            } else {
                if (badge) badge.style.display = 'flex';
                if (badgeMobile) badgeMobile.style.display = 'flex';
            }
        }

        function saveCartToStorage() {
            localStorage.setItem('docere_cart', JSON.stringify(currentCart));
        }

        function loadCartFromStorage() {
            const saved = localStorage.getItem('docere_cart');
            if (saved) {
                try {
                    currentCart = JSON.parse(saved);
                } catch (e) {
                    currentCart = [];
                }
            }
        }

        function showToast(message, duration = 3200) {
            const toast = document.getElementById('toast');
            const msgEl = document.getElementById('toast-message');

            msgEl.textContent = message;
            toast.style.display = 'flex';
            toast.classList.remove('hidden');

            setTimeout(() => {
                toast.style.transition = 'all 0.3s ease';
                toast.style.opacity = '0';

                setTimeout(() => {
                    toast.style.opacity = '1';
                    toast.style.transition = '';
                    toast.classList.add('hidden');
                    toast.style.display = 'none';
                }, 250);
            }, duration);
        }

        // Make some functions global for debugging / console use
        window.Docerê = {
            clearCart: () => { currentCart = []; localStorage.removeItem('docere_cart'); updateCartBadge(); },
            addTestProduct: () => addToCart(allProducts[0]?.id || 'p1', 2),
            showConfig: () => console.log(STORE_CONFIG, FRETE_KEYWORDS)
        };

        // Boot app
        window.onload = init;