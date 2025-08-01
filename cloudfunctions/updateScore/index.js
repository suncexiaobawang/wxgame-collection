// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command
  const userCollection = db.collection('users')
  
  // 检查参数
  if (!event.score || typeof event.score !== 'number' || event.score <= 0) {
    return {
      success: false,
      error: '无效的积分参数'
    }
  }
  
  try {
    // 查询用户当前数据
    const userQuery = await userCollection.where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userQuery.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    const userData = userQuery.data[0]
    const currentScore = userData.score || 0
    const newScore = currentScore + event.score
    
    // 游戏解锁阈值
    const unlockThresholds = [0, 1000, 3000] // 第一个游戏默认解锁，第二个1000分解锁，第三个3000分解锁
    
    // 检查是否有新游戏解锁
    const unlockedGames = userData.unlockedGames || [0]
    let newUnlocks = false
    
    // 检查每个游戏的解锁条件
    for (let i = 0; i < unlockThresholds.length; i++) {
      if (!unlockedGames.includes(i) && newScore >= unlockThresholds[i]) {
        unlockedGames.push(i)
        newUnlocks = true
      }
    }
    
    // 更新用户积分和解锁状态
    await userCollection.where({
      _openid: wxContext.OPENID
    }).update({
      data: {
        score: newScore,
        unlockedGames: unlockedGames,
        updatedAt: db.serverDate()
      }
    })
    
    // 记录积分历史
    await db.collection('score_history').add({
      data: {
        _openid: wxContext.OPENID,
        gameIndex: event.gameIndex,
        score: event.score,
        totalScore: newScore,
        createdAt: db.serverDate()
      }
    })
    
    return {
      success: true,
      previousScore: currentScore,
      newScore: newScore,
      addedScore: event.score,
      unlockedGames: unlockedGames,
      newUnlocks: newUnlocks
    }
  } catch (err) {
    console.error('更新积分云函数错误', err)
    return {
      success: false,
      error: err
    }
  }
}