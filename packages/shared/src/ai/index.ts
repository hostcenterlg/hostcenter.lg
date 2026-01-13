// ============================================
// VITAO JARVIS CRM - AI Module (MVP with Mocks)
// ============================================

import {
  AIConversationSummary,
  AIIntentClassification,
  AISentimentAnalysis,
  AIObjectionDetection,
  AINextBestAction,
  AIDraftReply,
  AISuggestion,
  Interaction,
  Customer,
} from '../types';
import { hashSHA256, generateId } from '../utils';

// ============ TYPES ============

export interface AIConfig {
  provider: 'mock' | 'openai' | 'anthropic';
  model?: string;
  confidenceThreshold: number;
  maxTokens?: number;
  temperature?: number;
}

export interface AIRunLog {
  id: string;
  function_name: string;
  input_hash: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  confidence: number | null;
  created_at: Date;
}

export interface AIContext {
  config: AIConfig;
  tenantId: string;
  userId?: string;
  onLog?: (log: AIRunLog) => void | Promise<void>;
}

// ============ DEFAULT CONFIG ============

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'mock',
  confidenceThreshold: 0.7,
  maxTokens: 1024,
  temperature: 0.7,
};

// ============ GUARDRAILS ============

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)/i,
  /disregard\s+(previous|all|instructions)/i,
  /forget\s+(everything|all|instructions)/i,
  /new\s+instructions?:/i,
  /system\s*:/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /you\s+are\s+now/i,
  /act\s+as\s+if/i,
  /pretend\s+(you|to\s+be)/i,
];

/**
 * Checks if content contains potential prompt injection
 */
export function detectPromptInjection(content: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Sanitizes user content for AI processing
 */
export function sanitizeForAI(content: string): string {
  // Replace potential injection patterns with [FILTERED]
  let sanitized = content;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }
  return sanitized;
}

/**
 * Checks if AI confidence meets threshold
 */
export function meetsConfidenceThreshold(confidence: number, threshold: number): boolean {
  return confidence >= threshold;
}

// ============ MOCK RESPONSES ============

function createMockLog(
  functionName: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  confidence: number | null,
  latencyMs: number = Math.floor(Math.random() * 200) + 50
): AIRunLog {
  return {
    id: generateId(),
    function_name: functionName,
    input_hash: hashSHA256(JSON.stringify(input)),
    model: 'mock-v1',
    prompt_tokens: Math.floor(JSON.stringify(input).length / 4),
    completion_tokens: Math.floor(JSON.stringify(output).length / 4),
    latency_ms: latencyMs,
    input,
    output,
    confidence,
    created_at: new Date(),
  };
}

// ============ AI FUNCTIONS ============

/**
 * Summarizes a conversation
 */
export async function summarizeConversation(
  ctx: AIContext,
  interactions: Interaction[]
): Promise<{ result: AIConversationSummary; log: AIRunLog }> {
  const input = {
    interactions: interactions.map(i => ({
      channel: i.channel,
      direction: i.direction,
      content: sanitizeForAI(i.content || ''),
      occurred_at: i.occurred_at,
    })),
  };

  // Mock response
  const result: AIConversationSummary = {
    summary: interactions.length > 0
      ? `Cliente entrou em contato ${interactions.length} vezes. Principais assuntos discutidos incluem produtos, preços e prazos de entrega.`
      : 'Nenhuma interação registrada.',
    key_points: [
      'Cliente interessado em produtos da linha principal',
      'Questionou sobre condições de pagamento',
      'Aguarda retorno sobre disponibilidade',
    ],
    action_items: [
      'Enviar catálogo atualizado',
      'Verificar estoque dos itens solicitados',
      'Preparar proposta comercial',
    ],
    confidence: 0.85,
  };

  const log = createMockLog('summarize_conversation', input, result, result.confidence);

  if (ctx.onLog) {
    await ctx.onLog(log);
  }

  return { result, log };
}

/**
 * Classifies the intent of a message
 */
export async function classifyIntent(
  ctx: AIContext,
  message: string
): Promise<{ result: AIIntentClassification; log: AIRunLog }> {
  const sanitized = sanitizeForAI(message);
  const input = { message: sanitized };

  // Simple keyword-based mock classification
  let intent = 'GENERAL_INQUIRY';
  let subIntent: string | null = null;
  const entities: Record<string, string> = {};

  const lowerMessage = sanitized.toLowerCase();

  if (lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('custo')) {
    intent = 'PRICE_INQUIRY';
    subIntent = 'QUOTE_REQUEST';
  } else if (lowerMessage.includes('prazo') || lowerMessage.includes('entrega')) {
    intent = 'DELIVERY_INQUIRY';
    subIntent = 'TIMELINE_CHECK';
  } else if (lowerMessage.includes('problema') || lowerMessage.includes('reclamação') || lowerMessage.includes('defeito')) {
    intent = 'COMPLAINT';
    subIntent = 'PRODUCT_ISSUE';
  } else if (lowerMessage.includes('pedido') || lowerMessage.includes('comprar') || lowerMessage.includes('quero')) {
    intent = 'PURCHASE_INTENT';
    subIntent = 'NEW_ORDER';
  } else if (lowerMessage.includes('status') || lowerMessage.includes('andamento')) {
    intent = 'ORDER_STATUS';
    subIntent = 'TRACKING';
  }

  const result: AIIntentClassification = {
    intent,
    sub_intent: subIntent,
    confidence: 0.78,
    entities,
  };

  const log = createMockLog('classify_intent', input, result, result.confidence);

  if (ctx.onLog) {
    await ctx.onLog(log);
  }

  return { result, log };
}

