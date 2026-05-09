import { PrismaClient, TemplateType } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // System default field template
  const existingTemplate = await prisma.fieldTemplate.findFirst({
    where: { isSystem: true, isDefault: true },
  });

  if (!existingTemplate) {
    await prisma.fieldTemplate.create({
      data: {
        name: 'Default Contract Fields',
        isDefault: true,
        isSystem: true,
        items: {
          create: [
            { fieldName: 'Contract Title', fieldDescription: 'The official title or name of the contract', sortOrder: 1 },
            { fieldName: 'Parties', fieldDescription: 'All parties involved in the contract, including full legal names', sortOrder: 2 },
            { fieldName: 'Effective Date', fieldDescription: 'The date on which the contract becomes effective', sortOrder: 3 },
            { fieldName: 'Expiry Date', fieldDescription: 'The date on which the contract expires or terminates', sortOrder: 4 },
            { fieldName: 'Contract Value', fieldDescription: 'Total monetary value or consideration of the contract', sortOrder: 5 },
            { fieldName: 'Payment Terms', fieldDescription: 'Terms and schedule for payments described in the contract', sortOrder: 6 },
            { fieldName: 'Governing Law', fieldDescription: 'The jurisdiction and law that governs the contract', sortOrder: 7 },
            { fieldName: 'Dispute Resolution', fieldDescription: 'Method for resolving disputes (e.g., arbitration, litigation)', sortOrder: 8 },
            { fieldName: 'Termination Conditions', fieldDescription: 'Conditions under which the contract may be terminated', sortOrder: 9 },
            { fieldName: 'Liability Limitation', fieldDescription: 'Clauses that limit or cap liability of either party', sortOrder: 10 },
            { fieldName: 'Confidentiality Clause', fieldDescription: 'Non-disclosure or confidentiality obligations', sortOrder: 11 },
            { fieldName: 'Intellectual Property', fieldDescription: 'Ownership or licensing of intellectual property', sortOrder: 12 },
          ],
        },
      },
    });
    console.log('✅ Default field template created');
  } else {
    console.log('ℹ️  Default field template already exists, skipping');
  }

  // System default risk analysis prompt
  const existingPrompt = await prisma.promptTemplate.findFirst({
    where: { isSystem: true, isDefault: true, templateType: TemplateType.risk_analysis },
  });

  if (!existingPrompt) {
    await prisma.promptTemplate.create({
      data: {
        name: 'Default Risk Analysis Prompt',
        templateType: TemplateType.risk_analysis,
        isDefault: true,
        isSystem: true,
        content: `You are a professional contract risk analyst.

Your task is to review the following contract text and identify key risks, unfavorable terms, and areas requiring attention.

For each risk identified, provide:
1. Risk Category (e.g., Financial, Legal, Operational, Compliance)
2. Severity (High / Medium / Low)
3. Description of the risk
4. Relevant contract clause or text excerpt
5. Recommendation

Be thorough, objective, and specific. Focus on risks that are explicitly present in the contract text.

## Contract Text
{contract_text}

## Output Format
Provide a structured risk analysis report in markdown format with clear sections for each identified risk.`,
      },
    });
    console.log('✅ Default risk analysis prompt created');
  } else {
    console.log('ℹ️  Default risk prompt already exists, skipping');
  }

  // Default admin user (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    if (!existingAdmin) {
      const hash = await bcrypt.hash('Admin@123456', 12);
      await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: 'Admin',
          passwordHash: hash,
          role: 'admin',
          authProvider: 'local',
        },
      });
      console.log('✅ Default admin user created (admin@example.com / Admin@123456)');
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
