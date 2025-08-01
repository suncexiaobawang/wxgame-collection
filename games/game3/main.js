// 飞机大战游戏

class Game {
  constructor(canvas, onExit, onGameOver) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.width = canvas.width
    this.height = canvas.height
    this.onExit = onExit
    this.onGameOver = onGameOver
    
    // 游戏状态
    this.state = 'start' // start, playing, gameover
    this.score = 0
    this.lives = 3
    this.level = 1
    this.levelThreshold = 1000 // 每1000分升级一次
    
    // 玩家飞机
    this.player = {
      x: this.width / 2,
      y: this.height - 100,
      width: 60,
      height: 60,
      speed: 5,
      color: '#3498db',
      shield: false,
      shieldTime: 0,
      rapidFire: false,
      rapidFireTime: 0,
      invincible: false,
      invincibleTime: 0
    }
    
    // 子弹系统
    this.bullets = []
    this.bulletCooldown = 0
    this.bulletCooldownTime = 15 // 15帧发射一次
    this.bulletSpeed = 10
    
    // 敌人系统
    this.enemies = []
    this.enemySpawnTime = 60 // 60帧生成一个敌人
    this.enemySpawnCounter = 0
    
    // 道具系统
    this.powerups = []
    this.powerupTypes = [
      { type: 'life', color: '#2ecc71', chance: 0.2 },
      { type: 'shield', color: '#f39c12', chance: 0.4 },
      { type: 'rapidFire', color: '#e74c3c', chance: 0.4 }
    ]
    this.powerupSpawnChance = 0.05 // 5%几率在敌人死亡时生成道具
    
    // 爆炸效果
    this.explosions = []
    
    // 触摸控制
    this.touchX = 0
    this.touchY = 0
    this.isTouching = false
    
    // 返回按钮
    this.backButton = {
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      color: 'rgba(255, 255, 255, 0.5)'
    }
    
