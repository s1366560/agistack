import { z } from 'zod';

const schema = z.object({
  path: z.string().describe('File path to read'),
  encoding: z.enum(['utf-8', 'ascii']).optional().describe('File encoding'),
});

console.log('Type name:', (schema as any)._def?.typeName);
console.log('Has shape:', 'shape' in schema);
console.log('Shape keys:', schema.shape ? Object.keys(schema.shape) : 'no shape');
