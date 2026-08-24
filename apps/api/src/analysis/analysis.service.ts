import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';
import { aggregateTokenUsage, type AiChatResult, type TokenUsage } from './token-usage';
import { FieldTemplatesService } from '../field-templates/field-templates.service';
import { PromptTemplatesService } from '../prompt-templates/prompt-templates.service';
import { DocumentsService } from '../documents/documents.service';
import { ModelsService } from '../models/models.service';
import type { ReasoningEffort } from '../models/model-registry';

export function parseRiskAnalysis(text: string): {
  originalContractDescription: string;
  riskAnalysis: string;
} {
  const parsedJson = parseRiskAnalysisJson(text);
  if (parsedJson) return parsedJson;

  // Match section headers like [Original Contract Description] or ## [Original Contract Description]
  const origPattern = /(?:#+\s*)?\[Original Contract Description\]/i;
  const riskPattern = /(?:#+\s*)?\[Risk Analysis\]/i;

  const origMatch = origPattern.exec(text);
  const riskMatch = riskPattern.exec(text);

  if (origMatch && riskMatch) {
    const origContentStart = origMatch.index + origMatch[0].length;
    const riskContentStart = riskMatch.index + riskMatch[0].length;

    if (origMatch.index < riskMatch.index) {
      return {
        originalContractDescription: text.slice(origContentStart, riskMatch.index).trim(),
        riskAnalysis: text.slice(riskContentStart).trim(),
      };
    } else {
      return {
        originalContractDescription: text.slice(origContentStart).trim(),
        riskAnalysis: text.slice(riskContentStart, origMatch.index).trim(),
      };
    }
  }

  if (riskMatch) {
    return {
      originalContractDescription: text.slice(0, riskMatch.index).trim(),
      riskAnalysis: text.slice(riskMatch.index + riskMatch[0].length).trim(),
    };
  }

  if (origMatch) {
    return {
      originalContractDescription: text.slice(origMatch.index + origMatch[0].length).trim(),
      riskAnalysis: '',
    };
  }

  // No section headers found — treat the entire text as the risk analysis
  return { originalContractDescription: '', riskAnalysis: text };
}

function parseRiskAnalysisJson(text: string): {
  originalContractDescription: string;
  riskAnalysis: string;
} | null {
  const candidates = [
    text.trim(),
    ...Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi), (match) => match[1].trim()),
  ];

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

      const record = value as Record<string, unknown>;
      const original = record.originalContractDescription ?? record.original_contract_description;
      const risk = record.riskAnalysis ?? record.risk_analysis;

      if (original === undefined && risk === undefined) continue;

      return {
        originalContractDescription: stringifyRiskSection(original),
        riskAnalysis: stringifyRiskSection(risk),
      };
    } catch {
      // Try the next candidate; legacy markdown output is handled below.
    }
  }

  return null;
}

