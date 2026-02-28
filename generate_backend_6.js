const fs = require('fs');
const path = require('path');

const srcSchemaPath = path.join(__dirname, 'prisma/schema.prisma');
const destSchemaPath = path.join(__dirname, 'smarthire-backend/prisma/schema.prisma');

if (fs.existsSync(srcSchemaPath)) {
    const existingSchema = fs.readFileSync(srcSchemaPath, 'utf8');
    const myNewModels = fs.readFileSync(destSchemaPath, 'utf8');

    // Let's strip out the "generator" and "datasource" from myNewModels to append seamlessly
    // But wait, myNewModels has `extensions = [citext, pg_trgm, uuid_ossp]` which is needed.
    // The prompt said "Generate prisma/schema.prisma with EXACTLY these models. Do NOT modify or touch any existing ATS models already in the schema. Add these new models alongside them."
    // Wait, I can just append `myNewModels` without `generator` and `datasource` to `existingSchema` 
    // and manually patch `datasource` block in `existingSchema` to include the extensions and preview features.

    let patchedExisting = existingSchema.replace(
        /provider\s*=\s*"prisma-client-js"/,
        'provider = "prisma-client-js"\n  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]'
    );

    patchedExisting = patchedExisting.replace(
        /url\s*=\s*env\("DATABASE_URL"\)/,
        'url = env("DATABASE_URL")\n  extensions = [citext, pg_trgm, uuid_ossp]'
    );

    // remove generator and datasource from myNewModels
    const modelsOnly = myNewModels
        .replace(/generator client \{[\s\S]*?\}/, '')
        .replace(/datasource db \{[\s\S]*?\}/, '');

    fs.writeFileSync(destSchemaPath, patchedExisting + '\n' + modelsOnly);
    console.log('Appended schemas together');
} else {
    console.log('No existing schema found, skipping append.');
}
