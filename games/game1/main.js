// 贪吃蛇游戏

class Game {
  constructor(canvas, onExit, onGameOver) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.width = canvas.width
    this.height = canvas.height
    this.onExit = onExit
    this.onGameOver = onGameOver
    
    // 游戏配置
    this.gridSize = 20
    this.gridWidth = Math.floor(this.width / this.gridSize)
    this.gridHeight = Math.floor(this.height / this.gridSize)
    
    // 游戏状态
    this.state = 'start' // start, playing, paused, gameover
    this.score = 0
    this.highScore = 0
    this.speed = 10 // 每秒移动的格子数
    this.lastTime = 0
    this.accumulator = 0
    
    // 蛇
    this.snake = []
    this.direction = 'right'
    this.nextDirection = 'right'
    
    // 食物
    this.food = null
    
    // 特殊食物
    this.specialFood = null
    this.specialFoodTimer = 0
    this.specialFoodDuration = 0
    
    // 返回按钮
    this.backButton = {
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      color: 'rgba(255, 255, 255, 0.5)'
    }
    
    // 暂停按钮
    this.pauseButton = {
      x: this.width - 60,
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
    
    this.canvas.addEventListener('touchstart', this.touchStartHandler)
    this.canvas.addEventListener('touchmove', this.touchMoveHandler)
    
    // 尝试从本地存储加载最高分
    try {
      const savedHighScore = wx.getStorageSync('snakeHighScore')
      if (savedHighScore) {
        this.highScore = parseInt(savedHighScore)
      }
    } catch (e) {
      console.error('无法加载最高分', e)
    }
    
    // 开始游戏循环
    this.animate(0)
  }
  
  // 重置游戏
  resetGame() {
    // 初始化蛇
    this.snake = [
      { x: 5, y: Math.floor(this.gridHeight / 2) },
      { x: 4, y: Math.floor(this.gridHeight / 2) },
      { x: 3, y: Math.floor(this.gridHeight / 2) }
    ]
    
    this.direction = 'right'
    this.nextDirection = 'right'
    this.score = 0
    this.speed = 10
    this.state = 'playing'
    
    // 生成食物
    this.generateFood()
    
    // 重置特殊食物
    this.specialFood = null
    this.specialFoodTimer = 0
    this.specialFoodDuration = 0
  }
  
