// src/algorithms/bfs.ts

export interface BFSResult {
  visitedOrder: string[]; // Thứ tự các đỉnh được duyệt
  previous: Record<string, string | null>; // Để vẽ cây BFS (mũi tên từ cha sang con)
  error?: string;
}

export function bfs(adjList: any, start: string): BFSResult {
  if (!adjList[start]) return { visitedOrder: [], previous: {}, error: `❌ Không tìm thấy điểm bắt đầu "${start}"` };

  const queue: string[] = [start];
  const visited = new Set<string>();
  const previous: Record<string, string | null> = {};
  const visitedOrder: string[] = []; 

  visited.add(start);
  previous[start] = null;

  let safety = 0;

  while (queue.length > 0) {
    if (++safety > 5000) return { visitedOrder: [], previous: {}, error: "Lỗi vòng lặp!" };
    
    const u = queue.shift()!;
    visitedOrder.push(u);

    const neighbors = adjList[u] || [];
    for (const [v] of neighbors) {
      if (!visited.has(v)) {
        visited.add(v);
        previous[v] = u; // Ghi nhận cha để vẽ cạnh cây BFS
        queue.push(v);
      }
    }
  }

  return { visitedOrder, previous };
}