/**
 * Detects objections in a conversation
 */
export async function detectObjections(
  ctx: AIContext,
  message: string
): Promise<{ result: AIObjectionDetection; log: AIRunLog }> {
  const sanitized = sanitizeForAI(message);
  const input = { message: sanitized };

  const objections: AIObjectionDetection['objections'] = [];
  const lowerMessage = sanitized.toLowerCase();

  if (lowerMessage.includes('caro') || lowerMessage.includes('preço alto')) {
    objections.push({
      type: 'PRICE',
      text: 'Cliente considera o preço alto',
      severity: 'MEDIUM',
      suggested_response: 'Destacar o custo-benefício e condições de pagamento',
    });
  }

  if (lowerMessage.includes('demora') || lowerMessage.includes('prazo longo')) {
    objections.push({
      type: 'DELIVERY',
      text: 'Cliente insatisfeito com prazo de entrega',
      severity: 'MEDIUM',
      suggested_response: 'Verificar opções de entrega expressa ou estoque disponível',
    });
  }

  if (lowerMessage.includes('concorrente') || lowerMessage.includes('outra empresa')) {
    objections.push({
      type: 'COMPETITION',
      text: 'Cliente comparando com concorrência',
      severity: 'HIGH',
      suggested_response: 'Destacar diferenciais exclusivos e histórico de relacionamento',
    });
  }

  const result: AIObjectionDetection = {
    objections,
    confidence: 0.75,
  };

  const log = createMockLog('detect_objections', input, result, result.confidence);

  if (ctx.onLog) {
    await ctx.onLog(log);
  }

  return { result, log };
}

/**
 * Analyzes sentiment of a message
 */
export async function analyzeSentiment(
  ctx: AIContext,
  message: string
): Promise<{ result: AISentimentAnalysis; log: AIRunLog }> {
  const sanitized = sanitizeForAI(message);
  const input = { message: sanitized };

  const lowerMessage = sanitized.toLowerCase();

  // Simple keyword-based sentiment
  let score = 50;
  let label: AISentimentAnalysis['label'] = 'NEUTRAL';

  const positiveWords = ['obrigado', 'ótimo', 'excelente', 'perfeito', 'adorei', 'gostei', 'satisfeito'];
  const negativeWords = ['problema', 'ruim', 'péssimo', 'insatisfeito', 'decepcionado', 'frustrado', 'absurdo'];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of positiveWords) {
    if (lowerMessage.includes(word)) positiveCount++;
  }
  for (const word of negativeWords) {
    if (lowerMessage.includes(word)) negativeCount++;
  }

  score = 50 + (positiveCount * 15) - (negativeCount * 15);
  score = Math.max(0, Math.min(100, score));

  if (score >= 80) label = 'VERY_POSITIVE';
  else if (score >= 60) label = 'POSITIVE';
  else if (score >= 40) label = 'NEUTRAL';
  else if (score >= 20) label = 'NEGATIVE';
  else label = 'VERY_NEGATIVE';

  const result: AISentimentAnalysis = {
    score,
    label,
    confidence: 0.72,
  };

  const log = createMockLog('sentiment_score', input, result, result.confidence);

  if (ctx.onLog) {
    await ctx.onLog(log);
  }

  return { result, log };
}

/**
 * Suggests next best actions
 */
export async function suggestNextBestAction(
  ctx: AIContext,
  customer: Customer,
  recentInteractions: Interaction[]
): Promise<{ result: AINextBestAction; log: AIRunLog }> {
  const input = {
    customer: {
      lifecycle_status: customer.lifecycle_status,
      days_since_last_order: customer.days_since_last_order,
      total_orders: customer.total_orders,
      average_ticket: customer.average_ticket,
    },
    interaction_count: recentInteractions.length,
  };

  const suggestions: AINextBestAction['suggestions'] = [];

  // Logic based on customer state
  if (customer.lifecycle_status === 'EM_RISCO') {
    suggestions.push({
      action: 'Contato de reativação',
      reason: 'Cliente em risco de churn - último pedido há mais de 50 dias',
      priority: 1,
      template_id: 'reactivation_call',
    });
  }

  if (customer.total_orders > 5 && customer.average_ticket > 1000) {
    suggestions.push({
      action: 'Oferecer condições especiais',
      reason: 'Cliente de alto valor com histórico consistente',
      priority: 2,
      template_id: 'vip_offer',
    });
  }

  if (recentInteractions.length > 0) {
    const lastInteraction = recentInteractions[0];
    if (!lastInteraction.responded_at) {
      suggestions.push({
        action: 'Responder mensagem pendente',
        reason: 'Interação sem resposta aguardando retorno',
        priority: 1,
        template_id: null,
      });
    }
  }

  // Default suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      action: 'Manter relacionamento',
      reason: 'Cliente ativo, manter contato regular',
      priority: 3,
      template_id: 'regular_checkin',
    });
  }

  // Limit to 3 suggestions
  const result: AINextBestAction = {
    suggestions: suggestions.slice(0, 3),
    confidence: 0.8,
  };

  const log = createMockLog('next_best_action', input, result, result.confidence);

  if (ctx.onLog) {
    await ctx.onLog(log);
  }

  return { result, log };
}

