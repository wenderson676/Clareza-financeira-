import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// System Instructions detailing the context of the Clareza Financeira app
const SYSTEM_INSTRUCTION = `Você é o "Clareza", um copiloto financeiro pessoal inteligente e ESPECIALISTA FINANCEIRO para o aplicativo "Clareza Financeira".
Sua função é guiar o usuário em sua vida financeira com empatia, respeito, praticidade e profunda sabedoria analítica. Você ajuda o usuário a registrar transações, planejar metas, analisar cenários complexos e tomar decisões financeiras embasadas.

REGRAS DE COMUNICAÇÃO E COMPORTAMENTO ESPECIALISTA:
1. Use português do Brasil amigável e direto, mas demonstre autoridade e precisão técnica quando necessário.
2. Seja um ESPECIALISTA: faça cálculos precisos de juros, rentabilidade, projeções financeiras a longo prazo e simulações de cenários para ajudar e aconselhar o usuário de forma inteligente.
3. Analise o impacto de decisões de forma abrangente: se o usuário perguntar sobre compras parceladas vs à vista, investimentos ou quitação de dívidas, forneça um raciocínio matemático e lógico conciso e preciso.
4. NUNCA seja moralista. Foque na matemática financeira, no risco e no impacto no fluxo de caixa.
5. Termine SEMPRE que possível com uma ação clara ou conselho embasado.
6. Não repita o nome do usuário a cada mensagem (evite começar toda mensagem com 'Oi, [Nome]' ou 'Olá, [Nome]'). Use o nome dele com naturalidade, no máximo 1 vez a cada várias mensagens, ou para dar ênfase em uma resposta.

MODOS DE ORÇAMENTO DO APLICATIVO E ANÁLISE:
- '50-30-20' (Padrão): 50% Necessidades, 30% Desejos, 20% Reserva/Dívidas. (Ideal para estabilidade).
- '80-10-10' (Sobrevivência): 80% Necessidades, 10% Desejos, 10% Reserva/Dívidas. (Ideal para quando a renda encolheu).
- '90-5-5' (Crise): 90% Necessidades, 5% Desejos, 5% Reserva/Dívidas. (Ideal para emergências severas ou desemprego).
- '70-0-30' (Quitar Dívidas): 70% Necessidades, 0% Desejos, 30% Dívidas. (Foco em matar juros e pendências).
- '50-20-30' (Prosperar): 50% Necessidades, 20% Desejos, 30% Patrimônio. (Para acumular reserva e crescer).
Analise a situação do usuário detalhadamente (renda, dívidas, metas) para recomendar ativamente mudanças de modo de orçamento que otimizem a saúde financeira dele.

ATENÇÃO MÁXIMA PARA REGISTROS (PROIBIÇÃO ESTRITA):
QUANDO O USUÁRIO FORNECE DADOS DE RENDA E GASTOS MENSAIS PARA PEDIR CONSELHOS, ANÁLISE OU SUGESTÃO DE MODO DE ORÇAMENTO (Ex: "Recebo 3000 e gasto 1500, qual modo usar?", "Minha renda é 5000", "Tenho 2000 de despesas mensais"), VOCÊ É ESTRITAMENTE PROIBIDO DE GERAR COMANDOS "ADD_TRANSACTION" OU "ADD_DEBT".
- O array 'commands' na sua resposta json DEVE ESTAR VAZIO [] nestes casos.
- Estes dados servem ÚNICA E EXCLUSIVAMENTE para contexto da sua resposta textual (análise).
- VOCÊ SÓ PODE GERAR COMANDOS se o usuário pedir explicitamente para REGISTRAR, ADICIONAR ou INSERIR uma transação pontual ou recorrente no aplicativo (Ex: "Registre que comprei pão por 10", "Adicione um salário de 3000 hoje").
- SE O USUÁRIO APENAS INFORMAR DADOS GERAIS, NÃO CRIE COMANDOS.

MAPEAMENTO FINANCEIRO E REGISTROS RECORRENTES (MUITO IMPORTANTE):
SOMENTE Ao identificar intenção EXPLÍCITA de registro, preencha os comandos de alteração estruturada para o app.
1. LANÇAMENTOS (ADD_TRANSACTION):
  - Tipo ('income' / 'expense' / 'transfer_to_savings' / 'transfer_from_savings'):
     - 'income': ENTRADA DE DINHEIRO. 'expense': SAÍDA DE DINHEIRO.
     - 'transfer_to_savings': poupou. 'transfer_from_savings': resgatou.
  - LANÇAMENTOS RECORRENTES (MUITO IMPORTANTE): Se o usuário pedir EXPRESSAMENTE para registrar uma receita ou despesa recorrente (ex: "receberei R$ 100 a cada 10 dias", "vou ganhar R$ 50 a cada 5 dias por 1 mês", "registre um gasto mensal de 300"), você DEVE calcular as datas futuras exatas e emitir MÚLTIPLOS comandos 'ADD_TRANSACTION' (um para cada data calculada) dentro da lista de 'commands', até o fim do período especificado (ou para os próximos 3 meses se não houver fim claro). A propriedade 'date' (formato YYYY-MM-DD) deve ser calculada por você.
  - Buckets: 'Necessidades', 'Desejos', 'Reserva/Dívidas', 'Renda'.
  - Categorias: Use categorias lógicas como 'Salário', 'Alimentação', 'Lazer'.

2. DÍVIDAS (ADD_DEBT):
   - Registre dívidas com precisão, preenchendo todos os dados possíveis (credor, juros, valor, tipo).

3. METAS/COFRINHO (ADD_GOAL):
   - Registre novos objetivos (título e valor alvo).

DIRETRIZ DE ANÁLISE:
Ao responder, você receberá a situação financeira real do usuário (transações atuais, dívidas, metas, modo). Sempre use essas informações para formular sua resposta personalizada!
- Realize cálculos matemáticos se necessário, some receitas/despesas para dar conselhos exatos e analise o cenário de diversas situações financeiras de forma concisa.`;

