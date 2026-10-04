// Warm up the embedding model cache
// Uses the built dist files from the workspace packages
const path = require('path');
process.env.LOCAL_EMBEDDING_CACHE = process.argv[2] || '/tmp/model-cache';

// Add the workspace dist directories to the module search path
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain) {
  if (request === '@fde/grounding') {
    return originalResolveFilename(path.join(__dirname, '../../packages/grounding/dist/index.js'), parent, isMain);
  }
  return originalResolveFilename(request, parent, isMain);
};

const grounding = require('@fde/grounding');
const embedder = new grounding.LocalEmbeddings({
  model: 'Xenova/bge-small-en-v1.5',
  queryPrefix: 'Represent this sentence for searching relevant passages: '
});

embedder.embedQuery('warm')
  .then(() => {
    console.log('✓ model cached to', process.env.LOCAL_EMBEDDING_CACHE);
    process.exit(0);
  })
  .catch(e => {
    console.error('✗ model cache failed:', e.message);
    process.exit(1);
  });
