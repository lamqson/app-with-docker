const CHAT_MUTATION = `
  mutation Chat($message: String!) {
    chat(input: { message: $message }) {
      reply
    }
  }
`;

type GraphQLResponse = {
  data?: {
    chat?: {
      reply?: string | null;
    };
  };
  errors?: Array<{ message?: string }>;
};

export async function sendAgentMessage(endpoint: string, message: string): Promise<string> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: CHAT_MUTATION,
      variables: { message },
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed (${response.status})`);
  }

  const payload = (await response.json()) as GraphQLResponse;

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? 'GraphQL error');
  }

  const reply = payload.data?.chat?.reply?.trim();
  if (!reply) {
    throw new Error('GraphQL response missing chat.reply');
  }

  return reply;
}

const MOCK_REPLIES = [
  'Rain can route intake requests once your GraphQL endpoint is connected.',
  'I can summarize open commitments and supplier status after the agent API is configured.',
  'Try asking about intake, sourcing, or contract workflows — I will mirror your production schema when live.',
  'This is a demo reply from Rain. Set GRAPHQL_ENDPOINT to call your existing GraphQL API.',
] as const;

export function mockAgentReply(message: string): string {
  const index = message.trim().length % MOCK_REPLIES.length;
  return MOCK_REPLIES[index];
}
