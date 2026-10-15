#!/usr/bin/env node
const logger = require('../config/logger');

/**
 * scripts/export-postman.js
 *
 * Exports OpenAPI/Swagger documentation to a Postman Collection (v2.1 format).
 * - Fetches OpenAPI JSON from http://127.0.0.1:<PORT>/api-docs.json (fallback: 5000)
 * - If the live endpoint is unavailable or returns 404, dynamically compiles
 *   the OpenAPI 3.0 spec using swagger-jsdoc
 * - Groups requests by tag (Auth, Reviewer, Admin, Dev Auth, etc.)
 * - Adds Authorization: Bearer {{token}} to all authenticated endpoints
 * - Generates sample request bodies for POST/PUT/PATCH endpoints based on Swagger schemas
 * - Outputs to postman/QMetric.postman_collection.json
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Load environment to detect PORT
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const PORT = process.env.PORT || 5000;

/**
 * Attempt to fetch OpenAPI spec from a live server endpoint.
 */
async function fetchOpenApiSpec(port) {
  const urls = [
    `http://127.0.0.1:${port}/api-docs.json`,
    `http://localhost:${port}/api-docs.json`,
    `http://127.0.0.1:${port}/api-docs/swagger.json`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.openapi || data.swagger)) {
          logger.info(`✅ Successfully fetched OpenAPI spec from ${url}`);
          return data;
        }
      }
    } catch {
      // Ignore connection/fetch errors, try next URL or fallback
    }
  }

  return null;
}

/**
 * Generate OpenAPI spec locally via swagger-jsdoc as fallback.
 */
function generateLocalSpec() {
  const swaggerJsDoc = require('swagger-jsdoc');
  const routesPattern = path.resolve(__dirname, '../routes').replace(/\\/g, '/') + '/*.js';

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'QMetric API',
        version: '1.0.0',
        description:
          'Academic Context Management System (ACMS) — Question Paper Quality Evaluation API',
        contact: {
          name: 'QMetric Support',
          email: 'support@qmetric.edu',
        },
      },
      servers: [
        {
          url: process.env.API_URL || `http://localhost:${PORT}`,
          description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'accessToken',
            description: 'HttpOnly cookie set on login',
          },
        },
        schemas: {
          User: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userName: { type: 'string' },
              email: { type: 'string', format: 'email' },
              fullName: { type: 'string' },
              role: {
                type: 'string',
                enum: ['teacher', 'reviewer', 'admin', 'super_admin'],
              },
              collegeId: { type: 'string', nullable: true },
              collegeName: { type: 'string' },
              isBlocked: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Paper: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              courseName: { type: 'string' },
              courseCode: { type: 'string' },
              reviewStatus: {
                type: 'string',
                enum: ['pending', 'approved', 'rejected', 'needs_revision'],
              },
              qualityScore: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          College: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              code: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Error: {
            type: 'object',
            properties: {
              error: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Something went wrong' },
            },
          },
        },
      },
      security: [{ cookieAuth: [] }],
    },
    apis: [routesPattern],
  };

  logger.info('ℹ️  Compiled OpenAPI spec locally from routes/*.js via swagger-jsdoc');
  return swaggerJsDoc(options);
}

/**
 * Resolve $ref pointers within the OpenAPI components.
 */
function resolveSchema(schema, components) {
  if (!schema) return {};
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/components/schemas/', '');
    return components?.schemas?.[refPath] || {};
  }
  return schema;
}

/**
 * Generate a realistic sample value from an OpenAPI schema definition.
 */
function generateSampleFromSchema(schema, components, depth = 0) {
  if (depth > 5) return null;
  schema = resolveSchema(schema, components);
  if (!schema) return null;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];

  switch (schema.type) {
    case 'string':
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'binary') return '<binary file>';
      return 'string';
    case 'integer':
    case 'number':
      return schema.minimum !== undefined ? schema.minimum : 1;
    case 'boolean':
      return true;
    case 'array':
      if (schema.items) {
        const itemVal = generateSampleFromSchema(schema.items, components, depth + 1);
        return itemVal !== null ? [itemVal] : [];
      }
      return [];
    case 'object':
    default:
      if (schema.properties) {
        const obj = {};
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          obj[propName] = generateSampleFromSchema(propSchema, components, depth + 1);
        }
        return obj;
      }
      return {};
  }
}

/**
 * Convert OpenAPI path like /users/{id}/role to Postman /users/:id/role
 */
