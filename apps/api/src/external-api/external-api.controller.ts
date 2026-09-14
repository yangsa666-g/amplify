import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsOptional,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiOkResponse,
  ApiQuery,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { DocumentsService } from '../documents/documents.service';
import { AnalysisService } from '../analysis/analysis.service';
import { CompareService } from '../compare/compare.service';
import { getUploadDir } from '../common/storage';
import { ModelsService } from '../models/models.service';
import { PromptTemplatesService } from '../prompt-templates/prompt-templates.service';

// ─── DTO / Response classes for Swagger ──────────────────────────────────────

class UploadDocumentResponse {
  @ApiProperty({ example: 'clxyz123', description: 'Document ID to use in analysis/compare calls' })
  id!: string;

  @ApiProperty({ example: 'document.pdf' })
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  fileType!: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes' })
  fileSize!: number;

  @ApiProperty({
    enum: ['pending', 'success', 'failed'],
    example: 'pending',
    description: 'Text extraction status',
  })
  textExtractionStatus!: string;

  @ApiProperty({ example: '2026-05-10T08:00:00.000Z' })
  createdAt!: string;
}

class RunAnalysisBody {
  @IsString()
  @ApiProperty({
    example: 'clxyz123',
    description: 'Document ID returned from the upload endpoint',
  })
  documentId!: string;

  @IsString()
  @ApiProperty({ example: 'gpt-5.4', description: 'Model name to use for analysis' })
  model!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'cltemplate456',
    description: 'Field template ID (uses system default if omitted)',
  })
  fieldTemplateId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'clprompt789',
    description: 'Prompt template ID (uses system default if omitted)',
  })
  promptTemplateId?: string;

  @IsOptional()
  @IsIn(['none', 'low', 'medium', 'high', 'xhigh'])
  @ApiPropertyOptional({
    enum: ['none', 'low', 'medium', 'high', 'xhigh'],
    default: 'medium',
    description: 'Reasoning effort level for supported AI Foundry models',
  })
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh';
}

class FieldExtractionItem {
  @ApiProperty({ example: 'Document Party A' })
  field!: string;

  @ApiProperty({ example: 'The first named party' })
  field_description!: string;

  @ApiProperty({ example: 'Acme Corp', nullable: true })
  extracted_value!: string | null;

  @ApiProperty({ example: 'The agreement is entered into by Acme Corp', nullable: true })
  evidence!: string | null;

  @ApiProperty({ enum: ['high', 'medium', 'low'], example: 'high' })
  confidence!: string;

  @ApiProperty({ example: '' })
  comments!: string;
}

class RiskAnalysisParsed {
  @ApiProperty({ description: 'Summary description of the document' })
  originalContractDescription!: string;

  @ApiProperty({ description: 'Detailed risk analysis text' })
  riskAnalysis!: string;
}

class TokenUsageResponse {
  @ApiProperty({ example: 12400 })
  inputTokens!: number;

  @ApiProperty({ example: 1800 })
  outputTokens!: number;

  @ApiProperty({ example: 14200 })
  totalTokens!: number;

  @ApiPropertyOptional({ example: 800 })
  cachedInputTokens?: number;

  @ApiPropertyOptional({ example: 450 })
  reasoningTokens?: number;

  @ApiPropertyOptional({ example: 0 })
  cacheCreationInputTokens?: number;

  @ApiPropertyOptional({ example: 0 })
  cacheReadInputTokens?: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  stages?: Record<string, unknown>;
}

class RunAnalysisResponse {
  @ApiProperty({ example: 'cljob111' })
  analysisJobId!: string;

  @ApiProperty({ enum: ['success', 'failed'], example: 'success' })
  status!: string;

  @ApiProperty({ type: [FieldExtractionItem] })
  fieldExtractionResult!: FieldExtractionItem[];

  @ApiProperty({ type: RiskAnalysisParsed })
  riskAnalysisResult!: RiskAnalysisParsed;

  @ApiPropertyOptional({ type: TokenUsageResponse, nullable: true })
  tokenUsage?: TokenUsageResponse | null;
}

class RunCompareBody {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ApiProperty({
    type: [String],
    minItems: 2,
    maxItems: 5,
    uniqueItems: true,
    example: ['cldoc1', 'cldoc2'],
    description: 'Ordered document IDs. Document 1 is the baseline in the default template.',
  })
  documentIds!: string[];

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'gpt-5.4', description: 'Model name returned by GET /v1/models' })
  model!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'clprompt789',
    description: 'Document-comparison prompt template ID; uses the system default if omitted',
  })
  promptTemplateId?: string;

  @IsOptional()
  @IsIn(['none', 'low', 'medium', 'high', 'xhigh'])
  @ApiPropertyOptional({ enum: ['none', 'low', 'medium', 'high', 'xhigh'] })
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh';
}

class RunCompareResponse {
  @ApiProperty({ example: 'clcompare222' })
  compareJobId!: string;

  @ApiProperty({ enum: ['success', 'failed'], example: 'success' })
  status!: string;

  @ApiProperty({ description: 'AI-generated Markdown result' })
  analysisResult!: string;

  @ApiProperty({ example: { analysisMs: 12345 } })
  timings!: { analysisMs: number };

  @ApiPropertyOptional({ type: TokenUsageResponse, nullable: true })
  tokenUsage?: TokenUsageResponse | null;
}

class CompareDocumentResponse {
  @ApiProperty({ example: 'cldoc1' })
  id!: string;

  @ApiProperty({ example: 'document-v1.pdf' })
  fileName!: string;
}

class CompareJobDocumentResponse {
  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ type: CompareDocumentResponse })
  document!: CompareDocumentResponse;
}

class CompareJobResponse {
  @ApiProperty({ example: 'clcompare222' })
  id!: string;

