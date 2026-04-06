interface Doc {
  name: string;
  content: string;
}

export async function fetchDocs(): Promise<Doc[]> {
  try {
    const response = await fetch('/api/docs');
    if (!response.ok) throw new Error('Failed to fetch docs');
    return await response.json();
  } catch (error) {
    console.error('Error fetching docs:', error);
    return [];
  }
}

export function searchDocs(query: string, docs: Doc[]): string {
  const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  if (queryTerms.length === 0) return "";

  const relevantDocs = docs.filter(doc => {
    const content = doc.content.toLowerCase();
    return queryTerms.some(term => content.includes(term));
  });

  if (relevantDocs.length === 0) return "";

  return relevantDocs.map(d => `--- DOC: ${d.name} ---\n${d.content}`).join('\n\n');
}