function convertPathToPostman(openApiPath) {
  return openApiPath.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Convert OpenAPI spec to Postman Collection v2.1
 */
function convertOpenApiToPostman(spec) {
  const collection = {
    info: {
      _postman_id: crypto.randomUUID(),
      name: spec.info?.title || 'QMetric API',
      description: spec.info?.description || 'QMetric ACMS API Postman Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      {
        key: 'baseUrl',
        value: `http://localhost:${PORT}`,
        type: 'string',
      },
      {
        key: 'token',
        value: '',
        type: 'string',
        description: 'JWT access token for authenticated requests',
      },
      {
        key: 'adminSecret',
        value: process.env.ADMIN_SECRET_KEY || 'your-admin-secret-key',
        type: 'string',
        description: 'Admin secret key for privileged routes (X-Admin-Secret header)',
      },
    ],
    item: [],
  };

  const tagGroups = new Map();

  const paths = spec.paths || {};

  for (const [routePath, methods] of Object.entries(paths)) {
    for (const [methodRaw, op] of Object.entries(methods)) {
      if (['parameters', '$ref', 'summary', 'description'].includes(methodRaw)) continue;

      const method = methodRaw.toUpperCase();
      const tags = (op.tags && op.tags.length > 0) ? op.tags : ['General'];
      const tag = tags[0];

      // Check if endpoint requires authentication:
      // - If op.security is explicitly empty array [] -> public
      // - If op.security is undefined, inherit collection security: [{ cookieAuth: [] }] -> requires auth
      // - If op.security is defined and non-empty -> requires auth
      // Note: /dev/login is public by nature
      const isPublic = (Array.isArray(op.security) && op.security.length === 0) || routePath === '/dev/login';
      const requiresAuth = !isPublic;

      // Build Headers
      const headers = [];
      if (requiresAuth) {
        headers.push({
          key: 'Authorization',
          value: 'Bearer {{token}}',
          type: 'text',
          description: 'Bearer authentication token',
        });
      }

      // Collect parameters (query, path, header)
      const opParams = [...(methods.parameters || []), ...(op.parameters || [])];
      const queryParams = [];
      const pathVariables = [];

      for (const param of opParams) {
        if (param.in === 'header') {
          headers.push({
            key: param.name,
            value: param.name === 'X-Admin-Secret' ? '{{adminSecret}}' : (param.schema?.default || ''),
            type: 'text',
            description: param.description || '',
          });
        } else if (param.in === 'query') {
          queryParams.push({
            key: param.name,
            value: String(param.example ?? param.schema?.default ?? ''),
            description: param.description || '',
            disabled: !param.required,
          });
        } else if (param.in === 'path') {
          pathVariables.push({
            key: param.name,
            value: String(param.example ?? (param.name.toLowerCase().includes('id') ? '123' : 'value')),
            description: param.description || '',
          });
        }
      }

      // Postman path formatting
      const postmanPath = convertPathToPostman(routePath);
      const pathSegments = postmanPath.split('/').filter(Boolean);

      let rawUrl = '{{baseUrl}}' + postmanPath;
      if (queryParams.length > 0) {
        const queryStr = queryParams
          .filter(q => !q.disabled)
          .map(q => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`)
          .join('&');
        if (queryStr) rawUrl += '?' + queryStr;
      }

      // Build Request Body
      let body = undefined;
      const reqBodyContent = op.requestBody?.content;

      if (reqBodyContent) {
        if (reqBodyContent['application/json']) {
          headers.push({
            key: 'Content-Type',
            value: 'application/json',
            type: 'text',
          });

          const jsonSchema = reqBodyContent['application/json'].schema;
          const sample = generateSampleFromSchema(jsonSchema, spec.components);

          body = {
            mode: 'raw',
            raw: JSON.stringify(sample || {}, null, 2),
            options: {
              raw: {
                language: 'json',
              },
            },
          };
        } else if (reqBodyContent['multipart/form-data']) {
          const formSchema = reqBodyContent['multipart/form-data'].schema;
          const resolved = resolveSchema(formSchema, spec.components);
          const formdata = [];

          if (resolved?.properties) {
            for (const [propName, propDef] of Object.entries(resolved.properties)) {
              if (propDef.format === 'binary') {
                formdata.push({
                  key: propName,
                  type: 'file',
                  src: '',
                  description: propDef.description || 'Upload file',
                });
              } else {
                formdata.push({
                  key: propName,
                  value: String(propDef.example ?? propDef.default ?? (propDef.enum ? propDef.enum[0] : 'sample_value')),
                  type: 'text',
                  description: propDef.description || '',
                });
              }
            }
          }

          body = {
            mode: 'formdata',
            formdata,
          };
        }
      }

      const item = {
        name: op.summary || `${method} ${routePath}`,
        request: {
          method,
          header: headers,
          ...(body ? { body } : {}),
          url: {
            raw: rawUrl,
            host: ['{{baseUrl}}'],
            path: pathSegments,
            ...(queryParams.length > 0 ? { query: queryParams } : {}),
            ...(pathVariables.length > 0 ? { variable: pathVariables } : {}),
          },
          description: op.description || op.summary || '',
        },
        response: [],
      };

      if (!tagGroups.has(tag)) {
        tagGroups.set(tag, []);
      }
      tagGroups.get(tag).push(item);
    }
  }

  // Sort tags alphabetically (or keep standard order)
  const sortedTags = Array.from(tagGroups.keys()).sort();
  for (const tag of sortedTags) {
    collection.item.push({
      name: tag,
      item: tagGroups.get(tag),
    });
  }

  return collection;
}

async function main() {
  logger.info('🚀 Starting Postman Collection export for QMetric API...');

  let spec = await fetchOpenApiSpec(PORT);
  if (!spec) {
    spec = generateLocalSpec();
  }

  if (!spec || !spec.paths || Object.keys(spec.paths).length === 0) {
    logger.error('❌ Failed to obtain valid OpenAPI specification.');
    process.exit(1);
  }

  const endpointCount = Object.values(spec.paths).reduce(
    (acc, methods) => acc + Object.keys(methods).filter(m => !['parameters', '$ref', 'summary', 'description'].includes(m)).length,
    0
  );
  logger.info(`📊 Found ${endpointCount} endpoints across ${Object.keys(spec.paths).length} paths`);

  const collection = convertOpenApiToPostman(spec);

  const outDir = path.resolve(__dirname, '../postman');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'QMetric.postman_collection.json');
  fs.writeFileSync(outFile, JSON.stringify(collection, null, 2), 'utf-8');

  logger.info(`✅ Postman Collection v2.1 successfully written to:`);
  logger.info(`   ${outFile}`);
  logger.info(`\n📁 Folder Breakdown:`);
  collection.item.forEach(folder => {
    logger.info(`   - ${folder.name} (${folder.item.length} requests)`);
  });
}

main().catch(err => {
  logger.error('❌ Export failed:', err);
  process.exit(1);
});