app.post("/api/copilot/chat", async (req, res) => {
  try {
    const { message, state, monthId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória." });
    }

    const userName = state?.userName || "Usuário";
    const budgetMode = state?.budgetMode || "50-30-20";
    const monthlyTransactions = state?.monthlyData?.[monthId]?.transactions || [];
    const goals = state?.goals || [];
    const debts = state?.debts || [];
    
    // Calculate basic statistics from actual data
    const totalIncome = monthlyTransactions
      .filter((t: any) => !t.isPending && t.type === 'income')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalExpenses = monthlyTransactions
      .filter((t: any) => !t.isPending && t.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const netSavings = monthlyTransactions
      .filter((t: any) => !t.isPending && t.type === 'transfer_to_savings')
      .reduce((sum: number, t: any) => sum + t.amount, 0) -
      monthlyTransactions
      .filter((t: any) => !t.isPending && t.type === 'transfer_from_savings')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const activeBalance = totalIncome - totalExpenses - netSavings;

    const totalDebtsAmount = debts.reduce((sum: number, d: any) => sum + d.totalAmount, 0);

    // Provide this real contextual data in the user prompt to Gemini
    const contextPrompt = `
DADOS REAIS DO USUÁRIO NO APP:
- Nome do Usuário: ${userName}
- Mês Atual: ${monthId}
- Modo de Orçamento Atual: ${budgetMode}
- Estatísticas do mês atual (${monthId}):
  * Receitas registradas: R$ ${totalIncome.toFixed(2)}
  * Despesas registradas: R$ ${totalExpenses.toFixed(2)}
  * Saldo líquido guardado/retirado do cofrinho: R$ ${netSavings.toFixed(2)}
  * Saldo operacional livre do mês: R$ ${activeBalance.toFixed(2)}
- Lançamentos desse mês:
${monthlyTransactions.length === 0 ? "  (Nenhum lançamento registrado)" : monthlyTransactions.map((t: any) => `  * ${t.date}: ${t.description} (${t.type === 'income' ? 'Entrada' : 'Saída'}) - R$ ${t.amount.toFixed(2)} [Bucket: ${t.bucket}, Categoria: ${t.category}]`).join("\n")}
- Dívidas Ativas:
${debts.length === 0 ? "  (Nenhuma dívida registrada)" : debts.map((d: any) => `  * Credor: ${d.creditor}, Valor Total: R$ ${d.totalAmount.toFixed(2)}, Tipo: ${d.type}`).join("\n")}
- Metas de Acumulação:
${goals.length === 0 ? "  (Nenhuma meta registrada)" : goals.map((g: any) => `  * Meta: ${g.title}, Alvo: R$ ${g.targetAmount.toFixed(2)}, Já guardado: R$ ${g.currentAmount.toFixed(2)}`).join("\n")}

Mensagem do Usuário: "${message}"

Analise a mensagem, identifique as intenções e retorne um JSON válido contendo:
1. 'reply': A sua resposta em linguagem natural no tom especificado.
2. 'commands': Lista de comandos estruturados correspondentes ao que o usuário solicitou registrar, se houver.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contextPrompt,
      config: {
        maxOutputTokens: 8192,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "A resposta do assistente personalizada em português-BR, empática e direta."
            },
            commands: {
              type: Type.ARRAY,
              description: "Lista de comandos de alteração de dados gerados pela mensagem, se houver.",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "Tipo do comando: 'ADD_TRANSACTION', 'ADD_DEBT', 'ADD_GOAL', 'SET_BUDGET_MODE'"
                  },
                  data: {
                    type: Type.OBJECT,
                    description: "Dados detalhados do comando.",
                    properties: {
                      // ADD_TRANSACTION
                      description: { type: Type.STRING, description: "Descrição textual simples do lançamento" },
                      amount: { type: Type.NUMBER, description: "Valor monetário absoluto positivo" },
                      type: { type: Type.STRING, description: "Tipo de transação: 'income' | 'expense' | 'transfer_to_savings' | 'transfer_from_savings'" },
                      category: { type: Type.STRING, description: "Categoria exata compatível com o aplicativo" },
                      bucket: { type: Type.STRING, description: "Bucket exato: 'Necessidades' | 'Desejos' | 'Reserva/Dívidas' | 'Renda'" },
                      date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD (use a data atual se não especificado)" },
                      isPending: { type: Type.BOOLEAN, description: "Se é um lançamento futuro ou pendente" },

                      // ADD_DEBT
                      name: { type: Type.STRING, description: "Nome curto da dívida" },
                      totalAmount: { type: Type.NUMBER, description: "Valor total devido" },
                      monthlyPayment: { type: Type.NUMBER, description: "Parcela mensal ou 0" },
                      interestRate: { type: Type.NUMBER, description: "Taxa de juros anual/mensal em % ou 0" },
                      isLate: { type: Type.BOOLEAN, description: "Se está atrasada" },
                      creditor: { type: Type.STRING, description: "Credor/Empresa" },
                      debtType: { type: Type.STRING, description: "Categoria da dívida: 'rent_late' | 'utility_risk' | 'pension' | 'loan_shark' | 'card_revolving' | 'loan_installments' | 'card_installments' | 'store_installments' | 'no_interest' | 'family' | 'other'" },

                      // ADD_GOAL
                      title: { type: Type.STRING, description: "Título do objetivo" },
                      targetAmount: { type: Type.NUMBER, description: "Valor de destino" },
                      currentAmount: { type: Type.NUMBER, description: "Valor inicial guardado" },

                      // SET_BUDGET_MODE
                      budgetMode: { type: Type.STRING, description: "Modo de orçamento: '50-30-20' | '80-10-10' | '90-5-5' | '70-0-30' | '50-20-30'" }
                    }
                  }
                },
                required: ["type"]
              }
            }
          },
          required: ["reply", "commands"]
        }
      }
    });

    const resultText = response.text || "{}";
    let resultJson;
    try {
      resultJson = JSON.parse(resultText);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError, "Raw text size:", resultText.length);
      resultJson = { 
        reply: "Desculpe, tive um problema ao processar suas informações e minha resposta ficou muito longa. Pode tentar simplificar sua mensagem?", 
        commands: [] 
      };
    }

    res.json(resultJson);

  } catch (error: any) {
    console.error("Erro no copiloto financeiro:", error);
    res.status(500).json({ error: "Ocorreu um erro no assistente financeiro. Tente novamente mais tarde." });
  }
});

// Serve static build in production, setup Vite middleware in dev
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
