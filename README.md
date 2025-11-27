# OTC Swap Backend - Desafio Técnico PODS

> Backend de uma aplicação de OTC swaps para troca de tokens ERC-20 sem smart contract próprio, utilizando transferências diretas on-chain e lógica no servidor.

**Autor:** Vinicius Testa Passos  
**GitHub:** [VinTesta](https://github.com/VinTesta)  
**Ocupação:** Estudante de Ciência da Computação @ Inteli  

---

## Índice

- [Visão Geral](#-visão-geral)
- [Tecnologias e Decisões de Design](#-tecnologias-e-decisões-de-design)
- [Arquitetura da Solução](#-arquitetura-da-solução)
- [Rede e Tokens Utilizados](#-rede-e-tokens-utilizados)
- [Estratégia de Precificação](#-estratégia-de-precificação)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Executando o Projeto](#-executando-o-projeto)
- [Documentação da API](#-documentação-da-api)
- [Validação de Transações](#-validação-de-transações)
- [Testes Realizados](#-testes-realizados)
- [Dificuldades e Soluções](#-dificuldades-e-soluções)
- [Referências](#-referências)

---

## Visão Geral

Este projeto implementa um **bot de OTC (Over-The-Counter)** que:

1. **Calcula cotações em tempo real** utilizando o SDK da Uniswap V3
2. **Gera calldata** para o cliente assinar e enviar a transferência on-chain
3. **Valida transações** consultando a blockchain após o envio
4. **Efetua o pagamento** da contraparte do swap automaticamente

### Fluxo da Aplicação

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO OTC SWAP                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. QUOTE                    2. PAYMENT                  3. FULFILL         │
│  ───────                     ─────────                   ─────────          │
│                                                                             │
│  ┌─────────┐                 ┌─────────┐                 ┌─────────┐        │
│  │ Cliente │ ──GET /quote──► │ Backend │                 │ Backend │        │
│  └─────────┘                 └────┬────┘                 └────┬────┘        │
│       │                           │                           │             │
│       │                     ┌─────▼─────┐                     │             │
│       │                     │  Uniswap  │                     │             │
│       │                     │  SDK V3   │                     │             │
│       │                     └─────┬─────┘                     │             │
│       │                           │                           │             │
│       │◄── Retorna cotação ───────┘                           │             │
│       │    + calldata                                         │             │
│       │                                                       │             │
│       │                     ┌───────────┐                     │             │
│       │ ── Assina e envia ─►│ Blockchain│                     │             │
│       │    transferência    │ (Sepolia) │                     │             │
│       │                     └─────┬─────┘                     │             │
│       │                           │                           │             │
│       │◄──── txHash ──────────────┘                           │             │
│       │                                                       │             │
│       │ ─────────── POST /fulfill {quoteId, txHash} ─────────►│             │
│       │                                                       │             │
│       │                                               ┌───────▼───────┐     │
│       │                                               │   Validação   │     │
│       │                                               │  - Destinatário│    │
│       │                                               │  - Valor      │     │
│       │                                               │  - Token      │     │
│       │                                               └───────┬───────┘     │
│       │                                                       │             │
│       │                                               ┌───────▼───────┐     │
│       │                                               │   Pagamento   │     │
│       │                                               │   Automático  │     │
│       │                                               └───────┬───────┘     │
│       │                                                       │             │
│       │◄──────────────── Confirmação + payTxHash ─────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tecnologias e Decisões de Design

| Tecnologia | Justificativa |
|------------|---------------|
| **NestJS** | Framework robusto com arquitetura modular, injeção de dependência nativa e excelente suporte a TypeScript |
| **Prisma ORM** | Type-safe, migrations automáticas e excelente DX para PostgreSQL |
| **Ethers.js v5** | Biblioteca madura e bem documentada para interação com EVM |
| **Uniswap V3 SDK** | Acesso a cotações de mercado em tempo real com alta liquidez |
| **PostgreSQL** | Banco relacional confiável para persistência de cotações |
| **Docker Compose** | Facilita setup do ambiente de desenvolvimento |

### Estrutura do Projeto

```
src/
├── main.ts                    # Bootstrap da aplicação
├── app.module.ts              # Módulo raiz
├── prisma/                    # Configuração do Prisma
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── quote/                     # Módulo principal de cotações
│   ├── quote.controller.ts    # Endpoints da API
│   ├── quote.service.ts       # Lógica de negócio
│   ├── quote.module.ts        # Configuração do módulo
│   ├── constants/
│   │   └── config.ts          # Endereços de contratos e tokens
│   ├── dto/                   # Data Transfer Objects
│   │   ├── getQuoteController.dto.ts
│   │   ├── fulfillQuote.dto.ts
│   │   └── quoteResponse.dto.ts
│   ├── model/
│   │   └── currency-quote-config.ts
│   └── providers/
│       └── json-rpc.ts        # Provider RPC
└── common/
    ├── conversion/
    │   └── amountConvertions.ts
    └── enum/
        └── currency.ts        # Tokens suportados
```

---

## Rede e Tokens Utilizados

### Rede
- **Testnet:** Sepolia (chainId: 11155111)
- **Mainnet (para cotações):** Ethereum Mainnet

### Tokens Suportados

| Token | Endereço (Sepolia) | Decimals |
|-------|-------------------|----------|
| WETH | `0xdd13E55209Fd76AfE204dBda4007C227904f0A81` | 18 |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | 6 |
| WBTC | `0x171e51AE433924B1A8c9C970E137BE3a484005eF` | 8 |

> **Nota:** O WBTC na Sepolia foi deployado manualmente como um ERC-20 para fins de teste, já que não foi encontrado um equivalente oficial.

### Contratos Uniswap (Mainnet - para cotações)

| Contrato | Endereço |
|----------|----------|
| Pool Factory | `0x1F98431c8aD98523631AE4a59f267346ea31F984` |
| Quoter | `0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6` |

### Endereço da Mesa OTC (Swap Account)
```
0x4899561771600ba4a00430f5b0d5aef3cf82df36
```

---

## Estratégia de Precificação

A precificação utiliza **cotações em tempo real da Uniswap V3** na Ethereum Mainnet, garantindo preços de mercado.

```typescript
// Fluxo de precificação
const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
  tokenIn.address,      // Token de entrada
  tokenOut.address,     // Token de saída
  poolFee,              // 3000 (0.3%)
  amountIn,             // Quantidade de entrada
  0                     // sqrtPriceLimitX96
);
```
---

## Instalação e Configuração

### Pré-requisitos

- Node.js >= 18.x
- npm ou yarn
- Docker e Docker Compose (para o banco de dados)

### 1. Clone o repositório

```bash
git clone https://github.com/VinTesta/desafio-tecnico-estagio-otc.git
cd desafio-tecnico-estagio-otc
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Banco de dados
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha_segura
POSTGRES_DB=otc_swap
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:sua_senha_segura@localhost:5432/otc_swap

# RPC URLs (obtenha em Infura, Alchemy, etc.)
MAINNET_RPC_URL=https://mainnet.infura.io/v3/SEU_PROJECT_ID
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/SEU_PROJECT_ID

# Chave privada da carteira de swap (SEM o prefixo 0x)
SWAP_ACCOUNT_PRIVATE_KEY=sua_chave_privada_aqui
```

### 4. Inicie o banco de dados

```bash
docker-compose up -d
```

### 5. Execute as migrations

```bash
npx prisma migrate deploy
```

---

## Executando o Projeto

### Desenvolvimento

```bash
npm run start:dev
```

### Produção

```bash
npm run build
npm run start:prod
```

A API estará disponível em `http://localhost:3000`

---

## Documentação da API

### GET `/quote/:payToken/:receiveToken/:payAmount`

Calcula uma cotação para swap de tokens.

**Parâmetros:**

| Parâmetro | Tipo | Descrição | Valores aceitos |
|-----------|------|-----------|-----------------|
| `payToken` | string | Token a ser enviado | `ETH`, `USDC`, `WBTC` |
| `receiveToken` | string | Token a ser recebido | `ETH`, `USDC`, `WBTC` |
| `payAmount` | number | Quantidade a enviar | Número positivo |

**Exemplo de requisição:**

```bash
curl -X GET "http://localhost:3000/quote/ETH/USDC/0.1"
```

**Exemplo de resposta (200 OK):**

```json
{
  "quoteId": "cm3zk5j7h0001qw0g8k5j7h0z",
  "payToken": "ETH",
  "payAmount": "0.1",
  "receiveToken": "USDC",
  "receiveAmount": "350.123456",
  "payment": {
    "to": "0x4899561771600ba4a00430f5b0d5aef3cf82df36",
    "tokenAddress": "0xdd13E55209Fd76AfE204dBda4007C227904f0A81",
    "calldata": "0x",
    "chainId": 11155111
  }
}
```

> **Nota:** Para pagamentos em ETH/WETH, o `calldata` retorna `"0x"` pois é uma transferência nativa. Para tokens ERC-20, retorna o calldata da função `transfer()`.

---

### POST `/quote/fulfill`

Processa o fulfillment de uma cotação após o pagamento on-chain.

**Body:**

```json
{
  "quoteId": "cm3zk5j7h0001qw0g8k5j7h0z",
  "txHash": "0xd9cb9a21bfc07f858554fbeb70e5ff683a0f78e845cd737507d322cc0de6c287"
}
```

**Exemplo de requisição:**

```bash
curl -X POST "http://localhost:3000/quote/fulfill" \
  -H "Content-Type: application/json" \
  -d '{
    "quoteId": "cm3zk5j7h0001qw0g8k5j7h0z",
    "txHash": "0xd9cb9a21bfc07f858554fbeb70e5ff683a0f78e845cd737507d322cc0de6c287"
  }'
```

**Exemplo de resposta (200 OK):**

```json
{
  "status": "fulfilled",
  "quoteId": "cm3zk5j7h0001qw0g8k5j7h0z",
  "payTxHash": "0xf86a649c8a4cb1994218895b6281c5da0b8a467f45291d2312740f649e956aef",
  "payout": {
    "token": "USDC",
    "amount": "350.123456",
    "status": "sent"
  }
}
```

**Possíveis erros:**

| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | Quote not found | quoteId inválido ou já processado |
| 400 | Transaction does not exist | txHash não encontrado na blockchain |
| 400 | Transaction pending | Transação ainda não confirmada |
| 400 | Transaction failed | Transação revertida |
| 400 | Destination mismatch | Transferência para endereço incorreto |
| 400 | Amount mismatch | Valor transferido menor que o esperado |

---

### GET `/quote`

Lista todas as cotações registradas.

```bash
curl -X GET "http://localhost:3000/quote"
```
---

## Testes Realizados

Três swaps foram executados com sucesso na testnet Sepolia:

### ETH → USDC
- **TxHash:** [`0xd9cb9a21bfc07f858554fbeb70e5ff683a0f78e845cd737507d322cc0de6c287`](https://sepolia.etherscan.io/tx/0xd9cb9a21bfc07f858554fbeb70e5ff683a0f78e845cd737507d322cc0de6c287)

### USDC → ETH
- **TxHash:** [`0xf86a649c8a4cb1994218895b6281c5da0b8a467f45291d2312740f649e956aef`](https://sepolia.etherscan.io/tx/0xf86a649c8a4cb1994218895b6281c5da0b8a467f45291d2312740f649e956aef)

### WBTC → ETH
- **TxHash:** [`0x1b7271c4ea7109c190e1866d3d75a80d3b28c928fe523f5206b330685e703270`](https://sepolia.etherscan.io/tx/0x1b7271c4ea7109c190e1866d3d75a80d3b28c928fe523f5206b330685e703270)

---

## Dificuldades e Soluções

### 1. Diferença entre Mainnet e Testnet
**Problema:** O SDK da Uniswap consulta pools na Mainnet, mas as transações ocorrem na Sepolia.

**Solução:** Criado um mapeamento (`SepoliaTokensAddresses`) para traduzir os endereços dos tokens entre as redes, permitindo usar cotações reais da Mainnet enquanto opera na testnet.

### 2. Ausência de WBTC na Sepolia
**Problema:** Não existe um token WBTC oficial na Sepolia.

**Solução:** Foi realizado o deploy de um novo contrato ERC-20 para representar o WBTC na testnet, permitindo testar o fluxo completo.

### 3. Validação de Transferências ERC-20
**Problema:** Diferentemente de ETH, transferências ERC-20 não aparecem no campo `value` da transação.

**Solução:** Implementada decodificação dos logs de evento `Transfer(address,address,uint256)` para extrair destinatário e valor.

---

## Referências

- [Uniswap V3 SDK - Quoting Guide](https://docs.uniswap.org/sdk/v3/guides/swaps/quoting)
- [Fetching USDC/WETH Quote from Uniswap V3](https://medium.com/@jac475/part-1-fetching-a-usdc-weth-quote-from-uniswap-v3-2d8613223c88)
- [Uniswap SDK Examples](https://github.com/Uniswap/examples/tree/main/v3-sdk/quoting)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Ethers.js v5 Documentation](https://docs.ethers.org/v5/)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## Licença

Este projeto foi desenvolvido como parte de um desafio técnico para a empresa PODS.

Muito obrigado a todos pela oportunidade e atenção <3