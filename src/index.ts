import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import { agentGraph } from './agentGraph.js';

loadEnv();

interface AppConfig {
  prompt: string;
}

function loadConfig(): AppConfig {
  const file = readFileSync(resolve(__dirname, '../config.yaml'), 'utf8');
  return yaml.load(file) as AppConfig;
}

async function main() {
  const cfg = loadConfig();
  const result = await agentGraph.invoke({ input: cfg.prompt });
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
