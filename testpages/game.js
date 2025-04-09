// 游戏主对象
const game = {
    canvas: null,
    ctx: null,
    width: 600,
    height: 600,
    centerX: 300,
    centerY: 300,
    trackRadius: 200,
    trainRadius: 15,
    angle: 0, // 电车当前角度(弧度)
    speed: 0, // 当前速度(弧度/帧)
    maxSpeed: 0.03, // 最大速度
    acceleration: 0.001, // 加速度
    deceleration: 0.002, // 减速度
    brakingDistance: 0.2, // 开始制动的距离(弧度)
    stations: [
        { name: "Pigsty", angle: 0, color: "#FF6347", stopped: false },
        { name: "新桥", angle: Math.PI, color: "#4682B4", stopped: false }
    ],
    laps: 0,
    approachingStation: null,
    lastStation: null,
    gameLoopId: null,
    
    // 初始化游戏
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置事件监听
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // 移动端控制
        document.getElementById('btnAccelerate').addEventListener('click', () => this.accelerate());
        document.getElementById('btnBrake').addEventListener('click', () => this.brake());
        document.getElementById('btnStop').addEventListener('click', () => this.stop());
        
        // 开始游戏循环
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
        
        // 初始绘制
        this.draw();
    },
    
    // 游戏主循环
    gameLoop() {
        this.update();
        this.draw();
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    },
    
    // 更新游戏状态
    update() {
        // 更新电车位置
        this.angle += this.speed;
        
        // 标准化角度到0-2π范围
        this.angle = this.angle % (Math.PI * 2);
        if (this.angle < 0) this.angle += Math.PI * 2;
        
        // 检测是否完成一圈
        if (this.angle >= Math.PI * 2) {
            this.angle -= Math.PI * 2;
            this.laps++;
            document.getElementById('status').textContent = `已完成 ${this.laps} 圈 - 当前速度: ${this.getSpeedKmh()} km/h`;
        }
        
        // 检测车站接近状态
        this.checkStations();
    },
    
    // 绘制游戏
    draw() {
        const ctx = this.ctx;
        
        // 清空画布
        ctx.clearRect(0, 0, this.width, this.height);
        
        // 绘制轨道
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.trackRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 10;
        ctx.stroke();
        
        // 绘制车站
        this.stations.forEach(station => {
            const x = this.centerX + Math.cos(station.angle) * this.trackRadius;
            const y = this.centerY + Math.sin(station.angle) * this.trackRadius;
            
            // 车站标记
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fillStyle = station.color;
            ctx.fill();
            
            // 车站名称
            ctx.fillStyle = '#000';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(station.name, x, y - 15);
        });
        
        // 绘制电车
        const trainX = this.centerX + Math.cos(this.angle) * this.trackRadius;
        const trainY = this.centerY + Math.sin(this.angle) * this.trackRadius;
        
        ctx.beginPath();
        ctx.arc(trainX, trainY, this.trainRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FF0000';
        ctx.fill();
        
        // 绘制电车方向指示
        ctx.beginPath();
        ctx.moveTo(trainX, trainY);
        ctx.lineTo(
            trainX + Math.cos(this.angle) * this.trainRadius * 1.5,
            trainY + Math.sin(this.angle) * this.trainRadius * 1.5
        );
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 3;
        ctx.stroke();
    },
    
    // 键盘控制
    handleKeyDown(e) {
        switch(e.key) {
            case 'ArrowUp':
                this.accelerate();
                break;
            case 'ArrowDown':
                this.brake();
                break;
            case ' ':
                this.stop();
                break;
        }
    },
    
    // 加速
    accelerate() {
        if (this.speed < this.maxSpeed) {
            this.speed += this.acceleration;
            if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
            this.updateStatus();
        }
    },
    
    // 减速
    brake() {
        if (this.speed > 0) {
            this.speed -= this.deceleration;
            if (this.speed < 0) this.speed = 0;
            this.updateStatus();
        }
    },
    
    // 停车
    stop() {
        if (this.approachingStation && this.speed > 0) {
            this.speed = 0;
            this.stations[this.approachingStation.index].stopped = true;
            document.getElementById('status').textContent = `${this.approachingStation.name} 停靠成功!`;
            setTimeout(() => {
                this.stations[this.approachingStation.index].stopped = false;
                this.updateStatus();
            }, 2000);
        }
    },
    
    // 检查车站状态
    checkStations() {
        this.stations.forEach((station, index) => {
            // 计算到车站的角度差(考虑圆周)
            let angleDiff = (station.angle - this.angle + Math.PI * 2) % (Math.PI * 2);
            if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            
            // 如果接近车站且在制动距离内
            if (Math.abs(angleDiff) < this.brakingDistance && !station.stopped) {
                this.approachingStation = {
                    index,
                    name: station.name,
                    distance: angleDiff
                };
            } else if (this.approachingStation && this.approachingStation.index === index) {
                // 如果已经过了车站且没有停车
                if (!station.stopped && this.lastStation !== index) {
                    document.getElementById('status').textContent = `错过了 ${station.name} 车站!`;
                    setTimeout(() => this.updateStatus(), 2000);
                }
                this.approachingStation = null;
                this.lastStation = index;
            }
        });
    },
    
    // 更新状态显示
    updateStatus() {
        const statusElement = document.getElementById('status');
        if (this.approachingStation) {
            statusElement.textContent = `接近 ${this.approachingStation.name} - 当前速度: ${this.getSpeedKmh()} km/h (准备停车)`;
        } else {
            statusElement.textContent = `运行中 - 当前速度: ${this.getSpeedKmh()} km/h${this.laps > 0 ? ` - 已完成 ${this.laps} 圈` : ''}`;
        }
    },
    
    // 获取速度(km/h)
    getSpeedKmh() {
        // 将弧度/帧转换为km/h (假设轨道半径代表真实距离)
        const circumference = 2 * Math.PI * this.trackRadius;
        const speedPerFrame = this.speed * this.trackRadius; // 像素/帧
        const speedKmh = speedPerFrame * 60 * 60 / 1000; // 转换为km/h (假设1像素=1米)
        return Math.round(speedKmh * 100) / 100;
    }
};

// 启动游戏
window.onload = () => game.init();
