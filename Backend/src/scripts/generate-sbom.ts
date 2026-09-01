/**
 * generate-sbom.ts — Phase 14
 * 
 * Generates Software Bill of Materials (SBOM) for the EduFlow backend.
 * Uses CycloneDX standard format.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { audit } from '../logging/auditLogger';

const ARTIFACTS_DIR = path.join(__dirname, '../../security-artifacts');

async function generateSBOM() {
  console.log('🛡️  Starting SBOM Generation (Phase 14)...');

  // Ensure output directory exists
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const cyclonedxPath = path.join(ARTIFACTS_DIR, 'sbom.cyclonedx.json');

  try {
    console.log('📦 Generating CycloneDX JSON SBOM...');
    // We use npx to dynamically fetch and run the cyclonedx tool to avoid adding it to production deps
    // `--omit dev` can be used, but for security auditing we usually want to know dev dependencies too,
    // so we include all dependencies.
    execSync(`npx @cyclonedx/cyclonedx-npm --output-format JSON --output-file "${cyclonedxPath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../') // run from root of backend
    });

    console.log(`✅ SBOM generated successfully at: ${cyclonedxPath}`);
    
    audit.info('SYSTEM', 'SBOM_GENERATED', {
      detail: { format: 'CycloneDX JSON', path: cyclonedxPath }
    });

  } catch (error: any) {
    console.error('❌ Failed to generate SBOM:', error.message);
    audit.error('SYSTEM', 'SBOM_GENERATION_FAILED', {
      detail: { error: error.message }
    });
    process.exit(1);
  }
}

generateSBOM();
