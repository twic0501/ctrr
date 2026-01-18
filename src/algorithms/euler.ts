// src/algorithms/euler.ts

// --- HELPER: Kiểm tra điều kiện Euler ---
function checkEulerCondition(adjList: any, isDirected: boolean) {
  let oddDegreeCount = 0;
  // FIX: Định nghĩa rõ kiểu cho startNode
  let startNode: string | null = null;
  let inDegree: Record<string, number> = {};
  let outDegree: Record<string, number> = {};

  const nodes = Object.keys(adjList);
  nodes.forEach(n => { inDegree[n] = 0; outDegree[n] = 0; });

  // Tính bậc
  for (let u in adjList) {
    outDegree[u] = adjList[u].length;
    for (const [v] of adjList[u]) {
      if (!inDegree[v]) inDegree[v] = 0;
      inDegree[v]++;
    }
  }

  if (!isDirected) {
    // Vô hướng: Đếm số đỉnh bậc lẻ
    for (let u in adjList) {
      if (adjList[u].length % 2 !== 0) {
        oddDegreeCount++;
        startNode = u; // Nếu là đường Euler, phải bắt đầu từ đỉnh bậc lẻ
      }
    }
    // Euler Circuit: 0 đỉnh lẻ. Euler Path: 2 đỉnh lẻ.
    if (oddDegreeCount === 0) return { isValid: true, startNode: nodes[0], type: 'Circuit' };
    if (oddDegreeCount === 2) return { isValid: true, startNode: startNode!, type: 'Path' };
    return { isValid: false, error: `Vô hướng: Có ${oddDegreeCount} đỉnh bậc lẻ (Chỉ cho phép 0 hoặc 2)` };
  } else {
    // Có hướng: Check In/Out degree
    let startNodes = 0;
    let endNodes = 0;
    for (let u of nodes) {
      if (outDegree[u] === inDegree[u]) continue;
      else if (outDegree[u] === inDegree[u] + 1) { startNode = u; startNodes++; }
      else if (inDegree[u] === outDegree[u] + 1) endNodes++;
      else return { isValid: false, error: `Có hướng: Đỉnh ${u} mất cân bằng In/Out` };
    }
    
    if (startNodes === 0 && endNodes === 0) return { isValid: true, startNode: nodes[0], type: 'Circuit' };
    if (startNodes === 1 && endNodes === 1) return { isValid: true, startNode: startNode!, type: 'Path' };
    return { isValid: false, error: "Có hướng: Không thỏa mãn điều kiện Euler" };
  }
}

// ==========================================
// 1. FLEURY'S ALGORITHM (Chậm, O(E^2), dễ hiểu)
// ==========================================
export function fleury(adjListInput: any, isDirected: boolean) {
  // Deep copy để không làm hỏng dữ liệu gốc
  const adjList = JSON.parse(JSON.stringify(adjListInput));
  
  // Kiểm tra điều kiện
  const check = checkEulerCondition(adjList, isDirected);
  if (!check.isValid) return { error: check.error };

  const path: string[] = [];
  let curr = check.startNode!; // Thêm ! vì chắc chắn có giá trị nếu isValid = true
  path.push(curr);

  // Helper: Đếm số đỉnh có thể đến được (BFS) để kiểm tra cầu
  const countReachable = (u: string, tempAdj: any): number => {
    const visited = new Set<string>();
    const queue = [u];
    visited.add(u);
    while(queue.length > 0) {
        const node = queue.shift()!;
        const neighbors = tempAdj[node] || [];
        for(const [v] of neighbors) {
            if(!visited.has(v)) { visited.add(v); queue.push(v); }
        }
    }
    return visited.size;
  };

  // Helper: Xóa cạnh
  const removeEdge = (u: string, v: string) => {
    if (adjList[u]) {
      adjList[u] = adjList[u].filter((edge: any) => edge[0] !== v);
    }
    if (!isDirected && adjList[v]) {
      adjList[v] = adjList[v].filter((edge: any) => edge[0] !== u);
    }
  };

  // Vòng lặp chính
  // Tổng số cạnh
  let edgeCount = 0;
  for(let u in adjList) edgeCount += adjList[u].length;
  if(!isDirected) edgeCount /= 2;

  while (edgeCount > 0) {
    if (!adjList[curr] || adjList[curr].length === 0) break;

    const neighbors = adjList[curr];
    // FIX: Đổi kiểu từ số (-1) sang string | null
    let chosenV: string | null = null; 

    if (neighbors.length === 1) {
        // Chỉ có 1 đường, bắt buộc đi
        chosenV = neighbors[0][0];
    } else {
        // Có nhiều đường, tránh Cầu (Bridge)
        for (const [v] of neighbors) {
            const countBefore = countReachable(curr, adjList);
            
            // Thử xóa cạnh
            removeEdge(curr, v);
            const countAfter = countReachable(curr, adjList);
            
            // Hoàn tác xóa để thử tiếp
            if (!adjList[curr]) adjList[curr] = [];
            adjList[curr].push([v, 1]); // Weight giả
            if (!isDirected) {
                 if (!adjList[v]) adjList[v] = [];
                 adjList[v].push([curr, 1]);
            }

            if (countBefore === countAfter) {
                chosenV = v; // Không phải cầu -> Đi luôn
                break;
            }
        }
        // Nếu tất cả đều là cầu, chọn đại cái đầu
        if (chosenV === null) chosenV = neighbors[0][0];
    }

    // Đi thật (Dùng ! vì logic đảm bảo chosenV ko null)
    removeEdge(curr, chosenV!);
    edgeCount--;
    curr = chosenV!;
    path.push(curr);
  }

  return { path, type: check.type };
}

// ==========================================
// 2. HIERHOLZER'S ALGORITHM (Nhanh, O(E), dùng Stack)
// ==========================================
export function hierholzer(adjListInput: any, isDirected: boolean) {
  // Deep copy
  const adjList = JSON.parse(JSON.stringify(adjListInput));
  
  const check = checkEulerCondition(adjList, isDirected);
  if (!check.isValid) return { error: check.error };

  const circuit: string[] = []; // Kết quả cuối cùng
  const stack: string[] = [];   // Stack tạm
  let curr = check.startNode!;
  
  stack.push(curr);

  while (stack.length > 0) {
    // Nếu đỉnh hiện tại còn cạnh nối
    if (adjList[curr] && adjList[curr].length > 0) {
        stack.push(curr); // Lưu lại điểm này để quay lại
        
        const nextEdge = adjList[curr].pop(); // Lấy 1 cạnh và xóa luôn
        const next = nextEdge[0];

        // Nếu vô hướng, phải xóa cả chiều ngược lại
        if (!isDirected && adjList[next]) {
             const index = adjList[next].findIndex((e:any) => e[0] === curr);
             if(index !== -1) adjList[next].splice(index, 1);
        }

        curr = next; // Đi tiếp
    } else {
        // Hết đường đi, quay lui (backtrack) và ghi vào kết quả
        circuit.push(curr);
        // FIX: Thêm ! vì stack.length > 0 nên pop() không bao giờ undefined
        curr = stack.pop()!;
    }
  }
  
  // Hierholzer ghi kết quả ngược, cần đảo lại
  return { path: circuit.reverse(), type: check.type };
}