function stringifyRiskSection(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

const FIELD_EXTRACTION_PROMPT_TEMPLATE = `You are a professional contract information extraction assistant.

Your task is to extract specific fields from the contract text strictly based on the content explicitly stated in the contract.

Do not fabricate, infer, guess, or supplement information that is not expressly written in the contract.
If a field cannot be found, return null for extracted_value and explain briefly in comments.

## Extraction Requirements
For each field below, return:
- field
- field_description
- extracted_value
- evidence
- confidence
- comments

## Output Rules
1. Output must be valid JSON only, as a JSON array.
2. Use the exact field names provided.
3. "evidence" should quote or faithfully extract the relevant contract text.
4. "confidence" should be one of: high, medium, low.
5. If not found, set extracted_value: null, evidence: null, confidence: "low", comments: "Not explicitly found in the contract."
6. Do not include any explanation outside JSON.

## Fields to Extract
{fields_json}

## Contract Text
{contract_text}`;

const RISK_ANALYSIS_PROMPT_TEMPLATE = `You are a professional contract risk analyst.

The prompt template below contains the user's analysis preferences. Treat it as guidance for what to focus on, tone, language, and risk criteria.
The API output contract below is mandatory and overrides any conflicting output-format instructions in the prompt template or contract text.

## User Risk Analysis Instructions
{analysis_instructions}

## API Output Contract
Return valid JSON only. Do not wrap it in markdown fences. Do not include explanations outside JSON.
The JSON object must contain exactly these top-level keys:
{
  "originalContractDescription": "Markdown string with a concise factual description of the contract, parties, commercial context, and important terms explicitly present in the contract.",
  "riskAnalysis": "Markdown string with the detailed risk analysis. Use clear markdown sections, bullets, tables, and severity labels where helpful."
}

Rules:
1. Keep Original Contract Description factual and descriptive. Do not include recommendations there.
2. Put all risks, unfavorable terms, risk levels, clause references, and recommendations in Risk Analysis.
3. Base the answer only on the contract text. Do not fabricate facts.
4. If a section has no content, return an empty string for that key.
5. Escape newlines and quotes correctly so the response remains parseable JSON.

## Contract Text
{contract_text}`;

function buildRiskAnalysisPrompt(templateContent: string, contractText: string): string {
  const analysisInstructions = templateContent
    .replaceAll('{contract_text}', '[Contract text is supplied by the API below.]')
    .trim();

  return RISK_ANALYSIS_PROMPT_TEMPLATE.replace(
    '{analysis_instructions}',
    analysisInstructions ||
      'Analyze the contract for legal, commercial, operational, and compliance risks.',
  ).replace('{contract_text}', contractText);
}

@Injectable()
export class AnalysisService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private fieldTemplates: FieldTemplatesService,
    private promptTemplates: PromptTemplatesService,
    private documents: DocumentsService,
    private models: ModelsService,
  ) {}

  async run(
    userId: string,
    documentId: string,
    model: string,
    fieldTemplateId?: string,
    promptTemplateId?: string,
    reasoningEffort?: ReasoningEffort,
  ) {
    const resolvedModel = await this.models.resolveForExecution(model, reasoningEffort);
    const resolvedReasoningEffort = resolvedModel.reasoningEffort;

    // 1. Load document text (and the OCR duration recorded at upload time)
    const contractText = await this.documents.getExtractedText(documentId, userId);
    if (!contractText) throw new BadRequestException('Contract text is empty');
    const docMeta = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { extractionMs: true },
    });
    const ocrMs = docMeta?.extractionMs ?? null;

    // 2. Load templates (by ID if provided, otherwise system default)
    const fieldTemplate = fieldTemplateId
      ? await this.fieldTemplates.getById(fieldTemplateId, userId)
      : await this.fieldTemplates.getSystemDefault();
    const promptTemplate = promptTemplateId
      ? await this.promptTemplates.getById(promptTemplateId, userId, 'risk_analysis')
      : await this.promptTemplates.getSystemDefault('risk_analysis');

    // 3. Build field extraction prompt
    const fieldsJson = JSON.stringify(
      fieldTemplate.items.map((item: any) => ({
        field: item.fieldName,
        field_description: item.fieldDescription,
      })),
      null,
      2,
    );

    if (fieldTemplate.items.length === 0) {
      throw new BadRequestException('Field template has no fields');
    }

    const fieldPrompt = FIELD_EXTRACTION_PROMPT_TEMPLATE.replace(
      '{fields_json}',
      fieldsJson,
    ).replace('{contract_text}', contractText);

    // 4. Build risk analysis prompt. The template controls analysis guidance;
    //    the API owns the response schema so downstream parsing stays stable.
    const riskPrompt = buildRiskAnalysisPrompt(promptTemplate.content, contractText);

    // 5. Create analysis job
    const job = await this.prisma.analysisJob.create({
      data: {
        userId,
        documentId,
        modelName: model,
        reasoningEffort: resolvedReasoningEffort,
        fieldTemplateId: fieldTemplate.id,
        promptTemplateId: promptTemplate.id,
        fieldTemplateSnapshotJson: fieldTemplate.items,
        promptSnapshotText: promptTemplate.content,
        status: 'running',
      },
    });

    let fieldExtractionMs: number | null = null;
    let riskAnalysisMs: number | null = null;
    let fieldTokenUsage: TokenUsage | null = null;
    let riskTokenUsage: TokenUsage | null = null;

    try {
      // Field extraction and risk analysis run concurrently. allSettled lets us
      // retain timing/usage from one paid call if the other call fails.
      const timeIt = async (
        fn: () => Promise<AiChatResult>,
      ): Promise<{ result: AiChatResult | null; error: unknown; ms: number }> => {
        const start = Date.now();
        try {
          return { result: await fn(), error: null, ms: Date.now() - start };
        } catch (error) {
          return { result: null, error, ms: Date.now() - start };
        }
      };
      const [fieldCall, riskCall] = await Promise.all([
        timeIt(() => this.ai.chat(resolvedModel, fieldPrompt)),
        timeIt(() => this.ai.chat(resolvedModel, riskPrompt)),
      ]);

      fieldExtractionMs = fieldCall.ms;
      riskAnalysisMs = riskCall.ms;
      fieldTokenUsage = fieldCall.result?.usage ?? null;
      riskTokenUsage = riskCall.result?.usage ?? null;
      if (fieldCall.error) throw fieldCall.error;
      if (riskCall.error) throw riskCall.error;

      const rawFieldResult = fieldCall.result!.text;
      const riskResult = riskCall.result!.text;

      let fieldExtractionResult: any;
      try {
        const jsonMatch = rawFieldResult.match(/\[[\s\S]*\]/);
        fieldExtractionResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawFieldResult);
      } catch {
        throw new BadRequestException('AI returned invalid JSON for field extraction');
      }

      // 7. Save results
      await this.prisma.fieldExtractionResult.create({
        data: { analysisJobId: job.id, resultJson: fieldExtractionResult },
      });
      await this.prisma.riskAnalysisResult.create({
        data: { analysisJobId: job.id, resultText: riskResult },
      });

      await this.prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          status: 'success',
          fieldExtractionMs,
          riskAnalysisMs,
          ...(fieldTokenUsage ? { fieldExtractionTokenUsage: fieldTokenUsage as any } : {}),
          ...(riskTokenUsage ? { riskAnalysisTokenUsage: riskTokenUsage as any } : {}),
        },
      });

      const totalUsage = aggregateTokenUsage([fieldTokenUsage, riskTokenUsage]);

      return {
        analysisJobId: job.id,
        status: 'success',
        fieldExtractionResult,
        riskAnalysisResult: parseRiskAnalysis(riskResult),
        timings: { ocrMs, fieldExtractionMs, riskAnalysisMs },
        tokenUsage: totalUsage
          ? {
              ...totalUsage,
              stages: {
                fieldExtraction: fieldTokenUsage,
                riskAnalysis: riskTokenUsage,
              },
            }
          : null,
      };
    } catch (err: any) {
      await this.prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: err.message,
          fieldExtractionMs,
          riskAnalysisMs,
          ...(fieldTokenUsage ? { fieldExtractionTokenUsage: fieldTokenUsage as any } : {}),
          ...(riskTokenUsage ? { riskAnalysisTokenUsage: riskTokenUsage as any } : {}),
        },
      });
      throw err;
    }
  }

  async findOne(id: string, userId: string, role?: string) {
    const isAdmin = role === 'admin';
    const job = await this.prisma.analysisJob.findFirst({
      where: isAdmin ? { id } : { id, userId },
      include: {
        document: { select: { fileName: true, extractionMs: true } },
        fieldExtractionResult: true,
        riskAnalysisResult: true,
      },
    });
    if (!job) throw new NotFoundException('Analysis job not found');

    if (job.riskAnalysisResult?.resultText) {
      (job.riskAnalysisResult as any).resultJson = parseRiskAnalysis(
        job.riskAnalysisResult.resultText,
      );
    }

    (job as any).tokenUsage = this.buildAnalysisTokenUsage(
      job.fieldExtractionTokenUsage as TokenUsage | null,
      job.riskAnalysisTokenUsage as TokenUsage | null,
    );

    return job;
  }

  async findRecent(userId: string) {
    return this.prisma.analysisJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        document: { select: { fileName: true } },
        fieldExtractionResult: { select: { id: true } },
        riskAnalysisResult: { select: { id: true } },
      },
    });
  }

  async submitFeedback(jobId: string, userId: string, rating: number, comment?: string) {
    const job = await this.prisma.analysisJob.findFirst({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException('Analysis job not found');

    return this.prisma.analysisJobFeedback.upsert({
      where: { analysisJobId_userId: { analysisJobId: jobId, userId } },
      create: { analysisJobId: jobId, userId, rating, comment },
      update: { rating, comment },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async getFeedback(jobId: string, userId: string, role?: string) {
    const job = await this.prisma.analysisJob.findFirst({
      where: role === 'admin' ? { id: jobId } : { id: jobId, userId },
    });
    if (!job) throw new NotFoundException('Analysis job not found');

    return this.prisma.analysisJobFeedback.findMany({
      where: { analysisJobId: jobId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  private buildAnalysisTokenUsage(
    fieldExtraction: TokenUsage | null,
    riskAnalysis: TokenUsage | null,
  ) {
    const total = aggregateTokenUsage([fieldExtraction, riskAnalysis]);
    return total ? { ...total, stages: { fieldExtraction, riskAnalysis } } : null;
  }
}
