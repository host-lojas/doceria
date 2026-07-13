// ============================================
// CONFIGURAÇÕES DA LOJA - Doceria Docerê
// ============================================
// Altere aqui as informações da sua loja

const STORE_CONFIG = {
  name: "Doceria",
  whatsapp: "81999999999", // TODO: Coloque o número real da loja com DDD (apenas números, ex: 81981749601)
  address: "Avenida Dois Rios - Ibura, Recife - PE",
  cnpj: "11.111.111/0001-11",
  // Horário de funcionamento (exibido na interface)
  hours: {
    "Segunda a Sexta": "11:00 às 18:30",
    "Sábado": "11:00 às 17:00",
    "Domingo": "Fechado"
  },
  // Tema / Cores (pode customizar)
  primaryColor: "#DC2626", // Vermelho principal (similar ao print)
};

// ============================================
// SUPABASE - CONFIGURAÇÃO
// ============================================
// 1. Crie um projeto gratuito em https://supabase.com
// 2. Vá em Project Settings > API
// 3. Copie a URL do projeto e a chave anon/public
// 4. Cole abaixo (substitua os valores)

const SUPABASE_URL = "https://fucnowlvrllxbtxngqdj.supabase.co"; // TODO: Substitua
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y25vd2x2cmxseGJ0eG5ncWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDIwODQsImV4cCI6MjA5OTI3ODA4NH0.trYM9U54nq8whspuspxK2-OIIYFYKzjc4KGaeER3hew"; // TODO: Substitua pela sua anon key

// ============================================
// FRETE POR PALAVRAS-CHAVE NO ENDEREÇO
// ============================================
// O sistema procura essas palavras (case insensitive) no endereço digitado pelo cliente
// e aplica a taxa correspondente. 
// Adicione quantos quiser no formato: "palavra-chave-em-minusculo": valor_em_reais

const FRETE_KEYWORDS = {
  "ibura": 5.00,
  "ipsep": 7.00,
  "boa vista": 4.50,
  "madalena": 6.00,
  "casa forte": 6.50,
  "espinheiro": 5.50,
  "graças": 5.00,
  "joana bezerra": 8.00,
  "recife antigo": 7.50,
  // Adicione mais bairros/regiões aqui
  // Exemplo: "varzea": 4.00,
};

// ============================================
// IMPORTANTE: MODO DEMO REMOVIDO
// ============================================
// Este projeto agora funciona APENAS com Supabase.
// Não existe mais fallback para dados locais.
// Se o Supabase não estiver configurado corretamente,
// o site mostrará uma mensagem clara pedindo configuração.

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getSupabaseClient() {
  if (typeof window.supabase === 'undefined' || !SUPABASE_URL || SUPABASE_URL.includes('SEU-PROJETO')) {
    return null;
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function calculateFrete(address) {
  if (!address) return 0;
  const lowerAddress = address.toLowerCase();
  for (const [keyword, price] of Object.entries(FRETE_KEYWORDS)) {
    if (lowerAddress.includes(keyword)) {
      return price;
    }
  }
  return 0; // Sem taxa definida para o endereço
}

function formatPrice(value) {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
}

function formatPhone(phone) {
  // Remove tudo que não é número
  const cleaned = phone.replace(/\D/g, '');
  // Formata (81) 99999-9999
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
  }
  return phone;
}
