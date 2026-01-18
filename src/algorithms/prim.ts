export function prim(adjList: any) {
  const nodes = Object.keys(adjList);
  if (nodes.length === 0) return { cost: 0, mstEdges: [] };

  const startNode = nodes[0];
  const distances: Record<string, number> = {};
  const parent: Record<string, string | null> = {};
  const visited = new Set<string>();
  const mstEdges: { from: string, to: string, weight: number }[] = []; // Thêm weight vào output để hiển thị

  nodes.forEach(n => { distances[n] = Infinity; parent[n] = null; });
  distances[startNode] = 0;

  let pq = [{ id: startNode, dist: 0 }];

  while (pq.length > 0) {
    pq.sort((a, b) => a.dist - b.dist);
    const { id: u } = pq.shift()!;

    if (visited.has(u)) continue;
    visited.add(u);

    // Nếu có cha (không phải node đầu), thêm cạnh vào danh sách kết quả
    if (parent[u] !== null) {
      mstEdges.push({ from: parent[u]!, to: u, weight: distances[u] });
    }

    const neighbors = adjList[u] || [];
    for (const [v, weight] of neighbors) {
      if (!visited.has(v) && weight < distances[v]) {
        distances[v] = weight;
        parent[v] = u;
        pq.push({ id: v, dist: weight });
      }
    }
  }

  const totalWeight = mstEdges.reduce((sum, e) => sum + e.weight, 0);
  return { cost: totalWeight, mstEdges };
}