    // 初始化
    this.init()
  }
  
  init() {
    // 添加触摸事件监听
    this.touchStartHandler = this.handleTouchStart.bind(this)
    this.touchMoveHandler = this.handleTouchMove.bind(this)
    this.touchEndHandler = this.handleTouchEnd.bind(this)
    
    this.canvas.addEventListener('touchstart', this.touchStartHandler)
    this.canvas.addEventListener('touchmove', this.touchMoveHandler)
    this.canvas.addEventListener('touchend', this.touchEndHandler)
    
    // 开始游戏循环
    this.lastTime = 0
    this.animate(0)
  }
  
  // 触摸事件处理
  handleTouchStart(e) {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = this.canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    
    this.touchX = x
    this.touchY = y
    this.isTouching = true
    
    // 检查是否点击了返回按钮
    if (this.isPointInRect(x, y, this.backButton)) {
      this.exitGame()
      return
    }
    
    // 如果在开始界面，点击任意位置开始游戏
    if (this.state === 'start') {
      this.state = 'playing'
      return
    }
    
    // 如果在游戏结束界面，点击任意位置重新开始
    if (this.state === 'gameover') {
      this.resetGame()
      return
    }
  }
  
  handleTouchMove(e) {
    e.preventDefault()
    if (!this.isTouching || this.state !== 'playing') return
    
    const touch = e.touches[0]
    const rect = this.canvas.getBoundingClientRect()
    this.touchX = touch.clientX - rect.left
    this.touchY = touch.clientY - rect.top
    
    // 移动玩家飞机到触摸位置
    this.player.x = this.touchX - this.player.width / 2
    this.player.y = this.touchY - this.player.height / 2
    
    // 限制玩家飞机在画布范围内
    this.player.x = Math.max(0, Math.min(this.width - this.player.width, this.player.x))
    this.player.y = Math.max(0, Math.min(this.height - this.player.height, this.player.y))
  }
  
  handleTouchEnd(e) {
    e.preventDefault()
    this.isTouching = false
  }
  
  // 游戏循环
  animate(timestamp) {
    // 计算帧时间差
    const deltaTime = timestamp - this.lastTime
    this.lastTime = timestamp
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.width, this.height)
    
    // 根据游戏状态更新和渲染
    if (this.state === 'start') {
      this.renderStartScreen()
    } else if (this.state === 'playing') {
      this.update(deltaTime)
      this.render()
    } else if (this.state === 'gameover') {
      this.renderGameOverScreen()
    }
    
    // 继续下一帧
    this.animationId = requestAnimationFrame(this.animate.bind(this))
  }
  
  // 更新游戏状态
  update(deltaTime) {
    // 更新玩家状态
    if (this.player.shield && this.player.shieldTime > 0) {
      this.player.shieldTime--
      if (this.player.shieldTime <= 0) {
        this.player.shield = false
      }
    }
    
    if (this.player.rapidFire && this.player.rapidFireTime > 0) {
      this.player.rapidFireTime--
      if (this.player.rapidFireTime <= 0) {
        this.player.rapidFire = false
        this.bulletCooldownTime = 15 // 恢复正常射速
      }
    }
    
    if (this.player.invincible && this.player.invincibleTime > 0) {
      this.player.invincibleTime--
      if (this.player.invincibleTime <= 0) {
        this.player.invincible = false
      }
    }
    
    // 更新子弹冷却
    if (this.bulletCooldown > 0) {
      this.bulletCooldown--
    }
    
    // 如果正在触摸屏幕且子弹冷却结束，发射子弹
    if (this.isTouching && this.bulletCooldown <= 0) {
      this.shootBullet()
      this.bulletCooldown = this.bulletCooldownTime
    }
    
    // 更新子弹位置
    this.updateBullets()
    
    // 生成敌人
    this.enemySpawnCounter++
    if (this.enemySpawnCounter >= this.enemySpawnTime) {
      this.spawnEnemy()
      this.enemySpawnCounter = 0
    }
    
    // 更新敌人位置
    this.updateEnemies()
    
    // 更新道具位置
    this.updatePowerups()
    
    // 更新爆炸效果
    this.updateExplosions()
    
    // 检测碰撞
    this.checkCollisions()
    
    // 检查关卡提升
    if (this.score >= this.level * this.levelThreshold) {
      this.level++
      // 每提升一级，敌人生成速度加快
      this.enemySpawnTime = Math.max(10, this.enemySpawnTime - 5)
    }
  }
  
  // 发射子弹
  shootBullet() {
    // 创建主子弹
    const mainBullet = {
      x: this.player.x + this.player.width / 2 - 5,
      y: this.player.y,
      width: 10,
      height: 20,
      speed: this.bulletSpeed,
      color: '#f1c40f'
    }
    this.bullets.push(mainBullet)
    
    // 如果有快速射击能力，额外发射两侧子弹
    if (this.player.rapidFire) {
      // 左侧子弹
      const leftBullet = {
        x: this.player.x + 10,
        y: this.player.y + 10,
        width: 8,
        height: 16,
        speed: this.bulletSpeed,
        color: '#e67e22'
      }
      
      // 右侧子弹
      const rightBullet = {
        x: this.player.x + this.player.width - 18,
        y: this.player.y + 10,
        width: 8,
        height: 16,
        speed: this.bulletSpeed,
        color: '#e67e22'
      }
      
      this.bullets.push(leftBullet, rightBullet)
    }
  }
  
  // 更新子弹位置
  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i]
      bullet.y -= bullet.speed
      
      // 如果子弹超出屏幕，移除子弹
      if (bullet.y + bullet.height < 0) {
        this.bullets.splice(i, 1)
      }
    }
  }
  
  // 生成敌人
  spawnEnemy() {
    // 随机敌人尺寸和速度
    const size = Math.random() * 30 + 30 // 30-60
    const speed = Math.random() * 2 + 1 + (this.level * 0.2) // 基础速度1-3，随等级增加
    
    const enemy = {
      x: Math.random() * (this.width - size),
      y: -size,
      width: size,
      height: size,
      speed: speed,
      color: `hsl(${Math.random() * 360}, 70%, 50%)` // 随机颜色
    }
    
    this.enemies.push(enemy)
  }
  
  // 更新敌人位置
  updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      enemy.y += enemy.speed
      
      // 如果敌人超出屏幕底部，移除敌人并减少生命值
      if (enemy.y > this.height) {
        this.enemies.splice(i, 1)
        if (!this.player.invincible) {
          this.lives--
          // 受到伤害后短暂无敌
          this.player.invincible = true
          this.player.invincibleTime = 60 // 60帧无敌时间
          
          // 检查游戏是否结束
          if (this.lives <= 0) {
            this.gameOver()
          }
        }
      }
    }
  }
  
  // 生成道具
  spawnPowerup(x, y) {
    // 根据概率权重选择道具类型
    const totalChance = this.powerupTypes.reduce((sum, type) => sum + type.chance, 0)
    let random = Math.random() * totalChance
    let selectedType = null
    
    for (const type of this.powerupTypes) {
      random -= type.chance
      if (random <= 0) {
        selectedType = type
        break
      }
    }
    
    if (!selectedType) selectedType = this.powerupTypes[0]
    
    const powerup = {
      x: x,
      y: y,
      width: 30,
      height: 30,
      speed: 2,
      type: selectedType.type,
      color: selectedType.color
    }
    
    this.powerups.push(powerup)
  }
  
  // 更新道具位置
  updatePowerups() {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i]
      powerup.y += powerup.speed
      
      // 如果道具超出屏幕底部，移除道具
      if (powerup.y > this.height) {
        this.powerups.splice(i, 1)
      }
    }
  }
  
  // 创建爆炸效果
  createExplosion(x, y, size) {
    const particleCount = Math.floor(size / 2) // 粒子数量与尺寸相关
    const explosion = {
      particles: [],
      life: 30 // 爆炸效果持续30帧
    }
    
    for (let i = 0; i < particleCount; i++) {
      const speed = Math.random() * 3 + 1
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * (size / 4) + 2
      
      explosion.particles.push({
        x: x,
        y: y,
        radius: radius,
        speed: speed,
        angle: angle,
        color: Math.random() > 0.5 ? '#e74c3c' : '#f39c12' // 红色或黄色
      })
    }
    
    this.explosions.push(explosion)
  }
  
  // 更新爆炸效果
  updateExplosions() {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const explosion = this.explosions[i]
      
      // 更新每个粒子的位置
      for (const particle of explosion.particles) {
        particle.x += Math.cos(particle.angle) * particle.speed
        particle.y += Math.sin(particle.angle) * particle.speed
        particle.radius *= 0.95 // 粒子逐渐缩小
      }
      
      explosion.life--
      
      // 如果爆炸效果生命结束，移除爆炸
      if (explosion.life <= 0) {
        this.explosions.splice(i, 1)
      }
    }
  }
  
  // 碰撞检测
  checkCollisions() {
    // 检测子弹与敌人的碰撞
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i]
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j]
        
        if (this.isCollision(bullet, enemy)) {
          // 移除子弹和敌人
          this.bullets.splice(i, 1)
          
          // 创建爆炸效果
          this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width)
          
          // 增加分数
          this.score += Math.floor(enemy.width) // 大小越大，分数越高
          
          // 随机生成道具
          if (Math.random() < this.powerupSpawnChance) {
            this.spawnPowerup(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2)
          }
          
          this.enemies.splice(j, 1)
          break
        }
      }
    }
    
    // 检测玩家与敌人的碰撞
    if (!this.player.invincible) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]
        
        if (this.isCollision(this.player, enemy)) {
          // 创建爆炸效果
          this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width)
          
          // 移除敌人
          this.enemies.splice(i, 1)
          
          // 如果有护盾，消耗护盾
          if (this.player.shield) {
            this.player.shield = false
            this.player.shieldTime = 0
          } else {
            // 否则减少生命值
            this.lives--
            
            // 受到伤害后短暂无敌
            this.player.invincible = true
            this.player.invincibleTime = 60 // 60帧无敌时间
            
            // 检查游戏是否结束
            if (this.lives <= 0) {
              this.gameOver()
              break
            }
          }
        }
      }
    }
    
    // 检测玩家与道具的碰撞
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i]
      
      if (this.isCollision(this.player, powerup)) {
        // 应用道具效果
        this.applyPowerup(powerup.type)
        
        // 移除道具
        this.powerups.splice(i, 1)
      }
    }
  }
  
  // 应用道具效果
  applyPowerup(type) {
    switch (type) {
      case 'life':
        // 增加生命值
        this.lives = Math.min(this.lives + 1, 5) // 最多5条命
        break
      case 'shield':
        // 激活护盾
        this.player.shield = true
        this.player.shieldTime = 300 // 300帧护盾时间
        break
      case 'rapidFire':
        // 激活快速射击
        this.player.rapidFire = true
        this.player.rapidFireTime = 300 // 300帧快速射击时间
        this.bulletCooldownTime = 5 // 加快射速
        break
    }
  }
  
  // 矩形碰撞检测
  isCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  }
  
  // 点与矩形碰撞检测
  isPointInRect(x, y, rect) {
    return (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    )
  }
  
  // 渲染游戏
  render() {
    // 绘制星空背景
    this.renderStarBackground()
    
    // 绘制玩家飞机
    this.ctx.fillStyle = this.player.color
    
    // 如果玩家处于无敌状态，闪烁效果
    if (this.player.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
      this.ctx.globalAlpha = 0.5
    }
    
    this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height)
    this.ctx.globalAlpha = 1.0
    
    // 如果有护盾，绘制护盾
    if (this.player.shield) {
      this.ctx.strokeStyle = '#f39c12'
      this.ctx.lineWidth = 3
      this.ctx.beginPath()
      this.ctx.arc(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        this.player.width / 1.5,
        0,
        Math.PI * 2
      )
      this.ctx.stroke()
    }
    
    // 如果有快速射击，绘制特效
    if (this.player.rapidFire) {
      this.ctx.fillStyle = 'rgba(231, 76, 60, 0.3)'
      this.ctx.beginPath()
      this.ctx.moveTo(this.player.x, this.player.y + this.player.height)
      this.ctx.lineTo(this.player.x + this.player.width / 2, this.player.y + this.player.height + 20)
      this.ctx.lineTo(this.player.x + this.player.width, this.player.y + this.player.height)
      this.ctx.closePath()
      this.ctx.fill()
    }
    
    // 绘制子弹
    for (const bullet of this.bullets) {
      this.ctx.fillStyle = bullet.color
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
    }
    
    // 绘制敌人
    for (const enemy of this.enemies) {
      this.ctx.fillStyle = enemy.color
      this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height)
    }
    
    // 绘制道具
    for (const powerup of this.powerups) {
      this.ctx.fillStyle = powerup.color
      this.ctx.beginPath()
      this.ctx.arc(
        powerup.x + powerup.width / 2,
        powerup.y + powerup.height / 2,
        powerup.width / 2,
        0,
        Math.PI * 2
      )
      this.ctx.fill()
      
      // 绘制道具图标
      this.ctx.fillStyle = '#fff'
      this.ctx.font = '16px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      
      let icon = '?'
      if (powerup.type === 'life') icon = '♥'
      else if (powerup.type === 'shield') icon = '◯'
      else if (powerup.type === 'rapidFire') icon = '↯'
      
      this.ctx.fillText(
        icon,
        powerup.x + powerup.width / 2,
        powerup.y + powerup.height / 2
      )
    }
    
    // 绘制爆炸效果
    for (const explosion of this.explosions) {
      for (const particle of explosion.particles) {
        this.ctx.fillStyle = particle.color
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        this.ctx.fill()
      }
    }
    
    // 绘制UI
    this.renderUI()
  }
  
  // 绘制星空背景
  renderStarBackground() {
    // 绘制渐变背景
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#0c0e20')
    gradient.addColorStop(1, '#1a1c30')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // 使用伪随机数生成固定的星星
    const seed = Math.floor(Date.now() / 1000) % 100
    const starCount = 100
    
    this.ctx.fillStyle = '#fff'
    for (let i = 0; i < starCount; i++) {
      const x = ((seed * 9301 + 49297) * 233280) % this.width
      const y = ((seed * 9277 + 49297 * i) * 233280) % this.height
      const size = ((seed * 9283 + 49297 * (i * 2)) * 233280) % 3 + 1
      
      this.ctx.beginPath()
      this.ctx.arc(x, y, size, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }
  
  // 绘制UI
  renderUI() {
    // 绘制分数
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '24px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'
    this.ctx.fillText(`分数: ${this.score}`, 20, 70)
    
    // 绘制生命值
    for (let i = 0; i < this.lives; i++) {
      this.ctx.fillStyle = '#e74c3c'
      this.ctx.beginPath()
      this.ctx.arc(30 + i * 30, 120, 10, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // 绘制等级
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '20px Arial'
    this.ctx.fillText(`等级: ${this.level}`, 20, 150)
    
    // 绘制返回按钮
    this.ctx.fillStyle = this.backButton.color
    this.ctx.fillRect(
      this.backButton.x,
      this.backButton.y,
      this.backButton.width,
      this.backButton.height
    )
    
    // 绘制返回图标
    this.ctx.strokeStyle = '#fff'
    this.ctx.lineWidth = 3
    this.ctx.beginPath()
    this.ctx.moveTo(this.backButton.x + 25, this.backButton.y + 10)
    this.ctx.lineTo(this.backButton.x + 15, this.backButton.y + 20)
    this.ctx.lineTo(this.backButton.x + 25, this.backButton.y + 30)
    this.ctx.stroke()
  }
  
  // 绘制开始界面
  renderStartScreen() {
    // 绘制星空背景
    this.renderStarBackground()
    
    // 绘制游戏标题
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '40px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('飞机大战', this.width / 2, this.height / 3)
    
    // 绘制开始提示
    this.ctx.font = '24px Arial'
    this.ctx.fillText('点击屏幕开始游戏', this.width / 2, this.height / 2)
    
    // 绘制游戏说明
    this.ctx.font = '18px Arial'
    this.ctx.fillText('移动飞机躲避敌人并射击', this.width / 2, this.height / 2 + 50)
    this.ctx.fillText('收集道具获得特殊能力', this.width / 2, this.height / 2 + 80)
    
    // 绘制返回按钮
    this.ctx.fillStyle = this.backButton.color
    this.ctx.fillRect(
      this.backButton.x,
      this.backButton.y,
      this.backButton.width,
      this.backButton.height
    )
    
    // 绘制返回图标
    this.ctx.strokeStyle = '#fff'
    this.ctx.lineWidth = 3
    this.ctx.beginPath()
    this.ctx.moveTo(this.backButton.x + 25, this.backButton.y + 10)
    this.ctx.lineTo(this.backButton.x + 15, this.backButton.y + 20)
    this.ctx.lineTo(this.backButton.x + 25, this.backButton.y + 30)
    this.ctx.stroke()
  }
  
  // 绘制游戏结束界面
  renderGameOverScreen() {
    // 绘制半透明覆盖层
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // 绘制游戏结束文字
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '40px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('游戏结束', this.width / 2, this.height / 3)
    
    // 绘制最终分数
    this.ctx.font = '30px Arial'
    this.ctx.fillText(`最终分数: ${this.score}`, this.width / 2, this.height / 2)
    
    // 绘制重新开始提示
    this.ctx.font = '24px Arial'
    this.ctx.fillText('点击屏幕重新开始', this.width / 2, this.height / 2 + 60)
    
    // 绘制返回按钮
    this.ctx.fillStyle = this.backButton.color
    this.ctx.fillRect(
      this.backButton.x,
      this.backButton.y,
      this.backButton.width,
      this.backButton.height
    )
    
    // 绘制返回图标
    this.ctx.strokeStyle = '#fff'
    this.ctx.lineWidth = 3
    this.ctx.beginPath()
    this.ctx.moveTo(this.backButton.x + 25, this.backButton.y + 10)
    this.ctx.lineTo(this.backButton.x + 15, this.backButton.y + 20)
    this.ctx.lineTo(this.backButton.x + 25, this.backButton.y + 30)
    this.ctx.stroke()
  }
  
  // 游戏结束
  gameOver() {
    this.state = 'gameover'
    
    // 调用游戏结束回调，传递分数
    if (this.onGameOver) {
      this.onGameOver(this.score)
    }
  }
  
  // 重置游戏
  resetGame() {
    this.state = 'playing'
    this.score = 0
    this.lives = 3
    this.level = 1
    this.enemies = []
    this.bullets = []
    this.powerups = []
    this.explosions = []
    this.enemySpawnTime = 60
    this.player.shield = false
    this.player.shieldTime = 0
    this.player.rapidFire = false
    this.player.rapidFireTime = 0
    this.player.invincible = false
    this.player.invincibleTime = 0
  }
  
  // 退出游戏
  exitGame() {
    // 停止动画循环
    cancelAnimationFrame(this.animationId)
    
    // 移除事件监听器
    this.canvas.removeEventListener('touchstart', this.touchStartHandler)
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler)
    this.canvas.removeEventListener('touchend', this.touchEndHandler)
    
    // 调用退出回调
    if (this.onExit) {
      this.onExit()
    }
  }
}

module.exports = Game