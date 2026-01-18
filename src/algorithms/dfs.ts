// src/algorithms/dfs.ts

export interface DFSResult {
  visitedOrder: string[];
  previous: Record<string, string | null>;
  error?: string;
}

export function dfs(adjList: any, start: string): DFSResult {
  if (!adjList[start]) return { visitedOrder: [], previous: {}, error: `❌ Không tìm thấy điểm bắt đầu "${start}"` };

  const stack: string[] = [start];
  const visited = new Set<string>();
  const previous: Record<string, string | null> = {};
  const visitedOrder: string[] = [];

  previous[start] = null;
  let safety = 0;

  while (stack.length > 0) {
    if (++safety > 5000) return { visitedOrder: [], previous: {}, error: "Lỗi vòng lặp!" };
    
    const u = stack.pop()!;

    if (!visited.has(u)) {
      visited.add(u);
      visitedOrder.push(u);

      const neighbors = adjList[u] || [];
      // Đảo ngược mảng neighbors để khi push vào stack, phần tử đầu tiên được lấy ra trước
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const [v] = neighbors[i]; // Đã sửa lỗi cú pháp 'of' thành '='
        if (!visited.has(v)) {
           if (!previous[v]) previous[v] = u; // Ghi nhận cha
           stack.push(v);
        }
      }
    }
  }

  return { visitedOrder, previous };
}