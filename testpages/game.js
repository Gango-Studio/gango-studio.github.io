// 游戏主对象
const game = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0,
    trackRadius: 0,
    trainAngle: 0,
    speed: 0,
    maxSpeed: 0.02,
    acceleration: 0.0003,
    deceleration: 0.0005,
    brakingDeceleration: 0.001,
    currentStationIndex: 0,
    approachingStation: null,
    isInStation: false,
    laps: 0,
    stations: [
        { name: "Pigsty", angle: 0, color: "#FF6347" },
        { name: "新橋", angle: Math.PI, color: "#4682B4" }
    ],
    gameLoopId: null,
    lastFrameTime: 0,
    frameCount: 0,
    fps: 0,
    kmhConversionFactor: 1800,
    accelerating: false,
    braking: false,
    
    // 初始化游戏
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布大小为窗口大小
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // 设置事件监听
        document.getElementById('accelerate').addEventListener('mousedown', () => this.startAccelerate());
        document.getElementById('accelerate').addEventListener('touchstart', () => this.startAccelerate());
        document.getElementById('accelerate').addEventListener('mouseup', () => this.stopAccelerate());
        document.getElementById('accelerate').addEventListener('touchend', () => this.stopAccelerate());
        
        document.getElementById('brake').addEventListener('mousedown', () => this.startBrake());
        document.getElementById('brake').addEventListener('touchstart', () => this.startBrake());
        document.getElementById('brake').addEventListener('mouseup', () => this.stopBrake());
        document.getElementById('brake').addEventListener('touchend', () => this.stopBrake());
        
        document.getElementById('stop').addEventListener('click', () => this.stopTrain());
        
        // 键盘控制
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') this.startAccelerate();
            if (e.key === 'ArrowDown') this.startBrake();
            if (e.key === ' ') this.stopTrain();
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowUp') this.stopAccelerate();
            if (e.key === 'ArrowDown') this.stopBrake();
        });
        
        // 开始游戏循环
        this.lastFrameTime = performance.now();
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    },
    
    // 调整画布大小
    resizeCanvas() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.trackRadius = Math.min(this.width, this.height) * 0.4;
    },
    
    // 游戏主循环
    gameLoop(timestamp) {
        // 计算FPS
        this.frameCount++;
        if (timestamp >= this.lastFrameTime + 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = timestamp;
        }
        
        // 更新游戏状态
        this.update();
        
        // 绘制游戏
        this.draw();
        
        // 继续循环
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    },
    
    // 更新游戏状态
    update() {
        // 更新电车位置
        this.trainAngle += this.speed;
        
        // 标准化角度
        if (this.trainAngle >= Math.PI * 2) {
            this.trainAngle -= Math.PI * 2;
            this.laps++;
            document.getElementById('laps').textContent = `周回数: ${this.laps}`;
        }
        
        // 检测车站接近状态
        this.checkStations();
        
        // 更新速度显示
        document.getElementById('speedDisplay').textContent = 
            `${Math.floor(this.speed * this.kmhConversionFactor)} km/h`;
    },
    
    // 绘制游戏
    draw() {
        const ctx = this.ctx;
        
        // 清空画布
        ctx.clearRect(0, 0, this.width, this.height);
        
        // 绘制背景
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // 绘制轨道
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.trackRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 10;
        ctx.stroke();
        
        // 绘制轨道内部
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.trackRadius - 20, 0, Math.PI * 2);
        ctx.fillStyle = '#222';
        ctx.fill();
        
        // 绘制车站
        this.stations.forEach((station, index) => {
            const angle = station.angle;
            const x = this.centerX + Math.cos(angle) * this.trackRadius;
            const y = this.centerY + Math.sin(angle) * this.trackRadius;
            
            // 车站标记
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = station.color;
            ctx.fill();
            
            // 当前车站高亮显示
            if (index === this.currentStationIndex) {
                ctx.beginPath();
                ctx.arc(x, y, 12, 0, Math.PI * 2);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            
            // 车站名称
            ctx.fillStyle = '#fff';
            ctx.font = '14px "MS Gothic", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(station.name, x, y - 15);
        });
        
        // 绘制电车
        const trainX = this.centerX + Math.cos(this.trainAngle) * this.trackRadius;
        const trainY = this.centerY + Math.sin(this.trainAngle) * this.trackRadius;
        
        // 电车主体
        ctx.beginPath();
        ctx.arc(trainX, trainY, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#0f0';
        ctx.fill();
        
        // 电车窗户
        ctx.beginPath();
        ctx.arc(trainX, trainY, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        
        // 电车方向指示
        ctx.beginPath();
        ctx.moveTo(trainX, trainY);
        ctx.lineTo(
            trainX + Math.cos(this.trainAngle) * 25,
            trainY + Math.sin(this.trainAngle) * 25
        );
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 绘制速度表
        this.drawSpeedMeter();
    },
    
    // 绘制速度表
    drawSpeedMeter() {
        const ctx = this.ctx;
        const centerX = this.width - 100;
        const centerY = 100;
        const radius = 50;
        
        // 速度表背景
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
        
        // 速度表刻度
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 速度指针
        const speedRatio = this.speed / this.maxSpeed;
        const pointerAngle = Math.PI * 1.5 + Math.PI * speedRatio;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(pointerAngle) * radius * 0.8,
            centerY + Math.sin(pointerAngle) * radius * 0.8
        );
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 速度表中心点
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    },
    
    // 检查车站状态
    checkStations() {
        const nextStationIndex = (this.currentStationIndex + 1) % this.stations.length;
        const nextStation = this.stations[nextStationIndex];
        
        // 计算到下一个车站的角度差
        let angleDiff = nextStation.angle - this.trainAngle;
        if (angleDiff < 0) angleDiff += Math.PI * 2;
        
        // 如果接近车站
        if (angleDiff < 0.1 && !this.isInStation) {
            this.approachingStation = nextStationIndex;
            
            // 更新下一站信息
            document.getElementById('nextStation').textContent = `次: ${nextStation.name}`;
            
            // 计算需要的减速度
            const requiredDeceleration = (this.speed * this.speed) / (2 * angleDiff);
            
            // 如果速度过快无法停车
            if (requiredDeceleration > this.brakingDeceleration * 1.5) {
                this.showMessage("減速不足! 速度を落としてください!");
            }
        }
        
        // 如果进入车站区域
        if (angleDiff < 0.02) {
            this.isInStation = true;
            this.approachingStation = null;
            
            // 如果速度足够低，可以停车
            if (this.speed < 0.001) {
                this.currentStationIndex = nextStationIndex;
                this.showMessage(`${nextStation.name} 停車成功!`);
                document.getElementById('stationInfo').textContent = `現在: ${nextStation.name}`;
                
                // 更新下一站信息
                const newNextIndex = (this.currentStationIndex + 1) % this.stations.length;
                document.getElementById('nextStation').textContent = `次: ${this.stations[newNextIndex].name}`;
                
                // 模拟停车时间
                setTimeout(() => {
                    this.isInStation = false;
                }, 3000);
            }
        }
    },
    
    // 显示消息
    showMessage(msg) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = msg;
        messageElement.style.display = 'block';
        
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 2000);
    },
    
    // 开始加速
    startAccelerate() {
        if (this.speed < this.maxSpeed && !this.isInStation) {
            this.accelerating = true;
            this.accelerationInterval = setInterval(() => {
                this.speed = Math.min(this.speed + this.acceleration, this.maxSpeed);
            }, 16);
        }
    },
    
    // 停止加速
    stopAccelerate() {
        if (this.accelerating) {
            clearInterval(this.accelerationInterval);
            this.accelerating = false;
        }
    },
    
    // 开始减速
    startBrake() {
        if (this.speed > 0) {
            this.braking = true;
            this.brakeInterval = setInterval(() => {
                this.speed = Math.max(this.speed - this.deceleration, 0);
            }, 16);
        }
    },
    
    // 停止减速
    stopBrake() {
        if (this.braking) {
            clearInterval(this.brakeInterval);
            this.braking = false;
        }
    },
    
    // 停车
    stopTrain() {
        if (this.approachingStation !== null && !this.isInStation) {
            this.braking = true;
            this.brakeInterval = setInterval(() => {
                this.speed = Math.max(this.speed - this.brakingDeceleration, 0);
                if (this.speed === 0) {
                    clearInterval(this.brakeInterval);
                    this.braking = false;
                }
            }, 16);
        }
    }
};

// 启动游戏
window.onload = () => game.init();
