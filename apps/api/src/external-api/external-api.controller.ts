import {
  Controller, Post, Get, Body, Param, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import { IsString, IsOptional, IsIn } from 'class-validator';
import {
  ApiTags, ApiSecurity, ApiOperation, ApiConsumes, ApiBody,
  ApiParam, ApiProperty, ApiPropertyOptional, ApiOkResponse,
  ApiCreatedResponse, ApiUnauthorizedResponse, ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { DocumentsService } from '../documents/documents.service';
import { AnalysisService } from '../analysis/analysis.service';
import { CompareService } from '../compare/compare.service';
import { getUploadDir } from '../common/storage';

// ─── DTO / Response classes for Swagger ──────────────────────────────────────

class UploadDocumentResponse {
  @ApiProperty({ example: 'clxyz123', description: 'Document ID to use in analysis/compare calls' })
  id!: string;

  @ApiProperty({ example: 'contract.pdf' })
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  fileType!: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes' })
  fileSize!: number;

  @ApiProperty({ enum: ['pending', 'success', 'failed'], example: 'pending', description: 'Text extraction status' })
  textExtractionStatus!: string;

  @ApiProperty({ example: '2026-05-10T08:00:00.000Z' })
  createdAt!: string;
}

class RunAnalysisBody {
  @IsString()
  @ApiProperty({ example: 'clxyz123', description: 'Document ID returned from the upload endpoint' })
  documentId!: string;

  @IsString()
  @ApiProperty({ example: 'gpt-5.4', description: 'Model name to use for analysis' })
  model!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'cltemplate456', description: 'Field template ID (uses system default if omitted)' })
  fieldTemplateId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'clprompt789', description: 'Prompt template ID (uses system default if omitted)' })
  promptTemplateId?: string;
}

class FieldExtractionItem {
  @ApiProperty({ example: 'Contract Party A' })
  field!: string;

  @ApiProperty({ example: 'The first contracting party' })
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
  @ApiProperty({ description: 'Summary description of the contract' })
  originalContractDescription!: string;

  @ApiProperty({ description: 'Detailed risk analysis text' })
  riskAnalysis!: string;
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
}

class RunCompareBody {
  @IsString()
  @ApiProperty({ example: 'cldocOld', description: 'Document ID of the original (old) contract' })
  oldDocumentId!: string;

  @IsString()
  @ApiProperty({ example: 'cldocNew', description: 'Document ID of the revised (new) contract' })
  newDocumentId!: string;

  @IsOptional()
  @IsIn(['unified', 'side_by_side'])
  @ApiPropertyOptional({
    enum: ['unified', 'side_by_side'],
    default: 'side_by_side',
    description: 'Diff display mode',
  })
  diffMode?: 'unified' | 'side_by_side';
}

class DiffChunk {
  @ApiProperty({ enum: ['added', 'removed', 'unchanged'] })
  type!: string;

  @ApiProperty({ type: [String], example: ['line 1', 'line 2'] })
  lines!: string[];
}

class DiffStats {
  @ApiProperty({ example: 5 })
  added!: number;

  @ApiProperty({ example: 3 })
  removed!: number;

  @ApiProperty({ example: 120 })
  unchanged!: number;
}

class DiffResult {
  @ApiProperty({ type: [DiffChunk] })
  chunks!: DiffChunk[];

  @ApiProperty({ type: DiffStats })
  stats!: DiffStats;
}

class RunCompareResponse {
  @ApiProperty({ example: 'clcompare222' })
  compareJobId!: string;

  @ApiProperty({ enum: ['success', 'failed'], example: 'success' })
  status!: string;

  @ApiProperty({ enum: ['unified', 'side_by_side'], example: 'side_by_side' })
  diffMode!: string;

  @ApiProperty({ type: DiffResult })
  diffResult!: DiffResult;
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
  ) {}

  @Post('documents/upload')
  @ApiOperation({
    summary: 'Upload a contract document',
    description:
      'Upload a PDF, DOCX, or TXT contract file. Returns a `documentId` to use in analysis and compare calls. ' +
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
          description: 'Contract file (PDF, DOCX, or TXT, max 50 MB)',
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
    return this.documentsService.upload(user.userId, file);
  }

  @Post('analysis/run')
  @ApiOperation({
    summary: 'Run contract analysis',
    description:
      'Runs field extraction and risk analysis on an uploaded document using the specified AI model. ' +
      'Both analyses run in parallel and results are returned synchronously. ' +
      'The call may take 10–60 seconds depending on document length and model.',
  })
  @ApiBody({ type: RunAnalysisBody })
  @ApiCreatedResponse({ description: 'Analysis completed', type: RunAnalysisResponse })
  @ApiBadRequestResponse({ description: 'Document text is empty or AI returned invalid response' })
  runAnalysis(
    @CurrentUser() user: AuthUser,
    @Body() body: RunAnalysisBody,
  ) {
    return this.analysisService.run(user.userId, body.documentId, body.model, body.fieldTemplateId, body.promptTemplateId);
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
    return this.analysisService.findOne(id, user.userId);
  }

  @Post('compare/run')
  @ApiOperation({
    summary: 'Run contract comparison',
    description:
      'Computes a line-level diff between two uploaded contract documents. ' +
      'Returns structured diff chunks (added / removed / unchanged lines) and summary statistics.',
  })
  @ApiBody({ type: RunCompareBody })
  @ApiCreatedResponse({ description: 'Comparison completed', type: RunCompareResponse })
  runCompare(
    @CurrentUser() user: AuthUser,
    @Body() body: RunCompareBody,
  ) {
    return this.compareService.run(user.userId, body.oldDocumentId, body.newDocumentId, body.diffMode);
  }

  @Get('compare/:id')
  @ApiOperation({
    summary: 'Get compare job result',
    description: 'Retrieve a previously created compare job and its diff results by job ID.',
  })
  @ApiParam({ name: 'id', description: 'Compare job ID', example: 'clcompare222' })
  @ApiOkResponse({ description: 'Compare job found', type: RunCompareResponse })
  @ApiNotFoundResponse({ description: 'Compare job not found' })
  getCompare(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.compareService.findOne(id, user.userId);
  }
}
