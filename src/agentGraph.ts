import { StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

interface GraphState {
  input: string;
  output?: string;
}

const graph = new StateGraph<GraphState>({
  channels: {
    input: { type: 'string' },
    output: { type: 'string' }
  }
});

graph.node('llm', async (state) => {
  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
  });

  const res = await model.invoke([{ role: 'user', content: state.input }]);
  return { output: res.content as string };
});

graph.edge('__start__', 'llm');
graph.edge('llm', '__end__');

export const agentGraph = graph.compile();
