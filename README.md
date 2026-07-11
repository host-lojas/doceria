# 🍰 Doceria Docerê - Site de Delivery

Projeto completo de site estático para a **Doceria Docerê** (padaria de doces artesanais em Recife).

Inclui:
- Catálogo bonito e responsivo inspirado nos prints enviados
- Carrinho com `localStorage`
- Checkout completo com WhatsApp
- Fluxo de **entrega domiciliar** com compartilhamento de localização + mapa (Leaflet)
- Cálculo de **frete por palavras-chave** no endereço (fácil de editar)
- **Área Admin** separada com CRUD de catálogos e produtos salvo no **Supabase**

---

## 🚀 Como usar (rápido)

1. Descompacte o arquivo
2. Abra o arquivo **`index.html`** no navegador
3. (Opcional) Abra **`admin.html`** para gerenciar produtos

Tudo funciona localmente sem servidor.

---

## 📦 Estrutura do Projeto

```
docere-doceria/
├── index.html          # Site principal do cliente (catálogo + carrinho + checkout)
├── admin.html          # Painel administrativo
├── config.js           # Todas as configurações da loja + Supabase + frete
└── README.md
```

---

## ⚙️ Configurações Importantes (config.js)

Abra o arquivo `config.js` e edite:

### 1. Informações da Loja
```js
const STORE_CONFIG = {
  name: "Doceria Docerê",
  whatsapp: "81999999999",        // ← COLOQUE O NÚMERO REAL DA LOJA AQUI
  address: "Avenida Recife, 3452 - Recife, PE",
  cnpj: "15.296.830/0001-22",
  hours: { ... }
};
```

### 2. Frete por Bairro (muito fácil de editar)
```js
const FRETE_KEYWORDS = {
  "ibura": 5.00,
  "ipsep": 7.00,
  "boa vista": 4.50,
  "madalena": 6.00,
  // Adicione quantos quiser aqui
};
```

O sistema procura essas palavras no endereço que o cliente digita e aplica o valor automaticamente.

### 3. Supabase (recomendado)

Siga os passos abaixo para ter persistência real de produtos.

---

## 🗄️ Como configurar o Supabase (passo a passo)

### Passo 1: Criar projeto
1. Acesse https://supabase.com e crie uma conta gratuita
2. Crie um novo projeto chamado `docere-doceria`

### Passo 2: Criar as tabelas

No SQL Editor do Supabase, cole e execute:

```sql
-- Tabela de Catálogos
create table catalogs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- Tabela de Produtos
create table products (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid references catalogs(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  discount_price numeric(10,2),
  image_url text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- Políticas de segurança (leitura pública + escrita via anon key para demo)
alter table catalogs enable row level security;
alter table products enable row level security;

create policy "Allow public read access" on catalogs for select using (true);
create policy "Allow public read access" on products for select using (true);

create policy "Allow all for demo" on catalogs for all using (true) with check (true);
create policy "Allow all for demo" on products for all using (true) with check (true);
```

### Passo 3: Inserir dados iniciais (opcional)

```sql
-- Catálogos
insert into catalogs (name) values 
('Bolos no Pote'),
('Minizinho'),
('Bolos Vulcões M');

-- Produtos (exemplos)
insert into products (catalog_id, name, description, price, image_url) values
((select id from catalogs where name = 'Bolos no Pote'), 'Bolo no Pote de Bem Casado', 'Bolo na massa de baunilha com recheio de brigadeiro meio amargo e brigadeiro branco.', 10.00, 'https://picsum.photos/id/106/300/200'),
((select id from catalogs where name = 'Bolos no Pote'), 'Bolo no Pote de Brigadeiro', 'Bolo na massa de chocolate com 3 camadas do nosso recheio de brigadeiro meio amargo.', 10.00, 'https://picsum.photos/id/292/300/200');
```

### Passo 4: Configurar no site

No arquivo **`config.js`**:

```js
const SUPABASE_URL = "https://xxxxxxx.supabase.co";           // sua URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // sua anon key
```

Pronto! Agora o admin salvará tudo no banco de dados.

---

## 📱 Funcionalidades Implementadas

### Para o Cliente
- ✅ Catálogo bonito e responsivo (2 a 6 colunas)
- ✅ Busca em tempo real
- ✅ Filtros por catálogo (pills clicáveis)
- ✅ Modal de detalhes do produto com quantidade
- ✅ Carrinho persistente (`localStorage`)
- ✅ Checkout completo:
  - Nome + Telefone
  - Forma de pagamento (Crédito / Débito / PIX)
  - 3 opções de retirada
  - **Entrega domiciliar** com:
    - Botão de compartilhar localização (GPS)
    - Mapa interativo (Leaflet + OpenStreetMap) para confirmar posição
    - Campos obrigatórios: Endereço + Número + Complemento + Ponto de Referência
    - Cálculo automático de frete por bairro
- ✅ Gera mensagem linda e formatada no WhatsApp da loja
- ✅ Total com frete em tempo real

### Para o Administrador (`admin.html`)
- ✅ Protegido por senha simples (padrão: `docere2026`)
- ✅ Criar / Editar / Excluir **Catálogos**
- ✅ Criar / Editar / Excluir **Produtos**
- ✅ Preview de imagem ao colar URL
- ✅ Funciona em modo demo (localStorage) ou com Supabase real

---

## 🎨 Personalização

- **Cores**: Edite `STORE_CONFIG.primaryColor` no `config.js`
- **Imagens dos produtos**: Use URLs do Picsum, Unsplash ou hospede as suas
- **WhatsApp da loja**: Campo `whatsapp` no `config.js`
- **Frete**: Objeto `FRETE_KEYWORDS` no `config.js`

---

## 📌 Observações Importantes

- O site é 100% estático (ideal para Netlify, Vercel ou GitHub Pages)
- Leaflet (mapa) requer internet para carregar os tiles do OpenStreetMap
- A integração com WhatsApp abre o app/site oficial do WhatsApp com a mensagem já pronta
- Para produção, recomenda-se colocar uma senha melhor no `admin.html` e configurar RLS + Auth no Supabase

---

## 🛠️ Próximos Passos Sugeridos (se quiser evoluir)

- Adicionar autenticação real no admin (Supabase Auth)
- Upload de imagens direto para Supabase Storage
- Integração com Google Maps / Mapbox (mais preciso)
- Histórico de pedidos
- Cupons de desconto

---

Qualquer dúvida ou ajuste, é só pedir! 

Feito com ❤️ para a Doceria Docerê.