// 游戏主对象
const game = {
    trainAngle: 0,
    speed: 0,
    maxSpeed: 0.02,
    speedLevel: 0, // 0-5档
    speedLevels: [0, 0.004, 0.008, 0.012, 0.016, 0.02],
    acceleration: 0.0005,
    deceleration: 0.0008,
    brakingDeceleration: 0.0015,
    currentStationIndex: 0,
    approachingStation: null,
    isInStation: false,
    laps: 0,
    score: 0,
    totalStops: 0,
    successfulStops: 0,
    stations: [
        { name: "Pigsty", angle: 0 },
        { name: "新橋", angle: Math.PI }
    ],
    gameLoopId: null,
    kmhConversionFactor: 1800,
    meterConversionFactor: 1000,
    trackRadius: 500, // 虚拟轨道半径(用于距离计算)
    accelerating: false,
    braking: false,
    accelerationInterval: null,
    brakeInterval: null,
    
    // 初始化游戏
    init() {
        // 设置事件监听
        const accelerateBtn = document.getElementById('accelerate');
        const brakeBtn = document.getElementById('brake');
        const stopBtn = document.getElementById('stop');
        
        accelerateBtn.addEventListener('mousedown', this.startAccelerate.bind(this));
        accelerateBtn.addEventListener('touchstart', this.startAccelerate.bind(this), { passive: true });
        accelerateBtn.addEventListener('mouseup', this.stopAccelerate.bind(this));
        accelerateBtn.addEventListener('mouseleave', this.stopAccelerate.bind(this));
        accelerateBtn.addEventListener('touchend', this.stopAccelerate.bind(this), { passive: true });
        
        brakeBtn.addEventListener('mousedown', this.startBrake.bind(this));
        brakeBtn.addEventListener('touchstart', this.startBrake.bind(this), { passive: true });
        brakeBtn.addEventListener('mouseup', this.stopBrake.bind(this));
        brakeBtn.addEventListener('mouseleave', this.stopBrake.bind(this));
        brakeBtn.addEventListener('touchend', this.stopBrake.bind(this), { passive: true });
        
        stopBtn.addEventListener('click', this.stopTrain.bind(this));
        
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
        this.gameLoop();
    },
    
    // 游戏主循环
    gameLoop() {
        // 更新游戏状态
        this.update();
        
        // 继续循环
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    },
    
    // 停止游戏循环
    stopGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
    },
    
    // 更新游戏状态
    update() {
        // 更新电车位置
        this.trainAngle += this.speed;
        
        // 标准化角度
        if (this.trainAngle >= Math.PI * 2) {
            this.trainAngle -= Math.PI * 2;
            this.laps++;
            document.getElementById('lapsValue').textContent = this.laps;
        }
        
        // 更新速度档位
        this.updateSpeedLevel();
        
        // 检测车站接近状态
        this.checkStations();
        
        // 更新UI信息
        this.updateUI();
    },
    
    // 更新UI信息
    updateUI() {
        // 更新速度显示
        const speedKmh = Math.floor(this.speed * this.kmhConversionFactor);
        document.querySelector('.speed-value').textContent = `${speedKmh} km/h`;
        
        // 更新到下一站距离
        if (this.approachingStation !== null) {
            const nextStation = this.stations[this.approachingStation];
            let angleDiff = nextStation.angle - this.trainAngle;
            if (angleDiff < 0) angleDiff += Math.PI * 2;
            const distance = Math.floor(angleDiff * this.trackRadius * this.meterConversionFactor);
            document.querySelector('.distance-value').textContent = `${distance} m`;
        } else {
            document.querySelector('.distance-value').textContent = "0 m";
        }
    },
    
    // 更新速度档位显示
    updateSpeedLevel() {
        const notches = document.querySelectorAll('.speed-notch');
        notches.forEach((notch, index) => {
            if (index <= this.speedLevel) {
                notch.classList.add('active');
            } else {
                notch.classList.remove('active');
            }
        });
    },
    
    // 检查车站状态
    checkStations() {
        const nextStationIndex = (this.currentStationIndex + 1) % this.stations.length;
        const nextStation = this.stations[nextStationIndex];
        
        // 计算到下一个车站的角度差
        let angleDiff = nextStation.angle - this.trainAngle;
        if (angleDiff < 0) angleDiff += Math.PI * 2;
        
        // 如果接近车站
        if (angleDiff < 0.15 && !this.isInStation) {
            this.approachingStation = nextStationIndex;
            
            // 更新下一站信息
            document.querySelector('.next-station').textContent = nextStation.name;
            
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
            this.totalStops++;
            
            // 如果速度足够低，可以停车
            if (this.speed < 0.001) {
                // 计算停靠精度 (0-100%)
                const stopAccuracy = Math.max(0, 100 - Math.floor(Math.abs(angleDiff - 0.01) * 10000));
                this.successfulStops++;
                
                // 更新分数 (基础分+精度奖励)
                const baseScore = 100;
                const accuracyBonus = stopAccuracy;
                this.score += baseScore + accuracyBonus;
                
                this.showMessage(`${nextStation.name} 停車成功! 精度: ${stopAccuracy}%`);
                this.updateScore();
                
                this.currentStationIndex = nextStationIndex;
                document.querySelector('.current-station').textContent = nextStation.name;
                
                // 更新下一站信息
                const newNextIndex = (this.currentStationIndex + 1) % this.stations.length;
                document.querySelector('.next-station').textContent = this.stations[newNextIndex].name;
                
                // 模拟停车时间
                setTimeout(() => {
                    this.isInStation = false;
                }, 3000);
            } else {
                this.showMessage(`通過: ${nextStation.name}`);
                this.updateScore();
                
                setTimeout(() => {
                    this.isInStation = false;
                    this.currentStationIndex = nextStationIndex;
                    document.querySelector('.current-station').textContent = nextStation.name;
                    
                    // 更新下一站信息
                    const newNextIndex = (this.currentStationIndex + 1) % this.stations.length;
                    document.querySelector('.next-station').textContent = this.stations[newNextIndex].name;
                }, 1000);
            }
            
            this.approachingStation = null;
        }
    },
    
    // 更新分数显示
    updateScore() {
        document.getElementById('scoreValue').textContent = this.score;
        const accuracy = this.totalStops > 0 ? Math.floor((this.successfulStops / this.totalStops) * 100) : 0;
        document.getElementById('accuracyValue').textContent = accuracy;
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
        if (this.speedLevel < 5 && !this.isInStation && !this.accelerating) {
            this.accelerating = true;
            this.accelerationInterval = setInterval(() => {
                this.speed = Math.min(this.speed + this.acceleration, this.speedLevels[this.speedLevel + 1]);
                if (this.speed >= this.speedLevels[this.speedLevel + 1] * 0.95) {
                    this.speedLevel = Math.min(this.speedLevel + 1, 5);
                    this.stopAccelerate();
                }
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
        if (this.speedLevel > 0 && !this.braking) {
            this.braking = true;
            this.brakeInterval = setInterval(() => {
                this.speed = Math.max(this.speed - this.deceleration, this.speedLevels[this.speedLevel - 1]);
                if (this.speed <= this.speedLevels[this.speedLevel - 1] * 1.05) {
                    this.speedLevel = Math.max(this.speedLevel - 1, 0);
                    this.stopBrake();
                }
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
            clearInterval(this.brakeInterval);
            this.brakeInterval = setInterval(() => {
                this.speed = Math.max(this.speed - this.brakingDeceleration, 0);
                if (this.speed === 0) {
                    this.speedLevel = 0;
                    this.stopBrake();
                }
            }, 16);
        }
    }
};

// 启动游戏
window.onload = () => game.init();

// 确保游戏循环在页面卸载时停止
window.addEventListener('beforeunload', () => {
    game.stopGameLoop();
});
