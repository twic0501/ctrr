// src/utils/scenarios.ts

export const SCENARIOS = [
    {
        id: 'real-map-hcm',
        name: '🗺️ Bản đồ thực tế (OSM)',
        description: 'Quận 1, TP.HCM. Đường đi được nắn theo đường phố thực tế.',
        algo: 'dijkstra',
        isDirected: false,
        center: [10.7769, 106.6953], 
        zoom: 15,
        startNode: '1',
        endNode: '4',
        
        nodes: [
            { id: '1', label: 'Chợ Bến Thành', lat: 10.7721, lng: 106.6983 },
            { id: '2', label: 'Nhà thờ Đức Bà', lat: 10.7798, lng: 106.6990 },
            { id: '3', label: 'Phố đi bộ Nguyễn Huệ', lat: 10.7744, lng: 106.7035 },
            { id: '4', label: 'Thảo Cầm Viên', lat: 10.7877, lng: 106.7052 },
            { id: '5', label: 'Dinh Độc Lập', lat: 10.7769, lng: 106.6953 }
        ],
        edges: [
            // 1. Bến Thành -> Dinh Độc Lập (Đi dọc Nam Kỳ Khởi Nghĩa)
            { 
                from: '1', to: '5', weight: 0.8, label: '0.8km',
                // Danh sách tọa độ các khúc cua (Geometry)
                geometry: [
                    [10.7721, 106.6983], // Bến Thành
                    [10.7735, 106.6995], // Lê Lợi
                    [10.7719, 106.7013], // Pasteur
                    [10.7765, 106.6957], // Nam Kỳ Khởi Nghĩa
                    [10.7769, 106.6953]  // Dinh
                ]
            },
            // 2. Dinh Độc Lập -> Nhà Thờ Đức Bà (Đi dọc Hàn Thuyên)
            { 
                from: '5', to: '2', weight: 0.6, label: '0.6km',
                geometry: [
                    [10.7769, 106.6953], // Dinh
                    [10.7785, 106.6975], // Công xã Paris
                    [10.7798, 106.6990]  // Nhà thờ
                ]
            },
            // 3. Nhà Thờ -> Thảo Cầm Viên (Đi dọc Lê Duẩn)
            { 
                from: '2', to: '4', weight: 1.5, label: '1.5km',
                geometry: [
                    [10.7798, 106.6990], // Nhà thờ
                    [10.7810, 106.7005], // Phạm Ngọc Thạch
                    [10.7877, 106.7052]  // Nguyễn Bỉnh Khiêm (TCV)
                ]
            },
            // 4. Bến Thành -> Phố đi bộ (Đi Lê Lợi)
            { from: '1', to: '3', weight: 1.2, label: '1.2km' }, // (Đoạn này để thẳng demo khác biệt)
            
            // Các cạnh khác...
            { from: '3', to: '2', weight: 0.9, label: '0.9km' },
            { from: '3', to: '4', weight: 2.1, label: '2.1km' }
        ]
    }
];