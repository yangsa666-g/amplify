import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AzureOpenAIService, type ReasoningEffort } from './azure-openai.service';
import { AnthropicService } from './anthropic.service';
import { FieldTemplatesService } from '../field-templates/field-templates.service';
import { PromptTemplatesService } from '../prompt-templates/prompt-templates.service';
import { DocumentsService } from '../documents/documents.service';

function parseRiskAnalysis(text: string): { originalContractDescription: string; riskAnalysis: string } {
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

@Injectable()
export class AnalysisService {
  constructor(
    private prisma: PrismaService,
    private azureAI: AzureOpenAIService,
    private anthropicAI: AnthropicService,
    private fieldTemplates: FieldTemplatesService,
    private promptTemplates: PromptTemplatesService,
    private documents: DocumentsService,
  ) {}

  private selectAI(model: string): AzureOpenAIService | AnthropicService {
    return model.startsWith('claude') ? this.anthropicAI : this.azureAI;
  }

  async run(
    userId: string,
    documentId: string,
    model: string,
    fieldTemplateId?: string,
    promptTemplateId?: string,
    reasoningEffort: ReasoningEffort = 'medium',
  ) {
    // 1. Load document text
    const contractText = await this.documents.getExtractedText(documentId, userId);
    if (!contractText) throw new BadRequestException('Contract text is empty');

    // 2. Load templates (by ID if provided, otherwise system default)
    const fieldTemplate = fieldTemplateId
      ? await this.fieldTemplates.getById(fieldTemplateId, userId)
      : await this.fieldTemplates.getSystemDefault();
    const promptTemplate = promptTemplateId
      ? await this.promptTemplates.getById(promptTemplateId, userId)
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

    const fieldPrompt = FIELD_EXTRACTION_PROMPT_TEMPLATE
      .replace('{fields_json}', fieldsJson)
      .replace('{contract_text}', contractText);

    // 4. Build risk analysis prompt
    const riskPrompt = promptTemplate.content.replace('{contract_text}', contractText);

    // 5. Create analysis job
    const job = await this.prisma.analysisJob.create({
      data: {
        userId,
        documentId,
        modelName: model,
        reasoningEffort,
        fieldTemplateId: fieldTemplate.id,
        promptTemplateId: promptTemplate.id,
        fieldTemplateSnapshotJson: fieldTemplate.items,
        promptSnapshotText: promptTemplate.content,
        status: 'running',
      },
    });

    try {
      // 6. Field extraction + risk analysis in parallel
      const ai = this.selectAI(model);
      const [rawFieldResult, riskResult] = await Promise.all([
        ai.chat(model, fieldPrompt, reasoningEffort),
        ai.chat(model, riskPrompt, reasoningEffort),
      ]);

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
        data: { status: 'success' },
      });

      return {
        analysisJobId: job.id,
        status: 'success',
        fieldExtractionResult,
        riskAnalysisResult: parseRiskAnalysis(riskResult),
      };
    } catch (err: any) {
      await this.prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: 'failed', errorMessage: err.message },
      });
      throw err;
    }
  }

  async findOne(id: string, userId: string) {
    const job = await this.prisma.analysisJob.findFirst({
      where: { id, userId },
      include: {
        document: { select: { fileName: true } },
        fieldExtractionResult: true,
        riskAnalysisResult: true,
      },
    });
    if (!job) throw new NotFoundException('Analysis job not found');

    if (job.riskAnalysisResult?.resultText) {
      (job.riskAnalysisResult as any).resultJson = parseRiskAnalysis(job.riskAnalysisResult.resultText);
    }

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

  async getFeedback(jobId: string, userId: string) {
    const job = await this.prisma.analysisJob.findFirst({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException('Analysis job not found');

    return this.prisma.analysisJobFeedback.findMany({
      where: { analysisJobId: jobId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
