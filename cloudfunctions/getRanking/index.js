// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  const MAX_LIMIT = 100 // 最多获取100条记录
  
  try {
    // 获取当前用户信息
    const selfQuery = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    let selfData = null
    if (selfQuery.data.length > 0) {
      selfData = selfQuery.data[0]
    }
    
    // 获取排行榜数据
    // 根据积分降序排列，获取前100名用户
    const rankingQuery = await db.collection('users')
      .orderBy('score', 'desc')
      .limit(MAX_LIMIT)
      .field({
        _openid: true,
        nickName: true,
        avatarUrl: true,
        score: true,
        unlockedGames: true
      })
      .get()
    
    // 处理排行榜数据，添加排名信息
    const rankingList = rankingQuery.data.map((user, index) => {
      return {
        ...user,
        rank: index + 1,
        isSelf: user._openid === wxContext.OPENID
      }
    })
    
    // 如果当前用户不在前100名，查找其排名并添加到结果中
    let selfRank = rankingList.findIndex(user => user._openid === wxContext.OPENID) + 1
    let selfInList = selfRank > 0
    
    if (!selfInList && selfData) {
      // 查询比当前用户分数高的用户数量，计算排名
      const countResult = await db.collection('users')
        .where({
          score: db.command.gt(selfData.score)
        })
        .count()
      
      selfRank = countResult.total + 1
      
      // 将自己添加到结果中
      rankingList.push({
        ...selfData,
        rank: selfRank,
        isSelf: true
      })
    }
    
    // 获取游戏特定排行榜（如果请求中指定了游戏索引）
    let gameRanking = null
    if (event.gameIndex !== undefined && event.gameIndex !== null) {
      // 获取指定游戏的最高分记录
      const gameScoreQuery = await db.collection('score_history')
        .where({
          gameIndex: event.gameIndex
        })
        .orderBy('score', 'desc')
        .limit(MAX_LIMIT)
        .get()
      
      // 获取用户信息并合并
      const userOpenids = [...new Set(gameScoreQuery.data.map(record => record._openid))]
      
      // 批量获取用户信息
      const userInfos = {}
      const userQuery = await db.collection('users')
        .where({
          _openid: db.command.in(userOpenids)
        })
        .field({
          _openid: true,
          nickName: true,
          avatarUrl: true
        })
        .get()
      
      userQuery.data.forEach(user => {
        userInfos[user._openid] = user
      })
      
      // 合并用户信息和分数记录
      gameRanking = gameScoreQuery.data.map((record, index) => {
        const userInfo = userInfos[record._openid] || { nickName: '未知用户', avatarUrl: '' }
        return {
          rank: index + 1,
          _openid: record._openid,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          score: record.score,
          createdAt: record.createdAt,
          isSelf: record._openid === wxContext.OPENID
        }
      })
    }
    
    return {
      success: true,
      ranking: rankingList,
      selfRank: selfRank,
      selfData: selfData,
      gameRanking: gameRanking
    }
  } catch (err) {
    console.error('获取排行榜云函数错误', err)
    return {
      success: false,
      error: err
    }
  }
}