// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取 WX Context (微信调用上下文)，包括 OPENID、APPID 等信息
  const wxContext = cloud.getWXContext()
  
  // 查询用户是否已存在
  const db = cloud.database()
  const userCollection = db.collection('users')
  
  try {
    // 查询用户记录
    const userQuery = await userCollection.where({
      _openid: wxContext.OPENID
    }).get()
    
    // 用户不存在，创建新用户
    if (userQuery.data.length === 0) {
      // 创建新用户记录
      const result = await userCollection.add({
        data: {
          _openid: wxContext.OPENID,
          nickName: event.nickName || '微信用户',
          avatarUrl: event.avatarUrl || '',
          score: 0,
          unlockedGames: [0], // 默认只解锁第一个游戏
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
      
      // 返回新创建的用户信息
      return {
        event,
        openid: wxContext.OPENID,
        appid: wxContext.APPID,
        unionid: wxContext.UNIONID,
        isNewUser: true,
        userData: {
          _openid: wxContext.OPENID,
          nickName: event.nickName || '微信用户',
          avatarUrl: event.avatarUrl || '',
          score: 0,
          unlockedGames: [0]
        }
      }
    } 
    // 用户已存在，返回用户数据
    else {
      const userData = userQuery.data[0]
      
      // 如果有新的用户信息，更新用户资料
      if (event.nickName && event.nickName !== '微信用户' && event.nickName !== userData.nickName) {
        await userCollection.where({
          _openid: wxContext.OPENID
        }).update({
          data: {
            nickName: event.nickName,
            avatarUrl: event.avatarUrl || userData.avatarUrl,
            updatedAt: db.serverDate()
          }
        })
        
        userData.nickName = event.nickName
        userData.avatarUrl = event.avatarUrl || userData.avatarUrl
      }
      
      return {
        event,
        openid: wxContext.OPENID,
        appid: wxContext.APPID,
        unionid: wxContext.UNIONID,
        isNewUser: false,
        userData: userData
      }
    }
  } catch (err) {
    console.error('登录云函数错误', err)
    return {
      event,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      error: err
    }
  }
}