  @ApiProperty({ enum: ['pending', 'running', 'success', 'failed'] })
  status!: string;

  @ApiProperty({ example: 'gpt-5.4' })
  modelName!: string;

  @ApiProperty({ example: 'medium' })
  reasoningEffort!: string;

  @ApiPropertyOptional({ example: 'clprompt789', nullable: true })
  promptTemplateId?: string | null;

  @ApiProperty({ description: 'Prompt template content captured when the task was started' })
  promptSnapshotText!: string;

  @ApiProperty({ type: [CompareJobDocumentResponse] })
  documents!: CompareJobDocumentResponse[];

  @ApiPropertyOptional({ description: 'AI-generated Markdown result', nullable: true })
  resultText?: string | null;

  @ApiPropertyOptional({ example: 12345, nullable: true })
  analysisMs?: number | null;

  @ApiPropertyOptional({ type: TokenUsageResponse, nullable: true })
  tokenUsage?: TokenUsageResponse | null;
}

class ErrorResponse {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({ example: 'Invalid or expired API key' })
  message!: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('External API')
@ApiSecurity('X-API-Key')
@ApiUnauthorizedResponse({ description: 'Missing or invalid API key', type: ErrorResponse })
@Controller('v1')
@UseGuards(ApiKeyGuard)
export class ExternalApiController {
  constructor(
    private documentsService: DocumentsService,
    private analysisService: AnalysisService,
    private compareService: CompareService,
    private modelsService: ModelsService,
    private promptTemplatesService: PromptTemplatesService,
  ) {}

  @Get('models')
  @ApiOperation({ summary: 'List enabled AI models' })
  @ApiOkResponse({ description: 'Enabled model catalog' })
  listModels(@CurrentUser() user: AuthUser) {
    return this.modelsService.getModels(user.organizationId);
  }

  @Get('prompt-templates')
  @ApiOperation({ summary: 'List prompt templates available to the API key owner' })
  @ApiQuery({ name: 'type', enum: ['contract_comparison'], required: false })
  @ApiOkResponse({ description: 'Prompt template selection metadata' })
  async listPromptTemplates(
    @CurrentUser() user: AuthUser,
    @Query('type') type = 'contract_comparison',
  ) {
    if (type !== 'contract_comparison') {
      throw new BadRequestException('External API only exposes contract_comparison templates');
    }
    const templates = await this.promptTemplatesService.listForUser(user, type);
    return templates.map(({ id, name, templateType, isDefault, scope }) => ({
      id,
      name,
      templateType,
      isDefault,
      scope,
    }));
  }

  @Post('documents/upload')
  @ApiOperation({
    summary: 'Upload a document',
    description:
      'Upload a PDF, DOCX, or TXT document. Returns a `documentId` to use in analysis and compare calls. ' +
      'Text extraction happens asynchronously — wait until `textExtractionStatus` is `success` before running analysis.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, DOCX, or TXT, max 50 MB)',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'File uploaded successfully', type: UploadDocumentResponse })
  @ApiBadRequestResponse({ description: 'No file provided' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, getUploadDir()),
        filename: (_req, file, cb) => {
          const unique = crypto.randomBytes(8).toString('hex');
          cb(null, `${unique}${path.extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadDocument(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.documentsService.upload(user, file);
  }

  @Post('analysis/run')
  @ApiOperation({
    summary: 'Run document analysis',
    description:
      'Runs field extraction and risk analysis on an uploaded document using the specified AI model. ' +
      'Both analyses run in parallel and results are returned synchronously. ' +
      'The call may take 10–60 seconds depending on document length and model.',
  })
  @ApiBody({ type: RunAnalysisBody })
  @ApiCreatedResponse({ description: 'Analysis completed', type: RunAnalysisResponse })
  @ApiBadRequestResponse({ description: 'Document text is empty or AI returned invalid response' })
  runAnalysis(@CurrentUser() user: AuthUser, @Body() body: RunAnalysisBody) {
    return this.analysisService.run(
      user,
      body.documentId,
      body.model,
      body.fieldTemplateId,
      body.promptTemplateId,
      body.reasoningEffort,
    );
  }

  @Get('analysis/:id')
  @ApiOperation({
    summary: 'Get analysis job result',
    description: 'Retrieve a previously created analysis job and its results by job ID.',
  })
  @ApiParam({ name: 'id', description: 'Analysis job ID', example: 'cljob111' })
  @ApiOkResponse({ description: 'Analysis job found', type: RunAnalysisResponse })
  @ApiNotFoundResponse({ description: 'Analysis job not found' })
  getAnalysis(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.analysisService.findOne(id, user);
  }

  @Post('compare/run')
  @ApiOperation({
    summary: 'Run document comparison',
    description:
      'Runs prompt-driven AI analysis over 2–5 uploaded documents in the supplied order. ' +
      'Returns a Markdown result synchronously.',
  })
  @ApiBody({ type: RunCompareBody })
  @ApiCreatedResponse({ description: 'Comparison completed', type: RunCompareResponse })
  runCompare(@CurrentUser() user: AuthUser, @Body() body: RunCompareBody) {
    return this.compareService.run(
      user,
      body.documentIds,
      body.model,
      body.promptTemplateId,
      body.reasoningEffort,
    );
  }

  @Get('compare/:id')
  @ApiOperation({
    summary: 'Get compare job result',
    description:
      'Retrieve a previously created compare job, its ordered documents, Markdown result, timing, and token usage by job ID.',
  })
  @ApiParam({ name: 'id', description: 'Compare job ID', example: 'clcompare222' })
  @ApiOkResponse({ description: 'Compare job found', type: CompareJobResponse })
  @ApiNotFoundResponse({ description: 'Compare job not found' })
  getCompare(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.compareService.findOne(id, user);
  }
}