  // 生成食物
  generateFood() {
    // 创建一个包含所有可能位置的数组
    const availablePositions = []
    
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        // 检查位置是否被蛇占用
        let isOccupied = false
        for (const segment of this.snake) {
          if (segment.x === x && segment.y === y) {
            isOccupied = true
            break
          }
        }
        
        // 如果位置未被占用，添加到可用位置
        if (!isOccupied) {
          availablePositions.push({ x, y })
        }
      }
    }
    
    // 如果没有可用位置，游戏结束
    if (availablePositions.length === 0) {
      this.gameOver()
      return
    }
    
    // 随机选择一个可用位置
    const randomIndex = Math.floor(Math.random() * availablePositions.length)
    this.food = availablePositions[randomIndex]
  }
  
  // 生成特殊食物
  generateSpecialFood() {
    // 创建一个包含所有可能位置的数组
    const availablePositions = []
    
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        // 检查位置是否被蛇或普通食物占用
        let isOccupied = false
        
        // 检查蛇
        for (const segment of this.snake) {
          if (segment.x === x && segment.y === y) {
            isOccupied = true
            break
          }
        }
        
        // 检查普通食物
        if (this.food && this.food.x === x && this.food.y === y) {
          isOccupied = true
        }
        
        // 如果位置未被占用，添加到可用位置
        if (!isOccupied) {
          availablePositions.push({ x, y })
        }
      }
    }
    
    // 如果没有可用位置，不生成特殊食物
    if (availablePositions.length === 0) {
      return
    }
    
    // 随机选择一个可用位置
    const randomIndex = Math.floor(Math.random() * availablePositions.length)
    this.specialFood = availablePositions[randomIndex]
    
    // 设置特殊食物持续时间（5秒）
    this.specialFoodDuration = 5000
  }
  
  // 更新游戏状态
  update(deltaTime) {
    if (this.state !== 'playing') return
    
    // 累加时间
    this.accumulator += deltaTime
    
    // 更新特殊食物计时器
    if (this.specialFood) {
      this.specialFoodDuration -= deltaTime
      if (this.specialFoodDuration <= 0) {
        this.specialFood = null
      }
    } else {
      this.specialFoodTimer += deltaTime
      // 每15秒有机会生成特殊食物
      if (this.specialFoodTimer >= 15000) {
        this.specialFoodTimer = 0
        // 30%几率生成特殊食物
        if (Math.random() < 0.3) {
          this.generateSpecialFood()
        }
      }
    }
    
    // 检查是否需要移动蛇
    const moveInterval = 1000 / this.speed
    if (this.accumulator >= moveInterval) {
      this.accumulator -= moveInterval
      this.moveSnake()
    }
  }
  
  // 移动蛇
  moveSnake() {
    // 更新方向
    this.direction = this.nextDirection
    
    // 获取蛇头
    const head = { ...this.snake[0] }
    
    // 根据方向移动蛇头
    switch (this.direction) {
      case 'up':
        head.y -= 1
        break
      case 'down':
        head.y += 1
        break
      case 'left':
        head.x -= 1
        break
      case 'right':
        head.x += 1
        break
    }
    
    // 检查是否撞墙
    if (
      head.x < 0 ||
      head.x >= this.gridWidth ||
      head.y < 0 ||
      head.y >= this.gridHeight
    ) {
      this.gameOver()
      return
    }
    
    // 检查是否撞到自己
    for (const segment of this.snake) {
      if (head.x === segment.x && head.y === segment.y) {
        this.gameOver()
        return
      }
    }
    
    // 将新头部添加到蛇身
    this.snake.unshift(head)
    
    // 检查是否吃到食物
    let ate = false
    
    // 检查普通食物
    if (this.food && head.x === this.food.x && head.y === this.food.y) {
      this.score += 10
      this.food = null
      this.generateFood()
      ate = true
      
      // 每得50分增加速度
      if (this.score % 50 === 0) {
        this.speed = Math.min(this.speed + 1, 20) // 最大速度20
      }
    }
    
    // 检查特殊食物
    if (this.specialFood && head.x === this.specialFood.x && head.y === this.specialFood.y) {
      this.score += 50
      this.specialFood = null
      ate = true
    }
    
    // 如果没有吃到食物，移除尾部
    if (!ate) {
      this.snake.pop()
    }
  }
  
  // 处理触摸开始事件
  handleTouchStart(e) {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = this.canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    
    // 检查是否点击了返回按钮
    if (this.isPointInRect(x, y, this.backButton)) {
      this.exitGame()
      return
    }
    
    // 检查是否点击了暂停按钮
    if (this.state === 'playing' && this.isPointInRect(x, y, this.pauseButton)) {
      this.state = 'paused'
      return
    } else if (this.state === 'paused' && this.isPointInRect(x, y, this.pauseButton)) {
      this.state = 'playing'
      return
    }
    
    // 如果在开始界面，点击任意位置开始游戏
    if (this.state === 'start') {
      this.resetGame()
      return
    }
    
    // 如果在游戏结束界面，点击任意位置重新开始
    if (this.state === 'gameover') {
      this.resetGame()
      return
    }
    
    // 记录触摸起始位置（用于计算滑动方向）
    this.touchStartX = x
    this.touchStartY = y
  }
  
  // 处理触摸移动事件
  handleTouchMove(e) {
    if (this.state !== 'playing') return
    
    e.preventDefault()
    const touch = e.touches[0]
    const rect = this.canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    
    // 计算滑动距离
    const dx = x - this.touchStartX
    const dy = y - this.touchStartY
    
    // 只有当滑动距离足够大时才改变方向
    const minSwipeDistance = 20
    
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipeDistance) {
      // 水平滑动
      if (dx > 0 && this.direction !== 'left') {
        this.nextDirection = 'right'
      } else if (dx < 0 && this.direction !== 'right') {
        this.nextDirection = 'left'
      }
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipeDistance) {
      // 垂直滑动
      if (dy > 0 && this.direction !== 'up') {
        this.nextDirection = 'down'
      } else if (dy < 0 && this.direction !== 'down') {
        this.nextDirection = 'up'
      }
    }
    
    // 更新触摸起始位置
    this.touchStartX = x
    this.touchStartY = y
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
    } else if (this.state === 'paused') {
      this.render()
      this.renderPauseScreen()
    } else if (this.state === 'gameover') {
      this.renderGameOverScreen()
    }
    
    // 继续下一帧
    this.animationId = requestAnimationFrame(this.animate.bind(this))
  }
  
  // 渲染游戏
  render() {
    // 绘制背景
    this.ctx.fillStyle = '#2c3e50'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // 绘制网格
    this.ctx.strokeStyle = '#34495e'
    this.ctx.lineWidth = 1
    
    for (let x = 0; x < this.width; x += this.gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.height)
      this.ctx.stroke()
    }
    
    for (let y = 0; y < this.height; y += this.gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.width, y)
      this.ctx.stroke()
    }
    
    // 绘制食物
    if (this.food) {
      this.ctx.fillStyle = '#e74c3c'
      this.ctx.beginPath()
      this.ctx.arc(
        this.food.x * this.gridSize + this.gridSize / 2,
        this.food.y * this.gridSize + this.gridSize / 2,
        this.gridSize / 2 - 2,
        0,
        Math.PI * 2
      )
      this.ctx.fill()
    }
    
    // 绘制特殊食物
    if (this.specialFood) {
      // 闪烁效果
      if (Math.floor(Date.now() / 200) % 2 === 0) {
        this.ctx.fillStyle = '#f39c12'
      } else {
        this.ctx.fillStyle = '#e67e22'
      }
      
      this.ctx.beginPath()
      this.ctx.arc(
        this.specialFood.x * this.gridSize + this.gridSize / 2,
        this.specialFood.y * this.gridSize + this.gridSize / 2,
        this.gridSize / 2,
        0,
        Math.PI * 2
      )
      this.ctx.fill()
      
      // 绘制星形
      this.ctx.fillStyle = '#fff'
      this.ctx.beginPath()
      const centerX = this.specialFood.x * this.gridSize + this.gridSize / 2
      const centerY = this.specialFood.y * this.gridSize + this.gridSize / 2
      const spikes = 5
      const outerRadius = this.gridSize / 3
      const innerRadius = this.gridSize / 6
      
      let rot = Math.PI / 2 * 3
      let x = centerX
      let y = centerY
      let step = Math.PI / spikes
      
      this.ctx.moveTo(centerX, centerY - outerRadius)
      
      for (let i = 0; i < spikes; i++) {
        x = centerX + Math.cos(rot) * outerRadius
        y = centerY + Math.sin(rot) * outerRadius
        this.ctx.lineTo(x, y)
        rot += step
        
        x = centerX + Math.cos(rot) * innerRadius
        y = centerY + Math.sin(rot) * innerRadius
        this.ctx.lineTo(x, y)
        rot += step
      }
      
      this.ctx.lineTo(centerX, centerY - outerRadius)
      this.ctx.closePath()
      this.ctx.fill()
    }
    
    // 绘制蛇
    for (let i = 0; i < this.snake.length; i++) {
      const segment = this.snake[i]
      
      // 蛇头使用不同颜色
      if (i === 0) {
        this.ctx.fillStyle = '#3498db'
      } else {
        // 身体部分使用渐变色
        const hue = 210 - (i * 2) % 50 // 从蓝色渐变
        this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
      }
      
      this.ctx.fillRect(
        segment.x * this.gridSize + 1,
        segment.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      )
      
      // 为蛇头绘制眼睛
      if (i === 0) {
        this.ctx.fillStyle = '#fff'
        
        // 根据方向绘制眼睛
        const eyeSize = this.gridSize / 5
        const eyeOffset = this.gridSize / 3
        
        let leftEyeX, leftEyeY, rightEyeX, rightEyeY
        
        switch (this.direction) {
          case 'up':
            leftEyeX = segment.x * this.gridSize + eyeOffset
            leftEyeY = segment.y * this.gridSize + eyeOffset
            rightEyeX = segment.x * this.gridSize + this.gridSize - eyeOffset - eyeSize
            rightEyeY = segment.y * this.gridSize + eyeOffset
            break
          case 'down':
            leftEyeX = segment.x * this.gridSize + this.gridSize - eyeOffset - eyeSize
            leftEyeY = segment.y * this.gridSize + this.gridSize - eyeOffset - eyeSize
            rightEyeX = segment.x * this.gridSize + eyeOffset
            rightEyeY = segment.y * this.gridSize + this.gridSize - eyeOffset - eyeSize
            break
          case 'left':
            leftEyeX = segment.x * this.gridSize + eyeOffset
            leftEyeY = segment.y * this.gridSize + eyeOffset
            rightEyeX = segment.x * this.gridSize + eyeOffset
            rightEyeY = segment.y * this.gridSize + this.gridSize - eyeOffset - eyeSize
            break
          case 'right':
            leftEyeX = segment.x * this.gridSize + this.gridSize - eyeOffset - eyeSize
            leftEyeY = segment.y * this.gridSize + eyeOffset
            rightEyeX = segment.x * this.gridSize + this.gridSize - eyeOffset - eyeSize
            rightEyeY = segment.y * this.gridSize + this.gridSize - eyeOffset - eyeSize
            break
        }
        
        this.ctx.fillRect(leftEyeX, leftEyeY, eyeSize, eyeSize)
        this.ctx.fillRect(rightEyeX, rightEyeY, eyeSize, eyeSize)
      }
    }
    
    // 绘制UI
    this.renderUI()
  }
  
  // 绘制UI
  renderUI() {
    // 绘制分数
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '24px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'
    this.ctx.fillText(`分数: ${this.score}`, 20, 70)
    
    // 绘制最高分
    this.ctx.fillText(`最高分: ${this.highScore}`, 20, 100)
    
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
    
    // 绘制暂停按钮
    this.ctx.fillStyle = this.pauseButton.color
    this.ctx.fillRect(
      this.pauseButton.x,
      this.pauseButton.y,
      this.pauseButton.width,
      this.pauseButton.height
    )
    
    // 绘制暂停/播放图标
    this.ctx.strokeStyle = '#fff'
    this.ctx.lineWidth = 3
    
    if (this.state === 'playing') {
      // 暂停图标（两条竖线）
      this.ctx.beginPath()
      this.ctx.moveTo(this.pauseButton.x + 15, this.pauseButton.y + 10)
      this.ctx.lineTo(this.pauseButton.x + 15, this.pauseButton.y + 30)
      this.ctx.stroke()
      
      this.ctx.beginPath()
      this.ctx.moveTo(this.pauseButton.x + 25, this.pauseButton.y + 10)
      this.ctx.lineTo(this.pauseButton.x + 25, this.pauseButton.y + 30)
      this.ctx.stroke()
    } else {
      // 播放图标（三角形）
      this.ctx.beginPath()
      this.ctx.moveTo(this.pauseButton.x + 13, this.pauseButton.y + 10)
      this.ctx.lineTo(this.pauseButton.x + 13, this.pauseButton.y + 30)
      this.ctx.lineTo(this.pauseButton.x + 33, this.pauseButton.y + 20)
      this.ctx.closePath()
      this.ctx.stroke()
    }
  }
  
  // 绘制开始界面
  renderStartScreen() {
    // 绘制背景
    this.ctx.fillStyle = '#2c3e50'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // 绘制游戏标题
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '40px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('贪吃蛇', this.width / 2, this.height / 3)
    
    // 绘制开始提示
    this.ctx.font = '24px Arial'
    this.ctx.fillText('点击屏幕开始游戏', this.width / 2, this.height / 2)
    
    // 绘制游戏说明
    this.ctx.font = '18px Arial'
    this.ctx.fillText('滑动屏幕控制蛇的方向', this.width / 2, this.height / 2 + 50)
    this.ctx.fillText('吃到食物增加分数', this.width / 2, this.height / 2 + 80)
    this.ctx.fillText('吃到特殊食物获得更多分数', this.width / 2, this.height / 2 + 110)
    
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
  
  // 绘制暂停界面
  renderPauseScreen() {
    // 绘制半透明覆盖层
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // 绘制暂停文字
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '40px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('游戏暂停', this.width / 2, this.height / 2)
    
    // 绘制继续提示
    this.ctx.font = '24px Arial'
    this.ctx.fillText('点击暂停按钮继续', this.width / 2, this.height / 2 + 60)
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
    
    // 如果打破最高分，显示新纪录
    if (this.score > this.highScore) {
      this.ctx.fillStyle = '#f1c40f'
      this.ctx.fillText('新纪录！', this.width / 2, this.height / 2 + 40)
    }
    
    // 绘制重新开始提示
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '24px Arial'
    this.ctx.fillText('点击屏幕重新开始', this.width / 2, this.height / 2 + 80)
    
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
    
    // 更新最高分
    if (this.score > this.highScore) {
      this.highScore = this.score
      
      // 保存最高分到本地存储
      try {
        wx.setStorageSync('snakeHighScore', this.highScore.toString())
      } catch (e) {
        console.error('无法保存最高分', e)
      }
    }
    
    // 调用游戏结束回调，传递分数
    if (this.onGameOver) {
      this.onGameOver(this.score)
    }
  }
  
  // 退出游戏
  exitGame() {
    // 停止动画循环
    cancelAnimationFrame(this.animationId)
    
    // 移除事件监听器
    this.canvas.removeEventListener('touchstart', this.touchStartHandler)
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler)
    
    // 调用退出回调
    if (this.onExit) {
      this.onExit()
    }
  }
}

module.exports = Game