/**
 * Drafts a reply message
 */
export async function draftReply(
  ctx: AIContext,
  customer: Customer,
  lastMessage: string,
  intent: AIIntentClassification
): Promise<{ result: AIDraftReply; log: AIRunLog }> {
  const input = {
    customer_name: customer.contact_name || customer.company_name,
    last_message: sanitizeForAI(lastMessage),
    intent: intent.intent,
  };

  const customerName = customer.contact_name || customer.company_name || 'Cliente';

  let draft = '';
  let tone = 'professional';

  switch (intent.intent) {
    case 'PRICE_INQUIRY':
      draft = `Olá ${customerName}!\n\nObrigado pelo seu interesse. Vou preparar uma proposta personalizada com os valores e condições especiais para você.\n\nPosso enviar ainda hoje?\n\nAbraços`;
      tone = 'friendly';
      break;

    case 'DELIVERY_INQUIRY':
      draft = `Olá ${customerName}!\n\nAgradeço o contato. Vou verificar a disponibilidade em estoque e os prazos de entrega para sua região.\n\nRetorno em breve com essas informações.\n\nAtenciosamente`;
      tone = 'professional';
      break;

    case 'COMPLAINT':
      draft = `Olá ${customerName}!\n\nLamento muito pelo inconveniente. Sua satisfação é muito importante para nós.\n\nPoderia me dar mais detalhes sobre o ocorrido para que eu possa resolver da melhor forma possível?\n\nConto com sua compreensão.\n\nAtenciosamente`;
      tone = 'empathetic';
      break;

    case 'PURCHASE_INTENT':
      draft = `Olá ${customerName}!\n\nQue ótimo saber do seu interesse! Vou preparar seu pedido imediatamente.\n\nGostaria de confirmar os itens e quantidades?\n\nEstou à disposição!\n\nAbraços`;
      tone = 'enthusiastic';
      break;

    default:
      draft = `Olá ${customerName}!\n\nObrigado pelo contato. Recebi sua mensagem e vou analisar com atenção.\n\nRetorno em breve com mais informações.\n\nAtenciosamente`;
      tone = 'professional';
  }

  const result: AIDraftReply = {
    draft,
    tone,
    confidence: 0.75,
    alternatives: [
      `Olá ${customerName}, obrigado pelo contato! Em que posso ajudar?`,
      `${customerName}, recebi sua mensagem. Vou verificar e retorno em seguida.`,
    ],
  };

  const log = createMockLog('draft_reply', input, result, result.confidence);

  if (ctx.onLog) {
    await ctx.onLog(log);
  }

  return { result, log };
}

// ============ AI SERVICE CLASS ============

export class AIService {
  private ctx: AIContext;

  constructor(ctx: AIContext) {
    this.ctx = ctx;
  }

  async summarizeConversation(interactions: Interaction[]) {
    return summarizeConversation(this.ctx, interactions);
  }

  async classifyIntent(message: string) {
    return classifyIntent(this.ctx, message);
  }

  async detectObjections(message: string) {
    return detectObjections(this.ctx, message);
  }

  async analyzeSentiment(message: string) {
    return analyzeSentiment(this.ctx, message);
  }

  async suggestNextBestAction(customer: Customer, recentInteractions: Interaction[]) {
    return suggestNextBestAction(this.ctx, customer, recentInteractions);
  }

  async draftReply(customer: Customer, lastMessage: string, intent: AIIntentClassification) {
    return draftReply(this.ctx, customer, lastMessage, intent);
  }

  /**
   * Checks if result meets confidence threshold
   * If not, returns abstention suggestion
   */
  shouldAbstain(confidence: number): boolean {
    return !meetsConfidenceThreshold(confidence, this.ctx.config.confidenceThreshold);
  }

  getAbstentionMessage(): string {
    return 'Confiança insuficiente para sugestão automática. Recomenda-se análise humana.';
  }
}

// ============ FACTORY ============

export function createAIService(
  tenantId: string,
  config: Partial<AIConfig> = {},
  onLog?: (log: AIRunLog) => void | Promise<void>
): AIService {
  return new AIService({
    config: { ...DEFAULT_AI_CONFIG, ...config },
    tenantId,
    onLog,
  });
}
