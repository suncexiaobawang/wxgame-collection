// 2048游戏

class Game {
  constructor(canvas, onExit, onGameOver) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.width = canvas.width
    this.height = canvas.height
    this.onExit = onExit
    this.onGameOver = onGameOver
    
    // 游戏配置
    this.gridSize = 4
    this.cellSize = Math.min(this.width, this.height) / (this.gridSize + 1)
    this.gridPadding = this.cellSize / 2
    
    // 游戏状态
    this.state = 'start' // start, playing, gameover
    this.score = 0
    this.highScore = 0
    this.grid = []
    this.animating = false
    this.animations = []
    
    // 颜色配置
    this.colors = {
      background: '#faf8ef',
      grid: '#bbada0',
      empty: '#cdc1b4',
      text: '#776e65',
      overlay: 'rgba(238, 228, 218, 0.5)',
      // 不同数字块的颜色
      2: { background: '#eee4da', text: '#776e65' },
      4: { background: '#ede0c8', text: '#776e65' },
      8: { background: '#f2b179', text: '#f9f6f2' },
      16: { background: '#f59563', text: '#f9f6f2' },
      32: { background: '#f67c5f', text: '#f9f6f2' },
      64: { background: '#f65e3b', text: '#f9f6f2' },
      128: { background: '#edcf72', text: '#f9f6f2' },
      256: { background: '#edcc61', text: '#f9f6f2' },
      512: { background: '#edc850', text: '#f9f6f2' },
      1024: { background: '#edc53f', text: '#f9f6f2' },
      2048: { background: '#edc22e', text: '#f9f6f2' },
      super: { background: '#3c3a32', text: '#f9f6f2' } // 4096及以上
    }
    
    // 返回按钮
    this.backButton = {
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      color: 'rgba(185, 173, 160, 0.8)'
    }
    
    // 初始化
    this.init()
  }
  
  init() {
    // 添加触摸事件监听
    this.touchStartHandler = this.handleTouchStart.bind(this)
    this.touchEndHandler = this.handleTouchEnd.bind(this)
    
    this.canvas.addEventListener('touchstart', this.touchStartHandler)
    this.canvas.addEventListener('touchend', this.touchEndHandler)
    
    // 尝试从本地存储加载最高分
    try {
      const savedHighScore = wx.getStorageSync('2048HighScore')
      if (savedHighScore) {
        this.highScore = parseInt(savedHighScore)
      }
    } catch (e) {
      console.error('无法加载最高分', e)
    }
    
    // 开始游戏循环
    this.lastTime = 0
    this.animate(0)
  }
  
  // 重置游戏
  resetGame() {
    // 初始化网格
    this.grid = []
    for (let i = 0; i < this.gridSize; i++) {
      this.grid[i] = []
      for (let j = 0; j < this.gridSize; j++) {
        this.grid[i][j] = 0
      }
    }
    
    this.score = 0
    this.state = 'playing'
    this.animating = false
    this.animations = []
    
    // 添加初始方块
    this.addRandomTile()
    this.addRandomTile()
  }
  
  // 添加随机方块
  addRandomTile() {
    // 获取所有空格子
    const emptyCells = []
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.grid[i][j] === 0) {
          emptyCells.push({ x: i, y: j })
        }
      }
    }
    
    // 如果没有空格子，返回
    if (emptyCells.length === 0) return
    
    // 随机选择一个空格子
    const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    
    // 90%几率生成2，10%几率生成4
    this.grid[cell.x][cell.y] = Math.random() < 0.9 ? 2 : 4
    
    // 添加出现动画
    this.animations.push({
      type: 'appear',
      x: cell.x,
      y: cell.y,
      progress: 0,
      duration: 200 // 毫秒
    })
  }
  
  // 移动方块
  moveTiles(direction) {
    if (this.animating) return false
    
    // 记录移动前的网格状态
    const previousGrid = JSON.parse(JSON.stringify(this.grid))
    
    // 根据方向处理移动
    let moved = false
    
    if (direction === 'up') {
      moved = this.moveUp()
    } else if (direction === 'down') {
      moved = this.moveDown()
    } else if (direction === 'left') {
      moved = this.moveLeft()
    } else if (direction === 'right') {
      moved = this.moveRight()
    }
    
    // 如果有移动，添加新方块
    if (moved) {
      this.addRandomTile()
      
      // 检查游戏是否结束
      if (!this.canMove()) {
        this.gameOver()
      }
    }
    
    return moved
  }
  
  // 向上移动
  moveUp() {
    let moved = false
    
    for (let j = 0; j < this.gridSize; j++) {
      for (let i = 1; i < this.gridSize; i++) {
        if (this.grid[i][j] !== 0) {
          let row = i
          while (row > 0 && this.grid[row - 1][j] === 0) {
            // 移动方块
            this.grid[row - 1][j] = this.grid[row][j]
            this.grid[row][j] = 0
            row--
            moved = true
            
            // 添加移动动画
            this.animations.push({
              type: 'move',
              fromX: i,
              fromY: j,
              toX: row,
              toY: j,
              progress: 0,
              duration: 100
            })
          }
          
          // 合并相同数字的方块
          if (row > 0 && this.grid[row - 1][j] === this.grid[row][j]) {
            this.grid[row - 1][j] *= 2
            this.grid[row][j] = 0
            this.score += this.grid[row - 1][j]
            moved = true
            
            // 添加合并动画
            this.animations.push({
              type: 'merge',
              fromX: i,
              fromY: j,
              toX: row - 1,
              toY: j,
              progress: 0,
              duration: 100
            })
          }
        }
      }
    }
    
    return moved
  }
  
  // 向下移动
  moveDown() {
    let moved = false
    
    for (let j = 0; j < this.gridSize; j++) {
      for (let i = this.gridSize - 2; i >= 0; i--) {
        if (this.grid[i][j] !== 0) {
          let row = i
          while (row < this.gridSize - 1 && this.grid[row + 1][j] === 0) {
            // 移动方块
            this.grid[row + 1][j] = this.grid[row][j]
            this.grid[row][j] = 0
            row++
            moved = true
            
            // 添加移动动画
            this.animations.push({
              type: 'move',
              fromX: i,
              fromY: j,
              toX: row,
              toY: j,
              progress: 0,
              duration: 100
            })
          }
          
          // 合并相同数字的方块
          if (row < this.gridSize - 1 && this.grid[row + 1][j] === this.grid[row][j]) {
            this.grid[row + 1][j] *= 2
            this.grid[row][j] = 0
            this.score += this.grid[row + 1][j]
            moved = true
            
            // 添加合并动画
            this.animations.push({
              type: 'merge',
              fromX: i,
              fromY: j,
              toX: row + 1,
              toY: j,
              progress: 0,
              duration: 100
            })
          }
        }
      }
    }
    
    return moved
  }
  
  // 向左移动
  moveLeft() {
    let moved = false
    
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 1; j < this.gridSize; j++) {
        if (this.grid[i][j] !== 0) {
          let col = j
          while (col > 0 && this.grid[i][col - 1] === 0) {
            // 移动方块
            this.grid[i][col - 1] = this.grid[i][col]
            this.grid[i][col] = 0
            col--
            moved = true
            
            // 添加移动动画
            this.animations.push({
              type: 'move',
              fromX: i,
              fromY: j,
              toX: i,
              toY: col,
              progress: 0,
              duration: 100
            })
          }
          
          // 合并相同数字的方块
          if (col > 0 && this.grid[i][col - 1] === this.grid[i][col]) {
            this.grid[i][col - 1] *= 2
            this.grid[i][col] = 0
            this.score += this.grid[i][col - 1]
            moved = true
            
            // 添加合并动画
            this.animations.push({
              type: 'merge',
              fromX: i,
              fromY: j,
              toX: i,
              toY: col - 1,
              progress: 0,
              duration: 100
            })
          }
        }
      }
    }
    
    return moved
  }
  
  // 向右移动
  moveRight() {
    let moved = false
    
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = this.gridSize - 2; j >= 0; j--) {
        if (this.grid[i][j] !== 0) {
          let col = j
          while (col < this.gridSize - 1 && this.grid[i][col + 1] === 0) {
            // 移动方块
            this.grid[i][col + 1] = this.grid[i][col]
            this.grid[i][col] = 0
            col++
            moved = true
            
            // 添加移动动画
            this.animations.push({
              type: 'move',
              fromX: i,
              fromY: j,
              toX: i,
              toY: col,
              progress: 0,
              duration: 100
            })
          }
          
          // 合并相同数字的方块
          if (col < this.gridSize - 1 && this.grid[i][col + 1] === this.grid[i][col]) {
            this.grid[i][col + 1] *= 2
            this.grid[i][col] = 0
            this.score += this.grid[i][col + 1]
            moved = true
            
            // 添加合并动画
            this.animations.push({
              type: 'merge',
              fromX: i,
              fromY: j,
              toX: i,
              toY: col + 1,
              progress: 0,
              duration: 100
            })
          }
        }
      }
    }
    
    return moved
  }
  
  // 检查是否可以移动
  canMove() {
    // 检查是否有空格子
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.grid[i][j] === 0) {
          return true
        }
      }
    }
    
    // 检查是否有相邻的相同数字
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const value = this.grid[i][j]
        
        // 检查右侧
        if (j < this.gridSize - 1 && this.grid[i][j + 1] === value) {
          return true
        }
        
        // 检查下方
        if (i < this.gridSize - 1 && this.grid[i + 1][j] === value) {
          return true
        }
      }
    }
    
    return false
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
    
    // 记录触摸起始位置
    this.touchStartX = x
    this.touchStartY = y
  }
  
  // 处理触摸结束事件
  handleTouchEnd(e) {
    if (this.state !== 'playing' || !this.touchStartX || !this.touchStartY) return
    
    e.preventDefault()
    const touch = e.changedTouches[0]
    const rect = this.canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    
    // 计算滑动距离和方向
    const dx = x - this.touchStartX
    const dy = y - this.touchStartY
    
    // 只有当滑动距离足够大时才移动方块
    const minSwipeDistance = 30
    
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipeDistance) {
      // 水平滑动
      if (dx > 0) {
        this.moveTiles('right')
      } else {
        this.moveTiles('left')
      }
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipeDistance) {
      // 垂直滑动
      if (dy > 0) {
        this.moveTiles('down')
      } else {
        this.moveTiles('up')
      }
    }
    
    // 重置触摸起始位置
    this.touchStartX = null
    this.touchStartY = null
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
    } else if (this.state === 'gameover') {
      this.render()
      this.renderGameOverScreen()
    }
    
    // 继续下一帧
    this.animationId = requestAnimationFrame(this.animate.bind(this))
  }
  
  // 更新游戏状态
  update(deltaTime) {
    // 更新动画
    this.animating = this.animations.length > 0
    
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const animation = this.animations[i]
      animation.progress += deltaTime
      
      // 如果动画完成，移除动画
      if (animation.progress >= animation.duration) {
        this.animations.splice(i, 1)
      }
    }
    
    // 更新最高分
    if (this.score > this.highScore) {
      this.highScore = this.score
      
      // 保存最高分到本地存储
      try {
        wx.setStorageSync('2048HighScore', this.highScore.toString())
      } catch (e) {
        console.error('无法保存最高分', e)
      }
    }
  }
  
  // 渲染游戏
  render() {
    // 绘制背景
    this.ctx.fillStyle = this.colors.background
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // 绘制网格背景
    const gridWidth = this.cellSize * this.gridSize + this.gridPadding * (this.gridSize + 1)
    const gridHeight = gridWidth
    const gridX = (this.width - gridWidth) / 2
    const gridY = (this.height - gridHeight) / 2 + 50 // 向下偏移，为顶部UI留出空间
    
    this.ctx.fillStyle = this.colors.grid
    this.ctx.fillRect(gridX, gridY, gridWidth, gridHeight)
    
    // 绘制空格子
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const cellX = gridX + this.gridPadding + j * (this.cellSize + this.gridPadding)
        const cellY = gridY + this.gridPadding + i * (this.cellSize + this.gridPadding)
        
        this.ctx.fillStyle = this.colors.empty
        this.ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize)
      }
    }
    
    // 绘制方块
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.grid[i][j] !== 0) {
          this.drawTile(i, j, this.grid[i][j])
        }
      }
    }
    
    // 绘制UI
    this.renderUI(gridX, gridY - 80) // 在网格上方绘制UI
  }
  
  // 绘制方块
  drawTile(row, col, value) {
    const gridX = (this.width - (this.cellSize * this.gridSize + this.gridPadding * (this.gridSize + 1))) / 2
    const gridY = (this.height - (this.cellSize * this.gridSize + this.gridPadding * (this.gridSize + 1))) / 2 + 50
    
    let cellX = gridX + this.gridPadding + col * (this.cellSize + this.gridPadding)
    let cellY = gridY + this.gridPadding + row * (this.cellSize + this.gridPadding)
    let scale = 1
    
    // 应用动画效果
    for (const animation of this.animations) {
      if (animation.type === 'appear' && animation.x === row && animation.y === col) {
        // 出现动画：从小变大
        const progress = Math.min(animation.progress / animation.duration, 1)
        scale = 0.1 + progress * 0.9
      } else if ((animation.type === 'move' || animation.type === 'merge') && 
                animation.toX === row && animation.toY === col) {
        // 移动或合并动画：从起始位置移动到目标位置
        const progress = Math.min(animation.progress / animation.duration, 1)
        const startX = gridX + this.gridPadding + animation.fromY * (this.cellSize + this.gridPadding)
        const startY = gridY + this.gridPadding + animation.fromX * (this.cellSize + this.gridPadding)
        
        cellX = startX + (cellX - startX) * progress
        cellY = startY + (cellY - startY) * progress
        
        if (animation.type === 'merge' && progress > 0.8) {
          // 合并动画结束时的缩放效果
          scale = 1 + (1 - (progress - 0.8) * 5) * 0.1
        }
      }
    }
    
    // 获取方块颜色
    let colorConfig = this.colors[value]
    if (!colorConfig) {
      colorConfig = this.colors.super // 4096及以上使用super颜色
    }
    
    // 绘制方块背景
    this.ctx.fillStyle = colorConfig.background
    
    // 应用缩放
    const centerX = cellX + this.cellSize / 2
    const centerY = cellY + this.cellSize / 2
    const scaledSize = this.cellSize * scale
    
    this.ctx.fillRect(
      centerX - scaledSize / 2,
      centerY - scaledSize / 2,
      scaledSize,
      scaledSize
    )
    
    // 绘制方块数字
    this.ctx.fillStyle = colorConfig.text
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    // 根据数字位数调整字体大小
    let fontSize = 0
    if (value < 100) {
      fontSize = this.cellSize / 2
    } else if (value < 1000) {
      fontSize = this.cellSize / 2.5
    } else {
      fontSize = this.cellSize / 3
    }
    
    this.ctx.font = `bold ${fontSize}px Arial`
    this.ctx.fillText(
      value.toString(),
      centerX,
      centerY
    )
  }
  
  // 绘制UI
  renderUI(x, y) {
    // 绘制游戏标题
    this.ctx.fillStyle = this.colors.text
    this.ctx.font = 'bold 40px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'
    this.ctx.fillText('2048', x, y)
    
    // 绘制分数和最高分
    const scoreBoxWidth = 100
    const scoreBoxHeight = 50
    const scoreBoxPadding = 10
    
    // 分数框
    this.ctx.fillStyle = this.colors.grid
    this.ctx.fillRect(x + 150, y, scoreBoxWidth, scoreBoxHeight)
    
    // 分数标签
    this.ctx.fillStyle = '#eee4da'
    this.ctx.font = 'bold 13px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('分数', x + 150 + scoreBoxWidth / 2, y + scoreBoxPadding)
    
    // 分数值
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 20px Arial'
    this.ctx.fillText(
      this.score.toString(),
      x + 150 + scoreBoxWidth / 2,
      y + scoreBoxPadding + 20
    )
    
    // 最高分框
    this.ctx.fillStyle = this.colors.grid
    this.ctx.fillRect(x + 260, y, scoreBoxWidth, scoreBoxHeight)
    
    // 最高分标签
    this.ctx.fillStyle = '#eee4da'
    this.ctx.font = 'bold 13px Arial'
    this.ctx.fillText('最高分', x + 260 + scoreBoxWidth / 2, y + scoreBoxPadding)
    
    // 最高分值
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 20px Arial'
    this.ctx.fillText(
      this.highScore.toString(),
      x + 260 + scoreBoxWidth / 2,
      y + scoreBoxPadding + 20
    )
    
    // 绘制返回按钮
    this.ctx.fillStyle = this.backButton.color
    this.ctx.fillRect(
      this.backButton.x,
      this.backButton.y,
      this.backButton.width,
      this.backButton.height
    )
    
    // 绘制返回图标
    this.ctx.strokeStyle = this.colors.text
    this.ctx.lineWidth = 3
    this.ctx.beginPath()
    this.ctx.moveTo(this.backButton.x + 25, this.backButton.y + 10)
    this.ctx.lineTo(this.backButton.x + 15, this.backButton.y + 20)
    this.ctx.lineTo(this.backButton.x + 25, this.backButton.y + 30)
    this.ctx.stroke()
  }
  
  // 绘制开始界面
  renderStartScreen() {
    // 绘制背景
    this.ctx.fillStyle = this.colors.background
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // 绘制游戏标题
    this.ctx.fillStyle = this.colors.text
    this.ctx.font = 'bold 60px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('2048', this.width / 2, this.height / 3)
    
    // 绘制开始提示
    this.ctx.font = 'bold 24px Arial'
    this.ctx.fillText('点击屏幕开始游戏', this.width / 2, this.height / 2)
    
    // 绘制游戏说明
    this.ctx.font = '18px Arial'
    this.ctx.fillText('滑动屏幕合并相同数字的方块', this.width / 2, this.height / 2 + 50)
    this.ctx.fillText('目标是得到2048方块', this.width / 2, this.height / 2 + 80)
    
    // 绘制返回按钮
    this.ctx.fillStyle = this.backButton.color
    this.ctx.fillRect(
      this.backButton.x,
      this.backButton.y,
      this.backButton.width,
      this.backButton.height
    )
    
    // 绘制返回图标
    this.ctx.strokeStyle = this.colors.text
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
    this.ctx.fillStyle = 'rgba(238, 228, 218, 0.73)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // 绘制游戏结束文字
    this.ctx.fillStyle = this.colors.text
    this.ctx.font = 'bold 40px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('游戏结束', this.width / 2, this.height / 3)
    
    // 绘制最终分数
    this.ctx.font = 'bold 30px Arial'
    this.ctx.fillText(`最终分数: ${this.score}`, this.width / 2, this.height / 2)
    
    // 如果打破最高分，显示新纪录
    if (this.score === this.highScore && this.score > 0) {
      this.ctx.fillStyle = '#f65e3b'
      this.ctx.fillText('新纪录！', this.width / 2, this.height / 2 + 40)
    }
    
    // 绘制重新开始提示
    this.ctx.fillStyle = this.colors.text
    this.ctx.font = '24px Arial'
    this.ctx.fillText('点击屏幕重新开始', this.width / 2, this.height / 2 + 80)
  }
  
  // 游戏结束
  gameOver() {
    this.state = 'gameover'
    
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
    this.canvas.removeEventListener('touchend', this.touchEndHandler)
    
    // 调用退出回调
    if (this.onExit) {
      this.onExit()
    }
  }
}

module.exports = Game